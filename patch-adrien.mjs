import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778702412108';

// Récupérer plan complet pour avoir le welcome actuel + structure
const r0 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const plan = await r0.json();
const f = plan.fields;
const currentWelcome = f.welcomeMessage?.stringValue || '';
const currentScore = f.confidenceScore?.integerValue;
const peri = f.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields || {};
const currentPeak = peri.peakVolumeKm?.integerValue ?? peri.peakVolumeKm?.doubleValue;
const currentWV = (peri.weeklyVolumes?.arrayValue?.values || []).map(v => +v.integerValue || +v.doubleValue);
console.log(`État avant patch :
  score = ${currentScore}
  status = ${f.feasibility?.mapValue?.fields?.status?.stringValue}
  peakVolumeKm = ${currentPeak}
  weeklyVolumes = ${JSON.stringify(currentWV)}`);

// Nouvelle alerte tendinopathie Achille (validée par coach)
const ALERT = `⚠️ **Tendinopathie Achille gauche ACTIVE — risque majeur sur trail 63 km**

La tendinopathie Achille est très sensible aux montées (mise en tension extrême) et aux descentes répétées (chocs excentriques). Démarrer un trail 63 km en phase active expose à une rupture tendineuse partielle ou totale = arrêt course 3-6 mois minimum.

**Avant tout démarrage du plan (non négociable)** :
1. **Consultation kiné du sport** + échographie pour stadifier la tendinopathie (réactive / dysréparative / dégénérative).
2. **Protocole Stanish (excentriques mollets)** : 3×15 répétitions, 2×/jour, 7 j/7, pendant minimum 12 semaines. Sur step : monter sur 2 jambes, descendre lentement (3 s) sur la jambe atteinte. Variantes : genou tendu (gastrocnémiens) + genou fléchi (soléaire). Douleur tolérée pendant l'exercice = 3-4/10 max, retour à la normale en moins de 24 h.
3. **Échauffement long systématique** : 15 min footing très lent + 10 min mobilité cheville/mollet avant toute séance qualité ou D+.
4. **Règle d'arrêt** : douleur > 3/10 pendant l'effort, ou douleur matinale au lever > 24 h après séance = arrêt 48-72 h + re-consultation kiné.
5. **Pas de fractionné court (VMA) tant que la douleur n'est pas stabilisée < 2/10 au repos.**

Volume hebdomadaire pic réduit de 77 à 60 km/sem pour préserver le tendon. Score abaissé à 38 (RISQUÉ) en cohérence avec la blessure active.

---

`;

const newWelcome = ALERT + currentWelcome;

// Réduire weeklyVolumes de 77→60 = ×0,78
const FACTOR = 60 / 77;
const newWV = currentWV.map(v => Math.round(v * FACTOR));
const newPeak = 60;
console.log(`\nNouveau peakVolumeKm = ${newPeak}`);
console.log(`Nouveau weeklyVolumes = ${JSON.stringify(newWV)}`);

// PATCH via Firestore REST API avec updateMask
// Champs à updater : welcomeMessage, confidenceScore, feasibility (status + confidenceScore),
//                    generationContext.periodizationPlan.peakVolumeKm,
//                    generationContext.periodizationPlan.weeklyVolumes

// On reconstruit le generationContext complet pour patcher
const gcFields = f.generationContext?.mapValue?.fields || {};
const newPeriFields = { ...peri };
newPeriFields.peakVolumeKm = { integerValue: newPeak };
newPeriFields.weeklyVolumes = { arrayValue: { values: newWV.map(v => ({ integerValue: v })) } };

const newGcFields = { ...gcFields, periodizationPlan: { mapValue: { fields: newPeriFields } } };

// feasibility object
const currentFeas = f.feasibility?.mapValue?.fields || {};
const newFeasFields = { ...currentFeas, status: { stringValue: 'RISQUÉ' }, confidenceScore: { integerValue: 38 } };

const patchBody = {
  fields: {
    welcomeMessage: { stringValue: newWelcome },
    confidenceScore: { integerValue: 38 },
    feasibility: { mapValue: { fields: newFeasFields } },
    generationContext: { mapValue: { fields: newGcFields } },
  }
};

const mask = ['welcomeMessage', 'confidenceScore', 'feasibility', 'generationContext'];
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?` +
  mask.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');

const r = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});
const j = await r.json();
if (!r.ok) {
  console.log(`\n❌ ÉCHEC PATCH (HTTP ${r.status})`);
  console.log(JSON.stringify(j, null, 2).substring(0, 2000));
  process.exit(1);
}

console.log(`\n✅ PATCH ADRIEN appliqué.`);
console.log(`  - score: ${currentScore} → 38`);
console.log(`  - status: BON → RISQUÉ`);
console.log(`  - peak: 77 → 60 km/sem`);
console.log(`  - weeklyVolumes adapté`);
console.log(`  - welcome: +${ALERT.length} chars en tête`);

// Vérification
const rv = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const v = await rv.json();
const vScore = v.fields?.confidenceScore?.integerValue;
const vStatus = v.fields?.feasibility?.mapValue?.fields?.status?.stringValue;
const vPeak = v.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.peakVolumeKm?.integerValue;
console.log(`\n🔍 Vérif post-patch:
  score = ${vScore} (attendu 38)
  status = ${vStatus} (attendu RISQUÉ)
  peakVolumeKm = ${vPeak} (attendu 60)
  welcome démarre par: "${(v.fields?.welcomeMessage?.stringValue||'').substring(0,80)}..."`);
