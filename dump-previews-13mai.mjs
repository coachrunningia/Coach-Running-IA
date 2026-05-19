/**
 * Dump complet des 7 previews du 13 mai pour analyse par agent expert.
 * Inclut : profil complet, contexte, S1 séance par séance avec mainSet complet.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

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

const IDS = ['1778648613186','1778654000218','1778667864907','1778669503908','1778673418021','1778675188561','1778677412470'];
const lines = [];
const log = (...a) => { const s = a.join(' '); lines.push(s); };

log(`# AUDIT EXPERT — 7 plans PREVIEW du 13 mai 2026\n`);
log(`Objectif : critique experte des volumes, descriptions, cohérence avec objectifs.\n`);

for (const id of IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  const p = { id: j.name.split('/').pop(), ...pf(j.fields) };
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q }; // q prioritaire

  log(`\n\n${'═'.repeat(100)}`);
  log(`## PLAN ${p.id} — ${p.name}`);
  log(`${'═'.repeat(100)}\n`);
  log(`**User** : ${p.userEmail}  •  ${new Date(p.createdAt).toLocaleString('fr-FR')}\n`);
  log(`### Profil complet`);
  log(`- Email : ${p.userEmail}`);
  log(`- Prénom : ${profile.firstName || '?'}`);
  log(`- Âge : ${profile.age || '?'} ans`);
  log(`- Sexe : ${profile.sex || '?'}`);
  log(`- Taille : ${profile.height || '?'} cm  •  Poids : ${profile.weight || '?'} kg`);
  log(`- Niveau déclaré : ${profile.level || '?'}`);
  log(`- Expérience : ${profile.experience || '?'}`);
  log(`- Fréquence souhaitée : ${profile.frequency || '?'} séances/sem`);
  log(`- Volume actuel : ${profile.currentVolume || '?'} km/sem`);
  log(`- Jours préférés : ${(profile.preferredDays || []).join(', ') || '?'}`);
  log(`- Jour SL préféré : ${profile.preferredLongRunDay || '?'}`);
  log(`- Chronos référence :`);
  const rt = profile.recentRaceTimes || {};
  if (rt.distance5km) log(`    • 5 km : ${rt.distance5km}`);
  if (rt.distance10km) log(`    • 10 km : ${rt.distance10km}`);
  if (rt.distanceHalfMarathon) log(`    • Semi : ${rt.distanceHalfMarathon}`);
  if (rt.distanceMarathon) log(`    • Marathon : ${rt.distanceMarathon}`);
  if (!rt.distance5km && !rt.distance10km && !rt.distanceHalfMarathon && !rt.distanceMarathon) log(`    • Aucun chrono déclaré`);
  log(`- Blessures :`);
  const inj = profile.injuries || {};
  if (inj.hasInjury) log(`    • OUI : "${inj.description || '?'}"`);
  else log(`    • Non`);
  log(`- VMA calculée : ${p.vma?.toFixed?.(1) || '?'} km/h  •  Source : ${p.vmaSource || ctx.vmaSource || '?'}\n`);

  log(`### Objectif`);
  log(`- Type : ${p.goal} ${p.subGoal?`(${p.subGoal})`:''}`);
  if (profile.trailDetails) log(`- Trail : ${profile.trailDetails.distance} km / ${profile.trailDetails.elevation} m D+`);
  log(`- Temps visé : ${p.targetTime || 'Finisher'}`);
  log(`- Durée plan : ${p.durationWeeks} semaines`);
  log(`- Date début : ${p.startDate}  •  Date course : ${profile.raceDate || '?'}`);
  log(`- Faisabilité : ${p.feasibility?.status}`);
  log(`- Message d'accueil : "${p.feasibility?.message || ''}"`);
  log(`- Warning : "${p.feasibility?.safetyWarning || ''}"\n`);

  log(`### Périodisation (12 phases prévues)`);
  const period = ctx.periodizationPlan;
  if (period) {
    log(`- Phases hebdo : ${(period.weeklyPhases || []).join(' → ')}`);
    log(`- Volumes hebdo prévus (km) : ${(period.weeklyVolumes || []).join(', ')}`);
    log(`- Semaines de récup : ${(period.recoveryWeeks || []).join(', ') || 'aucune'}`);
  }
  log(``);

  log(`### Allures cibles calculées`);
  const paces = p.paces || {};
  log(`- EF : ${paces.efPace || '?'}/km`);
  log(`- EA (allure active) : ${paces.eaPace || '?'}/km`);
  log(`- Récupération : ${paces.recoveryPace || '?'}/km`);
  log(`- Seuil : ${paces.seuilPace || '?'}/km`);
  log(`- VMA : ${paces.vmaPace || '?'}/km`);
  log(`- Allure marathon : ${paces.allureSpecifiqueMarathon || '?'}/km`);
  log(`- Allure semi : ${paces.allureSpecifiqueSemi || '?'}/km`);
  log(`- Allure 10k : ${paces.allureSpecifique10k || '?'}/km`);
  log(`- Allure 5k : ${paces.allureSpecifique5k || '?'}/km\n`);

  log(`### Semaine 1 (déployée) — phase: ${p.weeks?.[0]?.phase || '?'}, thème: ${p.weeks?.[0]?.theme || '?'}`);
  const s1 = p.weeks?.[0]?.sessions || [];
  for (let i=0; i<s1.length; i++) {
    const s = s1[i];
    log(``);
    log(`#### Séance ${i+1} — ${s.day} : ${s.title}`);
    log(`- Type : ${s.type}  •  Intensité : ${s.intensity}  •  Durée : ${s.duration}  •  Distance : ${s.distance||'-'}  •  D+ : ${s.elevationGain||0}m`);
    log(`- Allure cible : ${s.targetPace || '-'}`);
    log(`- Warmup : ${s.warmup || '-'}`);
    log(`- MainSet : ${s.mainSet || '-'}`);
    log(`- Cooldown : ${s.cooldown || '-'}`);
    log(`- Advice : ${s.advice || '-'}`);
  }
}

writeFileSync('dump-previews-13mai.md', lines.join('\n'));
console.log(`Dump complet écrit dans dump-previews-13mai.md (${lines.length} lignes)`);
