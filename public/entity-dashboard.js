import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

function safeRead(key, fallback = []) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return Array.isArray(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

async function readCollection(name) {
    try {
        const snapshot = await getDocs(collection(db, name));
        return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
        console.warn(`No se pudo leer la colección ${name}:`, error);
        return [];
    }
}

function countActive(items, inactiveValues = ['Inactiu', 'Inactivo', 'Baixa']) {
    return items.filter((item) => !inactiveValues.includes(item.status || item.estado)).length;
}

function daysUntil(dateValue) {
    if (!dateValue) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) return null;
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function formatDate(value) {
    if (!value) return 'Sense data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ca-ES');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('ca-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function getRoomReservations() {
    const stored = safeRead('nexesocial_room_reservations');
    return stored.length ? stored : [];
}

function renderItems(containerId, items, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
        container.innerHTML = `<div style="padding:12px 14px; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b; background:#fff;">${emptyText}</div>`;
        return;
    }

    container.innerHTML = items.map((item) => `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; margin-bottom:10px;">
            <div>
                <div style="font-weight:700; color:#0f172a;">${item.title}</div>
                <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">${item.meta || ''}</div>
            </div>
            <span style="font-size:0.72rem; font-weight:800; padding:4px 8px; border-radius:999px; background:${item.tone === 'danger' ? '#fee2e2' : item.tone === 'warning' ? '#fef3c7' : '#dbeafe'}; color:${item.tone === 'danger' ? '#991b1b' : item.tone === 'warning' ? '#92400e' : '#1d4ed8'}; white-space:nowrap;">${item.badge || 'Info'}</span>
        </div>
    `).join('');
}

async function getSnapshot() {
    const departments = safeRead('nexesocial_departments');
    const staff = safeRead('nexesocial_staff');
    const activities = safeRead('nexesocial_activities');
    const reports = safeRead('nexesocial_followup_reports');
    const requests = safeRead('nexesocial_age_exception_requests');
    const notices = safeRead('nexe_avisos');

    const [groups, cases, grants, documents, firestoreReservations] = await Promise.all([
        readCollection('grupos'),
        readCollection('expedientes'),
        readCollection('subvenciones'),
        readCollection('documentos'),
        readCollection('room_reservations')
    ]);

    const roomReservations = firestoreReservations.length ? firestoreReservations : getRoomReservations();

    const pendingRequests = requests.filter((item) => (item.status || 'pending') === 'pending');
    const urgentGrants = grants
        .map((item) => ({ ...item, daysLeft: daysUntil(item.fechaJustificacion || item.fechaCierre) }))
        .filter((item) => item.daysLeft !== null && item.daysLeft <= 15)
        .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

    const expiringDocs = documents
        .map((item) => ({ ...item, daysLeft: daysUntil(item.fechaVencimiento || item.fechaCaducidad) }))
        .filter((item) => item.daysLeft !== null && item.daysLeft <= 30)
        .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

    return {
        departments,
        staff,
        activities,
        reports,
        requests,
        notices,
        roomReservations,
        groups,
        cases,
        grants,
        documents,
        summary: {
            departments: countActive(departments),
            staff: countActive(staff),
            activities: countActive(activities, ['Inactiva', 'Inactivo']),
            groups: groups.filter((item) => (item.estado || item.status || 'Activo') !== 'Inactivo').length,
            cases: cases.filter((item) => (item.estado || item.status || 'Activo') !== 'Inactivo').length,
            reports: reports.length,
            pendingRequests: pendingRequests.length,
            notices: notices.length,
            grants: grants.length,
            requestedAmount: grants.reduce((acc, item) => acc + Number(item.importeSolicitado || 0), 0),
            roomReservationsToday: roomReservations.filter((item) => item.date === new Date().toISOString().split('T')[0]),
            urgentGrants,
            expiringDocs
        }
    };
}

