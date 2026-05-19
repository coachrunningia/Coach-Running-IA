/**
 * Nettoyage du doublon UID pour nicolasdts99@gmail.com.
 *
 *   GARDE     : UID #1 (i4mCm9vrEPWr0NJgbFxG6IyWMFB2) — email/password, créé 16:23
 *               + plan #1 (1778682781778) freemium créé 16:33
 *
 *   SUPPRIME  : UID #2 (a9xtn6a4ixTWVia22GG8uUvqxWj1) — Google, créé 16:53
 *               + plan #2 (1778684157393) freemium créé 16:55
 *
 * Avec l'option Firebase "Associer les comptes qui utilisent la même adresse e-mail"
 * activée + notre nouveau catch d'erreur `auth/account-exists-with-different-credential`,
 * Nicolas sera redirigé vers son login email/password s'il tente à nouveau Google.
 *
 * Backup avant suppression dans backup-nicolas-doublon-{ts}/.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const UID_TO_DELETE = 'a9xtn6a4ixTWVia22GG8uUvqxWj1';
const PLAN_TO_DELETE = '1778684157393';
const UID_TO_KEEP = 'i4mCm9vrEPWr0NJgbFxG6IyWMFB2';
const PLAN_TO_KEEP = '1778682781778';

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const dir = `backup-nicolas-doublon-${ts}`;
mkdirSync(dir, { recursive: true });
console.log(`Backup dir: ${dir}\n`);

async function fetchDoc(path) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  return r.json();
}

async function deleteDoc(path) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  return { status: r.status, ok: r.ok };
}

// ─── 1. BACKUP de tout ce qu'on va toucher ───
console.log('1. BACKUP');
const backups = {
  userToKeep: await fetchDoc(`users/${UID_TO_KEEP}`),
  userToDelete: await fetchDoc(`users/${UID_TO_DELETE}`),
  planToKeep: await fetchDoc(`plans/${PLAN_TO_KEEP}`),
  planToDelete: await fetchDoc(`plans/${PLAN_TO_DELETE}`),
};
writeFileSync(`${dir}/backup.json`, JSON.stringify(backups, null, 2));
console.log(`  ✓ Backup écrit dans ${dir}/backup.json`);
console.log(`  • UID gardé ${UID_TO_KEEP.substring(0,12)} : ${backups.userToKeep?.fields ? '✓ trouvé' : '❌ ABSENT'}`);
console.log(`  • UID à supprimer ${UID_TO_DELETE.substring(0,12)} : ${backups.userToDelete?.fields ? '✓ trouvé' : '❌ ABSENT'}`);
console.log(`  • Plan gardé ${PLAN_TO_KEEP} : ${backups.planToKeep?.fields ? '✓ trouvé' : '❌ ABSENT'}`);
console.log(`  • Plan à supprimer ${PLAN_TO_DELETE} : ${backups.planToDelete?.fields ? '✓ trouvé' : '❌ ABSENT'}`);

if (!backups.userToDelete?.fields || !backups.planToDelete?.fields) {
  console.error('\n🔴 Cible(s) introuvable(s) en base. Abandon.');
  process.exit(1);
}

// Vérification que le plan à supprimer est bien lié au UID à supprimer
const planUserId = backups.planToDelete.fields.userId?.stringValue;
if (planUserId !== UID_TO_DELETE) {
  console.error(`\n🔴 Incohérence : plan ${PLAN_TO_DELETE} a userId="${planUserId}", attendu "${UID_TO_DELETE}". Abandon par sécurité.`);
  process.exit(1);
}
console.log(`  ✓ Le plan ${PLAN_TO_DELETE} appartient bien à ${UID_TO_DELETE} — cohérent\n`);

// ─── 2. SUPPRESSION du plan #2 ───
console.log('2. SUPPRESSION DU PLAN');
const planRes = await deleteDoc(`plans/${PLAN_TO_DELETE}`);
console.log(`  • DELETE plans/${PLAN_TO_DELETE} → ${planRes.status} ${planRes.ok ? '✓' : '❌'}`);
if (!planRes.ok) { console.error('Échec suppression plan. Abandon avant suppression user.'); process.exit(1); }

// ─── 3. SUPPRESSION du user #2 ───
console.log('\n3. SUPPRESSION DU USER (Firestore uniquement)');
const userRes = await deleteDoc(`users/${UID_TO_DELETE}`);
console.log(`  • DELETE users/${UID_TO_DELETE} → ${userRes.status} ${userRes.ok ? '✓' : '❌'}`);
if (!userRes.ok) { console.error('Échec suppression user.'); process.exit(1); }

// ─── 4. VÉRIFICATION POST-SUPPRESSION ───
console.log('\n4. VÉRIFICATION');
const verifyUser = await fetchDoc(`users/${UID_TO_DELETE}`);
const verifyPlan = await fetchDoc(`plans/${PLAN_TO_DELETE}`);
console.log(`  • users/${UID_TO_DELETE} : ${verifyUser?.fields ? '⚠️ EXISTE ENCORE' : '✓ supprimé'}`);
console.log(`  • plans/${PLAN_TO_DELETE} : ${verifyPlan?.fields ? '⚠️ EXISTE ENCORE' : '✓ supprimé'}`);

// Vérification que le UID #1 et plan #1 sont intacts
const checkUser1 = await fetchDoc(`users/${UID_TO_KEEP}`);
const checkPlan1 = await fetchDoc(`plans/${PLAN_TO_KEEP}`);
console.log(`  • users/${UID_TO_KEEP} (gardé) : ${checkUser1?.fields ? '✓ intact' : '❌ DISPARU !'}`);
console.log(`  • plans/${PLAN_TO_KEEP} (gardé) : ${checkPlan1?.fields ? '✓ intact' : '❌ DISPARU !'}`);

console.log(`\n✅ Doublon Nicolas nettoyé. Backup conservé dans ${dir}/`);
console.log(`\n📝 NOTE : le UID Firebase Auth ${UID_TO_DELETE.substring(0,12)} (Google) existe encore`);
console.log(`   dans Firebase Authentication. Si Nicolas tente Google Sign-In à nouveau :`);
console.log(`   → Firebase trouvera le UID Google, mais notre code ne trouvera pas de doc Firestore`);
console.log(`   → loginWithGoogle re-créerait un doc Firestore pour ce UID. Pour éviter cela,`);
console.log(`   tu peux supprimer manuellement le UID dans Firebase Console > Authentication > Users.`);
