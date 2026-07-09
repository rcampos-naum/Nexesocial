import { db, firebaseConfig } from "../firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

await window.checkModuleAccess('NexeAdmin');

const STORAGE_KEYS = {
    departments: 'nexesocial_departments',
    staff: 'nexesocial_staff'
};

const defaultDepartments = [];

const defaultStaff = [];

const DEFAULT_ROLE_PERMISSIONS = {
    admin:        { crearDepts: true, configSistema: true, verAudit: true, altaBaixaTreballadors: true, assignarCoordinadores: true, assignarReforcos: true, crearGrups: true, verAlumnesTots: true, verAlumnesGrup: true, diariAulaAssistencia: false, programsRead: true, programsEdit: true, directionApprovalsRead: true, directionApprovalsResolve: true, convenisRead: true, convenisEdit: true, convenisApprove: true },
    directora:    { crearDepts: false, configSistema: false, verAudit: true, altaBaixaTreballadors: true, assignarCoordinadores: true, assignarReforcos: true, crearGrups: true, verAlumnesTots: true, verAlumnesGrup: true, diariAulaAssistencia: false, programsRead: true, programsEdit: true, directionApprovalsRead: true, directionApprovalsResolve: true, convenisRead: true, convenisEdit: true, convenisApprove: true },
    coordinador:  { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: true, crearGrups: true, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: true, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: true, convenisEdit: false, convenisApprove: false },
    tecnic:       { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: false, crearGrups: false, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: false, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: false, convenisEdit: false, convenisApprove: false },
    voluntari:    { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: false, crearGrups: false, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: false, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: false, convenisEdit: false, convenisApprove: false }
};

let rolePermissionsMatrix = { ...DEFAULT_ROLE_PERMISSIONS };

