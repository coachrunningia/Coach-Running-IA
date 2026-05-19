import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_IDS = [
  ['1774714600748', 'COMPTE ADMIN programme@coachrunningia.fr — Semi 1h45 17 sem complet (créé 28 mars)'],
  ['1778707652579', 'albertpiro13@yahoo.fr — Trail 40km/2000m freemium S1 (créé 13 mai 21:27)'],
];

function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const lines = [];
const log = (...a) => { lines.push(a.join(' ')); };

log('# AUDIT 2 PLANS SUPPLÉMENTAIRES');
log('');

for (const [id, label] of PLAN_IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers: { 'Authorization': `Bearer ${access_token}` } });
  const j = await r.json();
  if (!j.fields) { log(`\n## ${label} — INTROUVABLE`); continue; }
  const p = { id, ...pf(j.fields) };
  const ctx = p.generationContext || {}; const q = ctx.questionnaireData || {}; const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };
  log(``);
  log(`---`);
  log(`## ${label}`);
  log(``);
  log(`**Plan ID**: ${p.id}  •  **Créé**: ${new Date(p.createdAt).toLocaleString('fr-FR')}  •  **${(p.weeks||[]).length}/${p.durationWeeks} sem**`);
  log(`### Profil`);
  log(`- Âge: ${profile.age||'?'}  •  Sexe: ${profile.sex||'?'}  •  H/P: ${profile.height||'?'}cm/${profile.weight||'?'}kg → IMC ${profile.weight && profile.height ? (profile.weight/((profile.height/100)**2)).toFixed(1) : '?'}`);
  log(`- Niveau: ${profile.level||'?'}  •  Vol actuel: ${profile.currentWeeklyVolume ?? '⚠️'}  •  Fréq: ${profile.frequency||'?'}`);
  const rt = profile.recentRaceTimes || {};
  const chronos = []; if(rt.distance5km)chronos.push(`5km: ${rt.distance5km}`); if(rt.distance10km)chronos.push(`10km: ${rt.distance10km}`); if(rt.distanceHalfMarathon)chronos.push(`semi: ${rt.distanceHalfMarathon}`); if(rt.distanceMarathon)chronos.push(`mara: ${rt.distanceMarathon}`);
  log(`- Chronos: ${chronos.length ? chronos.join(' • ') : '⚠️'}`);
  const inj = profile.injuries||{}; log(`- Blessure: ${inj.hasInjury ? `OUI — "${inj.description}"` : 'non'}`);
  log(`### Objectif`);
  log(`- ${p.goal} ${p.subGoal||''}${profile.trailDetails?` — ${profile.trailDetails.distance}km/${profile.trailDetails.elevation}m`:''}  •  Cible: ${p.targetTime||'Finisher'}  •  ${p.durationWeeks} sem`);
  log(`### Faisabilité`);
  log(`- Statut: ${p.feasibility?.status||'?'}  •  VMA: ${p.vma?.toFixed?.(2)||'?'}  •  Source: ${p.vmaSource||'?'}`);
  log(`- Message: "${p.feasibility?.message||''}"`);
  log(`- Warning: "${p.feasibility?.safetyWarning||''}"`);
  log(`### Allures`);
  const paces = p.paces||{};
  log(`- EF: ${paces.efPace} • Récup: ${paces.recoveryPace} • Seuil: ${paces.seuilPace} • VMA: ${paces.vmaPace}`);

  // Pour le plan complet 17 sem (admin) : show all weeks summary
  const weeks = p.weeks || [];
  if (weeks.length > 1) {
    log(`### Synthèse semaines (volume + D+ total + nb séances)`);
    weeks.forEach((w, i) => {
      const sessions = w.sessions || [];
      const kmTotal = sessions.reduce((s,x)=>{const km=parseFloat(String(x.distance||'0').replace(',','.').replace(/[^0-9.]/g,''));return s+(isNaN(km)?0:km);},0);
      const dPlus = sessions.reduce((s,x)=>s+(x.elevationGain||0),0);
      const types = sessions.map(s=>s.type).join('+');
      log(`- S${i+1} (${w.phase||'?'}): ${kmTotal.toFixed(0)}km / ${dPlus}m D+ / ${sessions.length}sé : ${types}`);
    });
  }

  log(`### S1 détaillée (phase: ${weeks[0]?.phase}, theme: ${weeks[0]?.theme})`);
  const s1 = weeks[0]?.sessions || [];
  for (let i=0; i<s1.length; i++) {
    const s = s1[i];
    log(``);
    log(`#### S1 séance ${i+1} — ${s.day} : ${s.title}`);
    log(`- Type: ${s.type} • Intensité: ${s.intensity} • Durée: ${s.duration} • Distance: ${s.distance||'-'} • D+: ${s.elevationGain||0}m • Allure: ${s.targetPace||'-'}`);
    log(`- **Warmup**: ${s.warmup||'-'}`);
    log(`- **MainSet**: ${s.mainSet||'-'}`);
    log(`- **Cooldown**: ${s.cooldown||'-'}`);
    log(`- **Advice**: ${s.advice||'-'}`);
  }
}

writeFileSync('dump-2-plans-extra.md', lines.join('\n'));
console.log(`Dump écrit : dump-2-plans-extra.md (${lines.length} lignes)`);
