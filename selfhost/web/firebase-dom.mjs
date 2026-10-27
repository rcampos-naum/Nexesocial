const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ratings=[['','—'],['molt_bona','Molt bona'],['bona','Bona'],['regular','Regular'],['malament','Malament']];
const options=value=>ratings.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${label}</option>`).join('');

// Dynamic original controls use explicit listeners and local data, never inline scripts or remote resources.
export function bindFirebaseForm(root,type,fields,data,readOnly=false) {
  const parse=key=>fields[key]?JSON.parse(fields[key]):[];
  let activities=parse('activitats'), evidence=parse('evidencias_list');
  let participants=parse('parts_eval');
  const participantsByGroup=new Map();
  const groupSelect=root.querySelector('[data-f=grupId]');
  if(groupSelect)participantsByGroup.set(groupSelect.value,participants);
  const activityKeys=['data','activitat','objectiu','materials','avaluacio'];
  const activityLabels=['Data','Activitat','Objectiu','Materials','Avaluació'];
  const drawActivities=()=>{
    const box=root.querySelector('#act-rows');if(!box)return;
    if(!activities.length&&!readOnly)activities=[Object.fromEntries(activityKeys.map(k=>[k,'']))];
    box.innerHTML=activities.map((row,index)=>`<div class="act-row">${activityKeys.map((key,i)=>`<div class="ff"><label>${activityLabels[i]}</label><input type="${key==='data'?'date':'text'}" data-activity="${index}" data-activity-key="${key}" value="${esc(row[key])}" maxlength="2000" ${readOnly?'disabled':''}></div>`).join('')}<button type="button" class="btn-rm" data-remove-activity="${index}" aria-label="Eliminar activitat ${index+1}" ${readOnly?'disabled':''}>×</button></div>`).join('');
  };
  const drawEvidence=()=>{
    const box=root.querySelector('#evidencias-list');if(!box)return;
    box.innerHTML=evidence.map((row,index)=>`<div class="fb-evidence-row"><span><strong>${esc(row.file)}</strong> ${esc(row.description)}</span><button type="button" class="btn-rm" data-remove-evidence="${index}" aria-label="Eliminar evidència ${index+1}" ${readOnly?'disabled':''}>×</button></div>`).join('');
  };
  const captureParticipants=()=>{
    for(const input of root.querySelectorAll('[data-person-id]')){
      const row=participants.find(p=>p.person_id===input.dataset.personId);
      if(row)row[input.dataset.competence]=input.value;
    }
    if(groupSelect)participantsByGroup.set(groupSelect.value,participants);
  };
  const drawParticipants=()=>{
    const box=root.querySelector('#parts-eval');if(!box)return;
    const groupId=groupSelect?.value;
    const saved=participantsByGroup.get(groupId)||[];
    const enrolled=data.enrollments.filter(e=>e.group_id===groupId&&e.active).map(e=>data.people.find(p=>p.id===e.person_id)).filter(Boolean);
    participants=saved.map(p=>({...p}));
    for(const p of (readOnly?[]:enrolled))if(!participants.some(row=>row.person_id===p.id))participants.push({person_id:p.id,name:p.nom+' '+p.cognoms,autonomia:'',social:'',participacio:'',actitud:'',notes:''});
    if(!participants.length){box.innerHTML='<p class="muted">El grup no té membres registrats.</p>';return;}
    box.innerHTML=`<p class="fb-participant-help">1 = Necessita suport &nbsp;|&nbsp; 2 = En procés &nbsp;|&nbsp; 3 = Assolit &nbsp;|&nbsp; 4 = Excel·lent</p><div class="report-rating-scroll"><table class="rtable fb-participant-table"><thead><tr>${['Participant','Autonomia','Social','Participació','Actitud','Observació'].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${participants.map(p=>`<tr><td>${esc(p.name)}</td>${['autonomia','social','participacio','actitud'].map(key=>`<td><select data-person-id="${esc(p.person_id)}" data-competence="${key}" aria-label="${esc(p.name+' · '+key)}" ${readOnly?'disabled':''}>${options(p[key])}</select></td>`).join('')}<td><input type="text" placeholder="Obs..." value="${esc(p.notes)}" data-person-id="${esc(p.person_id)}" data-competence="notes" maxlength="2000" aria-label="${esc(p.name+' · Observació')}" ${readOnly?'disabled':''}></td></tr>`).join('')}</tbody></table></div>`;
  };
  const totals=()=>{
    for(const row of root.querySelectorAll('tr')){
      const attendance=[...row.querySelectorAll('input[data-f^="assist_"]')];
      const health=[...row.querySelectorAll('select[data-f^="salut_"]')];
      if(attendance.length===9)row.lastElementChild.textContent=attendance.reduce((sum,input)=>sum+(Number(input.value)||0),0)||'';
      if(health.length===9)row.lastElementChild.textContent=health.filter(input=>input.value==='si').length||'';
    }
  };
  root.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.activity!==undefined)activities[Number(el.dataset.activity)][el.dataset.activityKey]=el.value;
    if(el.dataset.personId)captureParticipants();
    totals();
  });
  root.addEventListener('change',event=>{
    if(event.target===groupSelect){drawParticipants();}
    if(event.target.dataset.personId)captureParticipants();
    totals();
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||readOnly)return;
    if(button.classList.contains('btn-add-act')){event.preventDefault();if(activities.length<100){activities.push(Object.fromEntries(activityKeys.map(k=>[k,''])));drawActivities();}}
    if(button.dataset.removeActivity!==undefined){event.preventDefault();activities.splice(Number(button.dataset.removeActivity),1);drawActivities();}
    if(button.closest('.ff')?.querySelector('#evidencia-url')&&button.textContent.includes('Afegir evidència')){
      event.preventDefault();const file=root.querySelector('#evidencia-url'),description=root.querySelector('#evidencia-desc');
      if(file.value.trim()&&evidence.length<100){evidence.push({file:file.value.trim(),description:description.value.trim()});file.value='';description.value='';drawEvidence();}
    }
    if(button.dataset.removeEvidence!==undefined){event.preventDefault();evidence.splice(Number(button.dataset.removeEvidence),1);drawEvidence();}
  });
  drawActivities();drawEvidence();drawParticipants();totals();
  let idCounter=0;
  for(const box of root.querySelectorAll('.ff')){
    const label=box.querySelector('label'),input=box.querySelector('input,select,textarea');
    if(label&&input){if(!input.id)input.id='fb_control_'+(++idCounter);label.htmlFor=input.id;}
  }
  if(readOnly)for(const el of root.querySelectorAll('input,select,textarea,button'))el.disabled=true;
  return ()=>{
    captureParticipants();const extra={};
    if(type==='firebaseActivityPlan')extra.activitats=JSON.stringify(activities.filter(row=>Object.values(row).some(Boolean)));
    if(type==='firebaseGroupFollowup')extra.evidencias_list=JSON.stringify(evidence);
    if(type==='firebaseGroupEvaluation')extra.parts_eval=JSON.stringify(participants);
    return extra;
  };
}
