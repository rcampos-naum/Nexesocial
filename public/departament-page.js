import { db } from './firebase-config.js';
import {
    collection, getDocs, getDoc, doc, setDoc, updateDoc, addDoc,
    query, where, serverTimestamp, deleteDoc, onSnapshot, orderBy, limit, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { GruposLogic } from './grupos-logic.js';
import { BeneficiariosGruposDB } from './grupos-db.js';
import { fillStructureSelect, loadStructure } from './program-structure-store.js';
import { structurePath } from './program-structure.mjs';
let departmentStructure = [];
loadStructure().then(data => { departmentStructure = data.nodes; renderActivities(); }).catch(() => {});

// ── Slug → dept matching ─────────────────────────────────────────────────────
const SLUG_ALIASES = {
    'centre-dia':              ['centre de dia','centro de dia'],
    'orientacio-laboral':      ['orientacio laboral','orientacion laboral'],
    'intervencio-comunitaria': ['intervencio comunitaria','intervencion comunitaria'],
    'tsi':                     ['tsi'],
    'administracio':           ['administracio','administracion'],
};
const DEPT_COLORS = {
    'centre-dia':'#2563eb','orientacio-laboral':'#d97706',
    'intervencio-comunitaria':'#059669','tsi':'#0d9488','administracio':'#7c3aed'
};

function norm(s=''){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function esc(v=''){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtDate(v=''){if(!v)return '-';try{return new Date(v).toLocaleDateString('ca-ES');}catch{return v;}}
function calcAge(d=''){if(!d)return 0;const b=new Date(d);if(isNaN(b))return 0;let a=new Date().getFullYear()-b.getFullYear();const m=new Date().getMonth()-b.getMonth();if(m<0||(m===0&&new Date().getDate()<b.getDate()))a--;return a;}
function createId(pfx){return `${pfx}-${Date.now()}-${Math.floor(Math.random()*1000)}`;}
function todayStr(){return new Date().toISOString().split('T')[0];}
function buildActivityCode(name='', deptCode=''){
    const cleanDept = norm(deptCode || S.dept?.code || 'ACT').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6) || 'ACT';
    const cleanName = norm(name).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'ACT';
    const yy = String(new Date().getFullYear()).slice(-2);
    return `${cleanDept}-${cleanName}${yy}`;
}
async function activityCodeExists(code='', ignoreId=''){
    const target = norm(code).toUpperCase().replace(/\s+/g,'');
    if (!target) return false;
    const snap = await getDocs(collection(db,'actividades'));
    return snap.docs.some((d) => {
        if (ignoreId && d.id === ignoreId) return false;
        const dd = d.data() || {};
        const current = norm(dd.codigo || dd.code || dd.nombre || '').toUpperCase().replace(/\s+/g,'');
        return current === target;
    });
}
function addDays(dateStr='',days=0){const d=parseDateSafe(dateStr);if(!d)return'';d.setDate(d.getDate()+days);return d.toISOString().split('T')[0];}
function statusKey(v=''){return norm(v).replace(/\s+/g,'');}
function isAbsent(v=''){const k=statusKey(v);return ['baixa','baja','ausent','ausente','inactive','inactiu','inactivo'].includes(k);}
function isVolunteer(staff={}){
    const role=norm(staff.rol||staff.role||staff.tipo||'');
    return role.includes('volunt');
}
function workerLabel(staff={}){
    const role=staff.rol||staff.role||staff.cargo||staff.tipo||'';
    return role?`${staff.name} (${role})`:staff.name;
}
function pickStaffById(id=''){
    if(!id)return null;
    const sid=String(id);
    return S.staff.find(s=>String(s.id)===sid||String(s.firebaseUid||'')===sid||String(s.uid||'')===sid)||null;
}
function activeReforcForGroup(groupId=''){
    const t=todayStr();
    return S.reforcos.find(r=>String(r.groupId||'')===String(groupId) && (r.mode==='indef' || !r.untilDate || r.untilDate>=t));
}
function statusPill(active=true){
    const icon=active
        ? '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    return active
        ? `<span class="pill-ok">${icon} Actiu</span>`
        : `<span class="pill-warn">${icon} Ausent</span>`;
}

// ── State ────────────────────────────────────────────────────────────────────
const S = {
    slug:'', dept:null,
    activities:[], groups:[], allBeneficiaris:[], deptBenIds:[],
    staff:[], seguiments:[],
    reforcos:[], myNotifs:[],
    periods:[], activePeriodId:'', viewPeriodId:'',
    user:{ uid:'', email:'', name:'' },
    activeGroupId:null, activeGroupObj:null,
    activeActivity:null,
};

// ── DOM helpers ──────────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
function show(id){const e=$(id);if(e)e.style.display='';}
function hide(id){const e=$(id);if(e)e.style.display='none';}
function text(id,v){const e=$(id);if(e)e.textContent=v;}

function toast(msg,tone=''){
    const t=$('dept-toast');if(!t)return;
    t.textContent=msg;t.className='dept-toast show '+(tone==='ok'?'ok':tone==='err'?'err':tone==='warn'?'warn':'');
    clearTimeout(window.__deptToast);
    window.__deptToast=setTimeout(()=>{t.className='dept-toast';},2800);
}

// ── Loaders ──────────────────────────────────────────────────────────────────
async function loadDepts(){
    try{
        const s=await getDocs(collection(db,'departamentos'));
        return s.docs.map(d=>{
            const data=d.data()||{};
            // _fsId is always the real Firestore document ID regardless of any data.id field
            return{id:d.id,...data,_fsId:d.id,name:data.nombre||data.name||d.id,area:data.descripcion||data.area||'',manager:data.responsable||data.manager||'',code:data.codigo||data.code||'',frequency:data.frecuencia||data.frequency||'Trimestral',status:data.estado||data.status||'Actiu'};
        });
    }catch{return[];}
}
async function loadActivities(deptId){
    try{
        const q=query(collection(db,'actividades'),where('departamentoId','==',deptId));
        const s=await getDocs(q);
        const res=s.docs.map(d=>{const dd=d.data()||{};return{id:d.id,structureNodeId:dd.structureNodeId||'',departmentId:dd.departamentoId||dd.departmentId||deptId,name:dd.nombre||dd.name||d.id,code:dd.codigo||dd.code||norm(dd.nombre||d.id).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10),ageMin:Number(dd.edadMinima??dd.ageMin??0),ageMax:Number(dd.edadMaxima??dd.ageMax??99),startDate:dd.fechaInicio||dd.startDate||'',endDate:dd.fechaFin||dd.endDate||'',temporalization:dd.temporalizacion||dd.temporalization||'Trimestral',theme:dd.eixTematic||dd.theme||'',logistics:dd.necessitatsLogistiques||dd.logistics||'',coorganization:dd.coorganitzacioActiva||dd.coorganization||'',notes:dd.descripcion||dd.notes||'',status:dd.estado||dd.status||'Activa',periodId:dd.periodId||dd.periodoId||'',periodLabel:dd.periodLabel||dd.periodoLabel||'',periodType:dd.periodType||''}});
        return res.filter(a=>a.status!=='Inactiva').filter(isForViewedPeriod);
    }catch{return[];}
}
async function loadGroups(deptId){
    try{
        const s=await getDocs(query(collection(db,'grupos'),where('estado','==','Activo')));
        return s.docs.map(d=>({id:d.id,...d.data()})).filter(g=>[g.departamentoId,g.departamentId,g.departamento?.id].includes(deptId)).filter(isForViewedPeriod);
    }catch{return[];}
}
let _unsubBen = null;
let _benefLoadPromise = null;
let _staffLoadPromise = null;
function loadBeneficiaris(){
    return new Promise(resolve => {
        let resolved = false;
        if (_unsubBen) _unsubBen();
        _unsubBen = onSnapshot(collection(db,'expedientes'), (s) => {
            const arr = s.docs.map(d=>{const dd=d.data()||{};return{id:d.id,name:`${dd.dades_personals?.nom||''} ${dd.dades_personals?.cognoms||''}`.trim()||dd.nombre||d.id,birthDate:dd.dades_personals?.data_naixement||'',age:calcAge(dd.dades_personals?.data_naixement||''),expedient:dd.numero_expediente||''};});
            S.allBeneficiaris = arr;
            if (!resolved) { resolved = true; resolve(arr); }
            else { updateKPIs(); renderActivities(); }
        }, e => { console.warn('[loadBen]',e); if (!resolved) { resolved=true; resolve([]); } });
    });
}
function ensureBeneficiarisLoaded(){
    if (Array.isArray(S.allBeneficiaris) && S.allBeneficiaris.length) return Promise.resolve(S.allBeneficiaris);
    if (_benefLoadPromise) return _benefLoadPromise;
    _benefLoadPromise = loadBeneficiaris().then(arr => {
        S.allBeneficiaris = Array.isArray(arr) ? arr : [];
        return S.allBeneficiaris;
    }).catch(() => {
        S.allBeneficiaris = [];
        return [];
    });
    return _benefLoadPromise;
}
async function loadStaff(){
    try{
        const s=await getDocs(collection(db,'empleados'));
        if(s.docs.length) return s.docs.map(d=>({id:d.id,...d.data(),name:d.data().nombre||d.data().displayName||d.data().email||d.id})).filter(p=>p.estado!=='Baja'&&p.estado!=='Baixa');
        // fallback: usuarios
        const u=await getDocs(collection(db,'usuarios'));
        return u.docs.map(d=>({id:d.id,...d.data(),name:d.data().nombre||d.data().displayName||d.data().email||d.id}));
    }catch{return[];}
}
function ensureStaffLoaded(){
    if (Array.isArray(S.staff) && S.staff.length) return Promise.resolve(S.staff);
    if (_staffLoadPromise) return _staffLoadPromise;
    _staffLoadPromise = loadStaff().then(arr => {
        S.staff = Array.isArray(arr) ? arr : [];
        return S.staff;
    }).catch(() => {
        S.staff = [];
        return [];
    });
    return _staffLoadPromise;
}
async function loadSeguiments(groupId){
    try{
        const q=query(collection(db,'seguimientos'),where('groupId','==',groupId));
        const s=await getDocs(q);return s.docs.map(d=>({id:d.id,...d.data()})).filter(isForViewedPeriod);
    }catch{return[];}
}
async function loadGroupEnrolled(groupId){
    try{
        const q=query(collection(db,'beneficiarios_grupos'),where('grupoId','==',groupId));
        const s=await getDocs(q);return s.docs.map(d=>({docId:d.id,...d.data()})).filter(isForViewedPeriod);
    }catch{return[];}
}

// ── Slug → dept matching ─────────────────────────────────────────────────────
function matchDept(depts,slug){
    // 1. Match by exact ID (e.g. ?dept=<firestoreId>)
    const byId=depts.find(d=>d.id===slug||d._fsId===slug);
    if(byId)return byId;
    // 2. Match by slug aliases against dept name
    const aliases=(SLUG_ALIASES[slug]||[slug.replace(/-/g,' ')]);
    return depts.find(d=>{const n=norm(d.nombre||d.name||'');return aliases.some(a=>n.includes(a)||a.includes(n));});
}

// ── Render hero & KPIs ───────────────────────────────────────────────────────
function renderHero(dept,slug){
    const color=DEPT_COLORS[slug]||'#2563eb';
    document.documentElement.style.setProperty('--dept-color',color);
    const h=$('dept-hero');if(h)h.style.background=color;
    const name=dept.name||dept.nombre||'Departament';
    const manager=dept.manager||dept.responsable||'';
    const area=dept.area||'';
    const freq=dept.frequency||dept.frecuencia||'';
    text('dept-title',name);
    document.title='NexeSocial \u2013 '+name;
    const sub=[area,manager?'Responsable: '+manager:'',freq?'Revisio '+freq:''].filter(Boolean).join(' \xb7 ');
    text('dept-subtitle',sub);
}
function updateKPIs(){
    text('kpi-act',S.activities.length);
    text('kpi-grp',S.groups.length);
    text('kpi-ins',S.deptBenIds.length);
}

// ── Config tab ───────────────────────────────────────────────────────────────
const PERIOD_TYPE_LABELS={
    natural:'Any natural',
    escolar:'Curs escolar',
    custom:'Conveni/Subvencio',
    campaign:'Campanya curta'
};

function parseDateSafe(v=''){
    const d=new Date(v);
    return Number.isNaN(d.getTime())?null:d;
}
function ymd(y,m,d){
    const mm=String(m).padStart(2,'0');
    const dd=String(d).padStart(2,'0');
    return `${y}-${mm}-${dd}`;
}
function isReadonlyView(){return String(S.viewPeriodId||'')!==String(S.activePeriodId||'');}
function isForViewedPeriod(doc={}){
    const pid=String(doc?.periodId||doc?.periodoId||doc?.vigenciaId||'');
    const viewed=String(S.viewPeriodId||S.activePeriodId||'');
    const active=String(S.activePeriodId||'');
    if(pid)return pid===viewed;
    // Legacy docs without periodId belong to active period only
    return viewed===active;
}
function currentPeriodMeta(){
    const p=getCurrentPeriod();
    return {periodId:p?.id||S.activePeriodId||'',periodLabel:p?.label||'Periode actual',periodType:p?.type||'natural'};
}
function getSelectedPeriodType(){
    return document.querySelector('input[name="cfg-period-type"]:checked')?.value||'natural';
}
function setSelectedPeriodType(type='natural'){
    const input=document.querySelector(`input[name="cfg-period-type"][value="${type}"]`)||document.querySelector('input[name="cfg-period-type"][value="natural"]');
    if(input)input.checked=true;
}
function applyCyclePreset(type='',force=false){
    const startInput=$('cfg-start');
    const endInput=$('cfg-end');
    if(!startInput||!endInput)return;
    if(!force&&startInput.value&&endInput.value)return;

    const now=new Date();
    if(type==='natural'){
        const y=now.getFullYear();
        startInput.value=ymd(y,1,1);
        endInput.value=ymd(y,12,31);
        return;
    }
    if(type==='escolar'){
        const startYear=now.getMonth()>=8?now.getFullYear():now.getFullYear()-1;
        const endYear=startYear+1;
        startInput.value=ymd(startYear,9,1);
        endInput.value=ymd(endYear,6,30);
    }
}
function applyCycleFieldLock(type=''){
    const startInput=$('cfg-start');
    const endInput=$('cfg-end');
    if(!startInput||!endInput)return;
    const locked=(type==='natural'||type==='escolar');
    startInput.readOnly=locked;
    endInput.readOnly=locked;
    startInput.style.background=locked?'#f1f5f9':'';
    endInput.style.background=locked?'#f1f5f9':'';
    startInput.style.cursor=locked?'not-allowed':'';
    endInput.style.cursor=locked?'not-allowed':'';
}
function bindCycleTypeAutofill(){
    document.querySelectorAll('input[name="cfg-period-type"]').forEach(el=>{
        el.addEventListener('change',()=>{
            if(!el.checked)return;
            applyCyclePreset(el.value,true);
            applyCycleFieldLock(el.value);
        });
    });
}
function normalizePeriodsFromDept(dept){
    const fromDoc=Array.isArray(dept.periods)?dept.periods.filter(Boolean):[];
    if(fromDoc.length){
        return fromDoc.map((p,idx)=>{
            const id=String(p.id||`period-${idx+1}`);
            const startDate=p.startDate||p.fechaInicio||'';
            const endDate=p.endDate||p.fechaFin||'';
            const type=p.type||p.periodType||dept.periodType||'natural';
            return {
                id,
                label:p.label||`${PERIOD_TYPE_LABELS[type]||'Periode'} ${idx+1}`,
                type,
                startDate,
                endDate,
                status:p.status||'active',
                archiveUrl:p.archiveUrl||''
            };
        });
    }
    const startDate=dept.startDate||dept.fechaInicio||'';
    const endDate=dept.endDate||dept.fechaFin||'';
    if(startDate||endDate){
        return [{
            id:'period-current',
            label:'Periode actual',
            type:dept.periodType||'natural',
            startDate,
            endDate,
            status:'active',
            archiveUrl:''
        }];
    }
    return [{
        id:'period-current',
        label:'Periode actual',
        type:dept.periodType||'natural',
        startDate:'',
        endDate:'',
        status:'active',
        archiveUrl:''
    }];
}
function getPeriodById(id=''){
    return S.periods.find(p=>String(p.id)===String(id))||null;
}
function getCurrentPeriod(){
    return getPeriodById(S.activePeriodId)||S.periods[0]||null;
}
function renderPeriodSelector(){
    const sel=$('period-selector');
    if(!sel)return;
    if(!S.periods.length){
        sel.innerHTML='<option value="">Sense periodes</option>';
        return;
    }
    sel.innerHTML=S.periods.map(p=>`<option value="${esc(p.id)}">${esc(p.label)} · ${esc(fmtDate(p.startDate))} - ${esc(fmtDate(p.endDate))}</option>`).join('');
    const viewId=S.viewPeriodId||S.activePeriodId||S.periods[0].id;
    sel.value=viewId;
}
function renderPeriodHistory(){
    const ul=$('cfg-period-history');
    if(!ul)return;
    const items=S.periods.filter(p=>String(p.id)!==String(S.activePeriodId));
    if(!items.length){
        ul.innerHTML='<li><small>Encara no hi ha periodes historics.</small></li>';
        return;
    }
    ul.innerHTML=items.map(p=>`<li><div><strong>${esc(p.label)}</strong><br><small>${esc(fmtDate(p.startDate))} - ${esc(fmtDate(p.endDate))}</small></div>${p.archiveUrl?`<a href="${esc(p.archiveUrl)}" target="_blank" rel="noopener">Veure arxiu</a>`:'<small>Sense arxiu</small>'}</li>`).join('');
}
function renderPeriodBanner(){
    const banner=$('period-banner');
    if(!banner)return;
    const current=getCurrentPeriod();
    const view=getPeriodById(S.viewPeriodId)||current;
    if(!view){
        banner.textContent='Estàs veient el periode actual.';
        banner.classList.remove('warn');
        return;
    }
    if(String(view.id)!==String(current?.id||'')){
        banner.classList.add('warn');
        banner.textContent=`Estàs consultant un periode historic (${view.label}). Les dades haurien de ser de només lectura.`;
        return;
    }
    banner.classList.remove('warn');
    const end=parseDateSafe(view.endDate);
    if(end){
        const diff=Math.ceil((end.getTime()-Date.now())/(1000*60*60*24));
        if(diff>=0) banner.textContent=`ESTAS VEIENT EL PERIODE ACTUAL · Falten ${diff} dies per al tancament.`;
        else banner.textContent=`PERIODE TANCAT · El tancament va ser fa ${Math.abs(diff)} dies.`;
    }else{
        banner.textContent='ESTAS VEIENT EL PERIODE ACTUAL';
    }
}
function renderConfigStatusPill(period){
    const pill=$('cfg-status-pill');
    if(!pill)return;
    const end=parseDateSafe(period?.endDate||'');
    const isActive=!end||end.getTime()>=Date.now();
    pill.className=`period-state ${isActive?'active':'closed'}`;
    pill.textContent=isActive?'ACTIU':'TANCAT';
}
async function reloadPeriodScopedData(){
    const deptId=S.dept?._fsId||S.dept?.id||'';
    if(!deptId)return;
    const [activities,groups]=await Promise.all([loadActivities(deptId),loadGroups(deptId)]);
    S.activities=activities;
    S.groups=groups;
    if(S.activeGroupId&&!S.groups.find(g=>g.id===S.activeGroupId))closeGroupPanel();
    updateKPIs();
    renderActivities();
    renderCoordBoard();
}
async function onPeriodSelectorChange(){
    const sel=$('period-selector');
    if(!sel)return;
    S.viewPeriodId=sel.value||S.activePeriodId;
    const p=getPeriodById(S.viewPeriodId);
    if(p){
        setSelectedPeriodType(p.type||'natural');
        if($('cfg-start'))$('cfg-start').value=p.startDate||'';
        if($('cfg-end'))$('cfg-end').value=p.endDate||'';
        renderConfigStatusPill(p);
    }
    renderPeriodBanner();
    await reloadPeriodScopedData();
}

function fillConfig(dept){
    // Admin-managed fields (read-only — edited from NexeAdmin)
    if($('cfg-name'))$('cfg-name').value=dept.name||dept.nombre||'';
    if($('cfg-manager'))$('cfg-manager').value=dept.manager||dept.responsable||'';
    if($('cfg-area'))$('cfg-area').value=dept.area||'';
    if($('cfg-code'))$('cfg-code').value=dept.code||dept.codigo||'';
    S.periods=normalizePeriodsFromDept(dept);
    S.activePeriodId=dept.activePeriodId||S.periods[0]?.id||'';
    S.viewPeriodId=S.activePeriodId;
    const current=getCurrentPeriod();
    // Programmatic fields (editable here)
    setSelectedPeriodType(current?.type||dept.periodType||'natural');
    if($('cfg-start'))$('cfg-start').value=current?.startDate||dept.startDate||dept.fechaInicio||'';
    if($('cfg-end'))$('cfg-end').value=current?.endDate||dept.endDate||dept.fechaFin||'';
    const selectedType=getSelectedPeriodType();
    applyCyclePreset(selectedType,false);
    applyCycleFieldLock(selectedType);
    if($('cfg-notes'))$('cfg-notes').value=dept.notes||'';
    renderPeriodSelector();
    renderPeriodHistory();
    renderConfigStatusPill(current);
    renderPeriodBanner();
}
function resetConfig(){
    if(!S.dept)return;
    fillConfig(S.dept);
    toast('Canvis descartats','warn');
}
async function startNewPeriod(){
    if(isReadonlyView()){toast('Canvia al periode actiu per fer el tancament','warn');return;}
    const current=getCurrentPeriod();
    if(!current){toast('No hi ha periode actiu','err');return;}
    if(!confirm('Tancar periode actual i iniciar-ne un de nou?'))return;

    const keepStaff=confirm('Vols mantenir els mateixos educadors als nous grups?');
    const sourceActivities=[...S.activities];
    const sourceGroups=[...S.groups];

    const oldEnd=parseDateSafe(current.endDate);
    const oldStart=parseDateSafe(current.startDate);
    const durationDays=(oldEnd&&oldStart)?Math.max(1,Math.round((oldEnd-oldStart)/(1000*60*60*24))+1):365;
    const nextStart=current.endDate?addDays(current.endDate,1):todayStr();
    const nextEnd=addDays(nextStart,durationDays-1);

    const newPeriod={
        id:createId('period'),
        label:`${PERIOD_TYPE_LABELS[current.type]||'Periode'} ${new Date(nextStart).getFullYear()}`,
        type:current.type||'custom',
        startDate:nextStart,
        endDate:nextEnd,
        status:'active',
        archiveUrl:''
    };

    const updatedPeriods=S.periods.map(p=>String(p.id)===String(current.id)?{...p,status:'closed'}:p);
    updatedPeriods.push(newPeriod);

    const fsId=S.dept?._fsId||S.dept?.id;
    const activityMap=new Map();
    try{
        for(const act of sourceActivities){
            const newActId=createId('ACT');
            activityMap.set(act.id,newActId);
            const data={
                id:newActId,
                name:act.name||'',
                code:(act.code||'').slice(0,10),
                departmentId:S.dept.id,
                ageMin:act.ageMin??0,
                ageMax:act.ageMax??99,
                startDate:newPeriod.startDate,
                endDate:newPeriod.endDate,
                temporalization:act.temporalization||'Trimestral',
                notes:'',
                status:'Activa',
                ...{periodId:newPeriod.id,periodLabel:newPeriod.label,periodType:newPeriod.type}
            };
            await setDoc(doc(db,'actividades',newActId),{
                ...data,
                nombre:data.name,codigo:data.code,departamentoId:data.departmentId,
                edadMinima:data.ageMin,edadMaxima:data.ageMax,
                fechaInicio:data.startDate,fechaFin:data.endDate,
                temporalizacion:data.temporalization,descripcion:data.notes,
                estado:'Activa',fechaModificacion:serverTimestamp(),periodoId:newPeriod.id,periodoLabel:newPeriod.label
            },{merge:true});
        }

        for(const g of sourceGroups){
            const sourceActId=g.actividadId||g.activityId;
            const targetActId=activityMap.get(sourceActId);
            if(!targetActId)continue;
            const respIds=keepStaff?(Array.isArray(g.responsablesIds)?g.responsablesIds.filter(Boolean):[]):[];
            const respNames=keepStaff?(Array.isArray(g.responsablesNoms)?g.responsablesNoms.filter(Boolean):[]):[];
            const respId=respIds[0]||'';
            const respName=respNames.join(', ')||g.responsableNombre||'';
            const res=await GruposLogic.crearGrupo(
                g.nombre||g.name||'Grup',
                S.dept.id,
                targetActId,
                respId||'_',
                respName,
                {periodId:newPeriod.id,periodLabel:newPeriod.label,periodType:newPeriod.type}
            );
            if(res?.id&&keepStaff&&respIds.length>1){
                await updateDoc(doc(db,'grupos',res.id),{responsablesIds:respIds,responsablesNoms:respNames,periodId:newPeriod.id,periodoId:newPeriod.id,periodLabel:newPeriod.label,periodoLabel:newPeriod.label,periodType:newPeriod.type});
            }
        }

        const update={
            periods:updatedPeriods,
            activePeriodId:newPeriod.id,
            periodType:newPeriod.type,
            startDate:newPeriod.startDate,
            endDate:newPeriod.endDate,
            fechaModificacion:serverTimestamp()
        };
        await setDoc(doc(db,'departamentos',fsId),update,{merge:true});
        Object.assign(S.dept,update);
        S.periods=updatedPeriods;
        S.activePeriodId=newPeriod.id;
        S.viewPeriodId=newPeriod.id;
        fillConfig(S.dept);
        await reloadPeriodScopedData();
        toast('Nou periode iniciat i estructura clonada','ok');
    }catch(e){
        console.error(e);
        toast('Error iniciant el nou periode','err');
    }
}
async function saveConfig(){
    if(isReadonlyView()){toast('Aquest periode és historic i és de només lectura','warn');return;}
    const d=S.dept;if(!d)return;
    const periodType=getSelectedPeriodType();
    const startDate=$('cfg-start').value;
    const endDate=$('cfg-end').value;
    const current=getCurrentPeriod()||{id:'period-current',label:'Periode actual'};
    const end=parseDateSafe(endDate);
    const status=!end||end.getTime()>=Date.now()?'active':'closed';
    const updatedCurrent={
        ...current,
        type:periodType,
        startDate,
        endDate,
        status,
        label:current.label||'Periode actual'
    };
    const updatedPeriods=S.periods.map(p=>String(p.id)===String(updatedCurrent.id)?updatedCurrent:p);
    if(!updatedPeriods.find(p=>String(p.id)===String(updatedCurrent.id)))updatedPeriods.push(updatedCurrent);
    // Only save programmatic fields — never overwrite admin fields managed by NexeAdmin
    const data={
        periodType,
        startDate,
        endDate,
        notes:$('cfg-notes').value.trim(),
        periods:updatedPeriods,
        activePeriodId:updatedCurrent.id,
        fechaModificacion:serverTimestamp()
    };
    const fsId=d._fsId||d.id;
    try{
        await setDoc(doc(db,'departamentos',fsId),data,{merge:true});
        Object.assign(S.dept,data);
        S.periods=updatedPeriods;
        S.activePeriodId=updatedCurrent.id;
        S.viewPeriodId=updatedCurrent.id;
        renderPeriodSelector();
        renderPeriodHistory();
        renderConfigStatusPill(updatedCurrent);
        renderPeriodBanner();
        toast('Configuracio guardada','ok');
    }catch(e){console.error(e);toast('Error en guardar','err');}
}

// ── Inscrits tab ─────────────────────────────────────────────────────────────
async function renderInscrits(){
    await ensureBeneficiarisLoaded();
    const grid=$('inscrits-grid');const cnt=$('inscrit-count');
    const enrolled=S.allBeneficiaris.filter(b=>S.deptBenIds.includes(b.id));
    const byBen=new Map();
    S.groups.forEach((g)=>{
        const groupName=g.nombre||g.name||g.idGrupo||g.id;
        const ids=Array.isArray(g.beneficiarios)?g.beneficiarios:[];
        ids.forEach((id)=>{
            const bid=String(id);
            if(!byBen.has(bid))byBen.set(bid,[]);
            byBen.get(bid).push(groupName);
        });
    });
    if(cnt)cnt.textContent=`${enrolled.length} participant${enrolled.length!==1?'s':''}`;
    if(!grid)return;
    if(!enrolled.length){grid.innerHTML=`<div class="empty-box" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><p>Encara no hi ha inscrits al departament.</p></div>`;return;}
    grid.innerHTML=enrolled.map((b)=>{
        const memberships=byBen.get(String(b.id))||[];
        const groupsInfo=memberships.length?` · ${memberships.length} grup${memberships.length!==1?'s':''}`:'';
        const groupsLine=memberships.length?`<div class="inscrit-meta" style="margin-top:4px;">${esc(memberships.slice(0,2).join(', '))}${memberships.length>2?'…':''}</div>`:'';
        return `<div class="inscrit-card"><div class="inscrit-avatar">${esc(b.name.charAt(0).toUpperCase())}</div><div><div class="inscrit-name">${esc(b.name)}</div><div class="inscrit-meta">${b.age?b.age+' anys':''}${b.expedient?' · '+b.expedient:''}${groupsInfo}</div>${groupsLine}</div><button class="btn-remove" onclick="window._dept.removeFromDept('${b.id}')">Treure</button></div>`;
    }).join('');
    updateKPIs();
}
function searchBeneficiaris(){
    const q=norm($('ben-search')?.value||'');
    const res=$('ben-results');if(!res)return;
    if(q.length<2){res.innerHTML='<div style="font-size:.8rem;color:#94a3b8;padding:6px">Escriu almenys 2 caracters...</div>';return;}
    const matches=S.allBeneficiaris.filter(b=>!S.deptBenIds.includes(b.id)&&norm(b.name).includes(q)).slice(0,10);
    if(!matches.length){res.innerHTML='<div style="font-size:.8rem;color:#94a3b8;padding:6px">Cap resultat.</div>';return;}
    res.innerHTML=matches.map(b=>`<div class="result-item"><span>${esc(b.name)}${b.age?' ('+b.age+' a)':''}</span><button class="btn-primary btn-sm" onclick="window._dept.addToDept('${b.id}')">+ Afegir</button></div>`).join('');
}
async function addToDept(benId){
    if(S.deptBenIds.includes(benId))return;
    S.deptBenIds.push(benId);
    const fsId=S.dept._fsId||S.dept.id;
    try{await updateDoc(doc(db,'departamentos',fsId),{participantIds:S.deptBenIds});}
    catch(e){console.warn('addToDept Firestore err:',e);/* local already updated */}
    renderInscrits();
    if($('ben-search'))$('ben-search').value='';
    if($('ben-results'))$('ben-results').innerHTML='';
    toast('Participant afegit','ok');
}
async function removeFromDept(benId){
    S.deptBenIds=S.deptBenIds.filter(id=>id!==benId);
    const fsId=S.dept._fsId||S.dept.id;
    try{await updateDoc(doc(db,'departamentos',fsId),{participantIds:S.deptBenIds});}catch(e){console.warn('removeFromDept Firestore err:',e);}
    renderInscrits();
    toast('Participant eliminat','warn');
}

// ── Activitats tab ───────────────────────────────────────────────────────────
function renderActivities(){
    const list=$('act-list');if(!list)return;
    const ro=isReadonlyView();
    if(!S.activities.length){list.innerHTML=`<div class="empty-box"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><p>Crea la primera activitat.</p></div>`;return;}
    list.innerHTML=S.activities.map(a=>{
        const grps=S.groups.filter(g=>g.actividadId===a.id||g.activityId===a.id);
        return `<div class="act-item" id="act-${esc(a.id)}">
            <div class="act-header" onclick="this.closest('.act-item').classList.toggle('open')">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="id-pill">${esc(a.code||a.id)}</span>
                        <span class="act-title">${esc(a.name)}</span>
                    </div>
                    <div class="act-badge-row">
                        <span class="act-badge badge-green">${esc(structurePath(departmentStructure, a.structureNodeId).map(n => n.name).join(' › ') || 'Sense classificar')}</span>
                        <span class="act-badge badge-blue">${esc(String(a.ageMin))}-${esc(String(a.ageMax))} anys</span>
                        <span class="act-badge badge-green">${esc(a.temporalization)}</span>
                        ${a.theme?`<span class="act-badge" style="background:#ede9fe;color:#6d28d9;">${esc(a.theme)}</span>`:''}
                        ${a.startDate?`<span class="act-badge badge-amber">${esc(fmtDate(a.startDate))} - ${esc(fmtDate(a.endDate))}</span>`:''}
                        <span class="act-badge" style="background:#f1f5f9;color:#475569;">${grps.length} grups</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;" onclick="event.stopPropagation()">
                    ${ro?'':`<button class="btn-sec btn-sm" onclick="window._dept.openActModal('${esc(a.id)}')">Editar</button>`}
                    <svg class="act-toggle-icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>
            <div class="act-body">
                <div class="act-body-toolbar">
                    <h4>Grups (${grps.length})</h4>
                    ${ro?'':`<button class="btn-primary btn-sm" onclick="window._dept.openGrpModal('${esc(a.id)}')">+ Nou grup</button>`}
                </div>
                ${grps.length?`<div class="group-list">${grps.map(g=>`<div class="group-card">
                    <div class="group-name">${esc(g.nombre||g.name||g.idGrupo||g.id)}</div>
                    <div class="group-meta">Responsables: ${esc((g.responsablesNoms||[g.responsableNombre]).filter(Boolean).join(', ')||'-')} &middot; ${(g.beneficiarios||[]).length} participants</div>
                    <div class="group-actions">
                        <button class="btn-primary btn-sm" onclick="window._dept.openGroupPanel('${esc(g.id)}','${esc(a.id)}')">Gestionar</button>
                    </div>
                </div>`).join('')}</div>`:`<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>Crea el primer grup.</p></div>`}
                ${a.logistics?`<p style="margin:10px 0 0;font-size:.82rem;color:#475569;"><strong>Logistica:</strong> ${esc(a.logistics)}</p>`:''}
                ${a.coorganization?`<p style="margin:8px 0 0;font-size:.82rem;color:#475569;"><strong>Coorganitzacio:</strong> ${esc(a.coorganization)}</p>`:''}
                ${a.notes?`<p style="margin:12px 0 0;font-size:.82rem;color:#64748b;">${esc(a.notes)}</p>`:''}
            </div>
        </div>`;
    }).join('');
}

// ── Activity modal ────────────────────────────────────────────────────────────
function buildRespCheckboxes(containerId, selectedIds=[]){const box=$(containerId);if(!box)return;const active=S.staff.filter(s=>s.status!=='Baixa');box.innerHTML=active.map(s=>`<label style="display:flex;align-items:center;gap:6px;background:white;border:1px solid #e2e8f0;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:.82rem;"><input type="checkbox" value="${esc(s.firebaseUid||s.id)}" data-n="${esc(s.name||s.nombre||s.email||s.id)}" ${selectedIds.includes(s.firebaseUid||s.id)?'checked':''} style="width:auto;"> ${esc(s.name||s.nombre||s.email||s.id)}</label>`).join('')||'<span style="color:#94a3b8;font-size:.8rem;">Sense personal actiu</span>';}
function getCheckedResp(containerId){return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(el=>({id:el.value,name:el.dataset.n}));}

function openActModal(actId=null){
    const modal=$('act-modal');if(!modal)return;
    const a=actId?S.activities.find(x=>x.id===actId):null;
    text('act-modal-title',a?'Editar activitat':'Nova activitat');
    $('act-id').value=a?.id||'';$('act-name').value=a?.name||'';
    fillStructureSelect($('act-structure'), a?.structureNodeId || '');
    const codeField=$('act-code');
    const codeHint=$('act-code-hint');
    const nameField=$('act-name');
    if(codeField){
        codeField.value=a?.code||a?.codigo||buildActivityCode(a?.name||'', S.dept?.code||'');
        codeField.oninput = () => {
            if (codeHint) codeHint.textContent = `Format recomanat: ${buildActivityCode($('act-name').value, S.dept?.code||'')}. Es comprovarà que no estigui duplicat.`;
        };
    }
    if (nameField) {
        nameField.oninput = () => {
            if (!a && codeField && !codeField.value.trim()) {
                codeField.value = buildActivityCode(nameField.value, S.dept?.code||'');
            }
            if (codeHint) codeHint.textContent = `Format recomanat: ${buildActivityCode(nameField.value, S.dept?.code||'')}. Es comprovarà que no estigui duplicat.`;
        };
    }
    $('act-age-min').value=a?.ageMin??0;$('act-age-max').value=a?.ageMax??99;
    $('act-start').value=a?.startDate||'';$('act-end').value=a?.endDate||'';
    $('act-temp').value=a?.temporalization||'Trimestral';
    $('act-theme').value=a?.theme||'';
    $('act-logistics').value=a?.logistics||'';
    $('act-coorg').value=a?.coorganization||'';
    $('act-notes').value=a?.notes||'';
    buildRespCheckboxes('act-resp-list', a?.responsablesIds||[]);
    modal.classList.add('open');setTimeout(()=>$('act-name').focus(),50);
}
function closeActModal(){$('act-modal')?.classList.remove('open');}
async function saveActivity(){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const name=$('act-name').value.trim();if(!name){toast('El nom es obligatori','err');return;}
    const existingId=$('act-id').value;const id=existingId||createId('ACT');
    const codeInput=$('act-code');
    const code=(codeInput?.value||'').trim()||buildActivityCode(name, S.dept?.code||'');
    if(await activityCodeExists(code, existingId)){
        toast('Ja existeix una activitat amb aquest codi','err');
        codeInput?.focus();
        return;
    }
    const resps=getCheckedResp('act-resp-list');
    const activity={id,departmentId:S.dept.id,name,code,ageMin:Number($('act-age-min').value)||0,ageMax:Number($('act-age-max').value)||99,startDate:$('act-start').value,endDate:$('act-end').value,temporalization:$('act-temp').value,theme:$('act-theme').value.trim(),logistics:$('act-logistics').value.trim(),coorganization:$('act-coorg').value.trim(),notes:$('act-notes').value.trim(),responsablesIds:resps.map(r=>r.id),responsablesNoms:resps.map(r=>r.name),status:'Activa',...currentPeriodMeta()};
    try{
        activity.structureNodeId = $('act-structure').value;
        await setDoc(doc(db,'actividades',id),{...activity,codigo:activity.code,nombre:activity.name,departamentoId:S.dept.id,edadMinima:activity.ageMin,edadMaxima:activity.ageMax,fechaInicio:activity.startDate,fechaFin:activity.endDate,temporalizacion:activity.temporalization,eixTematic:activity.theme,necessitatsLogistiques:activity.logistics,coorganitzacioActiva:activity.coorganization,descripcion:activity.notes,responsablesIds:activity.responsablesIds,responsablesNoms:activity.responsablesNoms,estado:'Activa',fechaModificacion:serverTimestamp(),periodoId:activity.periodId,periodoLabel:activity.periodLabel},{merge:true});
        const idx=S.activities.findIndex(x=>x.id===id);
        if(idx>=0)S.activities[idx]=activity;else S.activities.push(activity);
        closeActModal();renderActivities();updateKPIs();
        toast(existingId?'Activitat actualitzada':'Activitat creada','ok');
    }catch(e){console.error(e);toast('Error en guardar','err');}
}

// ── Group modal ───────────────────────────────────────────────────────────────
function openGrpModal(actId){
    $('grp-act-id').value=actId;$('grp-name').value='';
    buildRespCheckboxes('grp-resp-list',[]);
    $('grp-modal')?.classList.add('open');
}
function closeGrpModal(){$('grp-modal')?.classList.remove('open');}
async function saveGroup(){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const name=$('grp-name').value.trim();if(!name){toast('El nom es obligatori','err');return;}
    const actId=$('grp-act-id').value;
    const resps=getCheckedResp('grp-resp-list');
    const respId=resps[0]?.id||'';const respName=resps.map(r=>r.name).join(', ')||name;
    try{
        const res=await GruposLogic.crearGrupo(name,S.dept.id,actId,respId||'_',respName,currentPeriodMeta());
        if(res){
            S.groups=await loadGroups(S.dept.id);
            closeGrpModal();renderActivities();updateKPIs();
            toast('Grup creat','ok');
        }
    }catch(e){
        // fallback direct save
        const gId=createId('GRP');
        const pm=currentPeriodMeta();
        await setDoc(doc(db,'grupos',gId),{id:gId,nombre:name,departamentoId:S.dept.id,actividadId:actId,responsablesIds:resps.map(r=>r.id),responsablesNoms:resps.map(r=>r.name),responsableId:respId,responsableNombre:respName,beneficiarios:[],estado:'Activo',fechaCreacion:serverTimestamp(),...pm,periodoId:pm.periodId,periodoLabel:pm.periodLabel});
        S.groups=await loadGroups(S.dept.id);
        closeGrpModal();renderActivities();updateKPIs();toast('Grup creat','ok');
    }
}

// ── Group panel ───────────────────────────────────────────────────────────────
async function openGroupPanel(groupId,actId){
    const grp=S.groups.find(g=>g.id===groupId);if(!grp)return;
    S.activeGroupId=groupId;S.activeGroupObj=grp;S.activeActivity=S.activities.find(a=>a.id===actId)||null;
    text('panel-group-name',grp.nombre||grp.idGrupo||groupId);
    const respNames=(grp.responsablesNoms||[grp.responsableNombre]).filter(Boolean).join(', ');
    text('panel-group-sub',(S.activeActivity?.name||'')+(respNames?' · '+respNames:''));
    // Set today's date
    const today=new Date().toISOString().split('T')[0];const attDate=$('att-date');if(attDate)attDate.value=today;
    // Switch to first tab
    document.querySelectorAll('.panel-tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel-tab-panel').forEach(p=>p.classList.remove('active'));
    document.querySelector('.panel-tab[data-ptab="p-inscrits"]')?.classList.add('active');
    $('p-inscrits')?.classList.add('active');
    $('group-panel')?.classList.add('open');
    $('panel-backdrop')?.classList.add('open');
    await loadGroupInscrits();
}
function closeGroupPanel(){
    $('group-panel')?.classList.remove('open');
    $('panel-backdrop')?.classList.remove('open');
    S.activeGroupId=null;S.activeGroupObj=null;
}

// ── Group inscrits ────────────────────────────────────────────────────────────
async function loadGroupInscrits(){
    const container=$('group-inscrits-list');if(!container)return;
    container.innerHTML='<div style="color:#94a3b8;font-size:.82rem;padding:8px">Carregant...</div>';
    const enrolled=await loadGroupEnrolled(S.activeGroupId);
    const ids=enrolled.map(e=>e.beneficiarioId);
    if(!enrolled.length){container.innerHTML='<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><p>Sense participants en aquest grup.</p></div>';return;}
    container.innerHTML=enrolled.map(e=>{const b=S.allBeneficiaris.find(x=>x.id===e.beneficiarioId)||{name:e.nombre||e.beneficiarioId,age:e.edad};return `<div class="inscrit-card" style="margin-bottom:8px;"><div class="inscrit-avatar">${esc((b.name||'?').charAt(0).toUpperCase())}</div><div><div class="inscrit-name">${esc(b.name||e.nombre||e.beneficiarioId)}</div><div class="inscrit-meta">${b.age||e.edad?`${b.age||e.edad} anys`:''} ${e.estado==='Excepcion'||e.estado==='Excepcio'?'<span style="color:#d97706">(Excepcio)</span>':''}</div></div><button class="btn-remove" onclick="window._dept.removeFromGroup('${esc(e.docId)}','${esc(e.beneficiarioId)}')">Treure</button></div>`;}).join('');
    // update grp object
    const grp=S.groups.find(g=>g.id===S.activeGroupId);if(grp)grp.beneficiarios=ids;
    // fill seg participant select
    const sel=$('seg-participant');if(sel){sel.innerHTML='<option value="">- Tot el grup -</option>'+enrolled.map(e=>{const b=S.allBeneficiaris.find(x=>x.id===e.beneficiarioId)||{name:e.nombre||e.beneficiarioId};return `<option value="${esc(e.beneficiarioId)}">${esc(b.name||e.nombre||e.beneficiarioId)}</option>`;}).join('');}
}
function searchGroupBen(){
    const q=norm($('grp-ben-search')?.value||'');const res=$('grp-ben-results');if(!res)return;
    if(q.length<2){res.innerHTML='<div style="font-size:.8rem;color:#94a3b8;padding:6px">Escriu almenys 2 caracters...</div>';return;}
    const currentGrp=S.groups.find(g=>g.id===S.activeGroupId);
    const currentIds=Array.isArray(currentGrp?.beneficiarios)?currentGrp.beneficiarios:[];
    // search from dept enrolled
    const pool=S.deptBenIds.length?S.allBeneficiaris.filter(b=>S.deptBenIds.includes(b.id)):S.allBeneficiaris;
    const matches=pool.filter(b=>!currentIds.includes(b.id)&&norm(b.name).includes(q)).slice(0,8);
    if(!matches.length){res.innerHTML='<div style="font-size:.8rem;color:#94a3b8;padding:6px">Cap resultat.</div>';return;}
    res.innerHTML=matches.map(b=>`<div class="result-item"><span>${esc(b.name)}${b.age?' ('+b.age+' a)':''}</span><button class="btn-primary btn-sm" onclick="window._dept.addToGroup('${esc(b.id)}')">+ Afegir</button></div>`).join('');
}
// ── Age exception state ───────────────────────────────────────────────────────
const _ageExc={benId:null};

async function addToGroup(benId){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const b=S.allBeneficiaris.find(x=>x.id===benId);if(!b)return;
    const grp=S.groups.find(g=>g.id===S.activeGroupId);if(!grp)return;
    const ageMin=S.activeActivity?.ageMin??0;const ageMax=S.activeActivity?.ageMax??99;
    const age=b.age||calcAge(b.birthDate);
    // Out of age range → request director authorization
    if(age<ageMin||age>ageMax){
        _ageExc.benId=benId;
        const warn=$('age-exc-warning');
        if(warn)warn.innerHTML=`<strong>${esc(b.name)}</strong> té <strong>${age} anys</strong>. El rang d'edat de l'activitat <em>${esc(S.activeActivity?.name||'')}</em> és <strong>${ageMin}–${ageMax} anys</strong>.<br><br>Cal una autorització de direcció per admetre aquest participant fora de rang.`;
        if($('age-exc-motiu'))$('age-exc-motiu').value='';
        $('age-exc-modal')?.classList.add('open');
        return;
    }
    try{
        await BeneficiariosGruposDB.agregar(S.activeGroupId,benId,b.name,age,'Correcto',null,null,currentPeriodMeta());
        const ids=Array.isArray(grp.beneficiarios)?grp.beneficiarios:[];if(!ids.includes(benId)){ids.push(benId);grp.beneficiarios=ids;}
        $('grp-ben-search').value='';$('grp-ben-results').innerHTML='';
        await loadGroupInscrits();renderActivities();toast('Participant afegit','ok');
    }catch(e){console.error(e);toast('Error en afegir','err');}
}
function closeAgeExcModal(){$('age-exc-modal')?.classList.remove('open');_ageExc.benId=null;}
async function submitAgeException(){
    const motiu=$('age-exc-motiu')?.value.trim();
    if(!motiu){toast('El motiu és obligatori','err');return;}
    const benId=_ageExc.benId;if(!benId)return;
    const b=S.allBeneficiaris.find(x=>x.id===benId);if(!b)return;
    const grp=S.groups.find(g=>g.id===S.activeGroupId);if(!grp)return;
    const age=b.age||calcAge(b.birthDate);
    const uid=window.Auth?.getUser?.()?.uid||localStorage.getItem('userEmail')||'';
    const unom=window.Auth?.getUser?.()?.displayName||localStorage.getItem('userName')||'';
    try{
        await addDoc(collection(db,'autoritzacions_edat'),{
            beneficiariId:benId,beneficiariNom:b.name,edat:age,
            edatMin:S.activeActivity?.ageMin??0,edatMax:S.activeActivity?.ageMax??99,
            motiu,
            grupoId:S.activeGroupId,grupoNom:grp.nombre||grp.name||S.activeGroupId,
            activityId:S.activeActivity?.id||'',activityNom:S.activeActivity?.name||'',
            departmentId:S.dept?._fsId||S.dept?.id||'',departmentNom:S.dept?.name||S.dept?.nombre||'',
            solicitantId:uid,solicitantNom:unom,
            estat:'pendent',
            createdAt:serverTimestamp()
        });
        closeAgeExcModal();
        $('grp-ben-search').value='';$('grp-ben-results').innerHTML='';
        toast('Sol·licitud enviada a direcció','ok');
    }catch(e){console.error(e);toast('Error enviant la sol·licitud','err');}
}
async function removeFromGroup(docId,benId){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    try{
        await deleteDoc(doc(db,'beneficiarios_grupos',docId));
        const grp=S.groups.find(g=>g.id===S.activeGroupId);
        if(grp&&Array.isArray(grp.beneficiarios)){grp.beneficiarios=grp.beneficiarios.filter(id=>id!==benId);}
        try{await updateDoc(doc(db,'grupos',S.activeGroupId),{beneficiarios:grp.beneficiarios||[]});}catch{}
        await loadGroupInscrits();renderActivities();toast('Participant eliminat','warn');
    }catch(e){console.error(e);toast('Error en treure','err');}
}

// ── Attendance ────────────────────────────────────────────────────────────────
async function loadAttendance(){
    const fecha=$('att-date')?.value;if(!fecha){toast('Selecciona una data','warn');return;}
    const tbody=$('att-tbody');if(!tbody)return;
    const grp=S.groups.find(g=>g.id===S.activeGroupId);
    const benIds=Array.isArray(grp?.beneficiarios)?grp.beneficiarios:[];
    if(!benIds.length){tbody.innerHTML='<tr><td colspan="2" style="padding:20px;color:#94a3b8;text-align:center;">Sense participants en el grup</td></tr>';return;}
    try{
        const existing=await GruposLogic.obtenerAsistenciasDelDia(S.activeGroupId,fecha);
        const map={};existing.forEach(r=>{map[r.beneficiarioId]=r.estado||r.asistio;});
        tbody.innerHTML=benIds.map(id=>{const b=S.allBeneficiaris.find(x=>x.id===id)||{name:id};const val=map[id]||'';return `<tr><td>${esc(b.name)}</td><td><select class="att-select" data-bid="${esc(id)}"><option value="">-</option><option value="P" ${val==='P'?'selected':''}>Present (P)</option><option value="F" ${val==='F'?'selected':''}>Absent (F)</option><option value="FJ" ${val==='FJ'?'selected':''}>Justificat (FJ)</option></select></td></tr>`;}).join('');
    }catch(e){console.error(e);toast('Error carregant assistencia','err');}
}
function markAll(val){document.querySelectorAll('.att-select').forEach(s=>s.value=val);}
async function saveAttendance(){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const fecha=$('att-date')?.value;if(!fecha){toast('Selecciona una data','warn');return;}
    const rows=document.querySelectorAll('.att-select');let saved=0;
    const user=window.Auth?.getUser?.();const uid=user?.uid||user?.id||'';const uname=user?.displayName||user?.nombre||localStorage.getItem('userName')||'';
    try{
        for(const s of rows){if(s.value){await GruposLogic.guardarAsistenciaConEstado(S.activeGroupId,s.dataset.bid,fecha,s.value,uid,uname,currentPeriodMeta());saved++;}}
        toast(`${saved} registres guardats`,'ok');
    }catch(e){console.error(e);toast('Error guardant','err');}
}

// ── Seguiments ────────────────────────────────────────────────────────────────
async function loadSeg(){
    const list=$('seg-list');if(!list)return;
    list.innerHTML='<div style="color:#94a3b8;font-size:.82rem;padding:8px">Carregant...</div>';
    const segs=await loadSeguiments(S.activeGroupId);
    if(!segs.length){list.innerHTML='<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Sense seguiments registrats.</p></div>';return;}
    list.innerHTML=segs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(s=>`<div class="seg-list-item"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;"><div class="seg-list-item-title">${esc(s.title||s.tipo||'Seguiment')}</div><span class="seg-pill">${esc(s.type||s.kind||'')}</span></div><div class="seg-list-item-meta">${esc(fmtDate(s.date||s.fecha||''))}${s.participantName?' · '+esc(s.participantName):''}${s.rating?' · Valoracio: '+esc(String(s.rating)):''}</div>${s.content?`<div style="font-size:.82rem;color:#475569;margin-top:6px;white-space:pre-wrap;">${esc(s.content)}</div>`:''}</div>`).join('');
}
function showSegForm(){$('seg-view').style.display='none';$('seg-form-view').style.display='block';$('seg-date').value=new Date().toISOString().split('T')[0];}
function hideSegForm(){$('seg-view').style.display='';$('seg-form-view').style.display='none';}
async function saveFollowup(){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const title=$('seg-title').value.trim();if(!title){toast('El titol es obligatori','err');return;}
    const participantId=$('seg-participant').value;
    const participantName=participantId?$('seg-participant').selectedOptions[0]?.text:'';
    const payload={groupId:S.activeGroupId,activityId:S.activeActivity?.id||'',departmentId:S.dept?.id||'',type:$('seg-type').value,title,date:$('seg-date').value,content:$('seg-content').value.trim(),rating:Number($('seg-rating').value)||5,participantId:participantId||'',participantName,createdAt:new Date().toISOString(),createdBy:localStorage.getItem('userName')||'',...currentPeriodMeta()};
    try{
        await addDoc(collection(db,'seguimientos'),{...payload,fechaCreacion:serverTimestamp()});
        hideSegForm();await loadSeg();
        text('kpi-seg',Number($('kpi-seg').textContent||0)+1);
        toast('Seguiment guardat','ok');
    }catch(e){console.error(e);toast('Error guardant','err');}
}

// ── Coordinacio / Reforcos ──────────────────────────────────────────────────
const _reforcModal = { groupId:'', activityId:'' };

function renderCoordBoard(){
    const host=$('coord-board');
    if(!host)return;
    text('coord-dept-name',S.dept?.name||S.dept?.nombre||'Departament');
    const activeCount=S.staff.filter(s=>!isAbsent(s.estado||s.status||'')).length;
    text('coord-active-users',String(activeCount));

    if(!S.activities.length){
        host.innerHTML='<div class="empty-box"><svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg><p>No hi ha activitats per mostrar al panell de coordinacio.</p></div>';
        renderFloatingStaff();
        return;
    }

    host.innerHTML=S.activities.map((act)=>{
        const groups=S.groups.filter(g=>(g.actividadId===act.id||g.activityId===act.id));
        if(!groups.length)return '';
        const rows=groups.map((g)=>{
            const titularId=(Array.isArray(g.responsablesIds)&&g.responsablesIds[0])||g.responsableId||'';
            const titularById=pickStaffById(titularId);
            const titularName=titularById?.name||(g.responsablesNoms&&g.responsablesNoms[0])||g.responsableNombre||'Sense titular';
            const titularAbsent=isAbsent(titularById?.estado||titularById?.status||'');
            const reforc=activeReforcForGroup(g.id);
            const reforcName=reforc?.workerName||'--';
            const volunteers=Array.isArray(g.responsablesIds)
                ? g.responsablesIds.map(id=>pickStaffById(id)).filter(s=>s&&isVolunteer(s)).length
                : 0;

            return `<div class="coord-group-row">
                <div>
                    <div class="coord-group-name">Grup: ${esc(g.nombre||g.name||g.id)}</div>
                    <div class="coord-lines">
                        <div class="coord-line">Titular: <strong>${esc(titularName)}</strong> ${statusPill(!titularAbsent)}</div>
                        <div class="coord-line">Reforc: <span class="pill-soft">${esc(reforcName)}</span></div>
                        <div class="coord-line">Voluntaris: ${volunteers} ${volunteers?'<span class="pill-ok">Assignat</span>':''}</div>
                    </div>
                </div>
                <div class="coord-actions">
                    <button class="btn-reforc" onclick="window._dept.openReforcModal('${esc(g.id)}','${esc(act.id)}')">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                        Assignar reforc
                    </button>
                    <button class="btn-sec btn-sm" onclick="window._dept.openGroupPanel('${esc(g.id)}','${esc(act.id)}')">Obrir grup</button>
                </div>
            </div>`;
        }).join('');

        return `<section class="coord-section">
            <div class="coord-section-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l2.5 2.5"></path></svg>
                Seccio: ${esc(act.name||act.id)}
            </div>
            ${rows}
        </section>`;
    }).join('');

    renderFloatingStaff();
}

function renderFloatingStaff(){
    const host=$('coord-floating-list');
    if(!host)return;
    const assignedIds=new Set();
    S.groups.forEach(g=>{
        if(g.responsableId)assignedIds.add(String(g.responsableId));
        if(Array.isArray(g.responsablesIds))g.responsablesIds.forEach(id=>assignedIds.add(String(id)));
    });
    S.reforcos.forEach(r=>{if(r.workerId)assignedIds.add(String(r.workerId));});

    const floaters=S.staff.filter(s=>{
        if(isAbsent(s.estado||s.status||''))return false;
        const sid=String(s.id||s.firebaseUid||s.uid||'');
        return sid && !assignedIds.has(sid);
    });

    if(!floaters.length){
        host.innerHTML='<div style="font-size:.82rem;color:#9a3412;">No hi ha personal flotant disponible avui.</div>';
        return;
    }

    host.innerHTML=floaters.map(s=>`<div class="floating-item">
        <div>
            <strong>${esc(s.name||'Sense nom')}</strong>
            <span>${esc(s.rol||s.role||s.cargo||'Personal disponible')}</span>
        </div>
        <button class="btn-sec btn-sm" onclick="window._dept.openReforcModal('', '', '${esc(String(s.id||s.firebaseUid||s.uid||''))}')">Mover a grupo</button>
    </div>`).join('');
}

function availableWorkersForReforc(){
    return S.staff.filter(s=>!isAbsent(s.estado||s.status||''));
}

function openReforcModal(groupId='', activityId='', preselectWorkerId=''){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    _reforcModal.groupId=groupId||'';
    _reforcModal.activityId=activityId||'';
    const group=S.groups.find(g=>String(g.id)===String(groupId));
    text('reforc-modal-title',`Assignar personal de reforc a: ${group?.nombre||group?.name||'Seleccionar grup'}`);

    const sel=$('reforc-person');
    const workers=availableWorkersForReforc();
    sel.innerHTML='<option value="">-- Selecciona persona --</option>' + workers.map(s=>{
        const sid=String(s.id||s.firebaseUid||s.uid||'');
        return `<option value="${esc(sid)}">${esc(workerLabel(s))}</option>`;
    }).join('');
    if(preselectWorkerId)sel.value=String(preselectWorkerId);

    document.querySelectorAll('input[name="reforc-mode"]').forEach(r=>{r.checked=(r.value==='today');});
    if($('reforc-until-date'))$('reforc-until-date').value='';
    if($('reforc-notify'))$('reforc-notify').checked=true;
    if($('reforc-err'))$('reforc-err').style.display='none';
    $('reforc-modal')?.classList.add('open');
}

function closeReforcModal(){
    $('reforc-modal')?.classList.remove('open');
    _reforcModal.groupId='';
    _reforcModal.activityId='';
}

async function confirmReforcAssignacio(){
    if(isReadonlyView()){toast('Periode historic: només lectura','warn');return;}
    const err=$('reforc-err');
    const workerId=$('reforc-person')?.value||'';
    const mode=(document.querySelector('input[name="reforc-mode"]:checked')||{}).value||'today';
    const untilDate=$('reforc-until-date')?.value||'';
    const notify=!!$('reforc-notify')?.checked;
    const btn=$('btn-reforc-confirm');

    if(!workerId){
        err.textContent='Selecciona una persona per continuar.';
        err.style.display='block';
        return;
    }
    if(mode==='until' && !untilDate){
        err.textContent='Indica la data de finalitzacio del reforc.';
        err.style.display='block';
        return;
    }

    const group=S.groups.find(g=>String(g.id)===String(_reforcModal.groupId));
    if(!group){
        err.textContent='Cal seleccionar un grup de desti.';
        err.style.display='block';
        return;
    }
    const activity=S.activities.find(a=>String(a.id)===String(_reforcModal.activityId));
    const worker=pickStaffById(workerId);
    if(!worker){
        err.textContent='No s\'ha trobat la persona seleccionada.';
        err.style.display='block';
        return;
    }

    btn.disabled=true;
    btn.textContent='Guardant...';
    try{
        const today=todayStr();
        const payload={
            deptId:S.dept?._fsId||S.dept?.id||'',
            deptName:S.dept?.name||S.dept?.nombre||'',
            activityId:activity?.id||'',
            activityName:activity?.name||'',
            groupId:group.id,
            groupName:group.nombre||group.name||group.id,
            ...currentPeriodMeta(),
            workerId:String(workerId),
            workerName:worker.name||'',
            workerRole:worker.rol||worker.role||worker.cargo||'',
            mode,
            untilDate:mode==='until'?untilDate:(mode==='today'?today:''),
            status:'active',
            assignedByUid:S.user.uid||'',
            assignedByName:S.user.name||localStorage.getItem('userName')||'',
            assignedAt:serverTimestamp(),
            updatedAt:serverTimestamp()
        };
        await setDoc(doc(db,'coordinacio_reforcos',`${group.id}_${workerId}_${Date.now()}`),payload);

        if(notify){
            await addDoc(collection(db,'notificaciones'),{
                type:'assignacio_reforc',
                titol:'Nova assignacio de grup',
                missatge:`La coordinacio t\'ha assignat com a reforc al grup "${payload.groupName}".`,
                target:'users',
                targetUid:String(workerId),
                targetUids:[String(workerId)],
                route:`departament.html?dept=${encodeURIComponent(S.slug)}`,
                deptId:payload.deptId,
                groupId:payload.groupId,
                periodId:payload.periodId||'',
                periodLabel:payload.periodLabel||'',
                activa:true,
                createdAt:serverTimestamp(),
                createdByEmail:S.user.email||localStorage.getItem('userEmail')||'',
                createdByName:S.user.name||localStorage.getItem('userName')||''
            });
        }

        closeReforcModal();
        toast('Assignacio de reforc confirmada','ok');
    }catch(e){
        console.error(e);
        err.textContent='No s\'ha pogut guardar l\'assignacio.';
        err.style.display='block';
    }finally{
        btn.disabled=false;
        btn.textContent='Confirmar assignacio';
    }
}

function renderMyNotifs(){
    const host=$('coord-my-notifs');
    const badge=$('coord-my-notif-count');
    if(!host||!badge)return;
    const unread=S.myNotifs.filter(n=>!(Array.isArray(n.readByUids)&&n.readByUids.includes(S.user.uid))).length;
    if(unread){
        badge.style.display='inline-flex';
        badge.textContent=`${unread} noves`;
    }else{
        badge.style.display='none';
    }

    if(!S.myNotifs.length){
        host.innerHTML='<div style="font-size:.8rem;color:#64748b;">No tens notificacions de reforc pendents.</div>';
        return;
    }

    host.innerHTML=S.myNotifs.map(n=>{
        const isRead=Array.isArray(n.readByUids)&&n.readByUids.includes(S.user.uid);
        return `<div class="notif-item" style="opacity:${isRead?'.72':'1'};">
            <h4>NOVA ASSIGNACIO DE GRUP</h4>
            <p>${esc(n.missatge||n.body||'Has rebut una nova assignacio temporal.')}</p>
            <div class="notif-actions">
                <button class="btn-inline" onclick="window._dept.goToGroupFromNotif('${esc(n.groupId||'')}','${esc(n.activityId||'')}')">Ir al grup</button>
                <button class="btn-inline" onclick="window._dept.markNotifRead('${esc(n.id)}')">Marcar com llegit</button>
            </div>
        </div>`;
    }).join('');
}

async function markNotifRead(notifId=''){
    if(!notifId||!S.user.uid)return;
    try{
        await updateDoc(doc(db,'notificaciones',notifId),{ readByUids: arrayUnion(S.user.uid), updatedAt: serverTimestamp() });
    }catch(e){
        console.warn('No s\'ha pogut marcar com llegit',e);
    }
}

function goToGroupFromNotif(groupId='', activityId=''){
    if(!groupId)return;
    openGroupPanel(groupId,activityId);
}

function setupCoordRealtime(){
    if(S._unsubReforcos)S._unsubReforcos();
    if(S._unsubMyNotifs)S._unsubMyNotifs();
    const deptId=S.dept?._fsId||S.dept?.id||'';
    if(!deptId)return;

    const qRef=query(collection(db,'coordinacio_reforcos'), where('deptId','==',deptId), limit(200));
    S._unsubReforcos=onSnapshot(qRef,(snap)=>{
        S.reforcos=snap.docs
            .map(d=>({id:d.id,...d.data()}))
            .filter(r=>String(r.status||'active')==='active')
            .filter(isForViewedPeriod)
            .sort((a,b)=>{
                const ta=(a.assignedAt&&typeof a.assignedAt.toDate==='function')?a.assignedAt.toDate().getTime():0;
                const tb=(b.assignedAt&&typeof b.assignedAt.toDate==='function')?b.assignedAt.toDate().getTime():0;
                return tb-ta;
            });
        renderCoordBoard();
    },()=>{ S.reforcos=[]; renderCoordBoard(); });

    if(!S.user.uid){
        S.myNotifs=[];
        renderMyNotifs();
        return;
    }

    const qNotif=query(collection(db,'notificaciones'), orderBy('createdAt','desc'), limit(120));
    S._unsubMyNotifs=onSnapshot(qNotif,(snap)=>{
        S.myNotifs=snap.docs
            .map(d=>({id:d.id,...d.data()}))
            .filter(n=>String(n.type||'')==='assignacio_reforc')
            .filter(isForViewedPeriod)
            .filter(n=>{
                if(n.activa===false)return false;
                const uid=S.user.uid;
                const direct=String(n.targetUid||'')===uid;
                const arr=Array.isArray(n.targetUids)&&n.targetUids.map(v=>String(v)).includes(uid);
                return direct||arr;
            });
        renderMyNotifs();
    },()=>{ S.myNotifs=[]; renderMyNotifs(); });
}

// ── Tab init ──────────────────────────────────────────────────────────────────
function initTabs(){
    document.querySelectorAll('.tab-btn').forEach(btn=>{
        btn.addEventListener('click',async ()=>{
            document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
            btn.classList.add('active');
            $('tab-'+btn.dataset.tab)?.classList.add('active');
            if(btn.dataset.tab==='coordinacio'){
                await ensureStaffLoaded();
                if(!S._unsubReforcos||!S._unsubMyNotifs) setupCoordRealtime();
                renderCoordBoard();
                renderMyNotifs();
            }
            if(btn.dataset.tab==='inscrits')renderInscrits();
            if(btn.dataset.tab==='activitats')renderActivities();
        });
    });
    document.querySelectorAll('.panel-tab').forEach(btn=>{
        btn.addEventListener('click',async()=>{
            document.querySelectorAll('.panel-tab').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.panel-tab-panel').forEach(p=>p.classList.remove('active'));
            btn.classList.add('active');
            $(btn.dataset.ptab)?.classList.add('active');
            if(btn.dataset.ptab==='p-assistencia')await loadAttendance();
            if(btn.dataset.ptab==='p-seguiments')await loadSeg();
        });
    });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot(){
    try{
    const params=new URLSearchParams(window.location.search);
    S.slug=params.get('dept')||'';
    S.user={
        uid:window.Auth?.getUser?.()?.uid||localStorage.getItem('userUid')||'',
        email:window.Auth?.getUser?.()?.email||localStorage.getItem('userEmail')||'',
        name:window.Auth?.getUser?.()?.displayName||localStorage.getItem('userName')||''
    };
    if(!S.slug){hide('dept-loading');show('dept-notfound');return;}

    const depts = await loadDepts();

    const dept=matchDept(depts,S.slug);
    if(!dept){hide('dept-loading');show('dept-notfound');return;}
    S.dept=dept;
    S.deptBenIds=Array.isArray(dept.participantIds)?dept.participantIds:[];

    // Always use the real Firestore document ID for sub-collection queries
    const realDeptId = dept._fsId || dept.id;
    const [activities,groups]=await Promise.all([loadActivities(realDeptId),loadGroups(realDeptId)]);
    S.activities=activities;S.groups=groups;

    renderHero(dept,S.slug);fillConfig(dept);
    bindCycleTypeAutofill();
    await reloadPeriodScopedData();
    initTabs();
    renderCoordBoard();

    const warmupDeferred = () => {
        ensureBeneficiarisLoaded();
        ensureStaffLoaded();
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmupDeferred, { timeout: 1800 });
    } else {
        setTimeout(warmupDeferred, 400);
    }

    // count seguiments (rough)
    try{
        const segSnap=await getDocs(query(collection(db,'seguimientos'),where('departmentId','==',realDeptId)));
        text('kpi-seg',segSnap.size);
    }catch{}

    hide('dept-loading');show('dept-content');
    }catch(err){
        console.error('[boot]',err);
        hide('dept-loading');
        const notFound=$('dept-notfound');
        if(notFound){
            const p=notFound.querySelector('p');
            if(p) p.innerHTML=`<strong>Error carregant el departament</strong><br><code style="font-size:0.8em">${String(err?.message||err)}</code><br><a href="programes-gestio.html">Torna als programes</a>`;
            notFound.style.display='';
        }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────
window._dept={
    saveConfig,searchBeneficiaris,addToDept,removeFromDept,
    resetConfig,
    startNewPeriod,
    openActModal,closeActModal,saveActivity,
    openGrpModal,closeGrpModal,saveGroup,
    openGroupPanel,closeGroupPanel,
    openReforcModal,closeReforcModal,confirmReforcAssignacio,
    markNotifRead,goToGroupFromNotif,
    searchGroupBen,addToGroup,removeFromGroup,
    closeAgeExcModal,submitAgeException,
    loadAttendance,markAll,saveAttendance,
    showSegForm,hideSegForm,saveFollowup,
};

boot();
$('period-selector')?.addEventListener('change',onPeriodSelectorChange);
window.addEventListener('beforeunload', () => {
    if (_unsubBen) _unsubBen();
    if (S._unsubReforcos) S._unsubReforcos();
    if (S._unsubMyNotifs) S._unsubMyNotifs();
});
