import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { probePilotDatabase } from '../probe-data.mjs';

test('Docker assigns all copied code to its runtime user for private-mode source files', () => {
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  const copies = dockerfile.split(/\r?\n/).filter(line => line.startsWith('COPY '));
  assert.equal(copies.length, 2);
  assert.ok(copies.every(line => line.startsWith('COPY --chown=node:node ')));
  assert.match(dockerfile, /^USER node$/m);
});
test('an empty volume is not considered an initialized installation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexe-probe-'));
  try {
    const path = join(directory, 'nexesocial.sqlite');
    assert.equal(probePilotDatabase(path), 3); assert.equal(existsSync(path), false);
    const db = new DatabaseSync(path); db.exec('CREATE TABLE users(id TEXT PRIMARY KEY)'); db.close();
    const before = readFileSync(path);
    assert.equal(probePilotDatabase(path), 3); assert.deepEqual(readFileSync(path), before);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('existing accounts are detected without changing the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexe-probe-'));
  try {
    const path = join(directory, 'nexesocial.sqlite');
    const db = new DatabaseSync(path); db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('existing')"); db.close();
    const before = readFileSync(path); assert.equal(probePilotDatabase(path), 0); assert.deepEqual(readFileSync(path), before);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('corrupt or unrecognized databases fail closed without overwriting data', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexe-probe-'));
  try {
    const path = join(directory, 'nexesocial.sqlite'); writeFileSync(path, 'not a database');
    assert.equal(probePilotDatabase(path), 4); assert.equal(readFileSync(path, 'utf8'), 'not a database');
    const other = join(directory, 'other.sqlite'); const db = new DatabaseSync(other); db.exec('CREATE TABLE unexpected(id TEXT)'); db.close();
    assert.equal(probePilotDatabase(other), 4);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
