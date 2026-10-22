import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { DatabaseSync, backup } from 'node:sqlite';
import { createApplication } from '../server.mjs';

test('complete local workflow, permissions, idempotency and durable data', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'nexe-selfhost-'));
  const origin = 'http://127.0.0.1:4080';
  const app = createApplication({ dataDir: directory, origin, adminEmail: 'admin@example.test', adminPassword: 'Local-test-only-12345' });
  // Exercise the actual request handler in process: no socket or external service.
  let active = app; let cookie; let closed = false;
  function dispatch(path, { method = 'GET', headers = {}, body } = {}) {
    return new Promise(resolve => {
      const request = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
      request.url = path; request.method = method; request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
      request.socket = { remoteAddress: '127.0.0.1' };
      const responseHeaders = new Map();
      const response = { headersSent: false, status: 200,
        setHeader(key, value) { responseHeaders.set(key.toLowerCase(), value); },
        writeHead(status, headers) { this.status = status; this.headersSent = true; for (const [key, value] of Object.entries(headers || {})) this.setHeader(key, value); },
        end(value) { const text = String(value ?? ''); resolve({ status: this.status, headers: { get: key => responseHeaders.get(key.toLowerCase()) }, json: async () => JSON.parse(text), text: async () => text }); },
      };
      active.server.emit('request', request, response);
    });
  }
  async function request(path, body, session = cookie, originHeader = origin) {
    const response = await dispatch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(session ? { Cookie: session } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Nexe-Request': '1', Origin: originHeader }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  try {
    await t.test('requires authenticated session; rejects cross-origin writes', async () => {
      assert.equal((await request('data')).status, 401);
      assert.equal((await request('login', { email: 'admin@example.test', password: 'Local-test-only-12345' }, null, 'https://other.test')).status, 403);
      assert.equal((await request('login', { email: 'admin@example.test', password: 'incorrect' })).status, 401);
    });
    await t.test('login returns a safe user and an HttpOnly session', async () => {
      const result = await request('login', { email: 'admin@example.test', password: 'Local-test-only-12345' });
      assert.equal(result.status, 200); cookie = result.cookie; assert.ok(cookie); assert.ok(!('password' in result.body));
      assert.equal((await request('me')).body.role, 'admin');
      const response = await dispatch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Nexe-Request': '1' }, body: JSON.stringify({ email: 'admin@example.test', password: 'Local-test-only-12345' }) });
      assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    });
    let family, person, program, group, caseId, report;
    const nora = { nom: 'Nora', cognoms: 'Exemple', dni: 'TEST001', data_naixement: '2014-06-03', telefon: '', email: '', poblacio: '' };
    await t.test('creates family and person, detects existing identity and supports minors', async () => {
      const f = await request('families', { name: 'Familia de prueba', contact: '', notes: '' }); assert.equal(f.status, 201); family = f.body.id;
      const p = await request('people', { ...nora, family_id: family }); assert.equal(p.status, 201); person = p.body.id;
      assert.equal((await request('people', nora)).status, 409);
      assert.equal((await request('people', { ...nora, dni: '', nom: 'Otra', data_naixement: '2015-01-01' })).status, 201);
      assert.equal((await request('people', { ...nora, nom: 'Nombre', dni: '', data_naixement: '' })).status, 400);
    });
    await t.test('creates program, group, enrollment and a case with followup', async () => {
      program = (await request('programs', { name: 'Centro de día', description: 'Prueba local', kind: 'dayCentre' })).body.id;
      group = (await request('groups', { name: 'Grupo de prueba', program_id: program, course: '2026-27' })).body.id;
      assert.equal((await request('enrollments', { person_id: person, group_id: group })).status, 200);
      const result = await request('cases', { person_id: person, program_id: program, opened_at: '2026-10-21', notes: 'Objetivos de prueba' }); assert.equal(result.status, 201); caseId = result.body.id;
      assert.equal((await request('followups', { case_id: caseId, body: 'Seguimiento de prueba' })).status, 201);
      assert.equal((await request('cases/status', { id: caseId, status: 'closed' })).status, 200);
      assert.equal((await request('cases', { person_id: person, family_id: family, program_id: program, opened_at: '2026-10-21' })).status, 400);
    });
    await t.test('person and family edits reject stale versions and preserve identity uniqueness', async () => {
      const payload = { ...nora, id: person, version: 1, family_id: family, telefon: '600000000' };
      assert.equal((await request('people/update', payload)).status, 200);
      assert.equal((await request('people/update', payload)).status, 409);
      assert.equal((await request('families/update', { id: family, version: 1, name: 'Familia actualizada', contact: 'Contacto', notes: '' })).status, 200);
      assert.equal((await request('families/update', { id: family, version: 1, name: 'Sobrescritura', contact: '', notes: '' })).status, 409);
    });
    await t.test('expanded profile validates categories and preserves omitted fields across edits', async () => {
      const current = () => app.db.prepare('SELECT * FROM people WHERE id=?').get(person);
      const update = extra => request('people/update', { ...nora, id: person, version: current().version, family_id: family, ...extra });
      const profile = { genere:'DONA', situacio_domicili:'Lloguer', derivat_per:['CMSS','CENTRE EDUCATIU'], alergies_aliments:'Prueba ficticia', observacions:'Observación de prueba' };
      assert.equal((await update({ profile })).status,200);
      assert.deepEqual(JSON.parse(current().profile_json),profile);
      assert.equal((await update({ telefon:'600123456' })).status,200);
      assert.deepEqual(JSON.parse(current().profile_json),profile);
      const before = current();
      assert.equal((await update({ profile:{genere:'inventado'} })).status,400);
      assert.equal((await update({ profile:{derivat_per:'CMSS'} })).status,400);
      assert.equal((await update({ profile:{unknown:'dato'} })).status,400);
      assert.deepEqual(current(),before);
      assert.equal((await update({ profile:{derivat_per:[],observacions:''} })).status,200);
      assert.equal(JSON.parse(current().profile_json).genere,'DONA');
      assert.deepEqual(JSON.parse(current().profile_json).derivat_per,[]);
    });
    await t.test('person number is permanent through archival, return, family changes and database writes', async () => {
      const current = () => app.db.prepare('SELECT * FROM people WHERE id=?').get(person);
      const number = current().number;
      for (const status of ['archived','active']) {
        assert.equal((await request('people/update',{...nora,id:person,version:current().version,status})).status,200);
        assert.equal(current().number,number);
      }
      assert.equal((await request('people/family',{person_id:person,family_id:family,version:current().version})).status,200);
      assert.equal(current().number,number);
      assert.equal((await request('people/update',{...nora,id:person,version:current().version,number:'UA2099-9999'})).status,400);
      assert.equal((await request('people',{...nora,number:'UA2099-9999'})).status,400);
      assert.throws(() => app.db.prepare('UPDATE people SET number=? WHERE id=?').run('changed',person),/permanente/);
      assert.throws(() => app.db.prepare('DELETE FROM people WHERE id=?').run(person),/archivan/);
      assert.equal(current().number,number);
      const other = await request('people',{...nora,nom:'Otra persona',dni:'NEW-UNIQUE'});
      assert.equal(other.status,201); assert.notEqual(other.body.number,number);
      assert.equal((await request('people',nora)).status,409);
    });
    await t.test('records attendance and rejects stale or unregistered updates atomically', async () => {
      const payload = { group_id: group, day: '2026-10-21', slot: 'general', rows: [{ person_id: person, status: 'P', version: 0 }] };
      assert.equal((await request('attendance', payload)).status, 200);
      assert.equal((await request('attendance', payload)).status, 409);
      const attendance = await request(`attendance?group=${group}&day=2026-10-21`); assert.equal(attendance.body[0].version, 1);
      assert.equal((await request('attendance', { ...payload, rows: [{ person_id: 'unknown', status: 'P' }] })).status, 400);
      const summary = await request('attendance/summary?start=2026-10-01&end=2026-10-31'); assert.equal(summary.body[0].total, 1);
    });
    await t.test('report drafts have version checks; final reports cannot be overwritten', async () => {
      const payload = { type: 'observation', person_id: person, day: '2026-10-21', course: '2026-27', title: 'Observación', state: 'draft', fields: { observacio: 'Prueba de observación' } };
      const result = await request('reports', payload); assert.equal(result.status, 200); report = result.body.id;
      assert.equal((await request('reports', { ...payload, id: report, version: 0 })).status, 409);
      assert.equal((await request('reports', { ...payload, id: report, version: 1, state: 'final' })).status, 200);
      assert.equal((await request('reports', { ...payload, id: report, version: 2 })).status, 409);
      const saved = await request(`reports?id=${report}`); assert.equal(saved.body.version, 2); assert.equal(saved.body.state, 'final');
      assert.equal(app.db.prepare('SELECT count(*) total FROM report_versions').get().total, 2);
      assert.equal((await request('reports', { ...payload, fields: { unknown: 'extra' } })).status, 400);
    });
    await t.test('Excel review is read-only; imports are transactional and repeatable', async () => {
      const imported = { ...nora, nom: 'Persona', cognoms: 'Importada', dni: 'TEST002', data_naixement: '2015-02-01' };
      const count = app.db.prepare('SELECT count(*) total FROM people').get().total;
      const review = await request('import/review', { people: [nora, imported] }); assert.equal(review.body[0].status, 'duplicate'); assert.equal(review.body[1].status, 'new');
      assert.equal(app.db.prepare('SELECT count(*) total FROM people').get().total, count);
      assert.equal((await request('import', { people: [imported, { ...imported, nom: '' }] })).status, 400);
      assert.equal(app.db.prepare('SELECT count(*) total FROM people').get().total, count);
      const result = await request('import', { people: [nora, imported, imported] }); assert.deepEqual(result.body.map(row => row.status), ['duplicate', 'created', 'duplicate']);
      const retry = await request('import', { people: [imported] }); assert.equal(retry.body[0].status, 'duplicate');
      assert.equal(app.db.prepare('SELECT count(*) total FROM people').get().total, count + 1);
    });
    await t.test('day-centre operations exclude groups and people from unrelated programs', async () => {
      const other = (await request('programs', { name: 'Otro programa', kind: 'general' })).body.id;
      const otherGroup = (await request('groups', { name: 'Grupo general', program_id: other, course: '2026-27' })).body.id;
      const outsider = (await request('data')).body.people.find(p => p.nom === 'Otra').id;
      assert.equal((await request('memberships', { person_id: outsider, program_id: other, started_at: '2026-10-01' })).status, 200);
      assert.equal((await request(`attendance?group=${otherGroup}&day=2026-10-21`)).status, 400);
      assert.equal((await request('reports', { type: 'generalEvaluation', person_id: outsider, day: '2026-10-21', course: '2026-27', title: 'Encuesta', state: 'draft', fields: { enquesta_0: 'Positiva' } })).status, 400);
      const member = (await request('data')).body.memberships.find(m => m.person_id === person && m.program_id === program);
      assert.equal(member.active, 1);
    });
    await t.test('program and group edits reject stale versions and inactive enrollment', async () => {
      const payload = { id: program, version: 1, name: 'Centro de Día', description: 'Programa', kind: 'dayCentre', active: false };
      assert.equal((await request('programs/update', payload)).status, 200);
      assert.equal((await request('programs/update', payload)).status, 409);
      assert.equal((await request('enrollments', { person_id: person, group_id: group })).status, 400);
      assert.equal((await request('programs/update', { ...payload, version: 2, active: true })).status, 200);
      assert.equal((await request('programs/update', { ...payload, version: 3, kind: 'general', active: true })).status, 400);
      const groupPayload = { id: group, version: 1, name: 'Grupo de prueba', course: '2026-27', active: false };
      assert.equal((await request('groups/update', groupPayload)).status, 200);
      assert.equal((await request('enrollments', { person_id: person, group_id: group })).status, 400);
      assert.equal((await request('groups/update', groupPayload)).status, 409);
      assert.equal((await request('groups/update', { ...groupPayload, version: 2, active: true })).status, 200);
    });
    await t.test('program withdrawal ends group enrollment without deleting attendance', async () => {
      const member = (await request('data')).body.memberships.find(m => m.person_id === person && m.program_id === program);
      assert.equal((await request('memberships/end', { person_id: person, program_id: program, ended_at: '1900-01-01' })).status, 400);
      assert.equal((await request('memberships/end', { person_id: person, program_id: program, ended_at: member.started_at })).status, 200);
      const updated = (await request('data')).body;
      assert.equal(updated.enrollments.find(e => e.person_id === person && e.group_id === group).active, 0);
      assert.equal((await request(`attendance?group=${group}&day=2026-10-21`)).body.length, 1);
      assert.equal((await request('enrollments', { person_id: person, group_id: group })).status, 200);
      const events = (await request('data')).body.membershipEvents.filter(e => e.person_id === person && e.program_id === program);
      assert.deepEqual(events.map(e => e.action), ['start', 'end', 'start']);
    });
    await t.test('evaluation drafts can be incomplete; closing requires every rated item and observation', async () => {
      const payload = { type: 'evaluation1', person_id: person, day: '2026-10-21', course: '2026-27', title: 'Primera evaluación', state: 'draft', fields: { competencia_0: 'Bona' } };
      const draft = await request('reports', payload); assert.equal(draft.status, 200);
      assert.equal((await request('reports', { ...payload, id: draft.body.id, version: 1, state: 'final' })).status, 400);
      const saved = (await request(`reports?id=${draft.body.id}`)).body;
      assert.equal(saved.state, 'draft'); assert.ok(JSON.parse(saved.schema_json).fields.some(f => f.requiredOnFinal));
    });
    await t.test('a mid-import database failure rolls back people, counters and audit together', async () => {
      const count = app.db.prepare('SELECT count(*) total FROM people').get().total;
      const auditCount = app.db.prepare('SELECT count(*) total FROM audit').get().total;
      const counter = app.db.prepare("SELECT value FROM counters WHERE name='people'").get().value;
      app.db.exec("CREATE TRIGGER test_import_failure BEFORE INSERT ON people WHEN NEW.nom='Fallara' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
      const result = await request('import', { people: [{ ...nora, nom: 'Primera', dni: 'TEST101' }, { ...nora, nom: 'Fallara', dni: 'TEST102' }] });
      assert.equal(result.status, 500);
      assert.equal(app.db.prepare('SELECT count(*) total FROM people').get().total, count);
      assert.equal(app.db.prepare('SELECT count(*) total FROM audit').get().total, auditCount);
      assert.equal(app.db.prepare("SELECT value FROM counters WHERE name='people'").get().value, counter);
      app.db.exec('DROP TRIGGER test_import_failure');
    });
    let viewerCookie, viewerId;
    await t.test('viewers can read but cannot import, write reports or administer accounts', async () => {
      const account = await request('users', { name: 'Consulta', email: 'viewer@example.test', password: 'Viewer-test-only-12345', role: 'viewer' }); viewerId = account.body.id;
      viewerCookie = (await request('login', { email: 'viewer@example.test', password: 'Viewer-test-only-12345' })).cookie;
      assert.equal((await request('data', undefined, viewerCookie)).status, 200);
      for (const [path, body] of [['people', nora], ['import', { people: [nora] }], ['reports', {}], ['users', {}], ['programs', {}]]) assert.equal((await request(path, body, viewerCookie)).status, 403);
      assert.equal((await request('audit', undefined, viewerCookie)).status, 403);
    });
    await t.test('revocation takes effect immediately and last admin is protected', async () => {
      assert.equal((await request('users/update', { id: viewerId, role: 'viewer', active: false })).status, 200);
      assert.equal((await request('data', undefined, viewerCookie)).status, 401);
      const me = (await request('me')).body;
      assert.equal((await request('users/update', { id: me.id, role: 'viewer', active: false })).status, 400);
    });
    await t.test('static app contains no Firebase, remote scripts or public data paths', async () => {
      const response = await dispatch('/'); const html = await response.text(); assert.equal(response.status, 200);
      assert.ok(!html.includes('firebase')); assert.ok(!html.includes('https://')); assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
      assert.equal((await dispatch('/nexesocial.sqlite')).status, 404);
      assert.equal((await dispatch('/../server.mjs')).status, 404);
      for (const path of ['/assets/logo.png', '/assets/login-background.png']) {
        const asset = await dispatch(path); assert.equal(asset.status, 200); assert.equal(asset.headers.get('content-type'), 'image/png');
      }
      assert.equal((await dispatch('/assets/server.mjs')).status, 404);
      for (const path of ['/person-schema.mjs','/totals.mjs']) assert.equal((await dispatch(path)).status,200);
      for (const path of ['/approved/shell.css','/approved/login.css','/approved/reports.css','/approved/attendance.css','/approved/groups.css','/approved/users.css','/approved/fonts.css','/approved/icons.mjs','/approved/chart.js','/approved/Inter-400.ttf']) assert.equal((await dispatch(path)).status,200,path);
      assert.equal((await dispatch('/approved/../server.mjs')).status,404);
      assert.ok(!JSON.stringify((await request('data')).body).includes('Local-test-only'));
    });
    await t.test('consistent SQLite backup includes reports and passes integrity check', async () => {
      const path = join(directory, 'backup-test.sqlite'); await backup(app.db, path);
      const copy = new DatabaseSync(path, { readOnly: true });
      try {
        assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
        assert.ok(copy.prepare('SELECT id FROM reports WHERE id=?').get(report));
        assert.equal(copy.prepare('SELECT count(*) total FROM people').get().total, app.db.prepare('SELECT count(*) total FROM people').get().total);
      } finally { copy.close(); }
    });
    await t.test('data persists after server shutdown and restart', async () => {
      app.db.close(); closed = true;
      const restored = createApplication({ dataDir: directory, origin });
      active = restored;
      try { const result = await request('data'); assert.equal(result.status, 200); assert.ok(result.body.people.some(p => p.id === person)); assert.ok(result.body.reports.some(r => r.id === report)); }
      finally { restored.db.close(); }
    });
  } finally {
    if (!closed) app.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('upgrades first test package without losing people, participation or original report definitions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexe-upgrade-'));
  const original = createApplication({ dataDir: directory, adminEmail: 'test@example.test', adminPassword: 'Local-test-only-12345' });
  let closed = false;
  try {
    const actor = original.db.prepare('SELECT id FROM users LIMIT 1').get().id;
    original.db.prepare('INSERT INTO people(id,number,nom,cognoms,created_at) VALUES(?,?,?,?,?)').run('person1', 'UA2026-0001', 'Prueba', 'Migración', '2026-10-21');
    original.db.prepare('INSERT INTO programs(id,name) VALUES(?,?)').run('program1', 'Programa anterior');
    original.db.prepare('INSERT INTO groups_cd(id,name,program_id,course) VALUES(?,?,?,?)').run('group1', 'Grupo anterior', 'program1', '2026-27');
    original.db.prepare('INSERT INTO enrollments VALUES(?,?,1)').run('person1', 'group1');
    original.db.prepare('INSERT INTO reports(id,type,person_id,day,course,title,body,state,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('report1', 'generalEvaluation', 'person1', '2026-10-21', '2026-27', 'Informe anterior', JSON.stringify({ personal: 'Contenido anterior conservado' }), 'draft', actor, '2026-10-21', '2026-10-21');
    original.db.exec('DROP TABLE program_memberships; ALTER TABLE programs DROP COLUMN kind; ALTER TABLE programs DROP COLUMN version; ALTER TABLE groups_cd DROP COLUMN active; ALTER TABLE groups_cd DROP COLUMN version; ALTER TABLE reports DROP COLUMN schema_json; ALTER TABLE people DROP COLUMN profile_json; ALTER TABLE people DROP COLUMN status; PRAGMA user_version=0');
    original.db.close(); closed = true;
    const updated = createApplication({ dataDir: directory });
    try {
      assert.equal(updated.db.prepare('SELECT nom FROM people WHERE id=?').get('person1').nom, 'Prueba');
      assert.equal(updated.db.prepare('SELECT number,profile_json,status FROM people WHERE id=?').get('person1').number, 'UA2026-0001');
      assert.equal(updated.db.prepare('SELECT profile_json FROM people WHERE id=?').get('person1').profile_json, '{}');
      assert.equal(updated.db.prepare("SELECT value FROM counters WHERE name='people'").get().value, 1);
      assert.equal(updated.db.prepare('SELECT kind FROM programs WHERE id=?').get('program1').kind, 'general');
      assert.equal(updated.db.prepare('SELECT active FROM program_memberships WHERE person_id=?').get('person1').active, 1);
      const report = updated.db.prepare('SELECT * FROM reports WHERE id=?').get('report1');
      assert.equal(JSON.parse(report.body).personal, 'Contenido anterior conservado');
      assert.ok(JSON.parse(report.schema_json).fields.some(field => field.key === 'personal'));
      assert.equal(updated.db.prepare('PRAGMA user_version').get().user_version, 4);
    } finally { updated.db.close(); }
  } finally { if (!closed) original.db.close(); rmSync(directory, { recursive: true, force: true }); }
});
