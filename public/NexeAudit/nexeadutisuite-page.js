// Verificar acceso al módulo NexeAudit
        window.addEventListener('DOMContentLoaded', async () => {
            await window.checkModuleAccess('NexeAudit');
        });

        const defaultRows = [
            {code: '4.1', evidence: 'Context de l’organització definit', status: 'C', nc_text: ''},
            {code: '5.1', evidence: 'Compromís de lideratge documentat', status: 'P', nc_text: 'Cal reforçar la comunicació interna.'},
            {code: '6.1', evidence: 'Riscos i oportunitats identificats', status: 'C', nc_text: ''},
            {code: '7.2', evidence: 'Formació parcialment actualitzada', status: 'NC', nc_text: 'Falta evidència formativa de dues persones.'},
            {code: '8.1', evidence: 'Operació controlada amb registres', status: 'C', nc_text: ''},
            {code: '9.1', evidence: 'Indicadors disponibles però sense tancament mensual complet', status: 'P', nc_text: 'Pendents de consolidació KPI del trimestre.'},
            {code: '10.2', evidence: 'Accions de millora definides', status: 'C', nc_text: ''}
        ];

        function cloneRows() {
            return JSON.parse(JSON.stringify(defaultRows));
        }

        function getSeedAudits() {
            return [];
        }

        const defaultDepartments = [];

        const defaultActions = [];

        function getSharedDepartments() {
            try {
                const stored = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]');
                if (!Array.isArray(stored) || !stored.length) return [];
                return stored
                    .filter((item) => item.status !== 'Inactiu')
                    .map((item) => ({
                        name: item.name || item.nombre || '',
                        owner: item.manager || item.owner || 'Per assignar',
                        frequency: item.frequency || 'Trimestral',
                        status: item.status || 'Actiu'
                    }));
            } catch {
                return [];
            }
        }

        function getSharedStaff() {
            try {
                const stored = JSON.parse(localStorage.getItem('nexesocial_staff') || '[]');
                if (!Array.isArray(stored) || !stored.length) return [];
                return stored.filter((item) => item.status !== 'Baixa').map((item) => ({
                    name: item.name || '',
                    email: item.email || ''
                }));
            } catch {
                return [];
            }
        }

        function normalizeDeptName(value = '') {
            const clean = value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
            if (!clean || clean === 'ALL') return 'ALL';
            if (clean.includes('PSICOSOCIAL') || clean.includes('INTERVENCIO')) return 'INTERVENCIO SOCIAL';
            if (clean.includes('ADMIN')) return 'ADMINISTRACIO';
            if (clean.includes('RRHH') || clean.includes('RECURSOS')) return 'RRHH';
            if (clean.includes('DIRECC')) return 'DIRECCIO';
            return clean;
        }

        function matchesDeptFilter(dept) {
            const filter = normalizeDeptName(activeDeptFilter);
            if (filter === 'ALL') return true;
            return normalizeDeptName(dept) === filter;
        }

        function repairMojibake(value = '') {
            return String(value ?? '')
                .replace(/Ã€/g, 'À')
                .replace(/Ãˆ/g, 'È')
                .replace(/Ã‰/g, 'É')
                .replace(/Ã/g, 'Í')
                .replace(/Ã’/g, 'Ò')
                .replace(/Ã“/g, 'Ó')
                .replace(/Ãš/g, 'Ú')
                .replace(/Ã /g, 'à')
                .replace(/Ã¨/g, 'è')
                .replace(/Ã©/g, 'é')
                .replace(/Ã­/g, 'í')
                .replace(/Ã²/g, 'ò')
                .replace(/Ã³/g, 'ó')
                .replace(/Ãº/g, 'ú')
                .replace(/Ã§/g, 'ç')
                .replace(/Ã±/g, 'ñ')
                .replace(/Ã¼/g, 'ü')
                .replace(/Â·/g, '·')
                .replace(/â€™|’/g, "'")
                .replace(/â€œ|â€|“|”/g, '"')
                .replace(/â€“/g, '–')
                .replace(/â€”/g, '—')
                .replace(/INTERVENCIA“/g, 'INTERVENCIO')
                .trim();
        }

        function sanitizePlainText(value = '') {
            const text = repairMojibake(value)
                .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
                .replace(/<\/?(textarea|script|style|iframe|object|embed)[^>]*>/gi, ' ')
                .replace(/[<>]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (/(document\.|window\.|querySelector\(|getElementById\(|printWindow\.|function\s+[a-zA-Z_$]|=>)/i.test(text) && text.length > 80) {
                return 'Contingut restaurat automàticament';
            }

            return text;
        }

        function formatDeptDisplay(value = '') {
            const dept = normalizeDeptName(repairMojibake(value));
            const labels = {
                'ADMINISTRACIO': 'ADMINISTRACIÓ',
                'INTERVENCIO SOCIAL': 'INTERVENCIÓ SOCIAL',
                'DIRECCIO': 'DIRECCIÓ',
                'RRHH': 'RRHH',
                'ALL': 'Vista global'
            };
            return labels[dept] || repairMojibake(value);
        }

        function escapeHtml(value = '') {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        const sharedDepartments = getSharedDepartments();
        let audits = JSON.parse(localStorage.getItem('nexe_audits_db')) || [];
        let departments = sharedDepartments.length ? sharedDepartments : (JSON.parse(localStorage.getItem('nexeaudit_departments')) || defaultDepartments);
        let actions = JSON.parse(localStorage.getItem('nexeaudit_actions')) || defaultActions;
        let activeDeptFilter = 'ALL';

        if (!audits.length) {
            audits = getSeedAudits();
        }
        if (!departments.length) {
            departments = defaultDepartments;
        }
        if (!actions.length) {
            actions = defaultActions;
        }

        audits = (Array.isArray(audits) ? audits : []).map((audit, index) => ({
            id: sanitizePlainText(audit?.id || `AUD-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`),
            dept: normalizeDeptName(audit?.dept || ''),
            date: sanitizePlainText(audit?.date || new Date().toISOString().split('T')[0]),
            auditor: sanitizePlainText(audit?.auditor || ''),
            conclusions: sanitizePlainText(audit?.conclusions || ''),
            rows: Array.isArray(audit?.rows) && audit.rows.length
                ? audit.rows.map((row) => ({
                    code: sanitizePlainText(row?.code || ''),
                    evidence: sanitizePlainText(row?.evidence || ''),
                    status: ['C', 'P', 'NC'].includes(row?.status) ? row.status : 'C',
                    nc_text: sanitizePlainText(row?.nc_text || '')
                }))
                : cloneRows()
        })).filter((audit) => audit.id && audit.dept);

        departments = (Array.isArray(departments) ? departments : []).map((item, index) => ({
            name: normalizeDeptName(item?.name || `DEPARTAMENT ${index + 1}`),
            owner: sanitizePlainText(item?.owner || 'Per assignar'),
            frequency: sanitizePlainText(item?.frequency || 'Trimestral'),
            status: sanitizePlainText(item?.status || 'Actiu')
        }));

        actions = (Array.isArray(actions) ? actions : []).map((item, index) => ({
            id: sanitizePlainText(item?.id || `AC-${String(index + 1).padStart(3, '0')}`),
            title: sanitizePlainText(item?.title || ''),
            dept: normalizeDeptName(item?.dept || ''),
            due: sanitizePlainText(item?.due || new Date().toISOString().split('T')[0]),
            owner: sanitizePlainText(item?.owner || 'Per assignar'),
            status: sanitizePlainText(item?.status || 'Planificada')
        })).filter((item) => item.title);

        localStorage.setItem('nexe_audits_db', JSON.stringify(audits));
        localStorage.setItem('nexeaudit_departments', JSON.stringify(departments));
        localStorage.setItem('nexeaudit_actions', JSON.stringify(actions));

        let currentEditingId = null;
        let pendingDeleteAuditId = null;

        window.onload = () => renderAuditList();

        function renderAuditList() {
            const body = document.getElementById('audit-list-body');
            body.innerHTML = '';
            const filteredAudits = audits.filter(audit => matchesDeptFilter(audit.dept));

            if (!filteredAudits.length) {
                body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b; padding:20px;">No hi ha auditories per al filtre seleccionat</td></tr>';
                renderDashboard();
                return;
            }

            filteredAudits.sort((a, b) => b.id.localeCompare(a.id)).forEach(audit => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.onclick = () => openEditModal(audit.id);
                tr.innerHTML = `
                    <td style="font-weight:700; color:var(--audit-accent)">${escapeHtml(audit.id)}</td>
                    <td><span class="dept-badge">${escapeHtml(formatDeptDisplay(audit.dept))}</span></td>
                    <td>${escapeHtml(audit.date)}</td>
                    <td>${escapeHtml(audit.auditor || '---')}</td>
                    <td style="text-align:right">
                        <button class="btn-remove" title="Eliminar" onclick="confirmDelete(event, '${encodeURIComponent(audit.id)}')">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </td>
                `;
                body.appendChild(tr);
            });

            renderDashboard();
        }

        function renderDashboard() {
            const filteredAudits = audits.filter(a => matchesDeptFilter(a.dept));
            const totalRows = filteredAudits.flatMap(a => a.rows || []);
            const scoreMap = { C: 100, P: 50, NC: 0 };
            const score = totalRows.length ? Math.round(totalRows.reduce((acc, row) => acc + (scoreMap[row.status] ?? 0), 0) / totalRows.length) : 0;
            const ncRows = totalRows.filter(r => r.status === 'NC');
            const partialRows = totalRows.filter(r => r.status === 'P');
            const filteredActions = actions.filter(a => matchesDeptFilter(a.dept));
            const filteredDepartments = departments.filter(d => matchesDeptFilter(d.name));

            document.getElementById('kpi-compliance').textContent = `${score}%`;
            document.getElementById('kpi-audits').textContent = String(filteredAudits.length);
            document.getElementById('kpi-nc').textContent = String(ncRows.length);
            document.getElementById('kpi-actions').textContent = String(filteredActions.length);

            const findingsBody = document.getElementById('findings-body');
            findingsBody.innerHTML = '';

            const findings = [];
            filteredAudits.forEach(audit => {
                (audit.rows || []).forEach(row => {
                    if (row.status === 'NC' || row.status === 'P') {
                        findings.push({
                            dept: audit.dept,
                            code: row.code,
                            severity: row.status === 'NC' ? 'Major' : 'Menor',
                            status: row.status === 'NC' ? 'Oberta' : 'Seguiment'
                        });
                    }
                });
            });

            if (!findings.length) {
                findingsBody.innerHTML = '<tr><td colspan="4" style="color:#64748b; text-align:center;">Sense no conformitats obertes</td></tr>';
            } else {
                findings.slice(0, 8).forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${escapeHtml(formatDeptDisplay(item.dept))}</td>
                        <td>${escapeHtml(item.code)}</td>
                        <td><span class="tag ${item.severity === 'Major' ? 'danger' : 'warn'}">${escapeHtml(item.severity)}</span></td>
                        <td>${escapeHtml(item.status)}</td>
                    `;
                    findingsBody.appendChild(row);
                });
            }

            const departmentsBody = document.getElementById('departments-body');
            departmentsBody.innerHTML = filteredDepartments.length ? filteredDepartments.map(item => `
                <tr>
                    <td>${escapeHtml(formatDeptDisplay(item.name))}</td>
                    <td>${escapeHtml(item.owner)}</td>
                    <td>${escapeHtml(item.frequency)}</td>
                    <td><span class="tag ok">${escapeHtml(item.status)}</span></td>
                    <td><button class="btn" style="padding:6px 10px; background:#eff6ff; color:#1d4ed8;" onclick="openEntityModal('department', '${encodeURIComponent(item.name)}')">Editar</button></td>
                </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center; color:#64748b;">Sense departaments</td></tr>';

            const actionsBody = document.getElementById('actions-body');
            actionsBody.innerHTML = filteredActions.length ? filteredActions.map((item, index) => `
                <tr>
                    <td>${escapeHtml(item.id)}</td>
                    <td>${escapeHtml(item.title)}</td>
                    <td>${escapeHtml(formatDeptDisplay(item.dept))}</td>
                    <td>${escapeHtml(item.due)}</td>
                    <td style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn" style="padding:6px 10px; background:#eff6ff; color:#1d4ed8;" onclick="toggleActionStatus(${index})">${escapeHtml(item.status)}</button>
                        <button class="btn" style="padding:6px 10px; background:#f8fafc; color:#475569; border:1px solid #cbd5e1;" onclick="openEntityModal('action', '${encodeURIComponent(item.id)}')">Editar</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center; color:#64748b;">Sense accions correctives</td></tr>';

            const currentFilter = document.getElementById('current-filter-label');
            if (currentFilter) {
                currentFilter.innerHTML = `<span class="tag">${escapeHtml(formatDeptDisplay(activeDeptFilter))}</span>`;
            }
        }

        let entityModalMode = null;
        let entityModalKey = null;

        function showToast(message, tone = 'success') {
            const toast = document.getElementById('audit-toast');
            if (!toast) return;
            toast.textContent = message;
            toast.style.display = 'block';
            toast.style.background = tone === 'error' ? '#b91c1c' : '#0f172a';
            clearTimeout(window.auditToastTimer);
            window.auditToastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2400);
        }

        function seedDemoData() {
            audits = getSeedAudits();
            departments = [...defaultDepartments];
            actions = [...defaultActions];
            activeDeptFilter = 'ALL';
            saveDB();
            renderAuditList();
            window.dispatchEvent(new CustomEvent('nexeaudit-data-updated'));
            showToast('Dades d’exemple carregades');
        }

        window.loadDeptData = function(dept) {
            const normalized = normalizeDeptName(dept);
            activeDeptFilter = normalized || 'ALL';

            if (normalized !== 'ALL' && !departments.some(d => normalizeDeptName(d.name) === normalized)) {
                departments.push({ name: normalized, owner: 'Per assignar', frequency: 'Trimestral', status: 'Actiu' });
                saveDB();
                window.dispatchEvent(new CustomEvent('nexeaudit-data-updated'));
            }

            renderAuditList();
        };

        function closeEntityModal() {
            document.getElementById('entity-modal').style.display = 'none';
            entityModalMode = null;
            entityModalKey = null;
        }

        function openEntityModal(mode, key = null) {
            entityModalMode = mode;
            entityModalKey = key ? decodeURIComponent(key) : null;

            const title = document.getElementById('entity-modal-title');
            const subtitle = document.getElementById('entity-modal-subtitle');
            const body = document.getElementById('entity-modal-body');
            const departmentOptions = departments.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(formatDeptDisplay(item.name))}</option>`).join('');
            const staffOptions = getSharedStaff().map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('');

            if (mode === 'audit') {
                title.textContent = 'Nova auditoria';
                subtitle.textContent = 'Crea una auditoria completa des del mateix modal';
                body.innerHTML = `
                    <div class="field"><label>Programa / àrea</label><select id="audit-dept">${departmentOptions}</select></div>
                    <div class="field"><label>Data</label><input id="audit-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
                    <div class="field full"><label>Auditor responsable</label>${staffOptions ? `<select id="audit-auditor"><option value="">Selecciona professional...</option>${staffOptions}</select>` : `<input id="audit-auditor" value="" placeholder="Nom de l'auditor">`}</div>
                `;
                const deptField = document.getElementById('audit-dept');
                if (deptField && activeDeptFilter !== 'ALL') deptField.value = activeDeptFilter;
            }

            if (mode === 'department') {
                const current = departments.find(item => item.name === entityModalKey) || { name: activeDeptFilter !== 'ALL' ? activeDeptFilter : '', owner: '', frequency: 'Trimestral', status: 'Actiu' };
                title.textContent = entityModalKey ? 'Editar departament' : 'Nou departament';
                subtitle.textContent = 'Configura l’estructura de l’entitat auditada';
                body.innerHTML = `
                    <div class="field"><label>Nom del departament</label><input id="entity-name" value="${escapeHtml(current.name || '')}" placeholder="Administració"></div>
                    <div class="field"><label>Responsable</label><input id="entity-owner" value="${escapeHtml(current.owner || '')}" placeholder="Nom responsable"></div>
                    <div class="field"><label>Freqüència</label><select id="entity-frequency"><option ${current.frequency==='Mensual'?'selected':''}>Mensual</option><option ${current.frequency==='Trimestral'?'selected':''}>Trimestral</option><option ${current.frequency==='Semestral'?'selected':''}>Semestral</option><option ${current.frequency==='Anual'?'selected':''}>Anual</option></select></div>
                    <div class="field"><label>Estat</label><select id="entity-status"><option ${current.status==='Actiu'?'selected':''}>Actiu</option><option ${current.status==='En revisió'?'selected':''}>En revisió</option><option ${current.status==='Inactiu'?'selected':''}>Inactiu</option></select></div>
                `;
            }

            if (mode === 'finding') {
                title.textContent = 'Nova no conformitat';
                subtitle.textContent = 'Registra una incidència ISO amb seguiment integrat';
                body.innerHTML = `
                    <div class="field"><label>Departament</label><select id="finding-dept">${departmentOptions}</select></div>
                    <div class="field"><label>Clàusula ISO</label><input id="finding-clause" value="7.2" placeholder="7.2"></div>
                    <div class="field"><label>Nivell</label><select id="finding-level"><option>Menor</option><option>Major</option><option>Crítica</option></select></div>
                    <div class="field"><label>Resultat</label><select id="finding-status"><option value="NC">No compleix</option><option value="P">Parcial</option></select></div>
                    <div class="field full"><label>Descripció</label><textarea id="finding-desc" rows="4" placeholder="Descripció de la incidència detectada"></textarea></div>
                `;
                const deptField = document.getElementById('finding-dept');
                if (deptField && activeDeptFilter !== 'ALL') deptField.value = activeDeptFilter;
            }

            if (mode === 'action') {
                const current = actions.find(item => item.id === entityModalKey) || { title: '', dept: activeDeptFilter !== 'ALL' ? activeDeptFilter : (departments[0]?.name || ''), owner: '', due: new Date(Date.now() + 12096e5).toISOString().split('T')[0], status: 'Planificada' };
                title.textContent = entityModalKey ? 'Editar acció correctiva' : 'Nova acció correctiva';
                subtitle.textContent = 'Defineix responsable, termini i estat de seguiment';
                body.innerHTML = `
                    <div class="field full"><label>Acció correctiva</label><input id="action-title" value="${escapeHtml(current.title || '')}" placeholder="Regularitzar evidències pendents"></div>
                    <div class="field"><label>Departament</label><select id="action-dept">${departmentOptions}</select></div>
                    <div class="field"><label>Responsable</label><input id="action-owner" value="${escapeHtml(current.owner || '')}" placeholder="Responsable"></div>
                    <div class="field"><label>Data límit</label><input id="action-due" type="date" value="${escapeHtml(current.due || '')}"></div>
                    <div class="field"><label>Estat</label><select id="action-status"><option ${current.status==='Planificada'?'selected':''}>Planificada</option><option ${current.status==='En curs'?'selected':''}>En curs</option><option ${current.status==='Tancada'?'selected':''}>Tancada</option></select></div>
                `;
                const deptField = document.getElementById('action-dept');
                if (deptField && current.dept) deptField.value = current.dept;
            }

            if (mode === 'confirm-delete') {
                title.textContent = 'Eliminar informe';
                subtitle.textContent = 'Aquesta acció no es pot desfer';
                body.innerHTML = `
                    <div class="field full">
                        <label>Confirmació</label>
                        <div style="padding:14px 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; color:#991b1b;">
                            Estàs segur que vols eliminar l'informe <strong>${escapeHtml(entityModalKey)}</strong>?
                        </div>
                    </div>
                `;
            }

            const saveBtn = document.getElementById('entity-save-btn');
            saveBtn.textContent = mode === 'confirm-delete' ? 'Eliminar' : 'Guardar';
            saveBtn.className = mode === 'confirm-delete' ? 'btn btn-danger' : 'btn btn-save';
            saveBtn.onclick = submitEntityModal;
            document.getElementById('entity-modal').style.display = 'flex';
        }

        function submitEntityModal() {
            if (entityModalMode === 'audit') {
                const dept = normalizeDeptName(document.getElementById('audit-dept').value);
                const date = sanitizePlainText(document.getElementById('audit-date').value || new Date().toISOString().split('T')[0]);
                const auditor = sanitizePlainText(document.getElementById('audit-auditor').value || '');
                const newId = `AUD-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;
                if (!departments.some(item => item.name === dept)) {
                    departments.push({ name: dept, owner: auditor || 'Per assignar', frequency: 'Trimestral', status: 'Actiu' });
                }
                audits.push({ id: newId, dept, date, auditor, conclusions: '', rows: cloneRows() });
                saveDB();
                renderAuditList();
                closeEntityModal();
                openEditModal(newId);
                return showToast('Nova auditoria creada');
            }

            if (entityModalMode === 'department') {
                const name = normalizeDeptName(document.getElementById('entity-name').value);
                const owner = sanitizePlainText(document.getElementById('entity-owner').value || 'Per assignar');
                const frequency = sanitizePlainText(document.getElementById('entity-frequency').value);
                const status = sanitizePlainText(document.getElementById('entity-status').value);
                if (!name) return showToast('Cal indicar un departament', 'error');
                const existingIndex = departments.findIndex(item => item.name === entityModalKey || item.name === name);
                if (existingIndex >= 0) departments[existingIndex] = { name, owner, frequency, status };
                else departments.push({ name, owner, frequency, status });
                showToast('Departament guardat correctament');
            }

            if (entityModalMode === 'finding') {
                const dept = normalizeDeptName(document.getElementById('finding-dept').value);
                const clause = sanitizePlainText(document.getElementById('finding-clause').value || '7.2');
                const level = sanitizePlainText(document.getElementById('finding-level').value);
                const status = document.getElementById('finding-status').value;
                const desc = sanitizePlainText(document.getElementById('finding-desc').value || 'Sense detall');
                let targetAudit = audits.find(a => normalizeDeptName(a.dept) === dept);
                if (!targetAudit) {
                    const newId = `AUD-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;
                    targetAudit = { id: newId, dept, date: new Date().toISOString().split('T')[0], auditor: '', conclusions: '', rows: cloneRows() };
                    audits.push(targetAudit);
                }
                targetAudit.rows.push({ code: clause, evidence: desc, status, nc_text: `${level}: ${desc}` });
                showToast('No conformitat registrada');
            }

            if (entityModalMode === 'action') {
                const title = sanitizePlainText(document.getElementById('action-title').value);
                const dept = normalizeDeptName(document.getElementById('action-dept').value);
                const owner = sanitizePlainText(document.getElementById('action-owner').value || 'Per assignar');
                const due = sanitizePlainText(document.getElementById('action-due').value || new Date().toISOString().split('T')[0]);
                const status = sanitizePlainText(document.getElementById('action-status').value);
                if (!title) return showToast('Cal indicar una acció correctiva', 'error');
                const existingIndex = actions.findIndex(item => item.id === entityModalKey);
                const payload = { id: entityModalKey || `AC-${String(actions.length + 1).padStart(3, '0')}`, title, dept, owner, due, status };
                if (existingIndex >= 0) actions[existingIndex] = payload;
                else actions.push(payload);
                showToast('Acció correctiva guardada');
            }

            if (entityModalMode === 'confirm-delete') {
                audits = audits.filter(a => a.id !== entityModalKey);
                showToast(`Informe ${entityModalKey} eliminat`);
            }

            saveDB();
            renderAuditList();
            window.dispatchEvent(new CustomEvent('nexeaudit-data-updated'));
            closeEntityModal();
        }

        function createDepartment() { openEntityModal('department'); }
        function openFindingModal() { openEntityModal('finding'); }
        function openActionModal() { openEntityModal('action'); }
        window.openEntityModal = openEntityModal;
        window.openNewAuditModal = openNewAuditModal;

        function toggleActionStatus(index) {
            const visibleActions = actions.filter(a => matchesDeptFilter(a.dept));
            const action = visibleActions[index];
            if (!action) return;
            const realIndex = actions.findIndex(a => a.id === action.id);
            const flow = ['Planificada', 'En curs', 'Tancada'];
            const current = flow.indexOf(actions[realIndex].status);
            actions[realIndex].status = flow[(current + 1) % flow.length];
            saveDB();
            renderAuditList();
            showToast(`Acció ${actions[realIndex].id} actualitzada`);
        }

        function exportBackup() {
            const backup = { audits, departments, actions, exportedAt: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexeaudit-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Backup exportat');
        }

        function importBackup(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    audits = data.audits || [];
                    departments = data.departments || [];
                    actions = data.actions || [];
                    saveDB();
                    renderAuditList();
                    window.dispatchEvent(new CustomEvent('nexeaudit-data-updated'));
                    showToast('Backup importat correctament');
                } catch (error) {
                    showToast('El fitxer no és vàlid', 'error');
                }
            };
            reader.readAsText(file);
        }

        function getExecutiveReportData() {
            const filteredAudits = audits.filter(a => matchesDeptFilter(a.dept));
            const totalRows = filteredAudits.flatMap(a => a.rows || []);
            const compliance = totalRows.length ? Math.round(totalRows.reduce((acc, row) => acc + ({C:100,P:50,NC:0}[row.status] ?? 0), 0) / totalRows.length) : 0;
            const findings = totalRows.filter(row => row.status === 'NC' || row.status === 'P');
            const filteredActions = actions.filter(a => matchesDeptFilter(a.dept));

            return {
                filteredAudits,
                compliance,
                findings,
                filteredActions,
                currentFilter: activeDeptFilter === 'ALL' ? 'Tots els departaments' : formatDeptDisplay(activeDeptFilter),
                exportDate: new Date().toLocaleDateString('ca-ES')
            };
        }

        function buildExecutivePreviewHTML() {
            const data = getExecutiveReportData();
            const auditsRows = data.filteredAudits.length
                ? data.filteredAudits.map(a => `<tr><td>${escapeHtml(formatDeptDisplay(a.dept))}</td><td>${escapeHtml(a.auditor || '---')}</td><td>${escapeHtml(a.date)}</td><td>${escapeHtml((a.conclusions || '').slice(0, 80) || 'Sense observacions')}</td></tr>`).join('')
                : '<tr><td colspan="4">Sense auditories en aquest filtre</td></tr>';

            const findingsRows = data.findings.length
                ? data.findings.slice(0, 6).map(item => `<tr><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.status === 'NC' ? 'No conforme' : 'Parcial')}</td><td>${escapeHtml((item.nc_text || item.evidence || '').slice(0, 70))}</td></tr>`).join('')
                : '<tr><td colspan="3">Sense troballes obertes</td></tr>';

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:14px; margin-bottom:18px;">
                    <div>
                        <h2 style="margin:0;">Resum Executiu ISO 9001</h2>
                        <div style="color:#64748b; margin-top:4px;">Nexe Audit Suite · Vista prèvia d'impressió</div>
                    </div>
                    <div style="text-align:right; color:#64748b; font-size:0.9rem;">
                        <div>${data.exportDate}</div>
                        <div>${data.currentFilter}</div>
                    </div>
                </div>

                <div class="executive-meta">
                    <div><strong>Compliment global</strong><span>${data.compliance}%</span></div>
                    <div><strong>Auditories</strong><span>${data.filteredAudits.length}</span></div>
                    <div><strong>Accions correctives</strong><span>${data.filteredActions.length}</span></div>
                </div>

                <h3 style="margin:18px 0 8px 0;">Auditories del període</h3>
                <table class="executive-table">
                    <thead><tr><th>Departament</th><th>Auditor</th><th>Data</th><th>Conclusions</th></tr></thead>
                    <tbody>${auditsRows}</tbody>
                </table>

                <h3 style="margin:18px 0 8px 0;">No conformitats i seguiment</h3>
                <table class="executive-table">
                    <thead><tr><th>Clàusula</th><th>Estat</th><th>Observació</th></tr></thead>
                    <tbody>${findingsRows}</tbody>
                </table>
            `;
        }

        function openExecutivePreviewModal() {
            const container = document.getElementById('executive-preview-content');
            if (container) {
                container.innerHTML = buildExecutivePreviewHTML();
            }
            document.getElementById('executive-preview-modal').style.display = 'flex';
        }

        function closeExecutivePreviewModal() {
            document.getElementById('executive-preview-modal').style.display = 'none';
        }

        function printExecutivePreview() {
            const content = document.getElementById('executive-preview-content')?.innerHTML;
            if (!content) return;
            const printWindow = window.open('', '_blank', 'width=900,height=700');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Resum Executiu ISO 9001</title>
                        <style>
                            body { font-family: Inter, Arial, sans-serif; margin: 24px; color: #0f172a; }
                            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                            th, td { border: 1px solid #dbe2ea; padding: 8px 10px; font-size: 12px; text-align: left; }
                            th { background: #f8fafc; }
                            .executive-meta { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 18px; }
                            .executive-meta div { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; }
                            .executive-meta strong { display:block; color:#64748b; font-size:10px; text-transform:uppercase; margin-bottom:4px; }
                        </style>
                    </head>
                    <body>${content}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }

        document.addEventListener('click', (event) => {
            if (event.target?.id === 'entity-modal') closeEntityModal();
            if (event.target?.id === 'executive-preview-modal') closeExecutivePreviewModal();
            if (event.target?.id === 'custom-modal') closeModal();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeEntityModal();
                closeExecutivePreviewModal();
                closeModal();
            }
        });

        async function generateExecutiveDashboardPDF() {
            const data = getExecutiveReportData();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const ent = (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem('nexe_config_entitat') || '{}');
                    return {
                        nom: raw.nom || 'NexeSocial',
                        cif: raw.cif || '',
                        telefon: raw.telefon || '',
                        email: raw.email || ''
                    };
                } catch {
                    return { nom: 'NexeSocial', cif: '', telefon: '', email: '' };
                }
            })();
            const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(`${ent.nom} - Resum Executiu ISO 9001`, 14, 18);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            if (entContact) doc.text(entContact, 14, 24);
            doc.text(`Data d'exportació: ${data.exportDate}`, 14, 26);
            doc.text(`Filtre actiu: ${data.currentFilter}`, 14, 32);
            doc.text(`Compliment global: ${data.compliance}%`, 14, 42);
            doc.text(`Auditories: ${data.filteredAudits.length}`, 14, 48);
            doc.text(`Accions correctives: ${data.filteredActions.length}`, 14, 54);

            doc.autoTable({
                startY: 62,
                head: [['Departament', 'Auditor', 'Data', 'Conclusions']],
                body: data.filteredAudits.map((item) => [
                    item.dept,
                    item.auditor || '---',
                    item.date,
                    (item.conclusions || '').slice(0, 70)
                ]),
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { fontSize: 8 }
            });

            doc.save(`resum-executiu-${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Informe executiu generat');
        }

        function closeModal() {
            const modal = document.getElementById('custom-modal');
            if (modal) modal.style.display = 'none';
        }

        function openNewAuditModal() {
            openEntityModal('audit');
        }

        function confirmDelete(e, id) {
            e.stopPropagation();
            openEntityModal('confirm-delete', decodeURIComponent(id));
        }

        function openEditModal(id) {
            currentEditingId = id;
            const audit = audits.find(a => a.id === id);
            if (!audit) {
                showToast("No s'ha trobat l'auditoria", 'error');
                return;
            }
            document.getElementById('modal-report-id').innerText = `ID: ${audit.id}`;
            document.getElementById('modal-dept-badge').innerText = formatDeptDisplay(audit.dept);
            document.getElementById('edit_auditor').value = audit.auditor || '';
            document.getElementById('edit_date').value = audit.date;
            document.getElementById('edit_conclusions').value = audit.conclusions || '';
            const rowsBody = document.getElementById('modal-rows-body');
            rowsBody.innerHTML = '';
            audit.rows.forEach(r => addRowToModal(r));
            document.getElementById('form-modal').style.display = 'block';
        }

        function addRowToModal(data = {code: '', evidence: '', status: 'C', nc_text: ''}) {
            const safeData = {
                code: sanitizePlainText(data.code || ''),
                evidence: sanitizePlainText(data.evidence || ''),
                status: ['C', 'P', 'NC'].includes(data.status) ? data.status : 'C',
                nc_text: sanitizePlainText(data.nc_text || '')
            };

            const tr = document.createElement('tr');
            tr.className = `row-item ${safeData.status === 'NC' || safeData.status === 'P' ? 'has-nc' : ''}`;
            tr.innerHTML = `
                <td><input type="text" class="r-code" placeholder="ISO 9.1"></td>
                <td>
                    <textarea class="r-evidence" rows="2" placeholder="Evidències trobades..."></textarea>
                    <div class="nc-description">
                        <textarea class="r-nc-text" rows="2" placeholder="Acció correctora requerida..."></textarea>
                    </div>
                </td>
                <td>
                    <select class="r-status" onchange="this.closest('.row-item').classList.toggle('has-nc', this.value==='NC' || this.value==='P')">
                        <option value="C">Cumple</option>
                        <option value="P">Parcial</option>
                        <option value="NC">No cumple</option>
                    </select>
                </td>
            `;

            tr.querySelector('.r-code').value = safeData.code;
            tr.querySelector('.r-evidence').value = safeData.evidence;
            tr.querySelector('.r-nc-text').value = safeData.nc_text;
            tr.querySelector('.r-status').value = safeData.status;

            document.getElementById('modal-rows-body').appendChild(tr);
        }

        function saveAuditData(silent = false) {
            const index = audits.findIndex(a => a.id === currentEditingId);
            if (index < 0) return;

            const rows = Array.from(document.querySelectorAll('.row-item')).map(tr => ({
                code: sanitizePlainText(tr.querySelector('.r-code').value),
                evidence: sanitizePlainText(tr.querySelector('.r-evidence').value),
                status: tr.querySelector('.r-status').value,
                nc_text: sanitizePlainText(tr.querySelector('.r-nc-text').value)
            }));

            audits[index] = {
                ...audits[index],
                auditor: sanitizePlainText(document.getElementById('edit_auditor').value),
                date: sanitizePlainText(document.getElementById('edit_date').value),
                conclusions: sanitizePlainText(document.getElementById('edit_conclusions').value),
                rows: rows
            };

            saveDB();
            renderAuditList();
            if(!silent) showToast('Dades guardades correctament.');
        }

        async function generateISO9001PDF() {
            saveAuditData(true); 
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const audit = audits.find(a => a.id === currentEditingId);
            const ent = (() => {
                try {
                    const raw = JSON.parse(localStorage.getItem('nexe_config_entitat') || '{}');
                    return {
                        nom: raw.nom || 'NexeSocial',
                        cif: raw.cif || '',
                        telefon: raw.telefon || '',
                        email: raw.email || ''
                    };
                } catch {
                    return { nom: 'NexeSocial', cif: '', telefon: '', email: '' };
                }
            })();
            const entContact = [ent.cif, ent.telefon, ent.email].filter(Boolean).join(' · ');

            // Cabecera Técnica ISO 9001
            doc.setDrawColor(30, 41, 59);
            doc.rect(10, 10, 190, 35); 
            doc.line(60, 10, 60, 45); 
            doc.line(145, 10, 145, 45);

            // Logos
            try {
                const logoNexe = document.getElementById('pdf-logo-nexe');
                const logoSuite = document.getElementById('pdf-logo-suite');
                doc.addImage(logoNexe, 'PNG', 15, 18, 35, 12);
                doc.addImage(logoSuite, 'SVG', 150, 15, 25, 25);
            } catch (e) { console.warn("Error logos:", e); }

            // Textos Cabecera
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(`SISTEMA DE GESTIÓ DE QUALITAT · ${ent.nom.toUpperCase()}`, 102, 22, {align: 'center'});
            doc.setFontSize(13);
            doc.text("INFORME D'AUDITORIA INTERNA", 102, 30, {align: 'center'});
            doc.setFontSize(9);
            doc.text("ISO 9001:2015", 102, 38, {align: 'center'});
            if (entContact) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(entContact, 102, 42, { align: 'center' });
            }

            doc.setFontSize(8);
            doc.text(`CODI: ${audit.id}`, 148, 20);
            doc.text(`DATA: ${audit.date}`, 148, 28);
            doc.text(`PÀG: 1 de 1`, 148, 36);

            // Info General
            doc.setFontSize(10);
            doc.text(`PROGRAMA AUDITAT: ${audit.dept}`, 10, 55);
            doc.text(`AUDITOR: ${audit.auditor || '---'}`, 10, 62);

            // Tabla de Hallazgos
            const tableBody = audit.rows.map(r => [
                r.code, 
                r.status === 'NC' || r.status === 'P' ? `${r.evidence}\n\nSEGUIMENT / ACCIÓ:\n${r.nc_text}` : r.evidence, 
                r.status === 'C' ? 'CONFORME' : (r.status === 'P' ? 'PARCIAL' : 'NO CONFORME')
            ]);

            doc.autoTable({
                startY: 70,
                head: [['REQUISIT ISO', 'EVIDÈNCIES I OBSERVACIONS', 'RESULTAT']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 5 },
                columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 30 } },
                didParseCell: (data) => {
                    if (data.row.raw[2] === 'NO CONFORME') data.cell.styles.fillColor = [255, 230, 230];
                    if (data.row.raw[2] === 'PARCIAL') data.cell.styles.fillColor = [255, 247, 237];
                }
            });

            // Conclusions
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont("helvetica", "bold");
            doc.text("CONCLUSIONS I PLANS D'ACCIÓ:", 10, finalY);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const splitText = doc.splitTextToSize(audit.conclusions || "Sense observacions addicionals.", 180);
            doc.text(splitText, 10, finalY + 7);

            // Firmas
            const footerY = doc.internal.pageSize.height - 30;
            doc.line(20, footerY, 70, footerY);
            doc.line(130, footerY, 180, footerY);
            doc.setFontSize(7);
            doc.text("Signatura Auditor", 45, footerY + 5, {align: 'center'});
            doc.text("Signatura Responsable Programa", 155, footerY + 5, {align: 'center'});

            doc.save(`${audit.id}_ISO9001.pdf`);
        }

        function saveDB() {
            localStorage.setItem('nexe_audits_db', JSON.stringify(audits));
            localStorage.setItem('nexeaudit_departments', JSON.stringify(departments));
            localStorage.setItem('nexeaudit_actions', JSON.stringify(actions));

            try {
                const shared = JSON.parse(localStorage.getItem('nexesocial_departments') || '[]');
                const merged = Array.isArray(shared) ? [...shared] : [];
                departments.forEach((item, index) => {
                    const exists = merged.some((dept) => normalizeDeptName(dept.name || '') === normalizeDeptName(item.name || ''));
                    if (!exists) {
                        merged.push({
                            id: `audit-${index}-${Date.now()}`,
                            code: normalizeDeptName(item.name || '').slice(0, 8),
                            name: formatDeptDisplay(item.name),
                            area: 'Qualitat',
                            manager: item.owner || 'Per assignar',
                            frequency: item.frequency || 'Trimestral',
                            status: item.status || 'Actiu'
                        });
                    }
                });
                if (merged.length) localStorage.setItem('nexesocial_departments', JSON.stringify(merged));
            } catch {}

            window.dispatchEvent(new CustomEvent('nexeaudit-data-updated'));
        }
        function closeFormModal() { document.getElementById('form-modal').style.display = 'none'; }
    
