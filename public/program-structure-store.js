import { auth, db } from './firebase-config.js';
import { doc, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { validateStructure } from './program-structure.mjs';

const reference = doc(db, 'config', 'program_structure');
export async function loadStructure() {
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Inicia sessió per consultar l’estructura.');
    const [snapshot, user] = await Promise.all([getDoc(reference), getDoc(doc(db, 'usuarios', auth.currentUser.uid))]);
    const data = snapshot.data();
    const profile = user.data() || {};
    return { nodes: validateStructure(data?.nodes || []), revision: data?.revision || 0, canManage: ['admin', 'superadmin'].includes(profile.role || profile.rol) };
}

export async function saveStructure(nodes, revision) {
    validateStructure(nodes);
    await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if ((snapshot.data()?.revision || 0) !== revision) throw new Error('Una altra persona ha modificat l’estructura. Actualitza la pàgina abans de continuar.');
        transaction.set(reference, { nodes, revision: revision + 1, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.uid });
    });
    return revision + 1;
}

export async function fillStructureSelect(select, selectedId = '') {
    if (!select) return;
    const request = Symbol();
    select.structureRequest = request;
    select.disabled = true;
    select.replaceChildren(new Option('Carregant estructura…', selectedId));
    try {
        const { nodes } = await loadStructure();
        const { structurePath } = await import('./program-structure.mjs');
        if (select.structureRequest !== request) return;
        select.replaceChildren(new Option('Sense classificar', ''));
        for (const node of nodes) select.add(new Option(structurePath(nodes, node.id).map(n => n.name).join(' › '), node.id));
        if (selectedId && !nodes.some(n => n.id === selectedId)) select.add(new Option('Classificació anterior (pendent de revisar)', selectedId));
        select.value = selectedId;
        select.disabled = false;
    } catch {
        if (select.structureRequest !== request) return;
        select.replaceChildren(new Option('Estructura no disponible · es conserva la classificació', selectedId));
        // Keep the original value on an unavailable read; never silently unassign.
    }
}
