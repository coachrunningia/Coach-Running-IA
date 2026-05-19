import { execSync } from 'child_process';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const PATCHES = [
  {
    name: 'Pierre Dewitte',
    id: '1778574019379',
    newScore: 40,
    newStatus: 'RISQUÉ',
    alert: `⚠️ **Combinaison de facteurs de prudence à 63 ans**

Tu démarres à 8 km/sem en niveau débutant avec un objectif semi-marathon. Sur 29 semaines on a la durée nécessaire mais ton corps doit s'adapter très progressivement.

**Avant démarrage : certificat médical avec test d'effort cardio-vasculaire obligatoire** (non négociable à ton âge). Stratégie réaliste = finir en alternance marche-course (par ex. 4 min course / 1 min marche) sur tout le parcours. Au moindre signal (douleur tendineuse, mollet, tibia, gêne thoracique) : on suspend et on consulte. La régularité prime sur l'intensité.

---

`,
  },
  {
    name: 'Agathe',
    id: '1778446762158',
    newScore: 55,
    newStatus: 'AMBITIEUX',
    alert: `⚠️ **Genou gauche déclaré + Hyrox = course uniquement**

Ton genou impose une priorité absolue à la prévention : surfaces souples (gazon, chemin de terre), chaussures à amorti renforcé, et travail proprioception en renfo (équilibre unipodal 2×30 s/jambe, gainage hanche, pont fessier).

**Important : ce plan couvre la partie course à pied uniquement**, pas les stations Hyrox (sled, wall balls, burpees) — celles-ci se travaillent en parallèle avec un coach Hyrox dédié.

**Si la douleur du genou réapparaît : arrêt immédiat (seuil 3/10) et consultation kiné avant reprise**. La progression volontairement lente sur 30 semaines te protège.

---

`,
  },
  {
    name: 'Soumaya',
    id: '1778430589776',
    newScore: 55,
    newStatus: 'AMBITIEUX',
    alert: `⚠️ **Objectif 1h05 très ambitieux pour ton profil actuel**

Un Hyrox finisher amateur c'est typiquement 1h20-1h30 pour débutant(e)s. Avec ton point de départ (10 km/sem, niveau débutante), 1h05 est plutôt un objectif **2e Hyrox** après une première expérience pour caler la stratégie.

**Recommandation : vise d'abord "finir Hyrox" autour de 1h20-1h25**. 1h05 se construira sur 6-12 mois en montant à 4 séances/sem. Les allures du plan restent calibrées sur ta VMA actuelle (11,3 km/h), pas sur la cible 1h05.

---

`,
  },
  {
    name: 'Hippolyte',
    id: '1778852278323',
    newScore: 35,
    newStatus: 'RISQUÉ',
    // pas d'alerte ajoutée — déjà présente
    alert: null,
  },
  {
    name: 'Karine',
    id: '1778695294712',
    newScore: 30,  // inchangé
    newStatus: 'RISQUÉ',  // inchangé
    alert: `⚠️ **Ultra 105 km / 4200 m D+ — préparation spécifique D+ essentielle**

Cette distance impose une vraie habitude du dénivelé et de l'ultra-endurance.

1. **D+ progressif** : 1-2 sorties vallonnées/sem dès maintenant, monter le D+ hebdo régulièrement.
2. **Back-to-back en phase spécifique (S15-S20)** : Samedi 25-30 km / Dimanche 35-45 km, D+ cumulé important (>1500 m sur le weekend).
3. **Technique de descente** : foulée courte, cadence élevée, regard 5 m devant, renforcement excentrique quadriceps (squat lent, step-down).
4. **Stratégie marche sur montées raides** systématique dès le départ (pente > 8-10 %).
5. **Profite des sorties longues pour tester ton ravitaillement habituel** et tes équipements (chaussures, sac, frontale si nuit possible).

---

`,
  },
  {
    name: 'Lukas',
    id: '1778771945613',
    newScore: 60,
    newStatus: 'AMBITIEUX',
    alert: `⚠️ **Gain chrono ambitieux sur fenêtre courte**

Passer de 45 min à 40 min sur 10 km en 7 semaines (-11 %) est ambitieux. La VMA permet d'y prétendre mais 7 sem c'est court pour caler les adaptations physiologiques.

**Recommandation** : sois rigoureux sur chaque séance qualité (VMA, seuil), priorise la récup, et accepte que 41-42 min reste un excellent résultat si 40 min ne tombe pas exactement. Vigilance blessures liées à l'accélération (tendinite tibial, périostite, fascia plantaire).

---

`,
  },
  {
    name: 'Bruno',
    id: '1778673418021',
    newScore: 55,
    newStatus: 'AMBITIEUX',
    alert: `⚠️ **Niveau auto-déclaré supérieur à tes chronos actuels**

Tu t'es déclaré "Expert" mais tes chronos (5 km 23:11, 10 km 49 min) correspondent à un niveau Intermédiaire confirmé. **Conséquence : viser 5 km en 20 min en 18 semaines reste ambitieux** (gain ~3 min, soit -14 %). Faisable avec rigueur, mais 21:30-22:00 est une cible plus alignée avec ton profil réel.

À 43 ans, les délais de récupération entre séances qualité sont plus longs qu'à 25 ans — respecte 48 h entre 2 séances intenses, et privilégie une vraie séance facile (en endurance fondamentale stricte) entre. Un objectif mal calibré pousse à forcer = risque de blessure (tendinite Achille, périostite).

Les allures du plan restent calibrées sur ta VMA actuelle (13,6 km/h), pas sur la cible 20 min.

---

`,
  },
  {
    name: 'Sylvie',
    id: '1778496831328',
    newScore: 73,  // inchangé
    newStatus: 'BON',  // inchangé
    alert: `⚠️ **Dénivelé 900 m à apprivoiser progressivement**

Tu démarres sans habitude du D+ (volume D+ hebdo nul actuellement) pour une course à 900 m de dénivelé. Sur 8 semaines, la progression doit être soigneuse :

1. Intégrer dès la S2 des séances avec côtes douces.
2. Techniciser les descentes (foulée courte, regard 5 m devant).
3. Renforcement quadriceps + mollets prioritaire (focus excentrique).
4. Marcher les montées les plus raides est OK et même recommandé.

---

`,
  },
  {
    name: 'Christophe npsi',
    id: '1778436722110',
    newScore: 65,  // inchangé
    newStatus: 'AMBITIEUX',  // inchangé
    alert: `⚠️ **Dénivelé course 5× supérieur à ton habitude hebdo**

La course présente 2500 m D+ alors que ton volume D+ hebdomadaire actuel est environ 500 m. Sur 20 semaines, la montée en charge D+ doit être méthodique :

1. Doubler progressivement le D+ hebdo sur les 8 premières semaines.
2. Intégrer 1 sortie vallonnée par semaine dès S2.
3. En phase spécifique (S12-S18), prévoir 2-3 weekends "D+ intense" simulant les conditions de course.
4. Renforcement excentrique quadriceps obligatoire (squat lent 4 s descente, step-down).

---

`,
  },
  {
    name: 'Nanarebelle',
    id: '1778867644661',
    newScore: 80,  // inchangé
    newStatus: 'BON',  // inchangé
    alert: `Pour un démarrage prudent et durable : prends rendez-vous avec ton médecin pour un certificat d'aptitude (recommandé pour toute reprise après pause). Le plan est volontairement progressif en marche-course alternée pour t'éviter blessures et abandons.

---

`,
    // patches additionnels appliqués séparément après (re-niveau + fix main sets)
  },
  {
    name: 'Sacha',
    id: '1778867137508',
    newScore: 75,
    newStatus: 'AMBITIEUX',
    alert: `⚠️ **Objectif 1h25 ambitieux mais cohérent**

Viser 1h25 sur semi (4:02 min/km) à partir d'un 10k 38:13 = ambitieux. La projection théorique est correcte mais c'est ton premier semi à ce rythme : ça exige une régularité parfaite des séances qualité, une gestion millimétrique de l'allure le jour J, et une bonne tenue de la 2e moitié.

**1h27-1h28 reste un excellent résultat si 1h25 ne tombe pas exactement** — c'est encore une grosse progression vs ton niveau actuel. À garder en tête : aucune blessure tolérée → sois rigoureux sur la récup et les allures.

---

`,
    // patches additionnels (re-niveau + fix durée + SL) appliqués séparément après
  },
];

