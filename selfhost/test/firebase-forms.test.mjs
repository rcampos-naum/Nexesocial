import test from 'node:test';
import assert from 'node:assert/strict';
import {firebaseTypes,originalForm,originalStyles} from '../web/firebase-original.mjs';
import {firebaseTemplates,firebaseForm,originalContent} from '../web/firebase-adapter.mjs';
import {adaptLegacyReport} from '../web/firebase-legacy.mjs';

function structure(html) {
  return html.replace(/^<div class="firebase-original">/,'').replace(/<\/div>$/,'')
    .replace(/\s+(style|on\w+|name)="[^"]*"/g,'').replace(/\s+id="fb_[^"]*"/g,'')
    .replace(/class="([^"]*)"/g,(_,classes)=>{const clean=classes.split(/\s+/).filter(c=>!c.startsWith('fb-style-')).join(' ');return clean?'class="'+clean+'"':'';})
    .replace(/\s+type="button"/g,'').replace(/\s+>/g,'>').replace(/\s+/g,' ').trim();
}
test('seven local form builders preserve the approved form DOM structure, options and wording',()=>{
  const report={day:'2026-10-27',course:'2026-27'},fields={educador:'Equip fictici'};
  for(const type of firebaseTypes){
    const raw=originalForm(type.key,{data:report.day,curs:report.course,educador:fields.educador,contingut:originalContent(fields)},[],[]);
    const local=firebaseForm(type.key,report,fields,[],[]);
    // Compare the complete form, allowing only CSP classes, event listeners and form bindings.
    const wrappedRaw='<div class="firebase-original">'+raw+'</div>';
    assert.equal(structure(local),structure(wrappedRaw),type.key);
    assert.doesNotMatch(local,/\son\w+=|\sstyle=|https?:\/\//,type.key);
    const schema=firebaseTemplates[type.key];
    const names=[...local.matchAll(/name="field_([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(names).size,names.length,type.key+' duplicate controls');
    for(const name of names)assert.ok(schema.fields.some(f=>f.key===name),type.key+': '+name+' is not persisted');
    for(const m of raw.matchAll(/style="([^"]*)"/g))assert.ok(originalStyles[m[1]],m[1]);
  }
});
test('annual diary retains every month, zero attendance and monthly ratings without losing notes',()=>{
  const fields={assist_raco_oct:'0',hab_organitza__oct:'bona',obs_habits:'Nota <segura>'};
  const content=originalContent(fields);assert.deepEqual(content.hab_organitza,[{mes:'oct',val:'bona'}]);
  const html=firebaseForm('firebaseDiary',{course:'2026-27',day:'2026-10-27'},fields,[],[]);
  assert.match(html,/data-f="assist_raco_oct" value="0"/);assert.ok(html.includes('Nota &lt;segura&gt;'));
  for(const month of ['oct','nov','des','gen','feb','mar','abr','mai','jun'])assert.ok(html.includes('data-f="hab_organitza__'+month+'"'));
});
test('course, names, notes and educator strings cannot become executable form markup',()=>{
  const html=firebaseForm('firebaseObservation',{course:'<script>x</script>',day:'2026-10-27'},{educador:'<img src=x>',observacions:'</textarea><script>x</script>'},[{id:'a',nom:'<svg onload=x>'}],[]);
  assert.doesNotMatch(html,/<script|<img|<svg onload/);
  assert.match(html,/&lt;script&gt;/);
});
test('legacy drafts map values to original forms while keeping every previous value and schema label',()=>{
  const original={id:'x',type:'evaluation1',body:JSON.stringify({competencia_0:'Bona',competencia_0_notes:'Nota antiga',evolucio:'Evolució conservada'}),schema_json:JSON.stringify({fields:[{key:'evolucio',label:'Evolució i objectius',type:'textarea'}]})};
  const before=JSON.stringify(original),adapted=adaptLegacyReport(original),fields=JSON.parse(adapted.body);
  assert.equal(JSON.parse(adapted.schema_json).legacySource.type,'evaluation1');assert.deepEqual(JSON.parse(adapted.schema_json).legacySource.schema,JSON.parse(original.schema_json));assert.equal(adapted.type,'firebaseEvaluation');assert.equal(fields.ref_organitzacio__val,'bona');assert.equal(fields.ref_organitzacio__notes,'Nota antiga');
  for(const [key,value] of Object.entries(JSON.parse(original.body)))assert.equal(fields['legacy__'+key],value);
  assert.equal(JSON.stringify(original),before);assert.equal(JSON.parse(adapted.schema_json).fields.find(f=>f.key==='legacy__evolucio').label,'Evolució i objectius');
  assert.equal(adaptLegacyReport({type:'generalEvaluation'}).type,'generalEvaluation','children survey must not become an integral evaluation');
});
