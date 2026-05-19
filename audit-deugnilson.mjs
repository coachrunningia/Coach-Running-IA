/**
 * Audit complet — plans du client deugnilson@gmail.com
 * Run: node audit-deugnilson.mjs
 *
 * Couvre : distance, message d'accueil, allures, cohérence,
 * volume hebdo, évolution volume, SL max, diversité séances.
 */
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const TARGET_EMAIL = 'deugnilson@gmail.com';
const PROJECT = 'coach-running-ia';

async function getAccessToken() {
  // Tente Firebase CLI d'abord (utilisé dans les autres scripts d'audit)
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
    const refresh = cfg.tokens?.refresh_token;
    if (refresh) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh,
          client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
          client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
        }),
      });
      const j = await res.json();
      if (j.access_token) return j.access_token;
      console.error('Firebase refresh failed:', j);
    }
  } catch (e) {
    console.error('Firebase token unavailable:', e.message);
  }
  // Fallback gcloud
  const { execSync } = await import('child_process');
  return execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
}
const access_token = await getAccessToken();

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

async function queryByEmail(email) {
  // Pas d'index composite (userEmail, createdAt) — on scanne par createdAt et filtre côté client.
  const needle = email.toLowerCase();
  const all = [];
  let lastCreatedAt = null;
  while (true) {
    const sq = {
      from: [{ collectionId: 'plans' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300,
    };
    if (lastCreatedAt) sq.where = { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } };
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: sq }),
    });
    const data = await res.json();
    const docs = (Array.isArray(data) ? data : []).filter(r => r.document);
    if (docs.length === 0) break;
    for (const r of docs) {
      const obj = { id: r.document.name.split('/').pop(), _createTime: r.document.createTime, ...pf(r.document.fields) };
      if ((obj.userEmail || '').toLowerCase() === needle) all.push(obj);
    }
    lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
    if (!lastCreatedAt || docs.length < 300) break;
    if (all.length >= 50) break;
  }
  return all;
}

// ============== UTILS ALLURES ==============
function paces(vma) {
  if (!vma) return null;
  const f = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
  return {
    EF:        { pace: `${f(vma*0.70)}–${f(vma*0.65)}`, label: 'EF (65–70 % VMA)' },
    SL:        { pace: `${f(vma*0.72)}–${f(vma*0.65)}`, label: 'SL (65–72 % VMA)' },
    Marathon:  { pace: `${f(vma*0.82)}–${f(vma*0.78)}`, label: 'Marathon (78–82 %)' },
    Semi:      { pace: `${f(vma*0.86)}–${f(vma*0.82)}`, label: 'Semi (82–86 %)' },
    Seuil:     { pace: `${f(vma*0.90)}–${f(vma*0.85)}`, label: 'Seuil (85–90 %)' },
    VMAcourte: { pace: `${f(vma*1.05)}–${f(vma*1.00)}`, label: 'VMA courte (100–105 %)' },
    VMAlongue: { pace: `${f(vma*1.00)}–${f(vma*0.95)}`, label: 'VMA longue (95–100 %)' },
  };
}
function paceToSec(p) {
  if (!p) return null;
  const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/);
  return m ? parseInt(m[1])*60 + parseInt(m[2]) : null;
}
function vmaPctFromPace(pace, vma) {
  const s = paceToSec(pace);
  if (!s || !vma) return null;
  return (3600/s) / vma;
}
function kmFromDistance(d) {
  if (d === null || d === undefined) return 0;
  const v = parseFloat(String(d).replace(',', '.').replace(/[^0-9.]/g, ''));
  return isNaN(v) ? 0 : v;
}

