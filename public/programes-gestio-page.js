import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    onSnapshot,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const _rtUnsub = [];

const STORAGE_KEYS = {
    departments: 'nexesocial_departments',
    staff: 'nexesocial_staff',
    activities: 'nexesocial_activities',
    reports: 'nexesocial_followup_reports',
    requests: 'nexesocial_age_exception_requests'
};

const state = {
    currentUser: null,
    currentStaff: null,
    departments: [],
    staff: [],
    activities: [],
    groups: [],
    participants: [],
    reports: [],
    requests: [],
    access: {
        programsRead: false,
        programsEdit: false,
        directionApprovalsRead: false,
        directionApprovalsResolve: false
    },
    enrollmentActivityId: null,
    reportContext: { kind: 'group', activityId: '', groupId: '', period: 'Q1' }
};

function safeRead(key, fallback = []) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return Array.isArray(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

function safeWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value = '') {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value = '') {
    if (!value) return 'Sense data';
    try {
        return new Date(value).toLocaleDateString('ca-ES');
    } catch {
        return value;
    }
}

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function resolveCurrentUser() {
    const authUser = window.Auth?.getUser?.();
    if (authUser?.email) return authUser;

    const email = localStorage.getItem('userEmail');
    if (!email) return null;

    return {
        email,
        displayName: localStorage.getItem('userName') || email.split('@')[0],
        nombre: localStorage.getItem('userName') || email.split('@')[0],
        role: localStorage.getItem('userRole') || 'user',
        permisos: JSON.parse(localStorage.getItem('userPermissions') || '{}')
    };
}

function getDepartmentById(id) {
    return state.departments.find((item) => item.id === id);
}

function getActivityById(id) {
    return state.activities.find((item) => item.id === id);
}

function getGroupById(id) {
    return state.groups.find((item) => item.id === id);
}

function getParticipantById(id) {
    return state.participants.find((item) => item.id === id || item.dbId === id);
}

function areaClass(area = '') {
    const clean = normalizeText(area).toLowerCase();
    if (clean.includes('atencio')) return 'area-blue';
    if (clean.includes('suport')) return 'area-amber';
    if (clean.includes('qualitat')) return 'area-green';
    if (clean.includes('governanca') || clean.includes('direccio')) return 'area-pink';
    return 'area-blue';
}

function roleLabelNormalized() {
    return normalizeText(state.currentStaff?.roleLabel || state.currentUser?.role || '').toLowerCase();
}

function getMatrixPerms() {
    try {
        return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}');
    } catch {
        return {};
    }
}

function resolveAccessProfile() {
    const role = String(state.currentUser?.role || '').toLowerCase();
    const userRoles = (() => {
        try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); }
        catch { return []; }
    })();
    const perms = state.currentUser?.permisos || {};
    const matrixPerms = getMatrixPerms();

    const isAdmin = role === 'admin' || role === 'superadmin' || userRoles.includes('admin_sistema') || userRoles.includes('direccio');
    const programsRead = isAdmin || matrixPerms.programsRead === true || matrixPerms.programsEdit === true || perms.programs === 'read' || perms.programs === 'edit' || perms.programs === 'admin';
    const programsEdit = isAdmin || matrixPerms.programsEdit === true || perms.programs === 'edit' || perms.programs === 'admin';
    const directionApprovalsRead = isAdmin || matrixPerms.directionApprovalsRead === true || matrixPerms.directionApprovalsResolve === true;
    const directionApprovalsResolve = isAdmin || matrixPerms.directionApprovalsResolve === true;

    return {
        programsRead,
        programsEdit,
        directionApprovalsRead,
        directionApprovalsResolve
    };
}

function canEditPrograms() {
    return state.access.programsEdit === true;
}

function canReadPrograms() {
    return state.access.programsRead === true || canEditPrograms();
}

function canReadDirectionApprovals() {
    return state.access.directionApprovalsRead === true || state.access.directionApprovalsResolve === true;
}

function canResolveDirectionApprovals() {
    return state.access.directionApprovalsResolve === true;
}

function hasManagementAccess() {
    return canResolveDirectionApprovals();
}

function isRestrictedStaff() {
    if (canReadPrograms()) return false;
    if (hasManagementAccess()) return false;
    const staffRole = roleLabelNormalized();
    return staffRole.includes('tecnic') || staffRole.includes('educador') || staffRole.includes('monitor');
}

function getStaffDeptIds() {
    const cs = state.currentStaff;
    if (!cs) return [];
    return Array.isArray(cs.departmentIds) && cs.departmentIds.length ? cs.departmentIds : (cs.departmentId ? [cs.departmentId] : []);
}

function canSeeDepartment(department) {
    if (!isRestrictedStaff()) return true;
    return getStaffDeptIds().includes(department.id);
}

function matchesGroupDepartment(group, departmentId) {
    return [group.departmentId, group.departamentoId, group.departamento?.id].includes(departmentId);
}

