import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, onSnapshot, query, where, documentId, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { activityInput } from './model.js';

// Deliberately no production configuration or environment fallback in this slice.
if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Aquesta versió només funciona a l’entorn local de proves.');
export const PROJECT_ID = 'demo-nexesocial-v2';
const app = initializeApp({ apiKey: 'demo-only', projectId: PROJECT_ID, authDomain: 'localhost' }, 'nexesocial-v2');
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9092', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8182);
const persistenceReady = setPersistence(auth, inMemoryPersistence);
export const watchAuth = callback => onAuthStateChanged(auth, callback);
export async function login(email, password) { await persistenceReady; return signInWithEmailAndPassword(auth, email, password); }
export const logout = () => signOut(auth);
export const watchMembership = (uid, next, error) => onSnapshot(doc(db, 'memberships', uid), { includeMetadataChanges: true }, snapshot => {
    if (!snapshot.metadata.fromCache) next(snapshot.exists() ? { ...snapshot.data(), uid } : null);
}, error);

export function watchAreaData(member, next, error) {
    const data = { areas: [], programs: [], activities: [] };
    const ready = new Set();
    const ids = [...new Set(member.areaIds)].slice(0, 30);
    if (member.role !== 'admin' && !ids.length) { next(data); return () => {}; }
    const listeners = Object.keys(data).map(name => {
        const ref = collection(db, name);
        const scoped = member.role === 'admin' ? ref : query(ref, where(name === 'areas' ? documentId() : 'areaId', 'in', ids));
        return onSnapshot(scoped, { includeMetadataChanges: true }, snapshot => {
            if (snapshot.metadata.fromCache) return;
            data[name] = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
            ready.add(name);
            if (ready.size === 3) next({ ...data });
        }, error);
    });
    return () => listeners.forEach(stop => stop());
}
export async function saveActivity(input, existingId) {
    const data = activityInput(input);
    if (!auth.currentUser) throw new Error('Inicia sessió per guardar.');
    if (existingId) {
        // Area and author are immutable in the rules, not merely disabled in the UI.
        const { areaId, ...mutable } = data;
        await updateDoc(doc(db, 'activities', existingId), { ...mutable, updatedAt: serverTimestamp() });
        return existingId;
    }
    const saved = await addDoc(collection(db, 'activities'), { ...data, createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return saved.id;
}
