import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { areas, programs, activities } from '../fixtures/catalog.mjs';

// This utility intentionally has no configurable target or production fallback.
const projectId = 'demo-nexesocial-v2';
const hub = await fetch('http://127.0.0.1:4402/emulators').then(r => r.json());
if (!hub.auth || !hub.firestore) throw new Error('Start the local v2 emulators before seeding.');
const env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8182 } });
try {
    const profiles = [
        { role: 'admin', areaIds: [] },
        { role: 'coordinator', areaIds: ['son-roca'] },
        { role: 'educator', areaIds: ['centre-dia'] },
        { role: 'volunteer', areaIds: ['son-roca'] }
    ];
    const memberships = [];
    for (const profile of profiles) {
        const credentials = { email: `${profile.role}@demo.nexesocial.test`, password: 'NexeDemo-2026!', returnSecureToken: true };
        async function request(method) {
            const response = await fetch(`http://127.0.0.1:9092/identitytoolkit.googleapis.com/v1/accounts:${method}?key=demo-only`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
            return response.json();
        }
        let account = await request('signUp');
        if (account.error?.message === 'EMAIL_EXISTS') account = await request('signInWithPassword');
        if (!account.localId) throw new Error(`Could not provision local profile ${profile.role}`);
        memberships.push({ id: account.localId, ...profile, active: true, validUntil: Timestamp.fromMillis(Date.now() + 7 * 86400000) });
    }
    await env.withSecurityRulesDisabled(async context => {
        const db = context.firestore();
        for (const [collection, entries] of Object.entries({ memberships, areas, programs, activities })) {
            for (const entry of entries) {
                const { id, ...value } = entry;
                const ref = doc(db, collection, id);
                if ((await getDoc(ref)).exists()) continue;
                if (collection === 'activities') Object.assign(value, { createdBy: memberships[0].id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
                await setDoc(ref, value);
            }
        }
    });
    console.log('Local fixtures ready: 4 test accounts, 6 areas, 8 programs, 4 synthetic activities. Existing records preserved.');
} finally { await env.cleanup(); }