function groupResponsibleMatches(group) {
    if (!state.currentStaff) return true;
    const currentIds = [state.currentStaff.id, state.currentStaff.firebaseUid, state.currentUser?.uid].filter(Boolean);
    const groupIds = [group.responsableId, group.responsibleId].filter(Boolean);
    if (groupIds.some((id) => currentIds.includes(id))) return true;

    const currentName = normalizeText(state.currentStaff.name || state.currentUser?.displayName || state.currentUser?.nombre || '');
    const groupName = normalizeText(group.responsableNombre || group.responsibleName || '');
    return !!currentName && currentName === groupName;
}

function canSeeGroup(group) {
    if (!isRestrictedStaff()) return true;
    if (!state.currentStaff) return false;
    const ids = getStaffDeptIds();
    return ids.some((id) => matchesGroupDepartment(group, id)) && groupResponsibleMatches(group);
}

function calcAgeFromDate(dateValue = '') {
    if (!dateValue) return 0;
    const birth = new Date(dateValue);
    if (Number.isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
}

function participantAge(participant) {
    return Number(participant.age || participant.edat || calcAgeFromDate(participant.birthDate || participant.dades_personals?.data_naixement || '')) || 0;
}

function participantName(participant) {
    return participant.name || `${participant.dades_personals?.nom || ''} ${participant.dades_personals?.cognoms || ''}`.trim() || participant.numero_expediente || 'Participant';
}

function showToast(message, tone = 'info') {
    const toast = document.getElementById('program-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `program-toast show ${tone}`;
    clearTimeout(window.__programToast);
    window.__programToast = setTimeout(() => {
        toast.className = 'program-toast';
    }, 2600);
}

let _groupsReady = false;
let _participantsReady = false;
let _participantsListening = false;
let _reportsListening = false;
let _requestsListening = false;

function loadGroups() {
    return new Promise((resolve) => {
        const unsub = onSnapshot(collection(db, 'grupos'), (snap) => {
            state.groups = snap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.estado !== 'Inactivo');
            if (!_groupsReady) { _groupsReady = true; resolve(); }
            else { renderDepartmentSummary(); renderBoard(); }
        }, (error) => {
            console.warn('No s\'han pogut carregar grups des de Firestore:', error);
            state.groups = [];
            if (!_groupsReady) { _groupsReady = true; resolve(); }
        });
        _rtUnsub.push(unsub);
    });
}

function loadParticipants() {
    return new Promise((resolve) => {
        const unsub = onSnapshot(collection(db, 'expedientes'), (snap) => {
            state.participants = snap.docs.map((item) => {
                const data = item.data() || {};
                return {
                    id: item.id,
                    dbId: item.id,
                    ...data,
                    name: `${data.dades_personals?.nom || ''} ${data.dades_personals?.cognoms || ''}`.trim(),
                    birthDate: data.dades_personals?.data_naixement || '',
                    age: calcAgeFromDate(data.dades_personals?.data_naixement || '')
                };
            });
            if (!_participantsReady) { _participantsReady = true; resolve(); }
            else { renderBoard(); }
        }, (error) => {
            console.warn('No s\'han pogut carregar expedients des de Firestore:', error);
            state.participants = [];
            if (!_participantsReady) { _participantsReady = true; resolve(); }
        });
        _rtUnsub.push(unsub);
    });
}

function ensureParticipantsRT() {
    if (_participantsListening) return Promise.resolve();
    _participantsListening = true;
    return loadParticipants();
}
async function hydrateActivitiesFromFirestore() {
    try {
        const snap = await getDocs(collection(db, 'actividades'));
        snap.forEach((item) => {
            const data = item.data() || {};
            if (state.activities.some((activity) => activity.id === item.id)) return;
            state.activities.push({
                id: data.id || item.id,
                departmentId: data.departamentoId || data.departamentoID || data.departamento || data.departmentId || '',
                name: data.nombre || data.name || item.id,
                code: data.codigo || data.code || normalizeText(data.nombre || item.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                ageMin: Number(data.edadMinima || data.ageMin || 0),
                ageMax: Number(data.edadMaxima || data.ageMax || 99),
                startDate: data.fechaInicio || data.startDate || '',
                endDate: data.fechaFin || data.endDate || '',
                temporalization: data.temporalizacion || data.temporalization || 'Trimestral',
                notes: data.descripcion || data.notes || '',
                linkedGroupIds: Array.isArray(data.linkedGroupIds) ? data.linkedGroupIds : [],
                participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
                status: data.estado || data.status || 'Activa'
            });
        });
    } catch (error) {
        console.warn('No s’han pogut hidratar activitats des de Firestore:', error);
    }
}

async function syncActivityToFirestore(activity) {
    try {
        await setDoc(doc(db, 'actividades', activity.id), {
            id: activity.id,
            codigo: activity.code,
            nombre: activity.name,
            departamentoId: activity.departmentId,
            edadMinima: Number(activity.ageMin),
            edadMaxima: Number(activity.ageMax),
            fechaInicio: activity.startDate,
            fechaFin: activity.endDate,
            temporalizacion: activity.temporalization,
            descripcion: activity.notes || '',
            linkedGroupIds: activity.linkedGroupIds || [],
            participantIds: activity.participantIds || [],
            estado: activity.status || 'Activa',
            fechaModificacion: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn('No s’ha pogut sincronitzar l’activitat a Firestore:', error);
    }
}

function renderVisibilityNote() {
    const box = document.getElementById('visibility-note');
    if (!box) return;

    if (!canReadPrograms()) {
        box.innerHTML = '<strong>Sense accés a programes:</strong> aquest perfil no té permisos de lectura per al mòdul.';
        return;
    }

    if (isRestrictedStaff() && state.currentStaff) {
        const deptNames = getStaffDeptIds().map((id) => getDepartmentById(id)?.name).filter(Boolean);
        const deptLabel = deptNames.length ? deptNames.join(', ') : 'el teu departament';
        box.innerHTML = `<strong>Vista restringida:</strong> només veus els grups que gestiones a ${escapeHtml(deptLabel)}.`;
    } else if (!canEditPrograms()) {
        box.innerHTML = '<strong>Només lectura:</strong> pots consultar programes i grups, però no fer canvis.';
    } else {
        box.innerHTML = '<strong>Vista global:</strong> pots coordinar departaments, activitats, grups, seguiments i assistències.';
    }
}

function renderDepartmentSummary() {
    const box = document.getElementById('departaments-entitat');
    if (!box) return;

    const visibleDepartments = state.departments.filter((item) => item.status !== 'Inactiu' && canSeeDepartment(item));

    if (!visibleDepartments.length) {
        box.innerHTML = '<strong>Departaments:</strong> no hi ha departaments visibles per al perfil actual.';
        return;
    }

    box.innerHTML = `<strong>Departaments actius:</strong><div style="margin-top:8px;">${visibleDepartments.map((item) => `<span style="display:inline-flex; align-items:center; background:white; border:1px solid #bfdbfe; color:#1d4ed8; padding:6px 10px; border-radius:999px; margin:6px 6px 0 0; font-size:0.82rem;">${escapeHtml(item.name)}</span>`).join('')}</div>`;
}

function renderRequestsPanel() {
    const wrap = document.getElementById('direction-approvals');
    const body = document.getElementById('direction-requests-body');
    if (!wrap || !body) return;

    const isDirection = canReadDirectionApprovals();
    const pending = state.requests.filter((item) => item.status === 'pending');

    wrap.style.display = isDirection ? 'block' : 'none';

    if (!isDirection) return;

    if (!pending.length) {
        body.innerHTML = '<div class="empty-inline">No hi ha sol·licituds pendents d’autorització.</div>';
        return;
    }

    body.innerHTML = pending.map((request) => {
        const activity = getActivityById(request.activityId);
        const department = getDepartmentById(activity?.departmentId || request.departmentId);
        const participant = getParticipantById(request.participantId);
        return `
            <div class="approval-row">
                <div>
                    <strong>${escapeHtml(participantName(participant || { name: request.participantName }))}</strong>
                    <div style="font-size:0.84rem; color:#64748b; margin-top:4px;">${escapeHtml(activity?.name || 'Activitat')} · ${escapeHtml(department?.name || 'Departament')} · edat ${escapeHtml(String(request.age || '-'))}</div>
                    <div style="font-size:0.8rem; color:#92400e; margin-top:4px;">Motiu: ${escapeHtml(request.reason || 'Sense motiu')}</div>
                </div>
                <div class="approval-actions">
                    ${canResolveDirectionApprovals()
                        ? `<button class="btn-mini btn-approve" onclick="window.resolveAgeRequest('${request.id}', true)">Autoritzar</button>
                    <button class="btn-mini btn-deny" onclick="window.resolveAgeRequest('${request.id}', false)">Denegar</button>`
                        : `<span class="mini-pill">Només lectura</span>`}
                </div>
            </div>
        `;
    }).join('');
}

function getActivityReports(activityId) {
    return state.reports.filter((item) => item.activityId === activityId);
}

function renderReportsPreview(activityId) {
    const entries = getActivityReports(activityId).slice(-3).reverse();
    if (!entries.length) {
        return '<div class="empty-inline">Sense informes registrats encara.</div>';
    }

    return `<div class="reports-preview">${entries.map((item) => `
        <div class="report-item-mini">
            <span class="mini-pill">${escapeHtml(item.kind === 'individual' ? 'Individual' : item.period)}</span>
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div style="font-size:0.78rem; color:#64748b;">${escapeHtml(formatDate(item.createdAt))}</div>
            </div>
        </div>
    `).join('')}</div>`;
}

function renderGroupLinks(activity) {
    const linked = state.groups.filter((group) => (activity.linkedGroupIds || []).includes(group.id) && canSeeGroup(group));
    if (!linked.length) {
        return '<div class="empty-inline">Sense grups vinculats en aquesta activitat.</div>';
    }

    const editable = canEditPrograms();

    return linked.map((group) => `
        <div class="linked-group-row">
            <div>
                <strong>${escapeHtml(group.nombre || group.idGrupo || 'Grup')}</strong>
                <div style="font-size:0.78rem; color:#64748b;">Responsable: ${escapeHtml(group.responsableNombre || group.responsibleName || 'Per assignar')}</div>
            </div>
            <div class="group-actions">
                ${editable
                    ? `<button class="btn-mini" onclick="window.goToAttendance('${group.id}')">Assistència</button>
                <button class="btn-mini" onclick="window.openReportModal('group', '${activity.id}', '${group.id}', 'Q1')">1T</button>
                <button class="btn-mini" onclick="window.openReportModal('group', '${activity.id}', '${group.id}', 'Q2')">2T</button>
                <button class="btn-mini" onclick="window.openReportModal('group', '${activity.id}', '${group.id}', 'Q3')">3T</button>
                <button class="btn-mini" onclick="window.openReportModal('group', '${activity.id}', '${group.id}', 'FINAL')">Final</button>
                <button class="btn-mini" onclick="window.openReportModal('individual', '${activity.id}', '${group.id}', 'TRIMESTRAL')">Individual</button>`
                    : `<span class="mini-pill">Només lectura</span>`}
            </div>
        </div>
    `).join('');
}

function renderBoard() {
    const board = document.getElementById('tauler-programes');
    if (!board) return;

    if (!canReadPrograms()) {
        board.innerHTML = '<div class="main-program-card"><div class="subprograms-container"><div class="empty-inline">No tens permisos per consultar programes.</div></div></div>';
        return;
    }

    const visibleDepartments = state.departments.filter((department) => department.status !== 'Inactiu' && canSeeDepartment(department));

    if (!visibleDepartments.length) {
        board.innerHTML = '<div class="main-program-card"><div class="subprograms-container"><div class="empty-inline">No hi ha programes visibles per al perfil actual.</div></div></div>';
        return;
    }

    board.innerHTML = visibleDepartments.map((department) => {
        const departmentActivities = state.activities.filter((activity) => activity.departmentId === department.id && activity.status !== 'Inactiva');
        const departmentGroups = state.groups.filter((group) => matchesGroupDepartment(group, department.id) && canSeeGroup(group));

        return `
            <div class="main-program-card">
                <div class="main-program-header ${areaClass(department.area)}">
                    <div>
                        <h2>${escapeHtml(department.name)}</h2>
                        <p>${escapeHtml(department.area || 'General')} · Responsable ${escapeHtml(department.manager || 'Per assignar')}</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span class="id-pill" style="color:white; background:rgba(0,0,0,0.2)">${escapeHtml(department.code || department.id)}</span>
                        ${canEditPrograms() ? `<button class="btn-manage ${areaClass(department.area)}" onclick="window.openActivityModal('${department.id}')">+ Activitat</button>` : ''}
                    </div>
                </div>
                <div class="department-stats">
                    <span>${departmentActivities.length} activitats</span>
                    <span>${departmentGroups.length} grups visibles</span>
                    <span>Revisió ${escapeHtml(department.frequency || 'Trimestral')}</span>
                </div>
                <div class="subprograms-container">
                    ${departmentActivities.length ? departmentActivities.map((activity) => `
                        <div class="sub-card activity-card-wide">
                            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                                <div>
                                    <span class="id-pill">${escapeHtml(activity.code || activity.id)}</span>
                                    <h3>${escapeHtml(activity.name)}</h3>
                                </div>
                                <span class="age-badge">${escapeHtml(String(activity.ageMin))}-${escapeHtml(String(activity.ageMax))} anys</span>
                            </div>
                            <div class="activity-meta">Temporalització: <strong>${escapeHtml(activity.temporalization || 'Trimestral')}</strong> · ${escapeHtml(formatDate(activity.startDate))} → ${escapeHtml(formatDate(activity.endDate))}</div>
                            <div class="activity-meta">${escapeHtml(activity.notes || 'Activitat sense observacions addicionals.')}</div>
                            <div class="action-cluster">
                                ${canEditPrograms() ? `<button class="btn-mini" onclick="window.openActivityModal('${activity.departmentId}', '${activity.id}')">Editar</button>` : ''}
                                <button class="btn-mini" onclick="window.openEnrollmentModal('${activity.id}')">Inscripcions</button>
                                <button class="btn-mini" onclick="window.openReportModal('group', '${activity.id}', '', 'Q1')">Seguiment grupal</button>
                                <button class="btn-mini" onclick="window.openReportModal('individual', '${activity.id}', '', 'TRIMESTRAL')">Seguiment individual</button>
                            </div>
                            <div class="section-caption">Grups vinculats i accions</div>
                            ${renderGroupLinks(activity)}
                            <div class="section-caption" style="margin-top:12px;">Últims informes</div>
                            ${renderReportsPreview(activity.id)}
                        </div>
                    `).join('') : `<div class="sub-card empty-activity"><strong>Sense activitats encara</strong><p style="color:#64748b; margin:0;">Crea la primera activitat d’aquest departament amb rang d’edat i temporalització obligatòria.</p></div>`}
                </div>
            </div>
        `;
    }).join('');
}

function renderGroupChecklist(departmentId, selectedIds = []) {
    const container = document.getElementById('activityGroupChecklist');
    if (!container) return;

    const groups = state.groups.filter((group) => matchesGroupDepartment(group, departmentId) && canSeeGroup(group));

    if (!groups.length) {
        container.innerHTML = '<div class="empty-inline">No hi ha grups disponibles en aquest departament.</div>';
        return;
    }

    container.innerHTML = groups.map((group) => `
        <label class="check-row">
            <input type="checkbox" value="${escapeHtml(group.id)}" ${selectedIds.includes(group.id) ? 'checked' : ''}>
            <span>${escapeHtml(group.nombre || group.idGrupo || group.id)}</span>
            <small>${escapeHtml(group.responsableNombre || group.responsibleName || 'Sense responsable')}</small>
        </label>
    `).join('');
}

function openModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function fillReportParticipantOptions(groupId = '', selectedId = '') {
    const select = document.getElementById('reportParticipant');
    if (!select) return;

    let options = [];
    if (groupId) {
        const group = getGroupById(groupId);
        const beneficiaryIds = Array.isArray(group?.beneficiarios) ? group.beneficiarios : [];
        options = beneficiaryIds.map((id) => getParticipantById(id)).filter(Boolean);
    }

    if (!options.length) {
        const activity = getActivityById(state.reportContext.activityId);
        const enrolled = Array.isArray(activity?.participantIds) ? activity.participantIds.map((id) => getParticipantById(id)).filter(Boolean) : [];
        options = enrolled;
    }

    if (!options.length) {
        options = state.participants;
    }

    if (!options.length) {
        ensureParticipantsRT().then(() => fillReportParticipantOptions(groupId, selectedId));
    }

    select.innerHTML = '<option value="">Selecciona participant...</option>' + options.map((participant) => `<option value="${escapeHtml(participant.id)}" ${participant.id === selectedId ? 'selected' : ''}>${escapeHtml(participantName(participant))}</option>`).join('');
}

function saveAllLocal() { /* data is persisted to Firestore */ }

function buildActivityCode(departmentId, name) {
    const department = getDepartmentById(departmentId);
    const left = normalizeText(department?.code || department?.name || 'ACT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const right = normalizeText(name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return `${left}-${right}`;
}

async function saveActivity(event) {
    event.preventDefault();

    if (!canEditPrograms()) {
        showToast('Aquest perfil és només de lectura', 'warning');
        return;
    }

    const id = document.getElementById('activityId').value || createId('activity');
    const departmentId = document.getElementById('activityDepartment').value;
    const name = document.getElementById('activityName').value.trim();
    const ageMin = Number(document.getElementById('activityAgeMin').value || 0);
    const ageMax = Number(document.getElementById('activityAgeMax').value || 0);
    const startDate = document.getElementById('activityStart').value;
    const endDate = document.getElementById('activityEnd').value;
    const temporalization = document.getElementById('activityTemporalization').value;
    const notes = document.getElementById('activityNotes').value.trim();
    const linkedGroupIds = Array.from(document.querySelectorAll('#activityGroupChecklist input[type="checkbox"]:checked')).map((item) => item.value);

    if (!departmentId || !name || !startDate || !endDate || !temporalization) {
        showToast('Completa tots els camps obligatoris', 'warning');
        return;
    }

    if (ageMax < ageMin) {
        showToast("El rang d'edat no és vàlid", 'warning');
        return;
    }

    const current = getActivityById(id);
    const payload = {
        id,
        departmentId,
        name,
        code: buildActivityCode(departmentId, name),
        ageMin,
        ageMax,
        startDate,
        endDate,
        temporalization,
        notes,
        linkedGroupIds,
        participantIds: current?.participantIds || [],
        status: 'Activa'
    };

    if (current) {
        Object.assign(current, payload);
    } else {
        state.activities.push(payload);
    }

    await syncActivityToFirestore(payload);
    closeModalById('activityModal');
    renderBoard();
    showToast('Activitat guardada correctament', 'success');
}

function openActivityModal(departmentId = '', activityId = '') {
    if (!canEditPrograms()) {
        showToast('Aquest perfil és només de lectura', 'warning');
        return;
    }

    const form = document.getElementById('activityForm');
    if (!form) return;

    const current = activityId ? getActivityById(activityId) : null;
    const targetDepartmentId = current?.departmentId || departmentId || state.departments.find((item) => canSeeDepartment(item))?.id || '';

    document.getElementById('activityModalTitle').textContent = current ? 'Editar activitat' : 'Nova activitat';
    document.getElementById('activityId').value = current?.id || '';
    document.getElementById('activityDepartment').innerHTML = state.departments.filter((item) => item.status !== 'Inactiu' && canSeeDepartment(item)).map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === targetDepartmentId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
    document.getElementById('activityName').value = current?.name || '';
    document.getElementById('activityAgeMin').value = current?.ageMin ?? 12;
    document.getElementById('activityAgeMax').value = current?.ageMax ?? 18;
    document.getElementById('activityStart').value = current?.startDate || '';
    document.getElementById('activityEnd').value = current?.endDate || '';
    document.getElementById('activityTemporalization').value = current?.temporalization || 'Trimestral';
    document.getElementById('activityNotes').value = current?.notes || '';
    renderGroupChecklist(targetDepartmentId, current?.linkedGroupIds || []);
    openModalById('activityModal');
}

async function openEnrollmentModal(activityId) {
    if (!canReadPrograms()) {
        showToast('No tens permisos de lectura per a programes', 'warning');
        return;
    }

    await ensureParticipantsRT();

    state.enrollmentActivityId = activityId;
    const activity = getActivityById(activityId);
    const box = document.getElementById('enrollmentList');
    const title = document.getElementById('enrollmentModalTitle');
    if (!activity || !box || !title) return;

    title.textContent = `Inscripcions · ${activity.name}`;

    if (!state.participants.length) {
        box.innerHTML = '<div class="empty-inline">No hi ha expedients disponibles per inscriure.</div>';
        openModalById('enrollmentModal');
        return;
    }

    box.innerHTML = state.participants.map((participant) => {
        const age = participantAge(participant);
        const inRange = age >= Number(activity.ageMin) && age <= Number(activity.ageMax);
        const enrolled = Array.isArray(activity.participantIds) && activity.participantIds.includes(participant.id);
        const pending = state.requests.some((item) => item.activityId === activity.id && item.participantId === participant.id && item.status === 'pending');

        let action = canEditPrograms()
            ? `<button class="btn-mini" onclick="window.enrollParticipant('${activity.id}', '${participant.id}')">Inscriure</button>`
            : '<span class="mini-pill">Només lectura</span>';
        if (enrolled) {
            action = '<span class="mini-pill ok">Inscrit</span>';
        } else if (!inRange && pending) {
            action = '<span class="mini-pill warn">Autorització pendent</span>';
        } else if (!inRange && canEditPrograms()) {
            action = `<button class="btn-mini btn-deny" onclick="window.requestDirectionApproval('${activity.id}', '${participant.id}')">Sol·licitar direcció</button>`;
        }

        return `
            <div class="enrollment-row">
                <div>
                    <strong>${escapeHtml(participantName(participant))}</strong>
                    <div style="font-size:0.8rem; color:${inRange ? '#64748b' : '#b45309'};">Edat: ${escapeHtml(String(age))} · rang requerit ${escapeHtml(String(activity.ageMin))}-${escapeHtml(String(activity.ageMax))}</div>
                </div>
                <div>${action}</div>
            </div>
        `;
    }).join('');

    openModalById('enrollmentModal');
}

function enrollParticipant(activityId, participantId) {
    if (!canEditPrograms()) {
        showToast('Aquest perfil és només de lectura', 'warning');
        return;
    }

    const activity = getActivityById(activityId);
    if (!activity) return;
    if (!Array.isArray(activity.participantIds)) activity.participantIds = [];
    if (!activity.participantIds.includes(participantId)) activity.participantIds.push(participantId);
    syncActivityToFirestore(activity);
    openEnrollmentModal(activityId);
    renderBoard();
    showToast("Participant inscrit a l'activitat", 'success');
}

function requestDirectionApproval(activityId, participantId) {
    if (!canEditPrograms()) {
        showToast('Aquest perfil és només de lectura', 'warning');
        return;
    }

    const activity = getActivityById(activityId);
    const participant = getParticipantById(participantId);
    if (!activity || !participant) return;

    if (canResolveDirectionApprovals()) {
        enrollParticipant(activityId, participantId);
        showToast('Inscripció autoritzada per direcció', 'success');
        return;
    }

    const reason = window.prompt('Indica el motiu de la sol·licitud per fora de rang:');
    if (!reason) return;

    ensureRequestsRT();

    addDoc(collection(db, 'age_exceptions'), {
        activityId,
        departmentId: activity.departmentId,
        participantId,
        participantName: participantName(participant),
        age: participantAge(participant),
        reason,
        status: 'pending',
        requestedBy: state.currentStaff?.name || state.currentUser?.displayName || state.currentUser?.email || 'Usuari'
    });

    renderRequestsPanel();
    openEnrollmentModal(activityId);
    showToast('Autorització enviada a direcció', 'warning');
}

function resolveAgeRequest(requestId, approved) {
    if (!canResolveDirectionApprovals()) {
        showToast('No tens permís per resoldre autoritzacions', 'warning');
        return;
    }

    const request = state.requests.find((item) => item.id === requestId);
    if (!request) return;

    ensureRequestsRT();

    updateDoc(doc(db, 'age_exceptions', requestId), {
        status: approved ? 'approved' : 'rejected',
        resolvedBy: state.currentStaff?.name || state.currentUser?.displayName || state.currentUser?.email || 'Direcció',
        resolvedAt: new Date().toISOString()
    });

    if (approved) {
        enrollParticipant(request.activityId, request.participantId);
    }

    renderRequestsPanel();
    showToast(approved ? 'Sol·licitud autoritzada' : 'Sol·licitud denegada', approved ? 'success' : 'warning');
}

function openReportModal(kind = 'group', activityId = '', groupId = '', period = 'Q1') {
    state.reportContext = { kind, activityId, groupId, period };

    const activity = getActivityById(activityId);
    const visibleGroups = state.groups.filter((group) => (activity?.linkedGroupIds || []).includes(group.id) && canSeeGroup(group));

    document.getElementById('reportModalTitle').textContent = kind === 'individual' ? 'Seguiment individual' : 'Seguiment grupal';
    document.getElementById('reportKind').value = kind;
    document.getElementById('reportActivity').innerHTML = state.activities.filter((item) => canSeeDepartment(getDepartmentById(item.departmentId) || {})).map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === activityId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
    document.getElementById('reportGroup').innerHTML = '<option value="">Selecciona grup...</option>' + visibleGroups.map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === groupId ? 'selected' : ''}>${escapeHtml(group.nombre || group.idGrupo || group.id)}</option>`).join('');
    document.getElementById('reportPeriod').value = period || 'Q1';
    document.getElementById('reportTitle').value = '';
    document.getElementById('reportSummary').value = '';
    document.getElementById('reportActions').value = '';
    document.getElementById('individualFields').style.display = kind === 'individual' ? 'block' : 'none';
    fillReportParticipantOptions(groupId);
    openModalById('reportModal');
}

function refreshReportGroupOptions() {
    const activityId = document.getElementById('reportActivity').value;
    const activity = getActivityById(activityId);
    const visibleGroups = state.groups.filter((group) => (activity?.linkedGroupIds || []).includes(group.id) && canSeeGroup(group));
    document.getElementById('reportGroup').innerHTML = '<option value="">Selecciona grup...</option>' + visibleGroups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.nombre || group.idGrupo || group.id)}</option>`).join('');
    fillReportParticipantOptions('');
}

function saveReport(event) {
    event.preventDefault();

    if (!canEditPrograms()) {
        showToast('Aquest perfil és només de lectura', 'warning');
        return;
    }

    const kind = document.getElementById('reportKind').value;
    const activityId = document.getElementById('reportActivity').value;
    const groupId = document.getElementById('reportGroup').value;
    const period = document.getElementById('reportPeriod').value;
    const title = document.getElementById('reportTitle').value.trim() || `${kind === 'individual' ? 'Informe individual' : 'Seguiment grupal'} ${period}`;
    const summary = document.getElementById('reportSummary').value.trim();
    const actions = document.getElementById('reportActions').value.trim();
    const participantId = document.getElementById('reportParticipant').value;

    if (!activityId || !summary) {
        showToast('Cal indicar activitat i resum', 'warning');
        return;
    }

    if (kind === 'individual' && !participantId) {
        showToast('Selecciona el participant del seguiment', 'warning');
        return;
    }

    addDoc(collection(db, 'seguiment_informes'), {
        kind,
        activityId,
        groupId,
        participantId,
        period,
        title,
        summary,
        actions,
        createdAt: new Date().toISOString(),
        createdBy: state.currentStaff?.name || state.currentUser?.displayName || state.currentUser?.email || 'Usuari'
    });

    closeModalById('reportModal');
    renderBoard();
    showToast('Informe de seguiment guardat', 'success');
}

function goToAttendance(groupId) {
    if (!groupId) return;
    window.location.href = `passar-llista.html?grupoId=${encodeURIComponent(groupId)}`;
}

function matchCurrentStaff() {
    return state.staff.find((item) => {
        const email = String(item.email || '').toLowerCase();
        const userEmail = String(state.currentUser?.email || '').toLowerCase();
        const itemName = normalizeText(item.name || '');
        const userName = normalizeText(state.currentUser?.displayName || state.currentUser?.nombre || '');
        return email && userEmail ? email === userEmail : itemName === userName;
    }) || null;
}

function loadDepartmentsRT() {
    return new Promise((resolve) => {
        let resolved = false;
        const unsub = onSnapshot(collection(db, 'departamentos'), (snap) => {
            state.departments = snap.docs.map(d => {
                const data = d.data() || {};
                return { id: d.id, ...data, name: data.nombre || data.name || d.id, area: data.descripcion || data.area || '', manager: data.responsable || data.manager || '', code: data.codigo || data.code || '', frequency: data.frecuencia || data.frequency || 'Trimestral', status: data.estado || data.status || 'Actiu' };
            });
            if (!resolved) { resolved = true; resolve(); }
            else { renderDepartmentSummary(); renderBoard(); }
        }, (error) => { console.warn('No s\'han pogut carregar departaments:', error); if (!resolved) { resolved = true; resolve(); } });
        _rtUnsub.push(unsub);
    });
}

function loadStaffRT() {
    return new Promise((resolve) => {
        let resolved = false;
        const unsub = onSnapshot(collection(db, 'empleados'), (snap) => {
            state.staff = snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().nombre || d.data().displayName || d.data().email || d.id })).filter(s => s.estado !== 'Baja' && s.estado !== 'Baixa');
            state.currentStaff = matchCurrentStaff();
            state.access = resolveAccessProfile();
            if (state.currentStaff && !Array.isArray(state.currentStaff.departmentIds)) {
                state.currentStaff.departmentIds = state.currentStaff.departmentId ? [state.currentStaff.departmentId] : [];
            }
            if (!resolved) { resolved = true; resolve(); }
            else { renderVisibilityNote(); renderBoard(); }
        }, (error) => { console.warn('No s\'han pogut carregar personal:', error); if (!resolved) { resolved = true; resolve(); } });
        _rtUnsub.push(unsub);
    });
}

