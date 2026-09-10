import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const files = walk(publicRoot);
const report = { scope: 'Static source inspection only; no browser or production data access', publicFiles: files.length, htmlPages: 0, externalScripts: 0, inlineScripts: 0, syntaxFailures: [], missingReferences: [], largestFiles: [], metrics: { filesUsingLocalStorage: 0, filesUsingInnerHTML: 0, filesUsingFirestore: 0 }, firebaseSDKVersions: [] };
const seen = new Set();
const versions = new Set();
for (const file of files.filter(f => /\.(html|js|mjs|css)$/.test(f))) {
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split('\n').length;
    report.largestFiles.push({ file: relative(file), lines });
    for (const [key, token] of [['filesUsingLocalStorage', 'localStorage'], ['filesUsingInnerHTML', 'innerHTML'], ['filesUsingFirestore', 'firebase-firestore']]) if (source.includes(token)) report.metrics[key]++;
    for (const match of source.matchAll(/firebasejs\/([\d.]+)\//g)) versions.add(match[1]);
    const check = (code, line, type) => {
        const result = spawnSync(process.execPath, ['--input-type=' + type, '--check'], { input: code, encoding: 'utf8' });
        if (result.status !== 0) report.syntaxFailures.push({ file: relative(file), line, diagnostic: result.stderr.split('\n').slice(0, 7).join('\n') });
    };
    if (/\.(js|mjs)$/.test(file)) { report.externalScripts++; check(source, 1, 'module'); }
    if (file.endsWith('.html')) {
        report.htmlPages++;
        for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (/\bsrc\s*=/.test(match[1]) || !match[2].trim() || /application\/(ld\+)?json/.test(match[1])) continue;
            report.inlineScripts++;
            check(match[2], source.slice(0, match.index).split('\n').length, /type\s*=\s*["']module["']/.test(match[1]) ? 'module' : 'commonjs');
        }
    }
    const refs = [...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g), ...source.matchAll(/\b(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)];
    for (const match of refs) {
        const ref = match[1].split(/[?#]/)[0];
        if (!ref || /^(?:[a-z]+:|\/\/)/i.test(ref) || /[${}<>]/.test(ref) || !/\.(js|mjs|css|html|svg|png|jpe?g|webp)$/i.test(ref)) continue;
        const target = ref.startsWith('/') ? path.join(publicRoot, ref.slice(1)) : path.resolve(path.dirname(file), ref);
        if (fs.existsSync(target)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        const key = `${file}:${line}:${ref}`;
        if (!seen.has(key)) { seen.add(key); report.missingReferences.push({ file: relative(file), line, reference: ref, resolved: relative(target) }); }
    }
}
report.firebaseSDKVersions = [...versions].sort();
report.largestFiles.sort((a, b) => b.lines - a.lines);
report.largestFiles = report.largestFiles.slice(0, 12);
fs.mkdirSync('audits/v2', { recursive: true });
fs.writeFileSync('audits/v2/static-inventory.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, missingReferences: report.missingReferences.slice(0, 12) }, null, 2));
if (process.argv.includes('--check') && (report.syntaxFailures.length || report.missingReferences.length)) process.exitCode = 1;
