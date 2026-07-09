// crypto-utils.js — AES-GCM-256 E2E field encryption for NexeSocial
// Keys are derived client-side via PBKDF2 (310 000 iterations / SHA-256).
// Plaintext never leaves the browser — Firestore only stores encrypted blobs.

const _ALGO = 'AES-GCM';
const _PBKDF2_ITER = 310000; // OWASP 2024 minimum for SHA-256
const _SK = 'nx_vk';        // sessionStorage key (hex-encoded derived key)

let _key = null;

// ── Key initialization ────────────────────────────────────────────────────────

/**
 * Derive and activate the encryption key from the vault password + stored salt.
 * The derived key is also cached in sessionStorage so the user only needs to
 * enter the password once per browser session.
 */
export async function initFromPassword(password, saltB64) {
    if (!password) throw new Error('Contrasenya requerida');
    const km = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    _key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: _b64ToBytes(saltB64), iterations: _PBKDF2_ITER, hash: 'SHA-256' },
        km,
        { name: _ALGO, length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const raw = await crypto.subtle.exportKey('raw', _key);
    sessionStorage.setItem(_SK, _bytesToHex(new Uint8Array(raw)));
}

/**
 * Restore the key from sessionStorage (same browser session, different page).
 * Returns true if successful.
 */
export async function initFromSession() {
    const hex = sessionStorage.getItem(_SK);
    if (!hex || hex.length !== 64) return false;
    try {
        _key = await crypto.subtle.importKey(
            'raw', _hexToBytes(hex), { name: _ALGO }, false, ['encrypt', 'decrypt']
        );
        return true;
    } catch {
        sessionStorage.removeItem(_SK);
        return false;
    }
}

export function isReady() { return _key !== null; }

export function clearKey() {
    _key = null;
    sessionStorage.removeItem(_SK);
}

// ── Encryption / Decryption ───────────────────────────────────────────────────

/**
 * Encrypt a value (string, number, or plain object).
 * Returns { __enc: 1, iv: base64, d: base64 }.
 * Returns the original value unchanged if it is null/undefined/empty string.
 */
export async function encryptField(value) {
    if (!_key) throw new Error('Vault no inicialitzat. Torna a introduir la contrasenya.');
    if (value === null || value === undefined || value === '') return value;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(
        typeof value === 'object' ? JSON.stringify(value) : String(value)
    );
    const cipher = await crypto.subtle.encrypt({ name: _ALGO, iv }, _key, plain);
    return { __enc: 1, iv: _bytesToB64(iv), d: _bytesToB64(new Uint8Array(cipher)) };
}

/**
 * Decrypt an encrypted blob produced by encryptField.
 * If the value is not an encrypted blob (plain legacy data), it is returned as-is —
 * this ensures backwards compatibility with records created before encryption was enabled.
 */
export async function decryptField(enc) {
    if (!enc || typeof enc !== 'object' || !enc.__enc) {
        console.log('[decryptField] Not encrypted (legacy/plain data):', enc);
        return enc;
    }
    if (!_key) {
        console.warn('[decryptField] Key not initialized!');
        return enc;
    }
    try {
        const plain = await crypto.subtle.decrypt(
            { name: _ALGO, iv: _b64ToBytes(enc.iv) },
            _key,
            _b64ToBytes(enc.d)
        );
        const str = new TextDecoder().decode(plain);
        try { 
            const parsed = JSON.parse(str);
            console.log('[decryptField] Successfully decrypted and parsed:', parsed);
            return parsed;
        } catch { 
            console.log('[decryptField] Decrypted as plain string:', str);
            return str;
        }
    } catch (e) {
        console.error('[decryptField] Decryption FAILED:', e);
        return null;
    }
}

// ── Salt generation (first-time admin setup) ──────────────────────────────────

/** Generate a random 256-bit salt for a new organisation. Returns base64 string. */
export function generateSalt() {
    return _bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _hexToBytes(hex) {
    const b = new Uint8Array(hex.length / 2);
    for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
    return b;
}
function _bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function _bytesToB64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function _b64ToBytes(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
