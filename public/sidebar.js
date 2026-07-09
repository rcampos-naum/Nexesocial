// sidebar.js - Gestión Centralizada con NexePsy Integrado y Sidebar Colapsable
// Importar auth-manager para tener acceso a window.Auth global
import './auth-manager.js';
import './firebase-bootstrap.js';
import './signature-flow.js';
import { db } from './firebase-config.js';
import { collection, onSnapshot, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Inject critical layout CSS synchronously at parse time so content never renders
// at full-width before the sidebar pushes it — eliminates the layout jump.
(function injectLayoutCSS() {
    if (document.getElementById('nexesocial-layout-critical')) return;
    const s = document.createElement('style');
    s.id = 'nexesocial-layout-critical';
    s.textContent = `
        :root {
            --sidebar-width: 280px;
            --sidebar-collapsed-width: 70px;
            --transition-speed: 0.3s;
        }
        body {
            font-family: Inter, system-ui, sans-serif;
            margin: 0;
            background: #f8fafc;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        main, .main-content, .main-wrapper {
            flex-grow: 1;
            margin-left: var(--sidebar-width);
            margin-top: 60px;
            margin-bottom: 50px;
            width: calc(100% - var(--sidebar-width)) !important;
            max-width: calc(100% - var(--sidebar-width));
            overflow-y: auto;
            overflow-x: hidden;
            transition: margin-left var(--transition-speed) ease, width var(--transition-speed) ease;
            padding: 40px;
            display: block;
        }
        body.collapsed main, body.collapsed .main-content, body.collapsed .main-wrapper {
            margin-left: var(--sidebar-collapsed-width);
            width: calc(100% - var(--sidebar-collapsed-width)) !important;
            max-width: calc(100% - var(--sidebar-collapsed-width));
        }
    `;
    // Prepend to <head> so it applies before any page content paints
    if (document.head) {
        document.head.prepend(s);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.head.prepend(s), { once: true });
    }
})();

