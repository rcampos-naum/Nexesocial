// auth-manager.js - Gestor centralizado de autenticación
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const DEFAULT_ROLE_PERMISSIONS = {
    admin:        { crearDepts: true, configSistema: true, verAudit: true, altaBaixaTreballadors: true, assignarCoordinadores: true, assignarReforcos: true, crearGrups: true, verAlumnesTots: true, verAlumnesGrup: true, diariAulaAssistencia: false, programsRead: true, programsEdit: true, directionApprovalsRead: true, directionApprovalsResolve: true, convenisRead: true, convenisEdit: true, convenisApprove: true },
    directora:    { crearDepts: false, configSistema: false, verAudit: true, altaBaixaTreballadors: true, assignarCoordinadores: true, assignarReforcos: true, crearGrups: true, verAlumnesTots: true, verAlumnesGrup: true, diariAulaAssistencia: false, programsRead: true, programsEdit: true, directionApprovalsRead: true, directionApprovalsResolve: true, convenisRead: true, convenisEdit: true, convenisApprove: true },
    coordinador:  { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: true, crearGrups: true, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: true, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: true, convenisEdit: false, convenisApprove: false },
    tecnic:       { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: false, crearGrups: false, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: false, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: false, convenisEdit: false, convenisApprove: false },
    voluntari:    { crearDepts: false, configSistema: false, verAudit: false, altaBaixaTreballadors: false, assignarCoordinadores: false, assignarReforcos: false, crearGrups: false, verAlumnesTots: false, verAlumnesGrup: true, diariAulaAssistencia: true, programsRead: false, programsEdit: false, directionApprovalsRead: false, directionApprovalsResolve: false, convenisRead: false, convenisEdit: false, convenisApprove: false }
};

