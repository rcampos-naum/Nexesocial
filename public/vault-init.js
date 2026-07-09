// vault-init.js — Automatic E2E key derivation for NexeSocial.
// No user interaction required.
// The AES key is derived from an org-secret stored in Firestore /config/encryption,
// which is access-controlled by Firebase Auth rules (signed-in users only).
// First deployment auto-generates and persists the org secret.

import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initFromPassword, initFromSession, generateSalt } from './crypto-utils.js';

let _resolve;
const _ready = new Promise(res => { _resolve = res; });

/** Resolves once the AES key is ready. Await this before any encrypt/decrypt. */
export function waitForCrypto() { return _ready; }

// Runs automatically once when this module is first imported.
(async function _bootstrap() {
    // Restore from sessionStorage first (avoids re-deriving on every page navigation).
    if (await initFromSession()) {
        _resolve();
        return;
    }

    // Wait for Firebase Auth to settle.
    const user = await new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, u => { unsub(); resolve(u); });
    });

    if (!user) {
        // Not authenticated — resolve silently; login redirect handles security.
        _resolve();
        return;
    }

    let orgSecret = null, salt = null;
    try {
        const snap = await getDoc(doc(db, 'config', 'encryption'));
        if (snap.exists()) {
            orgSecret = snap.data().orgSecret || null;
            salt     = snap.data().salt      || null;
        }
    } catch (e) {
        console.warn('vault-init: could not read config/encryption', e);
    }

    if (!orgSecret || !salt) {
        // First deployment: auto-generate and persist the org secret (no user input needed).
        orgSecret = generateSalt(); // 256-bit random base64
        salt      = generateSalt();
        try {
            await setDoc(doc(db, 'config', 'encryption'), {
                orgSecret, salt, createdAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.warn('vault-init: could not write config/encryption:', e);
            _resolve();
            return;
        }
    }

    try {
        await initFromPassword(orgSecret, salt);
    } catch (e) {
        console.warn('vault-init: key derivation failed', e);
    }
    _resolve();
}());


function _showPrompt(salt) {
    return new Promise(resolve => {
        const overlay = _makeOverlay();
        overlay.innerHTML = `
          <div style="background:#fff;padding:36px;border-radius:16px;max-width:420px;width:95%;
                      box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:10px">&#128272;</div>
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:1.2rem">Registre Xifrat</h2>
            <p style="color:#64748b;font-size:0.87rem;margin:0 0 20px;line-height:1.5">
              Introdueix la contrasenya del registre per accedir a les dades confidencials.
            </p>
            <input id="_vpwd" type="password" autocomplete="current-password"
              placeholder="Contrasenya del registre..."
              style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:10px;
                     font-size:1rem;margin-bottom:6px;box-sizing:border-box;outline:none;" />
            <p id="_verr" style="color:#ef4444;font-size:0.82rem;min-height:1.2rem;margin:4px 0 14px"></p>
            <button id="_vbtn"
              style="width:100%;padding:13px;background:#2563eb;color:#fff;border:none;
                     border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">
              Desbloquejar
            </button>
          </div>`;
        document.body.appendChild(overlay);
        const inp = overlay.querySelector('#_vpwd');
        const btn = overlay.querySelector('#_vbtn');
        const err = overlay.querySelector('#_verr');
        inp.focus();

        async function attempt() {
            const pwd = inp.value;
            if (!pwd) { err.textContent = 'La contrasenya no pot estar buida.'; return; }
            btn.textContent = 'Desbloquejant...'; btn.disabled = true;
            try {
                await initFromPassword(pwd, salt);
                overlay.remove();
                resolve();
            } catch (e) {
                console.error(e);
                err.textContent = 'Contrasenya incorrecta o error al desxifrar.';
                btn.textContent = 'Desbloquejar'; btn.disabled = false;
                inp.value = ''; inp.focus();
            }
        }
        btn.addEventListener('click', attempt);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
    });
}

// ── First-time admin setup ────────────────────────────────────────────────────

function _showSetup() {
    return new Promise(resolve => {
        const overlay = _makeOverlay();
        overlay.innerHTML = `
          <div style="background:#fff;padding:36px;border-radius:16px;max-width:480px;width:95%;
                      box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:10px">&#128273;</div>
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:1.2rem">
              Configuracio del Registre Xifrat
            </h2>
            <p style="color:#64748b;font-size:0.85rem;margin:0 0 18px;line-height:1.5">
              Primera configuracio. Defineix la contrasenya de xifrat per a tots els professionals.<br>
              <strong style="color:#ef4444">Guarda-la en un lloc segur. No es pot recuperar.</strong>
            </p>
            <input id="_vp1" type="password" autocomplete="new-password"
              placeholder="Nova contrasenya (minim 8 caracters)..."
              style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:10px;
                     font-size:1rem;margin-bottom:10px;box-sizing:border-box;" />
            <input id="_vp2" type="password" autocomplete="new-password"
              placeholder="Confirma la contrasenya..."
              style="width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:10px;
                     font-size:1rem;margin-bottom:6px;box-sizing:border-box;" />
            <p id="_verr" style="color:#ef4444;font-size:0.82rem;min-height:1.2rem;margin:4px 0 14px"></p>
            <button id="_vbtn"
              style="width:100%;padding:13px;background:#10b981;color:#fff;border:none;
                     border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">
              Crear Registre Xifrat
            </button>
          </div>`;
        document.body.appendChild(overlay);
        const p1 = overlay.querySelector('#_vp1');
        const p2 = overlay.querySelector('#_vp2');
        const btn = overlay.querySelector('#_vbtn');
        const err = overlay.querySelector('#_verr');
        p1.focus();

        async function setup() {
            const pwd = p1.value;
            if (!pwd || pwd.length < 8) { err.textContent = 'Minim 8 caracters.'; return; }
            if (pwd !== p2.value) { err.textContent = 'Les contrasenyes no coincideixen.'; return; }
            btn.textContent = 'Creant...'; btn.disabled = true;
            try {
                const salt = generateSalt();
                await setDoc(doc(db, 'config', 'encryption'), {
                    salt,
                    createdAt: new Date().toISOString()
                }, { merge: true });
                await initFromPassword(pwd, salt);
                overlay.remove();
                resolve();
            } catch (e) {
                err.textContent = 'Error: ' + (e.message || 'desconegut');
                btn.textContent = 'Crear Registre Xifrat'; btn.disabled = false;
            }
        }
        btn.addEventListener('click', setup);
        p2.addEventListener('keydown', e => { if (e.key === 'Enter') setup(); });
    });
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _makeOverlay() {
    const el = document.createElement('div');
    el.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(15,23,42,.85);z-index:99999;display:flex;' +
        'align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    return el;
}
