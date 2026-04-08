/**
 * Nexe Audit Suite - Sidebar Navigation & Control
 * Sistema de Gestió de Qualitat ISO:9001
 */

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
});

function renderSidebar() {
    const sidebarHTML = `
    <nav class="sidebar-audit" id="sidebar">
        <div class="suite-logo" style="display: flex; align-items: center; margin-bottom: 30px; padding: 0 5px;">
            <div style="min-width: 45px; height: 45px; flex-shrink: 0;">
                <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
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
            <div class="logo-text" style="margin-left: 12px; line-height: 1.1;">
                <div style="font-size: 1.2rem; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">NEXE</div>
                <div style="font-size: 0.85rem; font-weight: 300; color: #60a5fa; white-space: nowrap;">Audit Suite</div>
            </div>
        </div>

        <div class="nav-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="nav-label" style="margin: 0;">Programes Auditats</span>
                <button id="add-program" style="background: none; border: none; color: #60a5fa; cursor: pointer; font-size: 1.2rem; font-weight: bold; transition: 0.2s;">+</button>
            </div>
            <div id="programes-list">
                <a href="#" class="nav-link active" data-dept="psicosocial">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span class="link-text">Psicosocial</span>
                </a>
            </div>
        </div>

        <div class="nav-group">
            <span class="nav-label">Suport i Gestió</span>
            <a href="#" class="nav-link" data-dept="admin">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Administració</span>
            </a>
            <a href="#" class="nav-link" data-dept="rrhh">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="link-text">Recursos Humans</span>
            </a>
        </div>

        <div style="margin-top: auto;">
            <button id="toggle-sidebar" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 100%; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 600;">
                <span id="toggle-icon">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span class="link-text">Col·lapsar</span>
            </button>
        </div>
    </nav>
    `;

    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;
        setupSidebarEvents();
    }
}

// ... El resto de funciones (setupSidebarEvents, openCustomModal, etc.) se mantienen iguales ...

function setupSidebarEvents() {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const addProgramBtn = document.getElementById('add-program');

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('collapsed');
        const isCollapsed = document.body.classList.contains('collapsed');
        document.getElementById('toggle-icon').innerHTML = isCollapsed 
            ? `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    });

    addProgramBtn.addEventListener('click', () => {
        openCustomModal("Nou Programa", "Nom del programa", (val) => {
            if (val) createNewProgramLink(val);
        });
    });

    document.addEventListener('dblclick', (e) => {
        const linkText = e.target.closest('.link-text');
        if (linkText) {
            openCustomModal("Editar Programa", "Nou nom", (val) => {
                if (val) linkText.innerText = val;
            });
        }
    });

    attachNavEvents();
}

function openCustomModal(title, placeholder, callback) {
    const modal = document.getElementById('custom-modal');
    const input = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    
    document.getElementById('modal-title').innerText = title;
    input.placeholder = placeholder;
    input.value = "";
    modal.style.display = "flex";
    input.focus();

    confirmBtn.onclick = () => {
        callback(input.value);
        closeModal();
    };
}

function closeModal() {
    document.getElementById('custom-modal').style.display = 'none';
}

function createNewProgramLink(name) {
    const list = document.getElementById('programes-list');
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const a = document.createElement('a');
    a.href = "#";
    a.className = "nav-link";
    a.setAttribute('data-dept', id);
    a.innerHTML = `
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="link-text">${name}</span>
    `;
    list.appendChild(a);
    attachNavEvents();
}

function attachNavEvents() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            if (typeof loadDeptData === 'function') loadDeptData(link.getAttribute('data-dept'));
        };
    });
}