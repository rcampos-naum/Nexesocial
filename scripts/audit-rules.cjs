// Reproduce current behavior in an isolated emulator, never production.
const fs = require('node:fs');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

(async () => {
    const address = process.env.FIRESTORE_EMULATOR_HOST;
    if (!address || !/^(127\.0\.0\.1|localhost):\d+$/.test(address)) throw new Error('A loopback Firestore emulator is required.');
    const [host, port] = address.split(':');
    const env = await initializeTestEnvironment({ projectId: 'demo-nexesocial-audit', firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
    const results = [];
    async function probe(id, description, shouldAllow, fn) {
        let allowed = false;
        try { await fn(); allowed = true; }
        catch (error) { if (error.code !== 'permission-denied') throw error; }
        results.push({ id, description, allowed, secureExpectation: shouldAllow ? 'allow' : 'deny', meetsSecureExpectation: allowed === shouldAllow });
    }
    try {
        await env.withSecurityRulesDisabled(async ctx => {
            const db = ctx.firestore();
            for (const [id, role] of [['viewer', 'viewer'], ['monitor', 'monitor'], ['admin', 'admin']]) await setDoc(doc(db, 'usuarios', id), { role, scope: ['area-a'] });
            await setDoc(doc(db, 'expedientes', 'other-area'), { departamentoId: 'area-b', dades_personals: { nom: 'Synthetic' } });
            await setDoc(doc(db, 'nexepsy', 'intervenciones', 'intervenciones', 'clinical'), { departamentoId: 'area-b', observaciones: 'Synthetic' });
            await setDoc(doc(db, 'config', 'encryption'), { orgSecret: 'synthetic-test-secret', salt: 'synthetic' });
            await setDoc(doc(db, 'auditoria_log', 'audit'), { event: 'original' });
            await setDoc(doc(db, 'firmas_requests', 'signature'), { createdByUid: 'admin', participantsUid: ['viewer', 'other'], signatures: [], decisions: [], status: 'pending' });
        });
        const viewer = env.authenticatedContext('viewer').firestore();
        const monitor = env.authenticatedContext('monitor').firestore();
        const admin = env.authenticatedContext('admin').firestore();
        await probe('R01', 'Viewer reads an unassigned-area personal record', false, () => getDoc(doc(viewer, 'expedientes', 'other-area')));
        await probe('R02', 'Monitor modifies an unassigned-area personal record', false, () => updateDoc(doc(monitor, 'expedientes', 'other-area'), { estado: 'changed' }));
        await probe('R03', 'Monitor reads a clinical record outside assigned area', false, () => getDoc(doc(monitor, 'nexepsy', 'intervenciones', 'intervenciones', 'clinical')));
        await probe('R04', 'Viewer reads the organization encryption secret', false, () => getDoc(doc(viewer, 'config', 'encryption')));
        await probe('R05', 'Admin overwrites an allegedly immutable audit entry', false, () => updateDoc(doc(admin, 'auditoria_log', 'audit'), { event: 'changed' }));
        await probe('R06', 'Signature participant attributes a decision to another participant', false, () => updateDoc(doc(viewer, 'firmas_requests', 'signature'), { signatures: [{ uid: 'other' }], decisions: [{ byUid: 'other', action: 'signed' }], status: 'signed' }));
        await probe('R07', 'Anonymous reads a personal record (negative control)', false, () => getDoc(doc(env.unauthenticatedContext().firestore(), 'expedientes', 'other-area')));
        fs.mkdirSync('audits/v2', { recursive: true });
        fs.writeFileSync('audits/v2/rules-observations.json', JSON.stringify({ environment: 'loopback emulator, synthetic data', results }, null, 2) + '\n');
        console.log(JSON.stringify(results, null, 2));
        if (process.argv.includes('--check') && results.some(result => !result.meetsSecureExpectation)) process.exitCode = 1;
    } finally { await env.cleanup(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
