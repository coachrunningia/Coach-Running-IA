/**
 * Backup complet des 6 plans avant correction.
 * Sauvegarde brute Firestore en JSON + timestamp pour rollback.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_IDS = [
  ['1778648613186', 'A-deugnilson-freemium'],
  ['1778673418021', 'B-bruno-grange'],
  ['1778675188561', 'C-mainmain'],
  ['1778654000218', 'D-lameymichel-yahoo'],
  ['1778669503908', 'E-lamey-michel-gmail'],
  ['1778677412470', 'F-estenoza-tom'],
];

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const dir = `backup-correction-13mai-${ts}`;
mkdirSync(dir, { recursive: true });

console.log(`Backup dir: ${dir}\n`);

for (const [id, label] of PLAN_IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const raw = await r.json();
  if (!raw.fields) { console.log(`❌ ${label} (${id}) introuvable`); continue; }
  writeFileSync(`${dir}/${label}-${id}.json`, JSON.stringify(raw, null, 2));
  console.log(`✅ ${label.padEnd(30)} ${id}  →  ${dir}/${label}-${id}.json`);
}

console.log(`\n📦 6 plans sauvegardés en JSON brut Firestore.`);
console.log(`Pour restaurer un plan : utiliser le JSON via PATCH Firestore avec updateMask sur tous les champs.`);
