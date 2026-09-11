import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, query, where, documentId } from 'firebase/firestore';

for (const role of ['admin', 'coordinator', 'educator', 'volunteer']) {
    const app = initializeApp({ apiKey: 'demo-only', projectId: 'demo-nexesocial-v2' }, `smoke-${role}`);
    try {
        const auth = getAuth(app);
        connectAuthEmulator(auth, 'http://127.0.0.1:9092', { disableWarnings: true });
        const db = getFirestore(app);
        connectFirestoreEmulator(db, '127.0.0.1', 8182);
        const { user } = await signInWithEmailAndPassword(auth, `${role}@demo.naum.test`, 'NexeDemo-2026!');
        const membership = (await getDoc(doc(db, 'memberships', user.uid))).data();
        assert.equal(membership.role, role);
        const areas = await getDocs(role === 'admin' ? collection(db, 'areas') : query(collection(db, 'areas'), where(documentId(), 'in', membership.areaIds)));
        assert.equal(areas.size, role === 'admin' ? 6 : 1);
        if (role !== 'admin') assert.ok(areas.docs.every(d => membership.areaIds.includes(d.id)));
        console.log(`OK ${role}: signed in against Auth emulator; ${areas.size} authorized areas.`);
    } finally { await deleteApp(app); }
}