function loadActivitiesRT() {
    return new Promise((resolve) => {
        let resolved = false;
        const unsub = onSnapshot(collection(db, 'actividades'), (snap) => {
            state.activities = snap.docs.map(item => {
                const data = item.data() || {};
                return { id: data.id || item.id, departmentId: data.departamentoId || data.departmentId || '', name: data.nombre || data.name || item.id, code: data.codigo || data.code || normalizeText(data.nombre || item.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), ageMin: Number(data.edadMinima || data.ageMin || 0), ageMax: Number(data.edadMaxima || data.ageMax || 99), startDate: data.fechaInicio || data.startDate || '', endDate: data.fechaFin || data.endDate || '', temporalization: data.temporalizacion || data.temporalization || 'Trimestral', notes: data.descripcion || data.notes || '', linkedGroupIds: Array.isArray(data.linkedGroupIds) ? data.linkedGroupIds : [], participantIds: Array.isArray(data.participantIds) ? data.participantIds : [], status: data.estado || data.status || 'Activa' };
            });
            if (!resolved) { resolved = true; resolve(); }
            else { renderBoard(); }
        }, (error) => { console.warn('No s\'han pogut carregar activitats:', error); if (!resolved) { resolved = true; resolve(); } });
        _rtUnsub.push(unsub);
    });
}

