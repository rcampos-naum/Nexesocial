import test from 'node:test';
import assert from 'node:assert/strict';
import { birthDate, suggestedMapping, validateRows, classifyRows, identityKeys } from '../public/import-persones-core.mjs';

const map = { nom: 0, cognoms: 1, dni: 2, data_naixement: 3, email: 4 };
const rows = (...cells) => cells.map((row, i) => ({ cells: row, rowNumber: i + 2 }));
const valid = (...cells) => validateRows(rows(...cells), map, { today: '2026-10-21' });
const person = { nom: 'Nora', cognoms: 'Exemple', dni: 'TEST001', data_naixement: '2014-06-03' };

test('recognizes Spanish and Catalan headers without accents', () => {
  assert.equal(suggestedMapping(['Nombre', 'Apellidos', 'Telèfon', 'Fecha de nacimiento']).telefon, 2);
  assert.equal(suggestedMapping(['Nombre', 'Apellidos', 'Telèfon', 'Fecha de nacimiento']).data_naixement, 3);
});
test('Excel serials and 1904 epoch resolve to civil dates', () => {
  assert.equal(birthDate(61), '1900-03-01'); assert.equal(birthDate(1), '1900-01-01');
  assert.equal(birthDate(0, { date1904: true }), '1904-01-01');
  assert.equal(birthDate(43831), '2020-01-01'); assert.throws(() => birthDate(60));
});
test('rejects impossible, future, ambiguous or fractional dates', () => {
  for (const date of ['31/02/2020', '29/02/2023', '04/05/26', '2099-01-01', 40000.5, '1900-02-29']) assert.throws(() => birthDate(date));
  assert.equal(birthDate('29/02/2024'), '2024-02-29'); assert.equal(birthDate('3/6/2014'), '2014-06-03');
});
test('supports minors without identity documents and preserves row numbers', () => {
  const [row] = valid(['Nora', 'Exemple', '', '03/06/2014']);
  assert.equal(row.status, 'new'); assert.equal(row.person.data_naixement, '2014-06-03'); assert.equal(row.rowNumber, 2);
});
test('empty sheets and blank rows produce no writes to plan', () => {
  assert.deepEqual(valid(['', '', '', '']), []); assert.deepEqual(valid(), []);
});
test('requires names and enough identity; validates mail and limits', () => {
  for (const row of valid(['', 'Exemple', 'TEST001'], ['Nora', 'Exemple'], ['Nora', 'Exemple', 'TEST001', '', 'invalid'], ['N'.repeat(251), 'Exemple', 'TEST001'])) assert.equal(row.status, 'error');
});
test('does not allow one column to populate multiple fields', () => {
  assert.throws(() => validateRows(rows(['Nora']), { nom: 0, cognoms: 0 }));
});
test('rejects formulas/errors only when mapped to imported fields', () => {
  const source = [{ cells: ['Nora', 'Exemple', 'TEST001', '', ''], rowNumber: 8, invalidCells: [2] }];
  assert.equal(validateRows(source, map)[0].status, 'error');
  assert.equal(validateRows([{ ...source[0], invalidCells: [8] }], map)[0].status, 'new');
});
test('normalizes document separators and detects duplicates inside Excel', () => {
  const result = classifyRows(valid(['Nora', 'Exemple', 'TEST-001'], ['Altre', 'Nom', 'test001']));
  assert.equal(result[0].status, 'new'); assert.equal(result[1].status, 'duplicate');
});
test('detects existing birth/name identity across accents and changed document', () => {
  const result = classifyRows(valid(['Nóra', 'Exemple', 'TEST002', '03/06/2014']), [person]);
  assert.equal(result[0].status, 'duplicate');
});
test('ambiguous same-name records are held for manual review', () => {
  const [result] = classifyRows(valid(['Nora', 'Exemple', 'TEST002']), [person]);
  assert.equal(result.status, 'review');
});
test('different birth dates can distinguish homonyms', () => {
  const [result] = classifyRows(valid(['Nora', 'Exemple', 'TEST002', '01/01/2015']), [person]);
  assert.equal(result.status, 'new');
});
test('non-Latin names retain distinct identities', () => {
  assert.notDeepEqual(identityKeys({ nom: 'نور', cognoms: 'أحمد', data_naixement: '2010-01-01' }), identityKeys({ nom: 'علي', cognoms: 'محمد', data_naixement: '2010-01-01' }));
});