let departments = [];
let staff = [];
let currentTab = 'departments';

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value = '') {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function looksLikeFirebaseUid(value = '') {
    const uid = String(value || '').trim();
    if (!uid) return false;
    if (uid.startsWith('staff-') || uid.startsWith('dept-') || uid.startsWith('user-')) return false;
    return /^[A-Za-z0-9]{20,}$/.test(uid);
}

function readStore(key, fallback = []) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        return Array.isArray(parsed) && parsed.length ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function getDepartmentById(id) {
    return departments.find((item) => item.id === id);
}

function formatPermissions(perms = {}) {
    const labels = [];
    if (perms.psy && perms.psy !== 'none') labels.push(`NexePsy ${perms.psy}`);
    if (perms.admin && perms.admin !== 'none') labels.push(`NexeAdmin ${perms.admin}`);
    if (perms.audit && perms.audit !== 'none') labels.push(`NexeAudit ${perms.audit}`);
    if (perms.programs && perms.programs !== 'none') labels.push(`Tots programes ${perms.programs}`);
    return labels.length ? labels.join(' · ') : 'Sense accés';
}

function formatLinkage(person = {}) {
    const parts = [];
    if (person.relationType) parts.push(person.relationType);
    if (person.socioLaboralStatus) parts.push(person.socioLaboralStatus);
    if (person.networkLinked) parts.push('Xarxa externa');
    return parts.length ? parts.join(' · ') : '-';
}

function countAssignedAreas() {
    return staff.reduce((sum, person) => {
        const perms = person.permissions || {};
        return sum + ['psy', 'admin', 'audit', 'programs'].filter((key) => perms[key] && perms[key] !== 'none').length;
    }, 0);
}

// Canonical role labels
const ROLE_LABELS = {
    admin:          'Admin',
    directora:      'Directora',
    coordinador:    'Coordinador/a',
    tecnic:         'Tècnic/a',
    voluntari:      'Voluntari/ària'
};

const ROLE_ORDER = ['admin', 'directora', 'coordinador', 'tecnic', 'voluntari'];

const ROLE_TO_LEGACY_ROLES = {
    admin: ['admin_sistema'],
    directora: ['direccio'],
    coordinador: ['coordinador'],
    tecnic: ['tecnic'],
    voluntari: ['voluntari']
};

function normalizeRoleKey(role = '') {
    return String(role || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');
}

function roleDisplayName(role = '') {
    if (ROLE_LABELS[role]) return ROLE_LABELS[role];
    return String(role || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toCanonicalRoles(roles = []) {
    const src = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    const mapped = src.map((r) => {
        const key = normalizeRoleKey(r);
        if (key === 'admin' || key === 'admin_sistema') return 'admin';
        if (key === 'directora' || key === 'direccio') return 'directora';
        if (key === 'coordinador') return 'coordinador';
        if (key === 'tecnic' || key === 'administracio' || key === 'manteniment') return 'tecnic';
        if (key === 'voluntari') return 'voluntari';
        return key || null;
    }).filter(Boolean);
    return Array.from(new Set(mapped));
}

function toLegacyRoles(canonicalRoles = []) {
    const values = Array.isArray(canonicalRoles) ? canonicalRoles : [];
    const legacy = values.flatMap((role) => ROLE_TO_LEGACY_ROLES[role] || []);
    return Array.from(new Set(legacy));
}

function mergeRolePermissions(canonicalRoles = []) {
    const merged = {};
    const roles = Array.isArray(canonicalRoles) ? canonicalRoles : [];
    roles.forEach((role) => {
        const source = rolePermissionsMatrix[role] || DEFAULT_ROLE_PERMISSIONS[role] || {};
        Object.keys(source).forEach((permKey) => {
            merged[permKey] = !!merged[permKey] || source[permKey] === true;
        });
    });
    return merged;
}

async function loadRolePermissionsMatrix() {
    try {
        const snap = await getDoc(doc(db, 'config', 'rolePermissions'));
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const allRoleKeys = Array.from(new Set([
            ...Object.keys(DEFAULT_ROLE_PERMISSIONS),
            ...Object.keys(data)
        ]));
        const next = {};
        allRoleKeys.forEach((roleKey) => {
            next[roleKey] = Object.assign({}, DEFAULT_ROLE_PERMISSIONS[roleKey] || {}, data[roleKey] || {});
        });
        rolePermissionsMatrix = next;
        renderStaffRoleOptions();
    } catch (error) {
        console.warn("No s'ha pogut carregar la matriu de permisos de rols:", error);
        renderStaffRoleOptions();
    }
}

function getAvailableCanonicalRoles() {
    const keys = Object.keys(rolePermissionsMatrix || {});
    if (!keys.length) return [...ROLE_ORDER];
    const normalizedKeys = Array.from(new Set(keys.map((k) => normalizeRoleKey(k)).filter(Boolean)));
    const ordered = ROLE_ORDER.filter((k) => normalizedKeys.includes(k));
    const custom = normalizedKeys.filter((k) => !ROLE_ORDER.includes(k));
    return [...ordered, ...custom];
}

function renderStaffRoleOptions() {
    const box = document.getElementById('staffRolesBox');
    if (!box) return;
    const roles = getAvailableCanonicalRoles();
    box.innerHTML = roles.map((roleId) => `
        <label class="dept-checkbox-label"><input type="checkbox" name="roleCheck" value="${roleId}"> ${roleDisplayName(roleId)}</label>
    `).join('');
}

function deriveSystemRole(roles = [], perms = {}) {
    const arr = toCanonicalRoles(roles);
    // Only true system roles grant 'admin' — NexeAdmin permissions do NOT
    if (arr.includes('admin')) return 'admin';
    if (arr.includes('directora')) return 'admin';
    if (arr.includes('coordinador')) return 'coordinador';
    if (arr.includes('tecnic')) return 'tecnic';
    if (perms.audit && perms.audit !== 'none') return 'auditor';
    if (perms.psy && perms.psy !== 'none') return 'psicolog';
    if (arr.includes('voluntari')) return 'voluntari';
    return 'user';
}

function toFirestoreStatus(status = 'Actiu') {
    if (status === 'Actiu') return 'Activo';
    if (status === 'Baixa') return 'Baja';
    if (status === 'Vacances') return 'Vacaciones';
    return 'Activo';
}

function syncLocalBridges() {
    localStorage.setItem(STORAGE_KEYS.departments, JSON.stringify(departments));
    localStorage.setItem(STORAGE_KEYS.staff, JSON.stringify(staff));

    const auditDepartments = departments
        .filter((item) => item.status !== 'Inactiu')
        .map((item) => ({
            name: normalizeText(item.name).toUpperCase(),
            owner: item.manager || 'Per assignar',
            frequency: item.frequency || 'Trimestral',
            status: item.status || 'Actiu'
        }));

    localStorage.setItem('nexeaudit_departments', JSON.stringify(auditDepartments));
    window.dispatchEvent(new CustomEvent('nexe-entity-registry-updated'));
}

async function syncDepartmentToFirestore(dept) {
    try {
        await setDoc(doc(db, 'departamentos', dept.id), {
            id: dept.id,
            codigo: dept.code,
            nombre: dept.name,
            descripcion: dept.description || '',
            area: dept.area || 'General',
            responsable: dept.manager || '',
            responsableIds: dept.managerIds || [],
            frecuencia: dept.frequency || 'Trimestral',
            estado: dept.status === 'Inactiu' ? 'Inactivo' : 'Activo',
            fechaModificacion: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn("No s'ha pogut sincronitzar el departament a Firestore:", error);
    }
}

async function syncStaffToFirestore(person, password = '') {
    const perms = person.permissions || { psy: 'none', admin: 'none', audit: 'none', programs: 'none' };
    const canonicalRoles = toCanonicalRoles(person.matrixRoles || person.roles || []);
    const legacyRoles = toLegacyRoles(canonicalRoles);
    const matrixPerms = mergeRolePermissions(canonicalRoles);
    let firebaseUid = looksLikeFirebaseUid(person.firebaseUid) ? person.firebaseUid : '';
    const previousUid = person.firebaseUid || '';
    let authAccessReady = !!firebaseUid;

    if (person.accessEnabled && person.email && !firebaseUid && password) {
        let secondaryApp = null;
        try {
            const tempAppName = `NexeAdminSecondary-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, tempAppName);
            const secondaryAuth = getAuth(secondaryApp);
            const created = await createUserWithEmailAndPassword(secondaryAuth, person.email, password);
            firebaseUid = created.user.uid;
            authAccessReady = true;
            await signOut(secondaryAuth);
            person.firebaseUid = firebaseUid;
        } catch (error) {
            console.warn("No s'ha pogut crear l'accés d'autenticació:", error);
            authAccessReady = false;

            if (error?.code === 'auth/email-already-in-use') {
                try {
                    await sendPasswordResetEmail(getAuth(), person.email);
                    showToast('Email ja existent', 'Aquest email ja té compte. S\'ha enviat correu per restablir contrasenya.', 'warning');
                } catch {
                    showToast('Email ja existent', 'Aquest email ja té compte. Fes servir "He oblidat la contrasenya" al login.', 'warning');
                }
            } else {
                showToast('Accés parcial', "S'ha guardat la fitxa, però el compte d'accés no s'ha creat a Firebase.", 'warning');
            }
        } finally {
            if (secondaryApp) {
                try { await deleteApp(secondaryApp); } catch {}
            }
        }
    }

    if (person.accessEnabled && person.email && firebaseUid && password) {
        try {
            await sendPasswordResetEmail(getAuth(), person.email);
            showToast('Canvi de contrasenya', 'Per seguretat s\'ha enviat correu de restabliment a aquest usuari.', 'warning');
        } catch (error) {
            console.warn('No s\'ha pogut enviar el correu de restabliment:', error);
            showToast('Canvi de contrasenya', 'No s\'ha pogut enviar el correu de restabliment.', 'warning');
        }
    }

    try {
        await setDoc(doc(db, 'empleados', person.id), {
            nombre: person.name,
            email: person.email,
            telefono: person.phone,
            departamentoId: person.departmentId || (person.departmentIds?.[0] || ''),
            departamentoIds: person.departmentIds || (person.departmentId ? [person.departmentId] : []),
            departamentoNombre: getDepartmentById(person.departmentId || person.departmentIds?.[0])?.name || '',
            tipoRelacion: person.relationType,
            situacionSocioLaboral: person.socioLaboralStatus || '',
            vinculadoXarxa: !!person.networkLinked,
            comentariosInternos: person.comments || '',
            roles: legacyRoles,
            matrixRoles: canonicalRoles,
            rol: person.roleLabel,
            signatureRole: person.roleLabel,
            proyecto: getDepartmentById(person.departmentId || person.departmentIds?.[0])?.name || '',
            estado: toFirestoreStatus(person.status),
            jornada: 37.5,
            documentacionOk: true,
            firebaseUid: firebaseUid || '',
            accessEnabled: !!person.accessEnabled,
            fechaModificacion: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn("No s'ha pogut sincronitzar l'empleat a Firestore:", error);
    }

    if (person.accessEnabled && person.email && authAccessReady) {
            const uid = firebaseUid || person.id;
            const deptIds = person.departmentIds || (person.departmentId ? [person.departmentId] : []);
            try {
                await setDoc(doc(db, 'usuarios', uid), {
                    nombre: person.name,
                    email: person.email,
                    departamentoId: deptIds[0] || '',
                    departamentoIds: deptIds,
                    scope: deptIds,
                    departamento: getDepartmentById(deptIds[0])?.name || '',
                    telefono: person.phone,
                    relationType: person.relationType || '',
                    socioLaboralStatus: person.socioLaboralStatus || '',
                    networkLinked: !!person.networkLinked,
                    comments: person.comments || '',
                    roles: legacyRoles,
                    matrixRoles: canonicalRoles,
                    role: deriveSystemRole(canonicalRoles, perms),
                    roleLabel: person.roleLabel,
                    signatureRole: person.roleLabel,
                    rol: 'personal',
                    permisos: perms,
                    matrixPerms,
                    ultimaModificacion: serverTimestamp()
                }, { merge: true });

                const shouldCleanupOldUid = previousUid && previousUid !== uid && !looksLikeFirebaseUid(previousUid);
                if (shouldCleanupOldUid) {
                    try {
                        await setDoc(doc(db, 'usuarios', previousUid), {
                            accessEnabled: false,
                            migradoAUid: uid,
                            ultimaModificacion: serverTimestamp()
                        }, { merge: true });
                    } catch (error) {
                        console.warn("No s'ha pogut marcar el registre antic d'usuari:", error);
                    }
                }
            } catch (error) {
                console.warn("No s'ha pogut sincronitzar l'usuari a Firestore:", error);
            }
    } else if (person.accessEnabled && person.email && !authAccessReady) {
            showToast('Accés no completat', 'Compte d\'autenticació no creat. Revisa l\'email i contrasenya (mínim 6 caràcters).', 'warning');
    }
}

async function hydrateFromFirestore() {
    try {
        const depSnap = await getDocs(collection(db, 'departamentos'));
        depSnap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            if (!departments.some((item) => item.id === docSnap.id)) {
                departments.push({
                    id: data.id || docSnap.id,
                    code: data.codigo || normalizeText(data.nombre || docSnap.id).slice(0, 6).toUpperCase(),
                    name: data.nombre || docSnap.id,
                    area: data.area || 'General',
                    manager: data.responsable || '',
                    managerIds: data.responsableIds || [],
                    frequency: data.frecuencia || 'Trimestral',
                    status: data.estado === 'Inactivo' ? 'Inactiu' : 'Actiu',
                    description: data.descripcion || ''
                });
            }
        });
    } catch (error) {
        console.warn("No s'han pogut carregar departaments de Firestore:", error);
    }

    try {
        const userSnap = await getDocs(collection(db, 'usuarios'));
        userSnap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            if (!data.email) return;
            const existing = staff.find((item) => item.email === data.email || item.firebaseUid === docSnap.id);
            const rawIds = data.departamentoIds || (data.departamentoId ? [data.departamentoId] : null) || (existing?.departmentIds || (existing?.departmentId ? [existing.departmentId] : []));
            const normalizedIds = rawIds.length ? rawIds : (departments[0]?.id ? [departments[0].id] : []);
            const payload = {
                id: existing?.id || createId('staff'),
                firebaseUid: docSnap.id,
                name: data.nombre || data.email,
                email: data.email || '',
                phone: data.telefono || '',
                departmentIds: normalizedIds,
                departmentId: normalizedIds[0] || '',
                matrixRoles: toCanonicalRoles(data.matrixRoles || data.roles || existing?.matrixRoles || existing?.roles || []),
                roles: data.roles || existing?.roles || [],
                roleLabel: data.signatureRole || data.roleLabel || data.rol || existing?.roleLabel || 'Tècnic/a',
                relationType: existing?.relationType || 'Laboral',
                socioLaboralStatus: data.socioLaboralStatus || existing?.socioLaboralStatus || '',
                networkLinked: data.networkLinked ?? existing?.networkLinked ?? false,
                comments: data.comments || existing?.comments || '',
                status: existing?.status || 'Actiu',
                accessEnabled: true,
                permissions: data.permisos || existing?.permissions || { psy: 'none', admin: 'none', audit: 'none' }
            };
            if (existing) Object.assign(existing, payload);
            else staff.push(payload);
        });
    } catch (error) {
        console.warn("No s'ha pogut carregar personal de Firestore:", error);
    }
}

function updateDepartmentManagerOptions(selectedIds = []) {
    const box = document.getElementById('deptManagerCheckboxes');
    if (!box) return;
    const active = staff.filter((s) => s.status !== 'Baixa');
    if (!active.length) {
        box.innerHTML = '<span style="color:#94a3b8;font-size:0.85rem;">No hi ha personal actiu. Afegeix primer membres de l\'equip.</span>';
        return;
    }
    box.innerHTML = active.map((s) => `
        <label class="dept-checkbox-label">
            <input type="checkbox" name="deptMgrCheck" value="${escapeHtml(s.id)}" ${selectedIds.includes(s.id) ? 'checked' : ''}>
            ${escapeHtml(s.name)}
        </label>
    `).join('');
}
function getSelectedManagerIds() {
    return Array.from(document.querySelectorAll('#deptManagerCheckboxes input[name="deptMgrCheck"]:checked')).map((el) => el.value);
}

function updateDepartmentOptions(selectedIds = []) {
    const box = document.getElementById('staffDepartmentCheckboxes');
    if (!box) return;
    const active = departments.filter((d) => d.status !== 'Inactiu');
    if (!active.length) {
        box.innerHTML = '<span style="color:#94a3b8;font-size:0.85rem;">No hi ha departaments actius</span>';
        return;
    }
    box.innerHTML = active.map((d) => `
        <label class="dept-checkbox-label">
            <input type="checkbox" name="deptCheck" value="${escapeHtml(d.id)}" ${selectedIds.includes(d.id) ? 'checked' : ''}>
            ${escapeHtml(d.name)}
        </label>
    `).join('');
}

function getSelectedDepartmentIds() {
    return Array.from(document.querySelectorAll('#staffDepartmentCheckboxes input[name="deptCheck"]:checked')).map((el) => el.value);
}

function getSelectedRoles() {
    const allowed = new Set(getAvailableCanonicalRoles());
    return Array.from(document.querySelectorAll('#staffRolesBox input[name="roleCheck"]:checked'))
        .map((el) => el.value)
        .filter((role) => allowed.has(role));
}
function setSelectedRoles(roles = []) {
    const allowed = new Set(getAvailableCanonicalRoles());
    document.querySelectorAll('#staffRolesBox input[name="roleCheck"]').forEach((cb) => {
        cb.checked = allowed.has(cb.value) && roles.includes(cb.value);
    });
}

function renderSummary() {
    document.getElementById('summaryDepartments').textContent = departments.filter((item) => item.status !== 'Inactiu').length;
    document.getElementById('summaryStaff').textContent = staff.filter((item) => item.status === 'Actiu').length;
    document.getElementById('summaryAccess').textContent = staff.filter((item) => item.accessEnabled).length;
    document.getElementById('summaryAreas').textContent = countAssignedAreas();
}

function renderDepartments() {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;

    const rows = departments.map((item) => {
        const mgrNames = Array.isArray(item.managerIds)
            ? item.managerIds.map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean)
            : (item.manager ? [item.manager] : []);
        const mgrHtml = mgrNames.length
            ? mgrNames.map((n) => `<span style="background:#ede9fe;color:#6d28d9;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:700;margin:1px;display:inline-block;">${escapeHtml(n)}</span>`).join('')
            : '<span style="color:#94a3b8;">Per assignar</span>';
        return `
        <tr>
            <td><strong>${escapeHtml(item.name)}</strong><br><small style="color:#64748b;">${escapeHtml(item.code)}</small></td>
            <td>${escapeHtml(item.area || '-')}</td>
            <td>${mgrHtml}</td>
            <td>${escapeHtml(item.frequency || 'Trimestral')}</td>
            <td><span class="state-pill ${item.status === 'Actiu' ? 'ok' : 'warn'}">${escapeHtml(item.status)}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-link" onclick="window.editDepartment('${item.id}')">Editar</button>
                    <button class="btn-link danger" onclick="window.removeDepartment('${item.id}')">Arxivar</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    tbody.innerHTML = rows || '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:20px;">Sense departaments</td></tr>';
}

function renderStaff() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const rows = staff.map((person) => {
        const ids = Array.isArray(person.departmentIds) && person.departmentIds.length ? person.departmentIds : [person.departmentId].filter(Boolean);
        const deptNames = ids.map((id) => getDepartmentById(id)?.name).filter(Boolean);
        const deptHtml = deptNames.length
            ? deptNames.map((n) => `<span style="background:#dbeafe;color:#1d4ed8;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:700;margin:2px 2px 0 0;display:inline-block;">${escapeHtml(n)}</span>`).join('')
            : '<span style="color:#94a3b8;">-</span>';
        const personRoles = person.roleLabel
            ? [person.roleLabel]
            : (Array.isArray(person.roles) && person.roles.length ? person.roles : []);
        const rolesHtml = personRoles.length
            ? personRoles.map((r) => `<span style="background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:999px;font-size:0.72rem;font-weight:700;margin:2px 2px 0 0;display:inline-block;">${escapeHtml(roleDisplayName(r))}</span>`).join('')
            : '<span style="color:#94a3b8;">-</span>';
        return `
            <tr>
                <td><strong>${escapeHtml(person.name)}</strong><br><small style="color:#64748b;">${escapeHtml(person.email || 'Sense email')}</small></td>
                <td>${deptHtml}</td>
                <td>${rolesHtml}</td>
                <td>${escapeHtml(person.phone || '-')}</td>
                <td><span class="state-pill ${person.accessEnabled ? 'ok' : 'neutral'}">${person.accessEnabled ? 'Sí' : 'No'}</span></td>
                <td>${escapeHtml(formatPermissions(person.permissions))}</td>
                <td>${escapeHtml(formatLinkage(person))}</td>
                <td><span class="state-pill ${person.status === 'Actiu' ? 'ok' : 'warn'}">${escapeHtml(person.status)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-link" onclick="window.editStaff('${person.id}')">Editar</button>
                        <button class="btn-link danger" onclick="window.removeStaff('${person.id}')">Baixa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows || '<tr><td colspan="9" style="text-align:center; color:#64748b; padding:20px;">Sense personal registrat</td></tr>';
}

function renderAll() {
    renderSummary();
    updateDepartmentOptions();
    renderDepartments();
    renderStaff();
}

function showToast(title, message, tone = 'success') {
    const toast = document.getElementById('admin-toast');
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong><div style="font-size:0.85rem; margin-top:4px;">${escapeHtml(message)}</div>`;
    toast.className = `admin-toast show ${tone}`;
    clearTimeout(window.__adminToastTimer);
    window.__adminToastTimer = setTimeout(() => {
        toast.className = 'admin-toast';
    }, 2600);
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.tab === tab));
}

function openDepartmentModal(id = '') {
    const current = departments.find((item) => item.id === id);
    document.getElementById('deptModalTitle').textContent = current ? 'Editar departament' : 'Nou departament';
    document.getElementById('deptId').value = current?.id || '';
    document.getElementById('deptName').value = current?.name || '';
    document.getElementById('deptCode').value = current?.code || '';
    document.getElementById('deptArea').value = current?.area || 'Suport';
    document.getElementById('deptFrequency').value = current?.frequency || 'Trimestral';
    document.getElementById('deptStatus').value = current?.status || 'Actiu';
    document.getElementById('deptDescription').value = current?.description || '';
    // Populate manager multi-select from staff
    const selMgrIds = Array.isArray(current?.managerIds) ? current.managerIds : (current?.manager ? [] : []);
    updateDepartmentManagerOptions(selMgrIds);
    document.getElementById('departmentModal').style.cssText = 'display:flex; align-items:center; justify-content:center;';
}

function openStaffModal(id = '') {
    const current = staff.find((item) => item.id === id);
    const selectedIds = Array.isArray(current?.departmentIds) && current.departmentIds.length
        ? current.departmentIds
        : (current?.departmentId ? [current.departmentId] : []);
    document.getElementById('staffModalTitle').textContent = current ? 'Editar personal i accés' : 'Nou membre i accés';
    document.getElementById('staffId').value = current?.id || '';
    document.getElementById('staffName').value = current?.name || '';
    document.getElementById('staffEmail').value = current?.email || '';
    document.getElementById('staffPassword').value = '';
    document.getElementById('staffPhone').value = current?.phone || '';
    updateDepartmentOptions(selectedIds);
    renderStaffRoleOptions();
    // Set roles — support both old single roleLabel and new roles array
    const savedRoles = Array.isArray(current?.matrixRoles) && current.matrixRoles.length
        ? current.matrixRoles
        : toCanonicalRoles(current?.roles || []);
    setSelectedRoles(savedRoles);
    document.getElementById('staffRoleLabel').value = current?.roleLabel || savedRoles.map((r) => roleDisplayName(r)).join(', ');
    document.getElementById('staffRelation').value = current?.relationType || 'Laboral';
    document.getElementById('staffSocioLaboral').value = current?.socioLaboralStatus || 'Actiu';
    document.getElementById('staffStatus').value = current?.status || 'Actiu';
    document.getElementById('staffNetworkLinked').checked = !!current?.networkLinked;
    document.getElementById('staffComments').value = current?.comments || '';
    document.getElementById('staffAccess').checked = !!current?.accessEnabled;
    document.getElementById('permPsy').value = current?.permissions?.psy || 'none';
    document.getElementById('permAdmin').value = current?.permissions?.admin || 'none';
    document.getElementById('permAudit').value = current?.permissions?.audit || 'none';
    document.getElementById('permPrograms').value = current?.permissions?.programs || 'none';
    document.getElementById('staffModal').style.cssText = 'display:flex; align-items:center; justify-content:center;';
}

function legacyRoleToId(label = '') {
    const map = { 'Admin':'admin', 'Directora':'directora', 'Direcció':'directora', 'Coordinació':'coordinador', 'Tècnic/a':'tecnic', 'Educador':'tecnic', 'Voluntariat':'voluntari' };
    return map[label] || 'tecnic';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.cssText = 'display:none;';
}

async function saveDepartment(event) {
    event.preventDefault();

    const id = document.getElementById('deptId').value || createId('dept');
    const name = document.getElementById('deptName').value.trim();
    const code = normalizeText(document.getElementById('deptCode').value || name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const managerIds = getSelectedManagerIds();
    const managerNames = managerIds.map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean);
    const dept = {
        id,
        name,
        code,
        area: document.getElementById('deptArea').value,
        managerIds,
        manager: managerNames.join(', '),
        frequency: document.getElementById('deptFrequency').value,
        status: document.getElementById('deptStatus').value,
        description: document.getElementById('deptDescription').value.trim()
    };

    const index = departments.findIndex((item) => item.id === id);
    if (index >= 0) departments[index] = dept;
    else departments.push(dept);

    syncLocalBridges();
    await syncDepartmentToFirestore(dept);
    renderAll();
    closeModal('departmentModal');
    showToast('Departament guardat', "Els canvis ja estan disponibles per a la resta de l'aplicació.");
}

async function saveStaff(event) {
    event.preventDefault();

    const id = document.getElementById('staffId').value || createId('staff');
    const departmentIds = getSelectedDepartmentIds();
    const matrixRoles = toCanonicalRoles(getSelectedRoles());
    const roles = toLegacyRoles(matrixRoles);
    const defaultRoleLabel = matrixRoles.map((r) => roleDisplayName(r)).join(', ') || 'Tècnic/a';
    const customRoleLabel = document.getElementById('staffRoleLabel').value.trim();
    const roleLabel = customRoleLabel || defaultRoleLabel;
    const record = {
        id,
        firebaseUid: staff.find((item) => item.id === id)?.firebaseUid || '',
        name: document.getElementById('staffName').value.trim(),
        email: document.getElementById('staffEmail').value.trim(),
        phone: document.getElementById('staffPhone').value.trim(),
        departmentIds,
        departmentId: departmentIds[0] || '',
        matrixRoles,
        roles,
        roleLabel,
        relationType: document.getElementById('staffRelation').value,
        socioLaboralStatus: document.getElementById('staffSocioLaboral').value,
        status: document.getElementById('staffStatus').value,
        networkLinked: document.getElementById('staffNetworkLinked').checked,
        comments: document.getElementById('staffComments').value.trim(),
        accessEnabled: document.getElementById('staffAccess').checked,
        permissions: {
            psy: document.getElementById('permPsy').value,
            admin: document.getElementById('permAdmin').value,
            audit: document.getElementById('permAudit').value,
            programs: document.getElementById('permPrograms').value
        }
    };

    if (!record.name) {
        return showToast('Falten dades', 'Cal indicar el nom del membre.', 'warning');
    }

    if (record.accessEnabled && !record.email) {
        return showToast('Falten dades', "Per crear accés a l'aplicació cal indicar un email.", 'warning');
    }

    const password = document.getElementById('staffPassword').value.trim();
    const needsAuthCreation = record.accessEnabled && !looksLikeFirebaseUid(record.firebaseUid);
    if (needsAuthCreation && !password) {
        return showToast('Falten dades', 'Per crear usuari a Authentication cal indicar una contrasenya inicial.', 'warning');
    }

    if (record.accessEnabled && password && password.length < 6) {
        return showToast('Contrasenya invàlida', 'La contrasenya ha de tenir com a mínim 6 caràcters.', 'warning');
    }

    const index = staff.findIndex((item) => item.id === id);
    if (index >= 0) staff[index] = { ...staff[index], ...record };
    else staff.push(record);

    syncLocalBridges();
    await syncStaffToFirestore(record, password);
    syncLocalBridges();
    renderAll();
    closeModal('staffModal');
    showToast('Personal guardat', 'La fitxa i els permisos han quedat actualitzats.');
}

async function archiveDepartment(id) {
    const current = departments.find((item) => item.id === id);
    if (!current) return;
    current.status = 'Inactiu';
    syncLocalBridges();
    await syncDepartmentToFirestore(current);
    renderAll();
    showToast('Departament arxivat', 'Ja no apareixerà als nous selectors actius.');
}

function archiveStaff(id) {
    const current = staff.find((item) => item.id === id);
    if (!current) return;
    current.status = 'Baixa';
    current.accessEnabled = false;
    current.permissions = { psy: 'none', admin: 'none', audit: 'none', programs: 'none' };
    syncLocalBridges();
    renderAll();
    showToast('Membre actualitzat', "S'ha marcat com a baixa.");
}

function seedDefaults() {
    departments = readStore(STORAGE_KEYS.departments, defaultDepartments).map((item) => ({ ...item }));
    staff = readStore(STORAGE_KEYS.staff, defaultStaff).map((item) => ({ ...item }));
    syncLocalBridges();
}

function bindUi() {
    document.getElementById('formDepartment').addEventListener('submit', saveDepartment);
    document.getElementById('formStaff').addEventListener('submit', saveStaff);

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('.modal-shell').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.style.cssText = 'display:none;';
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal('departmentModal');
            closeModal('staffModal');
        }
    });

    document.getElementById('btnNewDepartment').addEventListener('click', () => openDepartmentModal());
    document.getElementById('btnNewStaff').addEventListener('click', () => openStaffModal());
}

window.editDepartment = openDepartmentModal;
window.removeDepartment = archiveDepartment;
window.editStaff = openStaffModal;
window.removeStaff = archiveStaff;
window.closeAdminModal = closeModal;

// Fallback namespace per als onclick directes dels botons HTML
window._ap = {
    openDept: () => openDepartmentModal(),
    openStaff: () => openStaffModal(),
    tab: (name) => switchTab(name)
};

seedDefaults();
bindUi();
await loadRolePermissionsMatrix();
await hydrateFromFirestore();
syncLocalBridges();
renderAll();
switchTab('departments');
