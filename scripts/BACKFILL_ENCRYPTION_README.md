# Backfill encryption script

## 1) Install dependency

Run from repository root:

```powershell
npm init -y
npm install firebase-admin
```

## 2) Required environment variables

- `GOOGLE_APPLICATION_CREDENTIALS`: absolute path to service account json
- `FIELD_ENC_KEY`: base64-encoded 32-byte AES key
- `INDEX_KEY`: secret string for HMAC blind indexes

Example key generation:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Use first output for `FIELD_ENC_KEY` and second output for `INDEX_KEY`.

## 3) Dry-run first (mandatory)

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\nexesocial-admin.json"
$env:FIELD_ENC_KEY="<base64-32-byte-key>"
$env:INDEX_KEY="<index-secret>"
node scripts/backfill-field-encryption.js --mode dry-run --verbose
```

## 4) Apply mode

```powershell
node scripts/backfill-field-encryption.js --mode apply
```

Apply specific collections only:

```powershell
node scripts/backfill-field-encryption.js --mode apply --collections usuarios,expedientes
```

## 5) Optional plaintext removal (phase 2 only)

Only after readers are migrated to encrypted fields/indexes.

```powershell
node scripts/backfill-field-encryption.js --mode apply --drop-plaintext
```

## 6) Useful flags

- `--matrix <path>` custom matrix json
- `--page-size <n>` pagination size (default 200)
- `--batch-size <n>` commit size (default 400, max 450)
- `--limit <n>` max docs per collection
- `--force` re-encrypt/re-index even if target exists
- `--verbose` print dry-run sample updates

## 7) Files

- Matrix (human): `SECURITY_ENCRYPTION_MATRIX.md`
- Matrix (machine): `scripts/field-encryption-matrix.json`
- Script: `scripts/backfill-field-encryption.js`
