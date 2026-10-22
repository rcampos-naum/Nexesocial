import test from 'node:test';
import assert from 'node:assert/strict';
import { templates, reportSections } from '../web/templates.mjs';
import { templates as legacy } from '../legacy-templates-v1.mjs';

test('document layouts preserve each current and historical field exactly once without mutating schemas',()=>{
  for(const catalogue of [templates,legacy])for(const [type,schema] of Object.entries(catalogue)){
    const before=JSON.stringify(schema),sections=reportSections(type,schema.fields);
    const rendered=sections.flatMap(s=>s.fields);
    assert.deepEqual(rendered.map(f=>f.key).sort(),schema.fields.map(f=>f.key).sort(),type);
    assert.equal(new Set(rendered.map(f=>f.key)).size,rendered.length,type);
    assert.equal(JSON.stringify(schema),before,type);
    for(const f of rendered)assert.equal(f,schema.fields.find(original=>original.key===f.key));
  }
});
test('unknown historical fields stay available in the additional-information section',()=>{
  const fields=[{key:'unknown_old_field',label:'Dato anterior',type:'textarea'}];
  assert.deepEqual(reportSections('diary',fields).flatMap(s=>s.fields),fields);
});
