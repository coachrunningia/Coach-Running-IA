#!/usr/bin/env node
/**
 * patch-lucas-coherence-vma-27mai.mjs
 *
 * Lucas plan (1779900008615) — fix incohérence VMA welcome (10.9) vs message (13.4).
 * 40min/10K reste IRRÉALISTE même sur VMA ajustée 13.4 (112% VMA), mais le wording
 * actuel est contradictoire : welcomeMessage cite "153% capacité 10.9" et message
 * cite "112% VMA 13.4". On aligne tout sur VMA ajustée 13.4 (référentiel unique).
 *
 * Patches :
 * - status IRRÉALISTE (inchangé)
 * - score 5 → 15 (toujours bas mais retire caractère absurde)
 * - message conservé (déjà sur 13.4)
 * - recommendation refondu (42-43min réaliste sur VMA 13.4)
 * - welcomeMessage refondu (tout sur 13.4, retire mention 10.9)
 * - safetyWarning enrichi avec 3 règles d'or
 * - allures sessions INCHANGÉES (8:12/km sur VMA brute 10.9) — sécurité prime
 *
 * Doctrines : D17, feedback_securite_avant_conversion, jamais_baisser_allure_cible.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PLAN_ID = '1779900008615';
const EXPECTED_EMAIL = 'lucasducharlet@outlook.fr';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-lucas-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80*1024*1024 }).toString());

const NEW_FEAS_RECO = `Objectif réaliste sur ta VMA ajustée 13.4 : 42-43 min sur 10K. Le 40 min demande 112% VMA, infaisable physiologiquement même avec un bloc de 16 semaines. On garde tes allures cibles dans le plan ; signale-nous si elles te semblent trop dures dès S1-S2.`;

const NEW_SAFETY = `Hydrate-toi avant/pendant/après, échauffe-toi avant chaque séance, accorde-toi un vrai temps de récupération entre les séances dures.

Les 3 règles d'or — j'arrête et je consulte si :
1. Douleur articulaire ou tendineuse qui persiste après 48h de repos.
2. Essoufflement anormal, oppression thoracique ou palpitations à l'effort modéré.
3. Fatigue qui dure plus de 72h après une séance, ou sommeil perturbé plusieurs nuits.

Le plan reste un guide, pas un ordre. Ton corps a toujours raison.`;

const NEW_WELCOME = `Salut Lucas,

Bienvenue. Je dois te parler honnêtement avant qu'on démarre.

Ton objectif 40 min sur 10K demande de tenir 112% de ta VMA ajustée (13.4 km/h) pendant toute la course. C'est physiologiquement infaisable, même avec un bloc de 16 semaines bien construit. Le seuil maximal soutenable sur 10K est environ 95% VMA.

Objectif réaliste avec ta VMA 13.4 : 42-43 min sur 10K. C'est déjà un très beau chrono.

Côté plan : on garde tes allures d'entraînement cibles dans le plan pour démarrer. Si elles te semblent trop dures dès S1-S2, on recalibre ensemble. Si elles te semblent trop faciles, ton VMA réelle est probablement plus haute que 13.4, on ajustera vers le haut.

À 23 ans avec un IMC normal, pas de souci médical particulier au-delà du certificat d'aptitude standard. Mais reste à l'écoute des 3 règles d'or sécurité (cf. encart).

Le plan est marqué IRRÉALISTE sur l'objectif 40 min, pas sur la préparation. La préparation est solide pour viser 42-43 min en pleine forme.

Romane et moi sommes là. Bon vent.`;

console.log(`>>> Lucas fix cohérence VMA — DRY_RUN=${DRY_RUN}`);
const doc = fetchDoc();
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) throw new Error('Email mismatch');

const oldScore = f.feasibility?.mapValue?.fields?.score?.integerValue;
console.log(`feasibility.score avant: ${oldScore}`);

// On conserve le message existant (déjà sur VMA 13.4), on change juste score + recommendation + safetyWarning
const oldMsg = f.feasibility?.mapValue?.fields?.message?.stringValue || '';
f.feasibility = { mapValue: { fields: {
  status: { stringValue: 'IRRÉALISTE' },
  score: { integerValue: 15 },
  message: { stringValue: oldMsg }, // déjà cohérent VMA 13.4
  safetyWarning: { stringValue: NEW_SAFETY },
  recommendation: { stringValue: NEW_FEAS_RECO },
}}};
f.welcomeMessage = { stringValue: NEW_WELCOME };

console.log(`feasibility.score après: 15 (était 5)`);
console.log(`welcomeMessage : refondu sur VMA 13.4 unique`);
console.log(`safetyWarning : enrichi 3 règles d'or`);

const mask = ['feasibility', 'welcomeMessage'];

if (DRY_RUN) {
  writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-proposed.json`, JSON.stringify({ fields: f }, null, 2));
  console.log(`\nDRY RUN OK. Pour exec : DRY_RUN=false node patch-lucas-coherence-vma-27mai.mjs`);
} else {
  const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-lucas-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: f }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) { console.error(res.error.message); process.exit(1); }
  console.log(`\n✅ PATCH OK -> updateTime: ${res.updateTime}`);
  console.log(`🟢 Lucas plan: IRRÉALISTE 15 cohérent VMA 13.4`);
}
