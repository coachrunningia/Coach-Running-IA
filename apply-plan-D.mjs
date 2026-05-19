/**
 * Correction Plan D — lameymichel@yahoo.fr (1778654000218)
 * Reformuler feasibility.message : remplacer les mentions "volume actuel de 35km/sem"
 * par une explication transparente que c'est une estimation basée sur profil.
 */
import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778654000218';

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
const currentMessage = j.fields.feasibility.mapValue.fields.message.stringValue;
console.log(`Message actuel (${currentMessage.length} chars):\n${currentMessage}\n`);

// Le message contient 2 occurrences de "Volume actuel de 35km/sem" :
//   - "Volume actuel de 35km/sem insuffisant pour un trail de 105km (40km/sem recommandés)."
//   - "Volume actuel de 35km/sem bas pour un ultra de 105km (50km/sem+ recommandés)."
// On les regroupe et on remplace par une note d'estimation claire.

// Stratégie : remplacer les 2 phrases problématiques par une seule phrase claire d'estimation.
let newMessage = currentMessage;

// Supprime les 2 phrases répétitives sur le volume
newMessage = newMessage.replace(
  /Volume actuel de \d+km\/sem insuffisant pour un trail de \d+km \(\d+km\/sem recommandés\)\.\s*/g,
  ''
);
newMessage = newMessage.replace(
  /Volume actuel de \d+km\/sem bas pour un ultra de \d+km \(\d+km\/sem\+ recommandés\)\.\s*/g,
  ''
);

// Ajoute une note d'estimation claire, juste avant "Blessure déclarée" ou en fin si pas trouvé
const ESTIMATION_NOTE = "Tu n'as pas indiqué ton volume actuel — on part de l'estimation 35 km/sem (basée sur ton niveau Confirmé et fréquence 5sé/sem) : c'est insuffisant pour un ultra de 105 km (50 km/sem+ recommandés). Si tu cours réellement plus, régénère ton plan en saisissant ton volume pour des recommandations adaptées à ton vrai niveau d'entraînement. ";

if (newMessage.includes('Blessure déclarée')) {
  newMessage = newMessage.replace('Blessure déclarée', ESTIMATION_NOTE + 'Blessure déclarée');
} else {
  newMessage = newMessage.trim() + '\n\n' + ESTIMATION_NOTE.trim();
}

// Nettoyage double espace
newMessage = newMessage.replace(/  +/g, ' ').replace(/\n\n+/g, '\n\n').trim();

console.log(`Nouveau message (${newMessage.length} chars):\n${newMessage}\n`);

// PATCH feasibility.message
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility.message`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { feasibility: { mapValue: { fields: { message: { stringValue: newMessage } } } } } }),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur:', patched.error); process.exit(1); }

console.log(`✅ Plan D corrigé. Le message présente maintenant le volume comme une estimation.`);
