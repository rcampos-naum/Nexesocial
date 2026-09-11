import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('v2/dist', { recursive: true });
await build({ entryPoints: ['v2/src/app.js'], bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], outfile: 'v2/dist/app.js', minify: false });
await copyFile('v2/src/index.html', 'v2/dist/index.html');
await copyFile('v2/src/app.css', 'v2/dist/app.css');
await copyFile('v2/src/branding.css', 'v2/dist/branding.css');
await mkdir('v2/dist/assets/branding', { recursive: true });
for (const logo of ['NexeSocial-logo.png', 'nexeadmin.svg', 'nexeadmin-icon.svg', 'NexePsy.svg', 'NexePsy-icon.svg', 'nexesing.svg', 'nexesing-icon.svg', 'nexeauditsuit.svg', 'nexeauditsuit-icon.svg']) {
    await copyFile(`public/img/${logo}`, `v2/dist/assets/branding/${logo}`);
}
console.log('NexeSocial 2.0 compiled for local emulator: http://127.0.0.1:5002');
