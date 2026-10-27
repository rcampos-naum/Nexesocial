import {firebaseTypes, originalForm, originalStyles} from './firebase-original.mjs';

export const originalMonths=['oct','nov','des','gen','feb','mar','abr','mai','jun'];
const decode=text=>String(text).replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrs=text=>Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const metadata={curs:'course',data:'day',expedienteId:'person_id',grupId:'group_id'};
export const controlKey=a=>a['data-f']|| (a['data-r']?a['data-r']+'__val':a['data-rn']?a['data-rn']+'__notes':null);

function fieldsFor(type) {
  const html=originalForm(type.key), fields=[];
  for(const m of html.matchAll(/<input\b([^>]*)>|<(select|textarea)\b([^>]*)>([\s\S]*?)<\/\2>/g)) {
    const a=attrs(m[1]??m[3]), key=controlKey(a); if(!key||metadata[key])continue;
    const before=html.slice(0,m.index), row=before.slice(before.lastIndexOf('<tr>'));
    const rowLabel=/<td[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1];
    const label=(a['data-r']||a['data-rn']?rowLabel:[...before.matchAll(/<label>([\s\S]*?)<\/label>/g)].at(-1)?.[1])||key;
    const field={key,label:decode(label.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()),type:m[2]||a.type||'text'};
    if(field.type==='select')field.options=[...new Set([...m[4].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o=>attrs(o[1]).value??decode(o[2].replace(/<[^>]+>/g,'').trim())).filter(Boolean))];
    if(a.min)field.min=Number(a.min);if(a.max)field.max=Number(a.max);
    if(key==='educador'||key==='periode')field.requiredOnFinal=true;
    if(!fields.some(f=>f.key===key))fields.push(field);
  }
  if(type.key==='firebaseActivityPlan')fields.push({key:'activitats',label:'Activitats planificades',type:'activityRows'});
  if(type.key==='firebaseGroupFollowup')fields.push({key:'evidencias_list',label:'Evidències gràfiques o documentals',type:'evidenceRows'});
  if(type.key==='firebaseGroupEvaluation')fields.push({key:'parts_eval',label:'Avaluació individual dels participants',type:'participantEvaluations'});
  return fields;
}
export const firebaseTemplates=Object.fromEntries(firebaseTypes.map(t=>[t.key,{label:t.label,scope:t.scope,source:'Firebase · centre-dia-docs.html · '+t.original,presentation:'firebase-original-v1',fields:fieldsFor(t)}]));

export function originalContent(fields) {
  const content={};
  for(const [key,value] of Object.entries(fields)) {
    const monthly=/^(.*)__(oct|nov|des|gen|feb|mar|abr|mai|jun)$/.exec(key);
    const rated=/^(.*)__(val|notes)$/.exec(key);
    if(monthly){(content[monthly[1]]??=[]).push({mes:monthly[2],val:value});}
    else if(rated){(content[rated[1]]??={})[rated[2]]=value;}
    else if(['activitats','evidencias_list','parts_eval'].includes(key))content[key]=value?JSON.parse(value):[];
    else content[key]=value;
  }
  return content;
}

export function firebaseForm(type,report,fields,people,groups) {
  const content=originalContent(fields);
  let html=originalForm(type,{data:escape(report.day||''),curs:escape(report.course||''),educador:fields.educador||'',expedienteId:report.person_id,grupId:report.group_id,contingut:content},people,groups);
  html=html.replace(/<([a-z][\w-]*)\b([^>]*)>/gi,(tag,name,attributes)=>{
    const a=attrs(attributes); let updated=attributes.replace(/\s+on\w+="[^"]*"/g,'');
    if(a.style){const cls=originalStyles[a.style];if(!cls)throw Error('Unregistered original form style');updated=updated.replace(/\s+style="[^"]*"/,'');updated=/\bclass="/.test(updated)?updated.replace(/class="([^"]*)"/,`class="$1 ${cls}"`):updated+` class="${cls}"`;}
    const key=controlKey(a);
    if(key){const fieldName=metadata[key]||'field_'+key;updated+=` name="${fieldName}"`+(!a.id?` id="fb_${key}"`:"");}
    if(name.toLowerCase()==='button'&&!a.type)updated+=' type="button"';
    return '<'+name+updated+'>';
  });
  return '<div class="firebase-original">'+html+'</div>';
}
