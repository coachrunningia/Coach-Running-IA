/**
 * Phase B — Patches Firebase avec compromis + messages préventifs :
 * 1. Arnaud : remonter pic à 35 km (compromis 28-45)
 * 2. Charlotte : ajouter message préventif "plan long" dans welcomeMessage
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

// === 1. Arnaud — remonter pic 28 → 35 km ===
async function patchArnaud() {
  const doc = await getDoc('1778521479387');
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-phaseB-arnaud-${Date.now()}.json`, JSON.stringify(doc, null, 2));

  // Nouveaux volumes (compromis : pic 35 km, 2 séances course + 1 renfo)
  // Mardi + Dimanche couvrent tout le volume course
  const newPlan = [
    { mar: 10, dim: 16 }, // S1: 26
    { mar: 11, dim: 18 }, // S2: 29
    { mar: 12, dim: 19 }, // S3: 31 — fin fondamental
    { mar: 9, dim: 14 },  // S4: 23 — récup
    { mar: 12, dim: 18 }, // S5: 30
    { mar: 13, dim: 20 }, // S6: 33
    { mar: 13, dim: 21 }, // S7: 34 — intro tempo
    { mar: 10, dim: 16 }, // S8: 26 — récup
    { mar: 13, dim: 20 }, // S9: 33 — dev tempo
    { mar: 14, dim: 20 }, // S10: 34
    { mar: 14, dim: 21 }, // S11: 35 — pic
    { mar: 10, dim: 16 }, // S12: 26 — récup finale
  ];

  for (let i = 0; i < doc.weeks.length && i < newPlan.length; i++) {
    const w = doc.weeks[i];
    const newVols = newPlan[i];
    for (const s of (w.sessions || [])) {
      if (s.type === 'Renforcement') continue;
      let newKm = null;
      if (s.day === 'Mardi') newKm = newVols.mar;
      else if (s.day === 'Dimanche') newKm = newVols.dim;
      if (newKm !== null) {
        const oldKm = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
        // Recalculer durée à partir du pace existant
        const pm = String(s.targetPace || '5:32').match(/(\d+):(\d+)/);
        if (pm) {
          const paceSec = parseInt(pm[1]) * 60 + parseInt(pm[2]);
          const newDurMin = Math.round((newKm * paceSec) / 60);
          const h = Math.floor(newDurMin / 60);
          const m = newDurMin % 60;
          s.distance = `${newKm} km`;
          s.duration = h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${newDurMin} min`;
        }
      }
    }
  }

  // welcomeMessage adapté au nouveau volume
  doc.welcomeMessage = `Bienvenue dans ton programme de 12 semaines pour la perte de poids — version révisée.

Volume cible : 23 à 35 km/sem (≈ 2h30 à 3h30 de course par semaine). Ton profil de coureur expérimenté (Marathon 3h10, VMA 16.2 km/h) supporte largement ce volume — c'est un compromis entre la prudence "perte de poids" et le maintien de ta condition aérobie acquise (un Marathon 3h10 a besoin d'un minimum de stimulation pour ne pas régresser).

**Important pour la perte de poids :** la course seule suffit rarement à perdre du poids significativement. Vise un déficit calorique de 300 à 500 kcal par jour via l'alimentation (légèrement moins manger, pas drastique). Sans cela, l'entraînement seul produira peu de résultats sur la balance, même si tes performances et ton bien-être progresseront.

**Structure (3 séances/sem, Mardi/Jeudi/Dimanche) :**
- Mardi : footing EF 10-14 km (puis intervalles tempo à partir de la S7)
- Jeudi : renforcement compound (45 min — squat, soulevé de terre, fentes, gainage)
- Dimanche : sortie longue 16-21 km (pilier du plan, durée Z2 pour oxydation lipidique)

**Pic en S11 (35 km/sem)** : Mardi tempo 14 km + renfo + Dimanche SL 21 km progressif. Cycle 3+1 avec décharges en S4 et S8. Pas d'affûtage (programme glissant renouvelable).

**Option (recommandée) :** si tu peux ajouter 1 séance hebdo de force compound (squat, soulevé de terre, fentes lestées, 30 min) à un autre moment de la semaine, l'effet sur la masse maigre et le métabolisme de repos sera nettement supérieur.

Bon entraînement.`;

  if (DRY_RUN) {
    console.log(`  Arnaud nouveau volumes :`);
    doc.weeks.forEach((w, i) => {
      const v = w.sessions.filter(s => s.type !== 'Renforcement').reduce((sum, s) => sum + (parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0), 0);
      console.log(`    S${i+1}: ${v} km`);
    });
    return;
  }
  await patchDoc('1778521479387', doc, ['weeks', 'welcomeMessage']);
  console.log(`  ✓ Arnaud — pic remonté à 35 km, 12 sem patchées`);
}

// === 2. Charlotte — message préventif "plan long" ===
async function patchCharlotte() {
  const doc = await getDoc('1778514063928');
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-phaseB-charlotte-${Date.now()}.json`, JSON.stringify(doc, null, 2));

  const existingWm = doc.welcomeMessage || '';
  // Ajouter mention préventive plan long
  const preventiveAddition = `

⚠ **Plan long (30 semaines) — vigilance adhérence** : les plans de plus de 24 semaines ont un taux d'abandon élevé chez les coureurs en construction (motivation, blessures, vie pro/perso). Pour maximiser tes chances :
- Note tes séances dans un calendrier physique ou app pour rendre l'engagement concret
- Cherche un partenaire d'entraînement ou un groupe local
- Si tu décroches 1-2 semaines, REPRENDS où tu en étais — pas la peine de tout recommencer
- À mi-parcours (S15), évalue : si motivation faible, on peut basculer sur un objectif intermédiaire (10 km route, 5 km en marche/course) avant de retenter l'Hyrox plus tard
- La régularité prime sur la perfection. 70% des séances réalisées = bon résultat`;

  if (!/30 semaines.*vigilance/i.test(existingWm)) {
    doc.welcomeMessage = existingWm + preventiveAddition;
  }

  if (DRY_RUN) {
    console.log(`  Charlotte welcomeMessage allongé de ${preventiveAddition.length} caractères`);
    return;
  }
  await patchDoc('1778514063928', doc, ['welcomeMessage']);
  console.log(`  ✓ Charlotte — mention préventive plan long ajoutée`);
}

// === Exécution ===
console.log(`\n${DRY_RUN ? '🔍 DRY-RUN' : '🚀 PUSH'} — Phase B (compromis + messages préventifs)\n`);
console.log(`▸ Arnaud — remonter pic 28 → 35 km`);
await patchArnaud();
console.log(`\n▸ Charlotte — message préventif plan long`);
await patchCharlotte();
console.log(`\n✅ Phase B terminée`);