async function cargarInterfazBase(options = {}) {
    const force = options && options.force === true;

    if (!force && (document.getElementById('mainSidebar') || document.querySelector('.top-bar'))) {
        return;
    }

    if (force) {
        document.getElementById('mainSidebar')?.remove();
        document.querySelector('.top-bar')?.remove();
        document.querySelector('.main-footer')?.remove();
        document.getElementById('notifDetailModal')?.remove();
        document.getElementById('notifPreviewHost')?.remove();
        document.querySelector('.mobile-sidebar-backdrop')?.remove();
        document.getElementById('sidebar-flyout')?.remove();
    }

    // Use cached values immediately — no waiting for Firebase
    let userName = localStorage.getItem('userName') || '·';
    let userEmail = localStorage.getItem('userEmail') || '';

    // Inject Google Fonts as <link> (faster than CSS @import)
    if (!document.getElementById('nexesocial-gfonts')) {
        const preconn1 = document.createElement('link'); preconn1.rel = 'preconnect'; preconn1.href = 'https://fonts.googleapis.com'; document.head.prepend(preconn1);
        const preconn2 = document.createElement('link'); preconn2.rel = 'preconnect'; preconn2.href = 'https://fonts.gstatic.com'; preconn2.crossOrigin = ''; document.head.prepend(preconn2);
        const gfont = document.createElement('link'); gfont.id = 'nexesocial-gfonts'; gfont.rel = 'stylesheet'; gfont.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; document.head.appendChild(gfont);
    }

    const styles = `<style>
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

        main, .main-content, .main-wrapper {
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

        body.collapsed main, body.collapsed .main-content, body.collapsed .main-wrapper {
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
        .top-bar-right { display: flex; align-items: center; gap: 10px; }
        .logo-topbar { height: 35px; width: auto; }

        .notif-trigger {
            width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2);
            background: rgba(255,255,255,.08); color: white; display: flex; align-items: center; justify-content: center;
            cursor: pointer; position: relative; transition: .2s;
        }
        .notif-trigger:hover { background: rgba(255,255,255,.16); }
        .notif-trigger svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; }
        .notif-trigger.ringing { animation: bell-ring 0.7s ease-in-out 2; }
        @keyframes bell-ring {
            0% { transform: rotate(0deg); }
            15% { transform: rotate(-12deg); }
            30% { transform: rotate(10deg); }
            45% { transform: rotate(-8deg); }
            60% { transform: rotate(6deg); }
            100% { transform: rotate(0deg); }
        }
        .notif-badge {
            position: absolute; top: -4px; right: -3px; min-width: 18px; height: 18px; border-radius: 99px;
            background: #ef4444; color: white; font-size: 0.68rem; font-weight: 800; display: none;
            align-items: center; justify-content: center; padding: 0 5px; border: 2px solid #1e293b;
        }

        .notif-panel {
            position: absolute; top: 48px; right: 0; width: 360px; max-width: calc(100vw - 20px);
            background: white; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 14px;
            box-shadow: 0 18px 40px rgba(15,23,42,.25); display: none; overflow: hidden; z-index: 10050;
        }
        .notif-panel.show { display: block; }
        .notif-head {
            padding: 12px 14px; border-bottom: 1px solid #eef2f7; display: flex; align-items: center; justify-content: space-between;
            background: #f8fafc;
        }
        .notif-list { max-height: 360px; overflow-y: auto; }
        .notif-item {
            width: 100%; text-align: left; border: none; border-bottom: 1px solid #f1f5f9; background: white; cursor: pointer;
            padding: 12px 14px; display: grid; gap: 4px;
        }
        .notif-item:hover { background: #f8fafc; }
        .notif-item.unread { background: #eff6ff; }
        .notif-title { font-weight: 800; font-size: 0.84rem; color: #0f172a; }
        .notif-body { font-size: 0.77rem; color: #64748b; line-height: 1.35; }
        .notif-meta { font-size: 0.7rem; color: #94a3b8; }
        .notif-empty { padding: 20px; text-align: center; color: #94a3b8; font-size: 0.82rem; }

        #notifPreviewHost {
            position: fixed; top: 72px; right: 18px; z-index: 10060;
            display: grid; gap: 8px; max-width: 360px;
        }
        .notif-preview {
            background: #ffffff; border: 1px solid #dbeafe; border-left: 4px solid #3b82f6;
            border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.2);
            padding: 10px 12px; animation: notif-slide-in .22s ease-out;
        }
        .notif-preview-title { font-size: 0.82rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .notif-preview-body { font-size: 0.76rem; color: #64748b; line-height: 1.35; }
        @keyframes notif-slide-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        #notifDetailModal {
            position: fixed; inset: 0; background: rgba(2,6,23,.58); backdrop-filter: blur(3px);
            z-index: 10070; display: none; align-items: center; justify-content: center;
        }
        #notifDetailModal .notif-detail-card {
            width: min(460px, 92vw); background: white; border-radius: 16px; box-shadow: 0 25px 50px rgba(2,6,23,.35);
            padding: 22px;
        }
        #notifDetailModal .notif-detail-title { margin: 0 0 8px; color: #0f172a; font-size: 1.1rem; }
        #notifDetailModal .notif-detail-body { margin: 0; color: #475569; line-height: 1.45; font-size: 0.92rem; }
        #notifDetailModal .notif-detail-meta { margin-top: 10px; color: #94a3b8; font-size: 0.8rem; }
        #notifDetailModal .notif-detail-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
        #notifDetailModal .btn-detail {
            border: none; border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        #notifDetailModal .btn-detail-muted { background: #e2e8f0; color: #334155; }
        #notifDetailModal .btn-detail-primary { background: #2563eb; color: white; }

        .btn-toggle {
            background: none; border: none; color: white; cursor: pointer;
            padding: 5px; display: flex; align-items: center; justify-content: center;
        }

        .sidebar {
            position: fixed; top: 60px; left: 0; width: var(--sidebar-width);
            height: calc(100vh - 60px);
            background: white; border-right: 1px solid #e2e8f0; z-index: 10001;
            padding: 20px 10px; box-sizing: border-box; display: flex; flex-direction: column;
            transition: width var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
            overflow-x: hidden; overflow-y: auto;
        }

        body.collapsed .sidebar { width: var(--sidebar-collapsed-width); }

        .nav-item {
            padding: 10px 12px; margin-bottom: 4px; border-radius: 8px;
            display: flex; align-items: center; gap: 12px;
            color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
            transition: all 0.2s ease; text-decoration: none; white-space: nowrap;
        }
        
        .nav-item svg { width: 20px; height: 20px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .nav-item:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-item.active { background: #eff6ff; color: var(--primary-blue); }
        
        body.collapsed .nav-item span, 
        body.collapsed .sidebar-header-label { display: none; }

        .sidebar-header-label {
            font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);
            font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; padding-left: 10px; margin-top: 15px;
        }

        .special-areas-wrap {
            display: grid;
            gap: 8px;
        }
        .special-area-btn {
            width: 100%;
            height: 58px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fafafa;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            cursor: pointer;
            transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, opacity .2s ease;
        }
        .special-area-btn:hover {
            border-color: var(--primary-blue);
            background: #f0f7ff;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }
        .special-area-btn:active {
            transform: scale(0.99);
        }
        .special-area-btn img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 8px 10px;
        }
        .special-area-btn .logo-icon { display: none; }
        .special-area-btn.is-disabled {
            opacity: 0.55;
            filter: grayscale(0.2);
            border-color: #dbe2ea;
            background: #f8fafc;
        }
        .special-area-btn.is-disabled:hover {
            border-color: #dbe2ea;
            background: #f8fafc;
            box-shadow: none;
        }
        .special-area-btn.is-disabled::after {
            content: attr(data-tooltip);
            position: absolute;
            left: 50%;
            bottom: calc(100% + 8px);
            transform: translateX(-50%) translateY(4px);
            background: #0f172a;
            color: #f8fafc;
            border-radius: 6px;
            font-size: 0.68rem;
            font-weight: 700;
            line-height: 1;
            padding: 6px 8px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            z-index: 20;
            transition: opacity .16s ease, transform .16s ease, visibility .16s ease;
        }
        .special-area-btn.is-disabled:hover::after,
        .special-area-btn.is-disabled:focus-visible::after {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }
        body.collapsed .special-areas-wrap {
            gap: 8px;
            justify-items: center;
        }
        body.collapsed .special-area-btn {
            width: 50px;
            height: 50px;
        }
        body.collapsed .special-area-btn .logo-full { display: none; }
        body.collapsed .special-area-btn .logo-icon { display: block; }

        .user-badge {
            background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 12px;
            display: flex; align-items: center; gap: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
        }

        .user-dropdown {
            display: none; position: absolute; right: 0; top: 50px;
            background: white; min-width: 200px; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; z-index: 10003;
        }
        .user-dropdown.show-menu { display: block; }
        .user-dropdown a { display: flex; align-items: center; gap: 10px; padding: 12px 15px; text-decoration: none; color: var(--text-main); font-size: 0.85rem; }
        .user-dropdown a:hover { background: #f8fafc; }
        .user-dropdown svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; }

        .nav-group-toggle {
            width: 100%; background: none; border: none; padding: 9px 12px; margin-bottom: 2px;
            border-radius: 8px; display: flex; align-items: center; gap: 10px;
            color: var(--text-muted); font-weight: 600; font-size: 0.85rem; cursor: pointer;
            text-align: left; white-space: nowrap; transition: all 0.2s ease;
            font-family: inherit;
        }
        .nav-group-toggle:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-group-toggle svg { width: 18px; height: 18px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .nav-group-toggle .toggle-arrow {
            margin-left: auto; width: 14px; height: 14px; flex-shrink: 0;
            transition: transform 0.25s ease;
            fill: none; stroke: currentColor; stroke-width: 2.5;
        }
        .nav-group.open .toggle-arrow { transform: rotate(90deg); }
        .nav-group-toggle.has-active { color: var(--primary-blue); }

        .nav-sub {
            overflow: hidden;
            max-height: 0;
            transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .nav-group.open .nav-sub { max-height: 400px; }
        .nav-sub .nav-item {
            font-size: 0.88rem; padding: 8px 12px 8px 38px; margin-bottom: 2px;
        }
        body.collapsed .nav-group-toggle .toggle-arrow,
        body.collapsed .nav-group-toggle span { display: none; }
        body.collapsed .nav-group-toggle { justify-content: center; padding: 9px 0; }
        body.collapsed .nav-sub { max-height: 0 !important; overflow: hidden; }

        .main-footer {
            position: fixed; bottom: 0; left: var(--sidebar-width);
            width: calc(100% - var(--sidebar-width)); height: 50px; padding: 0 30px;
            display: flex; align-items: center; justify-content: space-between;
            background: white; border-top: 1px solid #e2e8f0; color: var(--text-muted); font-size: 0.8rem; z-index: 10000;
            transition: all var(--transition-speed) ease;
        }
        body.collapsed .main-footer { left: var(--sidebar-collapsed-width); width: calc(100% - var(--sidebar-collapsed-width)); }

        /* ── Custom Scrollbars ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }

        /* ── Flyout for collapsed submenus ── */
        #sidebar-flyout {
            position: fixed;
            left: var(--sidebar-collapsed-width);
            background: white;
            border-radius: 0 12px 12px 0;
            box-shadow: 6px 0 24px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0; border-left: 3px solid var(--primary-blue);
            min-width: 210px; padding: 6px;
            z-index: 10020; display: none; opacity: 0;
            transition: opacity 0.15s ease;
        }
        #sidebar-flyout.visible { display: block; opacity: 1; }
        #sidebar-flyout .flyout-title {
            font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
            color: var(--text-muted); letter-spacing: 1px;
            padding: 6px 10px 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px;
        }
        #sidebar-flyout .nav-item {
            font-size: 0.88rem; padding: 8px 12px;
            white-space: nowrap; width: 100%;
        }
        #sidebar-flyout .nav-item span { display: inline !important; }

        .modal-psynexe-overlay,
        .modal,
        .modal-overlay,
        .modal-shell {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.58); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            display: none; align-items: center; justify-content: center; z-index: 30000; padding: 14px; box-sizing: border-box; overflow-y: auto;
        }
        .modal-psynexe,
        .modal-content,
        .modal-card,
        .modal-box,
        .modal-small { background: white; width: min(96vw, 1280px); max-width: 1280px; max-height: 94vh; min-height: min(78vh, 680px); overflow-y: auto; border-radius: 24px; padding: 30px; }
        .ui-svg-icon { width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 8px; color: currentColor; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

        /* ─── Mobile sidebar backdrop ─── */
        .mobile-sidebar-backdrop {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.5); z-index: 10004;
        }
        .mobile-sidebar-backdrop.visible { display: block; }

        /* ─── Tablet (769–1024px): auto-collapse sidebar ─── */
        @media (max-width: 1024px) and (min-width: 769px) {
            main, .main-content, .main-wrapper { padding: 24px 28px !important; }
            .kpi-grid, .stats-grid, .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* ─── Mobile (≤768px): overlay sidebar ─── */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                z-index: 10010;
                top: 0 !important;
                height: 100vh !important;
                width: var(--sidebar-width) !important;
                padding-top: 70px;
            }
            .sidebar.mobile-open { transform: translateX(0); }
            body.collapsed .sidebar { transform: translateX(-100%); width: var(--sidebar-width) !important; }
            body.collapsed .sidebar.mobile-open { transform: translateX(0); }
            main, .main-content, .main-wrapper {
                margin-left: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 72px 14px 60px !important;
            }
            body.collapsed main, body.collapsed .main-content, body.collapsed .main-wrapper {
                margin-left: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            .main-footer { left: 0 !important; width: 100% !important; }
            .kpi-grid, .stats-grid, .summary-grid,
            [class*="kpi-bar"], [class*="grid-kpi"] { grid-template-columns: repeat(2, 1fr) !important; }
            .content-card, .card { overflow-x: auto; }
            table { min-width: 560px; }
            .modal-psynexe-overlay, .modal, .modal-overlay, .modal-shell {
                align-items: flex-end !important;
                padding: 0 !important;
            }
            .modal-psynexe, .modal-content, .modal-card, .modal-box {
                border-radius: 20px 20px 0 0 !important;
                max-height: 92vh !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: unset !important;
            }
            .form-grid, .modal-grid, .form-row { grid-template-columns: 1fr !important; }
            h1 { font-size: 1.2rem !important; }
            .tab-bar, .tabs { overflow-x: auto; flex-wrap: nowrap !important; }
            .page-header, .section-header { flex-direction: column !important; gap: 10px !important; }
            .filter-bar, .toolbar, .section-toolbar { flex-direction: column !important; gap: 8px !important; }
            .filter-bar input, .filter-bar select,
            .toolbar input, .toolbar select,
            .section-toolbar input, .section-toolbar select { width: 100% !important; }
            .agenda-section { grid-template-columns: 1fr !important; }
        }
    </style>`;

    const icons = {
        // RESTAURADO: Icono de comprimir menú original
        menuToggle: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="18" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
        home: `<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        folder: `<svg viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
        doc: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
        users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        chart: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        bell: `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
        groups: `<svg viewBox="0 0 24 24"><path d="M12 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/><circle cx="8" cy="7" r="3"/><path d="M5 12.1c-.6-.3-1.4-.5-2-.5-2.21 0-4 1.79-4 4v2h4v-2c0-1.5.5-3 1-4z"/><circle cx="16" cy="7" r="3"/><path d="M19 12.1c.6-.3 1.4-.5 2-.5 2.21 0 4 1.79 4 4v2h-4v-2c0-1.5-.5-3-1-4z"/></svg>`,
        wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
        settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
        data: `<svg viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
        briefcase: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
        building: `<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1m5 0h1M9 13h1m5 0h1M9 17h1m5 0h1"/></svg>`,
        calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        check: `<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
        signature: `<svg viewBox="0 0 24 24"><path d="M3 17c2.5-3 5-3 7.5 0s5 3 7.5 0"/><path d="M15.5 6.5a2.121 2.121 0 0 1 3 3L9 19l-4 1 1-4 9.5-9.5z"/></svg>`,
        logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
    };

    const topBarHTML = `
    <header class="top-bar">
        <div class="top-bar-left">
            <button class="btn-toggle" id="sidebarToggle">${icons.menuToggle}</button>
            <img src="img/NexeSocial-logo.png" class="logo-topbar">
        </div>
        <div class="top-bar-right">
            <div style="position:relative;">
                <button id="notifBellTrigger" class="notif-trigger" title="Notificacions">
                    ${icons.bell}
                    <span id="notifBellBadge" class="notif-badge">0</span>
                </button>
                <div id="notifPanel" class="notif-panel">
                    <div class="notif-head">
                        <strong>Notificacions</strong>
                        <button id="notifMarkAll" style="border:none;background:none;color:#2563eb;font-weight:700;cursor:pointer;font-size:0.74rem;">Marcar llegides</button>
                    </div>
                    <div id="notifList" class="notif-list"></div>
                </div>
            </div>
            <div class="user-menu-container" style="position:relative;">
                <div class="user-badge" id="userMenuTrigger">
                    <div style="width:24px; height:24px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">${userName.charAt(0)}</div>
                    <span>${userName}</span>
                </div>
                <div class="user-dropdown" id="userDropdown">
                    <a href="#" style="color:#ef4444;" id="logoutBtn">${icons.logout} Tancar sessió</a>
                </div>
            </div>
        </div>
    </header>`;

    const p = window.location.pathname;
    const isActive = (...paths) => paths.some(x => p.includes(x));

    // ── Derive role + extra perms from localStorage ───────────────────────────
    const _role       = localStorage.getItem('userRole') || 'user';
    const _roles      = (() => { try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch { return []; } })();
    const _extraPerms = (() => { try { return JSON.parse(localStorage.getItem('userExtraPerms') || '{}'); } catch { return {}; } })();
    const _matrixPerms = (() => { try { return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); } catch { return {}; } })();
    const _userScope = (() => { try { return JSON.parse(localStorage.getItem('userScope') || '[]'); } catch { return []; } })();
    const _userDeptIds = (() => { try { return JSON.parse(localStorage.getItem('userDeptIds') || '[]'); } catch { return []; } })();

    const isAdmin      = _role === 'admin'    || _roles.includes('admin_sistema') || _roles.includes('direccio');
    const isDireccio   = _roles.includes('direccio');
    const isCoord      = _role === 'editor'   || _roles.includes('coordinador');
    const isTecnic     = _role === 'tecnic'   || _roles.includes('tecnic') || _roles.includes('administracio') || _roles.includes('manteniment');
    const isVoluntari  = _role === 'voluntari'|| _roles.includes('voluntari');

    // Program access resolved from matrix permissions first, with legacy fallbacks.
    const hasProgramsRead = isAdmin || isDireccio || isCoord || _matrixPerms.programsRead === true || _matrixPerms.programsEdit === true;
    const hasProgramsGlobal = isAdmin || isDireccio || _matrixPerms.programsRead === true || _matrixPerms.programsEdit === true || _matrixPerms.verAlumnesTots === true;
    const scopedDeptIds = Array.from(new Set([
        ...((Array.isArray(_userScope) ? _userScope : []).filter(Boolean)),
        ...((Array.isArray(_userDeptIds) ? _userDeptIds : []).filter(Boolean))
    ]));

    // Departments dynamic list
    const _depts = (() => {
        try {
            const all = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]');
            return all
                .filter(d => d.status !== 'Inactiu' && d.status !== 'Inactivo')
                .filter((d) => {
                    if (hasProgramsGlobal) return true;
                    if (!scopedDeptIds.length) return false;
                    return scopedDeptIds.includes(d.id);
                });
        } catch { return []; }
    })();

    const deptIcons = [icons.doc, icons.folder, icons.groups, icons.users, icons.briefcase, icons.building, icons.calendar, icons.check];
    const deptLinks = _depts.map((d, i) => {
        const deptId = encodeURIComponent(d.id || '');
        const isActiveDept = isActive('departament') && p.includes(deptId);
        const icon = deptIcons[i % deptIcons.length];
        const name = d.name || d.nombre || d.id || 'Departament';
        return `<a href="departament.html?dept=${deptId}" class="nav-item ${isActiveDept ? 'active' : ''}">${icon} <span>${name}</span></a>`;
    }).join('');

    // ── Build section helper ──────────────────────────────────────────────────
    const navGroup = (label, isOpenArr, items) => {
        const openStr = isOpenArr.some(Boolean) ? 'open' : '';
        const hasActiveStr = isOpenArr.some(Boolean) ? 'has-active' : '';
        return `<div class="nav-group ${openStr}">
            <button class="nav-group-toggle ${hasActiveStr}" onclick="this.closest('.nav-group').classList.toggle('open')">
                ${label}
                <svg class="toggle-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div class="nav-sub">${items.join('')}</div>
        </div>`;
    };

    // ── Role-specific nav blocks ──────────────────────────────────────────────
    let navContent = '';

    // Home — everyone
    navContent += `<a href="home.html" class="nav-item ${isActive('home') ? 'active' : ''}">${icons.home} <span>Inici</span></a>`;
    navContent += `<a href="reportar-incidencia.html" class="nav-item ${isActive('reportar-incidencia') ? 'active' : ''}">${icons.bell} <span>Reportar Incidència</span></a>`;
    navContent += `<a href="NexeSing/nexesing.html" class="nav-item ${isActive('nexesing') ? 'active' : ''}">${icons.signature} <span>NexeSing</span></a>`;

    // Beneficiaris — admin, directora, coord, administracio
    if (isAdmin || isCoord || _roles.includes('administracio')) {
        navContent += navGroup(
            `${icons.users} <span>Beneficiaris</span>`,
            [isActive('expedient', 'famil', 'gestio-detall')],
            [
                `<a href="expedient-detall.html" class="nav-item ${isActive('expedient-detall') ? 'active' : ''}">${icons.folder} <span>Expedients</span></a>`,
                `<a href="families-llistat.html" class="nav-item ${isActive('famil') ? 'active' : ''}">${icons.users} <span>Famílies</span></a>`
            ]
        );
    }

    // Programes — matrix-driven permissions + department scope.
    if (hasProgramsRead || _depts.length) {
        const programItems = [
            ...(hasProgramsGlobal ? [`<a href="programes-gestio.html" class="nav-item ${isActive('programes-gestio') ? 'active' : ''}">${icons.chart} <span>Tots els programes</span></a>`] : []),
            deptLinks
        ];
        if (programItems.some(Boolean)) {
            navContent += navGroup(
                `${icons.briefcase} <span>${hasProgramsGlobal ? 'Programes' : 'El meu Programa'}</span>`,
                [isActive('programes', 'departament')],
                programItems
            );
        }
    }

    // Activitat — coord, tecnic, voluntari (admins too)
    if (isAdmin || isCoord || isTecnic || isVoluntari) {
        const actItems = [];
        if (isAdmin || isCoord) {
            actItems.push(
                `<a href="grups.html" class="nav-item ${isActive('grups','grup') ? 'active' : ''}">${icons.groups} <span>Grups</span></a>`,
                `<a href="manage-tipos-actividad.html" class="nav-item ${isActive('manage-tipos-actividad') ? 'active' : ''}">${icons.list} <span>Tipus d'Activitat</span></a>`,
                `<a href="centre-dia-docs.html" class="nav-item ${isActive('centre-dia') ? 'active' : ''}">${icons.doc} <span>Docs Centre de Dia</span></a>`,
                `<a href="caixaproinfancia.html" class="nav-item ${isActive('caixaproinfancia') ? 'active' : ''}" style="color:#e8660d;font-weight:700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8660d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;flex-shrink:0"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><path d="M12 12 c0 0 2-2 2-3.5a2 2 0 0 0-4 0C10 10 12 12 12 12z" fill="#e8660d" stroke="none"/></svg><span>CaixaProinfància</span></a>`,
                `<a href="cites.html" class="nav-item ${isActive('cites') ? 'active' : ''}">${icons.calendar} <span>Agenda i Cites</span></a>`
            );
        }
        // Pasar llista — tecnic, coord, voluntari (with assignment), admin
        actItems.push(
            `<a href="passar-llista.html" class="nav-item ${isActive('passar-llista') ? 'active' : ''}">${icons.check} <span>Passar Llista</span></a>`
        );
        // "Els meus Usuaris" shortcut — only for tecnic/voluntari who are NOT already coord/admin (avoids duplicate grups.html)
        if ((isTecnic || isVoluntari) && !(isAdmin || isCoord)) {
            actItems.unshift(
                `<a href="grups.html" class="nav-item ${isActive('grups','grup') ? 'active' : ''}">${icons.groups} <span>Els meus Usuaris</span></a>`
            );
        }
        navContent += navGroup(
            `${icons.calendar} <span>${isCoord ? 'Quadrant i Activitat' : 'Activitat'}</span>`,
            [isActive('grups','grup','manage-tipos-actividad','centre-dia','cites','passar-llista')],
            actItems
        );
    }

    // Informes globals — admin, directora, or extra perm
    if (isAdmin || isDireccio || _extraPerms.pot_veure_informes_globals) {
        navContent += `<a href="dades-totals.html" class="nav-item ${isActive('dades-totals') ? 'active' : ''}">${icons.data} <span>Informes Globals</span></a>`;
    }

    // Convenis — admin, directora, administracio, coordinadors (read), or explicit matrix perm
    const hasConvenisRead = isAdmin || isDireccio || _matrixPerms.convenisRead === true || _matrixPerms.convenisEdit === true || _matrixPerms.convenisApprove === true || isCoord;
    if (hasConvenisRead) {
        navContent += `<a href="convenios.html" class="nav-item ${isActive('convenios') ? 'active' : ''}">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Convenis i Acords</span>
        </a>`;
    }

    // Gestió Entitat — admin, directora, administracio
    if (isAdmin || isDireccio || _roles.includes('administracio') || _extraPerms.pot_gestio_personal) {
        const gestioItems = [
            `<a href="gestio-avisos.html" class="nav-item ${isActive('gestio-avisos') ? 'active' : ''}">${icons.bell} <span>Avisos</span></a>`,
            `<a href="configuracio.html" class="nav-item ${isActive('configuracio') ? 'active' : ''}">${icons.wrench} <span>Configuració Entitat</span></a>`,
            `<a href="gestio-entitats-xarxa.html" class="nav-item ${isActive('gestio-entitats-xarxa') ? 'active' : ''}">${icons.building} <span>Xarxa d'Entitats</span></a>`,
            ...(isAdmin ? [
                `<a href="importador-datos.html" class="nav-item ${isActive('importador') ? 'active' : ''}">${icons.folder} <span>Importador</span></a>`,
                `<a href="manteniment.html" class="nav-item ${isActive('manteniment') ? 'active' : ''}">${icons.wrench} <span>Manteniment</span></a>`
            ] : [])
        ];
        navContent += navGroup(
            `${icons.building} <span>${isDireccio && !isAdmin ? 'Gestió de Personal' : 'Gestió Entitat'}</span>`,
            [isActive('gestio-avisos','configuracio','gestio-entitats-xarxa','dades-totals','manteniment','importador')],
            gestioItems
        );
    }

    // Àrees Especials (NexePsy / NexeAdmin / NexeAudit logos)
    const canPsyBoot = isAdmin || isDireccio || isCoord || isTecnic || isVoluntari || _matrixPerms.psyRead === true || _matrixPerms.psyEdit === true;
    const canAdminBoot = isAdmin || isDireccio || _matrixPerms.configSistema === true || _matrixPerms.altaBaixaTreballadors === true;
    const canAuditBoot = isAdmin || _role === 'auditor' || _matrixPerms.verAudit === true;
    const canSingBoot = true;

    navContent += `<div class="sidebar-header-label" style="margin-top:14px;">Àrees Especials</div>`;
    navContent += `<div class="special-areas-wrap">
        <button type="button" data-special="psy" data-tooltip="${canPsyBoot ? '' : 'Sense permisos'}" onclick="window.verificarAccesoPsy()" class="special-area-btn ${canPsyBoot ? '' : 'is-disabled'}" title="NexePsy - Serveis Psicològics">
            <img src="img/NexePsy.svg" alt="NexePsy" loading="lazy" class="logo-full">
            <img src="img/NexePsy-icon.svg" alt="NexePsy" loading="lazy" class="logo-icon">
        </button>
        <button type="button" data-special="admin" data-tooltip="${canAdminBoot ? '' : 'Sense permisos'}" onclick="window.verificarAccesoAdmin()" class="special-area-btn ${canAdminBoot ? '' : 'is-disabled'}" title="NexeAdmin - Administració">
            <img src="img/nexeadmin.svg" alt="NexeAdmin" loading="lazy" class="logo-full">
            <img src="img/nexeadmin-icon.svg" alt="NexeAdmin" loading="lazy" class="logo-icon">
        </button>
        <button type="button" data-special="audit" data-tooltip="${canAuditBoot ? '' : 'Sense permisos'}" onclick="window.verificarAccesoAudit()" class="special-area-btn ${canAuditBoot ? '' : 'is-disabled'}" title="NexeAudit - Sistema de Qualitat">
            <img src="img/nexeauditsuit.svg" alt="NexeAudit" loading="lazy" class="logo-full">
            <img src="img/nexeauditsuit-icon.svg" alt="NexeAudit" loading="lazy" class="logo-icon">
        </button>
        <button type="button" data-special="sing" data-tooltip="${canSingBoot ? '' : 'Sense permisos'}" onclick="window.verificarAccesoSing()" class="special-area-btn ${canSingBoot ? '' : 'is-disabled'}" title="NexeSing - Suite de Firmes">
            <img src="img/nexesing.svg" alt="NexeSing" loading="lazy" class="logo-full">
            <img src="img/nexesing-icon.svg" alt="NexeSing" loading="lazy" class="logo-icon">
        </button>
    </div>`;

    const sidebarHTML = `
    <aside class="sidebar" id="mainSidebar">
        <nav>${navContent}</nav>
    </aside>`;

    const footerHTML = `
    <footer class="main-footer">
        <span>© 2026 NexeSocial</span>
        <div>desenvolupat amb ❤️ per <b>RafaCG</b></div>
    </footer>
    <div id="psyModalError" class="modal-psynexe-overlay">
        <div class="modal-psynexe"><h3>Permís denegat</h3><p>No teniu permisos para accedir.</p><button onclick="document.getElementById('psyModalError').style.display='none'">Tancar</button></div>
    </div>`;

    const notifModalHTML = `
    <div id="notifDetailModal">
        <div class="notif-detail-card">
            <h3 id="notifDetailTitle" class="notif-detail-title">Notificació</h3>
            <p id="notifDetailBody" class="notif-detail-body"></p>
            <div id="notifDetailMeta" class="notif-detail-meta"></div>
            <div class="notif-detail-actions">
                <button id="notifDetailClose" class="btn-detail btn-detail-muted">Tancar</button>
                <button id="notifDetailOpen" class="btn-detail btn-detail-primary">Obrir</button>
            </div>
        </div>
    </div>`;

    if (!document.getElementById('nexesocial-sidebar-styles')) {
        document.head.insertAdjacentHTML('beforeend', styles.replace('<style>', '<style id="nexesocial-sidebar-styles">'));
    }

    if (!document.getElementById('mainSidebar')) {
        document.body.insertAdjacentHTML('afterbegin', topBarHTML + sidebarHTML);
    }

    if (!document.querySelector('.main-footer')) {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
    if (!document.getElementById('notifDetailModal')) {
        document.body.insertAdjacentHTML('beforeend', notifModalHTML);
    }
    if (!document.getElementById('notifPreviewHost')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="notifPreviewHost"></div>');
    }

    // Create mobile backdrop
    if (!document.querySelector('.mobile-sidebar-backdrop')) {
        const _bd = document.createElement('div');
        _bd.className = 'mobile-sidebar-backdrop';
        _bd.onclick = () => {
            document.getElementById('mainSidebar')?.classList.remove('mobile-open');
            _bd.classList.remove('visible');
        };
        document.body.appendChild(_bd);
    }

    document.getElementById('sidebarToggle').onclick = () => {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('mainSidebar');
            const backdrop = document.querySelector('.mobile-sidebar-backdrop');
            sidebar?.classList.toggle('mobile-open');
            backdrop?.classList.toggle('visible');
        } else {
            document.body.classList.toggle('collapsed');
            document.getElementById('sidebar-flyout')?.classList.remove('visible');
        }
    };
    document.getElementById('userMenuTrigger').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('show-menu');
    };
    document.getElementById('logoutBtn').onclick = (e) => {
        e.preventDefault();
        if(typeof Auth !== 'undefined') Auth.logout();
        else { localStorage.clear(); window.location.href = "index.html"; }
    };

    const notifState = {
        items: [],
        seen: new Set(),
        byId: new Map(),
        unsubAgenda: null,
        unsubCorrectiu: null,
        unsubBroadcast: null,
        primed: false
    };

    const SEEN_KEY = 'nexe_notif_seen_v1';
    try {
        const rawSeen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        if (Array.isArray(rawSeen)) rawSeen.forEach(id => notifState.seen.add(String(id)));
    } catch (_) {}

    const notifBellTrigger = document.getElementById('notifBellTrigger');
    const notifBellBadge = document.getElementById('notifBellBadge');
    const notifPanel = document.getElementById('notifPanel');
    const notifList = document.getElementById('notifList');
    const notifMarkAll = document.getElementById('notifMarkAll');
    const notifDetailModal = document.getElementById('notifDetailModal');
    const notifDetailTitle = document.getElementById('notifDetailTitle');
    const notifDetailBody = document.getElementById('notifDetailBody');
    const notifDetailMeta = document.getElementById('notifDetailMeta');
    const notifDetailClose = document.getElementById('notifDetailClose');
    const notifDetailOpen = document.getElementById('notifDetailOpen');
    const notifPreviewHost = document.getElementById('notifPreviewHost');
    let _activeNotif = null;

    const fmtNotifTime = (ts) => {
        if (!ts) return 'ara';
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) return 'ara';
        return d.toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const saveSeen = () => {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...notifState.seen].slice(-250)));
    };

    const renderNotifBadge = () => {
        const unread = notifState.items.filter(i => !notifState.seen.has(i.id)).length;
        if (!unread) {
            notifBellBadge.style.display = 'none';
            return;
        }
        notifBellBadge.style.display = 'inline-flex';
        notifBellBadge.textContent = unread > 99 ? '99+' : String(unread);
    };

    const openNotifDetail = (item) => {
        if (!item) return;
        _activeNotif = item;
        notifDetailTitle.textContent = item.title || 'Notificació';
        notifDetailBody.textContent = item.body || '';
        notifDetailMeta.textContent = `${item.sourceLabel || 'Sistema'} · ${fmtNotifTime(item.ts)}`;
        const canOpenRoute = !!item.route && item.type !== 'aviso_general';
        notifDetailOpen.style.display = canOpenRoute ? 'inline-block' : 'none';
        notifDetailModal.style.display = 'flex';
    };

    const renderNotifList = () => {
        if (!notifState.items.length) {
            notifList.innerHTML = '<div class="notif-empty">No tens notificacions noves.</div>';
            renderNotifBadge();
            return;
        }
        notifList.innerHTML = notifState.items.map(item => {
            const unread = !notifState.seen.has(item.id);
            const title = (item.title || 'Notificació').replace(/</g, '&lt;');
            const body = (item.body || '').replace(/</g, '&lt;');
            return `<button class="notif-item ${unread ? 'unread' : ''}" data-id="${item.id}">
                <div class="notif-title">${title}</div>
                <div class="notif-body">${body}</div>
                <div class="notif-meta">${item.sourceLabel || 'Sistema'} · ${fmtNotifTime(item.ts)}</div>
            </button>`;
        }).join('');
        renderNotifBadge();
    };

    const ringBell = () => {
        if (!notifBellTrigger) return;
        notifBellTrigger.classList.remove('ringing');
        // retrigger animation
        void notifBellTrigger.offsetWidth;
        notifBellTrigger.classList.add('ringing');
    };

    const playNotifSound = () => {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
            setTimeout(() => ctx.close(), 260);
        } catch (_) {}
    };

    const showNotifPreview = (item) => {
        if (!notifPreviewHost || !item) return;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'notif-preview';
        card.style.textAlign = 'left';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="notif-preview-title">${(item.title || 'Notificació').replace(/</g, '&lt;')}</div>
            <div class="notif-preview-body">${(item.body || '').replace(/</g, '&lt;')}</div>`;
        card.addEventListener('click', () => {
            notifState.seen.add(item.id);
            saveSeen();
            renderNotifList();
            openNotifDetail(item);
            card.remove();
        });
        notifPreviewHost.prepend(card);
        setTimeout(() => card.remove(), 5200);
    };

    const onIncomingNotifications = (incoming) => {
        if (!incoming || !incoming.length) return;
        ringBell();
        playNotifSound();
        incoming.slice(0, 2).forEach(showNotifPreview);
    };

    const setNotifications = (items) => {
        const previous = notifState.byId;
        notifState.items = items
            .filter(Boolean)
            .sort((a, b) => (b.ts || 0) - (a.ts || 0))
            .slice(0, 50);
        notifState.byId = new Map(notifState.items.map(it => [it.id, it]));
        renderNotifList();

        if (!notifState.primed) {
            notifState.primed = true;
            return;
        }
        const incoming = notifState.items.filter(it => !previous.has(it.id) && !notifState.seen.has(it.id));
        onIncomingNotifications(incoming);
    };

    let dynamicNotifications = [];
    let broadcastNotifications = [];
    const refreshNotifications = () => {
        // Bell is now fully Firestore-driven to avoid ghost/replayed alerts after deletions.
        setNotifications([...dynamicNotifications, ...broadcastNotifications]);
    };

    const toMs = (v) => {
        if (!v) return Date.now();
        if (typeof v.toDate === 'function') return v.toDate().getTime();
        if (v.seconds) return v.seconds * 1000;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    const setupLiveNotifications = (user) => {
        if (!user?.uid) {
            refreshNotifications();
            return;
        }

        const today = (() => {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })();

        if (notifState.unsubAgenda) notifState.unsubAgenda();
        if (notifState.unsubCorrectiu) notifState.unsubCorrectiu();
        if (notifState.unsubBroadcast) notifState.unsubBroadcast();

        const qAgenda = query(
            collection(db, 'agenda'),
            where('data', '==', today),
            where('tecnicsIds', 'array-contains', user.uid)
        );
        notifState.unsubAgenda = onSnapshot(qAgenda, (snap) => {
            const arrived = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(a => a.estat === 'arribat')
                .map(a => ({
                    id: `arribat-${a.id}`,
                    type: 'arribat',
                    sourceLabel: 'Agenda',
                    title: 'Una cita ha arribat',
                    body: `${a.hora || '--:--'} · ${a.localizador || a.titol || 'Cita del dia'}`,
                    route: 'cites.html',
                    ts: toMs(a.updatedAt || a.arribatAt || a.createdAt)
                }));

            dynamicNotifications = [
                ...dynamicNotifications.filter(n => n.type !== 'arribat'),
                ...arrived
            ];
            refreshNotifications();
        }, () => {
            refreshNotifications();
        });

        notifState.unsubCorrectiu = onSnapshot(collection(db, 'rmt_correctiu'), (snap) => {
            const incid = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(i => (i.estat || 'Pendent') === 'Pendent')
                .slice(0, 10)
                .map(i => ({
                    id: `rmt-${i.id}`,
                    type: 'part',
                    sourceLabel: 'Manteniment',
                    title: 'Part nou de manteniment',
                    body: `${i.codi || i.id} · ${(i.descripcio || 'Incidència pendent').slice(0, 90)}`,
                    route: 'manteniment.html',
                    ts: toMs(i.createdAt)
                }));

            dynamicNotifications = [
                ...dynamicNotifications.filter(n => n.type !== 'part'),
                ...incid
            ];
            refreshNotifications();
        }, () => {
            refreshNotifications();
        });

        const qBroadcast = query(collection(db, 'notificaciones'), orderBy('createdAt', 'desc'), limit(120));
        notifState.unsubBroadcast = onSnapshot(qBroadcast, (snap) => {
            const email = (user.email || '').toLowerCase();
            const uid = user.uid || '';

            const items = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(n => {
                    if (n.activa === false) return false;
                    const target = String(n.target || 'all').toLowerCase();
                    if (target === 'all') return true;
                    if (target === 'user' || target === 'users' || target === 'departments') {
                        const te = String(n.targetEmail || '').toLowerCase();
                        const tu = String(n.targetUid || '');
                        const tes = Array.isArray(n.targetEmails) ? n.targetEmails.map(v => String(v).toLowerCase()) : [];
                        const tus = Array.isArray(n.targetUids) ? n.targetUids.map(v => String(v)) : [];
                        return (!!te && te === email) ||
                            (!!tu && tu === uid) ||
                            tes.includes(email) ||
                            tus.includes(uid);
                    }
                    return true;
                })
                .map(n => ({
                    id: `broadcast-${n.id}`,
                    type: n.type || 'broadcast',
                    sourceLabel: n.type === 'aviso_general' ? 'Avís General' : 'Notificació',
                    title: n.titol || n.title || 'Notificació de l\'entitat',
                    body: n.missatge || n.body || '',
                    route: n.type === 'aviso_general' ? '' : (n.route || ''),
                    ts: toMs(n.createdAt || n.timestamp)
                }));

            broadcastNotifications = items;
            refreshNotifications();
        }, () => {
            refreshNotifications();
        });
    };

    notifBellTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('show');
        if (notifPanel.classList.contains('show')) {
            notifState.items.forEach(i => notifState.seen.add(i.id));
            saveSeen();
            renderNotifList();
        }
    });

    notifMarkAll?.addEventListener('click', (e) => {
        e.stopPropagation();
        notifState.items.forEach(i => notifState.seen.add(i.id));
        saveSeen();
        renderNotifList();
    });

    notifList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.notif-item');
        if (!btn) return;
        const item = notifState.byId.get(btn.dataset.id);
        if (!item) return;
        notifState.seen.add(item.id);
        saveSeen();
        renderNotifList();
        openNotifDetail(item);
    });

    notifDetailClose?.addEventListener('click', () => {
        notifDetailModal.style.display = 'none';
    });
    notifDetailOpen?.addEventListener('click', async () => {
        if (!_activeNotif?.route) return;
        await window._navigateWithConstructionGuard(_activeNotif.route);
    });

    notifDetailModal?.addEventListener('click', (e) => {
        if (e.target === notifDetailModal) notifDetailModal.style.display = 'none';
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'nexe_avisos') refreshNotifications();
    });
    window.addEventListener('focus', refreshNotifications);
    window.addEventListener('beforeunload', () => {
        if (notifState.unsubAgenda) notifState.unsubAgenda();
        if (notifState.unsubCorrectiu) notifState.unsubCorrectiu();
        if (notifState.unsubBroadcast) notifState.unsubBroadcast();
    });

    // ── Flyout for collapsed submenus ──
    const flyoutEl = document.createElement('div');
    flyoutEl.id = 'sidebar-flyout';
    document.body.appendChild(flyoutEl);
    let _flyoutTimer = null;

    function _showFlyout(toggleBtn) {
        if (!document.body.classList.contains('collapsed')) return;
        const sub = toggleBtn.closest('.nav-group')?.querySelector('.nav-sub');
        if (!sub) return;
        clearTimeout(_flyoutTimer);
        const rect = toggleBtn.getBoundingClientRect();
        const title = toggleBtn.querySelector('span')?.textContent?.trim() || '';
        const items = [...sub.querySelectorAll('a.nav-item')].map(a => a.outerHTML).join('');
        flyoutEl.innerHTML = `<div class="flyout-title">${title}</div>${items}`;
        flyoutEl.style.top = rect.top + 'px';
        flyoutEl.classList.add('visible');
        // Keep within viewport
        const oh = flyoutEl.offsetHeight;
        if (rect.top + oh > window.innerHeight - 10) {
            flyoutEl.style.top = Math.max(70, window.innerHeight - oh - 10) + 'px';
        }
    }
    function _hideFlyout() {
        _flyoutTimer = setTimeout(() => flyoutEl.classList.remove('visible'), 120);
    }
    flyoutEl.addEventListener('mouseenter', () => clearTimeout(_flyoutTimer));
    flyoutEl.addEventListener('mouseleave', _hideFlyout);
    document.querySelectorAll('#mainSidebar .nav-group-toggle').forEach(btn => {
        btn.addEventListener('mouseenter', () => _showFlyout(btn));
        btn.addEventListener('mouseleave', _hideFlyout);
    });

    // Async: resolve auth and update user badge without blocking render
    (async () => {
        try {
            if (window.Auth && !window.Auth.isReady) await window.Auth.initialize();

            const currentRole = localStorage.getItem('userRole') || 'user';
            const currentRoles = (() => { try { return JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch { return []; } })();
            const currentMatrixPerms = (() => { try { return JSON.parse(localStorage.getItem('userMatrixPerms') || '{}'); } catch { return {}; } })();
            const bootSignature = JSON.stringify({ role: _role, roles: _roles, matrixPerms: _matrixPerms });
            const liveSignature = JSON.stringify({ role: currentRole, roles: currentRoles, matrixPerms: currentMatrixPerms });

            if (!force && bootSignature !== liveSignature) {
                await cargarInterfazBase({ force: true });
                return;
            }

            const userSession = window.Auth?.getUser();
            if (userSession) {
                const name = userSession.displayName || userSession.nombre || userSession.email?.split('@')[0] || userName;
                // Update badge
                const badge = document.getElementById('userMenuTrigger');
                if (badge) badge.innerHTML = `<div style="width:24px;height:24px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">${name.charAt(0).toUpperCase()}</div><span>${name}</span>`;
                // Persist
                localStorage.setItem('userName', name);
                if (userSession.email) localStorage.setItem('userEmail', userSession.email);
                if (userSession.role) localStorage.setItem('userRole', userSession.role);

                setupLiveNotifications(userSession);

                // Keep all special area buttons visible and mark inaccessible modules as disabled.
                const role = userSession.role || 'user';
                const isAdmin = role === 'admin' || role === 'superadmin';
                const canPsy = isAdmin || window.Auth.hasAccessTo('psy');
                const canAdmin = isAdmin || window.Auth.hasAccessTo('admin');
                const canAudit = isAdmin || role === 'auditor' || window.Auth.hasAccessTo('audit');
                const canSing = true;

                const applySpecialAccessState = (selector, canAccess) => {
                    const btn = document.querySelector(selector);
                    if (!btn) return;
                    btn.classList.toggle('is-disabled', !canAccess);
                    btn.setAttribute('data-tooltip', canAccess ? '' : 'Sense permisos');
                };

                applySpecialAccessState('[data-special="psy"]', canPsy);
                applySpecialAccessState('[data-special="admin"]', canAdmin);
                applySpecialAccessState('[data-special="audit"]', canAudit);
                applySpecialAccessState('[data-special="sing"]', canSing);
            } else {
                refreshNotifications();
            }
        } catch(e) { /* silent — sidebar already visible */ }
    })();
}

// FIX: Exponemos la función a window para que el onclick del HTML la encuentre
window._navigateWithConstructionGuard = async function(targetPath) {
    try {
        if (!window.Auth) {
            window.location.href = targetPath;
            return;
        }

        if (typeof window.Auth._canBypassConstructionMode === 'function' && window.Auth._canBypassConstructionMode()) {
            window.location.href = targetPath;
            return;
        }

        if (typeof window.Auth._getConstructionPagesMap !== 'function') {
            window.location.href = targetPath;
            return;
        }

        const slug = String(targetPath || '').replace(/^\//, '');
        const pages = await window.Auth._getConstructionPagesMap();
        if (pages && pages[slug]) {
            if (typeof window.Auth._showConstructionModal === 'function') {
                window.Auth._showConstructionModal({ closeOnly: true });
            }
            return;
        }
    } catch (err) {
        console.warn('Construction guard failed, navigating anyway:', err?.message || err);
    }

    window.location.href = targetPath;
};

window.verificarAccesoPsy = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('🔷 Click en NexePsy detectado');
    
    const user = window.Auth?.getUser();
    
    if (!user) { 
        console.log('❌ No hay usuario identificado, redirigiendo a login');
        window.location.href = 'index.html'; 
        return; 
    }
    
    // Verificar acceso usando la función centralizada
    const hasAccess = window.Auth.hasAccessTo('psy') || user.role === 'admin' || user.role === 'superadmin';
    
    if (hasAccess) {
        console.log('✅ Acceso permitido a NexePsy para:', user.email);
        console.log('📍 Navegando a: NexePsy/nexepsy.html');
        await window._navigateWithConstructionGuard('NexePsy/nexepsy.html');
    } else {
        console.log('🔒 Acceso denegado a NexePsy. Email:', user.email, 'Rol:', user.role, 'Permisos:', user.permisos);
        mostrarDenegadoModal('NexePsy');
    }
};

// Verificar acceso a NexeAdmin
window.verificarAccesoAdmin = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('🔴 Click en NexeAdmin detectado');
    
    const user = window.Auth?.getUser();
    
    if (!user || !user.email) { 
        console.log('❌ No hay usuario identificado, redirigiendo a login');
        window.location.href = 'index.html'; 
        return; 
    }
    
    // Verificar acceso usando la función centralizada
    const hasAccess = window.Auth.hasAccessTo('admin') || user.role === 'admin' || user.role === 'superadmin';
    
    if (hasAccess) {
        console.log('✅ Acceso permitido a NexeAdmin para:', user.email);
        console.log('📍 Navegando a: NexeAdmin/nexeadmin.html');
        await window._navigateWithConstructionGuard('NexeAdmin/nexeadmin.html');
    } else {
        console.log('🔒 Acceso denegado a NexeAdmin. Email:', user.email, 'Rol:', user.role, 'Permisos:', user.permisos);
        mostrarDenegadoModal('NexeAdmin');
    }
};

// Verificar acceso a NexeAudit
window.verificarAccesoAudit = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('🟠 Click en NexeAudit detectado');
    
    const user = window.Auth?.getUser();
    
    if (!user || !user.email) { 
        console.log('❌ No hay usuario identificado, redirigiendo a login');
        window.location.href = 'index.html'; 
        return; 
    }
    
    // Verificar acceso usando la función centralizada
    const hasAccess = window.Auth.hasAccessTo('audit') || user.role === 'admin' || user.role === 'superadmin' || user.role === 'auditor';
    
    if (hasAccess) {
        console.log('✅ Acceso permitido a NexeAudit para:', user.email);
        console.log('📍 Navegando a: NexeAudit/nexeadutisuite.html');
        await window._navigateWithConstructionGuard('NexeAudit/nexeadutisuite.html');
    } else {
        console.log('🔒 Acceso denegado a NexeAudit. Email:', user.email, 'Rol:', user.role, 'Permisos:', user.permisos);
        mostrarDenegadoModal('NexeAudit');
    }
};

// Verificar acceso a NexeSing
window.verificarAccesoSing = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    console.log('🔵 Click en NexeSing detectado');

    const user = window.Auth?.getUser();
    if (!user || !user.email) {
        console.log('❌ No hay usuario identificado, redirigiendo a login');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ Acceso permitido a NexeSing para:', user.email);
    console.log('📍 Navegando a: NexeSing/nexesing.html');
    await window._navigateWithConstructionGuard('NexeSing/nexesing.html');
};

// Mostrar modal de permiso denegado
window.mostrarDenegadoModal = function(nomModul) {
    console.log('📋 Mostrando modal de acceso denegado para:', nomModul);
    const modal = document.getElementById('psyModalError');
    if (!modal) {
        console.error('❌ Modal no encontrado');
        alert(`Acceso denegado a ${nomModul}`);
        return;
    }
    
    const modalContent = modal.querySelector('.modal-psynexe');
    if (modalContent) {
        modalContent.innerHTML = `
            <h3>Permís denegat</h3>
            <p>No teniu permisos per accedir a <b>${nomModul}</b>.</p>
            <button onclick="document.getElementById('psyModalError').style.display='none'" style="background:#3b82f6; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Tancar</button>
        `;
    }
    modal.style.display = 'flex';
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarInterfazBase);
} else {
    cargarInterfazBase();
}

window.addEventListener('nexe-auth-ready', () => {
    cargarInterfazBase({ force: true });
});

window.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('show-menu');
    document.getElementById('notifPanel')?.classList.remove('show');
});

window.replaceEmojiIconsWithSVG = function(root = document) {
    const replacements = {
        '➕': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
        '⬅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
        '📅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
        '📝': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        '👥': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        '⚠️': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        '✅': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
        '🔄': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6l3 2"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6l-3-2"/></svg>',
        '🔐': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        '📋': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/></svg>',
        '📊': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/></svg>',
        '🏢': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h.01M9 13h.01M9 16h.01M15 10h.01M15 13h.01M15 16h.01"/></svg>',
        '🚨': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><path d="M10 3h4l1 7H9l1-7Z"/><path d="M5 10h14l2 8H3l2-8Z"/><path d="M12 18v3"/></svg>',
        '🎯': '<svg class="ui-svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v2M20 12h-2M12 18v2M6 12H4"/></svg>'
    };

    const selector = 'button, a, h1, h2, h3, h4, .section-title, .tab-item, .config-nav-item, .btn, .btn-nexe, .btn-main, .btn-ghost';
    root.querySelectorAll(selector).forEach((node) => {
        let html = node.innerHTML;
        Object.entries(replacements).forEach(([emoji, svg]) => {
            html = html.split(emoji).join(svg);
        });
        node.innerHTML = html;
    });
};

// replaceEmojiIconsWithSVG kept for external callers but no longer auto-runs (all icons are now SVG)

// Attach event listeners to special area buttons
window.initializeSpecialAreaButtons = function() {
    console.log('🎯 Inicializando botones de áreas especiales...');
    
    // Get all .nav-item-psy buttons
    const buttons = document.querySelectorAll('.nav-item-psy');
    console.log(`🔍 Encontrados ${buttons.length} botones de áreas especiales`);
    
    if (buttons.length >= 3) {
        // Button 0: NexePsy
        buttons[0].addEventListener('click', (e) => {
            e.preventDefault();
            console.log('✅ Event listener NexePsy activado');
            window.verificarAccesoPsy(e);
        });
        buttons[0].title = 'Ir a NexePsy';
        console.log('✅ Event listener añadido a NexePsy');
        
        // Button 1: NexeAdmin
        buttons[1].addEventListener('click', (e) => {
            e.preventDefault();
            console.log('✅ Event listener NexeAdmin activado');
            window.verificarAccesoAdmin(e);
        });
        buttons[1].title = 'Ir a NexeAdmin';
        console.log('✅ Event listener añadido a NexeAdmin');
        
        // Button 2: NexeAudit
        buttons[2].addEventListener('click', (e) => {
            e.preventDefault();
            console.log('✅ Event listener NexeAudit activado');
            window.verificarAccesoAudit(e);
        });
        buttons[2].title = 'Ir a NexeAudit';
        console.log('✅ Event listener añadido a NexeAudit');
    } else {
        console.warn('⚠️ No se encontraron suficientes botones de áreas especiales');
    }
};

// Initialize event listeners once DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM listo, inicializando botones...');
    setTimeout(window.initializeSpecialAreaButtons, 100);
});
