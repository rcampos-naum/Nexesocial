import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { validateRows, classifyRows, identityKeys } from '../public/import-persones-core.mjs';
import { templates } from './web/templates.mjs';
import { templates as legacyTemplates } from './legacy-templates-v1.mjs';
import { personFields } from './web/person-schema.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
class Fault extends Error { constructor(status, message) { super(message); this.status = status; } }
const requireValue = (ok, message, status = 400) => { if (!ok) throw new Fault(status, message); };
function string(value, max = 250, required = false) {
  requireValue(value == null || typeof value === 'string', 'Formato de texto incorrecto');
  const result = (value || '').trim(); requireValue(result.length <= max && (!required || result.length > 0), 'Falta un campo obligatorio o es demasiado largo'); return result;
}
function date(value) { const text = string(value, 10, true); requireValue(/^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString().slice(0, 10) === text, 'Fecha no válida'); return text; }
const passwordHash = password => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
const verifyPassword = (password, stored) => { const [salt, digest] = stored.split(':'); return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, 'hex')); };
const exposedUser = user => ({ id: user.id, name: user.name, email: user.email, role: user.role, active: !!user.active });

export function createApplication({ dataDir, origin = 'http://127.0.0.1:4080', secureCookie = false, adminEmail, adminPassword } = {}) {
  requireValue(dataDir, 'Falta DATA_DIR'); new URL(origin);
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dataDir, 'nexesocial.sqlite'));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS families(id TEXT PRIMARY KEY,name TEXT NOT NULL,contact TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS people(id TEXT PRIMARY KEY,number TEXT UNIQUE NOT NULL,nom TEXT NOT NULL,cognoms TEXT NOT NULL,dni TEXT NOT NULL DEFAULT '',data_naixement TEXT NOT NULL DEFAULT '',telefon TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',poblacio TEXT NOT NULL DEFAULT '',family_id TEXT REFERENCES families(id),created_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE UNIQUE INDEX IF NOT EXISTS people_document ON people(dni) WHERE dni<>'';
    CREATE TABLE IF NOT EXISTS identities(key TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people(id));
    CREATE TABLE IF NOT EXISTS programs(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS groups_cd(id TEXT PRIMARY KEY,name TEXT NOT NULL,program_id TEXT NOT NULL REFERENCES programs(id),course TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS enrollments(person_id TEXT NOT NULL REFERENCES people(id),group_id TEXT NOT NULL REFERENCES groups_cd(id),active INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(person_id,group_id));
    CREATE TABLE IF NOT EXISTS program_memberships(person_id TEXT NOT NULL REFERENCES people(id),program_id TEXT NOT NULL REFERENCES programs(id),started_at TEXT NOT NULL,ended_at TEXT,active INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(person_id,program_id));
    CREATE TABLE IF NOT EXISTS membership_events(id TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people(id),program_id TEXT NOT NULL REFERENCES programs(id),action TEXT NOT NULL,effective_at TEXT NOT NULL,actor TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cases_cd(id TEXT PRIMARY KEY,person_id TEXT REFERENCES people(id),family_id TEXT REFERENCES families(id),program_id TEXT NOT NULL REFERENCES programs(id),owner_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,opened_at TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS followups(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES cases_cd(id),body TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attendance(person_id TEXT NOT NULL REFERENCES people(id),group_id TEXT NOT NULL REFERENCES groups_cd(id),day TEXT NOT NULL,slot TEXT NOT NULL,status TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',updated_by TEXT NOT NULL REFERENCES users(id),version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(person_id,group_id,day,slot));
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,type TEXT NOT NULL,person_id TEXT REFERENCES people(id),group_id TEXT REFERENCES groups_cd(id),day TEXT NOT NULL,course TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS report_versions(report_id TEXT NOT NULL REFERENCES reports(id),version INTEGER NOT NULL,body TEXT NOT NULL,actor TEXT NOT NULL REFERENCES users(id),at TEXT NOT NULL,PRIMARY KEY(report_id,version));
    CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,entity_id TEXT NOT NULL,at TEXT NOT NULL);`);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const atomic = callback => { db.exec('BEGIN IMMEDIATE'); try { const result = callback(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  // Additive upgrade from the first local test package; keep all existing data.
  atomic(() => {
    for (const [table, name, definition] of [
      ['programs', 'kind', "TEXT NOT NULL DEFAULT 'general'"],
      ['programs', 'version', 'INTEGER NOT NULL DEFAULT 1'],
      ['groups_cd', 'active', 'INTEGER NOT NULL DEFAULT 1'],
      ['groups_cd', 'version', 'INTEGER NOT NULL DEFAULT 1'],
      ['reports', 'schema_json', "TEXT NOT NULL DEFAULT ''"],
      ['people', 'profile_json', "TEXT NOT NULL DEFAULT '{}'"],
      ['people', 'status', "TEXT NOT NULL DEFAULT 'active'"],
    ]) {
      if (!all(`PRAGMA table_info(${table})`).some(column => column.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
    // A pre-existing group enrollment implies participation in its program.
    run(`INSERT INTO program_memberships(person_id,program_id,started_at,active)
      SELECT e.person_id,g.program_id,?,MAX(e.active) FROM enrollments e JOIN groups_cd g ON g.id=e.group_id
      GROUP BY e.person_id,g.program_id ON CONFLICT(person_id,program_id) DO NOTHING`, now().slice(0, 10));
    for (const report of all("SELECT id,type FROM reports WHERE schema_json=''")) {
      requireValue(legacyTemplates[report.type], 'Tipo de informe antiguo no reconocido');
      run('UPDATE reports SET schema_json=? WHERE id=?', JSON.stringify(legacyTemplates[report.type]), report.id);
    }
    for (const membership of all('SELECT * FROM program_memberships m WHERE NOT EXISTS(SELECT 1 FROM membership_events e WHERE e.person_id=m.person_id AND e.program_id=m.program_id)')) {
      run('INSERT INTO membership_events VALUES(?,?,?,?,?,?,?)', randomUUID(), membership.person_id, membership.program_id, 'start', membership.started_at, null, now());
      if (membership.ended_at) run('INSERT INTO membership_events VALUES(?,?,?,?,?,?,?)', randomUUID(), membership.person_id, membership.program_id, 'end', membership.ended_at, null, now());
    }
    const issued = all('SELECT number FROM people').reduce((max,p) => Math.max(max, Number(/^UA\d{4}-(\d+)$/.exec(p.number)?.[1] || 0)), 0);
    run("INSERT INTO counters(name,value) VALUES('people',?) ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)", issued);
    db.exec(`CREATE TRIGGER IF NOT EXISTS people_number_permanent BEFORE UPDATE OF number ON people WHEN NEW.number IS NOT OLD.number BEGIN SELECT RAISE(ABORT,'El número de expediente es permanente'); END;
      CREATE TRIGGER IF NOT EXISTS people_no_delete BEFORE DELETE ON people BEGIN SELECT RAISE(ABORT,'Las personas se archivan; su expediente no se elimina'); END;
      PRAGMA user_version=4`);
  });
  const audit = (user, action, id) => run('INSERT INTO audit(actor,action,entity_id,at) VALUES(?,?,?,?)', user.id, action, id, now());
  if (!get('SELECT id FROM users LIMIT 1')) {
    requireValue(typeof adminPassword === 'string' && adminPassword.length >= 12 && adminEmail, 'Primera instalación: define ADMIN_EMAIL y ADMIN_PASSWORD de al menos 12 caracteres');
    run('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)', randomUUID(), 'Administración', String(adminEmail).trim().toLowerCase(), passwordHash(adminPassword), 'admin');
  }
  const roles = ['admin', 'coordinator', 'educator', 'viewer'];
  const write = user => requireValue(['admin', 'coordinator', 'educator'].includes(user.role), 'Perfil de solo consulta', 403);
  const manage = user => requireValue(['admin', 'coordinator'].includes(user.role), 'Solo administración o coordinación', 403);
  const admin = user => requireValue(user.role === 'admin', 'Solo administración', 403);
  const foreign = (table, id) => { requireValue(typeof id === 'string' && !!get(`SELECT id FROM ${table} WHERE id=?`, id), 'Referencia no encontrada'); return id; };
  const nullable = (table, id) => id ? foreign(table, id) : null;
  const activeProgram = id => { foreign('programs', id); requireValue(get('SELECT active FROM programs WHERE id=?', id).active, 'El programa está inactivo'); return id; };
  const dayCentreGroup = id => {
    foreign('groups_cd', id);
    requireValue(get("SELECT g.id FROM groups_cd g JOIN programs p ON p.id=g.program_id WHERE g.id=? AND p.kind='dayCentre'", id), 'El grupo no pertenece a Centro de Día');
    return id;
  };
  const isDayCentrePerson = id => !!get(`SELECT m.person_id FROM program_memberships m JOIN programs p ON p.id=m.program_id WHERE m.person_id=? AND p.kind='dayCentre'`, id);
  function enrollProgram(person, program, started, user) {
    const previous = get('SELECT * FROM program_memberships WHERE person_id=? AND program_id=?', person, program);
    if (previous?.active) return;
    requireValue(!previous?.ended_at || started >= previous.ended_at, 'El nuevo ingreso debe ser posterior o igual a la última baja');
    run('INSERT INTO program_memberships VALUES(?,?,?,NULL,1) ON CONFLICT(person_id,program_id) DO UPDATE SET started_at=excluded.started_at,active=1,ended_at=NULL', person, program, started);
    run('INSERT INTO membership_events VALUES(?,?,?,?,?,?,?)', randomUUID(), person, program, 'start', started, user.id, now());
    audit(user, 'program.enroll', person);
  }
  function readPerson(input) {
    requireValue(!Object.hasOwn(input, 'number') && !Object.hasOwn(input, 'numero_expediente'), 'El número de expediente se asigna automáticamente y no se puede cambiar');
    const mapping = Object.fromEntries(['nom', 'cognoms', 'dni', 'data_naixement', 'telefon', 'email', 'poblacio'].map((key, i) => [key, i]));
    const [row] = validateRows([{ rowNumber: 1, cells: Object.keys(mapping).map(key => input[key] ?? '') }], mapping);
    requireValue(row && row.status === 'new', row?.messages.join('. ') || 'Ficha vacía'); return row.person;
  }
  function readProfile(value) {
    requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Ficha ampliada no válida');
    requireValue(Object.keys(value).every(key => personFields.some(field => field.key === key)), 'Campo de ficha no reconocido');
    return Object.fromEntries(personFields.filter(field => Object.hasOwn(value, field.key)).map(field => {
      const raw = value[field.key];
      if (field.type === 'multi') { requireValue(Array.isArray(raw) && raw.length <= field.options.length && raw.every(v => field.options.includes(v)), `Selección no válida: ${field.label}`); return [field.key, [...new Set(raw)]]; }
      const text = string(raw, field.type === 'long' ? 10000 : 250);
      requireValue(!text || !field.options || field.options.includes(text), `Selección no válida: ${field.label}`); return [field.key, text];
    }));
  }
  function insertPerson(person, user, familyId = null) {
    const duplicate = classifyRows([{ person, status: 'new', messages: [] }], all('SELECT * FROM people'))[0];
    requireValue(duplicate.status === 'new', 'Ya existe una ficha o una coincidencia que requiere revisión', 409);
    const id = randomUUID();
    run("INSERT INTO counters(name,value) VALUES('people',1) ON CONFLICT(name) DO UPDATE SET value=value+1");
    const number = `UA${new Date().getFullYear()}-${String(get("SELECT value FROM counters WHERE name='people'").value).padStart(4, '0')}`;
    run('INSERT INTO people(id,number,nom,cognoms,dni,data_naixement,telefon,email,poblacio,family_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)', id, number, person.nom, person.cognoms, person.dni, person.data_naixement, person.telefon, person.email, person.poblacio, familyId, now());
    for (const key of identityKeys(person)) run('INSERT INTO identities(key,person_id) VALUES(?,?)', hash(key), id);
    audit(user, 'person.create', id); return { id, number };
  }
  const attempts = new Map(); const dummyPassword = passwordHash(randomBytes(24).toString('hex'));
  async function jsonBody(req) {
    requireValue(req.headers['content-type']?.split(';')[0] === 'application/json', 'Se requiere JSON', 415);
    const buffers = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; requireValue(size <= 2 * 1024 * 1024, 'Solicitud demasiado grande', 413); buffers.push(chunk); }
    try { const body = JSON.parse(Buffer.concat(buffers)); requireValue(body && typeof body === 'object' && !Array.isArray(body), 'JSON no válido'); return body; }
    catch (e) { if (e instanceof Fault) throw e; throw new Fault(400, 'JSON no válido'); }
  }
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, origin); const route = url.pathname; const method = req.method;
      if (route === '/health' && method === 'GET') return send(200, { ok: true });
      if (!route.startsWith('/api/')) {
        requireValue(method === 'GET', 'Método no permitido', 405);
        const approved = { 'style-dashboard.css':'text/css', 'shell.css':'text/css', 'login.css':'text/css', 'home.css':'text/css', 'people.css':'text/css', 'families.css':'text/css', 'family.css':'text/css', 'programs.css':'text/css', 'totals.css':'text/css', 'import.css':'text/css', 'reports.css':'text/css', 'attendance.css':'text/css', 'groups.css':'text/css', 'users.css':'text/css', 'fonts.css':'text/css', 'Inter-400.ttf':'font/ttf', 'Inter-500.ttf':'font/ttf', 'Inter-600.ttf':'font/ttf', 'Inter-700.ttf':'font/ttf', 'chart.js':'text/javascript', 'icons.mjs':'text/javascript' };
        const approvedName = route.startsWith('/approved/') ? route.slice('/approved/'.length) : '';
        if (approved[approvedName]) { res.writeHead(200, { 'Content-Type': approved[approvedName] }); return res.end(readFileSync(resolve(root,'web/approved',approvedName))); }
        const assets = { '/assets/logo.png': 'NexeSocial-logo.png', '/assets/login-background.png': 'fondo-login.png' };
        if (['/person-schema.mjs', '/totals.mjs'].includes(route)) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(readFileSync(resolve(root, 'web', route.slice(1)))); }
        if (assets[route]) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(readFileSync(resolve(root, '../public/img', assets[route]))); }
        const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/app.css': ['app.css', 'text/css'], '/xlsx.js': ['xlsx.js', 'text/javascript'], '/templates.mjs': ['templates.mjs', 'text/javascript'] };
        if (route === '/import-persones-core.mjs') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(readFileSync(resolve(root, '../public/import-persones-core.mjs'))); }
        requireValue(files[route], 'No encontrado', 404); const [file, type] = files[route];
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(readFileSync(resolve(root, 'web', file)));
      }
      if (method !== 'GET') {
        requireValue(req.headers.origin === origin && req.headers['x-nexe-request'] === '1', 'Origen de solicitud no permitido', 403);
      }
      const body = method !== 'GET' ? await jsonBody(req) : {};
      const cookie = /(?:^|;\s*)nexe_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
      const user = cookie ? get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1', hash(cookie[1]), Date.now()) : null;
      if (route === '/api/login' && method === 'POST') {
        const email = string(body.email, 250, true).toLowerCase(); const password = body.password;
        requireValue(typeof password === 'string' && password.length > 0 && password.length <= 512, 'Contraseña no válida');
        const key = `${req.socket.remoteAddress}|${email}`; const attempt = attempts.get(key);
        requireValue(!attempt || attempt.until < Date.now() || attempt.count < 8, 'Demasiados intentos. Espera 15 minutos', 429);
        const found = get('SELECT * FROM users WHERE email=?', email);
        const valid = verifyPassword(password, found?.password || dummyPassword);
        if (!valid || !found?.active) {
          if (attempts.size > 10000) for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k);
          attempts.set(key, { count: attempt?.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 900000 });
          throw new Fault(401, 'Acceso incorrecto');
        }
        attempts.delete(key); const token = randomBytes(32).toString('hex');
        atomic(() => { run('DELETE FROM sessions WHERE expires<?', Date.now()); run('INSERT INTO sessions VALUES(?,?,?)', hash(token), found.id, Date.now() + 28800000); audit(found, 'login', found.id); });
        res.setHeader('Set-Cookie', `nexe_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookie ? '; Secure' : ''}`);
        return send(200, exposedUser(found));
      }
      requireValue(user, 'Inicia sesión', 401);
      if (route === '/api/logout' && method === 'POST') { run('DELETE FROM sessions WHERE token=?', hash(cookie[1])); res.setHeader('Set-Cookie', 'nexe_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { ok: true }); }
      if (route === '/api/me' && method === 'GET') return send(200, exposedUser(user));
      if (route === '/api/data' && method === 'GET') return send(200, {
        people: all('SELECT * FROM people ORDER BY cognoms,nom'), families: all('SELECT * FROM families ORDER BY name'), programs: all('SELECT * FROM programs ORDER BY name'), groups: all('SELECT * FROM groups_cd ORDER BY name'),
        enrollments: all('SELECT * FROM enrollments'), memberships: all('SELECT * FROM program_memberships'), membershipEvents: all('SELECT * FROM membership_events ORDER BY effective_at,created_at'), cases: all('SELECT * FROM cases_cd ORDER BY opened_at DESC'), followups: all('SELECT * FROM followups ORDER BY created_at'),
        reports: all('SELECT id,type,person_id,group_id,day,course,title,state,version,created_by,created_at,updated_at FROM reports ORDER BY day DESC'), team: all('SELECT id,name FROM users WHERE active=1'),
      });
      if (route === '/api/users' && method === 'GET') { admin(user); return send(200, all('SELECT id,name,email,role,active FROM users ORDER BY name')); }
      if (route === '/api/users' && method === 'POST') {
        admin(user); requireValue(roles.includes(body.role), 'Rol no válido'); const email = string(body.email, 250, true).toLowerCase();
        requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Correo no válido'); requireValue(typeof body.password === 'string' && body.password.length >= 12 && body.password.length <= 512, 'Contraseña de 12 a 512 caracteres');
        const id = randomUUID(); atomic(() => { run('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)', id, string(body.name, 120, true), email, passwordHash(body.password), body.role); audit(user, 'user.create', id); }); return send(201, { id });
      }
      if (route === '/api/users/update' && method === 'POST') {
        admin(user); const id = foreign('users', body.id); requireValue(roles.includes(body.role) && typeof body.active === 'boolean', 'Perfil no válido');
        const current = get('SELECT * FROM users WHERE id=?', id);
        if (current.active && current.role === 'admin' && (!body.active || body.role !== 'admin')) requireValue(get("SELECT count(*) total FROM users WHERE active=1 AND role='admin'").total > 1, 'Debe quedar una cuenta administradora activa');
        atomic(() => {
          run('UPDATE users SET role=?,active=? WHERE id=?', body.role, Number(body.active), id);
          if (body.password) { requireValue(typeof body.password === 'string' && body.password.length >= 12 && body.password.length <= 512, 'Contraseña de 12 a 512 caracteres'); run('UPDATE users SET password=? WHERE id=?', passwordHash(body.password), id); }
          run('DELETE FROM sessions WHERE user_id=?', id); audit(user, 'user.update', id);
        }); return send(200, { ok: true });
      }
      if (route === '/api/families' && method === 'POST') { write(user); const id = randomUUID(); atomic(() => { run('INSERT INTO families(id,name,contact,notes,created_at) VALUES(?,?,?,?,?)', id, string(body.name, 120, true), string(body.contact), string(body.notes, 10000), now()); audit(user, 'family.create', id); }); return send(201, { id }); }
      if (route === '/api/families/update' && method === 'POST') {
        write(user); const id = foreign('families', body.id);
        atomic(() => { requireValue(get('SELECT version FROM families WHERE id=?', id).version === body.version, 'La familia cambió. Recarga antes de guardar', 409); run('UPDATE families SET name=?,contact=?,notes=?,version=version+1 WHERE id=?', string(body.name, 120, true), string(body.contact), string(body.notes, 10000), id); audit(user, 'family.update', id); }); return send(200, { ok: true });
      }
      if (route === '/api/people' && method === 'POST') { write(user); const person = readPerson(body); const family = nullable('families', body.family_id); const profile = readProfile(body.profile || {}); return send(201, atomic(() => { const result = insertPerson(person, user, family); run('UPDATE people SET profile_json=? WHERE id=?', JSON.stringify(profile), result.id); return result; })); }
      if (route === '/api/people/update' && method === 'POST') {
        write(user); const id = foreign('people', body.id); const person = readPerson(body); const family = nullable('families', body.family_id);
        atomic(() => {
          requireValue(get('SELECT version FROM people WHERE id=?', id).version === body.version, 'La ficha cambió. Recarga antes de guardar', 409);
          const classified = classifyRows([{ person, status: 'new', messages: [] }], all('SELECT * FROM people WHERE id<>?', id))[0];
          requireValue(classified.status === 'new', 'Hay una coincidencia con otra ficha; revisa antes de guardar', 409);
          run('UPDATE people SET nom=?,cognoms=?,dni=?,data_naixement=?,telefon=?,email=?,poblacio=?,family_id=?,version=version+1 WHERE id=?', person.nom, person.cognoms, person.dni, person.data_naixement, person.telefon, person.email, person.poblacio, family, id);
          if (Object.hasOwn(body, 'profile')) { const previous = JSON.parse(get('SELECT profile_json FROM people WHERE id=?', id).profile_json); run('UPDATE people SET profile_json=? WHERE id=?', JSON.stringify({ ...previous, ...readProfile(body.profile) }), id); }
          if (Object.hasOwn(body, 'status')) { requireValue(['active','archived'].includes(body.status), 'Estado no válido'); run('UPDATE people SET status=? WHERE id=?', body.status, id); }
          run('DELETE FROM identities WHERE person_id=?', id); for (const key of identityKeys(person)) run('INSERT INTO identities VALUES(?,?)', hash(key), id); audit(user, 'person.update', id);
        }); return send(200, { ok: true });
      }
      if (route === '/api/people/family' && method === 'POST') { write(user); const person = foreign('people', body.person_id); const family = nullable('families', body.family_id); atomic(() => { requireValue(get('SELECT version FROM people WHERE id=?', person).version === body.version, 'La ficha cambió. Recarga antes de guardar', 409); run('UPDATE people SET family_id=?,version=version+1 WHERE id=?', family, person); audit(user, 'person.family', person); }); return send(200, { ok: true }); }
      if (route === '/api/programs' && method === 'POST') { manage(user); const kind = body.kind || 'general'; requireValue(['general', 'dayCentre'].includes(kind), 'Tipo de programa no válido'); const id = randomUUID(); atomic(() => { run('INSERT INTO programs(id,name,description,kind) VALUES(?,?,?,?)', id, string(body.name, 120, true), string(body.description, 5000), kind); audit(user, 'program.create', id); }); return send(201, { id }); }
      if (route === '/api/programs/update' && method === 'POST') {
        manage(user); const id = foreign('programs', body.id); requireValue(['general', 'dayCentre'].includes(body.kind) && typeof body.active === 'boolean', 'Estado o tipo no válido');
        atomic(() => {
          const previous = get('SELECT * FROM programs WHERE id=?', id); requireValue(previous.version === body.version, 'El programa cambió. Recarga antes de guardar', 409);
          if (previous.kind === 'dayCentre' && body.kind !== 'dayCentre') requireValue(!get('SELECT id FROM groups_cd WHERE program_id=? LIMIT 1', id) && !get('SELECT person_id FROM program_memberships WHERE program_id=? LIMIT 1', id), 'Conserva el tipo Centro de Día para no ocultar su histórico');
          run('UPDATE programs SET name=?,description=?,kind=?,active=?,version=version+1 WHERE id=?', string(body.name, 120, true), string(body.description, 5000), body.kind, Number(body.active), id); audit(user, 'program.update', id);
        }); return send(200, { ok: true });
      }
      if (route === '/api/groups' && method === 'POST') { manage(user); const id = randomUUID(); atomic(() => { run('INSERT INTO groups_cd(id,name,program_id,course) VALUES(?,?,?,?)', id, string(body.name, 120, true), activeProgram(body.program_id), string(body.course, 20, true)); audit(user, 'group.create', id); }); return send(201, { id }); }
      if (route === '/api/groups/update' && method === 'POST') {
        manage(user); const id = foreign('groups_cd', body.id); requireValue(typeof body.active === 'boolean', 'Estado no válido');
        atomic(() => { const previous = get('SELECT version FROM groups_cd WHERE id=?', id); requireValue(previous.version === body.version, 'El grupo cambió. Recarga antes de guardar', 409); run('UPDATE groups_cd SET name=?,course=?,active=?,version=version+1 WHERE id=?', string(body.name, 120, true), string(body.course, 20, true), Number(body.active), id); audit(user, 'group.update', id); }); return send(200, { ok: true });
      }
      if (route === '/api/memberships' && method === 'POST') {
        write(user); const person = foreign('people', body.person_id); const program = activeProgram(body.program_id); const started = date(body.started_at);
        requireValue(started <= now().slice(0, 10), 'El alta futura todavía no está disponible');
        atomic(() => enrollProgram(person, program, started, user)); return send(200, { ok: true });
      }
      if (route === '/api/memberships/end' && method === 'POST') {
        write(user); const person = foreign('people', body.person_id); const program = foreign('programs', body.program_id); const ended = date(body.ended_at);
        atomic(() => {
          const membership = get('SELECT * FROM program_memberships WHERE person_id=? AND program_id=?', person, program); requireValue(membership && ended >= membership.started_at && ended <= now().slice(0, 10), 'La baja debe ser posterior o igual al alta y no puede ser futura');
          if (!membership.active) { requireValue(membership.ended_at === ended, 'La participación ya está de baja'); return; }
          run('UPDATE program_memberships SET active=0,ended_at=? WHERE person_id=? AND program_id=?', ended, person, program);
          run('INSERT INTO membership_events VALUES(?,?,?,?,?,?,?)', randomUUID(), person, program, 'end', ended, user.id, now());
          run('UPDATE enrollments SET active=0 WHERE person_id=? AND group_id IN(SELECT id FROM groups_cd WHERE program_id=?)', person, program); audit(user, 'program.end', person);
        }); return send(200, { ok: true });
      }
      if (route === '/api/enrollments' && method === 'POST') {
        write(user); const person = foreign('people', body.person_id); const group = foreign('groups_cd', body.group_id); const groupData = get('SELECT * FROM groups_cd WHERE id=?', group);
        activeProgram(groupData.program_id); requireValue(groupData.active, 'El grupo está inactivo');
        atomic(() => {
          run('INSERT INTO enrollments VALUES(?,?,1) ON CONFLICT(person_id,group_id) DO UPDATE SET active=1', person, group);
          enrollProgram(person, groupData.program_id, now().slice(0, 10), user); audit(user, 'enrollment.save', person);
        }); return send(200, { ok: true });
      }
      if (route === '/api/enrollments/end' && method === 'POST') { write(user); const person = foreign('people', body.person_id); const group = foreign('groups_cd', body.group_id); atomic(() => { run('UPDATE enrollments SET active=0 WHERE person_id=? AND group_id=?', person, group); audit(user, 'enrollment.end', person); }); return send(200, { ok: true }); }
      if (route === '/api/cases' && method === 'POST') {
        write(user); const person = nullable('people', body.person_id); const family = nullable('families', body.family_id); requireValue(!!person !== !!family, 'Elige una persona o una familia');
        const id = randomUUID(); const owner = foreign('users', body.owner_id || user.id); requireValue(get('SELECT active FROM users WHERE id=?', owner).active, 'Responsable inactivo');
        atomic(() => { run('INSERT INTO cases_cd VALUES(?,?,?,?,?,?,?,?)', id, person, family, foreign('programs', body.program_id), owner, 'open', date(body.opened_at), string(body.notes, 10000)); audit(user, 'case.create', id); }); return send(201, { id });
      }
      if (route === '/api/cases/status' && method === 'POST') { write(user); const id = foreign('cases_cd', body.id); requireValue(['open', 'closed'].includes(body.status), 'Estado no válido'); atomic(() => { run('UPDATE cases_cd SET status=? WHERE id=?', body.status, id); audit(user, 'case.status', id); }); return send(200, { ok: true }); }
      if (route === '/api/followups' && method === 'POST') { write(user); const id = randomUUID(); atomic(() => { run('INSERT INTO followups VALUES(?,?,?,?,?)', id, foreign('cases_cd', body.case_id), string(body.body, 20000, true), user.id, now()); audit(user, 'followup.create', id); }); return send(201, { id }); }
      if (route === '/api/attendance' && method === 'GET') { const group = dayCentreGroup(url.searchParams.get('group')); const day = date(url.searchParams.get('day')); return send(200, all('SELECT * FROM attendance WHERE group_id=? AND day=?', group, day)); }
      if (route === '/api/attendance' && method === 'POST') {
        write(user); const group = dayCentreGroup(body.group_id); const day = date(body.day); requireValue(['general', 'refuerzo', 'ludicas', 'tribu'].includes(body.slot), 'Sesión no válida');
        requireValue(Array.isArray(body.rows) && body.rows.length > 0 && body.rows.length <= 500, 'Lista no válida');
        requireValue(new Set(body.rows.map(row => row.person_id)).size === body.rows.length, 'Persona repetida');
        atomic(() => {
          for (const row of body.rows) {
            requireValue(['P', 'A', 'J', 'R'].includes(row.status), 'Estado de asistencia no válido');
            requireValue(get('SELECT 1 FROM enrollments WHERE person_id=? AND group_id=? AND active=1', row.person_id, group), 'Persona no inscrita');
            const previous = get('SELECT version FROM attendance WHERE person_id=? AND group_id=? AND day=? AND slot=?', row.person_id, group, day, body.slot);
            requireValue(Number(row.version || 0) === (previous?.version || 0), 'La asistencia cambió en otra sesión. Recarga antes de guardar', 409);
            run('INSERT INTO attendance VALUES(?,?,?,?,?,?,?,1) ON CONFLICT(person_id,group_id,day,slot) DO UPDATE SET status=excluded.status,notes=excluded.notes,updated_by=excluded.updated_by,version=attendance.version+1', row.person_id, group, day, body.slot, row.status, string(row.notes, 2000), user.id);
          }
          audit(user, 'attendance.save', group);
        }); return send(200, { ok: true });
      }
      if (route === '/api/attendance/summary' && method === 'GET') {
        const start = date(url.searchParams.get('start')); const end = date(url.searchParams.get('end')); requireValue(start <= end, 'Periodo no válido');
        return send(200, all("SELECT a.person_id,a.group_id,a.slot,a.status,count(*) total FROM attendance a JOIN groups_cd g ON g.id=a.group_id JOIN programs p ON p.id=g.program_id WHERE a.day BETWEEN ? AND ? AND p.kind='dayCentre' GROUP BY a.person_id,a.group_id,a.slot,a.status", start, end));
      }
      if (route === '/api/reports' && method === 'GET') { const id = foreign('reports', url.searchParams.get('id')); return send(200, get('SELECT * FROM reports WHERE id=?', id)); }
      if (route === '/api/reports' && method === 'POST') {
        write(user); const individual = ['diary', 'observation', 'evaluation1', 'evaluation2', 'evaluationFinal', 'generalEvaluation']; const groupTypes = ['groupFollowup', 'activityPlan', 'tribuPlan', 'groupEvaluation'];
        requireValue([...individual, ...groupTypes].includes(body.type), 'Tipo de informe no válido');
        const person = nullable('people', body.person_id); const group = nullable('groups_cd', body.group_id);
        requireValue(individual.includes(body.type) ? person && !group : group && !person, 'Vincula el informe a su persona o grupo');
        if (!body.id) { if (person) requireValue(isDayCentrePerson(person), 'La persona no está vinculada a un programa de Centro de Día'); else dayCentreGroup(group); }
        requireValue(body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields) && JSON.stringify(body.fields).length <= 100000, 'Contenido no válido');
        const id = body.id ? foreign('reports', body.id) : randomUUID(); const previous = body.id ? get('SELECT * FROM reports WHERE id=?', id) : null;
        const definition = previous?.schema_json ? JSON.parse(previous.schema_json) : templates[body.type];
        requireValue(Object.keys(body.fields).every(key => definition.fields.some(field => field.key === key)), 'El informe contiene campos desconocidos');
        for (const field of definition.fields) {
          const value = body.fields[field.key] ?? '';
          requireValue(typeof value === 'string' && value.length <= 20000, 'Campo de informe no válido');
          if (value && field.type === 'select') requireValue(field.options.includes(value), 'Valor de evaluación no válido');
          if (value && field.type === 'number') requireValue(/^\d+$/.test(value), 'Indica un número entero positivo');
          if (value && field.type === 'month') requireValue(/^\d{4}-(0[1-9]|1[0-2])$/.test(value), 'Mes no válido');
          if (body.state === 'final' && field.requiredOnFinal) requireValue(value.trim(), `Completa ${field.label} antes de cerrar el informe`);
        }
        requireValue(['draft', 'final'].includes(body.state), 'Estado no válido');
        if (body.state === 'final') requireValue(Object.values(body.fields).some(value => value.trim()), 'Completa el contenido antes de cerrar el informe');
        requireValue(!previous || previous.version === body.version, 'El informe cambió. Recarga antes de guardar', 409);
        requireValue(!previous || previous.state !== 'final', 'El informe está cerrado. Crea otro para conservar el histórico', 409);
        requireValue(!previous || (previous.type === body.type && previous.person_id === person && previous.group_id === group), 'No se puede cambiar la vinculación de un informe existente');
        const version = (previous?.version || 0) + 1; const content = JSON.stringify(body.fields); const created = previous?.created_at || now();
        atomic(() => {
          run('INSERT INTO reports(id,type,person_id,group_id,day,course,title,body,state,version,created_by,created_at,updated_at,schema_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,course=excluded.course,title=excluded.title,body=excluded.body,state=excluded.state,version=excluded.version,updated_at=excluded.updated_at', id, body.type, person, group, date(body.day), string(body.course, 20, true), string(body.title, 200, true), content, body.state, version, previous?.created_by || user.id, created, now(), previous?.schema_json || JSON.stringify(definition));
          run('INSERT INTO report_versions VALUES(?,?,?,?,?)', id, version, content, user.id, now()); audit(user, 'report.save', id);
        }); return send(200, { id, version });
      }
      if (route === '/api/import/review' && method === 'POST') { write(user); requireValue(Array.isArray(body.people) && body.people.length > 0 && body.people.length <= 1000, 'Entre 1 y 1.000 filas'); const people = body.people.map(readPerson); const result = classifyRows(people.map((person, i) => ({ person, rowNumber: i, status: 'new', messages: [] })), all('SELECT * FROM people')); return send(200, result.map(row => ({ index: row.rowNumber, status: row.status, messages: row.messages }))); }
      if (route === '/api/import' && method === 'POST') {
        write(user); requireValue(Array.isArray(body.people) && body.people.length > 0 && body.people.length <= 1000, 'Entre 1 y 1.000 filas');
        const people = body.people.map(readPerson);
        const result = atomic(() => {
          const classified = classifyRows(people.map((person, i) => ({ person, rowNumber: i, status: 'new', messages: [] })), all('SELECT * FROM people'));
          return classified.map(row => row.status === 'new' ? { index: row.rowNumber, status: 'created', ...insertPerson(row.person, user) } : { index: row.rowNumber, status: row.status });
        }); return send(200, result);
      }
      if (route === '/api/audit' && method === 'GET') { admin(user); return send(200, all('SELECT * FROM audit ORDER BY id DESC LIMIT 200')); }
      throw new Fault(404, 'Ruta no encontrada');
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof Fault) return send(e.status, { error: e.message });
      if (/UNIQUE constraint/.test(e.message)) return send(409, { error: 'El registro ya existe. Revisa las coincidencias' });
      // Never log request bodies, passwords, names or report contents.
      console.error('Request failed:', e.code || 'internal'); return send(500, { error: 'No se pudo completar la operación' });
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  server.on('close', () => db.close());
  return { server, db };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { server } = createApplication({ dataDir: process.env.DATA_DIR || resolve(root, 'data'), origin: process.env.SITE_ORIGIN || 'http://127.0.0.1:4080', secureCookie: process.env.COOKIE_SECURE === '1', adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
  server.listen(Number(process.env.PORT || 4080), process.env.HOST || '127.0.0.1', () => console.log('NexeSocial local: servidor iniciado'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
