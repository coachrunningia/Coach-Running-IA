/**
 * Patch lafleur666 — Semi 1h59 avec fasciite plantaire + lombaires
 * P1: Plafonner toutes les SL à 1h45 max (durée 105 min)
 * P2: VMA courtes → VMA longues (intervalles ≥ 1min, moins d'impact répété)
 * P3: safetyWarning enrichi (fasciite + lombaires + surfaces + étirements)
 * P4: welcomeMessage réécrit avec mentions blessures et cible 1h59 vs 2h02
 * P5: Garder cible 1h59 mais alerter 89.6%VMA
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PLAN_ID = '1773143911561';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };
const formatDur = (m) => { const h = Math.floor(m/60); const min = m % 60; return h > 0 ? `${h}h${String(min).padStart(2,'0')}` : `${min} min`; };

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const doc = pf((await r.json()).fields);
writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-lafleur-${Date.now()}.json`, JSON.stringify(doc, null, 2));
console.log(`✓ Backup écrit\n`);

const MAX_SL_MIN = 105; // 1h45
let changeLog = [];

for (const w of doc.weeks) {
  for (const s of (w.sessions || [])) {
    // P1: Plafonner SL à 1h45
    if ((s.type === 'Sortie Longue' || /sortie.*longue/i.test(s.type||''))) {
      const dm = durMin(s.duration);
      if (dm > MAX_SL_MIN) {
        const km = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
        const ratio = MAX_SL_MIN / dm;
        const newKm = Math.round(km * ratio * 10) / 10;
        s.duration = formatDur(MAX_SL_MIN);
        s.distance = `${newKm} km`;
        // Adapter mainSet pour mentionner la limite
        if (s.mainSet && !/lombaire|1h45|105/i.test(s.mainSet)) {
          s.mainSet = `Sortie longue plafonnée à 1h45 (contre-indication lombaires "après 15 min" déclarée). ${s.mainSet}`;
        }
        changeLog.push(`S${w.weekNumber} ${s.day} SL: ${dm}→${MAX_SL_MIN}min, ${km}→${newKm}km`);
      }
    }

    // P2: VMA courte → VMA longue
    const isVMA = /vma|fractionn[eé]/i.test(s.type || '') || /vma/i.test(s.title || '');
    if (isVMA && s.intensity === 'Difficile') {
      // Adapter le mainSet pour passer en intervalles plus longs (≥ 1 min30)
      if (s.mainSet && /30\/30|200m|10×400|12×200/i.test(s.mainSet)) {
        s.mainSet = `VMA longue adaptée (fasciite plantaire) : 6×1000m à allure VMA (récup 2 min trottée). Préférer intervalles ≥ 1min30 pour limiter l'impact répété sur le fascia plantaire. Privilégier surface souple (piste tartan, chemin terre).`;
      } else if (!s.mainSet) {
        s.mainSet = `6×1000m à allure VMA (récup 2 min trottée). Surface souple, échauffement étiré et complet pour le fascia plantaire.`;
      }
      // Toujours ajouter mention surface souple si absente
      if (!/souple|terre|tartan|pist/i.test(s.mainSet || '')) {
        s.mainSet += ` ⚠ Surface souple obligatoire (fasciite).`;
      }
      changeLog.push(`S${w.weekNumber} ${s.day} VMA adaptée → intervalles longs + surface souple`);
    }
  }
}

// P3: safetyWarning enrichi
doc.feasibility = doc.feasibility || {};
doc.feasibility.safetyWarning = `🚨 BLESSURES DÉCLARÉES — adaptations obligatoires :

🦶 **Fasciite plantaire** :
- ÉCHAUFFEMENT plantaire OBLIGATOIRE avant chaque séance : 2 min de roulement de balle sous le pied + 10 montées de pointes lente
- SURFACE SOUPLE prioritaire (piste tartan, chemin terre, gazon) — éviter pavés et bitume dur
- FRACTIONS LONGUES privilégiées (≥ 1 min) — les 30/30 et 200m répétés réveillent le fascia
- CHAUSSURES à amorti maximal, semelles orthopédiques si prescrites
- ÉTIREMENTS plantaires post-séance : 3×30s par pied (orteils tirés vers soi)

🦴 **Lombaires (douleur après 15 min)** :
- TOUTES les SORTIES LONGUES sont plafonnées à 1h45 (contre 2h dans la version initiale)
- GAINAGE central OBLIGATOIRE : 2 séances/sem (planches, planches latérales, oiseau, dead bug)
- POSTURE : surveiller le bassin antéversé qui aggrave le mal de dos
- ARRÊT IMMÉDIAT si douleur lombaire pendant l'effort, ne pas pousser

🎯 **Cible 1h59 ambitieuse** : 1h59 = 89.6 % de ta VMA actuelle (11.87 km/h), au-dessus de la zone tenable sur 21km pour une coureuse non-élite (~88 % max recommandé). Tu peux viser ce chrono mais sois lucide : **2h02 (88 %VMA) reste un beau gain de 3 min** sur tes 2h05 actuels et serait plus respectueux de ton corps en cours de réhabilitation. Garde 1h59 comme étoile mais teste 2h02 si la fasciite ou les lombaires réagissent.

📅 **Suivi recommandé** : visite kinésithérapeute spécialisée course toutes les 6 semaines pour évaluation tibiale et plantaire.`;

// P4: welcomeMessage adapté
doc.welcomeMessage = `Bienvenue dans ton plan de 20 semaines pour un semi-marathon en 1h59 — adapté à ton profil et tes blessures.

🎯 **Cible 1h59** : c'est ambitieux (gain de 6 min sur tes 2h05 actuels). Cette allure correspond à 89.6 % de ta VMA — au-dessus de la zone confortable sur 21 km (~88 % max). Reste à l'écoute, et si tes blessures se réveillent, n'hésite pas à viser un sub-2h02 plutôt qu'un sub-2h00 ferme.

🩺 **Adaptations spécifiques à tes blessures** :
- Toutes les sorties longues sont plafonnées à **1h45 max** (au lieu de 2h initialement) pour respecter ton seuil lombaire des 15 minutes.
- Les séances de VMA courtes (30/30, 200m) sont **remplacées par des intervalles longs** (1000m, 1200m) pour épargner ton fascia plantaire.
- Sur toutes les séances : surface souple privilégiée (piste, chemin terre, gazon), étirements plantaires post-séance, chaussures à amorti maximal.

💪 **Renforcement** : le Jeudi est dédié au renfo musculaire ciblé fessiers, gainage central et excentrique quadriceps — c'est ton allié pour stabiliser ton bassin (lombaires) et renforcer ta voûte plantaire (fasciite).

📋 **Structure** (3 séances/sem) :
- Mardi : qualité (footing actif, fartlek, seuil ou VMA longue selon la phase)
- Jeudi : renforcement musculaire
- Dimanche (ou Samedi) : sortie longue plafonnée 1h45 + travail allure spécifique semi en phase finale

⚠ **Signal d'alarme** : à la moindre douleur plantaire ou lombaire, **PAUSE et consulte ton kiné**. Mieux vaut un repos d'une semaine qu'un mois d'arrêt complet.

Bonne préparation — la performance n'a de valeur que si tu peux la courir.`;

console.log(`📋 ${changeLog.length} modifications :`);
changeLog.forEach(c => console.log(`  - ${c}`));

if (DRY_RUN) {
  writeFileSync('/Users/romanemarino/Coach-Running-IA/preview-lafleur.json', JSON.stringify({ weeks: doc.weeks, welcomeMessage: doc.welcomeMessage, feasibility: doc.feasibility }, null, 2));
  console.log(`\n🔍 DRY-RUN — preview écrit`);
  process.exit(0);
}

const params = 'updateMask.fieldPaths=weeks&updateMask.fieldPaths=welcomeMessage&updateMask.fieldPaths=feasibility';
const body = { fields: {
  weeks: toFs(doc.weeks),
  welcomeMessage: toFs(doc.welcomeMessage),
  feasibility: toFs(doc.feasibility),
}};
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?${params}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error(`❌ ${res.status}: ${await res.text()}`); process.exit(1); }
console.log(`\n✓ Push réussi`);
