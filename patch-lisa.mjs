/**
 * Patch Lisa Dutarde — refonte sécuritaire IMC 35 + Débutante + périostite bilatérale
 * P1: S2 côtes → Marche/Course
 * P2: Tous Fractionné/Fartlek/VMA → Marche/Course (ou Jogging très lent)
 * P3: Dimanche → Vendredi (préférence Lu/Me/Ve)
 * P4: safetyWarning renforcé
 * P5: welcomeMessage réécrit
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PLAN_ID = '1778429788661';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}

// Charger doc
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const doc = pf((await r.json()).fields);

// Backup
writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-lisa-${Date.now()}.json`, JSON.stringify(doc, null, 2));
console.log(`✓ Backup écrit\n`);

// === Patch ===
let changeLog = [];

for (const w of doc.weeks) {
  for (const s of (w.sessions || [])) {
    // P3: Dimanche → Vendredi
    if (s.day === 'Dimanche') {
      s.day = 'Vendredi';
      changeLog.push(`S${w.weekNumber} ${s.title?.substring(0,30)} : Dim → Ven`);
    }

    // P1+P2: types/séances à transformer
    const isCotes = /c[oô]te/i.test(s.title || '') || /c[oô]te/i.test(s.type || '');
    const isFractionne = /fractionn[eé]|fartlek|vma/i.test(s.type || '') || /fractionn[eé]|fartlek|vma|seuil/i.test(s.title || '');

    if (isCotes || isFractionne) {
      const km = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
      // Recalculer durée pour allure marche/course (~8:30 min/km moyen, mix course 8:08 + marche 9:05)
      const newDurMin = Math.round(km * 8.5);
      const h = Math.floor(newDurMin / 60);
      const m = newDurMin % 60;
      const newDur = h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${newDurMin} min`;

      s.type = 'Marche/Course';
      s.intensity = 'Facile';
      s.title = `Marche/Course aérobie — ${km > 0 ? km + 'km' : 'durée fixe'} sur terrain plat`;
      s.targetPace = 'Course 8:08 min/km / Marche 9:05 min/km';
      s.duration = newDur;
      s.mainSet = `Alterner ${km > 0 && km < 4 ? '2 min course / 2 min marche' : '3 min course / 2 min marche'} sur un parcours PLAT (route souple, sentier sans dénivelé). Garde la respiration nasale possible — si essoufflement, marche plus longtemps. Aucun saut, aucune côte, aucune accélération brutale (réveille périostite).`;
      s.warmup = '10 min marche active + mobilité chevilles et hanches (rotations lentes)';
      s.cooldown = '10 min marche active + étirements doux : mollets (3×30s par jambe), fasciite plantaire (rouler une balle sous le pied 2 min), ischio-jambiers';
      s.advice = 'Cette séance remplace une séance plus intense — adaptée à ton profil (IMC, périostite). La régularité prime sur la performance. Si douleur tibiale apparaît, ARRÊTE et reviens à de la marche pure ou consulte ton kiné.';
      s.locationSuggestion = 'Route plate, piste cyclable, ou sentier très lisse aux abords de Saintes. ÉVITER : pavés, descentes, terrains accidentés.';
      changeLog.push(`S${w.weekNumber} ${s.day} : ${isCotes ? 'Côtes' : 'Fractionné'} → Marche/Course`);
    }
  }

  // Vérifier S22+ : N-1 course (=2) + 1 renfo
  const courseCount = (w.sessions || []).filter(s => s.type !== 'Renforcement').length;
  const renfoCount = (w.sessions || []).filter(s => s.type === 'Renforcement').length;
  if (courseCount > 2 || renfoCount > 1) {
    changeLog.push(`⚠ S${w.weekNumber}: ${courseCount} course / ${renfoCount} renfo — anomalie laissée en l'état (revoir manuellement)`);
  }
}

// P5: welcomeMessage réécrit
doc.welcomeMessage = `Bienvenue Lisa dans ton programme de 30 semaines.

🩺 **Avant tout démarrage** : ton profil (IMC élevé + antécédents de périostite bilatérale et surcharge des fibulaires) nécessite **OBLIGATOIREMENT** :
- Un certificat médical d'aptitude à la course à pied (test d'effort recommandé)
- Une consultation chez un kinésithérapeute spécialisé course pour évaluer ta foulée et préparer le terrain (semelles, exercices spécifiques)
- Un avis sur tes chaussures (amorti maximal, possiblement orthèses plantaires)

🎯 **Philosophie du plan** : MARCHE/COURSE ALTERNÉE dominante sur toute la prépa. Aucune côte, aucun fractionné intense, aucun saut — toutes ces formes d'impact réveillent la périostite. La progression se fait par **DURÉE** plutôt que par **VITESSE**.

📋 **Structure** :
- Lundi : renforcement musculaire (gainage, glutes, équilibre) — préserve articulations et bassin
- Mercredi : marche/course courte
- Vendredi : marche/course longue (séance principale)

⚠ **Signal d'alarme** : à la moindre douleur tibiale, fibulaire, plantaire ou genou, ARRÊTE et consulte. La périostite ne pardonne pas le forçage.

💡 **Objectif honnête** : un trail 21km est très ambitieux dans ton contexte. Nous t'accompagnons sur cette progression mais **un palier intermédiaire** (10km route en marche/course rapide) est fortement recommandé avant la course. Garde l'objectif comme moteur, mais reste à l'écoute de ton corps : c'est lui qui décide du timing final.

Bonne route — pas après pas, sans douleur.`;

// P4: safetyWarning renforcé
doc.feasibility = doc.feasibility || {};
doc.feasibility.safetyWarning = `🚨 AVIS MÉDICAL OBLIGATOIRE AVANT DÉMARRAGE — tu cumules : (1) IMC élevé créant une surcharge articulaire importante, (2) antécédents de périostite bilatérale et surcharge des fibulaires (= os tibias et péronés fragilisés), (3) niveau débutant. Consulte impérativement un médecin (test d'effort recommandé) ET un kinésithérapeute spécialisé course AVANT de démarrer ce plan.

🎯 OBJECTIF INTERMÉDIAIRE FORTEMENT RECOMMANDÉ : avant de viser le trail 21km, vise un **5km à 10km route en marche/course rapide**. Cet objectif intermédiaire (faisable sur 12-16 sem) te permettra de valider l'absence de récidive de périostite et de construire ta base sans risque.

⚠ PRINCIPES DE SÉCURITÉ STRICTS :
- TOUJOURS surfaces souples (route asphalte > sentiers pierreux). Éviter pavés et descentes.
- TOUJOURS chaussures à amorti maximal — renouveler tous les 600 km maximum.
- INTERDIT : sauts, côtes, fractionné court, sprint final. Tout impact répétitif est risqué.
- MARCHE = ton alliée. Plus tu marches en début de séance, plus ton corps s'adapte.
- ARRÊT IMMÉDIAT si douleur tibiale apparaît, même légère. Consulte ton kiné.

📅 Suivi recommandé : visite kiné toutes les 4-6 semaines pour évaluer l'état tibial.`;

// === Push ===
console.log(`📋 ${changeLog.length} modifications :`);
changeLog.slice(0, 30).forEach(c => console.log(`  - ${c}`));
if (changeLog.length > 30) console.log(`  ... et ${changeLog.length - 30} autres`);

if (DRY_RUN) {
  writeFileSync('/Users/romanemarino/Coach-Running-IA/preview-lisa.json', JSON.stringify({ weeks: doc.weeks, welcomeMessage: doc.welcomeMessage, feasibility: doc.feasibility }, null, 2));
  console.log(`\n🔍 DRY-RUN — preview écrit dans preview-lisa.json`);
  process.exit(0);
}

const updateMask = 'updateMask.fieldPaths=weeks&updateMask.fieldPaths=welcomeMessage&updateMask.fieldPaths=feasibility';
const body = { fields: {
  weeks: toFs(doc.weeks),
  welcomeMessage: toFs(doc.welcomeMessage),
  feasibility: toFs(doc.feasibility),
}};
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?${updateMask}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`❌ ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`\n✓ Push réussi — Lisa Trail 21km mis à jour`);