function loadReportsRT() {
    return new Promise((resolve) => {
        let resolved = false;
        const unsub = onSnapshot(collection(db, 'seguiment_informes'), (snap) => {
            state.reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!resolved) { resolved = true; resolve(); }
            else { renderBoard(); }
        }, (error) => { console.warn('No s\'han pogut carregar informes:', error); if (!resolved) { resolved = true; resolve(); } });
        _rtUnsub.push(unsub);
    });
}

function ensureReportsRT() {
    if (_reportsListening) return Promise.resolve();
    _reportsListening = true;
    return loadReportsRT();
}

function loadRequestsRT() {
    return new Promise((resolve) => {
        let resolved = false;
        const unsub = onSnapshot(collection(db, 'age_exceptions'), (snap) => {
            state.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!resolved) { resolved = true; resolve(); }
            else { renderRequestsPanel(); }
        }, (error) => { console.warn('No s\'han pogut carregar sol·licituds:', error); if (!resolved) { resolved = true; resolve(); } });
        _rtUnsub.push(unsub);
    });
}

function ensureRequestsRT() {
    if (_requestsListening) return Promise.resolve();
    _requestsListening = true;
    return loadRequestsRT();
}

function startDeferredListeners() {
    const run = async () => {
        try { await ensureReportsRT(); } catch {}
        if (canReadDirectionApprovals()) {
            try { await ensureRequestsRT(); } catch {}
        }
        try { await ensureParticipantsRT(); } catch {}
    };

    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => { run(); }, { timeout: 1600 });
    } else {
        setTimeout(run, 350);
    }
}

