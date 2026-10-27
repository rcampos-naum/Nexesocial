// Pure form builders copied from the approved Firebase page. No Firebase/authentication code.
export const firebaseTypes=[
  {
    "key": "firebaseDiary",
    "original": "diari_ind",
    "label": "Diari Individual",
    "scope": "person",
    "icon": "book",
    "color": "#3b82f6",
    "bg": "#eff6ff",
    "description": "Registre diari d'activitats i observacions"
  },
  {
    "key": "firebaseObservation",
    "original": "observacio_ind",
    "label": "Observació Individual",
    "scope": "person",
    "icon": "eye",
    "color": "#8b5cf6",
    "bg": "#f5f3ff",
    "description": "Observació detallada per àrees de desenvolupament"
  },
  {
    "key": "firebaseEvaluation",
    "original": "avaluacio_ind",
    "label": "Avaluació Individual",
    "scope": "person",
    "icon": "barChart",
    "color": "#10b981",
    "bg": "#ecfdf5",
    "description": "Avaluació per competències (1r, 2n i Final)"
  },
  {
    "key": "firebaseGeneralEvaluation",
    "original": "avaluacio_general",
    "label": "Avaluació General",
    "scope": "person",
    "icon": "clipboard",
    "color": "#0ea5e9",
    "bg": "#f0f9ff",
    "description": "Avaluació general integral del beneficiari/ària"
  },
  {
    "key": "firebaseGroupFollowup",
    "original": "seguiment_grup",
    "label": "Seguiment Grupal",
    "scope": "group",
    "icon": "users",
    "color": "#f59e0b",
    "bg": "#fffbeb",
    "description": "Registre d'observació i seguiment de sessions"
  },
  {
    "key": "firebaseActivityPlan",
    "original": "planificacio_act",
    "label": "Planificació Activitats",
    "scope": "group",
    "icon": "calendar",
    "color": "#ef4444",
    "bg": "#fef2f2",
    "description": "Planificació i avaluació d'activitats per trimestre"
  },
  {
    "key": "firebaseGroupEvaluation",
    "original": "avaluacio_grup",
    "label": "Avaluació Grupal",
    "scope": "group",
    "icon": "clipboard",
    "color": "#06b6d4",
    "bg": "#ecfeff",
    "description": "Avaluació grupal i dels participants per període"
  }
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SVGICO = {
    book:      (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    eye:       (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    barChart:  (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    users:     (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    calendar:  (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    clipboard: (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
    folder:    (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    user:      (s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    // Section title icons (small)
    id:        (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    edit:      (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    home:      (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    pin:       (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    alert:     (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    chart:     (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    check:     (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>`,
    target:    (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    list:      (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    flag:      (s=11)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
};

// DOCUMENT TYPE REGISTRY

export function originalForm(key,d={},people=[],groups=[]) {
const S={cdBeneficiarios:[]};
const CURSUS=[...new Set(['2023-24','2024-25','2025-26','2026-27',d.curs].filter(Boolean))];
const RATING_LABELS={'':'—',molt_bona:'Molt bona',bona:'Bona',regular:'Regular',malament:'Malament'};
const RATING_NUM=Object.fromEntries([['','—'],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)])]);
const c=d.contingut||{};
const expOpts=people.map(p=>`<option value="${esc(p.id)}" ${d.expedienteId===p.id?'selected':''}>${esc(p.nom)}</option>`).join('');
const grpOpts=groups.map(g=>`<option value="${esc(g.id)}" ${d.grupId===g.id?'selected':''}>${esc(g.nom)}</option>`).join('');
function hdrInd(d, expOpts) {
    const cdOpts = S.cdBeneficiarios.map(e => `<option value="${e.id}" ${d.expedienteId === e.id ? 'selected' : ''}>${esc(e.nom)}</option>`).join('');
    const filterLabel = S.cdBeneficiarios.length > 0 ? 'Filtrar' : '';
    const filterSelect = S.cdBeneficiarios.length > 0 ? `
        <div class="ff" style="grid-column: 1"><label>${filterLabel}</label>
            <select id="filtro-beneficiarios" onchange="window.cdCambiarFiltro(this.value)">
                <option value="todos" selected>📋 Todos los beneficiarios</option>
                <option value="centro-dia">🏫 Centro de Día</option>
            </select>
        </div>
    ` : '';
    return `<div class="frow c3">
        <div class="ff"><label>Curs</label><select data-f="curs">${CURSUS.map(c => `<option ${(d.curs||'2025-26')===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="ff"><label>Data *</label><input type="date" data-f="data" value="${d.data||''}"></div>
        <div class="ff"><label>Educador/a *</label><input type="text" data-f="educador" placeholder="Nom educador/a" value="${esc(d.educador||'')}"></div>
    </div>
    ${filterSelect}
    <div class="frow c1"><div class="ff"><label>Beneficiari/ària *</label>
        <select id="select-expediente" data-f="expedienteId" onchange="window.cdExpedientChanged(this.value)"><option value="">— Selecciona —</option>${expOpts}</select>
    </div></div>`;
}

function hdrGrp(d, grpOpts) {
    return `<div class="frow c3">
        <div class="ff"><label>Curs</label><select data-f="curs">${CURSUS.map(c => `<option ${(d.curs||'2025-26')===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="ff"><label>Data</label><input type="date" data-f="data" value="${d.data||''}"></div>
        <div class="ff"><label>Educador/a *</label><input type="text" data-f="educador" placeholder="Nom educador/a" value="${esc(d.educador||'')}"></div>
    </div>
    <div class="frow c1"><div class="ff"><label>Grup *</label>
        <select data-f="grupId" onchange="window.cdGrupChanged(this)"><option value="">— Selecciona —</option>${grpOpts}</select>
    </div></div>`;
}

function rrow(label, key, val) {
    const v = (val && typeof val === 'object') ? val : {};
    const opts = Object.entries(RATING_LABELS).map(([k, l]) => `<option value="${k}" ${(v.valor||'')==k?'selected':''}>${l}</option>`).join('');
    return `<tr>
        <td>${esc(label)}</td>
        <td><select class="rsel" data-r="${key}">${opts}</select></td>
        <td><input class="rnote" type="text" placeholder="Observació..." data-rn="${key}" value="${esc(v.notes||'')}"></td>
    </tr>`;
}

function sel(field, options, current) {
    return `<select data-f="${field}">${options.map(o => `<option ${current===o?'selected':''}>${o}</option>`).join('')}</select>`;
}


function fmDiari(d, c, expOpts) {
    function mnthRow(label, key) {
        const MONTHS = ['oct','nov','des','gen','feb','mar','abr','mai','jun'];
        const cells = MONTHS.map(m => `<td style="padding:2px"><input type="number" min="0" max="31" data-f="${key}_${m}" value="${esc(String(c[key+'_'+m]||''))}" style="width:38px;padding:3px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.75rem;text-align:center;font-family:inherit"></td>`).join('');
        return `<tr><td style="padding:6px 8px;font-size:0.8rem;font-weight:600;color:#1e293b;white-space:nowrap">${esc(label)}</td>${cells}<td style="padding:6px 8px;font-size:0.8rem;font-weight:700;color:#2563eb;text-align:center">${MONTHS.reduce((s,m)=>s+(+c[key+'_'+m]||0),0)||''}</td></tr>`;
    }
    function mnthRowSiNo(label, key) {
        const MONTHS = ['oct','nov','des','gen','feb','mar','abr','mai','jun'];
        const cells = MONTHS.map(m => {
            const val = c[key+'_'+m] || '';
            return `<td style="padding:2px"><select data-f="${key}_${m}" style="width:62px;padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.72rem;font-family:inherit"><option value="">—</option><option value="si" ${val==='si'?'selected':''}>Sí</option><option value="no" ${val==='no'?'selected':''}>No</option></select></td>`;
        }).join('');
        const total = MONTHS.filter(m => c[key+'_'+m] === 'si').length;
        return `<tr><td style="padding:6px 8px;font-size:0.8rem;font-weight:600;color:#1e293b;white-space:nowrap">${esc(label)}</td>${cells}<td style="padding:6px 8px;font-size:0.8rem;font-weight:700;color:#2563eb;text-align:center">${total||''}</td></tr>`;
    }
    function indRow(label, key) {
        const MONTHS = ['oct','nov','des','gen','feb','mar','abr','mai','jun'];
        const opts = Object.entries(RATING_LABELS).map(([v,l])=>`<option value="${v}" ${(c[key]?.find?.(r=>r.mes==='X')||{}).val===v?'selected':''}>${l}</option>`).join('');
        const cells = MONTHS.map(m => {
            const saved = Array.isArray(c[key]) ? (c[key].find(r=>r.mes===m)||{}) : {};
            return `<td style="padding:2px"><select data-f="${key}__${m}" style="width:90px;padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.68rem;font-family:inherit"><option value="">—</option>${['molt_bona','bona','regular','malament'].map(v=>`<option value="${v}" ${saved.val===v?'selected':''}>${RATING_LABELS[v]}</option>`).join('')}</select></td>`;
        }).join('');
        return `<tr><td style="padding:6px 8px;font-size:0.78rem;font-weight:600;color:#1e293b;max-width:200px">${esc(label)}</td>${cells}</tr>`;
    }
    const MONTHS = ['oct','nov','des','gen','feb','mar','abr','mai','jun'];
    const mHdr = MONTHS.map(m=>`<th style="padding:5px 3px;font-size:0.62rem;font-weight:800;text-transform:uppercase;color:#64748b;min-width:42px">${m.toUpperCase()}</th>`).join('');
    const tStyle = 'width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:4px';
    return `
    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>
    ${hdrInd(d, expOpts)}</div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.calendar(11)} ACONSEGUIR UNA ASSISTÈNCIA ESTABLE I CONTINUADA</div>
        <div style="overflow-x:auto"><table style="${tStyle}">
            <thead><tr><th style="text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:200px">Indicador</th>${mHdr}<th style="padding:5px;font-size:0.62rem;color:#64748b">TOTAL</th></tr></thead>
            <tbody>
                ${mnthRow("Assistència mensual de l'infant (racó)(*)", 'assist_raco')}
                ${mnthRow("Assistència mensual de l'infant (lúdiques)(*)", 'assist_ludiques')}
            </tbody>
        </table></div>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions</label><textarea data-f="obs_assistencia">${esc(c.obs_assistencia||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.edit()} MILLORAR ELS HÀBITS D'ESTUDI</div>
        <p style="font-size:0.75rem;color:#64748b;margin:0 0 10px">Qualificació per mes: Molt bona / Bona / Regular / Malament</p>
        <div style="overflow-x:auto"><table style="${tStyle}">
            <thead><tr><th style="text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:220px">Indicador (*)</th>${mHdr}</tr></thead>
            <tbody>
                ${indRow("S'organitza i planifica les tasques", 'hab_organitza')}
                ${indRow("Du l'agenda i el material escolar", 'hab_agenda')}
                ${indRow('Bon seguiment de les tasques escolars', 'hab_seguiment')}
                ${indRow('És autònom per fer les tasques', 'hab_autonomia')}
                ${indRow("Adequada implicació de l'infant a l'escola", 'hab_implicacio')}
            </tbody>
        </table></div>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions</label><textarea data-f="obs_habits">${esc(c.obs_habits||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.users(11)} MILLORAR LES RELACIONS INTERPERSONALS</div>
        <div style="overflow-x:auto"><table style="${tStyle}">
            <thead><tr><th style="text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:220px">Indicador (*)</th>${mHdr}</tr></thead>
            <tbody>
                ${indRow('Participa positivament a les activitats', 'rel_participa')}
                ${indRow('Es sent bé dintre del grup', 'rel_sentbe')}
                ${indRow('Relacions i vincles són positius amb adults', 'rel_adults')}
                ${indRow('Relacions i vincles són positius amb iguals', 'rel_iguals')}
                ${indRow('Fa una bona gestió dels conflictes', 'rel_conflictes')}
                ${indRow('Identifica i gestiona les emocions', 'rel_emocions')}
            </tbody>
        </table></div>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions</label><textarea data-f="obs_relacions">${esc(c.obs_relacions||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.alert()} DETECTAR SITUACIONS DE RISC</div>
        <div style="overflow-x:auto"><table style="${tStyle}">
            <thead><tr><th style="text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:220px">Indicador (*)</th>${mHdr}</tr></thead>
            <tbody>
                ${indRow("L'infant és puntual", 'risc_puntual')}
                ${indRow("Supervisió i cura de la família és adequada", 'risc_familia')}
                ${indRow("El context familiar és segur per l'infant", 'risc_context')}
            </tbody>
        </table></div>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions</label><textarea data-f="obs_risc">${esc(c.obs_risc||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.check()} MILLORAR ELS HÀBITS DE VIDA SALUDABLE</div>
        <div style="overflow-x:auto"><table style="${tStyle}">
            <thead><tr><th style="text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:220px">Indicador (*)</th>${mHdr}<th style="padding:5px;font-size:0.62rem;color:#64748b">TOTAL SÍ</th></tr></thead>
            <tbody>
                ${mnthRowSiNo("Participa d'activitats d'esport i/o moviment", 'salut_esport')}
                ${mnthRowSiNo("Fa ús dels berenars saludables", 'salut_berenars')}
            </tbody>
        </table></div>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions</label><textarea data-f="obs_salut">${esc(c.obs_salut||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.pin()} Informació addicional</div>
        <div class="frow"><div class="ff"><label>Escola i curs</label><input type="text" data-f="escola" value="${esc(c.escola||'')}"></div>
        <div class="ff"><label>Grup</label><input type="text" data-f="grup" value="${esc(c.grup||'')}"></div></div>
        <div class="frow"><div class="ff"><label>Programes</label><input type="text" data-f="programes" value="${esc(c.programes||'')}"></div>
        <div class="ff"><label>"La Caixa"</label><input type="text" data-f="la_caixa" value="${esc(c.la_caixa||'')}"></div></div>
        <div class="frow"><div class="ff"><label>Voluntaris/es</label><input type="text" data-f="voluntaris" value="${esc(c.voluntaris||'')}"></div><div class="ff"></div></div>
    </div>`;
}

// OBSERVACIÓ INDIVIDUAL — from Diario de observación.xlsx (simple: Fecha + Observaciones)
function fmObservacio(d, c, expOpts) {
    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>${hdrInd(d, expOpts)}</div>
    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.eye(11)} Diari d'observació</div>
        <div class="frow c1"><div class="ff"><label>Data</label><input type="date" data-f="data_obs" value="${esc(c.data_obs||d.data||'')}"></div></div>
        <div class="frow c1"><div class="ff"><label>Observacions</label><textarea data-f="observacions" style="min-height:200px" placeholder="Descriure les observacions del dia...">${esc(c.observacions||'')}</textarea></div></div>
    </div>`;
}

// AVALUACIÓ INDIVIDUAL (1ª, 2ª i FINAL) — exact items from AVAL templates
function fmAvaluacioInd(d, c, expOpts) {
    function arow(label, key) {
        const opts = Object.entries(RATING_LABELS).map(([v,l])=>`<option value="${v}" ${(c[key]?.val||'')==v?'selected':''}>${l}</option>`).join('');
        return `<tr>
            <td style="padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b">${esc(label)}</td>
            <td style="padding:5px"><select class="rsel" data-r="${key}" style="min-width:130px"><option value="">— Selecciona —</option>${opts}</select></td>
            <td style="padding:5px"><input class="rnote" type="text" placeholder="Observació..." data-rn="${key}" value="${esc(c[key]?.notes||'')}"></td>
        </tr>`;
    }
    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>
    ${hdrInd(d, expOpts)}
    <div class="frow c3">
        <div class="ff"><label>Període *</label>
            <select data-f="periode">
                <option value="">— Selecciona —</option>
                ${['1a Avaluació (Desembre)','2a Avaluació (Març)','Avaluació Final (Juny)'].map(o=>`<option ${(c.periode||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
        <div class="ff"><label>Escola</label><input type="text" data-f="escola" value="${esc(c.escola||'')}"></div>
        <div class="ff"><label>Grup</label><input type="text" data-f="grup" value="${esc(c.grup||'')}"></div>
    </div>
    <div class="frow">
        <div class="ff"><label>Programes</label><input type="text" data-f="programes" value="${esc(c.programes||'')}"></div>
        <div class="ff"><label>Voluntaris/es</label><input type="text" data-f="voluntaris" value="${esc(c.voluntaris||'')}"></div>
    </div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.edit()} REFORÇ EDUCATIU</div>
        <p style="font-size:0.73rem;color:#64748b;margin:0 0 10px">* Cada ítem s'ha de contestar amb: Molt bona / Bona / Regular / Malament. Afegir SEMPRE una petita observació.</p>
        <table class="rtable"><thead><tr><th style="width:230px">Ítem</th><th style="width:155px">Qualificació</th><th>Observació</th></tr></thead><tbody>
            ${arow("Organització / planificació", 'ref_organitzacio')}
            ${arow("Ús agenda", 'ref_agenda')}
            ${arow("Socials", 'ref_socials')}
            ${arow("Matemàtiques", 'ref_matematiques')}
            ${arow("Lingüístiques", 'ref_linguistiques')}
            ${arow("Higiene de l'espai/cura del material", 'ref_higiene')}
            ${arow("Seguiment tasques escolars", 'ref_seguiment')}
            ${arow("Assistència i implicació a les sessions de reforç", 'ref_assistencia')}
            ${arow("Autonomia per fer les tasques", 'ref_autonomia')}
            ${arow("Implicació del menor a l'escola", 'ref_implicacio')}
        </tbody></table>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions generals Reforç Educatiu</label><textarea data-f="obs_reforc">${esc(c.obs_reforc||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.users(11)} ACTIVITATS LÚDIQUES</div>
        <table class="rtable"><thead><tr><th style="width:230px">Ítem</th><th style="width:155px">Qualificació</th><th>Observació</th></tr></thead><tbody>
            ${arow("Participar de les activitats i està integrat en el grup", 'lud_participa')}
            ${arow("Desenvolupa relacions i vincles positius amb adults", 'lud_vincles_adults')}
            ${arow("Desenvolupa relacions i vincles positius amb iguals", 'lud_vincles_iguals')}
        </tbody></table>
        <div class="frow c1" style="margin-top:10px"><div class="ff"><label>Observacions generals Activitats Lúdiques</label><textarea data-f="obs_ludiques">${esc(c.obs_ludiques||'')}</textarea></div></div>
    </div>`;
}

// AVALUACIÓ GENERAL — integral view across key dimensions
function fmAvaluacioGeneral(d, c, expOpts) {
    function gRow(label, key) {
        const opts = Object.entries(RATING_NUM).map(([v,l])=>`<option value="${v}" ${(c[key]?.val||'')==v?'selected':''}>${l}</option>`).join('');
        return `<tr>
            <td style="padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b">${esc(label)}</td>
            <td style="padding:5px"><select class="rsel" data-r="${key}" style="min-width:90px">${opts}</select></td>
            <td style="padding:5px"><input class="rnote" type="text" placeholder="Observació..." data-rn="${key}" value="${esc(c[key]?.notes||'')}"></td>
        </tr>`;
    }

    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>
    ${hdrInd(d, expOpts)}
    <div class="frow c3">
        <div class="ff"><label>Període *</label>
            <select data-f="periode">
                <option value="">— Selecciona —</option>
                ${['Inicial','1r Trimestre','2n Trimestre','3r Trimestre','Final de curs'].map(o=>`<option ${(c.periode||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
        <div class="ff"><label>Data d'avaluació</label><input type="date" data-f="data_avaluacio" value="${esc(c.data_avaluacio||d.data||'')}"></div>
        <div class="ff"><label>Nivell general</label>
            <select data-f="nivell_general">
                <option value="">— Selecciona —</option>
                ${['Molt positiu','Positiu','Adequat','Amb dificultats','Prioritari'].map(o=>`<option ${(c.nivell_general||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
    </div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.chart()} Valoració per dimensions (1-10)</div>
        <p style="font-size:0.73rem;color:#64748b;margin:0 0 10px">1 = molt baix, 10 = molt alt. Afegir observació breu a cada dimensió.</p>
        <table class="rtable"><thead><tr><th style="width:260px">Dimensió</th><th style="width:110px">Valoració</th><th>Observació</th></tr></thead><tbody>
            ${gRow('Autonomia personal', 'gen_autonomia')}
            ${gRow('Habilitats socials', 'gen_social')}
            ${gRow('Participació i implicació', 'gen_participacio')}
            ${gRow('Regulació emocional', 'gen_emocional')}
            ${gRow('Comunicació i expressió', 'gen_comunicacio')}
            ${gRow('Rendiment educatiu / escolar', 'gen_escolar')}
            ${gRow('Relació amb adults de referència', 'gen_rel_adults')}
            ${gRow('Relació amb iguals', 'gen_rel_iguals')}
        </tbody></table>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.target()} Síntesi i pla d'acció</div>
        <div class="frow c1"><div class="ff"><label>Fortaleses principals</label><textarea data-f="fortaleses" style="min-height:70px">${esc(c.fortaleses||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Necessitats detectades</label><textarea data-f="necessitats" style="min-height:70px">${esc(c.necessitats||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Objectius prioritaris (proper període)</label><textarea data-f="objectius_prioritaris" style="min-height:70px">${esc(c.objectius_prioritaris||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Intervencions recomanades</label><textarea data-f="intervencions" style="min-height:70px">${esc(c.intervencions||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Observacions finals</label><textarea data-f="obs_finals" style="min-height:80px">${esc(c.obs_finals||'')}</textarea></div></div>
    </div>`;
}

// SEGUIMENT GRUPAL — exact dimensions from REGISTRE OBSERVACIÓ I SEGUIMENT GRUPAL NUEVO.docx
function fmSeguiment(d, c, grpOpts) {
    function dim(label, key, hint) {
        return `<tr>
            <td style="padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b;min-width:220px;vertical-align:top">
                ${esc(label)}<br><span style="font-size:0.7rem;font-weight:400;color:#94a3b8;font-style:italic">${esc(hint)}</span>
            </td>
            <td style="padding:5px;vertical-align:top;min-width:80px">
                <select class="rsel" data-r="${key}" style="min-width:75px">
                    <option value="">—</option>
                    ${Object.entries(RATING_NUM).slice(1).map(([v,l])=>`<option value="${v}" ${(c[key]?.val||'')==v?'selected':''}>${l}</option>`).join('')}
                </select>
            </td>
            <td style="padding:5px;vertical-align:top"><textarea class="rnote" data-rn="${key}" placeholder="Descripció / observació qualitativa..." style="min-height:55px;resize:vertical">${esc(c[key]?.notes||'')}</textarea></td>
        </tr>`;
    }
    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} 1. DADES GENERALS</div>
    ${hdrGrp(d, grpOpts)}
    <div class="frow c3">
        <div class="ff"><label>Trimestre</label>
            <select data-f="trimestre"><option value="">— Selecciona —</option>
            ${['1r Trimestre','2n Trimestre','3r Trimestre'].map(o=>`<option ${(c.trimestre||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
        <div class="ff"><label>Nombre de participants</label><input type="number" data-f="num_participants" min="0" value="${esc(String(c.num_participants||''))}"></div>
        <div class="ff"><label>Rang d'edat del grup</label><input type="text" data-f="rang_edat" placeholder="Ex: 8-12 anys" value="${esc(c.rang_edat||'')}"></div>
    </div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.chart()} 2. OBSERVACIÓ I VALORACIÓ (1 = molt baix / 10 = molt alt)</div>
        <div style="overflow-x:auto"><table class="rtable">
            <thead><tr><th>Dimensió observada</th><th style="min-width:80px">Valoració (1–10)</th><th>Descripció / Observació qualitativa</th></tr></thead>
            <tbody>
                ${dim('Compliment de normes grupals', 'dim_normes', 'El grup respecta les normes del centre, accepta límits, necessita recordatoris constants...')}
                ${dim('Relació entre iguals, respecte i grau d\'acceptació', 'dim_iguals', 'Hi ha respecte, rebuig o burles, aïllament d\'alguns membres, subgrups tancats...')}
                ${dim('Participació i implicació en les activitats', 'dim_participacio', 'El grup participa, s\'implica, mostra interès, abandona les tasques, participa si s\'insisteix...')}
                ${dim('Comunicació i escolta en el grup', 'dim_comunicacio', 'El grup respecta torns de paraula, crida, interromp, sap escoltar, utilitza llenguatge agressiu...')}
                ${dim('Treball en equip i cooperació', 'dim_equip', 'El grup col·labora, comparteix materials, s\'ajuda en tasques grupals, vol fer-ho tot individualment...')}
                ${dim('Responsabilitat dins del grup', 'dim_responsabilitat', 'El grup cuida el material, compleix encàrrecs, recull l\'espai, assumeix responsabilitats...')}
                ${dim('Autoestima i seguretat en si mateixos', 'dim_autoestima', 'El grup mostra seguretat, confia en les seves capacitats, mostra inseguretat, busca aprovació...')}
                ${dim('Autonomia personal', 'dim_autonomia', 'El grup és autònom en les activitats, pren decisions, resol petites dificultats, depèn molt de l\'adult...')}
                ${dim('Empatia i suport entre iguals', 'dim_empatia', 'Al grup s\'ajuden entre companys/es, es preocupen per l\'altre, es riuen, ignoren o no ajuden...')}
                ${dim('Sentiment de pertinença al grup', 'dim_pertinenca', 'El grup se sent part del centre, cuida el grup, hi ha sentiment de grup, volen venir...')}
                ${dim('Regulació emocional i tolerància a la frustració', 'dim_regulacio', 'El grup es frustra fàcilment, hi ha enfados freqüents, saben calmar-se, accepten perdre...')}
                ${dim('Resolució de conflictes', 'dim_conflictes', 'El grup dialoga, demana ajuda, utilitza l\'agressivitat, evita conflictes, busca solucions...')}
                ${dim('Relació i vincle amb l\'educador/a', 'dim_vincle_edu', 'El grup confia en l\'educador/a, busca ajuda, rebutja l\'adult, desafia constantment, hi ha vincle positiu...')}
            </tbody>
        </table></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.target()} 3. OBJECTIUS I EVOLUCIÓ TRIMESTRAL</div>
        <div class="frow c1"><div class="ff"><label>Evolució respecte als objectius plantejats</label><textarea data-f="evolucio_objectius" style="min-height:80px" placeholder="Descriure breument els progressos, dificultats o canvis observats en relació amb els objectius establerts per a aquest trimestre...">${esc(c.evolucio_objectius||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.flag()} 4. FORTALESES, ASPECTES A MILLORAR I ESTRATÈGIES</div>
        <div class="frow c1"><div class="ff"><label>Fortaleses del grup</label><textarea data-f="fortaleses">${esc(c.fortaleses||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Aspectes a millorar</label><textarea data-f="aspectes_millorar">${esc(c.aspectes_millorar||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Estratègies, tècniques i recursos utilitzats</label><textarea data-f="estrategies" placeholder="Ex: cohesió grupal, economia de fitxes, dinàmiques d'habilitats socials, mediació, reforç positiu...">${esc(c.estrategies||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.edit()} 6. EVIDÈNCIES GRÀFIQUES O DOCUMENTALS</div>
        <div class="frow c1">
            <div class="ff">
                <label>Afegir evidència (foto/descripció)</label>
                <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;margin-bottom:8px">
                    <input type="text" id="evidencia-url" placeholder="URL de la imatge (o nom de l'arxiu)" style="padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit">
                    <input type="text" id="evidencia-desc" placeholder="Descripció" style="padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit">
                    <button type="button" onclick="window.cdAgregarEvidencia()" style="grid-column:1/-1;padding:8px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit">+ Afegir evidència</button>
                </div>
                <div id="evidencias-list" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;max-height:200px;overflow-y:auto;margin-bottom:8px"></div>
                <textarea data-f="evidencies" placeholder="Descripció general d'evidències..." style="min-height:60px">${esc(c.evidencies||'')}</textarea>
            </div>
        </div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.pin()} 7. OBSERVACIONS FINALS I PROJECCIONS PER AL PROPER TRIMESTRE</div>
        <div class="frow c1"><div class="ff"><label>Observacions finals / projeccions</label><textarea data-f="obs_finals" style="min-height:80px">${esc(c.obs_finals||'')}</textarea></div></div>
    </div>`;
}

// PLANIFICACIÓ ACTIVITATS — exact evaluation items from PLANIFICACIÓ I AVALUACIÓ ACTIVITATS 25-26.odt
function fmPlanificacio(d, c, grpOpts) {
    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>
    ${hdrGrp(d, grpOpts)}
    <div class="frow c1"><div class="ff"><label>Mes</label><input type="text" data-f="mes" placeholder="Ex: Octubre 2025" value="${esc(c.mes||'')}"></div></div>
    <div class="frow c1"><div class="ff"><label>Rutina de la setmana</label><textarea data-f="rutina" placeholder="Descriure la rutina setmanal...">${esc(c.rutina||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.calendar(11)} Activitats planificades</div>
        <div style="overflow-x:auto"><div style="min-width:750px">
            <div style="display:grid;grid-template-columns:70px 1fr 1fr 1fr 1fr 30px;gap:8px;padding:7px 0;font-size:0.6rem;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0">
                <span>Setmana</span><span>Nom activitat</span><span>Descripció i desenvolupament</span><span>Objectius</span><span>Material</span><span></span>
            </div>
            <div id="act-rows"></div>
        </div></div>
        <button class="btn-add-act" onclick="window.cdAddActRow()">+ Afegir activitat</button>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.chart()} Ítems d'avaluació per sessió</div>
        <p style="font-size:0.75rem;color:#64748b;margin:0 0 10px">Valoració de l'1 al 5 per cada ítem d'avaluació de les sessions realitzades.</p>
        <table class="rtable"><thead><tr><th>Ítem d'avaluació</th><th style="width:130px">Valoració (1–5)</th><th>Observació</th></tr></thead><tbody>
            ${_aval5row('Participació activa dels infants', 'aval_participacio', c)}
            ${_aval5row("Implicació i actitud del voluntariat", 'aval_voluntariat', c)}
            ${_aval5row("Adequació i comprensibilitat de les dinàmiques proposades", 'aval_adequacio', c)}
            ${_aval5row("Idoneïtat dels materials disponibles", 'aval_materials', c)}
            ${_aval5row("Capacitat de reflexió i expressió dels infants", 'aval_reflexio', c)}
            ${_aval5row("Grau d'assoliment dels objectius de la sessió", 'aval_objectius', c)}
            ${_aval5row("Motivació i interès del grup durant l'activitat", 'aval_motivacio', c)}
            ${_aval5row("Cohesió i interacció positiva entre participants", 'aval_cohesio', c)}
        </tbody></table>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Incidències</label><textarea data-f="incidencies">${esc(c.incidencies||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.check()} Valoració global del mes</div>
        <div class="frow c1"><div class="ff"><label>Aspectes positius i potencialitats</label><textarea data-f="aspectes_positius">${esc(c.aspectes_positius||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Propostes de millora</label><textarea data-f="propostes_millora">${esc(c.propostes_millora||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Observacions generals</label><textarea data-f="observacions_generals">${esc(c.observacions_generals||'')}</textarea></div></div>
    </div>`;
}
function _aval5row(label, key, c) {
    const opts = ['','1','2','3','4','5'].map(v=>`<option value="${v}" ${(c[key]?.val||'')==v?'selected':''}>${v||'—'}</option>`).join('');
    return `<tr><td style="padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b">${esc(label)}</td>
        <td style="padding:5px"><select class="rsel" data-r="${key}">${opts}</select></td>
        <td style="padding:5px"><input class="rnote" type="text" placeholder="Observació..." data-rn="${key}" value="${esc(c[key]?.notes||'')}"></td>
    </tr>`;
}

// AVALUACIÓ GRUPAL — from EVALUACION NIÑOS 2025-2026 CENTRE DE DIA.docx
function fmAvaluacioGrup(d, c, grpOpts) {
    return `<div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.id()} Identificació</div>
    ${hdrGrp(d, grpOpts)}
    <div class="frow">
        <div class="ff"><label>Periode *</label>
            <select data-f="periode"><option value="">— Selecciona —</option>
            ${['1a Avaluació (Desembre)','2a Avaluació (Març)','Avaluació Final (Juny)'].map(o=>`<option ${(c.periode||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
        <div class="ff"><label>Valoració general del grup</label>
            <select data-f="valoracio_grup"><option value="">— Selecciona —</option>
            ${['Molt positiva','Positiva','Acceptable','Millorable','Negativa'].map(o=>`<option ${(c.valoracio_grup||'')==o?'selected':''}>${o}</option>`).join('')}
            </select>
        </div>
    </div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.clipboard(11)} Avaluació individual dels participants</div>
        <div id="parts-eval"><p style="color:#64748b;font-size:0.85rem">Selecciona el grup per veure els participants...</p></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.chart()} Resum de l'avaluació del grup</div>
        <div class="frow c1"><div class="ff"><label>Resum narratiu del grup (característiques, incidències, comportament...)</label><textarea data-f="resum_grup" style="min-height:100px" placeholder="Ex: El grup ha tingut una assistència bona. El grup ha destacat per tenir nens/es amb les següents característiques...">${esc(c.resum_grup||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Activitats que han funcionat millor</label><textarea data-f="activ_millors">${esc(c.activ_millors||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Activitats que han funcionat menys</label><textarea data-f="activ_menys">${esc(c.activ_menys||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Sortides i activitats especials destacades</label><textarea data-f="sortides">${esc(c.sortides||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Casos a destacar / prioritzar</label><textarea data-f="casos_destacar" placeholder="Nom: situació...">${esc(c.casos_destacar||'')}</textarea></div></div>
    </div>

    <div class="fsect"><div class="fsect-title" style="display:flex;align-items:center;gap:5px">${SVGICO.flag()} Propostes i millores</div>
        <div class="frow c1"><div class="ff"><label>Suggerències per al proper curs / Activitats que els agradaria fer</label><textarea data-f="suggerencies">${esc(c.suggerencies||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Queixes o aspectes a millorar sobre el funcionament</label><textarea data-f="queixes">${esc(c.queixes||'')}</textarea></div></div>
        <div class="frow c1" style="margin-top:9px"><div class="ff"><label>Propostes de millora per a l'organització del centre de dia</label><textarea data-f="propostes_millora">${esc(c.propostes_millora||'')}</textarea></div></div>
    </div>`;
}


const builders={firebaseDiary:fmDiari,firebaseObservation:fmObservacio,firebaseEvaluation:fmAvaluacioInd,firebaseGeneralEvaluation:fmAvaluacioGeneral,firebaseGroupFollowup:fmSeguiment,firebaseActivityPlan:fmPlanificacio,firebaseGroupEvaluation:fmAvaluacioGrup};
if(!builders[key])throw Error('Unknown Firebase form');
return builders[key](d,c,key.includes('Group')||key==='firebaseActivityPlan'?grpOpts:expOpts);
}

export const originalStyles={
  "display:flex;align-items:center;gap:5px": "fb-style-0",
  "overflow-x:auto": "fb-style-1",
  "width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:4px": "fb-style-2",
  "text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:200px": "fb-style-3",
  "padding:5px 3px;font-size:0.62rem;font-weight:800;text-transform:uppercase;color:#64748b;min-width:42px": "fb-style-4",
  "padding:5px;font-size:0.62rem;color:#64748b": "fb-style-5",
  "padding:6px 8px;font-size:0.8rem;font-weight:600;color:#1e293b;white-space:nowrap": "fb-style-6",
  "padding:2px": "fb-style-7",
  "width:38px;padding:3px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.75rem;text-align:center;font-family:inherit": "fb-style-8",
  "padding:6px 8px;font-size:0.8rem;font-weight:700;color:#2563eb;text-align:center": "fb-style-9",
  "margin-top:10px": "fb-style-10",
  "font-size:0.75rem;color:#64748b;margin:0 0 10px": "fb-style-11",
  "text-align:left;padding:5px 8px;font-size:0.65rem;font-weight:800;color:#64748b;min-width:220px": "fb-style-12",
  "padding:6px 8px;font-size:0.78rem;font-weight:600;color:#1e293b;max-width:200px": "fb-style-13",
  "width:90px;padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.68rem;font-family:inherit": "fb-style-14",
  "width:62px;padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.72rem;font-family:inherit": "fb-style-15",
  "min-height:200px": "fb-style-16",
  "font-size:0.73rem;color:#64748b;margin:0 0 10px": "fb-style-17",
  "width:230px": "fb-style-18",
  "width:155px": "fb-style-19",
  "padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b": "fb-style-20",
  "padding:5px": "fb-style-21",
  "min-width:130px": "fb-style-22",
  "width:260px": "fb-style-23",
  "width:110px": "fb-style-24",
  "min-width:90px": "fb-style-25",
  "min-height:70px": "fb-style-26",
  "margin-top:9px": "fb-style-27",
  "min-height:80px": "fb-style-28",
  "min-width:80px": "fb-style-29",
  "padding:8px 10px;font-size:0.82rem;font-weight:600;color:#1e293b;min-width:220px;vertical-align:top": "fb-style-30",
  "font-size:0.7rem;font-weight:400;color:#94a3b8;font-style:italic": "fb-style-31",
  "padding:5px;vertical-align:top;min-width:80px": "fb-style-32",
  "min-width:75px": "fb-style-33",
  "padding:5px;vertical-align:top": "fb-style-34",
  "min-height:55px;resize:vertical": "fb-style-35",
  "display:grid;grid-template-columns:1fr 120px;gap:8px;margin-bottom:8px": "fb-style-36",
  "padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit": "fb-style-37",
  "grid-column:1/-1;padding:8px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit": "fb-style-38",
  "background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;max-height:200px;overflow-y:auto;margin-bottom:8px": "fb-style-39",
  "min-height:60px": "fb-style-40",
  "min-width:750px": "fb-style-41",
  "display:grid;grid-template-columns:70px 1fr 1fr 1fr 1fr 30px;gap:8px;padding:7px 0;font-size:0.6rem;font-weight:800;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0": "fb-style-42",
  "width:130px": "fb-style-43",
  "color:#64748b;font-size:0.85rem": "fb-style-44",
  "min-height:100px": "fb-style-45"
};