function canonicalRolesFromLegacy(roles = []) {
    const src = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    return Array.from(new Set(src.map((r) => {
        const key = String(r || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_');
        if (key === 'admin' || key === 'admin_sistema') return 'admin';
        if (key === 'directora' || key === 'direccio') return 'directora';
        if (key === 'coordinador') return 'coordinador';
        if (key === 'tecnic' || key === 'administracio' || key === 'manteniment') return 'tecnic';
        if (key === 'voluntari') return 'voluntari';
        return key || null;
    }).filter(Boolean)));
}

function mergeMatrixPerms(matrix, canonicalRoles = []) {
    const merged = {};
    canonicalRoles.forEach((role) => {
        const source = matrix?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || {};
        Object.keys(source).forEach((permKey) => {
            merged[permKey] = !!merged[permKey] || source[permKey] === true;
        });
    });
    return merged;
}

// ── SESSION TIMEOUT CONFIGURATION ────────────────────────────────────────
const SESSION_MAX_MS     = 8 * 60 * 60 * 1000;   // 8 h màxim absolut de sessió
const INACTIVITY_MAX_MS  = 15 * 60 * 1000;        // 15 min sense activitat
const WARNING_BEFORE_MS  = 2 * 60 * 1000;         // avís 2 min abans del tall (compte enrere)
// ─────────────────────────────────────────────────────────────────────────

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.userPermissions = {};
        this.isReady = false;
        this._maintenanceNavGuardAttached = false;
        this._constructionCache = null;
        this._constructionCacheAt = 0;
        this._initBlockerReleased = false;
    }

    /**
     * Inicializar el listener de autenticación
     * Se ejecuta una sola vez al cargar la página
     */
    initialize() {
        // Already ready — return immediately
        if (this.isReady) return Promise.resolve(this.currentUser);
        // Already initializing — return the same promise (prevents duplicate onAuthStateChanged)
        if (this._initPromise) return this._initPromise;

        // White blocker disabled due race/UX issues causing blank screens.
        // Maintenance guard is now enforced via pre-navigation checks + modal.

        this._initPromise = new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log('🔐 Usuario autenticado:', user.email);
                    this.currentUser = user;
                    
                    // Obtener datos del usuario desde localStorage
                    const storedRole = localStorage.getItem('userRole');
                    const storedName = localStorage.getItem('userName');
                    
                    // Intentar obtener datos de Firestore (por UID primero, luego email como fallback)
                    await this.loadUserData(user.uid, user.email);
                    
                    // Si no hay nombre en Firestore, usar email
                    if (!this.currentUser.displayName) {
                        this.currentUser.displayName = storedName || user.email.split('@')[0];
                    }
                    
                    console.log('✅ AuthManager inicializado:', {
                        email: this.currentUser.email,
                        name: this.currentUser.displayName,
                        role: this.userRole,
                        permissions: this.userPermissions
                    });

                    // Start session timeout monitoring
                    this._startSessionTimers();
                    // Restore impersonation state if active (must run before anything else)
                    this._restoreImpersonationIfActive();
                    // Block maintenance pages before showing content
                    try {
                        await this._checkConstructionMode();
                        // Intercept internal navigation so maintenance warning appears before loading target page
                        this._setupMaintenanceNavigationGuard();
                    } finally {
                        // Always release blocker; maintenance modal has its own overlay
                        this._releaseInitBlocker();
                    }
                    // Inject superadmin dev bar (only for admin/superadmin)
                    if (this._originalRole === 'admin' || this._originalRole === 'superadmin' ||
                        this.userRole === 'admin' || this.userRole === 'superadmin') {
                        this._injectSuperAdminBar();
                    }
                } else {
                    console.log('⚠️ Usuario no autenticado');
                    this.currentUser = null;
                    this.userRole = null;
                    this.userPermissions = {};

                    // Redirect to login if not already on login page
                    const path = window.location.pathname;
                    const isLoginPage = path === '/' || path.endsWith('/index.html') || path === '/index.html';
                    if (!isLoginPage) {
                        const isSubDir = ['/NexeAdmin/', '/NexePsy/', '/NexeAudit/'].some(d => path.includes(d));
                        window.location.replace(isSubDir ? '../index.html' : 'index.html');
                        return;
                    }
                    this._releaseInitBlocker();
                }
                
                this.isReady = true;
                window.dispatchEvent(new CustomEvent('nexe-auth-ready', {
                    detail: {
                        uid: this.currentUser?.uid || '',
                        role: this.userRole || ''
                    }
                }));
                resolve(this.currentUser);
            });
        });
        return this._initPromise;
    }

    /**
     * Cargar datos del usuario desde Firestore
     */
    async loadUserData(uid, email) {
        try {
            // Try by UID first (usuarios-logic.js saves with UID as document ID)
            let userDocRef = doc(db, 'usuarios', uid);
            let userDoc = await getDoc(userDocRef);

            // Fallback: try by email (legacy format)
            if (!userDoc.exists()) {
                userDocRef = doc(db, 'usuarios', email);
                userDoc = await getDoc(userDocRef);
            }

            this._userDocRef = userDoc.exists() ? userDocRef : null;

            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.userRole = userData.role || 'user';
                this.userPermissions = userData.permisos || {};
                const userRoles = Array.isArray(userData.roles) ? userData.roles : [];
                this.userRoles = userRoles;  // store for construction mode check
                const canonicalRoles = canonicalRolesFromLegacy(userData.matrixRoles || userRoles);

                // Derive role from roles array (new system) or permissions (legacy)
                // NexeAdmin permissions do NOT grant system admin role
                if (userRoles.includes('admin_sistema')) {
                    this.userRole = 'admin';
                } else if (userRoles.includes('direccio')) {
                    this.userRole = 'admin';
                } else {
                    // Always re-derive from roles array — overrides any stale Firestore value
                    const p = this.userPermissions;
                    if (userRoles.includes('coordinador')) this.userRole = 'editor';
                    else if (userRoles.includes('tecnic') || userRoles.includes('administracio') || userRoles.includes('manteniment')) this.userRole = 'tecnic';
                    else if (userRoles.includes('voluntari')) this.userRole = 'voluntari';
                    else if (p.psy && p.psy !== 'none') this.userRole = 'psicolog';
                    else if (p.audit && p.audit !== 'none') this.userRole = 'auditor';
                    else if (this.userRole === 'admin') this.userRole = 'user'; // strip stale admin
                }

                // Save to localStorage for quick access
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userRole', this.userRole);
                localStorage.setItem('userRoles', JSON.stringify(userRoles));
                localStorage.setItem('userMatrixRoles', JSON.stringify(canonicalRoles));
                localStorage.setItem('userName', userData.nombre || this.currentUser.displayName || email.split('@')[0]);
                localStorage.setItem('userSignatureRole', userData.signatureRole || userData.roleLabel || userData.rol || '');
                localStorage.setItem('userPermissions', JSON.stringify(this.userPermissions));
                // Persist scope + extraPerms for isAllowed() / sidebar filtering
                const deptIds = Array.isArray(userData.departamentoIds)
                    ? userData.departamentoIds.filter(Boolean)
                    : (userData.departamentoId ? [userData.departamentoId] : []);
                const scopeIds = Array.isArray(userData.scope) && userData.scope.length
                    ? userData.scope.filter(Boolean)
                    : deptIds;
                localStorage.setItem('userDeptIds', JSON.stringify(deptIds));
                localStorage.setItem('userScope', JSON.stringify(scopeIds));
                if (userData.extraPerms) localStorage.setItem('userExtraPerms', JSON.stringify(userData.extraPerms));

                // Fast path: use cached/default matrix perms immediately to avoid blocking page bootstrap.
                let cachedMatrixPerms = {};
                try { cachedMatrixPerms = JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); } catch {}
                const fallbackPerms = mergeMatrixPerms(DEFAULT_ROLE_PERMISSIONS, canonicalRoles);
                const effectiveFastPerms = Object.keys(cachedMatrixPerms || {}).length ? cachedMatrixPerms : fallbackPerms;
                this.userMatrixPerms = effectiveFastPerms;
                localStorage.setItem('nexe_rolePermissions', localStorage.getItem('nexe_rolePermissions') || JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
                localStorage.setItem('userMatrixPerms', JSON.stringify(effectiveFastPerms));

                // Slow path in background: refresh role matrix + entity config with TTL.
                Promise.resolve().then(async () => {
                    const now = Date.now();
                    const matrixTtlMs = 5 * 60 * 1000;
                    const entitatTtlMs = 15 * 60 * 1000;
                    const matrixCachedAt = Number(localStorage.getItem('nexe_role_matrix_cached_at') || 0);
                    const entitatCachedAt = Number(localStorage.getItem('nexe_entitat_cached_at') || 0);

                    if (now - matrixCachedAt > matrixTtlMs) {
                        try {
                            const matrixSnap = await getDoc(doc(db, 'config', 'rolePermissions'));
                            const matrixDoc = matrixSnap.exists() ? matrixSnap.data() : {};
                            const allRoleKeys = Array.from(new Set([
                                ...Object.keys(DEFAULT_ROLE_PERMISSIONS),
                                ...Object.keys(matrixDoc || {})
                            ]));
                            const roleMatrix = allRoleKeys.reduce((acc, roleKey) => {
                                acc[roleKey] = Object.assign({}, DEFAULT_ROLE_PERMISSIONS[roleKey] || {}, matrixDoc?.[roleKey] || {});
                                return acc;
                            }, {});
                            const freshPerms = mergeMatrixPerms(roleMatrix, canonicalRoles);
                            this.userMatrixPerms = freshPerms;
                            localStorage.setItem('nexe_rolePermissions', JSON.stringify(roleMatrix));
                            localStorage.setItem('userMatrixPerms', JSON.stringify(freshPerms));
                            localStorage.setItem('nexe_role_matrix_cached_at', String(now));
                        } catch (matrixErr) {
                            console.warn('No s\'ha pogut carregar la matriu de permisos:', matrixErr);
                        }
                    }

                    if (now - entitatCachedAt > entitatTtlMs) {
                        try {
                            const entitatSnap = await getDoc(doc(db, 'config', 'entitat'));
                            if (entitatSnap.exists()) {
                                localStorage.setItem('nexe_config_entitat', JSON.stringify(entitatSnap.data() || {}));
                                localStorage.setItem('nexe_entitat_cached_at', String(now));
                            }
                        } catch (entitatErr) {
                            console.warn('No s\'ha pogut carregar la configuració de l\'entitat:', entitatErr);
                        }
                    }
                });

                console.log('📦 Datos del usuario cargados desde Firestore:', { role: this.userRole, roles: userRoles, permisos: this.userPermissions });

                // Force password change on first login
                if (userData.mustChangePassword) {
                    this._showPwChangeModal();
                }
            } else {
                console.warn('⚠️ Documento del usuario no encontrado en Firestore para UID:', uid);
                this.setDefaultRole(email);
            }
        } catch (error) {
            console.error('Error cargando datos de usuario:', error);
            this.setDefaultRole(email);
        }
    }

    /**
     * Asignar rol por defecto si el usuario no existe en Firestore
     */
    setDefaultRole(email) {
        this.userRoles = [];
        // Los emails específicos siempre son admin
        if (email === 'admin@nexesocial.com' || email === 'rcampos@naumsonroca.es') {
            this.userRole = 'admin';
            this.userRoles = ['admin_sistema'];
            localStorage.setItem('userMatrixRoles', JSON.stringify(['admin']));
            this.userPermissions = {
                psy: 'admin',
                admin: 'admin',
                audit: 'admin',
                grupos: 'admin',
                usuarios: 'admin',
                configuracion: 'admin'
            };
        } else {
            this.userRole = 'user';
            this.userPermissions = {};
        }
        
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', this.userRole);
        localStorage.setItem('userName', email.split('@')[0]);
        localStorage.setItem('userPermissions', JSON.stringify(this.userPermissions));
        localStorage.setItem('userScope', JSON.stringify([]));
        localStorage.setItem('userDeptIds', JSON.stringify([]));
        localStorage.setItem('nexe_rolePermissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
        localStorage.setItem('userMatrixPerms', JSON.stringify(this.userRole === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin : {}));
    }

    /**
     * Show forced password change modal
     */
    _showPwChangeModal() {
        const doInject = () => {
            if (document.getElementById('pw-force-modal')) return;
            const overlay = document.createElement('div');
            overlay.id = 'pw-force-modal';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.9);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';
            overlay.innerHTML = `
                <div style="background:white;border-radius:24px;padding:40px;max-width:420px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,0.3);">
                    <div style="text-align:center;margin-bottom:24px;">
                        <div style="width:60px;height:60px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <h2 style="margin:0 0 8px;color:#1e293b;font-size:1.3rem;font-weight:700;">Canvi de contrasenya obligatori</h2>
                        <p style="margin:0;color:#64748b;font-size:0.88rem;line-height:1.5;">Per seguretat, has de configurar una nova contrasenya per al teu compte abans de continuar.</p>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:0.78rem;font-weight:600;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.03em;">Nova contrasenya</label>
                        <input type="password" id="pw-force-new" placeholder="M\u00ednim 8 car\u00e0cters" style="width:100%;padding:12px 15px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;box-sizing:border-box;outline:none;font-family:inherit;">
                    </div>
                    <div style="margin-bottom:18px;">
                        <label style="display:block;font-size:0.78rem;font-weight:600;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.03em;">Confirma la contrasenya</label>
                        <input type="password" id="pw-force-confirm" placeholder="Repeteix la contrasenya" style="width:100%;padding:12px 15px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;box-sizing:border-box;outline:none;font-family:inherit;">
                    </div>
                    <p id="pw-force-err" style="color:#ef4444;font-size:0.83rem;margin:0 0 14px;display:none;"></p>
                    <button id="pw-force-btn" style="width:100%;padding:14px;background:#2563eb;color:white;border:none;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;font-family:inherit;">Desar i continuar &rarr;</button>
                </div>`;
            document.body.appendChild(overlay);

            const errEl = document.getElementById('pw-force-err');
            const save = async () => {
                const pw1 = document.getElementById('pw-force-new').value;
                const pw2 = document.getElementById('pw-force-confirm').value;
                errEl.style.display = 'none';
                if (pw1.length < 8) { errEl.textContent = 'La contrasenya ha de tenir almenys 8 car\u00e0cters.'; errEl.style.display = 'block'; return; }
                if (pw1 !== pw2) { errEl.textContent = 'Les contrasenyes no coincideixen.'; errEl.style.display = 'block'; return; }
                const btn = document.getElementById('pw-force-btn');
                btn.disabled = true; btn.textContent = 'Desant...';
                try {
                    await updatePassword(this.currentUser, pw1);
                    if (this._userDocRef) await updateDoc(this._userDocRef, { mustChangePassword: false });
                    overlay.remove();
                } catch (e) {
                    btn.disabled = false; btn.innerHTML = 'Desar i continuar &rarr;';
                    if (e.code === 'auth/requires-recent-login') {
                        errEl.textContent = 'La sessi\u00f3 ha caducat. Tanca la sessi\u00f3 i torna a iniciar-la per canviar la contrasenya.';
                    } else {
                        errEl.textContent = 'Error: ' + (e.message || e.code);
                    }
                    errEl.style.display = 'block';
                }
            };
            document.getElementById('pw-force-btn').addEventListener('click', save);
            overlay.addEventListener('keypress', e => { if (e.key === 'Enter') save(); });
        };
        if (document.body) { doInject(); }
        else { document.addEventListener('DOMContentLoaded', doInject, { once: true }); }
    }

    /**
     * Obtener usuario actual
     */
    getUser() {
        if (!this.isReady) {
            console.warn('⚠️ AuthManager no está listo. Usar initialize() primero.');
            return null;
        }

        if (this.currentUser) {
            return {
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                nombre: this.currentUser.displayName,
                role: this.userRole,
                permisos: this.userPermissions,
                uid: this.currentUser.uid
            };
        }

        // Fallback a localStorage si Auth no disponible
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole') || 'user';
        const name = localStorage.getItem('userName');
        const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');

        if (email) {
            return {
                email,
                displayName: name,
                nombre: name,
                role,
                permisos: permissions,
                uid: null
            };
        }

        return null;
    }

    /**
     * Verificar si el usuario tiene permiso para un módulo específico
     */
    hasAccessTo(module) {
        const user = this.getUser();
        if (!user) return false;

        // Admin acceso a todo
        if (user.role === 'admin' || user.role === 'superadmin') {
            return true;
        }

        // Verificar permisos específicos del módulo
        const modulePerms = user.permisos?.[module];
        return modulePerms && modulePerms !== 'none';
    }

    /**
     * Cerrar sesión
     */
    async logout() {
        try {
            this._clearSessionTimers();
            await signOut(auth);
            this.currentUser = null;
            this.userRole = null;
            this.userPermissions = {};
            localStorage.removeItem('nexe_session_start');
            localStorage.removeItem('nexe_last_activity');
            localStorage.clear();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }

    /**
     * Obtener el rol del usuario actual
     */
    getRole() {
        const user = this.getUser();
        return user?.role || 'guest';
    }

    /**
     * Obtener todos los permisos del usuario
     */
    getPermissions() {
        const user = this.getUser();
        return user?.permisos || {};
    }
}

