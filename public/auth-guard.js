// auth-guard.js - Thin auth guard + isAllowed() access control for group/resource access
// Importing auth-manager triggers onAuthStateChanged which redirects unauthenticated users.
import './auth-manager.js';

/**
 * isAllowed(user, context) — Golden Rule access control check.
 *
 * Rules:
 *  - Admin / Direccio → always allowed
 *  - Coordinador → allowed if resource.deptId is in user's scope (or no scope restriction)
 *  - Tecnic/Educador → allowed if groupId matches an assigned group OR if there's an
 *    active reinforcement in coordinacio_reforcos for today with workerId = uid
 *  - Voluntari → same as tecnic but checked via extraPerms flag or explicit group assignment
 *
 * @param {object} user     - { uid, role, roles[], scope[], extraPerms{} }
 * @param {object} context  - { groupId?, deptId?, todayReforcos? }
 * @returns {boolean}
 */
window.isAllowed = function isAllowed(user, context = {}) {
    if (!user) return false;

    const role  = user.role  || localStorage.getItem('userRole') || 'user';
    const roles = user.roles || (() => { try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch { return []; } })();
    const scope = user.scope || [];
    const ep    = user.extraPerms || (() => { try { return JSON.parse(localStorage.getItem('userExtraPerms') || '{}'); } catch { return {}; } })();
    const uid   = user.uid || null;

    const isAdmin     = role === 'admin' || roles.includes('admin_sistema') || roles.includes('direccio');
    const isCoord     = role === 'editor' || roles.includes('coordinador');
    const isTecnic    = role === 'tecnic' || roles.includes('tecnic') || roles.includes('manteniment') || roles.includes('administracio');
    const isVoluntari = role === 'voluntari' || roles.includes('voluntari');

    // 1. Admin → always yes
    if (isAdmin) return true;

    // 2. Coordinador → check scope (array of dept IDs)
    if (isCoord) {
        if (!context.deptId) return true; // no restriction specified
        if (!scope.length)   return true; // no scope set yet → permissive fallback
        return scope.includes(context.deptId);
    }

    // 3. Tecnic / Educador
    if (isTecnic) {
        // Explicit group assignment
        if (context.groupId && context.assignedGroups?.includes(context.groupId)) return true;
        // Active reinforcement today
        if (context.todayReforcos?.some(r => r.workerId === uid && r.groupId === context.groupId)) return true;
        // No group context → allow to general area
        if (!context.groupId) return true;
        return false;
    }

    // 4. Voluntari — same logic as tecnic but more restrictive (must have explicit assignment)
    if (isVoluntari) {
        if (context.groupId && context.assignedGroups?.includes(context.groupId)) return true;
        if (context.todayReforcos?.some(r => r.workerId === uid && r.groupId === context.groupId)) return true;
        return false;
    }

    // Default — deny
    return false;
};

/**
 * requirePermission(permKey) — Check if the current user has a specific matrix permission.
 * Falls back to localStorage cached matrix (set by admin-permisos.html on save).
 *
 * @param {string} permKey  - e.g. 'crearDepts', 'diariAulaAssistencia', 'verAlumnesTots'
 * @returns {boolean}
 */
window.requirePermission = function requirePermission(permKey) {
    const role  = localStorage.getItem('userRole') || 'user';
    const roles = (() => { try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch { return []; } })();
    const matrixRoles = (() => { try { return JSON.parse(localStorage.getItem('userMatrixRoles') || '[]'); } catch { return []; } })();
    const matrixPerms = (() => { try { return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); } catch { return {}; } })();
    const ep    = (() => { try { return JSON.parse(localStorage.getItem('userExtraPerms') || '{}'); } catch { return {}; } })();
    const matrix = (() => { try { return JSON.parse(localStorage.getItem('nexe_rolePermissions') || '{}'); } catch { return {}; } })();

    const isAdmin = role === 'admin' || roles.includes('admin_sistema') || roles.includes('direccio');
    if (isAdmin) return true;

    // First preference: effective per-user matrix permissions resolved at login.
    if (matrixPerms?.[permKey] === true) return true;

    // Map system role to matrix key
    const matrixRoleKey = (() => {
        if (matrixRoles.includes('admin')) return 'admin';
        if (matrixRoles.includes('directora')) return 'directora';
        if (matrixRoles.includes('coordinador')) return 'coordinador';
        if (matrixRoles.includes('tecnic')) return 'tecnic';
        if (matrixRoles.includes('voluntari')) return 'voluntari';
        if (roles.includes('direccio')) return 'directora';
        if (roles.includes('coordinador')) return 'coordinador';
        if (roles.includes('tecnic') || roles.includes('manteniment') || roles.includes('administracio')) return 'tecnic';
        if (roles.includes('voluntari')) return 'voluntari';
        return null;
    })();

    // Check matrix
    if (matrixRoleKey && matrix[matrixRoleKey]?.[permKey] === true) return true;

    // Check extra perms exception (individual overrides)
    const epMap = {
        'verAlumnesTots': ep.pot_veure_informes_globals,
        'altaBaixaTreballadors': ep.pot_gestio_personal,
    };
    if (epMap[permKey] === true) return true;

    return false;
};
