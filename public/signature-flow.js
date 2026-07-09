import { auth, db } from './firebase-config.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const REQUESTS_COL = 'firmas_requests';
const SESSIONS_COL = 'firmas_sessions';

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToPlainText(value) {
  if (!value) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = String(value);
  return (tmp.textContent || tmp.innerText || '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function getCurrentUserMeta() {
  const fbUser = auth.currentUser;
  const userRoles = safeJsonParse(localStorage.getItem('userRoles') || '[]', []);
  const role = localStorage.getItem('userRole') || '';
  const signatureRole = localStorage.getItem('userSignatureRole') || '';

  return {
    uid: fbUser?.uid || localStorage.getItem('userId') || '',
    name: localStorage.getItem('userName') || fbUser?.displayName || 'Usuari',
    email: localStorage.getItem('userEmail') || fbUser?.email || '',
    role,
    signatureRole,
    roles: Array.isArray(userRoles) ? userRoles : [],
  };
}

function normalizeSigner(signer) {
  const s = signer || {};
  const uid = String(s.uid || '').trim();
  const email = String(s.email || '').trim().toLowerCase();
  const signatureRole = String(s.signatureRole || s.role || '').trim();
  const name = String(s.name || '').trim() || email || uid || signatureRole || 'Signant';
  const key = uid ? `uid:${uid}` : (email ? `email:${email}` : `role:${signatureRole.toLowerCase()}`);

  if (!uid && !email && !signatureRole) {
    throw new Error('Cada signant necessita uid, email o signatureRole');
  }

  return {
    key,
    uid,
    email,
    signatureRole,
    name,
    required: s.required !== false,
    order: Number.isFinite(Number(s.order)) ? Number(s.order) : 999,
  };
}

function canActOnRequest(requestData, user) {
  const signers = Array.isArray(requestData?.signers) ? requestData.signers : [];
  const signatures = Array.isArray(requestData?.signatures) ? requestData.signatures : [];

  const hasSignerMatch = signers.some((s) => {
    if (s.uid && user.uid) return s.uid === user.uid;
    if (s.email && user.email) return s.email.toLowerCase() === user.email.toLowerCase();
    if (s.signatureRole && user.signatureRole) return s.signatureRole.toLowerCase() === user.signatureRole.toLowerCase();
    return false;
  });

  if (!hasSignerMatch) return false;
  if (requestData?.status === 'rejected' || requestData?.status === 'signed') return false;

  const alreadySigned = signatures.some((s) => {
    if (s.uid && user.uid) return s.uid === user.uid;
    if (s.email && user.email) return s.email.toLowerCase() === user.email.toLowerCase();
    return false;
  });

  return !alreadySigned;
}

function computeRequestStatus(signers, signatures, rejected) {
  if (rejected) return 'rejected';

  const requiredSigners = (signers || []).filter((s) => s.required !== false);
  const isSigned = requiredSigners.every((requiredSigner) => {
    return (signatures || []).some((sig) => {
      if (requiredSigner.uid && sig.uid) return requiredSigner.uid === sig.uid;
      if (requiredSigner.email && sig.email) return requiredSigner.email.toLowerCase() === sig.email.toLowerCase();
      if (requiredSigner.signatureRole && sig.signatureRole) {
        return requiredSigner.signatureRole.toLowerCase() === sig.signatureRole.toLowerCase();
      }
      return false;
    });
  });

  if (isSigned) return 'signed';
  return (signatures || []).length > 0 ? 'partially_signed' : 'pending';
}

async function requestSignature(payload) {
  const user = getCurrentUserMeta();
  if (!user.uid) throw new Error('Usuari no autenticat');

  const signers = (payload?.signers || []).map(normalizeSigner).sort((a, b) => a.order - b.order);
  if (!signers.length) throw new Error('Cal almenys un signant');

  const participantsUid = unique(signers.map((s) => s.uid));
  const participantsEmail = unique(signers.map((s) => s.email));

  const data = {
    status: 'pending',
    documentTitle: String(payload?.documentTitle || '').trim() || 'Document sense titol',
    documentUrl: String(payload?.documentUrl || '').trim(),
    documentText: String(payload?.documentText || '').trim(),
    documentHtml: String(payload?.documentHtml || '').trim(),
    documentRef: payload?.documentRef || null,
    sourceModule: String(payload?.sourceModule || '').trim(),
    sourcePath: String(payload?.sourcePath || window.location.pathname || '').trim(),
    createdAt: serverTimestamp(),
    createdAtISO: nowIso(),
    createdByUid: user.uid,
    createdByName: user.name,
    createdByEmail: user.email,
    signers,
    participantsUid,
    participantsEmail,
    signatures: [],
    decisions: [],
    metadata: payload?.metadata || {},
  };

  const ref = await addDoc(collection(db, REQUESTS_COL), data);
  return { id: ref.id, ...data };
}

async function getRequest(requestId) {
  const snap = await getDoc(doc(db, REQUESTS_COL, requestId));
  if (!snap.exists()) throw new Error('Solicitud de firma no trobada');
  return { id: snap.id, ...snap.data() };
}

async function listRecentRequests(limitCount = 120) {
  const q = query(collection(db, REQUESTS_COL), orderBy('createdAt', 'desc'), limit(limitCount));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listRequestsForCurrentUser(limitCount = 120) {
  const user = getCurrentUserMeta();
  const all = await listRecentRequests(limitCount);

  return all.filter((req) => {
    const isOwner = req.createdByUid === user.uid;
    const signerMatch = (req.signers || []).some((s) => {
      if (s.uid && user.uid) return s.uid === user.uid;
      if (s.email && user.email) return s.email.toLowerCase() === user.email.toLowerCase();
      if (s.signatureRole && user.signatureRole) return s.signatureRole.toLowerCase() === user.signatureRole.toLowerCase();
      return false;
    });
    return isOwner || signerMatch;
  });
}

async function signRequest(requestId, signaturePayload) {
  const user = getCurrentUserMeta();
  if (!user.uid) throw new Error('Usuari no autenticat');

  const requestRef = doc(db, REQUESTS_COL, requestId);

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Solicitud no trobada');

    const req = reqSnap.data();
    if (!canActOnRequest(req, user)) {
      throw new Error('No tens permisos o ja has signat aquesta solicitud');
    }

    const signatures = Array.isArray(req.signatures) ? [...req.signatures] : [];
    const decisions = Array.isArray(req.decisions) ? [...req.decisions] : [];

    const signature = {
      uid: user.uid,
      email: user.email,
      signatureRole: user.signatureRole,
      signerName: String(signaturePayload?.signerName || user.name || 'Signant'),
      method: String(signaturePayload?.method || 'canvas'),
      signatureDataUrl: String(signaturePayload?.signatureDataUrl || ''),
      certInfo: signaturePayload?.certInfo || null,
      signedAtISO: nowIso(),
      note: String(signaturePayload?.note || ''),
    };

    signatures.push(signature);
    decisions.push({ action: 'signed', byUid: user.uid, byName: user.name, atISO: nowIso(), method: signature.method });

    const status = computeRequestStatus(req.signers || [], signatures, false);
    tx.update(requestRef, { signatures, decisions, status, updatedAt: serverTimestamp() });
  });

  return getRequest(requestId);
}

