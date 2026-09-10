import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { NAUM_STRUCTURE, validateStructure, structurePath, matchesStructure, structureSummary } from '../public/program-structure.mjs';

test('Naum starts with six areas and eight agreed programs', () => {
    validateStructure(NAUM_STRUCTURE);
    assert.equal(NAUM_STRUCTURE.filter(n => n.type === 'area').length, 6);
    assert.equal(NAUM_STRUCTURE.filter(n => n.type === 'program').length, 8);
    assert.deepEqual(structurePath(NAUM_STRUCTURE, 'serralta-connecta').map(n => n.name), ['Son Roca Activa', 'Serralta Connecta']);
});
test('optional program level and nested subprograms are supported', () => {
    const nodes = [...NAUM_STRUCTURE, { id: 'direct', name: 'Directe', type: 'subprogram', parentId: 'espais' }, { id: 'nested', name: 'Taller', type: 'subprogram', parentId: 'pqi' }];
    validateStructure(nodes);
    assert.equal(matchesStructure(nodes, { structureNodeId: 'nested' }, 'formacio'), true);
    assert.equal(matchesStructure(nodes, { structureNodeId: 'nested' }, 'sais'), false);
    assert.equal(matchesStructure(nodes, { structureNodeId: 'espais' }, 'espais'), true);
});
test('invalid parents, cycles, duplicate IDs and sibling names cannot be saved', () => {
    for (const invalid of [
        { id: 'x', name: 'X', type: 'program', parentId: 'missing' },
        { id: 'x', name: 'X', type: 'area', parentId: 'x' },
        { ...NAUM_STRUCTURE[0] },
        { id: 'x', name: '  formacio  ', type: 'area', parentId: '' },
        { id: 'x', name: '', type: 'area', parentId: '' }
    ]) assert.throws(() => validateStructure([...NAUM_STRUCTURE, invalid]));
});
test('legacy and unresolved activities remain discoverable without migration', () => {
    assert.equal(matchesStructure(NAUM_STRUCTURE, {}, '__unassigned'), true);
    assert.equal(matchesStructure(NAUM_STRUCTURE, { structureNodeId: 'old' }, '__unassigned'), true);
    assert.equal(matchesStructure(NAUM_STRUCTURE, { structureNodeId: 'pqi' }, '__unassigned'), false);
    assert.equal(matchesStructure(NAUM_STRUCTURE, {}, ''), true);
});
test('rollups deduplicate people and groups across activities and direct enrollment', () => {
    const activities = [
        { id: 'a', structureNodeId: 'son-roca-connecta', participantIds: ['p1'], linkedGroupIds: ['g1'] },
        { id: 'b', structureNodeId: 'serralta-connecta', participantIds: ['p1', 'p2'], linkedGroupIds: ['g1'] },
        { id: 'c', structureNodeId: 'pqi', participantIds: ['p3'] }
    ];
    const groups = [{ id: 'g1', beneficiarios: ['p1', 'p2'] }, { id: 'g2', actividadId: 'b', beneficiarios: ['p2', 'p4'] }];
    assert.deepEqual(structureSummary(NAUM_STRUCTURE, 'son-roca', activities, groups), { activities: 2, groups: 2, participants: 3 });
    assert.deepEqual(structureSummary(NAUM_STRUCTURE, 'pqi', activities, groups), { activities: 1, groups: 0, participants: 1 });
});

