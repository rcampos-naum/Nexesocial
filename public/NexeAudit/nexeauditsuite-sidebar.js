/**
 * Nexe Audit Suite - Sidebar Navigation & Control
 * Sistema de Gestió de Qualitat ISO:9001
 */

document.addEventListener('DOMContentLoaded', renderSidebar);
window.addEventListener('nexeaudit-data-updated', renderSidebar);

const AREA_NAME = 'NexeAudit';
const AREA_HOME = 'nexeadutisuite.html';
const AREA_FAVICON = '../img/nexeauditsuit-icon.svg';

function ensureUnifiedSignatureFlow() {
    if (document.getElementById('nexe-signature-flow-loader')) return;
    const s = document.createElement('script');
    s.id = 'nexe-signature-flow-loader';
    s.type = 'module';
    s.src = '../signature-flow.js';
    document.head.appendChild(s);
}

function applySuiteBranding(activeLabel = '') {
    let iconEl = document.querySelector('link[rel="icon"]');
    if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        iconEl.type = 'image/svg+xml';
        document.head.appendChild(iconEl);
    }
    iconEl.href = AREA_FAVICON;

    const currentPath = window.location.pathname.split('/').pop() || AREA_HOME;
    const label = String(activeLabel || '').trim();
    if (currentPath === AREA_HOME && (!label || /^dashboard$/i.test(label))) {
        document.title = AREA_NAME;
        return;
    }
    document.title = label ? `${label} | ${AREA_NAME}` : AREA_NAME;
}

function replaceAuditEmojiIcons(root = document) {
    const replacements = {
        '🎯': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v2M20 12h-2M12 18v2M6 12H4"/></svg>',
        '🔐': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        '📋': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/></svg>',
        '🚨': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><path d="M10 3h4l1 7H9l1-7Z"/><path d="M5 10h14l2 8H3l2-8Z"/><path d="M12 18v3"/></svg>',
        '📊': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/></svg>',
        '🏢': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h.01M9 13h.01M9 16h.01M15 10h.01M15 13h.01M15 16h.01"/></svg>',
        '✅': '<svg class="ui-svg-icon" width="18" height="18" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'
    };
    root.querySelectorAll('h1, h2, h3, .section-title, button').forEach((node) => {
        let html = node.innerHTML;
        Object.entries(replacements).forEach(([emoji, svg]) => {
            html = html.split(emoji).join(svg);
        });
        node.innerHTML = html;
    });
}

function formatDeptName(value = '') {
    const clean = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const map = {
        ADMINISTRACIO: 'ADMINISTRACIÓ',
        DIRECCIO: 'DIRECCIÓ',
        INTERVENCIO: 'INTERVENCIÓ SOCIAL',
        'INTERVENCIO SOCIAL': 'INTERVENCIÓ SOCIAL',
        RRHH: 'RRHH'
    };
    return map[clean] || value;
}

function getDepartments() {
    const shared = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]');
    if (Array.isArray(shared) && shared.length) {
        return shared.filter((item) => item.status !== 'Inactiu').map((item) => ({ name: formatDeptName(item.name || item.nombre || '') }));
    }

    const stored = JSON.parse(localStorage.getItem('nexeaudit_departments') || '[]');
    return stored.length ? stored.map((item) => ({ name: formatDeptName(item.name) })) : [
        { name: 'ADMINISTRACIÓ' },
        { name: 'RRHH' },
        { name: 'INTERVENCIÓ SOCIAL' },
        { name: 'DIRECCIÓ' }
    ];
}

