/**
 * Correction Plan F — estenoza.tom (1778677412470)
 *   1. Forcer status BON → RISQUÉ (déclenche la modal de validation)
 *   2. Réécrire feasibility.message : mention fracture stress + bilan biologique + estimation volume
 *   3. Renforcer feasibility.safetyWarning : protéger pendant bypass (réduire volume + D+, pas cross-training)
 */
import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778677412470';

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
const feas = j.fields.feasibility.mapValue.fields;
console.log(`AVANT  status: "${feas.status.stringValue}"`);
console.log(`AVANT  message: "${feas.message.stringValue.substring(0,200)}..."`);
console.log(`AVANT  warning: "${feas.safetyWarning.stringValue.substring(0,200)}..."\n`);

// === Nouveaux contenus ===
const NEW_STATUS = 'RISQUÉ';

const NEW_MESSAGE = "Une douleur osseuse à la hanche déclarée nécessite une imagerie médicale + avis d'un spécialiste AVANT de démarrer ce plan. Cette douleur peut révéler une fracture de stress du col fémoral, une ostéonécrose ou un conflit fémoro-acétabulaire — pathologies potentiellement graves. Un feu vert médical est indispensable. Profil à risque RED-S (déficit énergétique relatif du sportif) chez un coureur jeune en charge ultra : un bilan biologique (vitamine D, ferritine, testostérone) en complément de l'imagerie est fortement recommandé. Tu n'as pas indiqué ton volume actuel — on part de l'estimation 60 km/sem (basée sur ton niveau Confirmé et fréquence 5sé/sem). Si tu cours réellement moins, régénère ton plan en saisissant ton volume pour des recommandations adaptées et éviter une surcharge. Concentre-toi sur la régularité et écoute ton corps : à la moindre douleur osseuse, arrête-toi.";

const NEW_WARNING = "Fais valider la reprise avec ton kiné/médecin avant de démarrer ce plan. Adapte les séances si nécessaire.\n\n🚨 PRIORITÉ ABSOLUE : tant que l'imagerie n'a pas exclu une fracture de stress ou une autre pathologie osseuse de la hanche, considère TOUTES les séances trail S1 comme à risque. Réduis fortement le volume hebdomadaire, limite le D+ à <200m par séance et n'enchaîne pas plusieurs séances longues d'affilée. Si la douleur persiste ou s'aggrave : arrête immédiatement et consulte.\n\n⚠️ DURÉE DU PLAN : 26 semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en 22 semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.";

console.log(`APRÈS status: "${NEW_STATUS}"`);
console.log(`APRÈS message length: ${NEW_MESSAGE.length} chars`);
console.log(`APRÈS warning length: ${NEW_WARNING.length} chars`);

// === PATCH (3 champs en une seule requête) ===
const patchRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}` +
  `?updateMask.fieldPaths=feasibility.status&updateMask.fieldPaths=feasibility.message&updateMask.fieldPaths=feasibility.safetyWarning`,
  {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        feasibility: {
          mapValue: {
            fields: {
              status: { stringValue: NEW_STATUS },
              message: { stringValue: NEW_MESSAGE },
              safetyWarning: { stringValue: NEW_WARNING },
            }
          }
        }
      }
    }),
  }
);
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur PATCH:', patched.error); process.exit(1); }

// Vérification
const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j2 = await r2.json();
const fAfter = j2.fields.feasibility.mapValue.fields;
console.log(`\n--- Vérif post-patch ---`);
console.log(`Status  : ${fAfter.status.stringValue}`);
console.log(`Message contient "fracture de stress" : ${fAfter.message.stringValue.includes('fracture de stress')}`);
console.log(`Message contient "RED-S" : ${fAfter.message.stringValue.includes('RED-S')}`);
console.log(`Message contient "estimation 60 km/sem" : ${fAfter.message.stringValue.includes('estimation 60 km/sem')}`);
console.log(`Warning contient "PRIORITÉ ABSOLUE" : ${fAfter.safetyWarning.stringValue.includes('PRIORITÉ ABSOLUE')}`);
console.log(`Warning contient "imagerie" : ${fAfter.safetyWarning.stringValue.includes('imagerie')}`);
// Vérifier qu'on n'a PAS suggéré du vélo
console.log(`Warning ne contient PAS "vélo" : ${!fAfter.safetyWarning.stringValue.toLowerCase().includes('vélo')}`);
console.log(`Warning ne contient PAS "natation" : ${!fAfter.safetyWarning.stringValue.toLowerCase().includes('natation')}`);
console.log(`\n✅ Plan F corrigé : RISQUÉ + warnings musclés sans cross-training.`);