async function initialize() {
    state.currentUser = resolveCurrentUser();
    state.access = resolveAccessProfile();

    await Promise.all([loadDepartmentsRT(), loadStaffRT(), loadActivitiesRT(), loadGroups()]);

    renderVisibilityNote();
    renderDepartmentSummary();
    renderRequestsPanel();
    renderBoard();
    startDeferredListeners();

    const btnGlobal = document.getElementById('btnOpenActivityGlobal');
    if (btnGlobal) btnGlobal.style.display = canEditPrograms() ? 'inline-flex' : 'none';
    const btnHeader = document.getElementById('btnOpenActivityHeader');
    if (btnHeader) btnHeader.style.display = canEditPrograms() ? 'inline-flex' : 'none';

    document.getElementById('btnOpenActivityGlobal')?.addEventListener('click', () => openActivityModal(''));
    document.getElementById('btnReloadPrograms')?.addEventListener('click', () => {
        renderRequestsPanel();
        renderBoard();
        showToast('Tauler actualitzat', 'success');
    });

    document.getElementById('activityForm')?.addEventListener('submit', saveActivity);
    document.getElementById('reportForm')?.addEventListener('submit', saveReport);
    document.getElementById('activityDepartment')?.addEventListener('change', (event) => renderGroupChecklist(event.target.value, []));
    document.getElementById('reportActivity')?.addEventListener('change', refreshReportGroupOptions);
    document.getElementById('reportGroup')?.addEventListener('change', (event) => fillReportParticipantOptions(event.target.value));

    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.style.display = 'none';
        });
    });
}

window.openActivityModal = openActivityModal;
window.openEnrollmentModal = openEnrollmentModal;
window.enrollParticipant = enrollParticipant;
window.requestDirectionApproval = requestDirectionApproval;
window.resolveAgeRequest = resolveAgeRequest;
window.openReportModal = openReportModal;
window.goToAttendance = goToAttendance;
window.closeProgramsModal = closeModalById;

window.addEventListener('beforeunload', () => _rtUnsub.forEach(u => u()));

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
