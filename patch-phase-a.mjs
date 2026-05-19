/**
 * Phase A — Patches conversion validés par expert :
 * 1. chevauxpie : ajouter décharge explicite IRRÉALISTE
 * 2. Arnaud : ajouter Saint-Pierre-de-Côle dans locationSuggestion
 * 3. advancescooter : ville Genève + enrichir welcomeMessage
 * 4. charlottemalbosc : ville Toulouse + enrichir welcomeMessage
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}

async function getDoc(id) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return pf((await r.json()).fields);
}
async function patchDoc(id, fields, fieldPaths) {
  const params = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const body = { fields: {} };
  for (const k of fieldPaths) body.fields[k] = toFs(fields[k]);
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}?${params}`, {
    method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

// Helper : injecter une ville dans tous les locationSuggestion d'une S1 (si pas déjà présent)
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

const patches = [];

// === 1. chevauxpie — Décharge explicite ===
patches.push({
  id: '1778527986793', // chevauxpie Trail 69km
  label: 'chevauxpie Trail 69km IRRÉALISTE',
  apply: async (doc) => {
    const fp = [];
    const existingSW = doc.feasibility?.safetyWarning || '';
    const explicitConsent = `

⚠ DÉCHARGE OBLIGATOIRE — Ce plan a été identifié comme NON ADAPTÉ à ton profil actuel (VMA 8.3 km/h vs un trail 69km / 1200 D+ qui demande habituellement VMA ≥ 12-14 km/h). Les risques de blessure, d'abandon en course et d'épuisement sont significatifs.

En générant et en suivant ce plan, **tu reconnais avoir lu ces informations et tu témoignes de ta volonté de poursuivre cet objectif sous ta propre responsabilité**. Nous te recommandons fortement de :
- Consulter un médecin du sport AVANT de démarrer
- Envisager d'abord un trail intermédiaire (20-30 km) comme palier de progression
- Suivre rigoureusement les semaines de décharge et écouter ton corps`;
    if (!explicitConsent.startsWith(existingSW.slice(0, 30))) {
      doc.feasibility = doc.feasibility || {};
      doc.feasibility.safetyWarning = existingSW + explicitConsent;
      fp.push('feasibility');
    }
    // Ville Montagny dans suggestions (partiellement déjà fait)
    const city = doc.generationContext?.questionnaireSnapshot?.city;
    const s1 = doc.weeks?.[0];
    const added = injectCity(s1, city);
    if (added > 0) fp.push('weeks');
    return { fieldPaths: fp, info: `décharge ajoutée + ville injectée dans ${added} locationSuggestion` };
  },
});

// === 2. Arnaud — Ville Saint-Pierre-de-Côle ===
patches.push({
  id: '1778521479387',
  label: 'Arnaud Perte de Poids — ville',
  apply: async (doc) => {
    const city = doc.generationContext?.questionnaireSnapshot?.city || 'Saint Pierre de Cole';
    let totalAdded = 0;
    for (const w of doc.weeks || []) {
      totalAdded += injectCity(w, city);
    }
    return { fieldPaths: totalAdded > 0 ? ['weeks'] : [], info: `ville injectée dans ${totalAdded} locationSuggestion sur 12 sem` };
  },
});

// === 3. advancescooter — Ville Genève + welcome enrichi ===
patches.push({
  id: '1778519325979',
  label: 'advancescooter Hyrox 1h10 — ville + welcome',
  apply: async (doc) => {
    const qs = doc.generationContext?.questionnaireSnapshot || {};
    const city = qs.city || 'Genève';
    const firstName = qs.firstName || doc.firstName;
    const fp = [];
    // Ville
    const s1 = doc.weeks?.[0];
    const added = injectCity(s1, city);
    if (added > 0) fp.push('weeks');
    // Welcome enrichi (uniquement si générique)
    const wm = doc.welcomeMessage || '';
    if (!/genève|geneve/i.test(wm)) {
      const records = qs.recentRaceTimes || {};
      const recList = Object.entries(records).filter(([_,v]) => v).map(([k,v]) => `${k.replace('distance','')} en ${v}`).join(', ');
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan Hyrox de 22 semaines pour viser 1h10.

🎯 **Objectif ambitieux** : 1h10 sur Hyrox demande typiquement une VMA ≥ 18 km/h (top niveau France). Ta VMA actuelle de ${doc.vma?.toFixed(1) || '15.2'} km/h te permet de viser une excellente performance mais le sub-1h10 reste très tendu. Sois lucide sur le résultat : un sub-1h15 serait déjà remarquable, 1h10 reste un objectif "stretch".

📋 **Structure** (4 séances/sem) : footings aérobies + intervalles 8×1 km style Hyrox + sortie longue + 1 renforcement musculaire.

📍 **Tes sorties** seront suggérées autour de **${city.trim()}**.${recList ? `\n\n🏃 **Tes records actuels** (${recList}) sont la base de calcul de tes allures personnalisées.` : ''}

Bonne préparation — concentre-toi sur les 8×1 km enchaînés, c'est la clé de l'Hyrox.`;
      fp.push('welcomeMessage');
    }
    return { fieldPaths: fp, info: `ville (${added} sess) + welcome ${fp.includes('welcomeMessage') ? 'réécrit' : 'OK'}` };
  },
});

// === 4. charlottemalbosc — Ville Toulouse + welcome ===
patches.push({
  id: '1778514063928',
  label: 'charlottemalbosc Hyrox 1h30 — ville + welcome',
  apply: async (doc) => {
    const qs = doc.generationContext?.questionnaireSnapshot || {};
    const cityRaw = qs.city || 'Toulouse';
    // "Toulousains" → "Toulouse" (nettoyage)
    const city = cityRaw.replace(/toulousains?/gi, 'Toulouse').trim();
    const firstName = qs.firstName || doc.firstName;
    const fp = [];
    const s1 = doc.weeks?.[0];
    const added = injectCity(s1, city);
    if (added > 0) fp.push('weeks');
    const wm = doc.welcomeMessage || '';
    if (!/toulous/i.test(wm)) {
      doc.welcomeMessage = `Bienvenue${firstName ? ' ' + firstName : ''} dans ton plan Hyrox de 30 semaines pour viser 1h30.

🎯 **Objectif cohérent** : 1h30 sur Hyrox est un excellent palier pour débutante. Avec ta VMA ${doc.vma?.toFixed(1) || '9.0'} km/h, l'allure cible de course est progressive — on commence par construire ta base aérobie avant d'aborder les intervalles 8×1 km du Hyrox.

📋 **Structure** (3 séances/sem) : marche/course adaptée + footings progressifs + renforcement musculaire. Pas d'intensité haute en début de plan pour construire des fondations solides.

📍 **Tes sorties** seront suggérées autour de **${city.trim()}**.

⚠ **Important** : 30 semaines c'est long — n'hésite pas à prendre des pauses si fatigue ou perte de motivation. La régularité prime sur la perfection.

Bonne préparation — patience et progression !`;
      fp.push('welcomeMessage');
    }
    return { fieldPaths: fp, info: `ville (${added} sess) + welcome ${fp.includes('welcomeMessage') ? 'réécrit' : 'OK'}` };
  },
});

// === Exécution ===
console.log(`\n${DRY_RUN ? '🔍 DRY-RUN' : '🚀 PUSH'} — Phase A (4 patches conversion validés)\n`);

for (const patch of patches) {
  console.log(`▸ ${patch.label}`);
  try {
    const doc = await getDoc(patch.id);
    writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-phaseA-${patch.id}-${Date.now()}.json`, JSON.stringify(doc, null, 2));
    const { fieldPaths, info } = await patch.apply(doc);
    console.log(`  ${info}`);
    if (fieldPaths.length === 0) {
      console.log(`  ⚠ Aucune modification`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  🔍 Dry-run — fields: ${fieldPaths.join(', ')}`);
    } else {
      await patchDoc(patch.id, doc, fieldPaths);
      console.log(`  ✓ Push réussi (${fieldPaths.join(', ')})`);
    }
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
  }
  console.log();
}

console.log(`✅ Phase A terminée`);