async function rejectRequest(requestId, reason) {
  const user = getCurrentUserMeta();
  if (!user.uid) throw new Error('Usuari no autenticat');

  const requestRef = doc(db, REQUESTS_COL, requestId);

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Solicitud no trobada');

    const req = reqSnap.data();
    if (!canActOnRequest(req, user)) {
      throw new Error('No tens permisos per rebutjar aquesta solicitud');
    }

    const decisions = Array.isArray(req.decisions) ? [...req.decisions] : [];
    decisions.push({
      action: 'rejected',
      byUid: user.uid,
      byName: user.name,
      reason: String(reason || '').trim(),
      atISO: nowIso(),
    });

    tx.update(requestRef, {
      status: 'rejected',
      rejectedByUid: user.uid,
      rejectedByName: user.name,
      rejectedReason: String(reason || '').trim(),
      decisions,
      updatedAt: serverTimestamp(),
    });
  });

  return getRequest(requestId);
}

async function createMobileSession(requestId) {
  const user = getCurrentUserMeta();
  if (!user.uid) throw new Error('Usuari no autenticat');

  const request = await getRequest(requestId);
  if (!canActOnRequest(request, user)) {
    throw new Error('No pots signar aquesta solicitud amb el teu usuari actual');
  }

  const expiresAtISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const session = {
    requestId,
    status: 'pending',
    signerUid: user.uid,
    signerEmail: user.email,
    signerName: user.name,
    createdAt: serverTimestamp(),
    createdAtISO: nowIso(),
    expiresAtISO,
  };

  const ref = await addDoc(collection(db, SESSIONS_COL), session);
  const base = `${window.location.origin}/firma-movil.html`;
  return {
    sessionId: ref.id,
    url: `${base}?sid=${encodeURIComponent(ref.id)}&flow=unified`,
    expiresAtISO,
  };
}

async function getMobileSession(sessionId) {
  const snap = await getDoc(doc(db, SESSIONS_COL, sessionId));
  if (!snap.exists()) throw new Error('Sessio de firma no trobada');
  return { id: snap.id, ...snap.data() };
}

