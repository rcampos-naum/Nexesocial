/**
 * SIDEBAR NEXEPSY - Componente Todo-en-Uno Refinado
 */
(function() {
    // 1. INYECTAR ESTILOS
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --psy-primary: #6366f1;
            --psy-primary-soft: #eef2ff;
            --psy-sidebar-bg: #ffffff;
            --psy-text-main: #1e293b;
            --psy-text-muted: #64748b;
            --border-color: #e2e8f0;
            --sidebar-width: 280px;
            --sidebar-collapsed-width: 85px;
            --transition-speed: 0.4s;
        }

        .sidebar {
            position: fixed; top: 0; left: 0;
            width: var(--sidebar-width); height: 100vh;
            background: var(--psy-sidebar-bg);
            border-right: 1px solid var(--border-color);
            z-index: 10001; display: flex; flex-direction: column;
            transition: width var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        }

        .sidebar-top-bar {
            padding: 15px; display: flex; align-items: center; gap: 10px;
            border-bottom: 1px solid var(--border-color); background: #fff;
            min-height: 70px; transition: all var(--transition-speed);
        }

        /* BOTONES DE ACCIÓN SUPERIOR (Tornar y Menú) */
        .btn-sidebar-action {
            background: #fff; border: 1px solid var(--border-color);
            border-radius: 10px; padding: 8px; color: var(--psy-primary);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: 0.2s; flex-shrink: 0; width: 38px; height: 38px;
        }

        .btn-sidebar-action svg {
            width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.5px;
        }

        .btn-sidebar-action:hover {
            background: var(--psy-primary); color: #fff; border-color: var(--psy-primary);
        }

        .brand-wrapper { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .logo-nexe { height: 18px; content: url('../img/NexeSocial-logo.png'); }
        .logo-psy { height: 22px; }
        .v-sep { width: 1px; height: 20px; background: var(--border-color); }

        .sidebar-header-label {
            font-size: 0.65rem; text-transform: uppercase; color: var(--psy-text-muted);
            font-weight: 800; letter-spacing: 1.2px; margin: 25px 0 10px 22px;
            white-space: nowrap; transition: opacity 0.3s;
        }

        .nav-item {
            padding: 12px 18px; margin: 0 14px 4px 14px; border-radius: 12px;
            display: flex; align-items: center; gap: 12px;
            color: var(--psy-text-muted); font-weight: 600; font-size: 0.9rem;
            transition: all 0.2s; text-decoration: none; cursor: pointer;
        }

        .nav-item svg { width: 20px; height: 20px; flex-shrink: 0; stroke-width: 2.2px; fill: none; stroke: currentColor; }
        .nav-item:hover { background: #f1f5f9; color: var(--psy-primary); }
        .nav-item.active { background: var(--psy-primary-soft); color: var(--psy-primary); }

        .main-footer {
            position: fixed; bottom: 0; left: var(--sidebar-width);
            width: calc(100% - var(--sidebar-width)); height: 55px;
            padding: 0 35px; display: flex; align-items: center; justify-content: space-between;
            background: rgba(255,255,255,0.8); backdrop-filter: blur(10px);
            border-top: 1px solid var(--border-color);
            color: var(--psy-text-muted); font-size: 0.8rem; z-index: 10000;
            transition: all var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ESTADOS COLAPSADOS */
        body.collapsed .sidebar { width: var(--sidebar-collapsed-width); }
        body.collapsed .sidebar-top-bar { flex-direction: column; padding: 12px 0; height: auto; gap: 10px; }
        body.collapsed .brand-wrapper, body.collapsed .sidebar-header-label, 
        body.collapsed .nav-item span, body.collapsed .v-sep { display: none; }
        body.collapsed .main-footer { left: var(--sidebar-collapsed-width); width: calc(100% - var(--sidebar-collapsed-width)); }
        body.collapsed .nav-item { justify-content: center; margin: 0 12px 6px; padding: 12px 0; }
        
        .heart-svg { width: 14px; height: 14px; fill: #ef4444; margin: 0 4px; vertical-align: middle; }
        .modal, .modal-overlay { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 30000 !important; padding: 14px !important; overflow-y: auto !important; background: rgba(15, 23, 42, 0.58) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; }
        .modal-content { width: min(96vw, 1280px) !important; max-width: 1280px !important; max-height: 94vh !important; min-height: min(78vh, 680px); overflow-y: auto !important; border-radius: 24px !important; }
        .ui-svg-icon { width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 8px; color: currentColor; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    `;
    document.head.appendChild(style);

    // 3. FUNCIÓN PARA INFORME LIBRE
    window.crearInformeLibre = function() {
        localStorage.removeItem('familia_data');
        window.location.href = '../informe-psicosocial.html';
    };

    if (!window.replaceEmojiIconsWithSVG) {
        window.replaceEmojiIconsWithSVG = function(root = document) {
            const replacements = {
                '➕': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
                '⬅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
                '📅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
                '📝': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
                '👥': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
                '⚠️': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
                '✅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
                '🔄': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6l3 2"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6l-3-2"/></svg>'
            };
            root.querySelectorAll('button, a, h1, h2, h3, h4, .btn').forEach((node) => {
                let html = node.innerHTML;
                Object.entries(replacements).forEach(([emoji, svg]) => {
                    html = html.split(emoji).join(svg);
                });
                node.innerHTML = html;
            });
        };
    }

    // 2. INYECTAR HTML
    window.addEventListener('DOMContentLoaded', () => {
        const sidebarHTML = `
            <aside class="sidebar">
                <div class="sidebar-top-bar">
                    <button class="btn-sidebar-action" onclick="window.location.href='../home.html'" title="Tornar">
                        <svg viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="btn-sidebar-action" id="btnToggleSidebar" title="Menú">
                        <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="brand-wrapper">
                        <div class="logo-nexe"></div>
                        <div class="v-sep"></div>
                        <img src="../img/NexePsy.svg" class="logo-psy">
                    </div>
                </div>

                <nav style="flex-grow: 1; padding-top: 15px;">
                    <div class="sidebar-header-label">Intervenció</div>
                    <a href="nexepsy.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>Seguiment Famílies</span>
                    </a>
                    
                    <a href="nexepsy-espera.html" class="nav-item" id="nav-espera">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>Llista d'Espera <span id="sidebar-espera-badge" style="display:none;background:#ef4444;color:white;border-radius:99px;font-size:.65rem;font-weight:800;padding:1px 6px;margin-left:4px;vertical-align:middle;"></span></span>
                    </a>

                    <a href="javascript:void(0)" onclick="crearInformeLibre()" class="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><path d="M10 9H8"/></svg>
                        <span>Informe Lliure</span>
                    </a>

                    <a href="../genograma_editor.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M12 2v8m0 4v8m-7-9h14" stroke-linecap="round"/><circle cx="12" cy="12" r="2"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                        <span>Genograma Lliure</span>
                    </a>
                    <a href="nexepsy-estadistiques.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span>Estadístiques</span>
                    </a>

                    <div class="sidebar-header-label">Administració</div>
                    <a href="logos_financiadors.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span>Logos Finançadors</span>
                    </a>
                </nav>
            </aside>

            <footer class="main-footer">
                <div>© 2026 <b>NexePsy</b> · Suite Psicosocial</div>
                <div>Fet amb <svg class="heart-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
            </footer>
        `;

        document.getElementById('sidebar-container').innerHTML = sidebarHTML;

        // Lógica Active Class
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-item').forEach(item => {
            if(item.getAttribute('href') === currentPath) item.classList.add('active');
        });

        // Toggle Sidebar
        document.getElementById('btnToggleSidebar').addEventListener('click', () => {
            document.body.classList.toggle('collapsed');
        });

        if (window.replaceEmojiIconsWithSVG) {
            window.replaceEmojiIconsWithSVG(document);
        }
    });
})();