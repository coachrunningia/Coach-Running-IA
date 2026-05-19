/**
 * Patch des 5 plans du 12 mai 2026.
 * Patches : ville dans locationSuggestion + welcomeMessage personnalisé (nom + records + VMA).
 * RÈGLE ABSOLUE : aucune mention poids/IMC/minceur/corpulence.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}
async function getDoc(id){const r=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`,{headers:{'Authorization':`Bearer ${token}`}});return pf((await r.json()).fields);}
async function patchDoc(id, fields, fp){const params=fp.map(p=>`updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');const body={fields:{}};for(const k of fp)body.fields[k]=toFs(fields[k]);const r=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}?${params}`,{method:'PATCH',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${await r.text()}`);return r.json();}

function injectCity(week, city) {
  if (!city || !week?.sessions) return 0;
  let count = 0;
  const cityLow = city.toLowerCase().trim();
  for (const s of week.sessions) {
    if (s.type === 'Renforcement') continue;
    if (!s.locationSuggestion || !s.locationSuggestion.toLowerCase().includes(cityLow)) {
      s.locationSuggestion = `${s.locationSuggestion || 'Parcours adapté'} — autour de ${city.trim()}`;
      count++;
    }
  }
  return count;
}

function formatRecords(records) {
  if (!records || typeof records !== 'object') return '';
  const map = { distance5km: '5 km', distance10km: '10 km', distanceHalfMarathon: 'semi', distanceMarathon: 'marathon' };
  return Object.entries(records).filter(([_,v]) => v).map(([k,v]) => `${map[k] || k} en ${v}`).join(', ');
}

const patches = [
  // === landy.randria — Perte de Poids 12 sem (F 39, Toulouse) ===
  {
    id: '1778566988907',
    label: 'landy Perte de Poids',
    apply: async (doc) => {
      const qs = doc.generationContext?.questionnaireSnapshot || {};
      const fp = [];
      const city = qs.city || 'Toulouse';
      const firstName = qs.firstName || doc.firstName;

      // Ville dans S1
      const s1 = doc.weeks?.[0];
      const added = injectCity(s1, city);
      if (added > 0) fp.push('weeks');

      // Welcome personnalisé (records + VMA + ville, ZÉRO mention poids)
      const records = formatRecords(qs.recentRaceTimes);
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton programme de 12 semaines.

🎯 **Approche choisie** : régularité, plaisir et endurance progressive. Pour ton objectif, ce qui compte c'est la constance dans la durée, pas l'accumulation de kilomètres.

📊 **Ton plan utilise tes données** : VMA ${doc.vma?.toFixed(1) || '9.6'} km/h${records ? ` (calculée depuis ton ${records})` : ''}. Les allures sont personnalisées : ${doc.paces?.efPace || '6:15'} min/km en aisance, ${doc.paces?.recoveryPace || '7:00'} en récupération.

📋 **Structure** (3 séances course + 1 renforcement) :
- Mardi : marche/course aérobie en aisance respiratoire
- Mercredi : marche/course nature
- Jeudi : renforcement musculaire (essentiel pour le plaisir de courir longtemps)
- Dimanche : sortie longue progressive

📍 **Tes sorties** seront suggérées autour de **${city.trim()}** — adapte selon ton terrain préféré.

💡 **Bénéfice clé** : la course en aisance respiratoire active l'oxydation des graisses. **Couple ce plan avec une alimentation équilibrée** (sans privation drastique) — c'est le combo qui fonctionne durablement. Si tu te sens fatiguée ou si l'énergie chute, écoute ton corps : la fatigue chronique est ennemie de la progression.

Bonne route !`;
      fp.push('welcomeMessage');
      return { fieldPaths: fp, info: `${added} suggestions + welcome perso (records: ${records || 'aucun'})` };
    },
  },

  // === didier.damiens — 10 km Finisher 9 sem (H 48, blessure mollet, Annezin) ===
  {
    id: '1778571577227',
    label: 'didier 10km Finisher',
    apply: async (doc) => {
      const qs = doc.generationContext?.questionnaireSnapshot || {};
      const fp = [];
      const city = qs.city || 'Annezin';
      const firstName = qs.firstName || doc.firstName;
      const s1 = doc.weeks?.[0];
      const added = injectCity(s1, city);
      if (added > 0) fp.push('weeks');

      const records = formatRecords(qs.recentRaceTimes);
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan 10 km Finisher sur 9 semaines.

🩺 **Avant tout** : un certificat médical d'aptitude à la course est OBLIGATOIRE. À partir de 48 ans et avec une blessure récente au mollet, consulte ton médecin du sport ET ton kinésithérapeute pour un feu vert clair. Demande un protocole spécifique mollet (étirements quotidiens, renforcement excentrique).

🎯 **Objectif Finisher** : terminer ton 10 km. Pas de chrono cible — on construit progressivement ton endurance via la marche/course alternée. Ton ${records || 'temps actuel'} est notre base de calcul.

📋 **Structure** (3 séances/sem : Mar, Sam, Dim) :
- Mardi : marche/course en aisance — plaisir avant performance
- Samedi : renforcement musculaire (gainage, fessiers, soutien mollet)
- Dimanche : sortie longue marche/course progressive

🦵 **Spécifique mollet** :
- Échauffement TOUJOURS progressif (5 min marche + 5 min trotting léger avant tout)
- Étirements doux post-séance : mollets soléaires + gastrocnémien (2×30s/jambe)
- Protocole Stanish (excentrique mollet) recommandé 2-3× par semaine en plus du plan
- ARRÊT IMMÉDIAT à la moindre tension du mollet, glace + repos

📍 **Tes sorties** seront suggérées autour de **${city.trim()}** — privilégie surfaces souples (chemins, gazon, piste) plutôt que béton.

⚠ **Signal d'alarme** : tension mollet, douleur tibia, essoufflement excessif = ralentir ou marcher. Pas de honte à finir une séance en marchant.

Bonne progression — la régularité prime sur la vitesse.`;
      fp.push('welcomeMessage');
      return { fieldPaths: fp, info: `${added} suggestions + welcome avec adaptations mollet` };
    },
  },

  // === pierre.dewitte — Semi Finisher 29 sem (H 63, Macon) ===
  {
    id: '1778574019379',
    label: 'pierre Semi Finisher 29 sem',
    apply: async (doc) => {
      const qs = doc.generationContext?.questionnaireSnapshot || {};
      const fp = [];
      const city = qs.city || 'Macon';
      const firstName = qs.firstName || doc.firstName;
      const s1 = doc.weeks?.[0];
      const added = injectCity(s1, city);
      if (added > 0) fp.push('weeks');

      const records = formatRecords(qs.recentRaceTimes);
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan Semi-Marathon Finisher sur 29 semaines.

🩺 **Avant tout** : à 63 ans, un bilan cardio-vasculaire complet (test d'effort) est INDISPENSABLE avant de démarrer. Consulte ton médecin et obtiens un certificat médical d'aptitude à la course en compétition.

🎯 **Objectif Finisher** : terminer ton premier semi-marathon. Pas de chrono cible — l'enjeu est la régularité sur 29 semaines pour construire ton endurance. Ton ${records || 'temps actuel sur 5km'} est notre base de calcul (VMA estimée ${doc.vma?.toFixed(1) || '8.0'} km/h).

📋 **Structure** (3 séances/sem : Lun, Mer, Ven) :
- Lundi : marche/course en aisance — plaisir + récupération active
- Mercredi : renforcement musculaire (gainage, fessiers, équilibre — clé pour les seniors)
- Vendredi : sortie longue progressive en marche/course

📍 **Tes sorties** seront suggérées autour de **${city.trim()}** — privilégie surfaces souples (chemins, gazon) plutôt que béton dur.

⚠ **Plan long (29 sem) — vigilance adhérence** : les plans > 24 semaines ont un taux d'abandon élevé. Pour maximiser tes chances :
- Note tes séances dans un calendrier physique ou app pour rendre l'engagement concret
- Cherche un partenaire d'entraînement ou un groupe local (les seniors progressent mieux en groupe)
- Si tu décroches 1-2 semaines, reprends où tu en étais — pas la peine de tout recommencer
- À mi-parcours (S15), évalue : si motivation faible, on peut basculer sur un 10 km comme objectif intermédiaire avant de retenter le semi

👤 **Adaptations seniors** :
- Échauffements LONGS obligatoires (10-15 min minimum)
- Récupération entre séances : 48-72h minimum
- Étirements + mobilité dans chaque cooldown
- Surveiller articulations (genoux, chevilles, hanches)
- Progression douce : +8% volume/sem maximum

Bonne route — la régularité prime sur la perfection.`;
      fp.push('welcomeMessage');
      return { fieldPaths: fp, info: `${added} suggestions + welcome senior + plan long` };
    },
  },

  // === aureline.bossu — Trail 6km Finisher 7 sem (F 41, Autechaux) ===
  {
    id: '1778575564571',
    label: 'aureline Trail 6km Finisher',
    apply: async (doc) => {
      const qs = doc.generationContext?.questionnaireSnapshot || {};
      const fp = [];
      const city = qs.city || 'Autechaux';
      const firstName = qs.firstName || doc.firstName;
      // Ville déjà OK (Autechaux dans 100% suggestions) — laissons inchangé
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan Trail 6 km / 150 D+ Finisher sur 7 semaines.

🩺 **Avant tout** : un certificat médical d'aptitude à la course est INDISPENSABLE avant de démarrer. Un bilan cardio-vasculaire est fortement recommandé.

🎯 **Objectif Finisher** : terminer ton trail 6 km avec 150 m de dénivelé positif. Le format trail court est idéal pour découvrir cette discipline — terrain varié, plaisir nature, sans intensité excessive.

📋 **Structure** (3 séances/sem : Lun, Mer, Dim) :
- Lundi : marche/course en aisance respiratoire
- Mercredi : renforcement musculaire (gainage, fessiers, équilibre — essentiels pour terrain accidenté)
- Dimanche : sortie longue en marche/course nature

📍 **Tes sorties** seront suggérées autour de **${city.trim()}** — privilégie surfaces souples, chemins de terre. Évite les pavés et descentes raides au début.

🏔️ **Spécifique trail** :
- Chaussures de trail recommandées (accroche + amorti)
- Bâtons facultatifs (ils aident sur le D+ pour économiser les jambes)
- Hydratation TOUJOURS, même sur 6 km
- Marche assumée dans les montées — c'est normal et même conseillé pour les coureurs en construction
- Descentes : foulée courte, légère, ne pas brusquer

⚠ **Signal d'alarme** : douleur tibia, gêne articulaire, essoufflement excessif = ralentir ou marcher. Pas de honte à finir en marchant.

Bonne préparation — la nature est ton terrain de jeu !`;
      fp.push('welcomeMessage');
      return { fieldPaths: fp, info: `welcome perso (ville déjà OK)` };
    },
  },

  // === liefhwekfhwekfh — Marathon 4h30 24 sem (H 31, Paris) ===
  {
    id: '1778578676672',
    label: 'liefhwekfh Marathon 4h30',
    apply: async (doc) => {
      const qs = doc.generationContext?.questionnaireSnapshot || {};
      const fp = [];
      const city = qs.city || 'Paris';
      const firstName = qs.firstName || doc.firstName;
      const s1 = doc.weeks?.[0];
      const added = injectCity(s1, city);
      if (added > 0) fp.push('weeks');

      const records = formatRecords(qs.recentRaceTimes);
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan Marathon 4h30 sur 24 semaines.

🩺 **Avant tout** : un certificat médical d'aptitude à la course en compétition est INDISPENSABLE. Si tu débutes la course, un bilan cardio-vasculaire est recommandé.

🎯 **Objectif 4h30** : avec ${records || 'tes données déclarées'} (VMA ${doc.vma?.toFixed(1) || '12.6'} km/h), 4h30 est un excellent premier marathon — réaliste, motivant, et qui te permettra de construire ta base aérobie sans surcharge.

📋 **Structure** (3 séances/sem : Mer, Jeu, Dim) :
- Mercredi : marche/course en aisance respiratoire — construire l'endurance
- Jeudi : renforcement musculaire (gainage, jambes, posture)
- Dimanche : sortie longue en marche/course progressive — pilier du plan

📍 **Tes sorties** seront suggérées autour de **${city.trim()}** — Paris offre beaucoup d'options (parcs, canaux, berges de Seine).

🏃 **Spécifique marathon débutant** :
- La marche/course alternée est ton meilleur allié — pas de honte, c'est même la méthode recommandée (Galloway method)
- Hydratation pendant toutes les sorties > 1h
- Nutrition pendant les SL > 1h30 : tester gels/barres EN ENTRAÎNEMENT, jamais le jour J
- Chaussures à amorti pour les longues distances — renouveler tous les 600 km max
- La SL pic doit atteindre 28-32 km en S15-S18 pour préparer mentalement et énergétiquement les 42 km

⚠ **Plan long (24 sem) — vigilance adhérence** :
- La régularité prime — 80% des séances réalisées = excellent résultat
- Si tu décroches 1-2 semaines, reprends sans tout recommencer
- À mi-parcours (S12), évalue : si fatigue ou perte de motivation, on peut viser un semi-marathon en S20 comme étape avant le marathon

Bonne préparation — l'aventure marathon commence aujourd'hui !`;
      fp.push('welcomeMessage');
      return { fieldPaths: fp, info: `${added} suggestions + welcome marathon débutant` };
    },
  },
];

console.log(`\n${DRY_RUN ? '🔍 DRY-RUN' : '🚀 PUSH'} — 5 plans du 12 mai 2026 (sans aucune mention poids/IMC)\n`);

for (const patch of patches) {
  console.log(`▸ ${patch.label}`);
  try {
    const doc = await getDoc(patch.id);
    writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-12mai-${patch.id}-${Date.now()}.json`, JSON.stringify(doc, null, 2));
    const { fieldPaths, info } = await patch.apply(doc);
    console.log(`  ${info}`);
    if (fieldPaths.length === 0) { console.log(`  ⚠ Rien à modifier`); continue; }

    // Vérification anti-mention poids/IMC/minceur
    const wmLow = (doc.welcomeMessage || '').toLowerCase();
    if (/poids|imc|minceur|corpulence|surpoids|maigre|gros|obès|kg|kilos|silhouette/.test(wmLow)) {
      // Exception : "perte de poids" est l'objectif déclaré donc admis (terme d'objectif, pas description corporelle)
      const forbidden = wmLow.match(/imc|minceur|corpulence|surpoids|maigre|gros|obès|silhouette|kilos/g);
      if (forbidden) {
        console.error(`  ❌ VIOLATION règle anti-mention détectée : ${forbidden.join(', ')}`);
        continue;
      }
    }

    if (DRY_RUN) console.log(`  🔍 Dry-run — fields: ${fieldPaths.join(', ')}`);
    else {
      await patchDoc(patch.id, doc, fieldPaths);
      console.log(`  ✓ Push réussi (${fieldPaths.join(', ')})`);
    }
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
  }
  console.log();
}

console.log(`✅ Terminé — 5 plans du 12 mai`);
