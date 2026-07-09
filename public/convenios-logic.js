// convenios-logic.js — Gestió de Convenis i Acords
import { db, storage } from './firebase-config.js';
import {
    collection, doc, addDoc, updateDoc, getDoc, getDocs,
    serverTimestamp, query, orderBy, onSnapshot, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
    ref as storageRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

await window.checkModuleAccess?.('convenios');

// ── HELPERS ──────────────────────────────────────────────────────────────────

function escHtml(v = '') {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtDate(iso = '') {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isoToday() {
    return new Date().toISOString().slice(0, 10);
}

function daysUntil(iso = '') {
    if (!iso) return null;
    const diff = new Date(iso) - new Date();
    return Math.ceil(diff / 86400000);
}

function showToast(msg, tone = 'success') {
    const t = document.getElementById('convToast');
    t.textContent = msg;
    t.className = `toast-banner show ${tone}`;
    clearTimeout(window.__convToastTimer);
    window.__convToastTimer = setTimeout(() => { t.className = 'toast-banner'; }, 3000);
}

// ── PERMISSION HELPERS ────────────────────────────────────────────────────────

function getAccess() {
    const matrixPerms = (() => {
        try { return JSON.parse(localStorage.getItem('nexe_matrixPerms') || '{}'); } catch { return {}; }
    })();
    const roles = (() => {
        try { return JSON.parse(localStorage.getItem('userMatrixRoles') || '[]'); } catch { return []; }
    })();
    const isAdmin = roles.includes('admin');
    const isDireccio = roles.includes('directora');
    const isAdmin2 = isAdmin || isDireccio;

    return {
        canRead:    isAdmin2 || !!matrixPerms.convenisRead,
        canEdit:    isAdmin2 || !!matrixPerms.convenisEdit,
        canApprove: isAdmin2 || !!matrixPerms.convenisApprove,
        canUpload:  isAdmin2 || !!matrixPerms.convenisEdit || !!matrixPerms.convenisUpload,
        isAdmin:    isAdmin2
    };
}

// ── STATE ─────────────────────────────────────────────────────────────────────

let _convenisAll = [];
let _programs = [];
let _staff = [];
let _selectedFile = null;
let _docMethod = 'intern';
let _editingId = null;
let _access = {};

// ── DATA LOAD ─────────────────────────────────────────────────────────────────

async function loadPrograms() {
    try {
        const snap = await getDocs(collection(db, 'departamentos'));
        _programs = [];
        snap.forEach((d) => {
            const data = d.data() || {};
            if (data.estado === 'Activo' || !data.estado) {
                _programs.push({ id: d.id, name: data.nombre || d.id });
            }
        });
    } catch {
        // Fallback: use localStorage
        try {
            _programs = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]')
                .filter((d) => d.status !== 'Inactiu')
                .map((d) => ({ id: d.id, name: d.name }));
        } catch { _programs = []; }
    }
    renderProgramCheckboxes();
    renderCoordSelector();
}

async function loadStaff() {
    try {
        const snap = await getDocs(collection(db, 'usuarios'));
        _staff = [];
        snap.forEach((d) => {
            const data = d.data() || {};
            if (!data.nombre && !data.email) return;
            const roles = data.matrixRoles || data.roles || [];
            const isCoord = Array.isArray(roles) && roles.some((r) =>
                ['coordinador', 'admin', 'directora'].includes(String(r || '').toLowerCase())
            );
            if (isCoord) {
                _staff.push({ id: d.id, name: data.nombre || data.email });
            }
        });
    } catch { _staff = []; }
    renderCoordSelector();
}

function subscribeConvenis() {
    const q = query(collection(db, 'convenis'), orderBy('dataFi', 'asc'));
    onSnapshot(q, (snap) => {
        _convenisAll = [];
        snap.forEach((d) => {
            _convenisAll.push({ id: d.id, ...(d.data() || {}) });
        });
        applyFilters();
        renderSummary();
        checkExpiryAlerts();
    }, (err) => {
        console.warn('Error carregant convenis:', err);
        renderTable([]);
    });
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function badgeEstat(estat = '') {
    const map = {
        vigent: 'badge vigent',
        pendent: 'badge pendent',
        caducat: 'badge caducat',
        arxivat: 'badge arxivat'
    };
    const labelMap = {
        vigent: 'VIGENT', pendent: 'PENDENT', caducat: 'CADUCAT', arxivat: 'ARXIVAT'
    };
    return `<span class="${map[estat] || 'badge'}">${labelMap[estat] || escHtml(estat).toUpperCase()}</span>`;
}

function tipoPill(tipo = '') {
    const map = { empresa: 'empresa', educatiu: 'educatiu', public: 'public' };
    const labels = { empresa: 'Empresa', educatiu: 'Centre Educatiu', public: 'Organisme Públic' };
    return `<span class="tipo-pill ${map[tipo] || ''}">${escHtml(labels[tipo] || tipo)}</span>`;
}

function expiryCellHtml(dataFi = '') {
    if (!dataFi) return '—';
    const days = daysUntil(dataFi);
    const text = fmtDate(dataFi);
    if (days !== null && days <= 30 && days >= 0) {
        return `<span class="badge expira-aviat" title="${days} dies">⚠️ ${text}</span>`;
    }
    return escHtml(text);
}

function renderTable(list = []) {
    const tbody = document.getElementById('convenisTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Cap conveni trobat</td></tr>';
        return;
    }
    tbody.innerHTML = list.map((c) => {
        const progs = Array.isArray(c.programes) ? c.programes.join(', ') : (c.programes || '—');
        const docBtn = c.docUrl
            ? `<a href="${escHtml(c.docUrl)}" target="_blank" rel="noopener noreferrer" class="btn-link" onclick="event.stopPropagation()">📄 Doc</a>`
            : '';
        const editBtn = _access.canEdit
            ? `<button class="btn-link" onclick="event.stopPropagation(); window._conv.openModal('${escHtml(c.id)}')">Editar</button>`
            : `<button class="btn-link" onclick="event.stopPropagation(); window._conv.openModal('${escHtml(c.id)}')">Veure</button>`;
        return `<tr onclick="window._conv.openModal('${escHtml(c.id)}')">
            <td><strong>${escHtml(c.nom || '—')}</strong><br><small style="color:#64748b;">${escHtml(c.cif || '')}</small></td>
            <td>${tipoPill(c.tipoEntitat)}</td>
            <td>${escHtml(c.tipoConveni || '—')}</td>
            <td style="font-size:0.82rem; color:#475569;">${escHtml(progs)}</td>
            <td>${badgeEstat(c.estat)}</td>
            <td>${expiryCellHtml(c.dataFi)}</td>
            <td><div style="display:flex; gap:4px; flex-wrap:wrap;">${editBtn}${docBtn}</div></td>
        </tr>`;
    }).join('');
}

function renderSummary() {
    const counts = { vigent: 0, pendent: 0, caducat: 0, total: 0 };
    _convenisAll.forEach((c) => {
        counts.total++;
        if (counts[c.estat] !== undefined) counts[c.estat]++;
    });
    document.getElementById('sumVigent').textContent = counts.vigent;
    document.getElementById('sumPendent').textContent = counts.pendent;
    document.getElementById('sumCaducat').textContent = counts.caducat;
    document.getElementById('sumTotal').textContent = counts.total;
}

function renderProgramCheckboxes(selected = []) {
    const box = document.getElementById('programesGroup');
    if (!box) return;
    if (!_programs.length) {
        box.innerHTML = '<span style="color:#94a3b8; font-size:0.82rem;">No hi ha departaments actius</span>';
        return;
    }
    box.innerHTML = _programs.map((p) => `
        <label class="check-label">
            <input type="checkbox" name="programCheck" value="${escHtml(p.name)}" ${selected.includes(p.name) ? 'checked' : ''}>
            ${escHtml(p.name)}
        </label>
    `).join('');
}

function renderCoordSelector(selectedId = '') {
    const sel = document.getElementById('firmantPrograma');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar…</option>' +
        _staff.map((s) => `<option value="${escHtml(s.id)}" ${selectedId === s.id ? 'selected' : ''}>${escHtml(s.name)}</option>`).join('');
}

// ── FILTER ────────────────────────────────────────────────────────────────────

function applyFilters() {
    const text = (document.getElementById('filterText')?.value || '').toLowerCase();
    const tipo = document.getElementById('filterTipo')?.value || '';
    const tipoConv = document.getElementById('filterTipoConv')?.value || '';
    const estat = document.getElementById('filterEstat')?.value || '';

    const filtered = _convenisAll.filter((c) => {
        if (text && !`${c.nom || ''} ${c.cif || ''}`.toLowerCase().includes(text)) return false;
        if (tipo && c.tipoEntitat !== tipo) return false;
        if (tipoConv && c.tipoConveni !== tipoConv) return false;
        if (estat && c.estat !== estat) return false;
        return true;
    });
    renderTable(filtered);
}

// ── EXPIRY ALERTS ─────────────────────────────────────────────────────────────

function checkExpiryAlerts() {
    const soon = _convenisAll.filter((c) => {
        const days = daysUntil(c.dataFi);
        return days !== null && days <= 30 && days >= 0 && c.estat === 'vigent';
    });
    const banner = document.getElementById('expiryAlertBanner');
    const text = document.getElementById('expiryAlertText');
    if (soon.length && banner && text) {
        text.textContent = `${soon.length} conveni(s) caduca${soon.length > 1 ? 'ran' : 'rà'} en els propers 30 dies: ${soon.map((c) => c.nom).join(', ')}`;
        banner.style.display = 'flex';
    } else if (banner) {
        banner.style.display = 'none';
    }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

function openModal(id = '') {
    _editingId = id || '';
    _selectedFile = null;
    _docMethod = 'intern';

    const modal = document.getElementById('conveniModal');
    const title = document.getElementById('conveniModalTitle');
    const form = document.getElementById('conveniForm');
    const readOnlyBanner = document.getElementById('readOnlyBanner');
    const btnGuardar = document.getElementById('btnGuardarConveni');
    const vistoBueno = document.getElementById('vistoBuenoSection');
    const existingDocLink = document.getElementById('existingDocLink');

    form.reset();
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadFileName').style.display = 'none';
    existingDocLink.style.display = 'none';
    vistoBueno.style.display = 'none';

    hideConditionalRows();

    if (id) {
        const c = _convenisAll.find((x) => x.id === id);
        if (!c) return;
        title.textContent = _access.canEdit ? 'Editar Conveni' : 'Detall Conveni';

        document.getElementById('convId').value = id;
        document.getElementById('entNom').value = c.nom || '';
        document.getElementById('entCif').value = c.cif || '';
        document.getElementById('entContacte').value = c.contacte || '';
        document.getElementById('entEmail').value = c.emailContacte || '';
        document.getElementById('entTelefon').value = c.telefon || '';
        document.getElementById('entSector').value = c.sector || '';
        document.getElementById('entRepresentant').value = c.representant || '';
        document.getElementById('entRessolucio').value = c.ressolucio || '';
        document.getElementById('tipoConveni').value = c.tipoConveni || '';
        document.getElementById('dataInici').value = c.dataInici || '';
        document.getElementById('dataFi').value = c.dataFi || '';
        document.getElementById('convEstat').value = c.estat || 'pendent';
        document.getElementById('convNotes').value = c.notes || '';
        document.getElementById('firmantEntitat').value = c.firmantEntitat || '';
        document.getElementById('firmantDni').value = c.firmantDni || '';

        // Tipo entitat radio
        const radioToSet = document.querySelector(`input[name="tipoEntidad"][value="${CSS.escape(c.tipoEntitat || '')}"]`);
        if (radioToSet) { radioToSet.checked = true; updateRadioStyles('tipoEntidad'); showConditionalRows(c.tipoEntitat); }

        // Programs checkboxes
        renderProgramCheckboxes(Array.isArray(c.programes) ? c.programes : []);

        // Coord selector
        renderCoordSelector(c.firmantProgramaId || '');

        // Doc method
        selectDocMethod(c.docMethod || 'intern');

        // Existing doc
        if (c.docUrl) {
            existingDocLink.style.display = 'block';
            const anchor = document.getElementById('existingDocAnchor');
            anchor.href = c.docUrl;
            const uploadArea = document.getElementById('uploadArea');
            if (_docMethod === 'extern') uploadArea.style.display = 'block';
        }

        // VistoBueno — only dirección/admin, only if pendent
        if (_access.canApprove && c.estat === 'pendent') {
            vistoBueno.style.display = 'block';
        }
    } else {
        title.textContent = 'Nou Conveni / Acord';
        document.getElementById('convId').value = '';
        renderProgramCheckboxes([]);
        renderCoordSelector('');
        selectDocMethod('intern');
    }

    // Read-only mode
    const isReadOnly = !_access.canEdit;
    readOnlyBanner.style.display = isReadOnly ? 'flex' : 'none';
    btnGuardar.style.display = isReadOnly ? 'none' : 'flex';
    setFormReadOnly(isReadOnly);

    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('conveniModal').classList.remove('open');
    _editingId = '';
    _selectedFile = null;
}

function setFormReadOnly(readonly) {
    const form = document.getElementById('conveniForm');
    form.querySelectorAll('input, select, textarea').forEach((el) => {
        el.disabled = readonly;
    });
}

function hideConditionalRows() {
    document.getElementById('sectorRow').style.display = 'none';
    document.getElementById('ressolucioRow').style.display = 'none';
}

function showConditionalRows(tipo = '') {
    hideConditionalRows();
    if (tipo === 'empresa' || tipo === 'educatiu') {
        document.getElementById('sectorRow').style.display = 'grid';
    } else if (tipo === 'public') {
        document.getElementById('ressolucioRow').style.display = 'grid';
    }
}

function updateRadioStyles(name) {
    const checked = document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
    document.querySelectorAll(`input[name="${CSS.escape(name)}"]`).forEach((r) => {
        r.closest('.radio-label')?.classList.toggle('selected', r === checked);
    });
    if (name === 'tipoEntidad' && checked) {
        showConditionalRows(checked.value);
    }
}

function selectDocMethod(method = 'intern') {
    _docMethod = method;
    document.querySelectorAll('.doc-opt').forEach((el) => el.classList.remove('selected'));
    const opt = document.getElementById(`docOpt-${method}`);
    if (opt) opt.classList.add('selected');
    const radio = document.querySelector(`input[name="docMethod"][value="${method}"]`);
    if (radio) radio.checked = true;
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) uploadArea.style.display = method === 'extern' ? 'block' : 'none';
}

function onFileSelected(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
        showToast('El fitxer supera els 20 MB permesos', 'error');
        input.value = '';
        return;
    }
    _selectedFile = file;
    const uploadArea = document.getElementById('uploadArea');
    const fileName = document.getElementById('uploadFileName');
    uploadArea.classList.add('has-file');
    fileName.textContent = file.name;
    fileName.style.display = 'block';
}

// ── SAVE ─────────────────────────────────────────────────────────────────────

async function saveConveni(event) {
    event.preventDefault();
    if (!_access.canEdit) return showToast('No tens permisos per editar convenis', 'error');

    const nom = document.getElementById('entNom').value.trim();
    if (!nom) return showToast('Cal indicar el nom de l\'entitat', 'error');

    const tipoEntitat = document.querySelector('input[name="tipoEntidad"]:checked')?.value || '';
    if (!tipoEntitat) return showToast('Selecciona el tipus d\'entitat', 'error');

    const tipoConveni = document.getElementById('tipoConveni').value;
    if (!tipoConveni) return showToast('Selecciona el tipus de conveni', 'error');

    const dataInici = document.getElementById('dataInici').value;
    const dataFi    = document.getElementById('dataFi').value;
    if (!dataInici) return showToast('La data d\'inici és obligatòria', 'error');
    if (dataFi && dataFi < dataInici) return showToast('La data de fi ha de ser posterior a la d\'inici', 'error');

    const selectedPrograms = Array.from(
        document.querySelectorAll('#programesGroup input[name="programCheck"]:checked')
    ).map((el) => el.value);
    if (!selectedPrograms.length) return showToast('Marca almenys un programa vinculat', 'error');

    const btn = document.getElementById('btnGuardarConveni');
    btn.disabled = true;
    btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Guardant…';

    let docUrl = _editingId ? (_convenisAll.find((c) => c.id === _editingId)?.docUrl || '') : '';

    // Upload file to Storage if provided
    if (_selectedFile && _docMethod === 'extern') {
        try {
            const path = `convenis/${Date.now()}_${_selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, _selectedFile);
            docUrl = await getDownloadURL(fileRef);
        } catch (err) {
            console.error('Error pujant fitxer:', err);
            btn.disabled = false;
            btn.innerHTML = 'Guardar i activar conveni';
            return showToast('Error en pujar el fitxer. Torna-ho a intentar.', 'error');
        }
    }

    const firmantProgramaId = document.getElementById('firmantPrograma').value;
    const firmantProgramaNom = _staff.find((s) => s.id === firmantProgramaId)?.name || '';

    const payload = {
        nom,
        tipoEntitat,
        cif:               document.getElementById('entCif').value.trim(),
        contacte:          document.getElementById('entContacte').value.trim(),
        emailContacte:     document.getElementById('entEmail').value.trim(),
        telefon:           document.getElementById('entTelefon').value.trim(),
        sector:            document.getElementById('entSector').value.trim(),
        representant:      document.getElementById('entRepresentant').value.trim(),
        ressolucio:        document.getElementById('entRessolucio').value.trim(),
        tipoConveni,
        programes:         selectedPrograms,
        notes:             document.getElementById('convNotes').value.trim(),
        dataInici,
        dataFi,
        estat:             document.getElementById('convEstat').value || 'pendent',
        docMethod:         _docMethod,
        docUrl,
        firmantEntitat:    document.getElementById('firmantEntitat').value.trim(),
        firmantDni:        document.getElementById('firmantDni').value.trim(),
        firmantProgramaId,
        firmantProgramaNom,
        updatedAt:         serverTimestamp(),
        updatedBy:         localStorage.getItem('userEmail') || ''
    };

    try {
        if (_editingId) {
            await updateDoc(doc(db, 'convenis', _editingId), payload);
            showToast('Conveni actualitzat correctament', 'success');
        } else {
            payload.createdAt = serverTimestamp();
            payload.createdBy = localStorage.getItem('userEmail') || '';
            await addDoc(collection(db, 'convenis'), payload);
            showToast('Conveni creat correctament', 'success');
        }
        closeModal();
    } catch (err) {
        console.error('Error guardant conveni:', err);
        showToast('Error en guardar el conveni. Comprova la connexió.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar i activar conveni';
    }
}

// ── APPROVE (VistoBueno) ──────────────────────────────────────────────────────

async function approveConveni() {
    if (!_access.canApprove) return showToast('No tens permisos per aprovar convenis', 'error');
    if (!_editingId) return;
    try {
        await updateDoc(doc(db, 'convenis', _editingId), {
            estat: 'vigent',
            approvedAt: serverTimestamp(),
            approvedBy: localStorage.getItem('userEmail') || ''
        });
        showToast('Visto Bueno concedit. Conveni ara VIGENT.', 'success');
        closeModal();
    } catch (err) {
        console.error('Error aprovant conveni:', err);
        showToast('Error en aprovar el conveni', 'error');
    }
}

// ── AUTO-SUGGEST DATA FI ──────────────────────────────────────────────────────
// Called when dataInici or tipoConveni changes. Only fills dataFi if empty.

function autoSuggestDataFi() {
    const dataFiInput = document.getElementById('dataFi');
    if (!dataFiInput || dataFiInput.value) return; // don't overwrite if already set

    const dataInici = document.getElementById('dataInici')?.value;
    if (!dataInici) return;

    const tipoConveni = document.getElementById('tipoConveni')?.value || '';
    const start = new Date(dataInici);
    let suggested;

    if (tipoConveni === 'practiques') {
        // Next June 30 after start date (end of academic year)
        const june30 = new Date(start.getFullYear(), 5, 30); // month is 0-indexed
        suggested = june30 > start ? june30 : new Date(start.getFullYear() + 1, 5, 30);
    } else if (tipoConveni === 'dual') {
        // 2 years
        suggested = new Date(start);
        suggested.setFullYear(suggested.getFullYear() + 2);
    } else {
        // Collaboració or unknown: 1 year
        suggested = new Date(start);
        suggested.setFullYear(suggested.getFullYear() + 1);
    }

    dataFiInput.value = suggested.toISOString().slice(0, 10);

    // Visual hint so user knows it was auto-filled
    dataFiInput.style.borderColor = '#d97706';
    dataFiInput.title = 'Data suggerida automàticament. Pots canviar-la.';
    dataFiInput.addEventListener('change', () => {
        dataFiInput.style.borderColor = '';
        dataFiInput.title = '';
    }, { once: true });
}

// ── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
    _access = getAccess();

    // Show/hide new button based on edit permission
    const btnNou = document.getElementById('btnNouConveni');
    if (btnNou) {
        btnNou.style.display = _access.canEdit ? 'inline-flex' : 'none';
        btnNou.addEventListener('click', () => openModal());
    }

    // Form submit
    const form = document.getElementById('conveniForm');
    if (form) form.addEventListener('submit', saveConveni);

    // Close modal on backdrop click
    const modal = document.getElementById('conveniModal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Keyboard close
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Auto-suggest dataFi when dataInici or tipoConveni changes
    document.getElementById('dataInici')?.addEventListener('change', autoSuggestDataFi);
    document.getElementById('tipoConveni')?.addEventListener('change', autoSuggestDataFi);

    await Promise.all([loadPrograms(), loadStaff()]);
    subscribeConvenis();

    // Check expiry and dispatch internal notifications for expiring agreements (admin/dirección only)
    scheduleExpiryNotifications();
}

// ── EXPIRY NOTIFICATIONS ──────────────────────────────────────────────────────
// Creates gestio-avisos notifications for convenios expiring within 30 days
// Only runs if current user is admin/dirección (they already get them by watching the list)

async function scheduleExpiryNotifications() {
    if (!_access.canApprove) return; // Only admin/dirección
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 30);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        const today = isoToday();

        const q = query(
            collection(db, 'convenis'),
            where('estat', '==', 'vigent'),
            where('dataFi', '<=', cutoffIso),
            where('dataFi', '>=', today)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
            const c = d.data();
            const notifId = `conv-expiry-${d.id}`;
            // Avoid duplicate notifications: check if already exists today
            const existSnap = await getDoc(doc(db, 'gestio_avisos', notifId));
            if (!existSnap.exists()) {
                await updateDoc(doc(db, 'gestio_avisos', notifId), {}).catch(async () => {
                    const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                    await setDoc(doc(db, 'gestio_avisos', notifId), {
                        tipus: 'conveni_caducitat',
                        titol: `Conveni proper a caducar: ${c.nom}`,
                        missatge: `El conveni amb ${c.nom} caduca el ${fmtDate(c.dataFi)}. Revisa la renovació.`,
                        estat: 'pendent',
                        prioritat: 'alta',
                        dataCreacio: serverTimestamp(),
                        meta: { conveniId: d.id }
                    });
                });
            }
        }
    } catch (err) {
        console.warn('Error generant avisos de caducitat:', err);
    }
}

// ── EXPOSE GLOBALLY ───────────────────────────────────────────────────────────

window._conv = {
    openModal,
    closeModal,
    applyFilters,
    selectDocMethod,
    updateRadioStyles,
    onFileSelected,
    approveConveni,
    autoSuggestDataFi
};

// ── CSS spin animation (for save button loader) ────────────────────────────────
const style = document.createElement('style');
style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

init();
