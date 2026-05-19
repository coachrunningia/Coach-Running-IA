/**
 * Validation des inputs pour les plans des dernières 24h.
 * Pour chaque plan : extrait précisément les données qui ont déterminé
 * les diagnostics de l'agent expert, pour confirmer ou réfuter.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const PLAN_IDS = [
  ['1778648613186', 'deugnilson — Trail 20km/1300m FREEMIUM'],
  ['1778654056401', 'deugnilson — Trail 20km/1300m PAYANT 19sem'],
  ['1778654000218', 'lameymichel@yahoo — Trail 105km'],
  ['1778667864907', 'garrel.florian — Trail 28km/1000m'],
  ['1778669503908', 'lamey.michel — Trail 105km (2e Michel)'],
  ['1778673418021', 'bruno.grange — 5km en 20min'],
  ['1778675188561', 'mainmain — Semi 1h45'],
  ['1778677412470', 'estenoza.tom — Trail 87km hanche'],
  ['1778615277138', 'arnaudmanoeuvre — Semi 1h30 PAYANT 24sem'],
];

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

for (const [id, label] of PLAN_IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) { log(`\n## ${label} (${id}) — PLAN INTROUVABLE`); continue; }
  const p = { id, ...pf(j.fields) };
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };

  log(`\n${'═'.repeat(110)}`);
  log(`## ${label}  •  ${id}`);
  log(`${'═'.repeat(110)}`);

  // INPUTS CLÉS POUR VALIDATION
  const weight = profile.weight;
  const height = profile.height;
  const bmi = (weight && height) ? weight / ((height/100)**2) : null;
  const age = profile.age;
  const sex = profile.sex;
  const exp = profile.experience;
  const level = profile.level;
  const curVol = profile.currentVolume;
  const freq = profile.frequency;
  const inj = profile.injuries || {};
  const hasInj = !!inj.hasInjury;
  const injDesc = inj.description || '';
  const rt = profile.recentRaceTimes || {};
  const hasChrono = !!(rt.distance5km || rt.distance10km || rt.distanceHalfMarathon || rt.distanceMarathon);

  log(``);
  log(`### PROFIL DÉCLARÉ`);
  log(`- Email           : ${p.userEmail}`);
  log(`- Âge / Sexe      : ${age||'?'} ans / ${sex||'?'}`);
  log(`- Taille / Poids  : ${height||'?'}cm / ${weight||'?'}kg  →  IMC ${bmi?bmi.toFixed(1):'?'}`);
  log(`- Niveau déclaré  : ${level||'?'}`);
  log(`- Expérience      : ${exp||'?'}`);
  log(`- Fréquence demandée : ${freq||'?'}sé/sem`);
  log(`- Volume actuel   : ${curVol !== undefined && curVol !== null ? curVol+'km/sem' : '⚠️ NON DÉCLARÉ'}`);
  log(`- Chronos saisis  : ${hasChrono ? 'OUI' : '❌ NON'}`);
  if (hasChrono) {
    if (rt.distance5km) log(`    • 5km     : ${rt.distance5km}`);
    if (rt.distance10km) log(`    • 10km    : ${rt.distance10km}`);
    if (rt.distanceHalfMarathon) log(`    • Semi    : ${rt.distanceHalfMarathon}`);
    if (rt.distanceMarathon) log(`    • Marathon: ${rt.distanceMarathon}`);
  }
  log(`- Blessure        : ${hasInj ? `OUI — "${injDesc}"` : 'Non'}`);
  log(`- Objectif        : ${p.goal} ${p.subGoal?`(${p.subGoal})`:''} ${profile.trailDetails?` — ${profile.trailDetails.distance}km / ${profile.trailDetails.elevation}m D+`:''}`);
  log(`- Cible           : ${p.targetTime || 'Finisher'}`);
  log(`- Durée plan      : ${p.durationWeeks} sem`);

  log(``);
  log(`### VMA & FAISABILITÉ`);
  log(`- VMA calculée    : ${p.vma?.toFixed?.(1) || '?'} km/h`);
  log(`- VMA source      : ${p.vmaSource || ctx.vmaSource || '?'}`);
  log(`- Faisabilité     : ${p.feasibility?.status || '?'}`);
  // Vérif "confabulation volume"
  const msg = p.feasibility?.message || '';
  const volMatch = msg.match(/volume actuel.*?(\d+)\s*km/i);
  if (volMatch && (curVol === undefined || curVol === null)) {
    log(`- ⚠️ CONFABULATION  : message dit "${volMatch[1]} km/sem" mais champ currentVolume vide en base`);
  } else if (volMatch && parseInt(volMatch[1]) !== curVol) {
    log(`- ⚠️ INCOHÉRENCE   : message dit "${volMatch[1]} km" mais base contient ${curVol} km`);
  }

  log(``);
  log(`### S1 — RÉSUMÉ DES SÉANCES`);
  const s1 = p.weeks?.[0]?.sessions || [];
  let totalKm = 0, totalDplus = 0;
  const typeCounts = {};
  s1.forEach((s, i) => {
    const km = parseFloat(String(s.distance||'0').replace(',','.').replace(/[^0-9.]/g,''));
    if (!isNaN(km) && !/renfo|mobilit|cross|repos/i.test(s.type||'')) totalKm += km;
    totalDplus += s.elevationGain || 0;
    typeCounts[s.type||'Autre'] = (typeCounts[s.type||'Autre']||0)+1;
    log(`  ${i+1}. ${s.day} | ${(s.type||'?').padEnd(15)} | "${(s.title||'').substring(0,40)}" | ${s.duration||'?'} | ${s.distance||'-'} | D+${s.elevationGain||0}m | ${s.targetPace||'-'} | ${s.intensity||'-'}`);
  });
  log(`  ─────────────────`);
  log(`  Total vol course : ${totalKm.toFixed(1)} km  •  Total D+ : ${totalDplus} m`);
  // Vérif doublons SL
  const slCount = s1.filter(s => /longue/i.test(s.type||'')).length;
  if (slCount > 1) log(`  ⚠️ ${slCount} séances type "Sortie Longue" la même semaine !`);
  // Vérif D+ 0 sur séance dite vallonnée
  s1.forEach(s => {
    const title = (s.title||'').toLowerCase();
    if (/vallonn|colline|côte|d\+|denivel/i.test(title) && (!s.elevationGain || s.elevationGain === 0)) {
      log(`  ⚠️ "${s.title}" évoque relief mais elevationGain=${s.elevationGain||0}m`);
    }
  });

  log(``);
  log(`### MESSAGE D'ACCUEIL`);
  log(`Statut : ${p.feasibility?.status}`);
  log(`Message: "${msg}"`);
  log(`Warning: "${p.feasibility?.safetyWarning || ''}"`);
}

writeFileSync('validate-inputs-24h.md', out.join('\n'));
console.log(`\n💾 validate-inputs-24h.md`);
