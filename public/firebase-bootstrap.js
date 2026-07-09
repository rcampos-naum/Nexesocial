import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import './auth-manager.js';

async function ensureDoc(pathParts, data) {
    try {
        const ref = doc(db, ...pathParts);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
            await setDoc(ref, {
                ...data,
                createdAt: serverTimestamp(),
                initializedBy: 'firebase-bootstrap'
            }, { merge: true });
        }
    } catch (error) {
        console.warn('Firebase bootstrap warning:', pathParts.join('/'), error);
    }
}

function cleanupDemoLocalData() {
    if (localStorage.getItem('nexesocial_demo_cleanup_done') === 'true') return;

    const keysToCheck = [
        'nexesocial_departments',
        'nexesocial_staff',
        'nexesocial_activities',
        'nexesocial_followup_reports',
        'nexesocial_age_exception_requests',
        'nexeaudit_departments',
        'nexeaudit_actions',
        'nexe_audits_db',
        'nexesocial_room_reservations',
        'nexe_avisos'
    ];

    const demoMarkers = ['Rafa Campos', 'Laura Gómez', 'Marc Soler', 'AUD-2026-001', 'Joan Baptista', 'Família Garcia'];

    keysToCheck.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        if (demoMarkers.some((marker) => raw.includes(marker))) {
            localStorage.removeItem(key);
        }
    });

    localStorage.setItem('nexesocial_demo_cleanup_done', 'true');
}

async function ensureFirestoreBase() {
    const user = window.Auth?.getUser?.();
    if (!user) return;

    await ensureDoc(['metadata', 'configuracion'], {
        ultimo_numero: 0,
        appName: 'NexeSocial'
    });

    await ensureDoc(['metadata', 'grupos_contador'], {
        contador: 0
    });

    await ensureDoc(['roles', 'admin'], {
        name: 'admin',
        permissions: {
            admin: true,
            edit: true,
            audit: true,
            reports: true
        }
    });

    await ensureDoc(['roles', 'editor'], {
        name: 'editor',
        permissions: {
            edit: true,
            reports: true
        }
    });

    await ensureDoc(['roles', 'visualitzador'], {
        name: 'visualitzador',
        permissions: {
            read: true
        }
    });

    await ensureDoc(['config', 'rooms'], {
        items: ['Sala Polivalent', 'Sala de Reunions', 'Despatx 1', 'Despatx 2']
    });
}

window.ensureFirestoreBase = ensureFirestoreBase;

function shouldRunBootstrap() {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(role)) return false;

    // Avoid repeated work during the same tab lifecycle.
    if (sessionStorage.getItem('nexe_bootstrap_done') === 'true') return false;

    // Also throttle globally to once every 12h.
    const now = Date.now();
    const last = Number(localStorage.getItem('nexe_bootstrap_last_run') || 0);
    const twelveHours = 12 * 60 * 60 * 1000;
    return (now - last) > twelveHours;
}

function markBootstrapDone() {
    const now = Date.now();
    sessionStorage.setItem('nexe_bootstrap_done', 'true');
    localStorage.setItem('nexe_bootstrap_last_run', String(now));
}

setTimeout(() => {
    cleanupDemoLocalData();
    if (!shouldRunBootstrap()) return;

    const run = async () => {
        try {
            await ensureFirestoreBase();
            markBootstrapDone();
        } catch (e) {
            console.warn('ensureFirestoreBase failed:', e);
        }
    };

    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => { run(); }, { timeout: 2000 });
    } else {
        run();
    }
}, 1200);
