import { personSections, personFields as profileFields } from './person-schema.mjs';
import { selectedPeople, totalsFor, dimensionLabel, summaryCsv } from './totals.mjs';
import { templates } from './templates.mjs';
import { readWorkbook } from './xlsx.js';
import { FIELDS, suggestedMapping, validateRows, classifyRows } from './import-persones-core.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
const course = () => { const year = Number(today().slice(0, 4)) - (Number(today().slice(5, 7)) < 9 ? 1 : 0); return `${year}-${String(year + 1).slice(2)}`; };
const roleLabel = { admin: 'Administración', coordinator: 'Coordinación', educator: 'Equipo educativo', viewer: 'Consulta' };
let user, data, section = 'home', editorSave, importBook, importedRows = [], previewRows = [], importColumns = [], attendanceRows = [];
let saving = false;
const canWrite = () => user.role !== 'viewer';
const canManage = () => ['admin', 'coordinator'].includes(user.role);
const personName = id => { const person = data.people.find(p => p.id === id); return person ? `${person.nom} ${person.cognoms}` : '—'; };
const familyName = id => data.families.find(f => f.id === id)?.name || '—';
const groupName = id => data.groups.find(g => g.id === id)?.name || '—';
const programName = id => data.programs.find(p => p.id === id)?.name || '—';
const teamName = id => data.team.find(p => p.id === id)?.name || '—';
function notice(text = '', error = false) { $('notice').textContent = text; $('notice').dataset.error = error; }
async function api(path, body) {
  const response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Nexe-Request': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) { if (response.status === 401 && user) { user = null; login(); } throw new Error(value.error || 'No se pudo completar la operación'); }
  return value;
}
function button(label, action, id = '', secondary = false) { return `<button type="button" data-action="${action}" data-id="${esc(id)}"${secondary ? ' class="secondary"' : ''}>${esc(label)}</button>`; }
function input(name, label, type = 'text', value = '', required = true) { return `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} maxlength="${type === 'password' ? 512 : 250}"></label>`; }
function textarea(name, label, value = '', required = false) { return `<label>${esc(label)}<textarea name="${name}" maxlength="20000" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`; }
function select(name, label, items, required = true, value = '') { return `<label>${esc(label)}<select name="${name}" ${required ? 'required' : ''}><option value="">Selecciona…</option>${items.map(([id, text]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`; }
const cdProgramIds = () => new Set(data.programs.filter(p => p.kind === 'dayCentre').map(p => p.id));
const cdGroups = () => data.groups.filter(g => cdProgramIds().has(g.program_id));
const cdPeopleIds = () => new Set(data.memberships.filter(m => cdProgramIds().has(m.program_id)).map(m => m.person_id));
const peopleOptions = (cdOnly = false) => data.people.filter(p => !cdOnly || cdPeopleIds().has(p.id)).map(p => [p.id, `${p.number} · ${p.nom} ${p.cognoms}`]);
const familyOptions = () => data.families.map(f => [f.id, f.name]);
const programOptions = (activeOnly = false) => data.programs.filter(p => !activeOnly || p.active).map(p => [p.id, p.name]);
const groupOptions = (cdOnly = false, activeOnly = false) => data.groups.filter(g => (!cdOnly || cdProgramIds().has(g.program_id)) && (!activeOnly || (g.active && data.programs.find(p => p.id === g.program_id)?.active))).map(g => [g.id, `${g.name} · ${g.course}`]);
function table(headers, rows) { return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Todavía no hay registros.</td></tr>`}</tbody></table></div>`; }
function modal(title, fields, save, submit = 'Guardar') {
  $('dialogTitle').textContent = title; $('fields').innerHTML = fields; $('formError').textContent = ''; $('submitEditor').textContent = submit; $('submitEditor').hidden = !save;
  editorSave = save; $('dialog').showModal();
}
$('closeDialog').addEventListener('click', () => { if (!saving) $('dialog').close(); });
$('dialog').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
$('editor').addEventListener('submit', async event => {
  event.preventDefault(); if (!editorSave || saving) return; saving = true; $('submitEditor').disabled = true; $('closeDialog').disabled = true;
  try { const result = await editorSave(Object.fromEntries(new FormData($('editor')))); $('dialog').close(); await refresh(); notice('Cambios guardados.'); if (result?.next) result.next(); }
  catch (e) { $('formError').textContent = e.message; }
  finally { saving = false; $('submitEditor').disabled = false; $('closeDialog').disabled = false; }
});
function login() {
  document.body.classList.add('login-body'); document.body.classList.remove('menu-open'); $('topbar').hidden = true;
  $('sidebar').hidden = true; $('pageTitle').textContent = 'Acceso del equipo'; $('pageDescription').textContent = 'Personas, familias y centro de día en una sola herramienta.';
  $('content').innerHTML = `<form id="login" class="card login"><img class="login-logo" src="/assets/logo.png" alt="NexeSocial"><h2>Bienvenido de nuevo</h2><p class="login-subtitle">Gestión de usuarios centralizada</p>${input('email', 'Correo electrónico', 'email')}${input('password', 'Contraseña', 'password')}<button>Entrar</button><p class="login-note">Acceso exclusivo del equipo autorizado de la entidad.</p></form>`;
  $('login').addEventListener('submit', async event => { event.preventDefault(); const submit = event.target.querySelector('button'); submit.disabled = true;
    try { user = await api('login', Object.fromEntries(new FormData(event.target))); notice(); await refresh(); }
    catch (e) { notice(e.message, true); submit.disabled = false; }
  });
}
const pages = { home: ['Inicio', 'La gestión de la entidad y del centro de día, en una sola herramienta.'], people: ['Personas atendidas', 'Fichas, familias y expedientes vinculados.'], families: ['Familias', 'Unidades familiares e integrantes.'], programs: ['Programas y grupos', 'Organización de programas, participantes e inscripciones.'], totals: ['Totales', 'Resumen de personas por programa, curso y grupo.'], cases: ['Expedientes', 'Seguimiento individual y familiar.'], dayCentre: ['Centro de Día', 'Módulo del programa: participantes, grupos, asistencias e informes.'], attendance: ['CD · Asistencias', 'Registro del centro de día por grupo, fecha y tipo de sesión.'], reports: ['CD · Informes', 'Diarios, evaluaciones y planificación. Los definitivos conservan su contenido.'], import: ['Importar desde Excel', 'Revisa las personas antes de crear sus fichas. No se crean cuentas de acceso.'], users: ['Equipo y permisos', 'Cuentas de acceso a la herramienta.'], audit: ['Registro de operaciones', 'Últimas operaciones, sin copiar el contenido de los informes.'] };
async function refresh() { data = await api('data'); document.body.classList.remove('login-body'); $('topbar').hidden = false; $('topbarIdentity').textContent = user.name; $('sidebar').hidden = false; $('identity').textContent = `${user.name} · ${roleLabel[user.role]}`; renderNav(); await renderPage(); }
const navIcons = {"home":"M3 10l9-7 9 7v11H3z M9 21v-8h6v8","people":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-4 M16 3a4 4 0 0 1 0 8","families":"M3 21v-9l9-8 9 8v9 M8 21v-7h8v7","programs":"M3 6h7l2 3h9v12H3z","cases":"M7 3h10v4H7z M7 5H4v17h16V5h-3 M8 12h8 M8 16h5","dayCentre":"M12 2v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0","attendance":"M4 5h16v16H4z M8 3v4 M16 3v4 M8 14l3 3 5-6","reports":"M6 3h9l4 4v14H6z M9 11h7 M9 15h7 M14 3v5h5","import":"M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4","users":"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v2","audit":"M12 8v5l3 2 M21 12a9 9 0 1 1-3-7 M21 3v6h-6","totals":"M3 3v18h18 M7 16v-5 M12 16V6 M17 16v-8"};
function navIcon(id) { return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${navIcons[id]}"/></svg>`; }
function renderNav() { $('nav').innerHTML = [['Gestión', ['home','people','families','programs','cases','totals']], ['Centro de Día', ['dayCentre','attendance','reports']], ['Herramientas', ['import','users','audit']]].map(([group, ids]) => `<p class="nav-heading">${group}</p>${ids.filter(id => !['users','audit'].includes(id) || user.role === 'admin').map(id => `<button data-page="${id}" title="${esc(pages[id][0])}" aria-label="${esc(pages[id][0])}" aria-current="${id === section ? 'page' : 'false'}" class="${id === section ? 'active' : ''}">${navIcon(id)}<span class="nav-label">${esc(pages[id][0])}</span></button>`).join('')}`).join(''); }
$('toggleSidebar').addEventListener('click', () => { const mobile = matchMedia('(max-width:760px)').matches; document.body.classList.toggle(mobile ? 'menu-open' : 'collapsed'); $('toggleSidebar').setAttribute('aria-expanded', String(mobile ? document.body.classList.contains('menu-open') : !document.body.classList.contains('collapsed'))); });
$('nav').addEventListener('click', async event => { const target = event.target.closest('[data-page]'); if (target && !saving) { section = target.dataset.page; document.body.classList.remove("menu-open"); notice(); renderNav(); try { await renderPage(); } catch (e) { notice(e.message, true); } } });
$('logout').addEventListener('click', async () => { if (saving) return; try { await api('logout', {}); } finally { user = null; data = null; importBook = null; previewRows = []; login(); } });
async function renderPage() {
  const [title, description] = pages[section]; $('breadcrumb').textContent = `NexeSocial / ${title}`; $('pageTitle').textContent = title; $('pageDescription').textContent = description;
  if (section === 'home') {
    $('content').innerHTML = `<div class="welcome-section"><div><h2>Hola, ${esc(user.name)}</h2><p>Bienvenido a tu espacio de gestión.</p></div><img src="/assets/logo.png" alt="NexeSocial"></div><div class="cards">${[[data.people.length, 'Personas atendidas'], [data.families.length, 'Familias'], [data.programs.filter(p => p.active).length, 'Programas activos'], [data.cases.filter(c => c.status === 'open').length, 'Expedientes abiertos']].map(([count, label]) => `<div class="metric-card"><div class="metric-top"><span class="metric-label">${label}</span></div><span class="metric">${count}</span></div>`).join('')}</div><div class="home-columns"><div class="card"><h2>Accesos rápidos</h2><div class="quick-links">${['people','families','programs','dayCentre','attendance','reports','import'].map(id => `<button class="quick-link" data-action="openPage" data-id="${id}">${esc(pages[id][0])}</button>`).join('')}</div></div><div class="card"><h2>Centro de Día</h2><p>${cdGroups().filter(g => g.active).length} grupos activos.</p><p>${data.reports.length} informes y evaluaciones registrados.</p>${button('Abrir Centro de Día','openPage','dayCentre',true)}<p class="muted">Instalación de pruebas · datos en el servidor de la entidad.</p></div></div>`;
  } else if (section === 'totals') { renderTotals();
  } else if (section === 'people') {
    $('content').innerHTML = `<div class="toolbar">${canWrite() ? button('Nueva persona', 'personNew') + button('Importar Excel', 'importPage', '', true) : ''}<input id="search" class="search" placeholder="Buscar por nombre, expediente o documento" aria-label="Buscar personas"></div><div id="personTable"></div>`;
    const renderPeople = () => { const term = $('search').value.toLowerCase(); $('personTable').innerHTML = table(['Expediente permanente', 'Persona', 'Documento', 'Familia', 'Estado', 'Acciones'], data.people.filter(p => `${p.number} ${p.nom} ${p.cognoms} ${p.dni}`.toLowerCase().includes(term)).map(p => [`<strong class="exp-num">${esc(p.number)}</strong>`, esc(`${p.nom} ${p.cognoms}`), esc(p.dni || '—'), esc(familyName(p.family_id)), p.status === 'archived' ? 'Archivado' : 'Activo', button('Ver ficha', 'personView', p.id, true) + (canWrite() ? button('Editar', 'personEdit', p.id, true) + button('Vincular familia', 'personFamily', p.id, true) : '')])); };
    $('search').addEventListener('input', renderPeople); renderPeople();
  } else if (section === 'families') {
    $('content').innerHTML = `<div class="toolbar">${canWrite() ? button('Nueva familia', 'familyNew') : ''}<input id="familySearch" class="search" placeholder="Buscar familia o integrante" aria-label="Buscar familias"></div><div id="familyList"></div>`;
    const renderFamilies = () => { const term = $('familySearch').value.toLowerCase(); $('familyList').innerHTML = data.families.filter(f => `${f.name} ${f.contact} ${data.people.filter(p => p.family_id === f.id).map(p => p.nom+' '+p.cognoms).join(' ')}`.toLowerCase().includes(term)).map(f => { const members = data.people.filter(p => p.family_id === f.id); return `<div class="family-card"><div class="family-info"><span class="family-icon" aria-hidden="true">F</span><div><h3>${esc(f.name)}</h3><p>${esc(f.contact || 'Sin contacto registrado')}</p><span class="badge">${members.length} integrantes</span> ${members.map(p => `<span class="badge">${esc(p.nom)} ${esc(p.cognoms)}</span>`).join('')}<p>${esc(f.notes)}</p></div></div>${canWrite() ? button('Gestionar', 'familyEdit', f.id, true) : ''}</div>`; }).join('') || '<div class="card">No hay familias que mostrar.</div>'; };
    $('familySearch').addEventListener('input', renderFamilies); renderFamilies();
  } else if (section === 'programs') {
    $('content').innerHTML = `<div class="toolbar">${canManage() ? button('Nuevo programa', 'programNew') + button('Nuevo grupo', 'groupNew', '', true) : ''}${canWrite() ? button('Alta en programa', 'membershipNew', '', true) + button('Baja de programa', 'membershipEnd', '', true) + button('Inscribir en grupo', 'enroll', '', true) + button('Finalizar grupo', 'enrollmentEnd', '', true) : ''}</div><div class="card"><h2>Programas</h2>${table(['Nombre', 'Tipo', 'Estado', 'Participantes', 'Acciones'], data.programs.map(p => [esc(p.name), p.kind === 'dayCentre' ? 'Centro de Día' : 'General', p.active ? 'Activo' : 'Inactivo', String(data.memberships.filter(m => m.program_id === p.id && m.active).length), button('Ver programa', 'programView', p.id, true) + (canManage() ? button('Editar', 'programEdit', p.id, true) : '')]))}</div><div class="card"><h2>Grupos</h2>${table(['Grupo', 'Programa', 'Curso', 'Estado', 'Inscritos', 'Acciones'], data.groups.map(g => [esc(g.name), esc(programName(g.program_id)), esc(g.course), g.active ? 'Activo' : 'Inactivo', String(data.enrollments.filter(e => e.group_id === g.id && e.active).length), canManage() ? button('Editar', 'groupEdit', g.id, true) : '—']))}</div>`;
  } else if (section === 'dayCentre') {
    const ids = cdProgramIds(); const people = cdPeopleIds(); const activePeople = new Set(data.memberships.filter(m => ids.has(m.program_id) && m.active).map(m => m.person_id));
    $('content').innerHTML = `<div class="toolbar">${button('Pasar lista', 'attendancePage')}${button('Informes y planificación', 'reportsPage', '', true)}${canWrite() ? button('Alta en programa', 'membershipNew', '', true) : ''}</div><div class="cards">${[[activePeople.size, 'Participantes activos'], [cdGroups().filter(g => g.active).length, 'Grupos activos'], [data.cases.filter(c => ids.has(c.program_id) && c.status === 'open').length, 'Expedientes abiertos'], [data.reports.length, 'Informes y evaluaciones']].map(([n, label]) => `<div class="card"><span class="metric">${n}</span>${label}</div>`).join('')}</div>${ids.size ? `<div class="card"><h2>Participantes del programa</h2>${table(['Persona', 'Familia', 'Programa', 'Grupos', 'Ficha'], data.people.filter(p => people.has(p.id)).map(p => [esc(`${p.nom} ${p.cognoms}`), esc(familyName(p.family_id)), data.memberships.filter(m => m.person_id === p.id && ids.has(m.program_id)).map(m => `${esc(programName(m.program_id))}${m.active ? '' : ' (baja)'}`).join('<br>'), data.enrollments.filter(e => e.person_id === p.id && e.active && cdGroups().some(g => g.id === e.group_id)).map(e => esc(groupName(e.group_id))).join(', ') || '—', button('Ver ficha', 'personView', p.id, true)]))}</div>` : '<div class="card"><h2>Configurar el programa</h2><p>Crea o edita un programa y selecciona el tipo Centro de Día. Sus grupos y participantes aparecerán aquí.</p></div>'}`;
  } else if (section === 'cases') {
    $('content').innerHTML = `<div class="toolbar">${canWrite() ? button('Abrir expediente', 'caseNew') : ''}</div>${table(['Persona / familia', 'Programa', 'Responsable', 'Apertura', 'Estado', 'Seguimiento'], data.cases.map(c => [esc(c.person_id ? personName(c.person_id) : familyName(c.family_id)), esc(programName(c.program_id)), esc(teamName(c.owner_id)), esc(c.opened_at), c.status === 'open' ? 'Abierto' : 'Cerrado', button('Ver historial', 'caseView', c.id, true) + (canWrite() ? button('Añadir seguimiento', 'followup', c.id, true) + button(c.status === 'open' ? 'Cerrar' : 'Reabrir', 'caseStatus', c.id, true) : '')]))}`;
  } else if (section === 'attendance') {
    $('content').innerHTML = `<div class="card"><div class="grid">${select('attendanceGroup', 'Grupo de Centro de Día', groupOptions(true))}${input('attendanceDay', 'Fecha', 'date', today())}${select('attendanceSlot', 'Sesión', [['general', 'General'], ['refuerzo', 'Refuerzo escolar'], ['ludicas', 'Lúdicas'], ['tribu', 'Tribu']], true, 'general')}</div>${button('Cargar lista', 'attendanceLoad')} ${button('Resumen por periodo', 'attendanceSummary', '', true)}<div id="attendanceList"></div></div>`;
    for (const el of $('content').querySelectorAll('input,select')) el.addEventListener('change', () => { $('attendanceList').replaceChildren(); attendanceRows = []; });
  } else if (section === 'reports') {
    $('content').innerHTML = `<div class="toolbar">${canWrite() ? button('Nuevo informe', 'reportNew') : ''}<input id="reportSearch" class="search" aria-label="Buscar informes" placeholder="Buscar por persona, grupo, tipo o fecha"></div><div id="reportTable"></div><p class="muted">Los formularios adaptan campos de las plantillas existentes. La maquetación idéntica de los originales y su validación con el equipo están pendientes.</p>`;
    const renderReports = () => { const term = $('reportSearch').value.toLowerCase(); $('reportTable').innerHTML = table(['Fecha', 'Tipo', 'Persona / grupo', 'Título', 'Estado', 'Acciones'], data.reports.filter(r => `${r.day} ${templates[r.type]?.label} ${personName(r.person_id)} ${groupName(r.group_id)} ${r.title}`.toLowerCase().includes(term)).map(r => [esc(r.day), esc(templates[r.type]?.label), esc(r.person_id ? personName(r.person_id) : groupName(r.group_id)), esc(r.title), r.state === 'final' ? 'Definitivo' : 'Borrador', button('Ver / imprimir', 'reportView', r.id, true) + (canWrite() && r.state === 'draft' ? button('Editar', 'reportEdit', r.id, true) : '')])); };
    $('reportSearch').addEventListener('input', renderReports); renderReports();
  } else if (section === 'import') renderImport();
  else if (section === 'users') {
    const users = await api('users'); $('content').innerHTML = `<div class="toolbar">${button('Nueva cuenta', 'userNew')}</div>${table(['Nombre', 'Correo', 'Perfil', 'Estado', 'Acciones'], users.map(u => [esc(u.name), esc(u.email), esc(roleLabel[u.role]), u.active ? 'Activa' : 'Inactiva', button('Cambiar acceso', 'userEdit', u.id, true)]))}`;
  } else if (section === 'audit') {
    const entries = await api('audit'); $('content').innerHTML = table(['Fecha', 'Usuario', 'Operación', 'Registro'], entries.map(e => [esc(e.at), esc(teamName(e.actor)), esc(e.action), esc(e.entity_id)]));
  }
}

function basePersonFields(p = {}) { return `<div class="grid">${input('nom', 'Nombre', 'text', p.nom)}${input('cognoms', 'Apellidos completos', 'text', p.cognoms)}${input('dni', 'Documento', 'text', p.dni, false)}${input('data_naixement', 'Nacimiento', 'date', p.data_naixement, false)}${input('telefon', 'Teléfono', 'tel', p.telefon, false)}${input('email', 'Correo', 'email', p.email, false)}${input('poblacio', 'Población', 'text', p.poblacio, false)}${select('family_id', 'Familia', familyOptions(), false, p.family_id)}</div><p class="muted">Indica documento o fecha de nacimiento para comprobar coincidencias.</p>`; }
function personFields(p = {}) {
  const profile = JSON.parse(p.profile_json || '{}');
  return `<p class="permanent-number">Expediente permanente: <strong>${esc(p.number || 'Se asignará al guardar')}</strong></p><p class="muted">La misma persona conserva este número en todos sus programas, bajas y reingresos.</p>${basePersonFields(p)}${p.id ? select('status','Estado de la ficha',[['active','Activo'],['archived','Archivado']],true,p.status || 'active') : ''}${personSections.map(([title,fields],index) => `<details class="profile-section" ${index === 0 ? 'open' : ''}><summary>${esc(title)}</summary><div class="grid">${fields.map(f => {
    const name = `profile_${f.key}`, value = profile[f.key] || '';
    if (f.type === 'multi') return `<fieldset class="profile-multi"><legend>${esc(f.label)}</legend>${f.options.map(option => `<label><input type="checkbox" name="${name}" value="${esc(option)}" ${Array.isArray(value) && value.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</fieldset>`;
    if (f.type === 'select') return select(name,f.label,f.options.map(v => [v,v]),false,value);
    return f.type === 'long' ? textarea(name,f.label,value) : input(name,f.label,'text',value,false);
  }).join('')}</div></details>`).join('')}`;
}
function personValues(values) {
  const form = new FormData($('editor')); const profile = {};
  for (const f of profileFields) profile[f.key] = f.type === 'multi' ? form.getAll(`profile_${f.key}`) : form.get(`profile_${f.key}`) || '';
  return { ...Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith('profile_'))), profile };
}
function profileView(person) {
  const profile = JSON.parse(person.profile_json || '{}');
  return personSections.map(([title,fields]) => `<details class="profile-section"><summary>${esc(title)}</summary><dl class="profile-values">${fields.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc((Array.isArray(profile[f.key]) ? profile[f.key].join(', ') : profile[f.key]) || 'Sin informar')}</dd></div>`).join('')}</dl></details>`).join('');
}
function renderTotals() {
  $('content').innerHTML = `<div class="card"><div class="grid totals-filters">${select('totalsProgram','Programa',[['all','Todos'],...programOptions()],true,'all')}${select('totalsCourse','Curso',[['all','Todos'],...[...new Set(data.groups.map(g => g.course))].sort().map(v => [v,v])],true,'all')}${select('totalsGroup','Grupo',[['all','Todos'],...groupOptions()],true,'all')}${select('totalsStatus','Estado de la ficha',[['active','Activos'],['archived','Archivados'],['all','Todos']],true,'active')}${select('totalsParticipation','Participación',[['active','Inscripciones actuales'],['all','Incluye inscripciones finalizadas']],true,'active')}</div><p class="muted">Cada persona cuenta una sola vez. El curso filtra las inscripciones registradas; los indicadores reflejan la ficha actual.</p>${button('Exportar resumen CSV (Excel)','totalsExport')} ${button('Imprimir resumen','totalsPrint','',true)}</div><div id="totalsResult"></div>`;
  const update = () => {
    const program = document.querySelector('[name=totalsProgram]').value;
    const course = document.querySelector('[name=totalsCourse]').value;
    const groupSelect = document.querySelector('[name=totalsGroup]');
    for (const option of groupSelect.options) { const group = data.groups.find(g => g.id === option.value); option.hidden = !!group && ((program !== 'all' && group.program_id !== program) || (course !== 'all' && group.course !== course)); }
    if (groupSelect.selectedOptions[0]?.hidden) groupSelect.value = 'all';
    const filters = Object.fromEntries(['Program','Course','Group','Status','Participation'].map(key => [key.charAt(0).toLowerCase()+key.slice(1), document.querySelector(`[name=totals${key}]`).value.replace(/^all$/,'')]));
    const stats = totalsFor(selectedPeople(data,filters),today());
    $('totalsResult').innerHTML = `<div class="cards"><div class="metric-card"><span class="metric-label">Personas únicas</span><span class="metric">${stats.total}</span></div><div class="metric-card"><span class="metric-label">Edad media</span><span class="metric">${stats.averageAge === null ? '—' : stats.averageAge.toFixed(1)}</span><small>${stats.ageKnown} fechas conocidas</small></div></div><div class="totals-grid">${Object.entries(stats.dimensions).map(([key,counts]) => `<div class="card"><h2>${esc(dimensionLabel(key))}</h2>${table(['Categoría','Personas','Distribución'],Object.entries(counts).map(([label,count]) => [esc(label),String(count),`<svg class="total-bar" viewBox="0 0 100 12" role="img" aria-label="${stats.total ? (count/stats.total*100).toFixed(1) : 0}%"><rect width="${stats.total ? count/stats.total*100 : 0}" height="12" rx="3"/></svg>`]))}</div>`).join('')}</div>`;
  };
  for (const el of $('content').querySelectorAll('select')) el.addEventListener('change',update);
  update();
}
function totalsSelection() { return Object.fromEntries(['Program','Course','Group','Status','Participation'].map(key => [key.charAt(0).toLowerCase()+key.slice(1), document.querySelector(`[name=totals${key}]`).value.replace(/^all$/,'')])); }
async function action(action, id) {
  if (action === 'totalsExport') { const filters = [...$('content').querySelectorAll('select')].map(el => [el.closest('label').firstChild.textContent,el.selectedOptions[0].textContent]); const blob = new Blob([summaryCsv(totalsFor(selectedPeople(data,totalsSelection()),today()),filters)],{type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nexesocial-totales-${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return; }
  if (action === 'totalsPrint') { const filters = [...$('content').querySelectorAll('select')].map(el => `${el.closest('label').firstChild.textContent}: ${el.selectedOptions[0].textContent}`).join(' · '); printDocument('Totales de personas',`<p>${esc(filters)}</p><p>Perfil actual · ${esc(today())}</p>`+$('totalsResult').innerHTML); return window.print(); }
  if (action === 'openPage' && pages[id] && (!['users','audit'].includes(id) || user.role === 'admin')) { section = id; renderNav(); return renderPage(); }
  if (action === 'attendancePage' || action === 'reportsPage') { section = action === 'attendancePage' ? 'attendance' : 'reports'; renderNav(); return renderPage(); }
  if (action === 'importPage') { section = 'import'; renderNav(); return renderPage(); }
  if (action === 'personNew') return modal('Nueva persona atendida', personFields(), values => api('people', personValues(values)));
  if (action === 'personEdit') { const person = data.people.find(p => p.id === id); return modal('Editar persona atendida', personFields(person), values => api('people/update', { id, version: person.version, ...personValues(values) })); }
  if (action === 'personFamily') { const person = data.people.find(p => p.id === id); return modal(`Familia de ${person.nom}`, select('family_id', 'Familia (vacío para desvincular)', familyOptions(), false, person.family_id), values => api('people/family', { person_id: id, version: person.version, ...values })); }
  if (action === 'personView') {
    const p = data.people.find(p => p.id === id); const cases = data.cases.filter(c => c.person_id === id);
    return modal(`${p.number} · ${p.nom} ${p.cognoms}`, `<div class="grid">${[['Documento', p.dni], ['Nacimiento', p.data_naixement], ['Teléfono', p.telefon], ['Correo', p.email], ['Población', p.poblacio], ['Familia', familyName(p.family_id)], ['Estado', p.status === 'archived' ? 'Archivado' : 'Activo']].map(([label, value]) => `<p><strong>${label}</strong><br>${esc(value || '—')}</p>`).join('')}</div>${profileView(p)}<h3>Grupos</h3><p>${data.enrollments.filter(e => e.person_id === id && e.active).map(e => esc(groupName(e.group_id))).join(', ') || 'Sin inscripciones'}</p><h3>Expedientes y seguimientos</h3>${cases.map(c => `<h4>${esc(programName(c.program_id))} · ${esc(c.status)}</h4><p>${esc(c.notes)}</p>${followupHtml(c.id)}`).join('') || '<p>Sin expedientes abiertos.</p>'}`, null);
  }
  if (action === 'familyNew') return modal('Nueva familia', input('name', 'Nombre de referencia') + input('contact', 'Contacto', 'text', '', false) + textarea('notes', 'Notas'), values => api('families', values));
  if (action === 'familyEdit') { const f = data.families.find(f => f.id === id); return modal('Editar familia', input('name', 'Nombre de referencia', 'text', f.name) + input('contact', 'Contacto', 'text', f.contact, false) + textarea('notes', 'Notas', f.notes), values => api('families/update', { id, version: f.version, ...values })); }
  if (action === 'programNew') return modal('Nuevo programa', input('name', 'Nombre del programa') + select('kind', 'Tipo de programa', [['general', 'General'], ['dayCentre', 'Centro de Día']], true, 'general') + textarea('description', 'Descripción'), values => api('programs', values));
  if (action === 'programEdit') { const p = data.programs.find(p => p.id === id); return modal('Editar programa', input('name', 'Nombre', 'text', p.name) + select('kind', 'Tipo', [['general', 'General'], ['dayCentre', 'Centro de Día']], true, p.kind) + select('active', 'Estado', [['true', 'Activo'], ['false', 'Inactivo: conserva el histórico']], true, String(!!p.active)) + textarea('description', 'Descripción', p.description), values => api('programs/update', { id, version: p.version, ...values, active: values.active === 'true' })); }
  if (action === 'programView') { const p = data.programs.find(p => p.id === id); return modal(p.name, `<p>${esc(p.description)}</p><h3>Participación actual</h3>${table(['Persona', 'Alta', 'Baja', 'Estado'], data.memberships.filter(m => m.program_id === id).map(m => [esc(personName(m.person_id)), esc(m.started_at), esc(m.ended_at || '—'), m.active ? 'Activa' : 'Baja']))}<h3>Histórico de altas y bajas</h3>${table(['Persona', 'Fecha efectiva', 'Movimiento', 'Profesional'], data.membershipEvents.filter(e => e.program_id === id).map(e => [esc(personName(e.person_id)), esc(e.effective_at), e.action === 'start' ? 'Alta' : 'Baja', e.actor ? esc(teamName(e.actor)) : 'Migración inicial']))}`, null); }
  if (action === 'groupNew') return modal('Nuevo grupo', input('name', 'Nombre del grupo') + select('program_id', 'Programa', programOptions(true)) + input('course', 'Curso', 'text', course()), values => api('groups', values));
  if (action === 'groupEdit') { const g = data.groups.find(g => g.id === id); return modal('Editar grupo', input('name', 'Nombre', 'text', g.name) + input('course', 'Curso', 'text', g.course) + select('active', 'Estado', [['true', 'Activo'], ['false', 'Inactivo: conserva el histórico']], true, String(!!g.active)), values => api('groups/update', { id, version: g.version, ...values, active: values.active === 'true' })); }
  if (action === 'membershipNew') return modal('Alta de persona en un programa', select('person_id', 'Persona', peopleOptions()) + select('program_id', 'Programa', programOptions(true)) + input('started_at', 'Fecha de alta', 'date', today()), values => api('memberships', values));
  if (action === 'membershipEnd') return modal('Baja de programa y sus grupos (conserva el histórico)', select('person_id', 'Persona', peopleOptions()) + select('program_id', 'Programa', programOptions()) + input('ended_at', 'Fecha de baja', 'date', today()), values => api('memberships/end', values));
  if (action === 'enroll') return modal('Inscribir persona en un grupo', select('person_id', 'Persona', peopleOptions()) + select('group_id', 'Grupo', groupOptions(false, true)), values => api('enrollments', values));
  if (action === 'enrollmentEnd') return modal('Finalizar inscripción (conserva asistencias)', select('person_id', 'Persona', peopleOptions()) + select('group_id', 'Grupo', groupOptions()), values => api('enrollments/end', values));
  if (action === 'caseNew') return modal('Abrir expediente', select('person_id', 'Persona (elige persona o familia)', peopleOptions(), false) + select('family_id', 'Familia', familyOptions(), false) + select('program_id', 'Programa', programOptions()) + select('owner_id', 'Profesional responsable', data.team.map(u => [u.id, u.name]), true, user.id) + input('opened_at', 'Fecha de apertura', 'date', today()) + textarea('notes', 'Motivo y objetivos'), values => api('cases', values));
  if (action === 'caseView') { const c = data.cases.find(c => c.id === id); return modal('Historial del expediente', `<p>${esc(c.notes)}</p>${followupHtml(id)}`, null); }
  if (action === 'followup') return modal('Nuevo seguimiento', textarea('body', 'Intervención, observaciones y acuerdos', '', true), values => api('followups', { case_id: id, ...values }));
  if (action === 'caseStatus') { const c = data.cases.find(c => c.id === id); await api('cases/status', { id, status: c.status === 'open' ? 'closed' : 'open' }); return refresh(); }
  if (action === 'attendanceLoad') return loadAttendance();
  if (action === 'attendanceSave') return saveAttendance();
  if (action === 'attendanceSummary') return modal('Resumen de asistencia', input('start', 'Desde', 'date', `${today().slice(0, 7)}-01`) + input('end', 'Hasta', 'date', today()), async values => {
    const records = await api(`attendance/summary?start=${values.start}&end=${values.end}`);
    const content = table(['Persona', 'Grupo', 'Sesión', 'Estado', 'Total'], records.map(row => [esc(personName(row.person_id)), esc(groupName(row.group_id)), esc(row.slot), esc(row.status), String(row.total)]));
    printDocument(`Asistencias · ${values.start} / ${values.end}`, content); window.print();
  }, 'Preparar impresión');
  if (action === 'reportNew') return modal('Tipo de informe', select('type', 'Formulario', Object.entries(templates).map(([key, item]) => [key, item.label])), values => ({ next: () => editReport({ type: values.type }) }), 'Continuar');
  if (action === 'reportEdit') return editReport(await api(`reports?id=${encodeURIComponent(id)}`));
  if (action === 'reportView') { const report = await api(`reports?id=${encodeURIComponent(id)}`); const schema = report.schema_json ? JSON.parse(report.schema_json) : templates[report.type]; const fields = JSON.parse(report.body);
    const body = `<p>${esc(schema.label)} · ${esc(report.day)} · ${esc(report.course)}</p><p>${esc(report.person_id ? personName(report.person_id) : groupName(report.group_id))} · ${esc(teamName(report.created_by))} · v${report.version} · ${report.state === 'final' ? 'Definitivo' : 'Borrador'}</p>${schema.fields.map(f => `<div class="print-field"><strong>${esc(f.label)}</strong>${esc(fields[f.key] || '—')}</div>`).join('')}`;
    printDocument(report.title, body); return modal(report.title, button('Imprimir / guardar como PDF', 'print', '', true) + body, null);
  }
  if (action === 'print') return window.print();
  if (action === 'userNew') return modal('Nueva cuenta del equipo', input('name', 'Nombre') + input('email', 'Correo', 'email') + input('password', 'Contraseña (mínimo 12 caracteres)', 'password') + select('role', 'Perfil', Object.entries(roleLabel)), values => api('users', values));
  if (action === 'userEdit') { const account = (await api('users')).find(u => u.id === id); return modal(`Acceso de ${account.name}`, select('role', 'Perfil', Object.entries(roleLabel), true, account.role) + select('active', 'Acceso', [['true', 'Activo'], ['false', 'Inactivo']], true, String(!!account.active)) + input('password', 'Nueva contraseña (opcional, mínimo 12 caracteres)', 'password', '', false), values => api('users/update', { id, ...values, active: values.active === 'true' })); }
  if (action === 'importRead') return mapWorkbook();
  if (action === 'importReview') return reviewImport();
  if (action === 'importSave') return saveImport();
}
function followupHtml(id) { return data.followups.filter(f => f.case_id === id).map(f => `<div class="followup"><strong>${esc(f.created_at.slice(0, 10))} · ${esc(teamName(f.created_by))}</strong><br>${esc(f.body)}</div>`).join('') || '<p>Sin seguimientos.</p>'; }
function printDocument(title, body) { $('printArea').innerHTML = `<h1>${esc(title)}</h1>${body}`; }
function editReport(report) {
  const template = report.schema_json ? JSON.parse(report.schema_json) : templates[report.type]; const values = report.body ? JSON.parse(report.body) : {};
  const fields = template.fields.map(f => f.type === 'textarea' ? textarea(`field_${f.key}`, f.label, values[f.key]) : f.type === 'select' ? select(`field_${f.key}`, f.label, f.options.map(o => [o, o]), false, values[f.key]) : input(`field_${f.key}`, f.label, f.type, values[f.key] || '', false)).join('');
  modal(template.label, `<p class="muted">Referencia: ${esc(template.source)}. Adaptación inicial pendiente de validación funcional.</p>${input('title', 'Título', 'text', report.title || template.label)}<div class="grid">${input('day', 'Fecha', 'date', report.day || today())}${input('course', 'Curso', 'text', report.course || course())}</div>${template.scope === 'person' ? select('person_id', 'Participante de Centro de Día', peopleOptions(true), true, report.person_id) : select('group_id', 'Grupo de Centro de Día', groupOptions(true), true, report.group_id)}${select('state', 'Estado', [['draft', 'Borrador editable'], ['final', 'Definitivo: cierra la edición']], true, 'draft')}<hr>${fields}`, form => {
    const fields = Object.fromEntries(template.fields.map(f => [f.key, form[`field_${f.key}`] || '']));
    return api('reports', { id: report.id, version: report.version, type: report.type, title: form.title, day: form.day, course: form.course, person_id: form.person_id || null, group_id: form.group_id || null, state: form.state, fields });
  });
}
function attendanceContext() { const value = name => $('content').querySelector(`[name=${name}]`).value; return { group_id: value('attendanceGroup'), day: value('attendanceDay'), slot: value('attendanceSlot') }; }
async function loadAttendance() {
  const context = attendanceContext(); if (!context.group_id || !context.day) throw new Error('Selecciona grupo y fecha');
  const records = await api(`attendance?group=${encodeURIComponent(context.group_id)}&day=${context.day}`);
  attendanceRows = data.enrollments.filter(e => e.group_id === context.group_id && e.active).map(e => ({ person_id: e.person_id, ...records.find(r => r.person_id === e.person_id && r.slot === context.slot) }));
  $('attendanceList').innerHTML = `<p>P: presente · A: ausente · J: ausencia justificada · R: retraso. Sin seleccionar no equivale a presente.</p>${table(['Persona', 'Estado', 'Observaciones'], attendanceRows.map((row, i) => [esc(personName(row.person_id)), select(`status_${i}`, 'Asistencia', [['P', 'Presente'], ['A', 'Ausente'], ['J', 'Justificada'], ['R', 'Retraso']], true, row.status), input(`notes_${i}`, 'Observaciones', 'text', row.notes || '', false)]))}${canWrite() && attendanceRows.length ? button('Guardar asistencia', 'attendanceSave') : ''}`;
  if (!canWrite()) for (const el of $('attendanceList').querySelectorAll('input,select')) el.disabled = true;
}
async function saveAttendance() {
  const rows = attendanceRows.map((row, i) => ({ person_id: row.person_id, version: row.version || 0, status: $('attendanceList').querySelector(`[name=status_${i}]`).value, notes: $('attendanceList').querySelector(`[name=notes_${i}]`).value }));
  if (rows.some(row => !row.status)) throw new Error('Indica el estado de todas las personas antes de guardar');
  await api('attendance', { ...attendanceContext(), rows }); await loadAttendance(); notice('Asistencia guardada.');
}

function renderImport() {
  importBook = null; importedRows = []; previewRows = [];
  $('content').innerHTML = `<div class="card"><h2>1. Selecciona el Excel</h2><label>Archivo .xlsx, máximo 10 MB<input id="importFile" type="file" accept=".xlsx"></label><p class="muted">Se lee en tu navegador. Si tienes un .xls antiguo, ábrelo con Excel o LibreOffice y guárdalo como .xlsx. Máximo 1.000 personas por lote.</p><div id="workbookOptions" hidden><div class="grid"><label>Hoja<select id="importSheet"></select></label><label>Fila de cabeceras<input id="importHeader" type="number" min="1" max="100" value="1"></label></div>${button('Leer columnas', 'importRead')}</div></div><div id="importMap"></div><div id="importPreview"></div>`;
  $('importFile').addEventListener('change', async () => {
    saving = true; $('importFile').disabled = true;
    $('workbookOptions').hidden = true; $('importMap').replaceChildren(); $('importPreview').replaceChildren(); previewRows = []; importBook = null;
    try { const file = $('importFile').files[0]; if (!file) return; importBook = await readWorkbook(await file.arrayBuffer()); $('importSheet').innerHTML = importBook.sheets.map((sheet, i) => `<option value="${i}">${esc(sheet.name)}</option>`).join(''); $('workbookOptions').hidden = false; notice('Archivo leído. Elige la hoja y la fila de cabeceras.'); }
    catch (e) { notice(e.message, true); }
    finally { saving = false; if ($('importFile')) $('importFile').disabled = false; }
  });
  for (const id of ['importSheet', 'importHeader']) $(id).addEventListener('change', () => { $('importMap').replaceChildren(); $('importPreview').replaceChildren(); previewRows = []; });
}
async function mapWorkbook() {
  $('importPreview').replaceChildren(); previewRows = []; const header = Number($('importHeader').value);
  if (!Number.isInteger(header) || header < 1 || header > 100) throw new Error('Fila de cabeceras entre 1 y 100');
  const parsed = await importBook.rows(Number($('importSheet').value), header); importColumns = parsed.headers; importedRows = parsed.rows;
  const mapping = suggestedMapping(importColumns);
  $('importMap').innerHTML = `<div class="card"><h2>2. Relaciona las columnas</h2><p>Nombre y apellidos obligatorios. Documento o fecha de nacimiento para identificar coincidencias. Las columnas no asignadas no se importan.</p><div class="grid">${FIELDS.map(([key, label]) => select(`map_${key}`, label, importColumns.flatMap((h, i) => [[String(i), `${i + 1}. ${h || '(sin título)'}`]]), false, String(mapping[key]))).join('')}</div>${button('Revisar personas y coincidencias', 'importReview')}</div>`;
  for (const select of $('importMap').querySelectorAll('select')) select.addEventListener('change', () => { previewRows = []; $('importPreview').replaceChildren(); });
}
async function reviewImport() {
  const mapping = Object.fromEntries(FIELDS.map(([key]) => { const value = $('importMap').querySelector(`[name=map_${key}]`).value; return [key, value === '' ? -1 : Number(value)]; }));
  previewRows = classifyRows(validateRows(importedRows, mapping, { date1904: importBook.date1904 }));
  if (!previewRows.length) throw new Error('La hoja no contiene personas');
  const valid = previewRows.filter(row => row.status === 'new');
  if (valid.length) {
    const reviewed = await api('import/review', { people: valid.map(row => row.person) });
    for (const result of reviewed) { valid[result.index].status = result.status; valid[result.index].messages.push(...result.messages); }
  }
  renderPreview(); notice('Revisión terminada. No se ha creado ninguna ficha.');
}
function renderPreview() {
  const labels = { new: 'Nueva', duplicate: 'Coincidencia', review: 'Revisión manual', error: 'Error', created: 'Importada', pending: 'Pendiente de comprobar' };
  const counts = previewRows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  $('importPreview').innerHTML = `<div class="card"><h2>3. Revisa y confirma</h2><p>${Object.entries(counts).map(([status, n]) => `${labels[status]}: ${n}`).join(' · ')}</p>${table(['Fila Excel', 'Persona', 'Resultado', 'Detalle'], previewRows.map(row => [String(row.rowNumber), esc(`${row.person.nom} ${row.person.cognoms}`), labels[row.status], esc(row.number || row.messages.join(' · '))]))}<p>Las coincidencias y los errores quedan fuera. No se modifica ninguna ficha existente. La vinculación familiar y las inscripciones se hacen después en sus apartados.</p>${canWrite() && previewRows.some(r => r.status === 'new') ? `<label><input id="approveImport" type="checkbox">He revisado las personas y confirmo las altas nuevas.</label>${button('Importar personas nuevas', 'importSave')}` : ''}</div>`;
}
async function saveImport() {
  if (!$('approveImport')?.checked) throw new Error('Revisa la lista y marca la confirmación');
  const selected = previewRows.filter(row => row.status === 'new'); if (!selected.length) return;
  try {
    const result = await api('import', { people: selected.map(row => row.person) });
    for (const row of result) { selected[row.index].status = row.status; selected[row.index].number = row.number; }
    data = await api('data'); renderPreview(); notice('Importación terminada. Las fichas están disponibles en Personas atendidas.');
  } catch (e) { for (const row of selected) row.status = 'pending'; renderPreview(); throw new Error(`${e.message}. Vuelve a revisar: la operación puede haberse completado aunque no haya llegado la respuesta.`); }
}
document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]'); if (!target || saving) return;
  const controls = [...$('content').querySelectorAll('input,select,button')].map(element => [element, element.disabled]);
  saving = true; target.disabled = true; for (const [element] of controls) element.disabled = true;
  try { await action(target.dataset.action, target.dataset.id); }
  catch (e) { notice(e.message, true); }
  finally { saving = false; target.disabled = false; for (const [element, wasDisabled] of controls) if (element.isConnected) element.disabled = wasDisabled; }
});
window.addEventListener('beforeunload', event => { if (saving) { event.preventDefault(); event.returnValue = ''; } });
try { user = await api('me'); await refresh(); } catch { login(); }