// Instancia global singleton
window.Auth = new AuthManager();

// Inicializar automáticamente
window.Auth.initialize().then(() => {
    console.log('✅ Sistema de autenticación inicializado');
});

export default window.Auth;

// ══════════════════════════════════════════════════════════════════════════
// SESSION TIMEOUT METHODS (added to prototype)
// ══════════════════════════════════════════════════════════════════════════

AuthManager.prototype._startSessionTimers = function() {
    // Never start timers on the login page — no session to monitor there
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('/index.html');
    if (isLoginPage) return;

    // Prevent multiple intervals if onAuthStateChanged fires more than once
    if (this._sessionInterval) {
        clearInterval(this._sessionInterval);
        this._sessionInterval = null;
    }

    const now = Date.now();

    // Set start time if not already set (i.e. first time loading after login)
    if (!localStorage.getItem('nexe_session_start')) {
        localStorage.setItem('nexe_session_start', String(now));
    }
    localStorage.setItem('nexe_last_activity', String(now));

    // Track user activity to reset inactivity timer
    if (!this._activityListenersAdded) {
        const resetActivity = () => {
            localStorage.setItem('nexe_last_activity', String(Date.now()));
        };
        ['mousemove','keydown','click','touchstart','scroll'].forEach(ev =>
            window.addEventListener(ev, resetActivity, { passive: true })
        );
        this._activityListenersAdded = true;
    }

    // Check every 30 seconds (more accurate for 15-min inactivity window)
    this._sessionInterval = setInterval(() => this._checkSessionTimeout(), 30_000);
};

