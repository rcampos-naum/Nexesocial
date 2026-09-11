import { login, logout, watchAuth, watchMembership, watchAreaData, saveActivity } from './data.js';
import { ROLE_LABELS, canManageActivities, isActiveMember } from './model.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#activity-dialog');
const form = document.querySelector('#activity-form');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let user = null, member = null, data = null, error = '', loginBusy = false, saving = false;
let areaFilter = '', search = '', stopMember = () => {}, stopData = () => {}, expiry;
let generation = 0;
let scopeGeneration = 0;
const testProfiles = [
    { key: 'admin', name: 'Administració', detail: 'Les sis àrees · crear i editar activitats', initials: 'AD' },
    { key: 'coordinator', name: 'Coordinació', detail: 'Son Roca Activa · crear i editar activitats', initials: 'CO' },
    { key: 'educator', name: 'Equip educatiu', detail: 'Centre de dia · consulta d’activitats', initials: 'ED' },
    { key: 'volunteer', name: 'Voluntariat', detail: 'Son Roca Activa · consulta d’activitats', initials: 'VO' }
];
const route = () => ['inici', 'programes', 'activitats'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inici';
const areaName = id => data?.areas.find(a => a.id === id)?.name || 'Àrea';
const programName = id => data?.programs.find(p => p.id === id)?.name || 'Directament a l’àrea';
function announce(message) {
    const box = document.querySelector('#announcement');
    box.textContent = message; box.classList.add('show');
    clearTimeout(announce.timer); announce.timer = setTimeout(() => box.classList.remove('show'), 4500);
}
function niceError(cause) {
    return cause?.code === 'permission-denied' ? 'No tens permís per fer aquesta acció o la teva assignació ha canviat.' : 'No s’ha pogut completar l’operació. Comprova que l’entorn de proves estigui en marxa i torna-ho a provar.';
}
function activityRows(items) {
    if (!items.length) return '<div class="empty"><h3>No hi ha activitats en aquesta selecció</h3><p>Canvia el filtre o crea la primera activitat si tens permisos.</p></div>';
    return `<div class="table-scroll"><table><thead><tr><th>Activitat</th><th>Àrea i programa</th><th>Estat</th>${canManageActivities(member) ? '<th><span class="sr-only">Accions</span></th>' : ''}</tr></thead><tbody>${items.map(activity => `<tr><td><strong>${esc(activity.name)}</strong></td><td>${esc(areaName(activity.areaId))}<small>${esc(programName(activity.programId))}</small></td><td><span class="badge ${activity.status === 'active' ? 'active' : 'paused'}">${activity.status === 'active' ? 'Activa' : 'En pausa'}</span></td>${canManageActivities(member) ? `<td><button class="text-button" data-edit="${esc(activity.id)}">Editar<span class="sr-only"> ${esc(activity.name)}</span></button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function overview() {
    return `<div class="page-heading"><div><p class="eyebrow">NEXESOCIAL</p><h1>El teu espai de treball</h1><p class="muted">Programes i activitats de les àrees que tens assignades.</p></div><a class="secondary" href="#programes">Veure programes ↗</a></div>
    <div class="stats"><a href="#programes"><span>Àrees accessibles</span><strong>${data.areas.length.toString().padStart(2, '0')}</strong><small>Segons la teva assignació</small></a><a href="#programes"><span>Programes</span><strong>${data.programs.length.toString().padStart(2, '0')}</strong><small>Dins les àrees accessibles</small></a><a href="#activitats"><span>Activitats actives</span><strong>${data.activities.filter(a => a.status === 'active').length.toString().padStart(2, '0')}</strong><small>Preparades per continuar treballant</small></a></div>
    <section class="panel"><div class="section-heading"><div><h2>Activitats de les teves àrees</h2><p class="muted">Les dades s’actualitzen quan es guarden els canvis.</p></div><a href="#activitats" class="text-button">Veure totes →</a></div>${activityRows(data.activities.slice(0, 5))}</section>
    <div class="scope-note"><span class="scope-icon">✓</span><div><strong>${esc(ROLE_LABELS[member.role])}</strong><p>${canManageActivities(member) ? 'Pots crear i editar activitats dins el teu àmbit.' : 'Tens accés de consulta. La modificació d’activitats correspon a coordinació i administració.'}</p></div></div>`;
}
function programs() {
    return `<div class="page-heading"><div><p class="eyebrow">ORGANITZACIÓ</p><h1>Àrees i programes</h1><p class="muted">L’estructura de l’entitat, amb les activitats de cada àrea.</p></div></div><div class="area-grid">${data.areas.map((area, index) => {
        const programs = data.programs.filter(p => p.areaId === area.id);
        const count = data.activities.filter(a => a.areaId === area.id).length;
        return `<article class="area-card"><div class="area-number">${String(index + 1).padStart(2, '0')}</div><h2>${esc(area.name)}</h2><ul>${programs.length ? programs.map(p => `<li>${esc(p.name)}</li>`).join('') : '<li class="muted">Activitats directament dins l’àrea</li>'}</ul><button class="area-link" data-area="${esc(area.id)}">${count} activitats <span>Consultar →</span></button></article>`;
    }).join('')}</div>`;
}
function activities() {
    const filtered = data.activities.filter(a => (!areaFilter || a.areaId === areaFilter) && a.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return `<div class="page-heading"><div><p class="eyebrow">GESTIÓ DIÀRIA</p><h1>Activitats</h1><p class="muted">Cada activitat pertany a una àrea i pot formar part d’un programa.</p></div>${canManageActivities(member) ? '<button class="primary" id="new-activity">+ Nova activitat</button>' : '<span class="badge">Accés de consulta</span>'}</div><section class="panel"><div class="filters"><div><label for="area-filter">Àrea</label><select id="area-filter"><option value="">Totes les meves àrees</option>${data.areas.map(a => `<option value="${esc(a.id)}" ${areaFilter === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div><div class="search"><label for="activity-search">Cerca una activitat</label><input type="search" id="activity-search" placeholder="Nom de l’activitat…" value="${esc(search)}"></div><span class="result-count" role="status">${filtered.length} activitats</span></div>${activityRows(filtered)}</section>`;
}
function render() {
    const focused = document.activeElement?.id;
    const caret = focused === 'activity-search' ? document.activeElement.selectionStart : null;
    if (!user) {
        root.innerHTML = `<main id="main" class="login-page"><section class="login-brand"><a class="brand" href="#inici"><img class="official-logo" src="./assets/branding/NexeSocial-logo.png" alt="NexeSocial · Aplicació de gestió interna" width="563" height="418"><small>2.0</small></a><div><p class="eyebrow">NEXESOCIAL</p><h1>Un espai comú.<br>Cada persona,<br>al centre.</h1><p>La nova base per organitzar programes i activitats de l’entitat.</p></div><span class="login-footer">NexeSocial · Aplicació de gestió interna</span></section><section class="login-options"><p class="test-label">ENTORN LOCAL · DADES FICTÍCIES</p><h2>Entra a l’espai de proves</h2><p class="muted">Tria un compte de prova. Cada compte té permisos diferents.</p><div class="profile-list">${testProfiles.map(profile => `<button class="profile-option" data-profile="${profile.key}" ${loginBusy ? 'disabled' : ''}><span class="avatar">${profile.initials}</span><span><strong>${profile.name}</strong><small>${profile.detail}</small></span><span>→</span></button>`).join('')}</div>${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}<div class="suite-branding" aria-label="Aplicacions NexeSocial"><img src="./assets/branding/nexeadmin.svg" alt="NexeAdmin" width="450" height="120"><img src="./assets/branding/NexePsy.svg" alt="NexePsy" width="220" height="65"><img src="./assets/branding/nexesing.svg" alt="NexeSing"><img src="./assets/branding/nexeauditsuit.svg" alt="NexeAudit"></div><p class="test-note">Només per validar la versió 2.0. Els canvis es guarden a l’emulador local mentre està en marxa. No hi introdueixis dades reals.</p></section></main>`;
        root.querySelectorAll('[data-profile]').forEach(button => button.addEventListener('click', async () => {
            loginBusy = true; error = ''; render();
            try { await login(`${button.dataset.profile}@demo.nexesocial.test`, 'NexeDemo-2026!'); }
            catch (cause) { error = niceError(cause); }
            finally { loginBusy = false; render(); }
        }));
        return;
    }
    const currentRoute = route();
    root.innerHTML = `<div class="workspace"><aside class="sidebar"><a class="brand" href="#inici"><img class="official-logo" src="./assets/branding/NexeSocial-logo.png" alt="NexeSocial · Aplicació de gestió interna" width="563" height="418"><small>2.0</small></a><p class="nav-label">ESPAI DE TREBALL</p><nav aria-label="Navegació principal">${[['inici', '◫', 'Inici'], ['programes', '▦', 'Àrees i programes'], ['activitats', '≡', 'Activitats']].map(([key, icon, label]) => `<a href="#${key}" ${currentRoute === key ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`).join('')}</nav><div class="sidebar-bottom"><strong>NexeSocial</strong><span>Gestió de l’entitat</span><div class="local-pill">● Entorn de proves</div></div></aside><div class="workspace-body"><header class="topbar"><span>NexeSocial <span class="muted">/ ${esc({ inici: 'Inici', programes: 'Programes', activitats: 'Activitats' }[currentRoute])}</span></span><div class="account"><span>${esc(ROLE_LABELS[member?.role] || 'Validant accés')}</span><button id="logout" class="text-button">Sortir</button></div></header><div class="environment-banner">Versió 2.0 en construcció · Dades fictícies · Entorn local independent</div><main id="main" tabindex="-1">${error ? `<section class="empty"><h1>No podem carregar l’espai</h1><p class="error" role="alert">${esc(error)}</p><button id="retry" class="secondary">Tornar-ho a provar</button></section>` : !member ? '<p class="loading" role="status">Comprovant el teu accés…</p>' : !isActiveMember(member) ? '<section class="empty"><h1>Accés no actiu</h1><p>La teva assignació no està activa o ha caducat. Contacta amb administració.</p></section>' : !data ? '<p class="loading" role="status">Carregant les teves àrees…</p>' : ({ inici: overview, programes: programs, activitats: activities }[currentRoute])()}</main></div></div>`;
    root.querySelector('#logout')?.addEventListener('click', () => logout().catch(cause => announce(niceError(cause))));
    root.querySelector('#retry')?.addEventListener('click', () => location.reload());
    root.querySelector('#new-activity')?.addEventListener('click', () => openActivity());
    root.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openActivity(button.dataset.edit)));
    root.querySelectorAll('[data-area]').forEach(button => button.addEventListener('click', () => { areaFilter = button.dataset.area; location.hash = 'activitats'; }));
    root.querySelector('#area-filter')?.addEventListener('change', event => { areaFilter = event.target.value; render(); });
    root.querySelector('#activity-search')?.addEventListener('input', event => { search = event.target.value; render(); });
    if (focused && document.getElementById(focused)) {
        document.getElementById(focused).focus();
        if (caret !== null) document.getElementById(focused).setSelectionRange(caret, caret);
    }
}
function populatePrograms(selected = '') {
    const areaId = form.elements.areaId.value;
    form.elements.programId.replaceChildren(new Option('Directament a l’àrea', ''));
    data.programs.filter(p => p.areaId === areaId).forEach(p => form.elements.programId.add(new Option(p.name, p.id)));
    form.elements.programId.value = selected;
}
function openActivity(id = '') {
    if (!isActiveMember(member) || !canManageActivities(member) || !data) return;
    const existing = data.activities.find(a => a.id === id);
    form.reset(); form.elements.id.value = existing?.id || '';
    document.querySelector('#activity-title').textContent = existing ? 'Editar activitat' : 'Nova activitat';
    form.elements.name.value = existing?.name || '';
    form.elements.areaId.replaceChildren(...data.areas.map(a => new Option(a.name, a.id)));
    form.elements.areaId.value = existing?.areaId || areaFilter || data.areas[0]?.id || '';
    form.elements.areaId.disabled = Boolean(existing);
    populatePrograms(existing?.programId || '');
    form.elements.status.value = existing?.status || 'active';
    document.querySelector('#form-error').textContent = '';
    dialog.showModal(); form.elements.name.focus();
}
form.elements.areaId.addEventListener('change', () => populatePrograms());
for (const id of ['close-dialog', 'cancel-dialog']) document.getElementById(id).addEventListener('click', () => { if (!saving) dialog.close(); });
dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    saving = true; const button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Guardant…';
    document.querySelector('#form-error').textContent = '';
    try {
        await saveActivity({ name: form.elements.name.value, areaId: form.elements.areaId.value, programId: form.elements.programId.value, status: form.elements.status.value }, form.elements.id.value);
        dialog.close(); announce('Activitat guardada correctament.');
    } catch (cause) { document.querySelector('#form-error').textContent = cause.code ? niceError(cause) : cause.message; }
    finally { saving = false; button.disabled = false; button.textContent = 'Guardar activitat'; }
});
watchAuth(nextUser => {
    generation++; const authGeneration = generation;
    stopMember(); stopData(); clearTimeout(expiry); dialog.close();
    user = nextUser; member = null; data = null; error = ''; areaFilter = ''; search = '';
    if (user) stopMember = watchMembership(user.uid, nextMember => {
        if (authGeneration !== generation) return;
        const currentScope = ++scopeGeneration;
        stopData(); clearTimeout(expiry); dialog.close(); member = nextMember; data = null;
        if (!member) error = 'No hi ha cap assignació per a aquest compte.';
        else if (isActiveMember(member)) {
            error = '';
            stopData = watchAreaData(member, nextData => {
                if (authGeneration === generation && currentScope === scopeGeneration && isActiveMember(member)) { data = nextData; error = ''; render(); }
            }, cause => {
                if (authGeneration === generation && currentScope === scopeGeneration) { scopeGeneration++; stopData(); data = null; error = niceError(cause); render(); }
            });
            const remaining = member.validUntil.toMillis() - Date.now();
            expiry = setTimeout(() => { stopData(); data = null; dialog.close(); render(); }, Math.min(remaining + 10, 2147483647));
        }
        render();
    }, cause => { if (authGeneration === generation) { scopeGeneration++; stopData(); error = niceError(cause); data = null; dialog.close(); render(); } });
    render();
});
window.addEventListener('hashchange', () => { render(); document.querySelector('#main')?.focus(); });
window.addEventListener('pagehide', () => { stopMember(); stopData(); clearTimeout(expiry); });

// Feature-detected navigation for agent-assisted use; all writes remain in the form.
if (document.modelContext?.registerTool) {
    Promise.resolve(document.modelContext.registerTool({ name: 'navigate_nexesocial', description: 'Open an existing workspace view. Does not create or change records.', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['inici', 'programes', 'activitats'] } }, required: ['view'], additionalProperties: false }, annotations: { readOnlyHint: true }, execute({ view }) { if (!['inici', 'programes', 'activitats'].includes(view)) throw new Error('Unknown view'); if (!user || !isActiveMember(member)) throw new Error('Sign in first'); location.hash = view; render(); return { view }; } })).catch(() => {});
}