// ============== AUDIT ==============
function auditPlan(p) {
  const issues = [];
  const weeks = p.weeks || [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const vma = p.vma || ctx.vma || 0;
  const ref = paces(vma);
  const curVol = ctx.currentVolume || q.currentVolume;
  const freq = p.sessionsPerWeek;
  const goal = (p.goal || '').toLowerCase();
  const subGoal = (p.subGoal || ctx.subGoal || '').toLowerCase();
  const trailDist = ctx.trailDistance || q.trailDistance;
  const inj = ctx.injuries || q.injuries;

  // ---- VMA plausibilité ----
  if (vma && (vma < 8 || vma > 24)) issues.push({sev:'🔴', cat:'Profil', msg:`VMA ${vma} hors plage plausible (8–24 km/h)`});

  // ---- 1. Message de bienvenue / feasibility ----
  const fb = p.feasibility || {};
  const welcome = fb.message || fb.welcomeMessage || p.welcomeMessage || '';
  const warning = fb.safetyWarning || '';
  if (!welcome || welcome.length < 20) {
    issues.push({sev:'🟡', cat:'Accueil', msg:`Message de bienvenue absent ou très court (${welcome.length} car.)`});
  }
  // Mentions interdites (poids / minceur) — rappel feedback global
  const banned = /poids|minceur|maigr|imc|kilo|silhouette|grossir|amaigriss/i;
  if (banned.test(welcome) || banned.test(warning)) {
    issues.push({sev:'🔴', cat:'Accueil', msg:`Mention poids/minceur détectée dans message — interdit`});
  }
  if (inj && !/aucun|non|rien|^$/i.test(String(inj)) && warning && !/blessur|kiné|médecin|professionnel/i.test(warning)) {
    issues.push({sev:'🟡', cat:'Accueil', msg:`Blessure "${inj}" déclarée mais safetyWarning sans rappel kiné/médecin`});
  }

  // ---- 2. Distances par séance ----
  const sessionsAll = weeks.flatMap(w => (w.sessions || []).map(s => ({...s, w: w.weekNumber})));
  const courseSessions = sessionsAll.filter(s => !/renfo|mobilit|cross/i.test(s.type||''));
  const noDist = courseSessions.filter(s => !s.distance || kmFromDistance(s.distance) === 0);
  if (courseSessions.length && noDist.length / courseSessions.length > 0.30) {
    issues.push({sev:'🟡', cat:'Distance', msg:`${noDist.length}/${courseSessions.length} séances course sans distance renseignée`});
  }

  // ---- 3. Allures ----
  if (vma) {
    for (const w of weeks) for (const s of (w.sessions || [])) {
      if (!s.targetPace) continue;
      const pct = vmaPctFromPace(s.targetPace, vma);
      if (pct === null) continue;
      const intensity = (s.intensity || '').toLowerCase();
      const type = (s.type || '').toLowerCase();
      let expected = null, label = '';
      if (type.includes('longue') || intensity.includes('facile') || type.includes('récup') || type.includes('recup')) {
        expected = [0.62, 0.74]; label = 'EF/SL';
      } else if (type.includes('seuil') || intensity.includes('seuil')) {
        expected = [0.82, 0.92]; label = 'seuil';
      } else if (type.includes('vma') || intensity.includes('vma') || intensity.includes('rapide')) {
        expected = [0.92, 1.08]; label = 'VMA';
      } else if (intensity.includes('marathon') || type.includes('marathon')) {
        expected = [0.75, 0.84]; label = 'marathon';
      } else if (intensity.includes('semi') || type.includes('semi')) {
        expected = [0.80, 0.88]; label = 'semi';
      }
      if (expected && (pct < expected[0] || pct > expected[1])) {
        const sev = (pct < expected[0] - 0.05 || pct > expected[1] + 0.05) ? '🔴' : '🟡';
        issues.push({sev, cat:'Allures', msg:`S${w.weekNumber} "${s.title}": ${s.targetPace} = ${(pct*100).toFixed(0)} %VMA vs ${label} (${(expected[0]*100).toFixed(0)}–${(expected[1]*100).toFixed(0)} %)`});
      }
    }
  }

  // ---- 4. Volume hebdo ----
  const volumes = weeks.map(w => (w.sessions || []).reduce((sum, s) => {
    if (/renfo|mobilit|cross/i.test(s.type||'')) return sum;
    return sum + kmFromDistance(s.distance);
  }, 0));

  // 4a. Saut S1 / volume actuel
  if (curVol && volumes[0] && volumes[0] > curVol * 1.30 && curVol > 5) {
    issues.push({sev:'🔴', cat:'Charge', msg:`S1 ${volumes[0].toFixed(1)}km vs actuel ${curVol}km/sem — bond +${((volumes[0]/curVol-1)*100).toFixed(0)} % (>30 %)`});
  }
  // 4b. Évolution volume hebdo (règle 10 %)
  for (let i = 1; i < volumes.length; i++) {
    if (volumes[i-1] > 8) {
      const j = (volumes[i] - volumes[i-1]) / volumes[i-1];
      if (j > 0.20) issues.push({sev:'🟡', cat:'Évolution', msg:`S${i}→S${i+1}: +${(j*100).toFixed(0)} % (${volumes[i-1].toFixed(0)}→${volumes[i].toFixed(0)}km) — règle des 10 %`});
    }
  }
  // 4c. Décharge
  let hasDeload = false;
  for (let i = 2; i < volumes.length; i++) {
    if (volumes[i] < volumes[i-1] * 0.85 && volumes[i] < volumes[i-2] * 0.85) hasDeload = true;
  }
  if (volumes.length >= 5 && !hasDeload) issues.push({sev:'🟡', cat:'Évolution', msg:`Pas de semaine de décharge sur ${volumes.length} sem — cycle 3+1 attendu`});

  // ---- 5. SL max hebdo ----
  const slDistances = weeks.map(w => {
    const sls = (w.sessions || []).filter(s => /longue/i.test(s.type||''));
    return Math.max(0, ...sls.map(s => kmFromDistance(s.distance)));
  });
  const slMax = Math.max(...slDistances, 0);
  // Cohérence SL max vs objectif
  let slCap = null;
  if (goal.includes('marathon') && !goal.includes('semi')) slCap = [28, 35];
  else if (goal.includes('semi') || subGoal.includes('semi') || subGoal.includes('21')) slCap = [16, 22];
  else if (subGoal.includes('10') || goal.includes('10km')) slCap = [10, 16];
  else if (trailDist >= 60) slCap = [Math.max(20, trailDist*0.4), trailDist*0.6];
  else if (trailDist >= 20) slCap = [trailDist*0.6, trailDist*0.85];
  if (slCap && slMax > 0) {
    if (slMax < slCap[0]) issues.push({sev:'🟡', cat:'SL', msg:`SL max = ${slMax.toFixed(0)}km — court vs cible (${slCap[0]}–${slCap[1]}km idéal pour ${p.goal})`});
    else if (slMax > slCap[1]) issues.push({sev:'🟡', cat:'SL', msg:`SL max = ${slMax.toFixed(0)}km — long vs cible (${slCap[0]}–${slCap[1]}km)`});
  }
  // SL > 25 % du volume hebdo = risque
  for (let i = 0; i < weeks.length; i++) {
    if (volumes[i] > 0 && slDistances[i] > volumes[i] * 0.45) {
      issues.push({sev:'🟡', cat:'SL', msg:`S${i+1}: SL ${slDistances[i]}km = ${(slDistances[i]/volumes[i]*100).toFixed(0)} % du volume hebdo — déséquilibré`});
    }
  }

  // ---- 6. Diversité séances ----
  const typeCounts = {};
  for (const s of sessionsAll) {
    const t = (s.type || 'Autre').trim();
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const typeKeys = Object.keys(typeCounts);
  if (weeks.length >= 4 && typeKeys.length < 3) {
    issues.push({sev:'🟡', cat:'Diversité', msg:`Seulement ${typeKeys.length} type(s) de séance sur ${weeks.length} sem (${typeKeys.join(', ')}) — manque de variété`});
  }
  // 80/20 facile/dur
  let easy = 0, hard = 0;
  for (const s of sessionsAll) {
    const intens = (s.intensity || '').toLowerCase();
    const type = (s.type || '').toLowerCase();
    if (type.includes('renfo') || type.includes('mobilit') || type.includes('cross')) continue;
    if (intens.includes('facile') || intens.includes('modéré') || type.includes('longue') || type.includes('récup')) easy++;
    else if (intens.includes('seuil') || intens.includes('vma') || intens.includes('rapide') || intens.includes('soutenu') || intens.includes('difficile')) hard++;
  }
  const total = easy + hard;
  if (total > 0) {
    const easyPct = easy / total;
    if (easyPct < 0.70) issues.push({sev:'🔴', cat:'Diversité', msg:`${(easyPct*100).toFixed(0)} % facile / ${(100-easyPct*100).toFixed(0)} % dur — trop de qualité (cible 80 %)`});
    else if (easyPct < 0.75) issues.push({sev:'🟡', cat:'Diversité', msg:`${(easyPct*100).toFixed(0)} % facile — limite basse vs cible 80 %`});
  }
  // Renfo
  const renfoCount = sessionsAll.filter(s => /renfo/i.test(s.type||'')).length;
  if (weeks.length >= 6 && renfoCount === 0) issues.push({sev:'🔴', cat:'Diversité', msg:`Aucun renforcement sur ${weeks.length} sem`});
  else if (weeks.length >= 6 && renfoCount < weeks.length * 0.7) issues.push({sev:'🟡', cat:'Diversité', msg:`${renfoCount} renfo sur ${weeks.length} sem (cible ≥1/sem)`});

  // ---- 7. Cohérence globale ----
  const dur = p.durationWeeks || weeks.length;
  if (goal.includes('marathon') && !goal.includes('semi') && dur < 12) issues.push({sev:'🔴', cat:'Cohérence', msg:`Marathon en ${dur} sem — minimum 12`});
  if ((goal.includes('semi') || subGoal.includes('semi')) && dur < 8) issues.push({sev:'🟡', cat:'Cohérence', msg:`Semi en ${dur} sem — minimum 8`});
  if (trailDist >= 100 && dur < 20) issues.push({sev:'🔴', cat:'Cohérence', msg:`Ultra ${trailDist}km en ${dur} sem — min 20`});
  if (trailDist >= 60 && trailDist < 100 && dur < 16) issues.push({sev:'🟡', cat:'Cohérence', msg:`Trail ${trailDist}km en ${dur} sem — min 16`});
  if (freq) {
    for (const w of weeks) {
      const real = (w.sessions || []).filter(s => !/renfo|mobilit|cross/i.test(s.type||'')).length;
      if (real > freq) { issues.push({sev:'🟡', cat:'Cohérence', msg:`S${w.weekNumber}: ${real} séances course vs ${freq} déclarées`}); break; }
    }
  }
  // Doublons jours
  for (const w of weeks) {
    const days = (w.sessions || []).map(s => s.day).filter(Boolean);
    const dupes = [...new Set(days.filter((d,i) => days.indexOf(d) !== i))];
    if (dupes.length) issues.push({sev:'🔴', cat:'Cohérence', msg:`S${w.weekNumber}: jours dupliqués [${dupes.join(', ')}]`});
  }

  return { issues, volumes, slDistances, slMax, easy, hard, typeCounts, renfoCount, welcome, warning, ref };
}

function note(issues, total) {
  const score = issues.reduce((s,i) => s + (i.sev==='🔴'?3:i.sev==='🟡'?1:0), 0);
  const ratio = total ? score/total : score;
  if (score === 0) return { lab:'A+', emoji:'🏆', desc:'Excellent' };
  if (ratio < 0.3) return { lab:'A', emoji:'✅', desc:'Très bon' };
  if (ratio < 0.6) return { lab:'B', emoji:'👍', desc:'Correct, ajustements mineurs' };
  if (ratio < 1.0) return { lab:'C', emoji:'⚠️', desc:'Moyen, à revoir' };
  return { lab:'D', emoji:'🚨', desc:'Problématique' };
}

// ============== MAIN ==============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

const plans = await queryByEmail(TARGET_EMAIL);
if (plans.length === 0) {
  console.log(`📭 Aucun plan trouvé pour ${TARGET_EMAIL}`);
  process.exit(0);
}

log(`\n${'═'.repeat(100)}`);
log(`  AUDIT CLIENT — ${TARGET_EMAIL}`);
log(`  ${plans.length} plan(s) trouvé(s)  •  Généré ${new Date().toLocaleString('fr-FR')}`);
log(`${'═'.repeat(100)}\n`);

for (let i = 0; i < plans.length; i++) {
  const p = plans[i];
  const a = auditPlan(p);
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const totalSessions = (p.weeks||[]).reduce((s,w) => s + (w.sessions||[]).length, 0);
  const n = note(a.issues, totalSessions);
  const vma = p.vma || ctx.vma || 0;
  const time = p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'}) : '?';
  const weeksDep = (p.weeks||[]).length;
  const isFree = (p.durationWeeks||0) >= 4 && weeksDep <= 1;

  log(`\n┌${'─'.repeat(98)}`);
  log(`│ ${n.emoji} PLAN ${i+1}/${plans.length} — Note ${n.lab} (${n.desc})`);
  log(`│ ${p.name || '(sans nom)'}`);
  log(`│ Créé: ${time}  •  ID: ${p.id}  •  ${weeksDep}/${p.durationWeeks||'?'} sem ${isFree?'(freemium S1)':'(payant)'}`);
  log(`│`);
  log(`│ ── PROFIL ──`);
  log(`│ VMA: ${vma||'?'} km/h  •  Niveau: ${p.level || ctx.level || '?'}  •  ${ctx.age||q.age||'?'} ans  •  ${ctx.sex||q.sex||'?'}`);
  log(`│ Vol actuel: ${ctx.currentVolume||q.currentVolume||'?'} km/sem  •  Expérience: ${ctx.experience||q.experience||'?'}`);
  log(`│ Blessures: ${ctx.injuries||q.injuries||'aucune'}`);
  log(`│ Objectif: ${p.goal || '?'} ${p.subGoal ? `(${p.subGoal})` : ''} ${ctx.trailDistance? `— trail ${ctx.trailDistance}km` : ''}`);
  log(`│ Cible: ${p.targetTime || 'Finisher'}  •  ${p.sessionsPerWeek||'?'} séances/sem  •  ${p.durationWeeks||'?'} sem`);
  log(`│`);
  log(`│ ── MESSAGE D'ACCUEIL (feasibility) ──`);
  log(`│ Statut: ${p.feasibility?.status || '?'}`);
  log(`│ Message: ${a.welcome ? `"${a.welcome.substring(0,180)}${a.welcome.length>180?'...':''}"` : '(vide)'}`);
  log(`│ Warning: ${a.warning ? `"${a.warning.substring(0,180)}${a.warning.length>180?'...':''}"` : '(aucun)'}`);
  log(`│`);
  log(`│ ── ALLURES THÉORIQUES (VMA ${vma||'?'}) ──`);
  if (a.ref) {
    log(`│ EF: ${a.ref.EF.pace}/km  •  SL: ${a.ref.SL.pace}/km  •  Seuil: ${a.ref.Seuil.pace}/km`);
    log(`│ VMA courte: ${a.ref.VMAcourte.pace}/km  •  VMA longue: ${a.ref.VMAlongue.pace}/km`);
  }
  log(`│`);
  log(`│ ── VOLUME HEBDO ──`);
  log(`│ Par semaine: ${a.volumes.map((v,i)=>`S${i+1}=${v.toFixed(0)}km`).join('  ')}`);
  log(`│ Total: ${a.volumes.reduce((s,v)=>s+v,0).toFixed(0)}km  •  Moy: ${(a.volumes.reduce((s,v)=>s+v,0)/Math.max(1,a.volumes.length)).toFixed(1)}km  •  Pic: ${Math.max(0,...a.volumes).toFixed(0)}km`);
  log(`│`);
  log(`│ ── SORTIE LONGUE ──`);
  log(`│ SL hebdo: ${a.slDistances.map((v,i)=>`S${i+1}=${v.toFixed(0)}km`).join('  ')}`);
  log(`│ SL max: ${a.slMax.toFixed(0)}km`);
  log(`│`);
  log(`│ ── DIVERSITÉ DES SÉANCES ──`);
  log(`│ Types: ${Object.entries(a.typeCounts).map(([t,n])=>`${t}(${n})`).join(', ')}`);
  log(`│ 80/20: ${a.easy} facile / ${a.hard} dur = ${a.easy+a.hard?((a.easy/(a.easy+a.hard))*100).toFixed(0):'?'} % facile  •  Renfo: ${a.renfoCount}`);
  log(`│`);
  log(`│ ── DIAGNOSTIC (${a.issues.length} point(s)) ──`);
  if (a.issues.length === 0) {
    log(`│ ✅ Aucun problème détecté`);
  } else {
    const byCat = {};
    a.issues.forEach(iss => { (byCat[iss.cat] = byCat[iss.cat]||[]).push(iss); });
    for (const [cat, list] of Object.entries(byCat)) {
      log(`│   ▸ ${cat}:`);
      list.forEach(iss => log(`│     ${iss.sev} ${iss.msg}`));
    }
  }
  log(`└${'─'.repeat(98)}`);
}

log(`\n${'═'.repeat(100)}`);
log(`  FIN AUDIT`);
log(`${'═'.repeat(100)}\n`);

writeFileSync('audit-deugnilson.txt', lines.join('\n'));
writeFileSync('audit-deugnilson-raw.json', JSON.stringify(plans, null, 2));
console.log(`📝 Rapport: audit-deugnilson.txt  •  Dump brut: audit-deugnilson-raw.json`);
