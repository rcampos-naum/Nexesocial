import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../web/approved/',import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
test('approved styles and SVG assets stay identical to the frozen public reference', () => {
  assert.equal(manifest.reference,'https://nexesocial-bc6c4.web.app');
  for (const entry of [...manifest.files,...manifest.assets]) {
    const raw = readFileSync(new URL(entry.file,base));
    const value = entry.file.endsWith('.ttf') ? raw : raw.toString('utf8').replaceAll('\r\n','\n');
    assert.equal(createHash('sha256').update(value).digest('hex'),entry.sha256,entry.file+' changed from the approved snapshot');
  }
});
test('approved adapters load local fonts and scripts without reviving Firebase integration', () => {
  const html = readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('/approved/shell.css')); assert.ok(html.includes('/approved/fonts.css'));
  assert.ok(!html.includes('https://'));
  for (const entry of manifest.files.filter(entry=>entry.file.endsWith('.css')||entry.file.endsWith('.mjs'))) {
    const code=readFileSync(new URL(entry.file,base),'utf8');
    assert.doesNotMatch(code,/firebase|@import\s|url\(\s*['"]?https?:/i,entry.file);
  }
  assert.doesNotMatch(readFileSync(new URL('fonts.css',base),'utf8'),/https?:/);
});
