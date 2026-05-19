/**
 * Patches Firebase pour 4 plans freemium des 24h.
 * 1. Hyrox 1h10 : 2 SL → convertir Jeudi SL en Jogging
 * 2. Remise en Forme : volume S1 trop bas (4.7 → 9 km)
 * 3. Hyrox 1h30 : Dim → Ven (jour préféré)
 * 4. 10km 35min : warning faisabilité (cible 97.7% VMA, > seuil 92%)
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();

// Firestore helpers
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}

async function getDoc(id){
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers: { 'Authorization': `Bearer ${access_token}` } });
  return pf((await r.json()).fields);
}
async function patchDoc(id, fields, fieldPaths){
  const params = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const body = { fields: {} };
  for (const k of fieldPaths) body.fields[k] = toFs(fields[k]);
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}?${params}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

const patches = [];

// ═══ PATCH 1 — Hyrox 1h10 (advancescooter@hotmail.com) ═══
patches.push({
  id: '1778519325979',
  name: 'Hyrox 1h10 22 sem',
  apply: (doc) => {
    const s1 = doc.weeks[0];
    // Trouver la SL du Jeudi (12.9 km) et la convertir en Jogging
    for (const s of s1.sessions) {
      if (s.day === 'Jeudi' && /sortie\s*longue/i.test(s.type || '')) {
        s.type = 'Jogging';
        s.title = 'Footing aérobie intermédiaire — base Hyrox';
        s.advice = 'Footing de milieu de semaine pour entretenir le volume aérobie sans ajouter de fatigue. Reste en aisance respiratoire (conversation possible).';
        return ['weeks'];
      }
    }
    return [];
  },
});

// ═══ PATCH 2 — Remise en Forme (alisontsn@outlook.fr) ═══
patches.push({
  id: '1778517602419',
  name: 'Remise en Forme 12 sem',
  apply: (doc) => {
    const s1 = doc.weeks[0];
    // La seule course est Lundi "Découverte en Marche/Course légère" 4.7 km / 50 min
    // VMA 9.4 = débutant → augmenter la course mais rester en marche/course
    // Cible: 9 km (volume cible S1) en ~1h35 (alternance course/marche)
    for (const s of s1.sessions) {
      if (s.day === 'Lundi' && s.type !== 'Renforcement') {
        s.distance = '9 km';
        s.duration = '1h 35 min';
        s.mainSet = '6 cycles de 5 min : 3 min course très souple à 9:32 min/km + 2 min marche active à 10:38 min/km. Total ~30 min de course alternée. Garder respiration nasale possible.';
        s.title = 'Marche/Course progressive — adaptation 9 km';
        s.advice = 'Première séance plus longue pour construire ta base. La marche est ton alliée — ne pas hésiter à plus marcher si essoufflement. La régularité prime sur la performance.';
        return ['weeks'];
      }
    }
    return [];
  },
});

// ═══ PATCH 3 — Hyrox 1h30 (charlottemalbosc@yahoo.fr) ═══
patches.push({
  id: '1778514063928',
  name: 'Hyrox 1h30 30 sem',
  apply: (doc) => {
    const s1 = doc.weeks[0];
    // Trouver la SL du Dimanche et la déplacer au Vendredi (jour préféré)
    for (const s of s1.sessions) {
      if (s.day === 'Dimanche') {
        s.day = 'Vendredi';
        return ['weeks'];
      }
    }
    return [];
  },
});

// ═══ PATCH 4 — 10km 35min (frige60@hotmail.fr) — warning faisabilité ═══
patches.push({
  id: '1778505133265',
  name: '10km en 35min 4 sem',
  apply: (doc) => {
    // Plan technique cohérent, mais cible 35min = 97.7% VMA (irréaliste, refus dur v2)
    // Enrichir feasibility.safetyWarning + welcomeMessage
    const existingWarning = doc.feasibility?.safetyWarning || '';
    const newWarning = `⚠ FAISABILITÉ : ton objectif de 10km en 35min demande une allure soutenue à 97.7% de ta VMA actuelle — au-delà du seuil tenable physiologiquement (max ~92% sur 10km). Un objectif réaliste à court terme serait 37-38min (≈ 92-93% VMA). En 4 semaines, tu peux espérer ~36-37min en restant proche de ta VMA actuelle. Pour passer sous 35min, prévoir 8-12 semaines avec progression VMA.\n\n${existingWarning}`;
    doc.feasibility = { ...doc.feasibility, safetyWarning: newWarning };
    return ['feasibility'];
  },
});

// === Exécution ===
console.log(`\n${DRY_RUN ? '🔍 DRY-RUN' : '🚀 PUSH'} — ${patches.length} patches freemium 24h\n`);

for (const patch of patches) {
  console.log(`▸ ${patch.name} (${patch.id})`);
  const doc = await getDoc(patch.id);
  writeFileSync(`backup-freemium-${patch.id}-${Date.now()}.json`, JSON.stringify(doc, null, 2));
  console.log(`  ✓ Backup écrit`);
  const fieldPaths = patch.apply(doc);
  if (fieldPaths.length === 0) {
    console.log(`  ⚠ Aucune modification (pattern non trouvé)`);
    continue;
  }
  console.log(`  📝 Modifications: ${fieldPaths.join(', ')}`);
  if (DRY_RUN) {
    console.log(`  🔍 Dry-run, push skipped`);
  } else {
    await patchDoc(patch.id, doc, fieldPaths);
    console.log(`  ✓ Push réussi`);
  }
  console.log();
}

console.log(`✅ Terminé — ${patches.length} plans traités`);
