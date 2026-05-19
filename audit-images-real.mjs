/**
 * Audit RÉEL des images du catalogue : lit chaque imageUrl déclarée
 * et vérifie que le fichier existe dans public/exercises/.
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, 'src/services/exerciseCatalog.ts'), 'utf-8');
const imageFiles = new Set(readdirSync(resolve(__dirname, 'public/exercises')));

// Parse: clé suivie de imageUrl (le bloc entre la clé et l'imageUrl est court)
const entries = [];
const reKey = /^\s{2}"([^"]+)":\s*\{/gm;
let m;
const matches = [];
while ((m = reKey.exec(src)) !== null) matches.push({ key: m[1], pos: m.index });

for (let i = 0; i < matches.length; i++) {
  const start = matches[i].pos;
  const end = i + 1 < matches.length ? matches[i + 1].pos : src.length;
  const block = src.slice(start, end);
  const imgMatch = block.match(/imageUrl:\s*"([^"]+)"/);
  entries.push({ key: matches[i].key, imageUrl: imgMatch ? imgMatch[1] : null });
}

console.log(`Catalogue: ${entries.length} exercices`);
console.log(`PNG dispo: ${imageFiles.size}`);

const missingImageUrl = entries.filter(e => !e.imageUrl);
const fileNotFound = entries.filter(e => e.imageUrl && !imageFiles.has(e.imageUrl.replace('/exercises/', '')));
const ok = entries.filter(e => e.imageUrl && imageFiles.has(e.imageUrl.replace('/exercises/', '')));

console.log(`\n✅ OK (imageUrl + fichier existe): ${ok.length}`);
console.log(`🔴 imageUrl absent du catalogue: ${missingImageUrl.length}`);
if (missingImageUrl.length) missingImageUrl.forEach(e => console.log(`   - "${e.key}"`));
console.log(`\n🔴 imageUrl déclaré mais fichier MANQUANT: ${fileNotFound.length}`);
if (fileNotFound.length) fileNotFound.forEach(e => console.log(`   - "${e.key}" → ${e.imageUrl}`));

// Bonus : fichiers PNG orphelins (existent mais pas référencés)
const referenced = new Set(entries.filter(e => e.imageUrl).map(e => e.imageUrl.replace('/exercises/', '')));
const orphanFiles = [...imageFiles].filter(f => !referenced.has(f));
console.log(`\n🟡 PNG orphelins (existent, jamais référencés): ${orphanFiles.length}`);
orphanFiles.forEach(f => console.log(`   - ${f}`));

// Partages : combien d'exercices pointent vers une même image
const sharing = {};
for (const e of entries) if (e.imageUrl) (sharing[e.imageUrl] = sharing[e.imageUrl] || []).push(e.key);
const shared = Object.entries(sharing).filter(([_, list]) => list.length > 1);
console.log(`\n🔵 PNG partagés par plusieurs exercices: ${shared.length}`);
shared.forEach(([img, keys]) => console.log(`   - ${img.replace('/exercises/','')} ← ${keys.length} exos: ${keys.join(' | ')}`));