async function completeMobileSession(sessionId, payload) {
  const sessionRef = doc(db, SESSIONS_COL, sessionId);

  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error('Sessio no trobada');

    const session = sessionSnap.data();
    if (session.status !== 'pending') throw new Error('La sessio no esta disponible');

    if (session.expiresAtISO && new Date(session.expiresAtISO).getTime() < Date.now()) {
      tx.update(sessionRef, { status: 'expired', updatedAt: serverTimestamp() });
      throw new Error('Sessio expirada');
    }

    const requestRef = doc(db, REQUESTS_COL, session.requestId);
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Solicitud no trobada');

    const req = reqSnap.data();
    const signatures = Array.isArray(req.signatures) ? [...req.signatures] : [];
    const decisions = Array.isArray(req.decisions) ? [...req.decisions] : [];

    const signature = {
      uid: session.signerUid || '',
      email: session.signerEmail || '',
      signatureRole: '',
      signerName: String(payload?.signerName || session.signerName || 'Signant'),
      method: 'mobile',
      signatureDataUrl: String(payload?.signatureDataUrl || ''),
      certInfo: null,
      signedAtISO: nowIso(),
      note: String(payload?.note || ''),
    };

    signatures.push(signature);
    decisions.push({ action: 'signed', byUid: session.signerUid || '', byName: signature.signerName, atISO: nowIso(), method: 'mobile' });

    const status = computeRequestStatus(req.signers || [], signatures, false);

    tx.update(requestRef, { signatures, decisions, status, updatedAt: serverTimestamp() });
    tx.update(sessionRef, {
      status: 'done',
      signatureDataUrl: signature.signatureDataUrl,
      signerName: signature.signerName,
      completedAt: serverTimestamp(),
      completedAtISO: nowIso(),
      updatedAt: serverTimestamp(),
    });
  });

  return getMobileSession(sessionId);
}

function launchAutoFirma(payloadText) {
  const text = String(payloadText || 'Document NexeSocial').slice(0, 20000);
  const dat = btoa(unescape(encodeURIComponent(text)));
  const properties = btoa('mode=implicit\nsavemode=local');
  const url = `afirma://sign?op=sign&algorithm=SHA256withRSA&format=PAdES&dat=${encodeURIComponent(dat)}&properties=${encodeURIComponent(properties)}`;

  return new Promise((resolve) => {
    let settled = false;
    const done = (ok, reason = '') => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      resolve({ ok, reason });
    };

    const onFocus = () => {
      setTimeout(() => done(true, 'focus-return'), 650);
    };

    window.addEventListener('focus', onFocus, { once: true });
    window.location.href = url;
    setTimeout(() => done(false, 'timeout'), 12000);
  });
}

async function signRequestWithAutoFirma(requestId, opts = {}) {
  const request = await getRequest(requestId);
  const payloadText = opts.payloadText || request.documentText || request.documentTitle || 'Document';
  const result = await launchAutoFirma(payloadText);
  if (!result.ok) {
    throw new Error('No hem pogut confirmar el retorn des d\'AutoFirma');
  }

  return signRequest(requestId, {
    method: 'autofirma',
    signerName: opts.signerName || getCurrentUserMeta().name,
    signatureDataUrl: '',
    certInfo: { source: 'AutoFirma local', check: 'manual-confirmed' },
    note: 'Firmat amb AutoFirma (confirmacio de retorn del navegador).',
  });
}

function openSignatureCenter() {
  window.location.href = '/NexeSing/nexesing.html';
}

const INTEGRATED_MODAL_ID = 'nexe-integrated-sign-modal';
let integratedModalState = null;

function loadScriptOnce(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  const existing = document.querySelector(`script[data-nexe-src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener('error', () => reject(new Error(`No s'ha pogut carregar ${src}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.nexeSrc = src;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`No s'ha pogut carregar ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureIntegratedModalDeps() {
  await loadScriptOnce('https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js', 'SignaturePad');
  if (!window.QRCode || !window.QRCode.toCanvas) {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js', 'QRCode');
  }
}

async function renderQrInto(element, text) {
  if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
    element.innerHTML = '<canvas></canvas>';
    const canvas = element.querySelector('canvas');
    await window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1 });
    return;
  }

  if (window.QRCode) {
    element.innerHTML = '';
    new window.QRCode(element, { text, width: 220, height: 220 });
    return;
  }

  throw new Error('No s\'ha trobat cap llibreria QR disponible');
}

function normalizeQuickOptions(options = {}) {
  const user = getCurrentUserMeta();
  const documentTitle = String(
    options.documentTitle || options.title || options.filename || document.title || 'Document'
  ).trim();
  const documentHtml = String(options.documentHtml || options.contentHtml || '').trim();
  const documentText = String(
    options.documentText || options.description || htmlToPlainText(documentHtml) || documentTitle
  ).trim();
  const sourceModule = String(options.sourceModule || options.module || 'manual').trim();

  return {
    documentTitle,
    documentUrl: String(options.documentUrl || window.location.href || '').trim(),
    documentText,
    documentHtml,
    sourceModule,
    sourcePath: String(options.sourcePath || window.location.pathname || '').trim(),
    metadata: options.metadata || {},
    defaultSelfSigner: {
      uid: user.uid,
      email: user.email,
      name: user.name,
      signatureRole: user.signatureRole,
      order: 1,
    },
  };
}