AuthManager.prototype._clearSessionTimers = function() {
    if (this._sessionInterval) {
        clearInterval(this._sessionInterval);
        this._sessionInterval = null;
    }
};

AuthManager.prototype._checkSessionTimeout = function() {
    const now = Date.now();
    // Use Date.now() as fallback so a missing key never produces astronomical sessionAge
    const sessionStart   = Number(localStorage.getItem('nexe_session_start') || now);
    const lastActivity   = Number(localStorage.getItem('nexe_last_activity') || now);

    const sessionAge     = now - sessionStart;
    const inactivityAge  = now - lastActivity;

    // Already showing warning — skip
    if (document.getElementById('session-timeout-warning')) return;

    const shouldWarnSession    = sessionAge    >= SESSION_MAX_MS    - WARNING_BEFORE_MS;
    const shouldWarnInactivity = inactivityAge >= INACTIVITY_MAX_MS - WARNING_BEFORE_MS;
    const mustLogout           = sessionAge    >= SESSION_MAX_MS    || inactivityAge >= INACTIVITY_MAX_MS;

    if (mustLogout) {
        this._forceLogout('sessió caducada');
        return;
    }

    if (shouldWarnSession || shouldWarnInactivity) {
        const remainingMs = shouldWarnInactivity
            ? INACTIVITY_MAX_MS - inactivityAge
            : SESSION_MAX_MS - sessionAge;
        this._showTimeoutWarning(Math.ceil(remainingMs / 60_000));
    }
};

