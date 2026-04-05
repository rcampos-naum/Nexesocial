// sidebar.js - Gestión Centralizada con NexePsy Integrado
function cargarInterfazBase() {
    const userName = localStorage.getItem('userName') || "Demo";
    
    // 1. ESTILOS ACTUALIZADOS (Incluye el nuevo gradiente NexePsy)
    const styles = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --topbar-bg: #1e293b;
            --sidebar-width: 260px;
            --primary-blue: #2563eb;
            --psy-purple: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            --text-main: #1e293b;
            --text-muted: #64748b;
        }

        body { font-family: 'Inter', sans-serif; margin: 0; }

        .top-bar {
            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
            background: var(--topbar-bg); color: white;
            display: flex; justify-content: space-between; align-items: center;
            padding: 0 25px; z-index: 10000; box-sizing: border-box;
        }

        .sidebar {
            position: fixed; top: 60px; left: 0; width: var(--sidebar-width);
            height: calc(100vh - 60px); background: white;
            border-right: 1px solid #e2e8f0; z-index: 9999;
            padding: 20px 15px; box-sizing: border-box;
            display: flex; flex-direction: column;
        }

        /* Nav Items */
        .nav-item {
            padding: 10px 12px; margin-bottom: 4px; border-radius: 8px;
            display: flex; align-items: center; gap: 12px;
            color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
            transition: all 0.2s ease; text-decoration: none;
        }
        
        .nav-item svg { width: 18px; height: 18px; stroke-width: 2; transition: stroke 0.2s; }
        .nav-item:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-item.active { background: #eff6ff; color: var(--primary-blue); }
        .nav-item.active svg { stroke: var(--primary-blue); }

        /* Estilo Específico NexePsy */
        .nav-item-psy {
            margin-top: 10px;
            border: 1px solid #f1f5f9;
            background: #fafafa;
        }
        .nav-item-psy:hover {
            background: #f5f3ff;
            border-color: #ddd6fe;
        }
        .psy-icon-box {
            width: 24px; height: 24px;
            background: var(--psy-purple);
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 14px; font-weight: bold;
        }

        .user-badge {
            background: rgba(255,255,255,0.1); padding: 6px 15px;
            border-radius: 20px; display: flex; align-items: center; gap: 10px;
            cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
        }

        .user-dropdown {
            display: none; position: absolute; right: 0; top: 50px;
            background: white; min-width: 200px; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
        }
        .user-dropdown a {
            display: flex; align-items: center; gap: 10px; padding: 12px 15px;
            color: var(--text-main); text-decoration: none; font-size: 0.9rem;
        }
        .user-dropdown a:hover { background: #f8fafc; }
        .show-menu { display: block !important; }

        .main-footer {
            margin-left: var(--sidebar-width); padding: 20px;
            background: white; border-top: 1px solid #e2e8f0;
            color: var(--text-muted); font-size: 0.8rem;
        }
    </style>`;

    // 2. ICONS (SVG)
    const icons = {
        home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
        chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
        settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
        data: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
        logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
    };

    // 3. ESTRUCTURA HTML
    const topBarHTML = `
    <header class="top-bar">
        <div style="font-weight:700; color:#3b82f6; letter-spacing:0.5px;">NEXE SOCIAL</div>
        <div class="user-menu-container" style="position:relative;">
            <div class="user-badge" id="userMenuTrigger">
                <div style="width:24px; height:24px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${userName.charAt(0)}</div>
                <span style="font-size:0.85rem; font-weight:600;">${userName}</span>
            </div>
            <div class="user-dropdown" id="userDropdown">
                <a href="perfil.html">${icons.settings} Configuració</a>
                <div style="height:1px; background:#f1f5f9; margin:5px 0;"></div>
                <a href="index.html" style="color:#ef4444;" onclick="localStorage.clear()">${icons.logout} Tancar sessió</a>
            </div>
        </div>
    </header>`;

    const sidebarHTML = `
    <aside class="sidebar">
        <div style="margin-bottom:15px; padding-left:10px;">
            <span style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:1px;">Menú Principal</span>
        </div>
        <nav>
            <a href="home.html" class="nav-item ${window.location.pathname.includes('home') ? 'active' : ''}">${icons.home} <span>Inici</span></a>
            <a href="expedient-detall.html" class="nav-item ${window.location.pathname.includes('expedient') ? 'active' : ''}">${icons.folder} <span>Expedients</span></a>
            <a href="families-llistat.html" class="nav-item ${window.location.pathname.includes('families') ? 'active' : ''}">${icons.users} <span>Famílies</span></a>
            <a href="programes-gestio.html" class="nav-item ${window.location.pathname.includes('programes') ? 'active' : ''}">${icons.chart} <span>Programes</span></a>
            <a href="gestio-avisos.html" class="nav-item ${window.location.pathname.includes('gestio-avisos') ? 'active' : ''}">${icons.bell} <span>Gestió Avisos</span></a>

            <div style="margin-top:20px; padding-left:10px; margin-bottom:10px;">
                <span style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:1px;">Àrees Especials</span>
            </div>
            <a href="nexepsy.html" class="nav-item nav-item-psy">
                <div class="psy-icon-box">ψ</div>
                <span>NexePsy Psicosocial</span>
            </a>

            <div style="height:1px; background:#f1f5f9; margin:15px 0;"></div>

            <a href="manteniment.html" class="nav-item ${window.location.pathname.includes('manteniment') ? 'active' : ''}">${icons.settings} <span>Manteniment</span></a>
            <a href="dades-totals.html" class="nav-item ${window.location.pathname.includes('dades-totals') ? 'active' : ''}">${icons.data} <span>Dades Totals</span></a>
        </nav>
    </aside>`;

    const footerHTML = `
    <footer class="main-footer">
        <span>© 2026 NexeSocial | <strong>Rafa Campos</strong></span>
    </footer>`;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('afterbegin', topBarHTML + sidebarHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Lógica dropdown
    const trigger = document.getElementById('userMenuTrigger');
    const dropdown = document.getElementById('userDropdown');

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show-menu');
        });
    }

    window.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('show-menu');
    });
}

document.addEventListener('DOMContentLoaded', cargarInterfazBase);