function ensureIntegratedModal() {
  if (integratedModalState) return integratedModalState;

  const style = document.createElement('style');
  style.textContent = `
    #${INTEGRATED_MODAL_ID} { position: fixed; inset: 0; z-index: 45000; display: none; }
    #${INTEGRATED_MODAL_ID}.open { display: block; }
    #${INTEGRATED_MODAL_ID} .nsm-backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.58); backdrop-filter: blur(5px); }
    #${INTEGRATED_MODAL_ID} .nsm-dialog { position: relative; width: min(960px, calc(100vw - 32px)); max-height: calc(100vh - 32px); margin: 16px auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(15,23,42,0.35); display: flex; flex-direction: column; }
    #${INTEGRATED_MODAL_ID} .nsm-header { padding: 20px 24px 14px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    #${INTEGRATED_MODAL_ID} .nsm-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; }
    #${INTEGRATED_MODAL_ID} .nsm-subtitle { color: #64748b; font-size: 0.86rem; margin-top: 5px; }
    #${INTEGRATED_MODAL_ID} .nsm-close { border: none; background: #f8fafc; color: #475569; width: 38px; height: 38px; border-radius: 999px; font-size: 24px; cursor: pointer; }
    #${INTEGRATED_MODAL_ID} .nsm-body { padding: 20px 24px 24px; overflow: auto; display: grid; gap: 18px; }
    #${INTEGRATED_MODAL_ID} .nsm-option-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    #${INTEGRATED_MODAL_ID} .nsm-option { border: 1px solid #dbe4f0; background: linear-gradient(180deg,#ffffff 0%,#f8fbff 100%); border-radius: 18px; padding: 16px; cursor: pointer; text-align: left; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    #${INTEGRATED_MODAL_ID} .nsm-option:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(37,99,235,0.10); border-color: #93c5fd; }
    #${INTEGRATED_MODAL_ID} .nsm-option h3 { margin: 10px 0 6px; font-size: 0.95rem; color: #0f172a; }
    #${INTEGRATED_MODAL_ID} .nsm-option p { margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.45; }
    #${INTEGRATED_MODAL_ID} .nsm-icon { width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: #eff6ff; color: #2563eb; font-size: 1.15rem; }
    #${INTEGRATED_MODAL_ID} .nsm-panel { border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; display: none; gap: 14px; }
    #${INTEGRATED_MODAL_ID} .nsm-panel.active { display: grid; }
    #${INTEGRATED_MODAL_ID} .nsm-meta { border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; display: grid; gap: 6px; }
    #${INTEGRATED_MODAL_ID} .nsm-meta strong { color: #0f172a; }
    #${INTEGRATED_MODAL_ID} .nsm-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    #${INTEGRATED_MODAL_ID} .nsm-row input, #${INTEGRATED_MODAL_ID} .nsm-row textarea, #${INTEGRATED_MODAL_ID} .nsm-panel input[type="text"] { width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; padding: 11px 12px; font: inherit; color: #0f172a; background: #fff; }
    #${INTEGRATED_MODAL_ID} .nsm-row textarea { min-height: 96px; resize: vertical; }
    #${INTEGRATED_MODAL_ID} .nsm-actions { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    #${INTEGRATED_MODAL_ID} .nsm-btn { border: none; border-radius: 12px; padding: 11px 16px; font: inherit; font-weight: 700; cursor: pointer; }
    #${INTEGRATED_MODAL_ID} .nsm-btn.secondary { background: #f1f5f9; color: #475569; }
    #${INTEGRATED_MODAL_ID} .nsm-btn.primary { background: #2563eb; color: #fff; }
    #${INTEGRATED_MODAL_ID} .nsm-btn.success { background: #10b981; color: #fff; }
    #${INTEGRATED_MODAL_ID} .nsm-btn.warn { background: #f59e0b; color: #fff; }
    #${INTEGRATED_MODAL_ID} .nsm-btn:disabled { opacity: .6; cursor: not-allowed; }
    #${INTEGRATED_MODAL_ID} .nsm-canvas-wrap { position: relative; border: 1px dashed #94a3b8; border-radius: 18px; background: #fff; min-height: 240px; }
    #${INTEGRATED_MODAL_ID} .nsm-canvas-wrap canvas { width: 100%; height: 240px; display: block; touch-action: none; }
    #${INTEGRATED_MODAL_ID} .nsm-canvas-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: .9rem; pointer-events: none; }
    #${INTEGRATED_MODAL_ID} .nsm-qr-box { display: grid; justify-items: center; gap: 10px; padding: 12px; border: 1px solid #dbe4f0; border-radius: 18px; background: #f8fbff; }
    #${INTEGRATED_MODAL_ID} .nsm-qr-box canvas { width: 220px; height: 220px; }
    #${INTEGRATED_MODAL_ID} .nsm-qr-host { min-width: 220px; min-height: 220px; display: grid; place-items: center; }
    #${INTEGRATED_MODAL_ID} .nsm-user-list { max-height: 260px; overflow: auto; border: 1px solid #dbe4f0; border-radius: 16px; padding: 8px; display: grid; gap: 6px; }
    #${INTEGRATED_MODAL_ID} .nsm-user-item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: 12px; cursor: pointer; }
    #${INTEGRATED_MODAL_ID} .nsm-user-item:hover { background: #f8fafc; }
    #${INTEGRATED_MODAL_ID} .nsm-status { min-height: 22px; color: #0f766e; font-size: .83rem; font-weight: 600; }
    #${INTEGRATED_MODAL_ID} .nsm-error { color: #dc2626; }
    @media (max-width: 720px) {
      #${INTEGRATED_MODAL_ID} .nsm-dialog { width: calc(100vw - 16px); margin: 8px auto; border-radius: 20px; max-height: calc(100vh - 16px); }
      #${INTEGRATED_MODAL_ID} .nsm-header, #${INTEGRATED_MODAL_ID} .nsm-body { padding-left: 16px; padding-right: 16px; }
      #${INTEGRATED_MODAL_ID} .nsm-option-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = INTEGRATED_MODAL_ID;
  root.innerHTML = `
    <div class="nsm-backdrop" data-close="1"></div>
    <div class="nsm-dialog" role="dialog" aria-modal="true" aria-labelledby="nsm-title">
      <div class="nsm-header">
        <div>
          <h2 class="nsm-title" id="nsm-title">Firmar document</h2>
          <div class="nsm-subtitle" id="nsm-subtitle"></div>
        </div>
        <button class="nsm-close" type="button" data-close="1">×</button>
      </div>
      <div class="nsm-body">
        <div class="nsm-meta" id="nsm-meta"></div>
        <div class="nsm-option-grid" id="nsm-options">
          <button class="nsm-option" type="button" data-action="screen"><span class="nsm-icon">✍</span><h3>Firmar en el PC</h3><p>Firma en pantalla directament des d'aquesta pàgina.</p></button>
          <button class="nsm-option" type="button" data-action="mobile"><span class="nsm-icon">📱</span><h3>Firmar amb el mòbil</h3><p>Genera un QR per a aquest document i signa'l des del telèfon.</p></button>
          <button class="nsm-option" type="button" data-action="tablet"><span class="nsm-icon">🖊</span><h3>Firmar amb tablet</h3><p>Captura la firma en pantalla per equips amb tablet o llapis de signatura.</p></button>
          <button class="nsm-option" type="button" data-action="autofirma"><span class="nsm-icon">🔐</span><h3>AutoFirma</h3><p>Llança AutoFirma i registra el resultat al control d'auditoria.</p></button>
          <button class="nsm-option" type="button" data-action="send"><span class="nsm-icon">📨</span><h3>Enviar per signar</h3><p>Selecciona qui l'ha de firmar i crea la petició a NexeSing.</p></button>
        </div>
        <div class="nsm-panel" id="nsm-panel-screen">
          <div class="nsm-row"><input type="text" id="nsm-screen-name" placeholder="Nom i cognoms del signant"></div>
          <div class="nsm-canvas-wrap"><div class="nsm-canvas-hint" id="nsm-screen-hint">Firma aquí</div><canvas id="nsm-screen-canvas"></canvas></div>
          <div class="nsm-status" id="nsm-screen-status"></div>
          <div class="nsm-actions"><button class="nsm-btn secondary" type="button" id="nsm-screen-clear">Esborrar</button><div class="nsm-row"><button class="nsm-btn secondary" type="button" data-back="1">Enrere</button><button class="nsm-btn success" type="button" id="nsm-screen-confirm">Confirmar firma</button></div></div>
        </div>
        <div class="nsm-panel" id="nsm-panel-mobile">
          <div class="nsm-qr-box"><div class="nsm-qr-host" id="nsm-qr-canvas"></div><a id="nsm-qr-link" target="_blank" rel="noreferrer noopener"></a></div>
          <div class="nsm-status" id="nsm-mobile-status"></div>
          <div class="nsm-actions"><button class="nsm-btn secondary" type="button" data-back="1">Enrere</button><button class="nsm-btn primary" type="button" id="nsm-mobile-refresh">Comprovar estat</button></div>
        </div>
        <div class="nsm-panel" id="nsm-panel-send">
          <div class="nsm-row"><input type="text" id="nsm-send-search" placeholder="Filtrar per nom o correu"></div>
          <div class="nsm-user-list" id="nsm-user-list"><span style="color:#94a3b8; font-size:.85rem;">Carregant usuaris...</span></div>
          <div class="nsm-status" id="nsm-send-status"></div>
          <div class="nsm-actions"><button class="nsm-btn secondary" type="button" data-back="1">Enrere</button><button class="nsm-btn primary" type="button" id="nsm-send-confirm">Crear petició</button></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const state = {
    root,
    activeOptions: null,
    activeRequestId: '',
    qrPollTimer: null,
    screenMode: 'screen',
    signerUsers: [],
    signaturePad: null,
  };

  const els = {
    title: root.querySelector('#nsm-title'),
    subtitle: root.querySelector('#nsm-subtitle'),
    meta: root.querySelector('#nsm-meta'),
    options: root.querySelector('#nsm-options'),
    panels: {
      screen: root.querySelector('#nsm-panel-screen'),
      mobile: root.querySelector('#nsm-panel-mobile'),
      send: root.querySelector('#nsm-panel-send'),
    },
    screenName: root.querySelector('#nsm-screen-name'),
    screenCanvas: root.querySelector('#nsm-screen-canvas'),
    screenHint: root.querySelector('#nsm-screen-hint'),
    screenStatus: root.querySelector('#nsm-screen-status'),
    screenConfirm: root.querySelector('#nsm-screen-confirm'),
    qrCanvas: root.querySelector('#nsm-qr-canvas'),
    qrLink: root.querySelector('#nsm-qr-link'),
    mobileStatus: root.querySelector('#nsm-mobile-status'),
    mobileRefresh: root.querySelector('#nsm-mobile-refresh'),
    sendSearch: root.querySelector('#nsm-send-search'),
    userList: root.querySelector('#nsm-user-list'),
    sendStatus: root.querySelector('#nsm-send-status'),
    sendConfirm: root.querySelector('#nsm-send-confirm'),
  };

  function clearQrTimer() {
    if (state.qrPollTimer) {
      clearInterval(state.qrPollTimer);
      state.qrPollTimer = null;
    }
  }

  function setStatus(target, message, isError = false) {
    const el = target === 'screen' ? els.screenStatus : target === 'mobile' ? els.mobileStatus : els.sendStatus;
    el.textContent = message || '';
    el.classList.toggle('nsm-error', !!isError);
  }

  function resetPanels() {
    clearQrTimer();
    Object.values(els.panels).forEach((panel) => panel.classList.remove('active'));
    els.options.style.display = 'grid';
    setStatus('screen', '');
    setStatus('mobile', '');
    setStatus('send', '');
    state.activeRequestId = '';
  }

  function closeModal() {
    clearQrTimer();
    root.classList.remove('open');
    resetPanels();
  }

  function openModal(options) {
    state.activeOptions = options;
    els.title.textContent = options.documentTitle || 'Firmar document';
    els.subtitle.textContent = `Origen: ${options.sourceModule || 'manual'}`;
    els.meta.innerHTML = `
      <div><strong>Document</strong>: ${safeHtml(options.documentTitle || 'Sense títol')}</div>
      <div><strong>Pàgina</strong>: ${safeHtml(options.sourcePath || window.location.pathname || '')}</div>
      <div><strong>Resum</strong>: ${safeHtml((options.documentText || '').slice(0, 260) || 'Sense resum disponible.')}</div>
    `;
    els.screenName.value = getCurrentUserMeta().name || '';
    root.classList.add('open');
    resetPanels();
  }

  function openPanel(panelName) {
    els.options.style.display = 'none';
    Object.entries(els.panels).forEach(([name, panel]) => panel.classList.toggle('active', name === panelName));
  }

  async function ensureSignaturePad() {
    if (state.signaturePad) return state.signaturePad;
    const ratio = window.devicePixelRatio || 1;
    const canvas = els.screenCanvas;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(rect.width, 320) * ratio;
    canvas.height = 240 * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    state.signaturePad = new window.SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: '#0f172a',
      minWidth: 1.2,
      maxWidth: 3.2,
    });
    canvas.addEventListener('pointerup', () => {
      els.screenHint.style.display = state.signaturePad.isEmpty() ? '' : 'none';
    });
    return state.signaturePad;
  }

  async function createSelfRequest(methodLabel) {
    const options = state.activeOptions;
    return requestSignature({
      documentTitle: options.documentTitle,
      documentUrl: options.documentUrl,
      documentText: options.documentText,
      documentHtml: options.documentHtml,
      sourceModule: options.sourceModule,
      sourcePath: options.sourcePath,
      signers: [options.defaultSelfSigner],
      metadata: { ...options.metadata, integratedMethod: methodLabel, integratedOrigin: 'page-modal' },
    });
  }

  async function startScreenFlow(mode) {
    state.screenMode = mode;
    openPanel('screen');
    els.screenHint.style.display = '';
    await ensureSignaturePad();
    state.signaturePad.clear();
    els.screenConfirm.textContent = mode === 'tablet' ? 'Confirmar firma amb tablet' : 'Confirmar firma';
  }

  async function submitScreenSignature() {
    const signerName = String(els.screenName.value || '').trim();
    if (!signerName) {
      setStatus('screen', 'Cal indicar el nom del signant.', true);
      els.screenName.focus();
      return;
    }
    await ensureSignaturePad();
    if (state.signaturePad.isEmpty()) {
      setStatus('screen', 'Cal fer la firma abans de confirmar.', true);
      return;
    }

    const created = await createSelfRequest(state.screenMode);
    await signRequest(created.id, {
      method: state.screenMode,
      signerName,
      signatureDataUrl: state.signaturePad.toDataURL('image/png'),
      note: state.screenMode === 'tablet' ? 'Firma capturada en dispositiu tipus tablet.' : 'Firma capturada a la mateixa pàgina.',
    });
    setStatus('screen', 'Firma registrada i auditada correctament.');
    setTimeout(closeModal, 900);
  }

  async function startMobileFlow() {
    openPanel('mobile');
    setStatus('mobile', 'Preparant QR de firma...');
    const created = await createSelfRequest('mobile');
    state.activeRequestId = created.id;
    const session = await createMobileSession(created.id);
    els.qrLink.href = session.url;
    els.qrLink.textContent = session.url;
    await renderQrInto(els.qrCanvas, session.url);
    setStatus('mobile', 'Escaneja el QR i completa la firma des del mòbil.');
    clearQrTimer();
    state.qrPollTimer = window.setInterval(async () => {
      try {
        const req = await getRequest(created.id);
        if (req.status === 'signed' || req.status === 'partially_signed') {
          setStatus('mobile', 'La firma mòbil s\'ha registrat correctament.');
          clearQrTimer();
          setTimeout(closeModal, 900);
        }
      } catch (error) {
        clearQrTimer();
        setStatus('mobile', error.message || 'No s\'ha pogut comprovar la sessió.', true);
      }
    }, 3000);
  }

  async function refreshMobileStatus() {
    if (!state.activeRequestId) return;
    try {
      const req = await getRequest(state.activeRequestId);
      if (req.status === 'signed' || req.status === 'partially_signed') {
        setStatus('mobile', 'La firma mòbil s\'ha registrat correctament.');
        clearQrTimer();
        setTimeout(closeModal, 900);
        return;
      }
      setStatus('mobile', 'La sessió continua pendent.');
    } catch (error) {
      setStatus('mobile', error.message || 'No s\'ha pogut comprovar la sessió.', true);
    }
  }

  async function startAutoFirmaFlow() {
    try {
      const created = await createSelfRequest('autofirma');
      await signRequestWithAutoFirma(created.id, {
        payloadText: state.activeOptions.documentText || state.activeOptions.documentTitle,
        signerName: getCurrentUserMeta().name,
      });
      closeModal();
    } catch (error) {
      setStatus('screen', error.message || 'No s\'ha pogut completar AutoFirma.', true);
      openPanel('screen');
    }
  }

  async function loadSignerUsers() {
    if (state.signerUsers.length) return state.signerUsers;
    const snap = await getDocs(collection(db, 'usuarios'));
    state.signerUsers = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        uid: d.id,
        email: String(data.email || '').trim(),
        name: String(data.nombre || data.email || d.id).trim(),
        role: String(data.funcRole || '').trim(),
      };
    });
    return state.signerUsers;
  }

  function renderSignerUsers(filterText = '') {
    const term = String(filterText || '').trim().toLowerCase();
    const items = state.signerUsers.filter((user) => {
      if (!term) return true;
      return user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.role.toLowerCase().includes(term);
    });
    if (!items.length) {
      els.userList.innerHTML = '<span style="color:#94a3b8; font-size:.85rem;">No hi ha coincidències.</span>';
      return;
    }

    els.userList.innerHTML = items.map((user, index) => `
      <label class="nsm-user-item">
        <input type="checkbox" class="nsm-user-check" data-uid="${safeHtml(user.uid)}" data-email="${safeHtml(user.email)}" data-name="${safeHtml(user.name)}" style="accent-color:#2563eb; width:16px; height:16px; margin-top:3px;" ${index === 0 && !term ? 'checked' : ''}>
        <span>
          <strong>${safeHtml(user.name)}</strong>${user.role ? ` <span style="color:#64748b; font-size:.75rem;">${safeHtml(user.role)}</span>` : ''}<br>
          <span style="color:#64748b; font-size:.78rem;">${safeHtml(user.email || user.uid)}</span>
        </span>
      </label>
    `).join('');
  }

  async function startSendFlow() {
    openPanel('send');
    setStatus('send', 'Carregant usuaris disponibles...');
    const users = await loadSignerUsers();
    if (!users.length) {
      els.userList.innerHTML = '<span style="color:#94a3b8; font-size:.85rem;">No hi ha usuaris disponibles.</span>';
      setStatus('send', 'No s\'ha trobat cap usuari per enviar la firma.', true);
      return;
    }
    renderSignerUsers();
    setStatus('send', 'Selecciona una o més persones per enviar la petició.');
  }

  async function submitSendFlow() {
    const checks = [...root.querySelectorAll('.nsm-user-check:checked')];
    if (!checks.length) {
      setStatus('send', 'Cal seleccionar almenys un signant.', true);
      return;
    }
    const signers = checks.map((cb, index) => ({
      uid: cb.dataset.uid,
      email: cb.dataset.email,
      name: cb.dataset.name,
      order: index + 1,
    }));

    await requestSignature({
      documentTitle: state.activeOptions.documentTitle,
      documentUrl: state.activeOptions.documentUrl,
      documentText: state.activeOptions.documentText,
      documentHtml: state.activeOptions.documentHtml,
      sourceModule: state.activeOptions.sourceModule,
      sourcePath: state.activeOptions.sourcePath,
      signers,
      metadata: { ...state.activeOptions.metadata, integratedMethod: 'request', integratedOrigin: 'page-modal' },
    });
    setStatus('send', 'Petició creada. La persona seleccionada la veurà a NexeSing.', false);
    setTimeout(closeModal, 1000);
  }

  root.addEventListener('click', async (event) => {
    const closeTrigger = event.target.closest('[data-close="1"]');
    if (closeTrigger) {
      closeModal();
      return;
    }

    const backTrigger = event.target.closest('[data-back="1"]');
    if (backTrigger) {
      resetPanels();
      return;
    }

    const option = event.target.closest('[data-action]');
    if (!option) return;

    const action = option.dataset.action;
    try {
      if (action === 'screen') await startScreenFlow('screen');
      if (action === 'tablet') await startScreenFlow('tablet');
      if (action === 'mobile') await startMobileFlow();
      if (action === 'autofirma') await startAutoFirmaFlow();
      if (action === 'send') await startSendFlow();
    } catch (error) {
      setStatus('screen', error.message || 'No s\'ha pogut iniciar el flux.', true);
      openPanel('screen');
    }
  });

  root.querySelector('#nsm-screen-clear').addEventListener('click', async () => {
    await ensureSignaturePad();
    state.signaturePad.clear();
    els.screenHint.style.display = '';
    setStatus('screen', '');
  });
  els.screenConfirm.addEventListener('click', () => submitScreenSignature().catch((error) => setStatus('screen', error.message || 'Error registrant la firma.', true)));
  els.mobileRefresh.addEventListener('click', () => refreshMobileStatus());
  els.sendSearch.addEventListener('input', (event) => renderSignerUsers(event.target.value));
  els.sendConfirm.addEventListener('click', () => submitSendFlow().catch((error) => setStatus('send', error.message || 'No s\'ha pogut crear la petició.', true)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('open')) closeModal();
  });

  integratedModalState = { ...state, ...els, openModal, closeModal };
  return integratedModalState;
}

