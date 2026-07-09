(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'nexesing.html';

    function applyBranding() {
        let icon = document.querySelector('link[rel="icon"]');
        if (!icon) {
            icon = document.createElement('link');
            icon.rel = 'icon';
            icon.type = 'image/svg+xml';
            document.head.appendChild(icon);
        }
        icon.href = '../img/nexesing-icon.svg';
        document.title = currentPage === 'nexesing.html' ? 'NexeSing' : 'NexeSing | Suite de Firmes';
    }

    function injectStyles() {
        if (document.getElementById('nexesing-sidebar-style')) return;
        const style = document.createElement('style');
        style.id = 'nexesing-sidebar-style';
        style.textContent = `
            :root {
                --sing-sidebar-width: 270px;
                --sing-sidebar-collapsed: 74px;
                --sing-bg: #ffffff;
                --sing-border: #e2e8f0;
                --sing-text: #475569;
                --sing-title: #0f172a;
                --sing-accent: #2563eb;
            }
            body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                background: #f8fafc;
                color: var(--sing-title);
                font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
            }
            .main-content {
                margin-left: var(--sing-sidebar-width) !important;
                width: calc(100% - var(--sing-sidebar-width)) !important;
                min-height: 100vh;
                transition: margin-left .25s ease, width .25s ease;
            }
            body.collapsed .main-content {
                margin-left: var(--sing-sidebar-collapsed) !important;
                width: calc(100% - var(--sing-sidebar-collapsed)) !important;
            }
            .sing-sidebar {
                position: fixed;
                top: 0;
                left: 0;
                width: var(--sing-sidebar-width);
                min-width: var(--sing-sidebar-width);
                height: 100vh;
                background: var(--sing-bg);
                border-right: 1px solid var(--sing-border);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                transition: width .25s ease, min-width .25s ease;
            }
            body.collapsed .sing-sidebar {
                width: var(--sing-sidebar-collapsed);
                min-width: var(--sing-sidebar-collapsed);
            }
            .sing-top {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                border-bottom: 1px solid var(--sing-border);
            }
            .sing-btn {
                width: 38px;
                height: 38px;
                border-radius: 10px;
                border: 1px solid var(--sing-border);
                background: #fff;
                color: #334155;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }
            .sing-btn svg {
                width: 18px;
                height: 18px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            .sing-logo {
                padding: 14px 14px 8px;
            }
            .sing-logo img {
                width: 170px;
                max-width: 100%;
                display: block;
            }
            .sing-nav {
                padding: 8px 10px 14px;
                display: grid;
                gap: 4px;
            }
            .sing-link {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 11px;
                border-radius: 9px;
                color: var(--sing-text);
                text-decoration: none;
                font-weight: 700;
                font-size: .85rem;
            }
            .sing-link:hover { background: #f1f5f9; color: var(--sing-title); }
            .sing-link.active { background: #dbeafe; color: #1d4ed8; }
            .sing-link svg {
                width: 17px;
                height: 17px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
                flex-shrink: 0;
            }
            body.collapsed .sing-logo,
            body.collapsed .sing-link span { display: none; }
            body.collapsed .sing-link {
                justify-content: center;
                padding: 10px 0;
            }
            @media (max-width: 768px) {
                .sing-sidebar {
                    transform: translateX(-100%);
                    transition: transform .25s ease;
                }
                .sing-sidebar.mobile-open { transform: translateX(0); }
                .main-content,
                body.collapsed .main-content {
                    margin-left: 0 !important;
                    width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function renderSidebar() {
        const host = document.querySelector('.admin-sidebar') || document.body.insertBefore(document.createElement('aside'), document.body.firstChild);
        host.className = 'sing-sidebar';
        host.innerHTML = `
            <div class="sing-top">
                <button class="sing-btn" id="btn-back-home" title="Tornar a inici">
                    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button class="sing-btn" id="btn-toggle-sing" title="Col-lapsar">
                    <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
            <div class="sing-logo">
                <img src="../img/nexesing.svg" alt="NexeSing">
            </div>
            <nav class="sing-nav">
                <a href="nexesing.html" class="sing-link ${currentPage === 'nexesing.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M3 17c2.5-3 5-3 7.5 0s5 3 7.5 0"/><path d="M15.5 6.5a2.121 2.121 0 0 1 3 3L9 19l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Bustia de Firmes</span>
                </a>
                <a href="test-signature-flow.html" class="sing-link ${currentPage === 'test-signature-flow.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Test Suite</span>
                </a>
                <a href="audit-dashboard.html" class="sing-link ${currentPage === 'audit-dashboard.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <span>Audit</span>
                </a>
                <a href="backfill-funcrole.html" class="sing-link ${currentPage === 'backfill-funcrole.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M12 2v6"/><path d="M12 16v6"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M2 12h6"/><path d="M16 12h6"/><path d="M4.93 19.07l4.24-4.24"/><path d="M14.83 9.17l4.24-4.24"/></svg>
                    <span>Backfill Rol</span>
                </a>
                <a href="user-documentation.html" class="sing-link ${currentPage === 'user-documentation.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10S17.5 6.253 12 6.253z"/><path d="M12 11h.01"/><path d="M12 15h.01"/></svg>
                    <span>Documentació</span>
                </a>
                <a href="../configuracio.html" class="sing-link">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Configurar Flux</span>
                </a>
            </nav>
        `;

        document.getElementById('btn-back-home')?.addEventListener('click', () => {
            window.location.href = '../home.html';
        });

        document.getElementById('btn-toggle-sing')?.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                host.classList.toggle('mobile-open');
                return;
            }
            document.body.classList.toggle('collapsed');
        });
    }

    function init() {
        applyBranding();
        injectStyles();
        renderSidebar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
