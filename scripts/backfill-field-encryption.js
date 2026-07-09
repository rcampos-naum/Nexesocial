#!/usr/bin/env node
/*
 Field encryption backfill for Firestore.

 Modes:
 - dry-run: no writes, shows impact report
 - apply: writes encrypted/indexed fields (optional plaintext removal)

 Usage examples:
   node scripts/backfill-field-encryption.js --mode dry-run
   node scripts/backfill-field-encryption.js --mode apply --collections usuarios,expedientes
   node scripts/backfill-field-encryption.js --mode apply --drop-plaintext

 Required env vars:
 - GOOGLE_APPLICATION_CREDENTIALS (service account json path)
 - FIELD_ENC_KEY (base64 32-byte key)
 - INDEX_KEY (secret for HMAC index derivation)
*/

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const { FieldPath, FieldValue } = admin.firestore;

function parseArgs(argv) {
  const args = {
    mode: 'dry-run',
    matrix: path.resolve(process.cwd(), 'scripts', 'field-encryption-matrix.json'),
    collections: null,
    pageSize: 200,
    batchSize: 400,
    limit: 0,
    dropPlaintext: false,
    force: false,
    verbose: false
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--mode' && n) { args.mode = n; i += 1; }
    else if (a === '--matrix' && n) { args.matrix = path.resolve(process.cwd(), n); i += 1; }
    else if (a === '--collections' && n) { args.collections = n.split(',').map((s) => s.trim()).filter(Boolean); i += 1; }
    else if (a === '--page-size' && n) { args.pageSize = Number(n) || args.pageSize; i += 1; }
    else if (a === '--batch-size' && n) { args.batchSize = Number(n) || args.batchSize; i += 1; }
    else if (a === '--limit' && n) { args.limit = Number(n) || 0; i += 1; }
    else if (a === '--drop-plaintext') { args.dropPlaintext = true; }
    else if (a === '--force') { args.force = true; }
    else if (a === '--verbose') { args.verbose = true; }
  }

  if (!['dry-run', 'apply'].includes(args.mode)) {
    throw new Error('Invalid --mode. Use dry-run or apply.');
  }
  if (args.batchSize > 450) {
    throw new Error('--batch-size must be <= 450 for Firestore safety margin.');
  }
  return args;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getByPath(obj, p) {
  if (!obj || !p) return undefined;
  return p.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function normalizeForIndex(value, normalizer) {
  if (value === null || value === undefined) return '';
  let v = value;
  if (typeof v !== 'string') v = JSON.stringify(v);
  if (normalizer === 'lower_trim') return v.trim().toLowerCase();
  return v;
}

function deriveBlindIndex(value, indexKey, normalizer) {
  const normalized = normalizeForIndex(value, normalizer);
  const h = crypto.createHmac('sha256', indexKey);
  h.update(normalized, 'utf8');
  return h.digest('base64');
}

function encryptValue(value, encKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'A256GCM',
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64')
  };
}

function buildUpdateForDoc(docData, fieldRules, opts, encKey, indexKey) {
  const updates = {};
  let touched = 0;

  for (const rule of fieldRules) {
    const action = rule.action;
    if (action === 'clear') continue;

    const sourcePath = rule.path;
    const sourceValue = getByPath(docData, sourcePath);
    if (sourceValue === undefined) continue;

    const encField = rule.encryptedField || `${sourcePath.replace(/\./g, '_')}_enc`;
    const idxField = rule.indexField || `${sourcePath.replace(/\./g, '_')}_idx`;

    if (action === 'encrypted' || action === 'encrypted_indexed') {
      const existingEnc = getByPath(docData, encField);
      if (!existingEnc || opts.force) {
        updates[encField] = encryptValue(sourceValue, encKey);
        touched += 1;
      }
      if (opts.dropPlaintext) {
        updates[sourcePath] = FieldValue.delete();
      }
    }

    if (action === 'indexed' || action === 'encrypted_indexed') {
      const nextIdx = deriveBlindIndex(sourceValue, indexKey, rule.normalizer);
      const existingIdx = getByPath(docData, idxField);
      if (existingIdx !== nextIdx || opts.force) {
        updates[idxField] = nextIdx;
        touched += 1;
      }
    }
  }

  return { updates, touched };
}

function printSummary(summary, mode) {
  console.log('');
  console.log(`Mode: ${mode}`);
  console.log('Backfill summary:');
  for (const row of summary) {
    console.log(`- ${row.collection}: scanned=${row.scanned}, matched=${row.matched}, updated=${row.updated}, batches=${row.batches}`);
  }
}

async function processCollection(db, cfg, args, encKey, indexKey) {
  const result = {
    collection: cfg.name,
    scanned: 0,
    matched: 0,
    updated: 0,
    batches: 0
  };

  let cursor = null;
  let done = false;

  while (!done) {
    let q = db.collection(cfg.name).orderBy(FieldPath.documentId()).limit(args.pageSize);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    let batch = null;
    let inBatch = 0;

    if (args.mode === 'apply') {
      batch = db.batch();
    }

    for (const docSnap of snap.docs) {
      if (args.limit > 0 && result.scanned >= args.limit) {
        done = true;
        break;
      }

      result.scanned += 1;
      const docData = docSnap.data() || {};
      const { updates, touched } = buildUpdateForDoc(docData, cfg.fields || [], args, encKey, indexKey);

      if (touched > 0 || (args.dropPlaintext && Object.keys(updates).length > 0)) {
        result.matched += 1;

        if (args.mode === 'apply') {
          batch.update(docSnap.ref, updates);
          inBatch += 1;
          result.updated += 1;

          if (inBatch >= args.batchSize) {
            await batch.commit();
            result.batches += 1;
            batch = db.batch();
            inBatch = 0;
          }
        } else if (args.verbose && result.matched <= 10) {
          console.log(`[dry-run] ${cfg.name}/${docSnap.id} -> ${Object.keys(updates).join(', ')}`);
        }
      }

      cursor = docSnap;
    }

    if (args.mode === 'apply' && batch && inBatch > 0) {
      await batch.commit();
      result.batches += 1;
    }

    if (snap.size < args.pageSize) break;
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const matrix = loadJson(args.matrix);

  const encKeyB64 = process.env.FIELD_ENC_KEY || '';
  const indexKey = process.env.INDEX_KEY || '';

  if (!encKeyB64) throw new Error('Missing FIELD_ENC_KEY env var (base64 32-byte key).');
  if (!indexKey) throw new Error('Missing INDEX_KEY env var.');

  const encKey = Buffer.from(encKeyB64, 'base64');
  if (encKey.length !== 32) {
    throw new Error('FIELD_ENC_KEY must decode to exactly 32 bytes (AES-256 key).');
  }

  admin.initializeApp();
  const db = admin.firestore();

  const collections = (matrix.collections || []).filter((c) => {
    if (!args.collections || args.collections.length === 0) return true;
    return args.collections.includes(c.name);
  });

  if (!collections.length) {
    throw new Error('No collections selected. Check --collections or matrix file.');
  }

  console.log(`Loaded matrix: ${args.matrix}`);
  console.log(`Collections: ${collections.map((c) => c.name).join(', ')}`);
  console.log(`Options: pageSize=${args.pageSize}, batchSize=${args.batchSize}, dropPlaintext=${args.dropPlaintext}, force=${args.force}`);

  const summary = [];
  for (const cfg of collections) {
    console.log(`\nProcessing collection: ${cfg.name}`);
    const row = await processCollection(db, cfg, args, encKey, indexKey);
    summary.push(row);
    console.log(`Done ${cfg.name}: scanned=${row.scanned}, matched=${row.matched}, updated=${row.updated}, batches=${row.batches}`);
  }

  printSummary(summary, args.mode);
}

main()
  .then(() => {
    console.log('\nCompleted.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nBackfill failed:', err.message);
    process.exit(1);
  });
