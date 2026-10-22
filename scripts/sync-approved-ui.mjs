// Read public source files downloaded from the approved site. Never execute their scripts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const source = resolve(process.argv[2] || '../approved-live');
const output = resolve('selfhost/web/approved'); mkdirSync(output,{recursive:true});
const digest = value => createHash('sha256').update(value).digest('hex');
const manifest = { reference:'https://nexesocial-bc6c4.web.app', captured:'2026-10-22', files:[], limitations:[] };
const read = file => readFileSync(resolve(source,file),'utf8').replaceAll('\r\n','\n');
function save(file, value, input, method) { writeFileSync(resolve(output,file),value); manifest.files.push({file,sha256:digest(value),source:input,sourceSha256:digest(read(input)),method}); }
save('style-dashboard.css',read('style-dashboard.css'),'style-dashboard.css','verbatim');
const sidebar = read('sidebar.js');
const shell = /const styles = `<style>([\s\S]*?)<\/style>`;/.exec(sidebar)?.[1];
if (!shell || shell.includes('${')) throw new Error('Review source before extracting shell styles');
save('shell.css',shell,'sidebar.js','verbatim CSS template only; no Firebase/auth script');
const icons = Object.fromEntries([...sidebar.matchAll(/^\s+(\w+): `(<svg[^`]+)`/gm)].map(m => [m[1],m[2]]));
save('icons.mjs','export const approvedIcons = '+JSON.stringify(icons,null,2)+';\n','sidebar.js','verbatim static SVG strings');
for (const [key,file] of Object.entries({login:'index.html',home:'home.html',people:'expedient-detall.html',families:'families-llistat.html',family:'familia-perfil.html',programs:'programes-gestio.html',totals:'dades-totals.html',import:'importador-datos.html',reports:'centre-dia-docs.html',attendance:'passar-llista.html',groups:'grups.html',users:'gestio-usuaris.html'})) {
  const styles = [...read(file).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
  if (!styles) throw new Error('Missing CSS in '+file);
  save(key+'.css',styles.replaceAll("img/fondo-login.png",'/assets/login-background.png'),file,key==='login'?'CSS extracted verbatim; background URL points to the same local image':'verbatim CSS blocks');
}
manifest.limitations.push('perfil-usuari.html has no opening style tag and contains JS fragments in the head. Its missing CSS cannot be certified from that file. Use the available original tab/header markup and familia-perfil.css patterns; the malformed live form was confirmed in an authenticated read-only review on 2026-10-22. Its former approved CSS is not available in this reference.');
manifest.assets = ['fonts.css','Inter-400.ttf','Inter-500.ttf','Inter-600.ttf','Inter-700.ttf','Inter-LICENSE.txt','chart.js','Chart-LICENSE.md'].map(file=>({file,sha256:digest(readFileSync(resolve(output,file))),source:file.startsWith('Inter-')?'https://fonts.google.com/specimen/Inter':file.startsWith('Chart-')||file==='chart.js'?'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/':'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'}));
writeFileSync(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Frozen approved CSS/SVG sources:',manifest.files.length);
