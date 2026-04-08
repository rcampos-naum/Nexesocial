// sidebar.js - Gestión Centralizada con NexePsy Integrado y Sidebar Colapsable

function cargarInterfazBase() {
    // Obtenemos el usuario de la sesión activa definida en database.js
    const userSession = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const userName = userSession ? (userSession.displayName || userSession.nombre) : "Demo";
    
    // 1. ESTILOS (Mantengo tus estilos originales)
    const styles = `<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --topbar-bg: #1e293b;
            --sidebar-width: 280px;
            --sidebar-collapsed-width: 70px;
            --primary-blue: #2563eb;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --transition-speed: 0.3s;
        }

        * { box-sizing: border-box; }

        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            background-color: #f8fafc;
            height: 100vh;
            overflow: hidden; 
            display: flex;
            flex-direction: column;
        }

        main, .main-content {
            flex-grow: 1;
            margin-left: var(--sidebar-width);
            margin-top: 60px; 
            margin-bottom: 50px; 
            width: calc(100% - var(--sidebar-width)) !important;
            max-width: calc(100% - var(--sidebar-width));
            overflow-y: auto; 
            overflow-x: hidden;
            transition: all var(--transition-speed) ease;
            padding: 40px;
            display: block;
        }

        body.collapsed main, body.collapsed .main-content {
            margin-left: var(--sidebar-collapsed-width);
            width: calc(100% - var(--sidebar-collapsed-width)) !important;
            max-width: calc(100% - var(--sidebar-collapsed-width));
        }

        .top-bar {
            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
            background: var(--topbar-bg); color: white;
            display: flex; justify-content: space-between; align-items: center;
            padding: 0 20px; z-index: 10002;
        }

        .top-bar-left { display: flex; align-items: center; gap: 15px; }
        .logo-topbar { height: 35px; width: auto; }

        .btn-toggle {
            background: none; border: none; color: white; cursor: pointer;
            padding: 5px; display: flex; align-items: center; justify-content: center;
        }

        .sidebar {
            position: fixed; top: 60px; left: 0; width: var(--sidebar-width);
            height: calc(100vh - 60px);
            background: white;
            border-right: 1px solid #e2e8f0; z-index: 10001;
            padding: 20px 10px; box-sizing: border-box;
            display: flex; flex-direction: column;
            transition: width var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
            overflow-x: hidden;
            overflow-y: auto;
        }

        body.collapsed .sidebar { width: var(--sidebar-collapsed-width); }

        .nav-item {
            padding: 10px 12px; margin-bottom: 4px; border-radius: 8px;
            display: flex; align-items: center; gap: 12px;
            color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
            transition: all 0.2s ease; text-decoration: none;
            white-space: nowrap;
        }
        
        .nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
        .nav-item:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-item.active { background: #eff6ff; color: var(--primary-blue); }
        
        body.collapsed .nav-item span, 
        body.collapsed .sidebar-header-label { display: none; }

        .sidebar-header-label {
            font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);
            font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; padding-left: 10px;
        }

        .nav-item-psy { 
            margin-top: 10px; border: 1px solid #f1f5f9; background: #fafafa; 
            padding: 0; height: 60px; display: flex; align-items: center;
            overflow: hidden; border-radius: 8px; transition: all var(--transition-speed);
            cursor: pointer;
        }
        .nav-item-psy img { width: 100%; height: 100%; object-fit: contain; }
        body.collapsed .nav-item-psy { width: 50px; margin: 10px auto; }

        .user-badge {
            background: rgba(255,255,255,0.08); padding: 5px 12px;
            border-radius: 12px; display: flex; align-items: center; gap: 8px;
            cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
            transition: 0.2s;
        }
        .user-badge:hover { background: rgba(255,255,255,0.15); }

        .user-dropdown {
            display: none; position: absolute; right: 0; top: 50px;
            background: white; min-width: 200px; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .user-dropdown.show-menu { display: block; }
        .user-dropdown a { 
            display: flex; align-items: center; gap: 10px; padding: 10px 15px;
            text-decoration: none; color: var(--text-main); font-size: 0.85rem;
            transition: 0.2s;
        }
        .user-dropdown a:hover { background: #f8fafc; }
        .user-dropdown svg { width: 16px; height: 16px; opacity: 0.7; }

        .main-footer {
            position: fixed; bottom: 0; left: var(--sidebar-width);
            width: calc(100% - var(--sidebar-width));
            height: 50px; padding: 0 30px; display: flex;
            align-items: center; justify-content: space-between;
            background: white; border-top: 1px solid #e2e8f0;
            color: var(--text-muted); font-size: 0.8rem; z-index: 10000;
            transition: all var(--transition-speed) ease;
        }

        body.collapsed .main-footer {
            left: var(--sidebar-collapsed-width);
            width: calc(100% - var(--sidebar-collapsed-width));
        }

        .footer-signature {
            display: flex; align-items: center; gap: 6px;
            background: #f1f5f9; padding: 4px 12px;
            border-radius: 20px; border: 1px solid #e2e8f0;
        }
        .heart-svg { width: 14px; height: 14px; fill: none; stroke: #ef4444; stroke-width: 2; }

        .modal-psynexe-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center;
            z-index: 20000; animation: fadeInModal 0.3s ease;
        }
        .modal-psynexe {
            background: white; width: 90%; max-width: 400px; border-radius: 16px;
            padding: 30px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .modal-psynexe-icon {
            width: 60px; height: 60px; background: #fee2e2; color: #ef4444;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px; font-size: 30px; font-weight: bold;
        }
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
    </style>`;

    const icons = {
        menuToggle: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="18" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
        heart: `<svg class="heart-svg" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
        chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
        settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
        data: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
        logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
    };

    const topBarHTML = `
    <header class="top-bar">
        <div class="top-bar-left">
            <button class="btn-toggle" id="sidebarToggle">${icons.menuToggle}</button>
            <img src="img/NexeSocial-logo.png" class="logo-topbar" alt="Nexe Social">
        </div>
        <div class="user-menu-container" style="position:relative;">
            <div class="user-badge" id="userMenuTrigger">
                <div style="width:24px; height:24px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0;">${userName.charAt(0)}</div>
                <span style="font-size:0.8rem; font-weight:600; white-space:nowrap;">${userName}</span>
            </div>
            <div class="user-dropdown" id="userDropdown">
                <a href="perfil.html">${icons.settings} Configuració</a>
                <div style="height:1px; background:#f1f5f9; margin:0;"></div>
                <a href="#" style="color:#ef4444;" id="logoutBtn">${icons.logout} Tancar sessió</a>
            </div>
        </div>
    </header>`;

    const sidebarHTML = `
    <aside class="sidebar" id="mainSidebar">
        <div class="sidebar-header-label">Menú Principal</div>
        <nav>
            <a href="home.html" class="nav-item ${window.location.pathname.includes('home') ? 'active' : ''}">${icons.home} <span>Inici</span></a>
            <a href="expedient-detall.html" class="nav-item ${window.location.pathname.includes('expedient') ? 'active' : ''}">${icons.folder} <span>Expedients</span></a>
            <a href="families-llistat.html" class="nav-item ${window.location.pathname.includes('families') ? 'active' : ''}">${icons.users} <span>Famílies</span></a>
            <a href="programes-gestio.html" class="nav-item ${window.location.pathname.includes('programes') ? 'active' : ''}">${icons.chart} <span>Programes</span></a>
            <a href="gestio-avisos.html" class="nav-item ${window.location.pathname.includes('gestio-avisos') ? 'active' : ''}">${icons.bell} <span>Gestió Avisos</span></a>

            <div class="sidebar-header-label" style="margin-top:20px;">Àrees Especials</div>
            <a href="javascript:void(0)" onclick="verificarAccesoPsy()" class="nav-item nav-item-psy">
                <img src="img/NexePsy.svg" alt="NexePsy Suite">
            </a>

            <div style="height:1px; background:#f1f5f9; margin:15px 0;"></div>

            <a href="manteniment.html" class="nav-item ${window.location.pathname.includes('manteniment') ? 'active' : ''}">${icons.settings} <span>Manteniment</span></a>
            <a href="dades-totals.html" class="nav-item ${window.location.pathname.includes('dades-totals') ? 'active' : ''}">${icons.data} <span>Dades Totals</span></a>
        </nav>
    </aside>`;

    const footerHTML = `
    <footer class="main-footer">
        <span>© 2026 NexeSocial</span>
        <div class="footer-signature">
            <span>desarrollado con amor</span> ${icons.heart} <span>por <strong>RafaCG</strong></span>
        </div>
    </footer>
    
    <div id="psyModalError" class="modal-psynexe-overlay">
        <div class="modal-psynexe">
            <div class="modal-psynexe-icon">✕</div>
            <h3>Permís denegat</h3>
            <p>No teniu els permisos necessaris per accedir a la suite de PsyNexe. Si creieu que es tracta d'un error, per favor contacteu amb l'administrador del sistema.</p>
            <button class="btn-modal-psynexe" onclick="document.getElementById('psyModalError').style.display='none'">Tancar</button>
        </div>
    </div>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('afterbegin', topBarHTML + sidebarHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Eventos
    document.getElementById('sidebarToggle')?.addEventListener('click', () => document.body.classList.toggle('collapsed'));
    document.getElementById('userMenuTrigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('show-menu');
    });
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if(typeof Auth !== 'undefined') Auth.logout();
        else { localStorage.clear(); window.location.href = "index.html"; }
    });

    window.addEventListener('click', () => document.getElementById('userDropdown')?.classList.remove('show-menu'));
}

// --- FUNCIÓN ACTUALIZADA: VERIFICACIÓN CON AUTH ---
function verificarAccesoPsy() {
    // Usamos el objeto Auth de database.js para verificar acceso
    if (typeof Auth !== 'undefined') {
        const user = Auth.getUser();
        
        // Si no hay usuario, mandamos al login
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Si es Admin Total o tiene permiso específico 'user'/'admin' en psy
        const permiso = user.permisos ? user.permisos.psy : null;
        
        if (user.role === 'admin' || user.email === 'admin@nexesocial.com' || (permiso && permiso !== 'none')) {
            window.location.href = 'nexepsy.html';
        } else {
            document.getElementById('psyModalError').style.display = 'flex';
        }
    } else {
        // Fallback por si database.js no cargó
        console.error("Auth system not loaded");
        document.getElementById('psyModalError').style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', cargarInterfazBase);