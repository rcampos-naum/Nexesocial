import {firebaseTemplates,originalMonths} from './firebase-adapter.mjs';

export const legacyReferenceTypes={diary:'firebaseDiary',observation:'firebaseObservation',evaluation1:'firebaseEvaluation',evaluation2:'firebaseEvaluation',evaluationFinal:'firebaseEvaluation',groupFollowup:'firebaseGroupFollowup',activityPlan:'firebaseActivityPlan',tribuPlan:'firebaseActivityPlan',groupEvaluation:'firebaseGroupEvaluation'};
const rating={'Molt bona':'molt_bona',Bona:'bona',Regular:'regular',Malament:'malament'};

export function adaptLegacyReport(report) {
  const type=legacyReferenceTypes[report.type];if(!type)return report;
  const old=report.body?JSON.parse(report.body):{},fields={};
  const originalSchema=report.schema_json?JSON.parse(report.schema_json):{fields:[]};
  const target=firebaseTemplates[type];
  const assign=(to,from)=>{if(typeof old[from]==='string')fields[to]=old[from];};
  for(const field of target.fields)if(Object.hasOwn(old,field.key)&&!['activitats','parts_eval','evidencias_list'].includes(field.key))assign(field.key,field.key);
  if(report.type==='observation'){assign('observacions','observacio');fields.data_obs=report.day;}
  if(report.type.startsWith('evaluation')) {
    fields.periode={evaluation1:'1a Avaluació (Desembre)',evaluation2:'2a Avaluació (Març)',evaluationFinal:'Avaluació Final (Juny)'}[report.type];
    const keys=['ref_organitzacio','ref_agenda','ref_socials','ref_matematiques','ref_linguistiques','ref_higiene','ref_seguiment','ref_assistencia','ref_autonomia','ref_implicacio','lud_participa','lud_vincles_adults','lud_vincles_iguals'];
    keys.forEach((key,i)=>{if(old['competencia_'+i])fields[key+'__val']=rating[old['competencia_'+i]]||old['competencia_'+i];assign(key+'__notes','competencia_'+i+'_notes');});
    assign('obs_reforc','observacions');
  }
  if(report.type==='diary'){
    const monthNumber=Number(String(old.mes||'').slice(5,7)),month={10:'oct',11:'nov',12:'des',1:'gen',2:'feb',3:'mar',4:'abr',5:'mai',6:'jun'}[monthNumber];
    if(originalMonths.includes(month)){
      assign('assist_raco_'+month,'assist_raco');assign('assist_ludiques_'+month,'assist_ludiques');
      const keys=['hab_organitza','hab_agenda','hab_seguiment','hab_autonomia','hab_implicacio','rel_participa','rel_sentbe','rel_adults','rel_iguals','rel_conflictes','rel_emocions','risc_puntual','risc_familia','risc_context'];
      keys.forEach((key,i)=>{if(old['indicador_'+i])fields[key+'__'+month]=rating[old['indicador_'+i]]||old['indicador_'+i];});
      if(old.esport)fields['salut_esport_'+month]=old.esport==='Sí'?'si':'no';
      if(old.berenar)fields['salut_berenars_'+month]=old.berenar==='Sí'?'si':'no';
    }
    assign('obs_assistencia','observacions');
  }
  if(report.type==='groupFollowup'){
    const keys=['dim_normes','dim_iguals','dim_participacio','dim_comunicacio','dim_equip','dim_responsabilitat','dim_autoestima','dim_autonomia','dim_empatia','dim_pertinenca','dim_regulacio','dim_conflictes','dim_vincle_edu'];
    keys.forEach((key,i)=>{assign(key+'__val','dim_'+i);assign(key+'__notes','dim_'+i+'_notes');});
    if(old.trimestre)fields.trimestre={ '1r':'1r Trimestre','2n':'2n Trimestre','3r':'3r Trimestre'}[old.trimestre]||old.trimestre;
    for(const [to,from] of [['num_participants','participants'],['rang_edat','edat'],['evolucio_objectius','evolucio'],['aspectes_millorar','millores'],['obs_finals','projeccions']])assign(to,from);
  }
  if(['activityPlan','tribuPlan'].includes(report.type)){
    const keys=['aval_participacio','aval_voluntariat','aval_adequacio','aval_materials','aval_reflexio','aval_objectius','aval_motivacio','aval_cohesio'];
    keys.forEach((key,i)=>{assign(key+'__val','aval_'+i);assign(key+'__notes','aval_'+i+'_notes');});
    for(const [to,from] of [['aspectes_positius','positius'],['propostes_millora','millora'],['observacions_generals','observacions']])assign(to,from);
  }
  if(report.type==='groupEvaluation')for(const [to,from] of [['resum_grup','comportament'],['casos_destacar','casos_prioritaris'],['propostes_millora','propostes']])assign(to,from);
  // Values outside a reference selector/range stay visible in the preserved source section.
  for(const field of target.fields){const value=fields[field.key];if(value&&field.type==='select'&&!field.options.includes(value))delete fields[field.key];if(value&&field.type==='number'&&((field.min!==undefined&&Number(value)<field.min)||(field.max!==undefined&&Number(value)>field.max)))delete fields[field.key];}
  const legacyFields=Object.entries(old).map(([key,value])=>{
    fields['legacy__'+key]=value;
    return {...(originalSchema.fields.find(f=>f.key===key)||{label:key,type:'text'}),key:'legacy__'+key,requiredOnFinal:false};
  });
  return {...report,type,original_type:report.type,body:JSON.stringify(fields),schema_json:JSON.stringify({...target,legacySource:{type:report.type,schema:originalSchema},fields:[...target.fields,...legacyFields]})};
}