async function requestFromCurrentPage(options = {}) {
  const title = String(options.documentTitle || document.title || 'Document').trim();
  const signers = Array.isArray(options.signers) ? options.signers : [];
  if (!signers.length) throw new Error('Falten signants a la solicitud');

  return requestSignature({
    documentTitle: title,
    documentUrl: options.documentUrl || window.location.href,
    documentText: options.documentText || '',
    sourceModule: options.sourceModule || 'manual',
    sourcePath: window.location.pathname,
    signers,
    metadata: options.metadata || {},
  });
}

function openQuickSignFlow(options = {}) {
  ensureIntegratedModalDeps()
    .then(() => {
      const modal = ensureIntegratedModal();
      modal.openModal(normalizeQuickOptions(options));
    })
    .catch((error) => {
      console.error('[NexeSignature] No s\'ha pogut obrir el modal integrat', error);
      alert('No s\'ha pogut obrir el modal de firma.');
    });
}

const api = {
  getCurrentUserMeta,
  requestSignature,
  getRequest,
  listRecentRequests,
  listRequestsForCurrentUser,
  signRequest,
  rejectRequest,
  createMobileSession,
  getMobileSession,
  completeMobileSession,
  signRequestWithAutoFirma,
  requestFromCurrentPage,
  openSignatureCenter,
  openQuickSignFlow,
};

window.NexeSignature = api;
export default api;