async function initHomeDashboard() {
    const data = await getSnapshot();
    const summary = data.summary;

    setText('kpi-departments', String(summary.departments));
    setText('kpi-staff', String(summary.staff));
    setText('kpi-activities', String(summary.activities));
    setText('kpi-groups', String(summary.groups));
    setText('kpi-cases', String(summary.cases));
    setText('kpi-pending', String(summary.pendingRequests));
    setText('kpi-room-usage', String(summary.roomReservationsToday.length));

    const priorities = [
        ...summary.urgentGrants.slice(0, 3).map((item) => ({
            title: item.nombre || 'Subvenció',
            meta: `Límit ${formatDate(item.fechaJustificacion || item.fechaCierre)} · ${item.responsable || 'Sense responsable'}`,
            badge: item.daysLeft <= 0 ? 'Vençuda' : `${item.daysLeft} dies`,
            tone: item.daysLeft <= 3 ? 'danger' : 'warning'
        })),
        ...data.requests.slice(0, 3).filter((item) => (item.status || 'pending') === 'pending').map((item) => ({
            title: item.participantName || 'Autorització pendent',
            meta: item.reason || 'Fora de rang d’edat pendent de direcció',
            badge: 'Pendent',
            tone: 'warning'
        })),
        ...summary.expiringDocs.slice(0, 2).map((item) => ({
            title: item.nombre || item.name || 'Documentació',
            meta: `Caduca ${formatDate(item.fechaVencimiento || item.fechaCaducidad)}`,
            badge: item.daysLeft <= 7 ? 'Urgent' : 'Revisar',
            tone: item.daysLeft <= 7 ? 'danger' : 'warning'
        }))
    ].slice(0, 6);

    renderItems('prioritats-entitat', priorities, 'No hi ha prioritats urgents.');

    const agendaContainer = document.getElementById('llista-cites-avui');
    if (agendaContainer && !agendaContainer.dataset.dynamicLoaded) {
        const agendaItems = [
            {
                hour: 'Avui',
                title: `${summary.notices} avisos actius`,
                meta: 'Comunicació interna i tauler d’anuncis',
                badge: 'Avisos',
                tone: 'badge-reunio'
            },
            {
                hour: 'Procés',
                title: `${summary.reports} seguiments registrats`,
                meta: 'Informes trimestrals i finals dels programes',
                badge: 'Seguiment',
                tone: 'badge-cita'
            },
            {
                hour: 'Global',
                title: `${summary.departments} departaments · ${summary.activities} activitats`,
                meta: 'Estructura operativa de l’entitat',
                badge: 'Operatiu',
                tone: 'badge-reunio'
            }
        ];

        agendaContainer.innerHTML = agendaItems.map((item) => `
            <div class="cita-item">
                <div class="cita-hora">${item.hour}</div>
                <div class="cita-info">
                    <div style="font-weight:700;">${item.title}</div>
                    <div style="font-size:0.8rem; color:#64748b;">${item.meta}</div>
                </div>
                <span class="cita-badge ${item.tone}">${item.badge}</span>
            </div>
        `).join('');
        agendaContainer.dataset.dynamicLoaded = 'true';
    }

    const roomBox = document.getElementById('room-reservations-home');
    if (roomBox) {
        const reservations = summary.roomReservationsToday;
        roomBox.innerHTML = reservations.length
            ? reservations.map((item) => `
                <div style="padding:10px 12px; border:1px solid #dbeafe; background:white; border-radius:10px; margin-bottom:8px;">
                    <div style="font-weight:700; color:#0f172a;">${item.room}</div>
                    <div style="font-size:0.82rem; color:#475569; margin-top:4px;">${item.time} · ${item.reservedBy}</div>
                    <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">${item.department}</div>
                </div>
            `).join('')
            : '<div style="padding:10px 12px; border:1px dashed #cbd5e1; border-radius:10px; color:#64748b; background:white;">No hi ha sales reservades avui.</div>';
    }

    const urgentBox = document.getElementById('avisos-urgents-global');
    if (urgentBox) {
        const urgentLines = [];
        if (summary.urgentGrants[0]) {
            urgentLines.push(`<div><strong>${summary.urgentGrants[0].nombre || 'Subvenció'}</strong> · ${summary.urgentGrants[0].daysLeft <= 0 ? 'vençuda' : `${summary.urgentGrants[0].daysLeft} dies`}</div>`);
        }
        if (data.requests.some((item) => (item.status || 'pending') === 'pending')) {
            urgentLines.push(`<div>Hi ha <strong>${summary.pendingRequests}</strong> autoritzacions pendents de direcció.</div>`);
        }
        if (!urgentLines.length) {
            urgentLines.push('<div>No hi ha urgències registrades avui.</div>');
        }
        urgentBox.innerHTML = urgentLines.join('');
    }

    return data;
}

