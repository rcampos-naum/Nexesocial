(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'nexeadmin.html';

    const icons = {
        back: `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        menu: `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        home: `<svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        grants: `<svg viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        people: `<svg viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
        insurance: `<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04a11.352 11.352 0 00-1.618 6.016c0 6.627 5.373 12 12 12s12-5.373 12-12a11.352 11.352 0 00-1.618-6.016z"/></svg>`,
        docs: `<svg viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>`,
        vendors: `<svg viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`,
        reports: `<svg viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
        memoria: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        reception: `<svg viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
        logout: `<svg viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>`,
        chevron: `<svg class="group-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`
    };

    function isActive(page) {
        return currentPage === page ? 'active' : '';
    }

    // Which group is active (has an active item)
    function groupHasActive(pages) {
        return pages.includes(currentPage);
    }

    function injectStyles() {
        if (document.getElementById('nexeadmin-sidebar-shared-style')) return;

        const style = document.createElement('style');
        style.id = 'nexeadmin-sidebar-shared-style';
        style.textContent = `
            /* â”€â”€ CUSTOM SCROLLBARS (webkit + firefox) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
            :root {
                --admin-sidebar-width: 270px;
                --admin-sidebar-collapsed-width: 72px;
                --admin-sidebar-bg: #ffffff;
                --admin-sidebar-border: #e2e8f0;
                --admin-sidebar-text: #64748b;
                --admin-sidebar-title: #0f172a;
                --admin-sidebar-accent: #3b82f6;
                --primary: #0f172a;
                --accent: #3b82f6;
                --success: #10b981;
                --warning: #f59e0b;
                --danger: #ef4444;
                --text-main: #1e293b;
                --text-muted: #64748b;
                --bg-body: #f8fafc;
                --border: #e2e8f0;
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 transparent;
            }

            /* Webkit scrollbar global */
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            ::-webkit-scrollbar-corner { background: transparent; }

            /* â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
            body {
                margin: 0;
                background: var(--bg-body);
                color: var(--text-main);
                font-family: 'Inter', sans-serif;
                display: flex;
                min-height: 100vh;
            }

            .admin-sidebar {
                width: var(--admin-sidebar-width) !important;
                min-width: var(--admin-sidebar-width) !important;
                padding: 0 !important;
                background: var(--admin-sidebar-bg) !important;
                border-right: 1px solid var(--admin-sidebar-border) !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                transition: width 0.25s ease, min-width 0.25s ease !important;
                display: flex !important;
                flex-direction: column !important;
                box-sizing: border-box !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                height: 100vh !important;
                z-index: 100 !important;
                scrollbar-width: thin;
                scrollbar-color: #e2e8f0 transparent;
            }
            .admin-sidebar::-webkit-scrollbar { width: 4px; }
            .admin-sidebar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

            /* TOP BAR */
            .admin-sidebar .sidebar-top-bar {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 14px;
                border-bottom: 1px solid var(--admin-sidebar-border);
                background: #fff;
                position: sticky;
                top: 0;
                z-index: 2;
                flex-shrink: 0;
            }

            .admin-sidebar .btn-sidebar-action {
                width: 38px; height: 38px;
                border-radius: 10px;
                border: 1px solid var(--admin-sidebar-border);
                background: #fff;
                color: #475569;
                display: inline-flex; align-items: center; justify-content: center;
                cursor: pointer;
                transition: 0.18s;
                flex-shrink: 0;
            }
            .admin-sidebar .btn-sidebar-action:hover {
                background: #0f172a; color: #fff; border-color: #0f172a;
            }
            .admin-sidebar .btn-sidebar-action svg,
            .admin-sidebar .nav-item svg,
            .admin-sidebar .nav-footer-action svg {
                width: 17px; height: 17px;
                fill: none; stroke: currentColor;
                stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
                flex-shrink: 0;
            }

            /* LOGO */
            .admin-sidebar .logo-box {
                margin: 0 !important;
                padding: 16px 18px 8px;
                flex-shrink: 0;
            }
            .admin-sidebar .logo-img { width: 160px !important; max-width: 100%; }

            /* NAV WRAP */
            .admin-sidebar .nav-wrap {
                padding: 6px 10px 16px;
                flex: 1;
            }

            /* COLLAPSIBLE GROUP */
            .admin-sidebar .nav-group { margin-top: 4px; }

            .admin-sidebar .nav-group-toggle {
                width: 100%;
                display: flex; align-items: center; justify-content: space-between;
                padding: 7px 10px;
                border: none; background: transparent; cursor: pointer;
                font-size: 0.67rem; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.8px; color: #94a3b8;
                border-radius: 8px;
                transition: 0.15s;
                font-family: inherit;
            }
            .admin-sidebar .nav-group-toggle:hover { background: #f8fafc; color: #64748b; }

            .admin-sidebar .nav-group-toggle .group-chevron {
                width: 14px !important; height: 14px !important;
                stroke: currentColor; fill: none; stroke-width: 2.5;
                stroke-linecap: round; stroke-linejoin: round;
                transition: transform 0.2s;
                flex-shrink: 0;
            }
            .admin-sidebar .nav-group.collapsed .group-chevron { transform: rotate(-90deg); }
            .admin-sidebar .nav-group.collapsed .nav-group-items { display: none; }

            .admin-sidebar .nav-group-items {
                display: flex; flex-direction: column; gap: 1px;
                padding-bottom: 2px;
            }

            /* NAV ITEMS */
            .admin-sidebar .nav-item,
            .admin-sidebar .nav-footer-action {
                padding: 10px 12px !important;
                border-radius: 9px;
                display: flex; align-items: center; gap: 11px;
                color: #475569 !important;
                font-weight: 600; font-size: 0.85rem;
                text-decoration: none;
                transition: 0.15s;
                border: none; background: transparent; cursor: pointer;
                width: 100%; text-align: left; box-sizing: border-box;
                line-height: 1.3;
            }
            .admin-sidebar .nav-item:hover,
            .admin-sidebar .nav-footer-action:hover {
                background: #f1f5f9 !important; color: #0f172a !important;
            }
            .admin-sidebar .nav-item.active {
                background: #0f172a !important; color: #fff !important;
            }
            .admin-sidebar .nav-item.active svg { stroke: #fff; }

            /* FOOTER */
            .admin-sidebar .nav-footer {
                margin-top: 0;
                padding: 10px 10px 12px;
                border-top: 1px solid var(--admin-sidebar-border);
                background: #fff;
                position: sticky; bottom: 0;
                flex-shrink: 0;
            }

            /* â”€â”€ COLLAPSED STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
            body.collapsed .admin-sidebar {
                width: var(--admin-sidebar-collapsed-width) !important;
                min-width: var(--admin-sidebar-collapsed-width) !important;
            }
            body.collapsed .admin-sidebar .logo-box,
            body.collapsed .admin-sidebar .nav-group-toggle span,
            body.collapsed .admin-sidebar .group-chevron,
            body.collapsed .admin-sidebar .nav-item span,
            body.collapsed .admin-sidebar .nav-footer-action span {
                display: none !important;
            }
            body.collapsed .admin-sidebar .nav-group-toggle {
                justify-content: center; padding: 7px 0;
            }
            body.collapsed .admin-sidebar .nav-group.collapsed .nav-group-items {
                display: flex !important;
            }
            body.collapsed .admin-sidebar .nav-item,
            body.collapsed .admin-sidebar .nav-footer-action {
                justify-content: center; padding: 10px 0 !important;
            }
            body.collapsed .admin-sidebar .sidebar-top-bar {
                flex-direction: column; gap: 6px;
            }

                        /* -- MAIN CONTENT ----------------------------------------------- */
            .main-content, .content-wrapper {
                margin-left: var(--admin-sidebar-width) !important;
                width: calc(100% - var(--admin-sidebar-width)) !important;
                transition: margin-left 0.25s ease, width 0.25s ease !important;
                box-sizing: border-box; flex-grow: 1;
            }
            body.collapsed .main-content, body.collapsed .content-wrapper {
                margin-left: var(--admin-sidebar-collapsed-width) !important;
                width: calc(100% - var(--admin-sidebar-collapsed-width)) !important;
            }

            /* -- MOBILE HAMBURGER BUTTON ------------------------------------- */
            .mobile-menu-btn {
                display: none; position: fixed; top: 12px; left: 12px; z-index: 200;
                width: 40px; height: 40px; border-radius: 10px;
                border: 1px solid var(--border); background: #fff; color: #475569;
                cursor: pointer; align-items: center; justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: 0.18s;
            }
            .mobile-menu-btn:hover { background: #0f172a; color: #fff; border-color: #0f172a; }
            .mobile-menu-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

            /* -- SIDEBAR BACKDROP (mobile) ----------------------------------- */
            .sidebar-backdrop {
                display: none; position: fixed; inset: 0; z-index: 99;
                background: rgba(15,23,42,0.45); backdrop-filter: blur(3px);
                cursor: pointer;
            }
            body.mobile-open .sidebar-backdrop { display: block; }

            /* -- RESPONSIVE: TABLET (769px to 1024px) ----------------------- */
            @media (max-width: 1024px) and (min-width: 769px) {
                .admin-sidebar { width: var(--admin-sidebar-collapsed-width) !important; min-width: var(--admin-sidebar-collapsed-width) !important; }
                .admin-sidebar .logo-box,
                .admin-sidebar .nav-group-toggle span,
                .admin-sidebar .group-chevron,
                .admin-sidebar .nav-item span,
                .admin-sidebar .nav-footer-action span { display: none !important; }
                .admin-sidebar .nav-group-toggle { justify-content: center; padding: 7px 0; }
                .admin-sidebar .nav-group.collapsed .nav-group-items { display: flex !important; }
                .admin-sidebar .nav-item,
                .admin-sidebar .nav-footer-action { justify-content: center; padding: 10px 0 !important; }
                .admin-sidebar .sidebar-top-bar { flex-direction: column; gap: 6px; }
                .main-content, .content-wrapper {
                    margin-left: var(--admin-sidebar-collapsed-width) !important;
                    width: calc(100% - var(--admin-sidebar-collapsed-width)) !important;
                }
            }

            /* -- RESPONSIVE: MOBILE (max 768px) ----------------------------- */
            @media (max-width: 768px) {
                .admin-sidebar {
                    transform: translateX(-100%) !important;
                    width: 270px !important; min-width: 270px !important;
                    z-index: 150 !important;
                    box-shadow: 4px 0 24px rgba(0,0,0,0.12) !important;
                    transition: width 0.25s ease, min-width 0.25s ease, transform 0.25s ease !important;
                }
                body.mobile-open .admin-sidebar { transform: translateX(0) !important; }
                .admin-sidebar .logo-box { display: flex !important; }
                .admin-sidebar .nav-group-toggle span,
                .admin-sidebar .nav-item span,
                .admin-sidebar .nav-footer-action span { display: flex !important; }
                .admin-sidebar .group-chevron { display: block !important; }
                .admin-sidebar .nav-group-toggle { justify-content: space-between; padding: 7px 10px; }
                .admin-sidebar .nav-item,
                .admin-sidebar .nav-footer-action { justify-content: flex-start; padding: 10px 12px !important; }
                .admin-sidebar .sidebar-top-bar { flex-direction: row; gap: 8px; }
                .main-content, .content-wrapper {
                    margin-left: 0 !important; width: 100% !important;
                    padding-top: 60px !important;
                }
                body.collapsed .admin-sidebar { transform: translateX(-100%) !important; }
                body.collapsed .main-content, body.collapsed .content-wrapper { margin-left: 0 !important; width: 100% !important; }
                .mobile-menu-btn { display: inline-flex !important; }
            }

            /* -- MODALS ------------------------------------------------------ */
            .modal-overlay, .modal-shell {
                position: fixed !important; inset: 0 !important;
                z-index: 30000 !important;
                display: none; justify-content: center; align-items: center;
                background: rgba(15,23,42,0.55) !important;
                backdrop-filter: blur(8px) !important;
            }

            /* -- SVG ICON UTILITY -------------------------------------------- */
            .ui-svg-icon {
                width: 18px; height: 18px; display: inline-block;
                vertical-align: middle; margin-right: 6px;
                fill: none; stroke: currentColor;
                stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
            }
        `;
        document.head.appendChild(style);
    }

    // Groups config: { label, id, pages, items: [{icon, label, href}] }
    const NAV_GROUPS = [
        {
            label: 'Principal', id: 'grp-principal',
            pages: ['nexeadmin.html'],
            items: [
                { icon: icons.home, label: 'Resum Executiu', href: 'nexeadmin.html' }
            ]
        },
        {
            label: 'Gestió Operativa', id: 'grp-gestio',
            pages: ['admin-subvencions.html', 'admin-personal.html', 'nexeadmin-ass.html'],
            items: [
                { icon: icons.grants,    label: 'Subvencions',       href: 'admin-subvencions.html' },
                { icon: icons.people,    label: 'Entitat i accessos', href: 'admin-personal.html' },
                { icon: icons.insurance, label: 'Assegurances',      href: 'nexeadmin-ass.html' }
            ]
        },
        {
            label: 'Administració', id: 'grp-admin',
            pages: ['admin-documents.html', 'admin-proveidors.html', 'nexeadmin-reportes.html', 'nexeadmin-memoria.html'],
            items: [
                { icon: icons.docs,    label: 'Gestió Documental',  href: 'admin-documents.html' },
                { icon: icons.vendors, label: 'Proveïdors i Compres', href: 'admin-proveidors.html' },
                { icon: icons.reports, label: 'Reportes i KPIs',    href: 'nexeadmin-reportes.html' },
                { icon: icons.memoria, label: 'Memòria i Exportació', href: 'nexeadmin-memoria.html' }
            ]
        },
        {
            label: 'Recepció', id: 'grp-recepcio',
            pages: ['admin-recepcio.html', 'admin-solicituds.html'],
            items: [
                { icon: icons.reception, label: "Registre d'Arribades", href: 'admin-recepcio.html' },
                { icon: icons.docs,      label: 'Sol·licituds de Cita', href: 'admin-solicituds.html' }
            ]
        }
    ];

    function getCollapsedGroups() {
        try { return JSON.parse(localStorage.getItem('nexeadmin_collapsed_groups') || '[]'); } catch { return []; }
    }
    function saveCollapsedGroups(arr) {
        localStorage.setItem('nexeadmin_collapsed_groups', JSON.stringify(arr));
    }

    function renderSidebar() {
        let sidebar = document.querySelector('.admin-sidebar');
        if (!sidebar) sidebar = document.querySelector('#sidebar-container');
        if (!sidebar) return;
        sidebar.classList.add('admin-sidebar');

        const collapsed = getCollapsedGroups();

        const groupsHtml = NAV_GROUPS.map(g => {
            const hasActive = groupHasActive(g.pages);
            // Auto-expand group that has the active page
            const isCollapsed = hasActive ? false : collapsed.includes(g.id);
            const itemsHtml = g.items.map(item =>
                `<a href="${item.href}" class="nav-item ${isActive(item.href)}">${item.icon}<span>${item.label}</span></a>`
            ).join('');
            return `
                <div class="nav-group ${isCollapsed ? 'collapsed' : ''}" id="${g.id}">
                    <button class="nav-group-toggle" data-group="${g.id}">
                        <span>${g.label}</span>
                        ${icons.chevron}
                    </button>
                    <div class="nav-group-items">${itemsHtml}</div>
                </div>`;
        }).join('');

        sidebar.innerHTML = `
            <div class="sidebar-top-bar">
                <button class="btn-sidebar-action" id="btnBackToNexeSocial" title="Tornar a NexeSocial">
                    ${icons.back}
                </button>
                <button class="btn-sidebar-action" id="btnToggleAdminSidebar" title="ColÂ·lapsar menÃº">
                    ${icons.menu}
                </button>
            </div>
            <div class="logo-box">
                <img src="../img/nexeadmin.svg" alt="NexeAdmin" class="logo-img">
            </div>
            <div class="nav-wrap">${groupsHtml}</div>
            <div class="nav-footer">
                <button type="button" class="nav-footer-action" id="btnAdminLogout">
                    ${icons.logout}<span>Tancar sessiÃ³</span>
                </button>
            </div>`;

        // Group collapse toggles
        sidebar.querySelectorAll('.nav-group-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                if (document.body.classList.contains('collapsed')) return; // ignore when sidebar is mini
                const grpId = btn.dataset.group;
                const grp = document.getElementById(grpId);
                grp.classList.toggle('collapsed');
                const arr = getCollapsedGroups();
                if (grp.classList.contains('collapsed')) {
                    if (!arr.includes(grpId)) arr.push(grpId);
                } else {
                    const idx = arr.indexOf(grpId);
                    if (idx > -1) arr.splice(idx, 1);
                }
                saveCollapsedGroups(arr);
            });
        });

        // Sidebar collapse toggle
        const isSidebarCollapsed = localStorage.getItem('nexeadmin_sidebar_collapsed') === '1';
        if (isSidebarCollapsed) document.body.classList.add('collapsed');

        document.getElementById('btnToggleAdminSidebar')?.addEventListener('click', () => {
            document.body.classList.toggle('collapsed');
            localStorage.setItem('nexeadmin_sidebar_collapsed', document.body.classList.contains('collapsed') ? '1' : '0');
        });

        document.getElementById('btnBackToNexeSocial')?.addEventListener('click', () => {
            window.location.href = '../home.html';
        });

        document.getElementById('btnAdminLogout')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.Auth?.logout) { window.Auth.logout(); }
            else { localStorage.clear(); window.location.href = '../index.html'; }
        });
    }

    function init() {
        injectStyles();
        renderSidebar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
