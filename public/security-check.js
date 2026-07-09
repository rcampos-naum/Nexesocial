// security-check.js - Verificación centralizada de acceso a módulos especiales
// Usado por: NexePsy, NexeAdmin, NexeAudit

// IMPORTANT: getSecurityUser is used ONLY for display purposes (name, email).
// Security decisions always use window.Auth directly (never stale localStorage).
window.getSecurityUser = function() {
    if (window.Auth?.isReady && window.Auth.getUser) {
        const authUser = window.Auth.getUser();
        if (authUser?.email) return authUser;
    }
    // Fallback for display only — NOT used for access decisions
    const email = localStorage.getItem('userEmail');
    if (!email) return null;
    const role = localStorage.getItem('userRole') || 'user';
    const displayName = localStorage.getItem('userName') || email.split('@')[0] || 'Usuari';
    const permisos = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    return { email, role, displayName, nombre: displayName, permisos };
};

window.checkModuleAccess = async function(moduleName) {
    console.log(`🔐 Verificando acceso a ${moduleName}...`);

    const needsAuthManager = !window.Auth
        || typeof window.Auth.initialize !== 'function'
        || typeof window.Auth.getUser !== 'function'
        || typeof window.Auth.hasAccessTo !== 'function';

    // Ensure we always use auth-manager (database.js can expose a partial Auth object).
    if (needsAuthManager) {
        try {
            const isSubDir = ['/NexeAdmin/', '/NexePsy/', '/NexeAudit/'].some(d => window.location.pathname.includes(d));
            await import(isSubDir ? '../auth-manager.js' : './auth-manager.js');
        } catch (e) {
            console.error('Failed to load auth-manager:', e);
        }
    }

    if (!window.Auth || typeof window.Auth.initialize !== 'function') {
        console.log('❌ window.Auth never loaded — redirecting to login');
        window.location.replace(window.location.pathname.includes('/Nexe') ? '../index.html' : 'index.html');
        return false;
    }

    // Wait for full initialization — await the promise directly, no arbitrary timeout
    try {
        await window.Auth.initialize();
    } catch (e) {
        console.error('Auth init error:', e);
    }
    const firebaseUser = window.Auth.currentUser || window.Auth.getUser?.();
    if (!firebaseUser) {
        console.log('❌ No authenticated user — redirecting to login');
        window.location.replace('../index.html');
        return false;
    }

    const role  = window.Auth.userRole  || 'user';
    const perms = window.Auth.userPermissions || {};
    const matrixPerms = (() => {
        try { return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); } catch { return {}; }
    })();
    const normalizedModule = String(moduleName || '').toLowerCase();
    const moduleKey = normalizedModule.includes('psy') ? 'psy'
        : normalizedModule.includes('admin') ? 'admin'
        : normalizedModule.includes('audit') ? 'audit'
        : normalizedModule;

    let hasAccess = false;

    switch (normalizedModule) {
        case 'psy':
        case 'nexepsy':
            hasAccess = role === 'admin' || role === 'superadmin' || role === 'psicolog' ||
                        (perms.psy && perms.psy !== 'none') ||
                        matrixPerms.psyRead === true || matrixPerms.psyEdit === true ||
                        window.Auth.hasAccessTo('psy');
            break;

        case 'admin':
        case 'nexeadmin':
            hasAccess = role === 'admin' || role === 'superadmin' ||
                        (perms.admin && perms.admin !== 'none') ||
                        matrixPerms.configSistema === true || matrixPerms.altaBaixaTreballadors === true ||
                        window.Auth.hasAccessTo('admin');
            break;

        case 'audit':
        case 'nexeaudit':
        case 'nexeauditsuite':
            hasAccess = role === 'admin' || role === 'superadmin' || role === 'auditor' ||
                        (perms.audit && perms.audit !== 'none') ||
                        matrixPerms.verAudit === true ||
                        window.Auth.hasAccessTo('audit');
            break;

        default:
            console.warn(`Módulo desconocido: ${moduleName}`);
            hasAccess = window.Auth.hasAccessTo(moduleKey);
    }

    if (hasAccess) {
        console.log(`✅ Acceso permitido a ${moduleName} para: ${firebaseUser.email} (rol: ${role})`);
        return true;
    } else {
        console.log(`🔒 Acceso DENEGADO a ${moduleName}. Email: ${firebaseUser.email}, Rol: ${role}`);
        mostrarModalAccesoDenegado(moduleName);
        setTimeout(() => { window.location.href = '../home.html'; }, 3000);
        return false;
    }
};

// Mostrar modal de acceso denegado
window.mostrarModalAccesoDenegado = function(moduleName) {
    console.log(`📋 Mostrando modal de acceso denegado para: ${moduleName}`);
    
    // Crear modal si no existe
    if (!document.getElementById('security-modal')) {
        const modal = document.createElement('div');
        modal.id = 'security-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 20000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white; width: 90%; max-width: 400px;
            border-radius: 16px; padding: 30px; text-align: center;
            box-shadow: 0 20px 60px -10px rgba(0,0,0,0.15);
        `;
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
            <h3 style="margin: 0 0 10px; font-size: 1.3rem; color: #0f172a;">Permís Denegat</h3>
            <p style="color: #64748b; margin-bottom: 25px;">
                No teniu permisos per accedir a <strong>${moduleName}</strong>. 
                Si creieu que és un error, contacteu amb l'administrador.
            </p>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px;">
                Redirigint a Inici en 3 segons...
            </p>
            <button onclick="window.location.href='../home.html'" 
                style="background: #3b82f6; color: white; border: none; 
                padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Anar a Inici Ara
            </button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    const modal = document.getElementById('security-modal');
    modal.style.display = 'flex';
};

// Verificación automática al cargar la página
window.initModuleSecurityCheck = function(moduleName) {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.checkModuleAccess(moduleName);
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.toLowerCase();

    if (path.includes('/nexepsy/')) {
        await window.checkModuleAccess('NexePsy');
    } else if (path.includes('/nexeadmin/')) {
        await window.checkModuleAccess('NexeAdmin');
    } else if (path.includes('/nexeaudit/')) {
        await window.checkModuleAccess('NexeAudit');
    }
});

console.log('✅ security-check.js cargado');
