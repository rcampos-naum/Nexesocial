import test from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, selectedPeople, totalsFor, summaryCsv, csvCell } from '../web/totals.mjs';

test('age boundaries include birthdays and unknown dates without inventing ages', () => {
  assert.equal(ageOn('2008-10-23','2026-10-22'),17);
  assert.equal(ageOn('2008-10-22','2026-10-22'),18);
  assert.equal(ageOn('1961-10-22','2026-10-22'),65);
  for (const birth of ['', '2030-01-01', '2020-02-31']) assert.equal(ageOn(birth,'2026-10-22'),null);
});
const data = {
  people:[{id:'a',status:'active',data_naixement:'2014-01-01',profile_json:JSON.stringify({genere:'DONA',situacio_admin:'PERMÍS TEMPORAL',situacio_domicili:'Lloguer'})},{id:'b',status:'active',profile_json:'{}'},{id:'c',status:'archived',profile_json:'{}'}],
  groups:[{id:'g1',program_id:'p1',course:'2026-27'},{id:'g2',program_id:'p1',course:'2026-27'},{id:'g3',program_id:'p2',course:'2025-26'}],
  enrollments:[{person_id:'a',group_id:'g1',active:1},{person_id:'a',group_id:'g2',active:1},{person_id:'b',group_id:'g1',active:0},{person_id:'c',group_id:'g3',active:1}],
  memberships:[{person_id:'a',program_id:'p1',active:1},{person_id:'b',program_id:'p1',active:0},{person_id:'c',program_id:'p2',active:1}],
};
test('totals deduplicate multiple group memberships and combine program, course, group and status filters', () => {
  assert.deepEqual(selectedPeople(data,{program:'p1',course:'2026-27'}).map(p=>p.id),['a']);
  assert.deepEqual(selectedPeople(data,{program:'p1',course:'2026-27',participation:''}).map(p=>p.id),['a','b']);
  assert.equal(selectedPeople(data,{program:'p1',group:'g3',status:''}).length,0);
  assert.deepEqual(selectedPeople(data,{program:'p2',status:'archived'}).map(p=>p.id),['c']);
  assert.equal(selectedPeople(data,{course:'missing'}).length,0);
});
test('all distributions reconcile with unique persons and missing data remains explicit', () => {
  const stats = totalsFor(selectedPeople(data,{}),'2026-10-22');
  assert.equal(stats.total,2); assert.equal(stats.averageAge,12); assert.equal(stats.ageKnown,1);
  for (const counts of Object.values(stats.dimensions)) assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),2);
  assert.equal(stats.dimensions.genere['Sin informar'],1);
  assert.equal(stats.dimensions.situacio_admin['PERMÍS TEMPORAL'],1);
  assert.equal(stats.dimensions.situacio_domicili.Lloguer,1);
  assert.equal(totalsFor([],'2026-10-22').averageAge,null);
});
test('summary export contains filters, aggregate counts and no identifying records or formulas', () => {
  const csv = summaryCsv(totalsFor(data.people,'2026-10-22'),[['Programa','=SUM(1)']]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=SUM(1)")); assert.ok(csv.includes('Sin informar'));
  assert.ok(!csv.includes('2014-01-01')); assert.equal(csvCell('a"b'),'"a""b"');
});