function activityHarness(fail = false) {
    const values = { activityId: 'existing', activityDepartment: 'dept', activityName: 'Nou nom', activityAgeMin: '0', activityAgeMax: '99', activityStart: '2026-09-01', activityEnd: '2027-06-30', activityTemporalization: 'Setmanal', activityNotes: '', activityStructure: 'pqi' };
    const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value }]));
    elements['program-toast'] = {};
    elements.activityModal = { style: {} };
    let write;
    const context = vm.createContext({
        console: { warn() {} },
        window: { addEventListener() {} },
        document: { readyState: 'loading', addEventListener() {}, getElementById: id => elements[id], querySelectorAll: () => [] },
        setTimeout() {}, clearTimeout() {},
        db: {}, doc: (...args) => args, serverTimestamp: () => 'server-time',
        setDoc: async (ref, payload, options) => { if (fail) throw new Error('permission-denied'); write = { ref, payload, options }; }
    });
    const source = readFileSync(new URL('../public/programes-gestio-page.js', import.meta.url), 'utf8').replace(/import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];?/g, '');
    vm.runInContext(source, context);
    vm.runInContext("state.access.programsEdit = true; state.activities = [{ id: 'existing', name: 'Original', code: 'KEEP-CODE', status: 'Activa', participantIds: ['p1'], structureNodeId: 'sais' }];", context);
    const button = { disabled: false };
    context.event = { preventDefault() {}, target: { querySelector: () => button } };
    return { context, elements, button, getWrite: () => write };
}
test('failed activity save retains previous state and leaves the form available', async () => {
    const h = activityHarness(true);
    await vm.runInContext('saveActivity(event)', h.context);
    assert.equal(vm.runInContext('state.activities[0].name', h.context), 'Original');
    assert.equal(vm.runInContext('state.activities[0].structureNodeId', h.context), 'sais');
    assert.equal(h.button.disabled, false);
    assert.match(h.elements['program-toast'].textContent, /No s’ha guardat/);
    assert.notEqual(h.elements.activityModal.style.display, 'none');
});
test('successful activity save adds classification without replacing document or code', async () => {
    const h = activityHarness();
    await vm.runInContext('saveActivity(event)', h.context);
    const { payload, options } = h.getWrite();
    assert.equal(payload.structureNodeId, 'pqi');
    assert.equal(payload.codigo, 'KEEP-CODE');
    assert.equal(payload.participantIds[0], 'p1');
    assert.equal(options.merge, true);
    assert.equal(h.elements.activityModal.style.display, 'none');
});
test('invalid date range does not write any activity', async () => {
    const h = activityHarness();
    h.elements.activityEnd.value = '2020-01-01';
    await vm.runInContext('saveActivity(event)', h.context);
    assert.equal(h.getWrite(), undefined);
});
test('legacy activity identifiers keep their group links while writing the original document', async () => {
    const h = activityHarness();
    vm.runInContext("state.activities[0].firestoreId = 'original-document';", h.context);
    await vm.runInContext('saveActivity(event)', h.context);
    assert.equal(h.getWrite().ref.at(-1), 'original-document');
    assert.equal(h.getWrite().payload.id, 'existing');
});

function storeHarness({ revision = 2, role = 'admin', fail = false } = {}) {
    let stored;
    const snapshot = { data: () => ({ nodes: NAUM_STRUCTURE, revision }) };
    const context = vm.createContext({
        auth: { authStateReady: async () => {}, currentUser: { uid: 'user' } }, db: {},
        doc: (...args) => args.at(-1), validateStructure, serverTimestamp: () => 'timestamp',
        getDoc: async ref => ref === 'user' ? { data: () => ({ role }) } : snapshot,
        runTransaction: async (db, action) => { if (fail) throw new Error('permission-denied'); return action({ get: async () => snapshot, set: (ref, data) => { stored = data; } }); }
    });
    const source = readFileSync(new URL('../public/program-structure-store.js', import.meta.url), 'utf8').replace(/import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];?/g, '').replaceAll('export async function', 'async function');
    vm.runInContext(source, context);
    context.nodes = NAUM_STRUCTURE;
    return { context, stored: () => stored };
}
test('concurrent structure editing refuses to overwrite a newer revision', async () => {
    const h = storeHarness();
    await assert.rejects(vm.runInContext('saveStructure(nodes, 1)', h.context), /Una altra persona/);
    assert.equal(h.stored(), undefined);
});
test('structure saves advance revision only after persistence', async () => {
    const h = storeHarness();
    assert.equal(await vm.runInContext('saveStructure(nodes, 2)', h.context), 3);
    assert.equal(h.stored().updatedBy, 'user');
    const denied = storeHarness({ fail: true });
    await assert.rejects(vm.runInContext('saveStructure(nodes, 2)', denied.context), /permission-denied/);
    assert.equal(denied.stored(), undefined);
});
test('structure management UI permission comes from persisted user role', async () => {
    for (const [role, expected] of [['admin', true], ['superadmin', true], ['editor', false], ['viewer', false]]) {
        const h = storeHarness({ role });
        assert.equal((await vm.runInContext('loadStructure()', h.context)).canManage, expected);
    }
});