async function initAdminReportsDashboard() {
    const data = await getSnapshot();
    const summary = data.summary;

    setText('report-kpi-staff', String(summary.staff));
    setText('report-kpi-departments', String(summary.departments));
    setText('report-kpi-funding', formatCurrency(summary.requestedAmount));
    setText('report-hours-estimate', `${summary.activities * 32}h`);
    setText('report-target-staff', `${summary.staff} professionals`);
    setText('report-grants-collected', formatCurrency(summary.requestedAmount * 0.7));
    setText('report-docs-expiring', `${summary.expiringDocs.length} elements`);

    renderItems('admin-executive-alerts', [
        ...summary.urgentGrants.slice(0, 4).map((item) => ({
            title: item.nombre || 'Subvenció',
            meta: `Responsable: ${item.responsable || 'Sense assignar'}`,
            badge: item.daysLeft <= 0 ? 'Vençuda' : `${item.daysLeft} dies`,
            tone: item.daysLeft <= 3 ? 'danger' : 'warning'
        })),
        ...summary.expiringDocs.slice(0, 3).map((item) => ({
            title: item.nombre || item.name || 'Document',
            meta: `Caduca ${formatDate(item.fechaVencimiento || item.fechaCaducidad)}`,
            badge: 'Documentació',
            tone: 'warning'
        }))
    ], 'No hi ha alertes executives en aquest moment.');

    const body = document.getElementById('dynamic-summary-body');
    if (body) {
        body.innerHTML = `
            <tr>
                <td><b>Departaments operatius</b></td>
                <td>${summary.departments}</td>
                <td style="color:#16a34a;">Actius</td>
                <td>100%</td>
            </tr>
            <tr>
                <td><b>Activitats en marxa</b></td>
                <td>${summary.activities}</td>
                <td style="color:#2563eb;">${summary.groups} grups</td>
                <td>${Math.max(summary.activities, 1)}</td>
            </tr>
            <tr>
                <td><b>Seguiments registrats</b></td>
                <td>${summary.reports}</td>
                <td style="color:#16a34a;">+${summary.pendingRequests === 0 ? 0 : summary.pendingRequests}</td>
                <td>Trimestral</td>
            </tr>
            <tr>
                <td><b>Expedients actius</b></td>
                <td>${summary.cases}</td>
                <td style="color:#2563eb;">Entitat</td>
                <td>${summary.cases}</td>
            </tr>
            <tr>
                <td><b>Documentació a revisar</b></td>
                <td>${summary.expiringDocs.length}</td>
                <td style="color:${summary.expiringDocs.length ? '#dc2626' : '#16a34a'};">${summary.expiringDocs.length ? 'Atenció' : 'Controlat'}</td>
                <td>0</td>
            </tr>
        `;
    }

    return data;
}

window.EntityDashboard = {
    getSnapshot,
    initHomeDashboard,
    initAdminReportsDashboard
};

export { getSnapshot, initHomeDashboard, initAdminReportsDashboard };