AuthManager.prototype._showTimeoutWarning = function(minutesLeft) {
    if (document.getElementById('session-timeout-warning')) return;

    const overlay = document.createElement('div');
    overlay.id = 'session-timeout-warning';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';

    let secs = minutesLeft * 60;
    overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:40px 36px;max-width:380px;width:90%;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.35);">
            <div style="width:64px;height:64px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h2 style="margin:0 0 10px;color:#1e293b;font-size:1.25rem;font-weight:800;">Sessió a punt de caducar</h2>
            <p style="margin:0 0 6px;color:#64748b;font-size:0.88rem;line-height:1.5;">La sessió es tancarà automàticament en:</p>
            <div id="timeout-countdown" style="font-size:2.5rem;font-weight:900;color:#dc2626;margin:14px 0 20px;font-variant-numeric:tabular-nums;">${minutesLeft}:00</div>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button id="timeout-logout-btn" style="padding:11px 22px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.9rem;">Tancar sessió</button>
                <button id="timeout-continue-btn" style="padding:11px 22px;background:#2563eb;color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.9rem;">Continuar &rarr;</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    // Countdown tick
    const tick = setInterval(() => {
        secs--;
        if (secs <= 0) {
            clearInterval(tick);
            overlay.remove();
            this._forceLogout('temps exhaurit');
            return;
        }
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        const el = document.getElementById('timeout-countdown');
        if (el) el.textContent = `${m}:${s}`;
    }, 1000);

    document.getElementById('timeout-continue-btn').addEventListener('click', () => {
        clearInterval(tick);
        overlay.remove();
        // Reset activity so inactivity timer restarts
        localStorage.setItem('nexe_last_activity', String(Date.now()));
    });

    document.getElementById('timeout-logout-btn').addEventListener('click', () => {
        clearInterval(tick);
        overlay.remove();
        this._forceLogout('usuari ha tancat la sessió');
    });
};

AuthManager.prototype._forceLogout = async function(reason) {
    console.log('🔒 Sessió finalitzada:', reason);
    this._clearSessionTimers();
    try { await signOut(auth); } catch (_) {}
    localStorage.removeItem('nexe_session_start');
    localStorage.removeItem('nexe_last_activity');
    localStorage.clear();
    const path = window.location.pathname;
    const isSubDir = ['/NexeAdmin/', '/NexePsy/', '/NexeAudit/'].some(d => path.includes(d));
    window.location.replace(isSubDir ? '../index.html' : 'index.html');
};

// ══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION MODE
// ══════════════════════════════════════════════════════════════════════════
import { doc as _firestoreDoc, getDoc as _firestoreGetDoc, setDoc as _firestoreSetDoc }
    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

