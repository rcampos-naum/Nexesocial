const fs = require('fs');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

const PROJECT_ID = 'nexesocial-rules-test';
const RULES_PATH = 'firestore.rules';

let env;
let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(`  -> ${e.message}`);
  }
}

async function seed(dataFn) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await dataFn(ctx.firestore());
  });
}

(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  try {
    await seed(async (db) => {
      await setDoc(doc(db, 'usuarios', 'adminUid'), {
        nombre: 'Admin',
        email: 'admin@nexe.test',
        role: 'admin',
      });
      await setDoc(doc(db, 'usuarios', 'userA'), {
        nombre: 'Usuari A',
        email: 'a@nexe.test',
        role: 'viewer',
      });
      await setDoc(doc(db, 'usuarios', 'userB'), {
        nombre: 'Usuari B',
        email: 'b@nexe.test',
        role: 'viewer',
      });
      await setDoc(doc(db, 'firmas_requests', 'req1'), {
        createdByUid: 'userA',
        participantsUid: ['userA', 'userB'],
        participantsEmail: ['a@nexe.test', 'b@nexe.test'],
        signers: [{ uid: 'userB', email: 'b@nexe.test', required: true }],
        signatures: [],
        decisions: [],
        status: 'pending',
        documentTitle: 'Doc test',
        createdAtISO: new Date().toISOString(),
      });
      await setDoc(doc(db, 'firmas_sessions', 'ses1'), {
        requestId: 'req1',
        signerUid: 'userB',
        signerEmail: 'b@nexe.test',
        signerName: 'Usuari B',
        status: 'pending',
        createdAtISO: new Date().toISOString(),
      });
    });

    // usuarios
    await run('owner can create own minimal profile doc', async () => {
      const db = env.authenticatedContext('newUser').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'usuarios', 'newUser'), {
          nombre: 'Nou Usuari',
          email: 'new@nexe.test',
          fechaAlta: serverTimestamp(),
        })
      );
    });

    await run('owner cannot create own doc with privileged role field', async () => {
      const db = env.authenticatedContext('evilUser').firestore();
      await assertFails(
        setDoc(doc(db, 'usuarios', 'evilUser'), {
          nombre: 'Evil',
          email: 'evil@nexe.test',
          role: 'admin',
        })
      );
    });

    await run('non-admin cannot create another user doc', async () => {
      const db = env.authenticatedContext('userA').firestore();
      await assertFails(
        setDoc(doc(db, 'usuarios', 'userB2'), {
          nombre: 'Altre',
          email: 'altre@nexe.test',
        })
      );
    });

    await run('admin can create arbitrary user doc', async () => {
      const db = env.authenticatedContext('adminUid').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'usuarios', 'userC'), {
          nombre: 'Usuari C',
          email: 'c@nexe.test',
          role: 'viewer',
          permisos: { admin: 'none', psy: 'read', audit: 'none' },
          funcRole: 'tecnic_projectes',
        })
      );
    });

    await run('owner cannot self-escalate role on update', async () => {
      const db = env.authenticatedContext('userA').firestore();
      await assertFails(
        updateDoc(doc(db, 'usuarios', 'userA'), {
          role: 'admin',
        })
      );
    });

    // firmas_requests
    await run('owner can create signature request with own createdByUid', async () => {
      const db = env.authenticatedContext('userA').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'firmas_requests', 'reqCreateByOwner'), {
          createdByUid: 'userA',
          participantsUid: ['userA', 'userB'],
          participantsEmail: ['a@nexe.test', 'b@nexe.test'],
          signers: [{ uid: 'userB', required: true }],
          signatures: [],
          decisions: [],
          status: 'pending',
          createdAtISO: new Date().toISOString(),
          documentTitle: 'Req nova',
        })
      );
    });

    await run('user cannot create request for another createdByUid', async () => {
      const db = env.authenticatedContext('userA').firestore();
      await assertFails(
        setDoc(doc(db, 'firmas_requests', 'reqBadCreator'), {
          createdByUid: 'userB',
          participantsUid: ['userA', 'userB'],
          participantsEmail: ['a@nexe.test', 'b@nexe.test'],
          signers: [{ uid: 'userB', required: true }],
          signatures: [],
          decisions: [],
          status: 'pending',
          createdAtISO: new Date().toISOString(),
          documentTitle: 'Req invalida',
        })
      );
    });

    await run('participant can read request', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertSucceeds(getDoc(doc(db, 'firmas_requests', 'req1')));
    });

    await run('outsider cannot read request', async () => {
      const db = env.authenticatedContext('outsider').firestore();
      await assertFails(getDoc(doc(db, 'firmas_requests', 'req1')));
    });

    await run('participant can update only status/signatures fields', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'firmas_requests', 'req1'), {
          status: 'partially_signed',
          signatures: [{ uid: 'userB', signedAtISO: new Date().toISOString() }],
          decisions: [{ action: 'signed', byUid: 'userB', atISO: new Date().toISOString() }],
          updatedAt: serverTimestamp(),
        })
      );
    });

    await run('participant cannot edit immutable business fields', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertFails(
        updateDoc(doc(db, 'firmas_requests', 'req1'), {
          documentTitle: 'Doc manipulat',
        })
      );
    });

    // firmas_sessions
    await run('participant signer can create mobile session for accessible request', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'firmas_sessions', 'sesCreate'), {
          requestId: 'req1',
          signerUid: 'userB',
          signerEmail: 'b@nexe.test',
          signerName: 'Usuari B',
          status: 'pending',
          createdAtISO: new Date().toISOString(),
        })
      );
    });

    await run('outsider cannot create mobile session for foreign request', async () => {
      const db = env.authenticatedContext('outsider').firestore();
      await assertFails(
        setDoc(doc(db, 'firmas_sessions', 'sesBad'), {
          requestId: 'req1',
          signerUid: 'outsider',
          signerEmail: 'x@nexe.test',
          signerName: 'Outsider',
          status: 'pending',
          createdAtISO: new Date().toISOString(),
        })
      );
    });

    await run('signer can update session completion fields only', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'firmas_sessions', 'ses1'), {
          status: 'done',
          signatureDataUrl: 'data:image/png;base64,abc',
          signerName: 'Usuari B',
          completedAtISO: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    await run('signer cannot alter session request binding', async () => {
      const db = env.authenticatedContext('userB').firestore();
      await assertFails(
        updateDoc(doc(db, 'firmas_sessions', 'ses1'), {
          requestId: 'req-other',
        })
      );
    });

    await run('outsider cannot read session', async () => {
      const db = env.authenticatedContext('outsider').firestore();
      await assertFails(getDoc(doc(db, 'firmas_sessions', 'ses1')));
    });

    console.log('----------------------------------------');
    console.log(`RESULTAT: ${passed} OK / ${failed} KO`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await env.cleanup();
  }
})();
