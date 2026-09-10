import { NAUM_STRUCTURE, TYPE_LABELS, structurePath, structureSummary, validateStructure } from './program-structure.mjs';
import { loadStructure, saveStructure } from './program-structure-store.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function mountStructurePanel(host, { getActivities, getGroups, onChange }) {
    let data;
    let selectedId = '';
    let busy = false;
    const notify = () => onChange(data.nodes, selectedId);
    host.innerHTML = '<p role="status">Carregant estructura de Naum…</p>';
    try { data = await loadStructure(); }
    catch { host.innerHTML = '<p role="alert">No s’ha pogut carregar l’estructura. Les activitats existents es poden consultar més avall. Actualitza la pàgina per tornar-ho a provar.</p>'; return null; }

    function render() {
        const summary = structureSummary(data.nodes, selectedId, getActivities(), getGroups());
        const options = data.nodes.map(node => `<option value="${escape(node.id)}" ${node.id === selectedId ? 'selected' : ''}>${escape(structurePath(data.nodes, node.id).map(n => n.name).join(' › '))}</option>`).join('');
        function tree(parentId = '') {
            return `<ul>${data.nodes.filter(n => n.parentId === parentId).map(node => {
                const counts = structureSummary(data.nodes, node.id, getActivities(), getGroups());
                return `<li><div class="structure-row"><button type="button" data-filter="${escape(node.id)}" aria-pressed="${node.id === selectedId}"><small>${TYPE_LABELS[node.type]}</small> ${escape(node.name)} <span>${counts.activities} activitats</span></button>${data.canManage ? `<button type="button" class="btn-mini" data-edit="${escape(node.id)}" aria-label="Editar ${escape(node.name)}">Editar</button>` : ''}</div>${data.nodes.some(n => n.parentId === node.id) ? tree(node.id) : ''}</li>`;
            }).join('')}</ul>`;
        }
        host.innerHTML = `
            <div class="structure-heading"><div><h2>Àrees i programes de Naum</h2><p>Àrea → programa → subprograma → activitat. Pots vincular activitats a qualsevol nivell.</p></div>${data.canManage ? '<button class="btn-mini" type="button" data-new>+ Nou element</button>' : ''}</div>
            ${data.nodes.length ? `<details><summary>Veure i organitzar l’estructura · ${data.nodes.filter(n => n.type === 'area').length} àrees</summary>${tree()}</details>` : `<p>L’estructura encara no està configurada.</p>${data.canManage ? '<button class="btn-mini" type="button" data-seed>Crear estructura inicial de Naum</button><p>Inclou les 6 àrees i els 8 programes acordats. Les activitats existents quedaran pendents de classificació.</p>' : '<p>Un administrador pot configurar les àrees i els programes.</p>'}`}
            <div class="structure-filters"><label for="structure-filter">Filtrar activitats per ubicació</label><select id="structure-filter"><option value="">Tota l’entitat</option>${options}<option value="__unassigned" ${selectedId === '__unassigned' ? 'selected' : ''}>Sense classificar</option></select></div>
            <p class="structure-totals" aria-live="polite">${summary.activities} activitats · ${summary.groups} grups · ${summary.participants} participants únics inscrits</p>
            <p id="structure-message" role="status"></p>
            <dialog id="structure-editor" aria-labelledby="structure-editor-title"><form id="structure-form"><h3 id="structure-editor-title">Element de l’estructura</h3><input id="structure-id" type="hidden"><label for="structure-name">Nom</label><input id="structure-name" required maxlength="120"><label for="structure-type">Tipus</label><select id="structure-type">${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select><label for="structure-parent">Depèn de</label><select id="structure-parent"></select><p id="structure-error" role="alert"></p><div class="action-cluster"><button type="submit" class="btn-mini">Guardar</button><button type="button" data-close class="btn-mini">Cancel·lar</button></div></form></dialog>`;
        host.querySelector('#structure-filter').addEventListener('change', event => { selectedId = event.target.value; notify(); render(); });
        host.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
            selectedId = button.dataset.filter; notify(); render();
        }));
        host.querySelector('[data-new]')?.addEventListener('click', () => openEditor());
        host.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.edit)));
        host.querySelector('[data-close]').addEventListener('click', () => { if (!busy) host.querySelector('dialog').close(); });
        host.querySelector('dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
        host.querySelector('#structure-type').addEventListener('change', () => fillParents());
        host.querySelector('#structure-form').addEventListener('submit', submit);
        host.querySelector('[data-seed]')?.addEventListener('click', async event => {
            if (busy || !data.canManage) return;
            busy = true; event.target.disabled = true;
            try {
                data.revision = await saveStructure(NAUM_STRUCTURE, data.revision);
                data.nodes = NAUM_STRUCTURE.map(n => ({ ...n }));
                notify(); render();
            } catch (error) { host.querySelector('#structure-message').textContent = `No s’ha guardat: ${error.message}`; event.target.disabled = false; }
            finally { busy = false; }
        });
    }
    function fillParents(value = '') {
        const type = host.querySelector('#structure-type').value;
        const id = host.querySelector('#structure-id').value;
        const select = host.querySelector('#structure-parent');
        select.replaceChildren(new Option(type === 'area' ? 'Entitat' : 'Selecciona una ubicació', ''));
        for (const node of data.nodes.filter(n => n.id !== id && (type === 'program' ? n.type === 'area' : type === 'subprogram' && ['area', 'program'].includes(n.type)))) {
            select.add(new Option(structurePath(data.nodes, node.id).map(n => n.name).join(' › '), node.id));
        }
        select.value = value;
        select.disabled = type === 'area';
        select.required = type !== 'area';
    }
    function openEditor(id = '') {
        if (!data.canManage || busy) return;
        const node = data.nodes.find(n => n.id === id);
        host.querySelector('#structure-id').value = id;
        host.querySelector('#structure-name').value = node?.name || '';
        host.querySelector('#structure-type').value = node?.type || 'area';
        fillParents(node?.parentId || '');
        host.querySelector('#structure-error').textContent = '';
        host.querySelector('dialog').showModal();
        host.querySelector('#structure-name').focus();
    }
    async function submit(event) {
        event.preventDefault();
        if (busy || !data.canManage) return;
        const node = { id: host.querySelector('#structure-id').value || crypto.randomUUID(), name: host.querySelector('#structure-name').value.trim(), type: host.querySelector('#structure-type').value, parentId: host.querySelector('#structure-parent').value };
        const nodes = data.nodes.filter(n => n.id !== node.id).concat(node);
        busy = true;
        const button = event.target.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            validateStructure(nodes);
            data.revision = await saveStructure(nodes, data.revision);
            data.nodes = nodes;
            host.querySelector('dialog').close();
            notify(); render();
        } catch (error) { host.querySelector('#structure-error').textContent = `No s’ha guardat: ${error.message}`; }
        finally { busy = false; button.disabled = false; }
    }
    render(); notify();
    return { refresh() {
        // Preserve an open form when a realtime activity update arrives.
        if (!busy && !host.querySelector('dialog')?.open) render();
    } };
}
