const fs = require('node:fs');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, Timestamp, serverTimestamp } = require('firebase/firestore');

(async () => {
    if (!/^(127\.0\.0\.1|localhost):8182$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Loopback emulator is required.');
    const env = await initializeTestEnvironment({ projectId: 'demo-nexesocial-v2', firestore: { host: '127.0.0.1', port: 8182, rules: fs.readFileSync('v2/firestore.rules', 'utf8') } });
    let passed = 0;
    async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
    try {
        await env.withSecurityRulesDisabled(async context => {
            const db = context.firestore();
            for (const [uid, role, active, future] of [['admin', 'admin', true, true], ['coordinator', 'coordinator', true, true], ['educator', 'educator', true, true], ['volunteer', 'volunteer', true, true], ['inactive', 'admin', false, true], ['expired', 'admin', true, false], ['unknown-role', 'invented', true, true]]) {
                await setDoc(doc(db, 'memberships', uid), { role, areaIds: ['son-roca'], active, validUntil: Timestamp.fromMillis(Date.now() + (future ? 86400000 : -86400000)) });
            }
            await setDoc(doc(db, 'areas', 'son-roca'), { name: 'Son Roca Activa' });
            await setDoc(doc(db, 'areas', 'centre-dia'), { name: 'Centre de dia' });
            await setDoc(doc(db, 'programs', 'connecta'), { name: 'Connecta', areaId: 'son-roca' });
            await setDoc(doc(db, 'programs', 'reforc'), { name: 'Reforç', areaId: 'centre-dia' });
            for (const areaId of ['son-roca', 'centre-dia']) await setDoc(doc(db, 'activities', areaId), { name: 'Activity', areaId, programId: '', status: 'active', createdBy: 'admin', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
            for (const name of ['config', 'clinical', 'audit', 'signatures']) await setDoc(doc(db, name, 'reserved'), { synthetic: true });
        });
        const db = role => env.authenticatedContext(role).firestore();
        const create = (areaId = 'son-roca', uid = 'coordinator') => ({ name: 'New activity', areaId, programId: '', status: 'active', createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await check('anonymous cannot read an area', () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'areas', 'son-roca'))));
        for (const role of ['inactive', 'expired', 'unknown-role', 'missing']) await check(`${role} cannot read activities`, () => assertFails(getDoc(doc(db(role), 'activities', 'son-roca'))));
        await check('coordinator reads own area', () => assertSucceeds(getDoc(doc(db('coordinator'), 'activities', 'son-roca'))));
        await check('coordinator cannot read another area', () => assertFails(getDoc(doc(db('coordinator'), 'activities', 'centre-dia'))));
        await check('scoped activity query succeeds', () => assertSucceeds(getDocs(query(collection(db('coordinator'), 'activities'), where('areaId', 'in', ['son-roca'])))));
        await check('unscoped query is denied to coordinator', () => assertFails(getDocs(collection(db('coordinator'), 'activities'))));
        await check('admin lists all areas', async () => assert.equal((await assertSucceeds(getDocs(collection(db('admin'), 'areas')))).size, 2));
        await check('coordinator creates within own area', () => assertSucceeds(setDoc(doc(db('coordinator'), 'activities', 'new'), create())));
        await check('saved activity can be read by a second same-area user', async () => assert.equal((await assertSucceeds(getDoc(doc(db('educator'), 'activities', 'new')))).data().name, 'New activity'));
        await check('coordinator cannot create in another area', () => assertFails(setDoc(doc(db('coordinator'), 'activities', 'bad-area'), create('centre-dia'))));
        await check('program must belong to activity area', () => assertFails(setDoc(doc(db('coordinator'), 'activities', 'bad-program'), { ...create(), programId: 'reforc' })));
        await check('matching program can be selected', () => assertSucceeds(updateDoc(doc(db('coordinator'), 'activities', 'new'), { programId: 'connecta', updatedAt: serverTimestamp() })));
        for (const role of ['educator', 'volunteer']) await check(`${role} cannot modify an activity`, () => assertFails(updateDoc(doc(db(role), 'activities', 'new'), { name: 'Changed', updatedAt: serverTimestamp() })));
        await check('activity cannot move to another area', () => assertFails(updateDoc(doc(db('admin'), 'activities', 'new'), { areaId: 'centre-dia', programId: '', updatedAt: serverTimestamp() })));
        await check('author cannot be forged', () => assertFails(setDoc(doc(db('coordinator'), 'activities', 'forged'), create('son-roca', 'admin'))));
        await check('author cannot be overwritten', () => assertFails(updateDoc(doc(db('admin'), 'activities', 'new'), { createdBy: 'admin', updatedAt: serverTimestamp() })));
        await check('extra fields are rejected', () => assertFails(setDoc(doc(db('coordinator'), 'activities', 'extra'), { ...create(), clinicalNotes: 'Forbidden' })));
        await check('invalid activity name is rejected', () => assertFails(setDoc(doc(db('coordinator'), 'activities', 'invalid'), { ...create(), name: '' })));
        await check('invalid state is rejected', () => assertFails(updateDoc(doc(db('coordinator'), 'activities', 'new'), { status: 'deleted', updatedAt: serverTimestamp() })));
        await check('admin cannot delete activity', () => assertFails(deleteDoc(doc(db('admin'), 'activities', 'new'))));
        await check('coordinator can pause activity', () => assertSucceeds(updateDoc(doc(db('coordinator'), 'activities', 'new'), { status: 'paused', updatedAt: serverTimestamp() })));
        await check('user cannot elevate own role', () => assertFails(updateDoc(doc(db('coordinator'), 'memberships', 'coordinator'), { role: 'admin' })));
        await check('admin client cannot change access assignments', () => assertFails(updateDoc(doc(db('admin'), 'memberships', 'coordinator'), { role: 'admin' })));
        await check('user cannot read another membership', () => assertFails(getDoc(doc(db('coordinator'), 'memberships', 'educator'))));
        for (const name of ['config', 'clinical', 'audit', 'signatures']) {
            await check(`no client read override for ${name}`, () => assertFails(getDoc(doc(db('admin'), name, 'reserved'))));
            await check(`no client write override for ${name}`, () => assertFails(updateDoc(doc(db('admin'), name, 'reserved'), { changed: true })));
        }
        await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'memberships', 'coordinator'), { active: false }));
        await check('revoked membership cannot read existing activity', () => assertFails(getDoc(doc(db('coordinator'), 'activities', 'new'))));
        await check('revoked membership cannot update activity', () => assertFails(updateDoc(doc(db('coordinator'), 'activities', 'new'), { name: 'Changed', updatedAt: serverTimestamp() })));
        console.log(`V2 RESULT: ${passed} permission and persistence checks passed.`);
    } finally { await env.cleanup(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