function renderSidebar() {
    ensureUnifiedSignatureFlow();
    const departments = getDepartments();
    const deptLinks = departments.map((dept) => `
        <a href="#" class="nav-link dept-link" data-dept="${dept.name}">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="link-text">${dept.name}</span>
        </a>
    `).join('');

    const sidebarHTML = `
    <nav class="sidebar-audit" id="sidebar">
        <div style="display:flex; gap:10px; margin-bottom:16px;">
            <button id="back-home" title="Tornar a NexeSocial" style="width:40px; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.08); color:white; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button id="toggle-sidebar-top" title="Col·lapsar menú" style="width:40px; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.08); color:white; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>
        <div class="suite-logo" style="display:flex; align-items:center; margin-bottom:24px; padding:0 4px;">
            <div style="min-width:44px; height:44px; flex-shrink:0;">
                <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
                    <path d="M15 80 L35 70 L55 80 L35 90 Z" fill="#93c5fd"/>
                    <path d="M15 80 L15 110 L35 120 L35 90 Z" fill="#1e40af"/>
                    <path d="M35 90 L35 120 L55 110 L55 80 Z" fill="#1d4ed8"/>
                    <path d="M45 55 L65 45 L85 55 L65 65 Z" fill="#60a5fa"/>
                    <path d="M45 55 L45 95 L65 105 L65 65 Z" fill="#1e40af"/>
                    <path d="M65 65 L65 105 L85 95 L85 55 Z" fill="#1d4ed8"/>
                    <path d="M75 30 L95 20 L115 30 L95 40 Z" fill="#3b82f6"/>
                    <path d="M75 30 L75 80 L95 90 L95 40 Z" fill="#1e3a8a"/>
                    <path d="M95 40 L95 90 L115 80 L115 30 Z" fill="#1d4ed8"/>
                    <path d="M10 95 L40 75 L70 85 L125 35" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="logo-text" style="margin-left:12px; line-height:1.1;">
                <div style="font-size:1.2rem; font-weight:900; color:#ffffff;">NEXE</div>
                <div style="font-size:0.85rem; font-weight:300; color:#60a5fa; white-space:nowrap;">Audit Suite</div>
            </div>
        </div>

        <div class="nav-group">
            <span class="nav-label">Navegació</span>
            <a href="#" class="nav-link nav-section active" data-section="section-dashboard">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-10h8V3h-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Dashboard</span>
            </a>
            <a href="#" class="nav-link nav-section" data-section="section-plan">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a1 1 0 011-1z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Pla anual</span>
            </a>
            <a href="#" class="nav-link nav-section" data-section="section-findings">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86l-7.2 12.47A1 1 0 003.95 18h16.1a1 1 0 00.86-1.67l-7.2-12.47a1 1 0 00-1.72 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Hallazgos</span>
            </a>
            <a href="#" class="nav-link nav-section" data-section="section-management">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16 0h5v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 110 8 4 4 0 010-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Gestió</span>
            </a>
            <a href="#" class="nav-link nav-section" data-section="section-roadmap">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9m-7-4h6m0 0v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Roadmap</span>
            </a>
        </div>

        <div class="nav-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="nav-label" style="margin:0;">Departaments</span>
                <button id="reset-filter" style="background:none; border:none; color:#60a5fa; cursor:pointer; font-size:0.8rem;">Tots</button>
            </div>
            <div id="programes-list">${deptLinks}</div>
        </div>

        <div style="margin-top:auto; display:grid; gap:8px;">
            <button id="quick-audit" style="background:#2563eb; border:none; color:white; width:100%; padding:12px; border-radius:8px; cursor:pointer; font-weight:700;">+ Auditoria</button>
            <button id="quick-finding" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:white; width:100%; padding:12px; border-radius:8px; cursor:pointer; font-weight:700;">+ No conformitat</button>
            <a href="../NexeSing/nexesing.html" style="text-decoration:none; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:white; width:100%; padding:12px; border-radius:8px; cursor:pointer; font-weight:700; text-align:center;">NexeSing</a>
        </div>
    </nav>`;

    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;
        setupSidebarEvents();
        replaceAuditEmojiIcons(document);
        const activeLabel = container.querySelector('.nav-section.active .link-text')?.textContent || '';
        applySuiteBranding(activeLabel);
    }

    // Mobile hamburger button
    if (!document.querySelector('.audit-mobile-btn')) {
        const mBtn = document.createElement('button');
        mBtn.className = 'audit-mobile-btn';
        mBtn.title = 'Obrir menú';
        mBtn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        mBtn.onclick = () => {
            document.querySelector('.sidebar-audit')?.classList.toggle('mobile-open');
            document.querySelector('.audit-mobile-backdrop')?.classList.toggle('visible');
        };
        document.body.appendChild(mBtn);
    }
    if (!document.querySelector('.audit-mobile-backdrop')) {
        const bd = document.createElement('div');
        bd.className = 'audit-mobile-backdrop';
        bd.onclick = () => {
            document.querySelector('.sidebar-audit')?.classList.remove('mobile-open');
            bd.classList.remove('visible');
        };
        document.body.appendChild(bd);
    }
}

function scrollToSection(sectionId) {
    const scroller = document.querySelector('.workspace');
    const target = document.getElementById(sectionId);
    if (scroller && target) {
        scroller.scrollTo({ top: Math.max(0, target.offsetTop - 18), behavior: 'smooth' });
    }
}

function setupSidebarEvents() {
    const toggleBtn = document.getElementById('toggle-sidebar-top');
    const backHomeBtn = document.getElementById('back-home');
    const resetBtn = document.getElementById('reset-filter');
    const quickAuditBtn = document.getElementById('quick-audit');
    const quickFindingBtn = document.getElementById('quick-finding');

    toggleBtn?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar-audit')?.classList.remove('mobile-open');
            document.querySelector('.audit-mobile-backdrop')?.classList.remove('visible');
        } else {
            document.body.classList.toggle('collapsed');
        }
    });

    backHomeBtn?.addEventListener('click', () => {
        window.location.href = '../home.html';
    });

    resetBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.loadDeptData?.('ALL');
        document.querySelectorAll('.dept-link').forEach(link => link.classList.remove('active'));
    });

    quickAuditBtn?.addEventListener('click', () => window.openNewAuditModal?.());
    quickFindingBtn?.addEventListener('click', () => window.openEntityModal?.('finding'));

    document.querySelectorAll('.nav-section').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-section').forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            applySuiteBranding(link.querySelector('.link-text')?.textContent || '');
            scrollToSection(link.dataset.section);
        });
    });

    document.querySelectorAll('.dept-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.dept-link').forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            window.loadDeptData?.(link.dataset.dept);
            scrollToSection('section-plan');
        });
    });
}