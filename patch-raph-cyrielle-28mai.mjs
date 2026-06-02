#!/usr/bin/env node
/**
 * patch-raph-cyrielle-28mai.mjs
 *
 * Patches live 2 plans suite audit cross-experts 28/05/2026 :
 * - 1779985567416 raph (Trail 100K Nantes) : welcomeMessage enrichi adaptation
 *   Nantes plat + safety S18 étaler 3926m sur 3-4 sorties (Expert Trail tranché)
 * - 1779986074728 cyrielle (Semi 2h00 cv=2 IRRÉALISTE) : welcomeMessage enrichi
 *   warning blessure pic<race + CTA regen explicite "Re-génère avec target 2h28"
 *   (Expert Course tranché)
 *
 * Doctrines : feedback_securite_avant_conversion, D17 transparence opt-in.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-2plans-28mai/backups-raph-cyrielle-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = (id) => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${id}"`, { maxBuffer: 80*1024*1024 }).toString());
const patchDoc = (id, fields, mask) => {
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${id}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-${id}-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) throw new Error(res.error.message);
  return res;
};

// ────────────────────────────────────────────────
// WORDINGS (validés par Expert Trail + Expert Course)
// ────────────────────────────────────────────────

const RAPH_WELCOME = `Bienvenue Raph,

Bienvenue dans ta préparation pour ton 100K. Ton moteur route (VMA 15.2, Marathon 3h32) est solide. Place au défi vertical.

📍 **Adaptation Nantes-plat — Tu vis sur du plat mais ta course a 4500m D+.** Pour combler ce manque :
- Tapis incliné (12-15%) pour les rampes longues type col
- Stair-climbing (Butte Sainte-Anne) ou escaliers d'immeuble pour le travail concentrique
- Sorties Roche Ballue à Bouguenais ou Parc de la Chantrerie pour les sentiers vallonnés
- Côtes courtes répétées (Butte Sainte-Anne, Sillon de Bretagne) pour la puissance

⚠️ **Note importante S18 — Pic D+ 3926m/sem :** Cette charge est intense mais essentielle. Étale-la sur 3 à 4 sorties dans la semaine. **NE FAIS JAMAIS** 3926m en une seule sortie — c'est la garantie d'une tendinopathie ou d'une blessure musculaire.

Les semaines de récupération sont CRUCIALES pour ton ultra-trail : c'est pendant la récup que ton corps adapte. Si une semaine de charge te lessive vraiment, rajoute un jour de repos. Mieux vaut un peu sous-volume que blessé.

Le renforcement excentrique (vendredi) est ta meilleure assurance contre les descentes : ne le saute jamais.

Bon vent sur le 100K, Raph. On est là si besoin.`;

const CYRIELLE_WELCOME = `Salut,

Bienvenue. Je te dois la vérité avant qu'on démarre, parce que ton plan tel quel est un piège.

🚨 **Ton objectif 2h00 sur Semi-Marathon est physiologiquement hors d'atteinte avec ta VMA actuelle (10.5 km/h).** Pour faire 2h00, il faudrait tenir 100% de ta VMA pendant 21,1 km — aucun coureur entraîné ne peut tenir ça. Le seuil maximum est ~93% sur Semi.

📊 **Ton temps réaliste : 2h28**. Ton temps théorique pur est de 2h21, mais avec ton volume actuel (2 km/sem), une cible de 2h28 est plus réaliste et sans surcharge.

⚠️ **Risque blessure majeur sur le plan actuel** : le pic de volume hebdo (14 km) est inférieur à la distance de course (21,1 km). Le jour J, tu vas doubler ton volume hebdomadaire maximum en une seule séance. C'est une recette pour la blessure ou l'abandon entre le km 10 et 15.

**Ma recommandation honnête :**
1. **Re-génère un nouveau plan avec le targetTime "2h28"** (depuis ton profil → Refaire le questionnaire). Tu obtiendras un plan adapté, avec un pic à 18-20 km/sem qui te préparera vraiment à passer la ligne.
2. **OU continue ce plan en mode "découverte"** : tu vas progresser mais l'objectif 2h00 ne sera pas atteint et le risque blessure reste élevé.

Tu as déjà fait un Marathon en 5h00 — tu as la mémoire de l'effort long. Mais il faut reconstruire le capital ostéo-tendineux que cv=2 a entamé.

Avant la première séance : consulte ton médecin pour valider l'aptitude. Avis kiné du sport recommandé.

Romane et l'équipe sont là si tu veux ajuster. Bon vent.`;

// ────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────

const PATCHES = [
  {
    id: '1779985567416',
    name: 'RAPH (Trail 100K Nantes — adaptation + S18 safety)',
    email: 'raph.courjault@orange.fr',
    apply: (f) => { f.welcomeMessage = { stringValue: RAPH_WELCOME }; return ['welcomeMessage']; },
  },
  {
    id: '1779986074728',
    name: 'CYRIELLE (Semi 2h00 IRRÉALISTE — warning + CTA regen 2h28)',
    email: 'menot.cyrielle@gmail.com',
    apply: (f) => { f.welcomeMessage = { stringValue: CYRIELLE_WELCOME }; return ['welcomeMessage']; },
  },
];

console.log(`>>> Patches live raph + cyrielle — DRY_RUN=${DRY_RUN}`);

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
    console.log(`  Champs patchés : ${mask.join(', ')}`);
    console.log(`  Nouveau welcomeMessage : ${f.welcomeMessage.stringValue.length} chars`);
    if (DRY_RUN) {
      console.log(`  DRY RUN — pas d'écriture`);
    } else {
      const res = patchDoc(patch.id, f, mask);
      console.log(`  ✅ PATCH OK -> updateTime: ${res.updateTime}`);
    }
  } catch (e) {
    console.error(`  ❌ Erreur ${patch.id}: ${e.message}`);
  }
}

console.log(`\nBackups : ${BACKUP_DIR}`);
if (DRY_RUN) console.log(`Pour exec : DRY_RUN=false node patch-raph-cyrielle-28mai.mjs`);
