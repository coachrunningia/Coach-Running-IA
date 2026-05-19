/**
 * Dump complet des 10 utilisateurs (11 plans) du 13 mai pour audit coach expert.
 * Inclut le contenu détaillé S1 avec toutes les séances + warmup/mainSet/cooldown/advice.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const PLAN_IDS = [
  ['1778702412108', 'Adrien (adrien_marcourt@hotmail.fr)'],
  ['1778695294712', 'Karine (thuries.karine@gmail.com)'],
  ['1778694780414', 'Élodie (epouymayon@gmail.com)'],
  ['1778684157393', 'Nicolas (nicolasdts99@gmail.com) - 2e tentative'],
  ['1778682781778', 'Nicolas (nicolasdts99@gmail.com) - 1ère tentative'],
  ['1778677412470', 'Tom (estenoza.tom@gmail.com)'],
  ['1778675188561', 'RomainGIROD/mainmain (mainmain@free.fr)'],
  ['1778673418021', 'Bruno (bruno.grange13@gmail.com)'],
  ['1778669503908', 'Michel gmail (lamey.michel@gmail.com)'],
  ['1778667864907', 'Florian (garrel.florian@gmail.com)'],
  ['1778654000218', 'Michel yahoo (lameymichel@yahoo.fr)'],
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

const lines = [];
const log = (...a) => { lines.push(a.join(' ')); };

log(`# AUDIT COACH EXPERT — 11 plans / 10 coureurs du 13 mai 2026`);
log(``);
log(`Critères demandés : volume total, volume séance la plus longue, cohérence allures,`);
log(`cohérence santé/objectif, contenu séances et variations, contenu renforcement.`);
log(``);

for (const [id, label] of PLAN_IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) { log(`\n## ${label} — PLAN INTROUVABLE`); continue; }
  const p = { id, ...pf(j.fields) };
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };

  log(``);
  log(`---`);
  log(``);
  log(`## ${label}`);
  log(``);
  log(`**Plan ID**: ${p.id}  •  **Créé**: ${new Date(p.createdAt).toLocaleString('fr-FR')}  •  **${(p.weeks||[]).length}/${p.durationWeeks} sem**`);
  log(``);
  log(`### Profil`);
  log(`- Âge: ${profile.age||'?'} ans  •  Sexe: ${profile.sex||'?'}`);
  log(`- Taille/Poids: ${profile.height||'?'}cm / ${profile.weight||'?'}kg  →  IMC ${profile.weight && profile.height ? (profile.weight/((profile.height/100)**2)).toFixed(1) : '?'}`);
  log(`- Niveau déclaré: ${profile.level||'?'}`);
  log(`- Volume actuel: ${profile.currentWeeklyVolume ?? '⚠️ NON DÉCLARÉ'} km/sem`);
  log(`- D+ actuel: ${profile.currentWeeklyElevation ?? '⚠️ NON DÉCLARÉ'} m/sem`);
  log(`- Fréquence demandée: ${profile.frequency||'?'} séances/sem`);
  const rt = profile.recentRaceTimes || {};
  const chronos = [];
  if (rt.distance5km) chronos.push(`5km: ${rt.distance5km}`);
  if (rt.distance10km) chronos.push(`10km: ${rt.distance10km}`);
  if (rt.distanceHalfMarathon) chronos.push(`semi: ${rt.distanceHalfMarathon}`);
  if (rt.distanceMarathon) chronos.push(`marathon: ${rt.distanceMarathon}`);
  log(`- Chronos: ${chronos.length ? chronos.join(' • ') : '⚠️ AUCUN'}`);
  const inj = profile.injuries || {};
  log(`- Blessure: ${inj.hasInjury ? `OUI — "${inj.description}"` : 'non'}`);
  log(``);
  log(`### Objectif`);
  log(`- ${p.goal} ${p.subGoal?`(${p.subGoal})`:''}${profile.trailDetails?` — ${profile.trailDetails.distance}km / ${profile.trailDetails.elevation}m D+`:''}`);
  log(`- Cible: ${p.targetTime || 'Finisher'}`);
  log(`- Durée plan: ${p.durationWeeks} sem`);
  log(``);
  log(`### Faisabilité`);
  log(`- **Statut**: ${p.feasibility?.status||'?'}`);
  log(`- Score confiance: ${p.feasibility?.confidenceScore ?? '?'}/100`);
  log(`- Message: "${p.feasibility?.message||''}"`);
  log(`- Warning: "${p.feasibility?.safetyWarning||''}"`);
  log(``);
  log(`### VMA & Allures`);
  log(`- VMA calculée: ${p.vma?.toFixed?.(2) || p.vma || '?'} km/h`);
  log(`- Source: ${p.vmaSource || ctx.vmaSource || '?'}`);
  const paces = p.paces || {};
  log(`- EF: ${paces.efPace||'?'}/km  •  Récup: ${paces.recoveryPace||'?'}/km  •  Seuil: ${paces.seuilPace||'?'}/km  •  VMA: ${paces.vmaPace||'?'}/km`);
  if (paces.allureSpecifiqueMarathon) log(`- Allure marathon: ${paces.allureSpecifiqueMarathon}/km`);
  if (paces.allureSpecifiqueSemi) log(`- Allure semi: ${paces.allureSpecifiqueSemi}/km`);
  if (paces.allureSpecifique10k) log(`- Allure 10k: ${paces.allureSpecifique10k}/km`);
  if (paces.allureSpecifique5k) log(`- Allure 5k: ${paces.allureSpecifique5k}/km`);

  log(``);
  log(`### Périodisation prévue`);
  const period = ctx.periodizationPlan || {};
  if (period.weeklyVolumes) log(`- Volumes prévus (km): ${period.weeklyVolumes.join(', ')}`);
  if (period.weeklyPhases) log(`- Phases hebdo: ${period.weeklyPhases.join(' → ')}`);
  if (period.recoveryWeeks) log(`- Semaines de récup: ${period.recoveryWeeks.join(', ') || 'aucune'}`);

  log(``);
  log(`### Semaine 1 — phase: ${p.weeks?.[0]?.phase || '?'}, theme: ${p.weeks?.[0]?.theme || '?'}`);
  const s1 = p.weeks?.[0]?.sessions || [];
  for (let i = 0; i < s1.length; i++) {
    const s = s1[i];
    log(``);
    log(`#### S1 séance ${i+1} — ${s.day} : ${s.title}`);
    log(`- Type: ${s.type}  •  Intensité: ${s.intensity}  •  Durée: ${s.duration}  •  Distance: ${s.distance||'-'}  •  D+: ${s.elevationGain||0}m  •  Allure cible: ${s.targetPace||'-'}`);
    log(`- **Warmup**: ${s.warmup || '-'}`);
    log(`- **MainSet**: ${s.mainSet || '-'}`);
    log(`- **Cooldown**: ${s.cooldown || '-'}`);
    log(`- **Advice**: ${s.advice || '-'}`);
  }
}

writeFileSync('dump-10-plans-coach.md', lines.join('\n'));
console.log(`Dump écrit : dump-10-plans-coach.md (${lines.length} lignes)`);

