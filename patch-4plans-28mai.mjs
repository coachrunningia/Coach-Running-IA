#!/usr/bin/env node
/**
 * patch-4plans-28mai.mjs
 *
 * Patches live 4 plans suite audit cross-experts 28/05/2026 :
 * - 1779900993196 thibaud : weeklyVolumes S5-S7 lisser progression
 * - 1779945135380 coralie : S1 SL réduite + alternance marche/course + welcome
 * - 1779949737926 yvan : S1 Vendredi réduit + paces Seuil < Marathon
 * - 1779974805135 lucile : welcome SANS "poids/motivation" + safety nommer genou/Osgood URGENT
 *
 * Doctrines : feedback_jamais_poids_minceur (lucile critique), D17 transparence,
 * feedback_input_client_obligatoire (cv/raceDate intacts).
 *
 * Usage : DRY puis EXEC live :
 *   node patch-4plans-28mai.mjs            (dry run)
 *   DRY_RUN=false node patch-4plans-28mai.mjs (exec)
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-2plans-28mai/backups-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const token = () => execSync('gcloud auth print-access-token').toString().trim();

function fetchDoc(planId) {
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
  return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
}

function patchDoc(planId, fields, mask) {
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-${planId}-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) throw new Error(res.error.message);
  return res;
}

// ════════════════════════════════════════════════════════════════
// WORDINGS NOUVEAUX (validés audit cross-experts)
// ════════════════════════════════════════════════════════════════

// ─── Plan #4 LUCILE — URGENT (violation jamais_poids_minceur) ───
const LUCILE_WELCOME = `Bienvenue Lucile,

Ton plan a été conçu pour démarrer en douceur, dans le respect strict de tes antécédents médicaux : Osgood-Schlatter, Sever, hyperlaxité ligamentaire et douleur actuelle au genou.

⚠️ Avant toute séance, fais valider la reprise par ton kiné ou médecin du sport. C'est non négociable pour un retour sûr à l'activité physique.

Ce plan utilise un format marche/course alternée (1 min course + 2 min marche) qui limite l'impact articulaire et permet à ton genou de bien tolérer chaque séance. Si une douleur apparaît ou persiste après 24h, arrête et consulte.

Le renforcement musculaire du mercredi est ESSENTIEL : il protège ton genou en stabilisant les quadriceps et les ischio-jambiers. Ne le saute jamais.

Les 3 règles d'or — j'arrête et je consulte si :
1. Douleur au genou qui persiste plus de 24h après une séance
2. Sensation d'instabilité ou de "lâchage" du genou
3. Gonflement ou raideur articulaire au réveil

Le plan reste un guide adaptable. Romane et l'équipe sont là si tu veux ajuster.`;

const LUCILE_SAFETY = `Antécédents Osgood-Schlatter + Sever + hyperlaxité + douleur actuelle au genou : ton avis kiné/médecin du sport est OBLIGATOIRE avant la première séance.

Le format marche/course (1 min course / 2 min marche) limite l'impact articulaire. Si tu sens la moindre douleur au genou pendant ou après une séance, arrête et consulte.

À surveiller spécifiquement :
- Douleur sous la rotule (Osgood) après séances avec dénivelé descendant
- Douleur talon arrière (Sever) si chaussures usées
- Sensation d'instabilité genou (hyperlaxité) en virage ou descente

Les chaussures avec bon amorti + surfaces souples (herbe, terre) sont prioritaires sur le bitume.`;

// ─── Plan #2 CORALIE — S1 réduite + alternance marche/course optionnelle ───
const CORALIE_WELCOME = `Bienvenue Coralie,

Bienvenue dans ta préparation semi-marathon. Petit message d'honnêteté avant qu'on démarre.

Ton volume actuel (14 km/semaine) correspond à un démarrage prudent. C'est pourquoi le plan est calibré progressif, sans précipitation, sur 20 semaines.

⚠️ Sur les premières semaines, si l'allure t'oblige à forcer ta foulée, n'hésite pas à alterner marche rapide et course (par exemple 3 min de course + 1 min de marche). C'est la méthode validée pour absorber progressivement les chocs sans casser tes articulations.

La Sortie Longue du samedi est la pièce centrale du plan : elle construit ton endurance. Pas besoin de pousser, l'allure doit rester conversationnelle.

Le renforcement du jeudi est ESSENTIEL : il prévient les blessures de genoux et de hanches.

Avant la première séance : avis médical recommandé pour une reprise en sécurité.

Les 3 règles d'or — j'arrête et je consulte si :
1. Douleur articulaire (genou, cheville) qui persiste 48h
2. Fatigue qui dure plus de 72h
3. Essoufflement inhabituel ou palpitations

Romane et l'équipe sont là pour ajuster si besoin.`;

const CORALIE_S1_SL_MAINSET = `Sortie longue d'environ 65 min à allure très facile (9:27 min/km). Tu dois pouvoir tenir une conversation tout du long. Si l'allure te semble trop lente pour ta foulée naturelle, alterne 3 min de course + 1 min de marche rapide — c'est même conseillé sur les premières semaines.`;

// ─── Plan #3 YVAN — S1 Vendredi réduit + paces Seuil < Marathon ───
const YVAN_S1_VEN_MAINSET = `Footing en endurance fondamentale à 6:30 min/km, environ 1h15 pour ~10 km, sur terrain plat. Termine par 4 lignes droites souples (60-80 m chacune, accélération progressive, marche entre) pour activer le système nerveux sans fatigue. Reste en aisance respiratoire complète.`;

const YVAN_SAFETY = `À 57 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour un Marathon.

Privilégie la récupération 48-72h entre séances intenses, hydrate-toi bien et écoute ton corps.

Sur tes premières semaines : attention à l'enchaînement Jeudi-Vendredi-Dimanche (sortie + sortie longue + SL). Si tu sens une tendinite naissante ou une raideur articulaire, intercale une journée de repos supplémentaire. Mieux vaut une semaine moins chargée qu'une semaine off-blessure.

À 57 ans, la récupération est la qualité limitante. Sommeil 7-8h, étirements quotidiens, alimentation riche en protéines (1.4 g/kg/j).`;

// ─── Plan #1 THIBAUD — weeklyVolumes lisser S5-S7 ───
// Original : [60,66,73,58,67,77,89,72,83,86,90,72,83,86,90,72,83,86,90,72,83,60,53,45]
// Nouveau  : [60,66,73,58,64,70,77,72,83,86,90,72,83,86,90,72,83,86,90,72,83,60,53,45]
// S5 67→64 (+10% post-récup 58 au lieu de +15.5%)
// S6 77→70 (+9.4% au lieu de +14.9%)
// S7 89→77 (+10% au lieu de +15.6%)
const THIBAUD_NEW_VOLUMES = [60, 66, 73, 58, 64, 70, 77, 72, 83, 86, 90, 72, 83, 86, 90, 72, 83, 86, 90, 72, 83, 60, 53, 45];

const THIBAUD_SAFETY = `Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.

Sur le bloc fondamental (S5-S7) : la progression de volume est maintenant lissée à +10%/semaine maximum (norme FFA). C'est une protection anti-blessure, surtout important sur les semaines de montée en charge.

Tu as un PB Marathon récent (3h08) qui prouve ton potentiel. Garde l'humilité de respecter la progression : c'est ce qui te fera passer la ligne en pleine forme.`;

// ════════════════════════════════════════════════════════════════
// EXEC
// ════════════════════════════════════════════════════════════════

console.log(`>>> Patch 4 plans 28/05 — DRY_RUN=${DRY_RUN}`);

const PATCHES = [
  {
    id: '1779974805135',
    name: 'LUCILE (URGENT violation doctrine poids)',
    email: 'terry.lucile@gmail.com',
    apply: (f) => {
      f.welcomeMessage = { stringValue: LUCILE_WELCOME };
      const feas = f.feasibility?.mapValue?.fields || {};
      feas.safetyWarning = { stringValue: LUCILE_SAFETY };
      f.feasibility = { mapValue: { fields: feas } };
      return ['welcomeMessage', 'feasibility'];
    },
  },
  {
    id: '1779900993196',
    name: 'THIBAUD (lisser progression S5-S7)',
    email: 'thibaud.mathys@gmail.com',
    apply: (f) => {
      const feas = f.feasibility?.mapValue?.fields || {};
      feas.safetyWarning = { stringValue: THIBAUD_SAFETY };
      f.feasibility = { mapValue: { fields: feas } };
      // weeklyVolumes
      const gc = f.generationContext?.mapValue?.fields;
      if (gc?.periodizationPlan?.mapValue?.fields?.weeklyVolumes) {
        gc.periodizationPlan.mapValue.fields.weeklyVolumes = {
          arrayValue: { values: THIBAUD_NEW_VOLUMES.map(v => ({ integerValue: v })) }
        };
      }
      return ['feasibility', 'generationContext'];
    },
  },
  {
    id: '1779945135380',
    name: 'CORALIE (S1 SL réduite + welcome transparence)',
    email: 'coralievandevelde@yahoo.fr',
    apply: (f) => {
      f.welcomeMessage = { stringValue: CORALIE_WELCOME };
      // S1 Samedi SL
      const weeks = f.weeks?.arrayValue?.values || [];
      if (weeks.length > 0) {
        for (const s of weeks[0].mapValue.fields.sessions.arrayValue.values) {
          const sf = s.mapValue.fields;
          if (sf.day?.stringValue === 'Samedi' && sf.type?.stringValue === 'Sortie Longue') {
            sf.duration = { stringValue: '65 min' };
            sf.distance = { stringValue: '6.5 km' };
            sf.mainSet = { stringValue: CORALIE_S1_SL_MAINSET };
            break;
          }
        }
      }
      return ['welcomeMessage', 'weeks'];
    },
  },
  {
    id: '1779949737926',
    name: 'YVAN (S1 Ven réduit + paces Seuil < Marathon + safety)',
    email: 'yvanperez42@gmail.com',
    apply: (f) => {
      const feas = f.feasibility?.mapValue?.fields || {};
      feas.safetyWarning = { stringValue: YVAN_SAFETY };
      f.feasibility = { mapValue: { fields: feas } };
      // Paces : Seuil 5:15 → 5:00 (cohérent VMA 13.79 × 87%)
      const gc = f.generationContext?.mapValue?.fields;
      const paces = gc?.paces?.mapValue?.fields;
      if (paces?.seuilPace) paces.seuilPace = { stringValue: '5:00' };
      // S1 Vendredi : 1h34/12km → 1h15/10km
      const weeks = f.weeks?.arrayValue?.values || [];
      if (weeks.length > 0) {
        for (const s of weeks[0].mapValue.fields.sessions.arrayValue.values) {
          const sf = s.mapValue.fields;
          if (sf.day?.stringValue === 'Vendredi' && sf.type?.stringValue === 'Jogging') {
            sf.duration = { stringValue: '1h 15 min' };
            sf.distance = { stringValue: '10 km' };
            sf.mainSet = { stringValue: YVAN_S1_VEN_MAINSET };
            break;
          }
        }
      }
      return ['feasibility', 'generationContext', 'weeks'];
    },
  },
];

for (const patch of PATCHES) {
  console.log(`\n━━━━ ${patch.name} (${patch.id}) ━━━━`);
  try {
    const doc = fetchDoc(patch.id);
    writeFileSync(`${BACKUP_DIR}/${patch.id}-before.json`, JSON.stringify(doc, null, 2));
    if (doc.fields?.userEmail?.stringValue !== patch.email) {
      console.error(`  ❌ Email mismatch (${doc.fields?.userEmail?.stringValue}), skip`);
      continue;
    }
    const f = doc.fields;
    const mask = patch.apply(f);
    console.log(`  Fields patchés : ${mask.join(', ')}`);
    if (DRY_RUN) {
      writeFileSync(`${BACKUP_DIR}/${patch.id}-proposed.json`, JSON.stringify({ fields: f }, null, 2));
      console.log(`  DRY RUN — proposed dump : ${BACKUP_DIR}/${patch.id}-proposed.json`);
    } else {
      const res = patchDoc(patch.id, f, mask);
      console.log(`  ✅ PATCH OK -> updateTime: ${res.updateTime}`);
    }
  } catch (e) {
    console.error(`  ❌ Erreur ${patch.id}: ${e.message}`);
  }
}

console.log(`\n━━━━ FIN ━━━━`);
console.log(`Backups : ${BACKUP_DIR}`);
if (DRY_RUN) console.log(`Pour exec : DRY_RUN=false node patch-4plans-28mai.mjs`);
