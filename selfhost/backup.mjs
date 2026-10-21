import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.env.DATA_DIR || resolve('selfhost/data');
const destination = process.argv[2];
if (!destination) throw new Error('Uso: node selfhost/backup.mjs /ruta/absoluta/copias');
mkdirSync(destination, { recursive: true, mode: 0o700 });
const filename = resolve(destination, `nexesocial-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const db = new DatabaseSync(resolve(source, 'nexesocial.sqlite'), { readOnly: true });
try { await backup(db, filename); chmodSync(filename, 0o600); console.log(filename); }
finally { db.close(); }
