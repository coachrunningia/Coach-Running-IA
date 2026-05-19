/**
 * Correction Plan A — deugnilson freemium (1778648613186)
 * Ajout warning IMC + D+ progressif dans feasibility.safetyWarning.
 */
import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778648613186';

const OLD_WARNING = "Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c'est possible. Pense à bien t'hydrater et à écouter ton corps.";

const NEW_WARNING = "Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c'est possible. Pense à bien t'hydrater et à écouter ton corps. Compte tenu de ta morphologie, sois progressif sur les volumes ; un avis médical est recommandé avant cet objectif trail intense. Démarre tes premières sorties longues en plat/peu vallonné (≤150m D+) et augmente progressivement le D+ sur 4 semaines pour préparer ton corps à la spécificité de la course.";

// 1. Read current state
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
const currentWarning = j.fields?.feasibility?.mapValue?.fields?.safetyWarning?.stringValue;
console.log(`AVANT  : "${currentWarning?.substring(0,120)}..."`);

if (currentWarning !== OLD_WARNING) {
  console.warn(`⚠️ Le warning actuel ne correspond pas exactement à OLD_WARNING. Vérifier avant patch.`);
  console.log(`Attendu : "${OLD_WARNING.substring(0,120)}..."`);
}

// 2. PATCH feasibility.safetyWarning uniquement
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility.safetyWarning`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: {
      feasibility: {
        mapValue: {
          fields: {
            safetyWarning: { stringValue: NEW_WARNING },
          }
        }
      }
    }
  }),
});
const patched = await patchRes.json();
if (patched.error) {
  console.error(`🔴 Erreur PATCH:`, patched.error);
  process.exit(1);
}

const newWarning = patched.fields?.feasibility?.mapValue?.fields?.safetyWarning?.stringValue;
console.log(`\nAPRÈS  : "${newWarning?.substring(0,120)}..."`);
console.log(`\n✅ Plan A corrigé. Autres champs feasibility intacts.`);

// 3. Vérification que les autres champs sont préservés
const finalFeas = patched.fields?.feasibility?.mapValue?.fields;
console.log(`\nVérif feasibility intact :`);
console.log(`  status  = "${finalFeas?.status?.stringValue}"`);
console.log(`  message = "${finalFeas?.message?.stringValue?.substring(0,80)}..."`);
