// sidebar.js - Gestión Centralizada de Interfaz (Top Bar + Sidebar)
function cargarInterfazBase() {
    const userName = localStorage.getItem('userName') || "Demo";
    
    // 1. ESTILOS INYECTADOS
    const styles = `
    <style>
        :root {
            --topbar-bg: #1e293b;
            --sidebar-width: 260px;
            --primary-blue: #2563eb;
            --text-main: #1e293b;
            --text-muted: #64748b;
        }

        /* Top Bar */
        .top-bar {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important; height: 60px !important;
            background: var(--topbar-bg) !important;
            color: white !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 0 25px !important;
            z-index: 10000 !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
            box-sizing: border-box !important;
            font-family: 'Inter', sans-serif;
        }

        /* Sidebar */
        .sidebar {
            position: fixed !important;
            top: 60px !important; left: 0 !important;
            width: var(--sidebar-width) !important;
            height: calc(100vh - 60px) !important;
            background: white !important;
            border-right: 1px solid #e2e8f0 !important;
            z-index: 9999 !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
        }

        /* Ajuste de Contenido Principal */
        .main-content {
            margin-left: var(--sidebar-width) !important;
            margin-top: 60px !important;
            padding: 30px !important;
            min-height: calc(100vh - 60px);
            background: #f8fafc;
        }

        .user-dropdown {
            display: none;
            position: absolute;
            right: 0; top: 50px;
            background: white;
            min-width: 200px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            border-radius: 12px;
            z-index: 10001;
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .user-dropdown a {
            display: block;
            padding: 12px 20px;
            color: var(--text-main);
            text-decoration: none;
            font-size: 0.9rem;
            transition: 0.2s;
        }
        .user-dropdown a:hover { background: #f1f5f9; color: var(--primary-blue); }
        .show-menu { display: block !important; }

        /* Navegación Lateral */
        .nav-item {
            padding: 12px 15px;
            margin-bottom: 8px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text-muted);
            font-weight: 500;
            transition: 0.2s;
            text-decoration: none;
        }
        .nav-item:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-item.active { background: var(--primary-blue) !important; color: white !important; }
        
        .user-badge {
            background: rgba(255,255,255,0.1);
            padding: 8px 18px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.2);
        }

        /* Footer */
        .main-footer {
            margin-left: var(--sidebar-width);
            padding: 20px;
            background: white;
            border-top: 1px solid #e2e8f0;
            color: var(--text-muted);
            font-size: 0.85rem;
        }
        .footer-content { display: flex; justify-content: space-between; }
    </style>`;

    // 2. ESTRUCTURA HTML
    const topBarHTML = `
    <header class="top-bar">
        <div style="font-weight:800; color:#3b82f6; letter-spacing:1px; cursor:default;">NEXE SOCIAL | GESTIÓ INTEGRAL</div>
        <div class="user-menu-container" style="position:relative;">
            <div class="user-badge" id="userMenuTrigger">
                <span style="font-size:1.1rem;">👤</span>
                <span style="font-size:0.9rem; font-weight:600;">${userName}</span>
                <div style="width:8px; height:8px; background:#10b981; border-radius:50%;"></div>
            </div>
            <div class="user-dropdown" id="userDropdown">
                <a href="perfil.html">👤 El meu Perfil</a>
                <a href="configuracio.html">⚙️ Configuració Centre</a>
                <div style="height:1px; background:#f1f5f9; margin:5px 0;"></div>
                <a href="index.html" style="color:#ef4444; font-weight:bold;" onclick="localStorage.clear()">🚪 Tancar sessió</a>
            </div>
        </div>
    </header>`;

    const sidebarHTML = `
    <aside class="sidebar">
        <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #f1f5f9; margin-bottom:20px;">
            <img src="img/NexeSocial-logo.png" alt="Logo" style="width:140px;">
        </div>
        <nav>
            <a href="home.html" class="nav-item ${window.location.pathname.includes('home.html') ? 'active' : ''}">🏠 <span>Inici</span></a>
            
            <a href="expedient-detall.html" class="nav-item ${window.location.pathname.includes('expedient') ? 'active' : ''}">📁 <span>Expedients</span></a>
            
            <a href="programes-gestio.html" class="nav-item ${window.location.pathname.includes('programes') ? 'active' : ''}">📊 <span>Programes</span></a>

            <a href="gestio-avisos.html" class="nav-item ${window.location.pathname.includes('gestio-avisos') ? 'active' : ''}">📢 <span>Gestió Avisos</span></a>

            <a href="manteniment.html" class="nav-item ${window.location.pathname.includes('manteniment') ? 'active' : ''}">🛠️ <span>Manteniment</span></a>

            <a href="dades-totals.html" class="nav-item ${window.location.pathname.includes('dades-totals') ? 'active' : ''}">📈 <span>Dades Totals</span></a>
        </nav>
    </aside>`;

    const footerHTML = `
    <footer class="main-footer">
        <div class="footer-content">
            <span>© 2026 NexeSocial - Sistema de Gestió</span>
            <span class="author-tag">Desenvolupat amb ❤️ per <strong>Rafa Campos</strong></span>
        </div>
    </footer>`;

    // 3. INYECCIÓN EN EL DOM
    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('afterbegin', topBarHTML + sidebarHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // 4. LÓGICA DE INTERACCIÓN
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

// Inicialización
document.addEventListener('DOMContentLoaded', cargarInterfazBase);