// Organisational classification; department/group identifiers remain unchanged.
export const TYPE_LABELS = { area: 'Àrea', program: 'Programa', subprogram: 'Subprograma' };
export const NAUM_STRUCTURE = [
    ['centre-dia', 'Centre de dia', 'area', ''],
    ['ludiques', 'Activitats Lúdiques', 'program', 'centre-dia'],
    ['reforc', 'Reforç Educatiu', 'program', 'centre-dia'],
    ['psicomotricitat', 'Psicomotricitat', 'program', 'centre-dia'],
    ['estiu', "Escola d'Estiu", 'program', 'centre-dia'],
    ['orientacio', 'Orientació Laboral', 'area', ''],
    ['son-roca', 'Son Roca Activa', 'area', ''],
    ['son-roca-connecta', 'Son Roca Connecta', 'program', 'son-roca'],
    ['serralta-connecta', 'Serralta Connecta', 'program', 'son-roca'],
    ['formacio', 'Formació', 'area', ''],
    ['pqi', 'PQI', 'program', 'formacio'],
    ['sais', 'SAIS', 'program', 'formacio'],
    ['espais', 'Espais Familiars', 'area', ''],
    ['voluntariat', 'Voluntariat', 'area', '']
].map(([id, name, type, parentId]) => ({ id, name, type, parentId }));

export function validateStructure(nodes) {
    if (!Array.isArray(nodes) || nodes.length > 500) throw new Error('Estructura no vàlida (màxim 500 elements).');
    const byId = new Map();
    for (const node of nodes) {
        if (!node || typeof node.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(node.id) || byId.has(node.id)) throw new Error('Identificador repetit o no vàlid.');
        if (typeof node.name !== 'string' || !node.name.trim() || node.name.length > 120 || !Object.hasOwn(TYPE_LABELS, node.type) || typeof node.parentId !== 'string') throw new Error('Completa el nom i el tipus.');
        byId.set(node.id, node);
    }
    const siblings = new Set();
    for (const node of nodes) {
        const parent = byId.get(node.parentId);
        if (node.type === 'area' ? node.parentId !== '' : !parent || (node.type === 'program' ? parent.type !== 'area' : !['area', 'program'].includes(parent.type))) throw new Error('La ubicació no és vàlida per a aquest tipus.');
        const key = `${node.parentId}/${node.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`;
        if (siblings.has(key)) throw new Error('Ja existeix un element amb aquest nom en aquesta ubicació.');
        siblings.add(key);
    }
    return nodes;
}

export function structurePath(nodes, id) {
    const path = [];
    const seen = new Set();
    while (id && !seen.has(id)) {
        seen.add(id);
        const node = nodes.find(n => n.id === id);
        if (!node) break;
        path.unshift(node);
        id = node.parentId;
    }
    return path;
}

export function matchesStructure(nodes, activity, selectedId) {
    if (!selectedId) return true;
    if (selectedId === '__unassigned') return !nodes.some(n => n.id === activity.structureNodeId);
    return structurePath(nodes, activity.structureNodeId).some(n => n.id === selectedId);
}

export function structureSummary(nodes, selectedId, activities, groups) {
    const selected = activities.filter(a => matchesStructure(nodes, a, selectedId));
    const groupIds = new Set();
    const people = new Set();
    for (const activity of selected) {
        for (const id of activity.participantIds || []) people.add(String(id));
        for (const group of groups) {
            if ((activity.linkedGroupIds || []).includes(group.id) || [group.actividadId, group.activityId].includes(activity.id)) {
                groupIds.add(group.id);
                for (const person of group.beneficiarios || []) {
                    const id = typeof person === 'object' ? person?.id || person?.beneficiarioId : person;
                    if (id) people.add(String(id));
                }
            }
        }
    }
    return { activities: selected.length, groups: groupIds.size, participants: people.size };
}
