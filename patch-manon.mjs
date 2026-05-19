/**
 * Patch manondbc — Trail 23km / 1500D+ avec syndrome TLF récent
 * P1: Déplacer 3 séances jours non-préférés vers Lu/Je/Ve
 *     S1 Sam → Ven, S2 Mar → Lun, S2 Sam → Ven
 * P2: welcomeMessage avec mention TLF
 * P3: safetyWarning avec adaptations TLF (abducteurs, éviter box jumps S3)
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PLAN_ID = '1774900493420';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${token}` } });
const doc = pf((await r.json()).fields);
writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-manon-${Date.now()}.json`, JSON.stringify(doc, null, 2));

// P1: Déplacer jours non-préférés
let changeLog = [];
const prefDays = ['Lundi', 'Jeudi', 'Vendredi'];
for (const w of doc.weeks) {
  for (const s of (w.sessions||[])) {
    if (!s.day || prefDays.includes(s.day)) continue;
    // Détermine le jour préféré le plus proche (cohérent avec la séquence)
    // S1 Sam SL → Vendredi (cohérent avec SL prochaines)
    // S2 Mar Footing → Lundi
    // S2 Sam SL → Vendredi
    let newDay;
    if (s.day === 'Samedi') newDay = 'Vendredi';
    else if (s.day === 'Mardi') newDay = 'Lundi';
    else newDay = 'Vendredi'; // fallback
    changeLog.push(`S${w.weekNumber} ${s.day}→${newDay}: ${s.title?.substring(0,40)}`);
    s.day = newDay;
  }
}

// P3: safetyWarning enrichi
doc.feasibility = doc.feasibility || {};
doc.feasibility.safetyWarning = `🩹 SYNDROME DU TLF (bandelette iliotibiale) — adaptations obligatoires :

🦵 **Prévention BIT/TLF spécifique** :
- INDISPENSABLE 2× par semaine (ajouts au renforcement déjà prévu) :
  • Marche latérale avec élastique au-dessus des genoux : 3×15 pas/côté
  • Pont fessier sur 1 jambe : 3×12/jambe
  • Coquillage avec élastique (clamshell) : 3×15/côté
  • Renforcement moyen fessier (glutéus medius) = clé pour TLF
- ÉTIREMENTS BIT post-séance : 3×30s par côté (jambe croisée, hanche poussée)
- FOAM ROLLER bandelette 2-3× par semaine, 1 min par côté (insistance face latérale cuisse)

⛰️ **Spécifique trail (D+ 1500m)** :
- DESCENTES progressives — débuter sans dénivelé, ajouter du D+ semaine après semaine
- TECHNIQUE descente : foulée courte, légère, pas de gros impacts. Privilégier descentes en lacets plutôt que ligne directe
- ⚠ ÉVITER les box jumps présents en S3 et certains renfos « Trail Focus A » — sauter sollicite la BIT en compression. **Remplacer par : step-ups lents + montées sur banc sans saut**

🎯 **Vigilance** :
- DOULEUR LATÉRALE du genou (signe TLF) = ARRÊT immédiat, glace, kiné
- Volume progressif (cycle 3+1 déjà prévu = bon)
- Hydratation et nutrition essentielles sur trail 23km

📅 Suivi : revoir un kiné toutes les 6-8 semaines pour évaluer la BIT et la flexibilité de la hanche.`;

// P2: welcomeMessage
doc.welcomeMessage = `Bienvenue Manon dans ton plan de 29 semaines pour le Trail 23km / 1500D+ — adapté à ton historique TLF.

🩹 **Adaptation à ton syndrome TLF** (récent fin 2025) :
- Le plan inclut une progression très progressive du dénivelé (semaine après semaine, pas en pic) pour respecter ton retour de blessure.
- Le renforcement musculaire (Jeudi) doit ABSOLUMENT inclure des exercices spécifiques bandelette iliotibiale : marche latérale élastique, coquillage, pont fessier unijambiste. Ces exercices stabilisent ton bassin et préviennent la récidive.
- Les box jumps présents dans certains renforcements (S3, S5+ Trail Focus A) sont **À ÉVITER** — remplace par step-up lents sans saut.
- Foam roller bandelette 2-3× par semaine après tes séances de course.

📋 **Structure** (3 séances/sem, Lundi/Jeudi/Vendredi) :
- Lundi : footing court ou tempo (selon phase)
- Jeudi : renforcement musculaire + abducteurs BIT
- Vendredi : sortie longue trail avec progression D+

🎯 **Objectif Finisher** : pas de chrono, juste terminer dans de bonnes conditions. Le plan vise une SL pic à 24-25km sur dénivelé proche du parcours pour habituer ton corps et ta BIT à l'effort prolongé en descente.

⚠ **Signal d'alarme** : DOULEUR LATÉRALE DU GENOU = signe typique TLF récidivant. ARRÊT immédiat, glace, repos, kiné. Mieux vaut perdre une semaine que retomber dans la blessure.

Bonne route — la régularité et l'écoute de ton corps sont tes meilleurs alliés.`;

console.log(`📋 ${changeLog.length} modifications de jours :`);
changeLog.forEach(c => console.log(`  - ${c}`));

if (DRY_RUN) {
  writeFileSync('/Users/romanemarino/Coach-Running-IA/preview-manon.json', JSON.stringify({ weeks: doc.weeks, welcomeMessage: doc.welcomeMessage, feasibility: doc.feasibility }, null, 2));
  console.log(`\n🔍 DRY-RUN`);
  process.exit(0);
}
const params = 'updateMask.fieldPaths=weeks&updateMask.fieldPaths=welcomeMessage&updateMask.fieldPaths=feasibility';
const body = { fields: { weeks: toFs(doc.weeks), welcomeMessage: toFs(doc.welcomeMessage), feasibility: toFs(doc.feasibility) }};
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?${params}`, {
  method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
if (!res.ok) { console.error(`❌ ${res.status}: ${await res.text()}`); process.exit(1); }
console.log(`\n✓ Push réussi`);