for (const p of PATCHES) {
  // 1. Fetch plan complet
  const r0 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r0.ok) { console.log(`❌ ${p.name} (${p.id}) — HTTP ${r0.status}`); continue; }
  const plan = await r0.json();
  const f = plan.fields;
  const currentWelcome = f.welcomeMessage?.stringValue || '';
  const currentScore = f.confidenceScore?.integerValue;
  const currentStatus = f.feasibility?.mapValue?.fields?.status?.stringValue;
  const newWelcome = p.alert ? p.alert + currentWelcome : currentWelcome;

  const currentFeas = f.feasibility?.mapValue?.fields || {};
  const newFeasFields = { ...currentFeas, status: { stringValue: p.newStatus }, confidenceScore: { integerValue: p.newScore } };

  const patchBody = {
    fields: {
      welcomeMessage: { stringValue: newWelcome },
      confidenceScore: { integerValue: p.newScore },
      feasibility: { mapValue: { fields: newFeasFields } },
    }
  };
  const mask = ['welcomeMessage', 'confidenceScore', 'feasibility'];
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}?` +
    mask.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');

  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patchBody),
  });
  if (!r.ok) {
    const e = await r.json();
    console.log(`❌ ${p.name.padEnd(20)} | HTTP ${r.status} | ${JSON.stringify(e).substring(0,200)}`);
    continue;
  }
  console.log(`✅ ${p.name.padEnd(20)} | score ${currentScore}→${p.newScore} | status ${currentStatus}→${p.newStatus} | alerte ${p.alert ? '+' + p.alert.length + ' chars' : 'inchangé'}`);
}
console.log('\nPatch global terminé.');
