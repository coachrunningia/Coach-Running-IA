/**
 * Fix : retire les `**bold**` des welcomes patchés cette session
 * (l'UI front affiche le welcomeMessage en texte brut, pas en Markdown).
 *
 * Cible tous les plans avec un welcomeMessage qui contient `**` :
 *   - Aureline 1778575564571
 *   - Killian 1779006774503
 *   - al1.kasongo Marathon 1778927329896
 *   - Les 21 critiques regen via regen-welcome-21-log.json
 *
 * Backup avant. Mode dry-run par défaut.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';

const DRY_RUN = !process.argv.includes('--exec');
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

if (!existsSync('backups-markdown-fix')) mkdirSync('backups-markdown-fix');

// Liste des IDs à check
const allIds = new Set([
  '1778575564571',  // Aureline
  '1779006774503',  // Killian
  '1778927329896',  // al1.kasongo Marathon
]);
const log21 = JSON.parse(readFileSync('regen-welcome-21-log.json', 'utf8')).log;
for (const l of log21) allIds.add(l.id);

console.log(`${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} sur ${allIds.size} plans à vérifier\n`);

let nbWithMd = 0, nbOk = 0, nbErr = 0;
for (const id of allIds) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers:H });
  const doc = await r.json();
  if (!doc.fields) { console.log(`⚠ ${id} introuvable`); nbErr++; continue; }
  const wm = doc.fields.welcomeMessage?.stringValue || '';
  if (!wm.includes('**')) { continue; /* pas de markdown, skip */ }
  nbWithMd++;
  // Backup
  writeFileSync(`backups-markdown-fix/${id}.json`, JSON.stringify({ welcomeMessage: wm }, null, 2));
  // Fix : retirer les ** (garde le texte intact)
  const fixed = wm.replace(/\*\*/g, '');
  console.log(`  ${id}: ${(wm.match(/\*\*/g)||[]).length / 2} occurrences → retirées`);

  if (!DRY_RUN) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}?updateMask.fieldPaths=welcomeMessage`;
    const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify({ fields: { welcomeMessage: { stringValue: fixed } } }) });
    if (patch.status !== 200) {
      const pj = await patch.json();
      console.log(`    ❌ patch failed: ${JSON.stringify(pj).substring(0,200)}`);
      nbErr++;
      continue;
    }
  }
  nbOk++;
}

console.log(`\n${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXEC'} TERMINÉ`);
console.log(`  Plans avec ** : ${nbWithMd}`);
console.log(`  Patchés OK    : ${nbOk}`);
console.log(`  Erreurs       : ${nbErr}`);

if (DRY_RUN) console.log(`\n💡 Pour exécuter : node fix-welcomes-markdown.mjs --exec`);