AuthManager.prototype._pageSlug = function() {
    // Returns path relative to the app root, matching the keys stored in Firestore
    // e.g. 'gestio-avisos.html' or 'NexeAdmin/nexeadmin.html'
    const path = window.location.pathname;
    // Strip any leading slash and optional /public/ prefix (local dev)
    const clean = path.replace(/^\/public\//, '').replace(/^\//, '');
    return clean || 'index.html';
};

AuthManager.prototype._checkConstructionMode = async function() {
    // These pages are never subject to construction mode
    const slug = this._pageSlug();
    const NEVER_BLOCKED = ['home.html', 'index.html', 'admin-plataforma.html'];
    if (NEVER_BLOCKED.includes(slug)) return false;

    if (this._canBypassConstructionMode()) return false;
    try {
        const pages = await this._getConstructionPagesMap();
        if (pages[slug]) {
            this._showConstructionModal();
            return true;
        }
    } catch (e) {
        console.warn('Construction mode check failed:', e.message);
    }
    return false;
};

AuthManager.prototype._ensureInitBlocker = function() {
    return;
};

AuthManager.prototype._releaseInitBlocker = function() {
    this._initBlockerReleased = true;
    if (this._initBlockerTimer) {
        clearTimeout(this._initBlockerTimer);
        this._initBlockerTimer = null;
    }
    document.getElementById('nexe-init-blocker')?.remove();
};

AuthManager.prototype._canBypassConstructionMode = function() {
    const isImpersonating = !!this._originalRole;
    if (isImpersonating) {
        // Impersonating uses effective role only
        return this.userRole === 'superadmin';
    }
    const roles = this.userRoles || [];
    return this.userRole === 'superadmin' ||
        roles.includes('admin_sistema') || roles.includes('direccio');
};

AuthManager.prototype._getConstructionPagesMap = async function() {
    const now = Date.now();
    if (this._constructionCache && (now - this._constructionCacheAt) < 15000) {
        return this._constructionCache;
    }
    const snap = await _firestoreGetDoc(_firestoreDoc(db, 'platform_settings', 'construction_mode'));
    const pages = snap.exists() ? (snap.data().pages || {}) : {};
    this._constructionCache = pages;
    this._constructionCacheAt = now;
    return pages;
};

AuthManager.prototype._setupMaintenanceNavigationGuard = function() {
    if (this._maintenanceNavGuardAttached) return;
    this._maintenanceNavGuardAttached = true;

    const NEVER_BLOCKED = ['home.html', 'index.html', 'admin-plataforma.html'];
    document.addEventListener('click', async (ev) => {
        try {
            if (ev.defaultPrevented) return;
            if (ev.button !== 0) return;
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

            const anchor = ev.target?.closest?.('a[href]');
            if (!anchor) return;
            if (anchor.hasAttribute('download')) return;
            if ((anchor.getAttribute('target') || '').toLowerCase() === '_blank') return;

            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            const url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin) return;

            const targetSlug = (url.pathname || '/').replace(/^\/public\//, '').replace(/^\//, '') || 'index.html';
            if (NEVER_BLOCKED.includes(targetSlug)) return;
            if (targetSlug === this._pageSlug()) return;
            if (this._canBypassConstructionMode()) return;

            ev.preventDefault();
            ev.stopImmediatePropagation();

            const pages = await this._getConstructionPagesMap();
            if (pages[targetSlug]) {
                this._showConstructionModal({ closeOnly: true });
            } else {
                window.location.href = url.href;
            }
        } catch (_) {
            // If anything fails, fall back to normal navigation behavior
        }
    }, true);
};

AuthManager.prototype._showConstructionModal = function(options = {}) {
    const closeOnly = !!options.closeOnly;
    if (document.getElementById('nexe-construction-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nexe-construction-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);z-index:999990;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';
    overlay.innerHTML = `
        <style>
            @keyframes _nexe_spin { to { transform: rotate(360deg); } }
            #nexe-gear-svg { animation: _nexe_spin 2.5s linear infinite; transform-origin: center; }
        </style>
        <div style="background:white;border-radius:24px;padding:52px 44px;max-width:420px;width:90%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.35);">
            <svg id="nexe-gear-svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:24px;display:block;margin-left:auto;margin-right:auto;">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <h2 style="margin:0 0 10px;color:#1e293b;font-size:1.4rem;font-weight:800;">M&ograve;dul en construcci&oacute;</h2>
            <p style="margin:0 0 28px;color:#64748b;font-size:0.9rem;line-height:1.6;">Estem treballant per millorar aquesta secci&oacute;.<br>Aviat estar&agrave; disponible.</p>
            <button id="nexe-construction-back" style="padding:12px 28px;background:#1e293b;color:white;border:none;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;">
                ${closeOnly ? 'Tancar' : '&larr; Tornar enrere'}
            </button>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('nexe-construction-back').addEventListener('click', () => {
        if (closeOnly) {
            overlay.remove();
            return;
        }
        if (window.history.length > 1) window.history.back();
        else {
            const path = window.location.pathname;
            const isSubDir = ['/NexeAdmin/', '/NexePsy/', '/NexeAudit/'].some(d => path.includes(d));
            window.location.href = isSubDir ? '../home.html' : 'home.html';
        }
    });
};

// ── IMPERSONATION ────────────────────────────────────────────────────────
AuthManager.prototype._restoreImpersonationIfActive = function() {
    try {
        const raw = sessionStorage.getItem('nexe_imp');
        if (!raw) return;
        const imp = JSON.parse(raw);
        // Store originals so we can restore later
        this._originalRole  = imp.origRole;
        this._originalPerms = imp.origPerms;
        this._originalName  = imp.origName;
        // Override current session with impersonated user
        this.userRole        = imp.targetRole;
        this.userPermissions = imp.targetPerms || {};
        // Show banner (deferred so DOM is ready)
        const showBanner = () => this._showImpersonationBanner(imp.targetEmail, imp.targetRole, imp.targetName);
        if (document.body) showBanner();
        else document.addEventListener('DOMContentLoaded', showBanner, { once: true });
    } catch (_) {}
};

AuthManager.prototype._startImpersonation = function(targetEmail, targetRole, targetPerms, targetName) {
    const imp = {
        origRole:  this._originalRole  || this.userRole,
        origPerms: this._originalPerms || this.userPermissions,
        origName:  this._originalName  || localStorage.getItem('userName') || '',
        targetEmail, targetRole, targetPerms: targetPerms || {}, targetName: targetName || targetEmail
    };
    sessionStorage.setItem('nexe_imp', JSON.stringify(imp));
    window.location.reload();
};

AuthManager.prototype._stopImpersonation = function() {
    sessionStorage.removeItem('nexe_imp');
    window.location.reload();
};

AuthManager.prototype._showImpersonationBanner = function(email, role, name) {
    if (document.getElementById('nexe-imp-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'nexe-imp-banner';
    // Floats above everything: higher z-index than topbar (10002) and sidebar (10001)
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10010;background:#f59e0b;color:#1c1917;padding:7px 20px;display:flex;align-items:center;gap:12px;font-family:Inter,system-ui,sans-serif;font-size:.82rem;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.2);';
    bar.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Emulant compte: <span style="text-decoration:underline;">${email}</span> &nbsp;&middot;&nbsp; Rol: <span style="background:rgba(0,0,0,.15);padding:1px 7px;border-radius:4px;">${role}</span></span>
        <button onclick="window.Auth._stopImpersonation()" style="margin-left:auto;padding:5px 14px;background:#1c1917;color:#fef3c7;border:none;border-radius:7px;font-weight:800;font-size:.78rem;cursor:pointer;font-family:inherit;">&#x21A9; Tornar a la meva sessi&oacute;</button>`;
    const doInsert = () => {
        document.body.prepend(bar);
        const h = bar.offsetHeight || 36;
        // Push the topbar down (main app pages)
        const topbar = document.querySelector('.top-bar, header');
        if (topbar) topbar.style.top = h + 'px';
        // Push ALL sidebar variants down:
        // - #mainSidebar (main app, normally top:60px)
        // - .admin-sidebar (NexeAdmin, normally top:0)
        // - aside.sidebar (NexePsy, normally top:0)
        // - .sidebar-audit (NexeAudit, normally top:0)
        document.querySelectorAll('#mainSidebar, .admin-sidebar, .sidebar-audit, aside.sidebar').forEach(el => {
            const current = parseInt(el.style.top || getComputedStyle(el).top || '0') || 0;
            el.style.top = (current + h) + 'px';
            el.style.setProperty('top', (current + h) + 'px', 'important');
        });
        // Push main content down
        const main = document.querySelector('.main-content, main, #main-content');
        if (main) main.style.paddingTop = (parseInt(getComputedStyle(main).paddingTop || '0') + h) + 'px';
    };
    if (document.body) doInsert();
    else document.addEventListener('DOMContentLoaded', doInsert, { once: true });
};

AuthManager.prototype._injectSuperAdminBar = function() {
    if (document.getElementById('nexe-devbar')) return;
    const doInject = () => {
        if (document.getElementById('nexe-devbar')) return;
        const btn = document.createElement('div');
        btn.id = 'nexe-devbar';
        btn.title = 'Mode construcció (superadmin)';
        btn.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:999980;cursor:pointer;user-select:none;';
        const gearSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        btn.innerHTML = `
            <div id="nexe-devbar-trigger" style="width:40px;height:40px;background:#1e293b;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.35);transition:.2s;" title="Eines superadmin">${gearSvg}</div>
            <div id="nexe-devbar-panel" style="display:none;position:absolute;bottom:52px;right:0;background:white;border-radius:14px;padding:18px;box-shadow:0 8px 40px rgba(0,0,0,.25);min-width:270px;max-width:300px;">
                <div style="font-size:.7rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Superadmin &middot; Eines</div>

                <!-- Construction mode toggle -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-size:.83rem;font-weight:700;color:#1e293b;">Mode construcci&oacute;</div>
                        <div style="font-size:.72rem;color:#94a3b8;" id="nexe-devbar-slug"></div>
                    </div>
                    <label style="position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0;cursor:pointer;">
                        <input type="checkbox" id="nexe-construction-toggle" style="opacity:0;width:0;height:0;">
                        <span id="nexe-toggle-track" style="position:absolute;inset:0;background:#e2e8f0;border-radius:24px;transition:.2s;"></span>
                        <span id="nexe-toggle-thumb" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.25);"></span>
                    </label>
                </div>
                <div id="nexe-devbar-status" style="font-size:.72rem;color:#64748b;margin-top:6px;min-height:16px;"></div>

                <!-- Impersonation -->
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
                    <div style="font-size:.76rem;font-weight:700;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Emular usuari
                    </div>
                    <select id="nexe-imp-select" style="width:100%;padding:7px 9px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.78rem;font-family:inherit;outline:none;margin-bottom:8px;color:#1e293b;background:white;">
                        <option value="">— Carregant usuaris... —</option>
                    </select>
                    <button id="nexe-imp-btn" style="width:100%;padding:8px;background:#f59e0b;color:#1c1917;border:none;border-radius:8px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:inherit;">Emular aquest usuari</button>
                    <div id="nexe-imp-status" style="font-size:.72rem;color:#64748b;margin-top:6px;min-height:14px;"></div>
                </div>
            </div>`;
        document.body.appendChild(btn);

        const slug    = this._pageSlug();
        const panel   = document.getElementById('nexe-devbar-panel');
        const toggle  = document.getElementById('nexe-construction-toggle');
        const track   = document.getElementById('nexe-toggle-track');
        const thumb   = document.getElementById('nexe-toggle-thumb');
        const status  = document.getElementById('nexe-devbar-status');
        document.getElementById('nexe-devbar-slug').textContent = slug;

        const setToggleUI = (on) => {
            toggle.checked = on;
            track.style.background = on ? '#3b82f6' : '#e2e8f0';
            thumb.style.transform   = on ? 'translateX(18px)' : 'translateX(0)';
            status.textContent = on ? 'Actiu — els usuaris veuran el modal' : 'Inactiu — la p\u00e0gina \u00e9s accessible';
            status.style.color = on ? '#1d4ed8' : '#64748b';
        };

        // ── Construction toggle state ──
        _firestoreGetDoc(_firestoreDoc(db, 'platform_settings', 'construction_mode')).then(snap => {
            const pages = snap.exists() ? (snap.data().pages || {}) : {};
            setToggleUI(!!pages[slug]);
        }).catch(() => {});

        // Toggle open/close panel
        document.getElementById('nexe-devbar-trigger').addEventListener('click', e => {
            e.stopPropagation();
            const opening = panel.style.display === 'none';
            panel.style.display = opening ? 'block' : 'none';
            if (opening) _loadImpersonationUsers();
        });
        document.addEventListener('click', () => { panel.style.display = 'none'; });
        panel.addEventListener('click', e => e.stopPropagation());

        // Save construction toggle
        toggle.addEventListener('change', async () => {
            const on = toggle.checked;
            setToggleUI(on);
            status.textContent = 'Desant...';
            try {
                const ref  = _firestoreDoc(db, 'platform_settings', 'construction_mode');
                const snap = await _firestoreGetDoc(ref);
                const pages = snap.exists() ? (snap.data().pages || {}) : {};
                pages[slug] = on;
                await _firestoreSetDoc(ref, { pages }, { merge: true });
                setToggleUI(on);
                if (on) { window.Auth._showConstructionModal(); }
                else    { document.getElementById('nexe-construction-modal')?.remove(); }
            } catch(e) {
                status.textContent = '\u274c Error: ' + e.message;
                setToggleUI(!on);
            }
        });

        // ── Impersonation ──
        let _usersLoaded = false;
        const impSelect = document.getElementById('nexe-imp-select');
        const impBtn    = document.getElementById('nexe-imp-btn');
        const impStatus = document.getElementById('nexe-imp-status');

        const _loadImpersonationUsers = async () => {
            if (_usersLoaded) return;
            _usersLoaded = true;
            impStatus.textContent = 'Carregant usuaris...';
            try {
                const { getDocs: _getDocs, collection: _col, query: _q, orderBy: _orderBy } =
                    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                const snap = await _getDocs(_q(_col(db, 'usuarios'), _orderBy('email', 'asc')));
                const myEmail = window.Auth.currentUser?.email || '';
                impSelect.innerHTML = '<option value="">— Selecciona un usuari —</option>';
                snap.forEach(d => {
                    const u = d.data();
                    const email = u.email || d.id;
                    if (email === myEmail) return; // skip self
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.dataset.email = email;
                    opt.dataset.role  = u.role || u.rol || 'user';
                    opt.dataset.perms = JSON.stringify(u.permisos || {});
                    opt.dataset.name  = u.nombre || u.name || email.split('@')[0];
                    opt.textContent   = `${opt.dataset.name} (${email}) — ${opt.dataset.role}`;
                    impSelect.appendChild(opt);
                });
                impStatus.textContent = `${snap.size} usuaris carregats.`;
            } catch(e) {
                impStatus.textContent = '\u274c Error: ' + e.message;
            }
        };

        impBtn.addEventListener('click', () => {
            const opt = impSelect.selectedOptions[0];
            if (!opt || !opt.value) { impStatus.textContent = 'Selecciona un usuari primer.'; return; }
            const targetEmail = opt.dataset.email;
            const targetRole  = opt.dataset.role;
            const targetPerms = JSON.parse(opt.dataset.perms || '{}');
            const targetName  = opt.dataset.name;
            impStatus.textContent = `Emulant ${targetName}...`;
            window.Auth._startImpersonation(targetEmail, targetRole, targetPerms, targetName);
        });
    };
    if (document.body) doInject();
    else document.addEventListener('DOMContentLoaded', doInject, { once: true });
};
