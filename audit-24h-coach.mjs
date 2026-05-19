/**
 * Audit coach 20 ans — tous les plans générés depuis 24h.
 * Run: node audit-24h-coach.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
const refreshToken = config.tokens?.refresh_token;
const PROJECT = 'coach-running-ia';

async function getToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi' }),
  });
  return (await res.json()).access_token;
}

async function query24h(token) {
  // createdAt est stocké en stringValue ISO — filtrage côté client.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 200,
      }
    }),
  });
  const data = await res.json();
  return { data, since };
}

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

// ====== ALLURES THÉORIQUES (référentiel coach) ======
function paces(vma) {
  if (!vma) return null;
  const f = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
  return {
    EF:        { range: [0.65, 0.70], pace: `${f(vma*0.70)}–${f(vma*0.65)}`, label: 'Endurance fondamentale (65–70% VMA)' },
    SL:        { range: [0.65, 0.72], pace: `${f(vma*0.72)}–${f(vma*0.65)}`, label: 'Sortie longue (65–72% VMA)' },
    Marathon:  { range: [0.78, 0.82], pace: `${f(vma*0.82)}–${f(vma*0.78)}`, label: 'Allure marathon (78–82% VMA)' },
    Semi:      { range: [0.82, 0.86], pace: `${f(vma*0.86)}–${f(vma*0.82)}`, label: 'Allure semi (82–86% VMA)' },
    Seuil:     { range: [0.85, 0.90], pace: `${f(vma*0.90)}–${f(vma*0.85)}`, label: 'Seuil (85–90% VMA)' },
    VMAcourte: { range: [1.00, 1.05], pace: `${f(vma*1.05)}–${f(vma*1.00)}`, label: 'VMA courte 30/30, 200m (100–105%)' },
    VMAlongue: { range: [0.95, 1.00], pace: `${f(vma*1.00)}–${f(vma*0.95)}`, label: 'VMA longue 400-1000m (95–100%)' },
  };
}

function paceToSec(p) {
  if (!p) return null;
  const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/);
  if (!m) return null;
  return parseInt(m[1])*60 + parseInt(m[2]);
}

function kmhFromPace(p) {
  const s = paceToSec(p);
  return s ? 3600/s : null;
}

function vmaPctFromPace(pace, vma) {
  const kmh = kmhFromPace(pace);
  if (!kmh || !vma) return null;
  return kmh / vma;
}

// ====== AUDIT D'UN PLAN ======
function auditPlan(p) {
  const issues = []; // {sev: 🔴|🟡|🟢|💡, msg}
  const weeks = p.weeks || [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const vma = p.vma || ctx.vma || 0;
  const age = ctx.age || q.age;
  const weight = ctx.weight || q.weight;
  const height = ctx.height || q.height;
  const bmi = (weight && height) ? weight / ((height/100)**2) : null;
  const inj = ctx.injuries || q.injuries;
  const exp = ctx.experience || q.experience;
  const freq = p.sessionsPerWeek || ctx.frequency;
  const curVol = ctx.currentVolume || q.currentVolume;
  const goal = (p.goal || '').toLowerCase();
  const subGoal = (p.subGoal || ctx.subGoal || '').toLowerCase();
  const ref = paces(vma);

  // 1. VMA plausibilité
  if (vma && (vma < 8 || vma > 24)) issues.push({sev:'🔴', cat:'Profil', msg:`VMA ${vma} km/h hors plage plausible (8–24)`});
  if (vma >= 22 && exp !== 'expert' && exp !== 'avancé') issues.push({sev:'🟡', cat:'Profil', msg:`VMA ${vma} très élevée vs expérience "${exp}" — vérifier source`});

  // 2. Durée plan vs objectif
  const dur = p.durationWeeks || weeks.length;
  if (goal.includes('marathon') && !goal.includes('semi') && dur < 12) issues.push({sev:'🔴', cat:'Périodisation', msg:`Marathon en ${dur} sem — minimum 12, idéal 16`});
  if ((goal.includes('semi') || subGoal.includes('semi') || subGoal.includes('21')) && dur < 8) issues.push({sev:'🟡', cat:'Périodisation', msg:`Semi en ${dur} sem — minimum 8, idéal 10–12`});
  if ((subGoal.includes('10') || goal.includes('10km')) && dur < 6) issues.push({sev:'🟡', cat:'Périodisation', msg:`10km en ${dur} sem — court (6–8 idéal)`});
  const trailDist = ctx.trailDistance || q.trailDistance;
  if (trailDist >= 100 && dur < 20) issues.push({sev:'🔴', cat:'Périodisation', msg:`Ultra ${trailDist}km en ${dur} sem — min 20–24`});
  if (trailDist >= 60 && trailDist < 100 && dur < 16) issues.push({sev:'🟡', cat:'Périodisation', msg:`Trail ${trailDist}km en ${dur} sem — min 16`});

  // 3. Cohérence VMA-allures (tolérance ±5% VMA, équiv ~20 s/km)
  if (vma && ref) {
    for (const w of weeks) {
      for (const s of (w.sessions || [])) {
        if (!s.targetPace) continue;
        const intensity = (s.intensity || '').toLowerCase();
        const type = (s.type || '').toLowerCase();
        const pct = vmaPctFromPace(s.targetPace, vma);
        if (pct === null) continue;
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
          issues.push({sev, cat:'Allures', msg:`S${w.weekNumber} "${s.title}": ${s.targetPace} = ${(pct*100).toFixed(0)}%VMA vs zone ${label} (${(expected[0]*100).toFixed(0)}–${(expected[1]*100).toFixed(0)}%)`});
        }
      }
    }
  }

  // 4. Volume — règle des 10%
  const volumes = weeks.map(w => (w.sessions || []).reduce((sum, s) => {
    const d = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
    return sum + (isNaN(d) ? 0 : d);
  }, 0));

  // 4a. Premier saut depuis volume actuel
  if (curVol && volumes[0] && volumes[0] > curVol * 1.30 && curVol > 5) {
    issues.push({sev:'🔴', cat:'Charge', msg:`S1 ${volumes[0].toFixed(0)}km vs actuel ${curVol}km/sem — bond +${((volumes[0]/curVol-1)*100).toFixed(0)}% (>30%)`});
  }
  // 4b. Progressions semaine à semaine
  let maxJump = 0, jumpWeek = 0;
  for (let i = 1; i < volumes.length; i++) {
    if (volumes[i-1] > 8) {
      const j = (volumes[i] - volumes[i-1]) / volumes[i-1];
      if (j > maxJump) { maxJump = j; jumpWeek = i; }
      if (j > 0.20) issues.push({sev:'🟡', cat:'Charge', msg:`S${i}→S${i+1}: +${(j*100).toFixed(0)}% (${volumes[i-1].toFixed(0)}→${volumes[i].toFixed(0)}km) — règle des 10%`});
    }
  }
  // 4c. Semaine de décharge présence
  let hasDeload = false;
  for (let i = 2; i < volumes.length; i++) {
    if (volumes[i] < volumes[i-1] * 0.85 && volumes[i] < volumes[i-2] * 0.85) hasDeload = true;
  }
  if (volumes.length >= 5 && !hasDeload) issues.push({sev:'🟡', cat:'Récup', msg:`Pas de semaine de décharge détectée sur ${volumes.length} sem — un cycle 3+1 ou 2+1 est attendu`});

  // 5. Affûtage final (taper)
  if (weeks.length >= 4) {
    const last = volumes[volumes.length-1];
    const peak = Math.max(...volumes);
    const taperPct = last / peak;
    if (goal.includes('marathon') && taperPct > 0.65) issues.push({sev:'🔴', cat:'Affûtage', msg:`Marathon: dernière sem = ${(taperPct*100).toFixed(0)}% du pic — affûtage insuffisant (~50–60%)`});
    else if ((goal.includes('semi') || subGoal.includes('semi')) && taperPct > 0.70) issues.push({sev:'🟡', cat:'Affûtage', msg:`Semi: dernière sem = ${(taperPct*100).toFixed(0)}% du pic — affûtage faible`});
    else if (taperPct > 0.85 && (goal.includes('marathon') || goal.includes('semi') || goal.includes('10'))) issues.push({sev:'🟡', cat:'Affûtage', msg:`Dernière sem = ${(taperPct*100).toFixed(0)}% du pic — quasi pas d'affûtage`});
  }

  // 6. Distribution intensité (80/20)
  let easy = 0, hard = 0;
  for (const w of weeks) for (const s of (w.sessions || [])) {
    const intens = (s.intensity || '').toLowerCase();
    const type = (s.type || '').toLowerCase();
    if (type.includes('renfo') || type.includes('mobilité') || type.includes('cross')) continue;
    if (intens.includes('facile') || intens.includes('modéré') || type.includes('longue') || type.includes('récup')) easy++;
    else if (intens.includes('seuil') || intens.includes('vma') || intens.includes('rapide') || intens.includes('soutenu')) hard++;
  }
  const total = easy + hard;
  if (total > 0) {
    const easyPct = easy / total;
    if (easyPct < 0.70) issues.push({sev:'🔴', cat:'80/20', msg:`Distribution intensité: ${(easyPct*100).toFixed(0)}% facile / ${(100-easyPct*100).toFixed(0)}% dur — trop de qualité (cible 75–85% facile)`});
    else if (easyPct < 0.75) issues.push({sev:'🟡', cat:'80/20', msg:`Distribution intensité: ${(easyPct*100).toFixed(0)}% facile — limite basse (cible 80%)`});
  }

  // 7. Renfo / prévention
  let renfoCount = 0;
  for (const w of weeks) for (const s of (w.sessions || [])) if ((s.type||'').toLowerCase().includes('renfo')) renfoCount++;
  if (weeks.length >= 6 && renfoCount === 0) issues.push({sev:'🔴', cat:'Prévention', msg:`Aucune séance de renforcement sur ${weeks.length} sem — risque blessure`});
  else if (weeks.length >= 6 && renfoCount < weeks.length / 2) issues.push({sev:'🟡', cat:'Prévention', msg:`Seulement ${renfoCount} renfo sur ${weeks.length} sem (cible: ≥1/sem)`});

  // 8. BMI élevé → pliométrie à éviter
  if (bmi >= 28) {
    for (const w of weeks) for (const s of (w.sessions || [])) {
      const txt = ((s.mainSet || '') + ' ' + (s.title || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (s.type === 'Renforcement' && (txt.includes('saute') || txt.includes('saut ') || txt.includes('jump') || txt.includes('pliomet') || txt.includes('bond'))) {
        issues.push({sev:'🔴', cat:'Prévention', msg:`S${w.weekNumber} "${s.title}": pliométrie pour IMC ${bmi.toFixed(1)} — contre-indiqué`});
      }
    }
  }

  // 9. Blessures respectées
  if (inj && typeof inj === 'string' && !inj.toLowerCase().match(/aucun|non|rien|^$/)) {
    const injLower = inj.toLowerCase();
    if (injLower.match(/genou|tendon|fascia|achille|tibia/)) {
      // recherche d'impact à forte fréquence
      let bigSessions = 0;
      for (const w of weeks) for (const s of (w.sessions || [])) {
        const d = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
        if (!isNaN(d) && d > 20) bigSessions++;
      }
      if (bigSessions > weeks.length) issues.push({sev:'🟡', cat:'Blessure', msg:`Blessure déclarée "${inj}" — ${bigSessions} séances >20km — vérifier progressivité`});
    }
  }

  // 10. Jours dupliqués / weekly structure
  for (const w of weeks) {
    const days = (w.sessions || []).map(s => s.day).filter(Boolean);
    const dupes = [...new Set(days.filter((d, i) => days.indexOf(d) !== i))];
    if (dupes.length > 0) issues.push({sev:'🔴', cat:'Structure', msg:`S${w.weekNumber}: jours dupliqués [${dupes.join(', ')}]`});
  }

  // 11. Enchaînement qualité-qualité (récup insuffisante)
  const dayOrder = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  for (const w of weeks) {
    const ss = (w.sessions || []).slice().sort((a,b) => dayOrder.indexOf((a.day||'').toLowerCase()) - dayOrder.indexOf((b.day||'').toLowerCase()));
    for (let i = 1; i < ss.length; i++) {
      const a = ss[i-1], b = ss[i];
      const aHard = /seuil|vma|rapide|soutenu/i.test(a.intensity || '') || /seuil|vma/i.test(a.type || '');
      const bHard = /seuil|vma|rapide|soutenu/i.test(b.intensity || '') || /seuil|vma/i.test(b.type || '');
      const idxA = dayOrder.indexOf((a.day||'').toLowerCase());
      const idxB = dayOrder.indexOf((b.day||'').toLowerCase());
      if (aHard && bHard && idxB - idxA === 1) issues.push({sev:'🟡', cat:'Récup', msg:`S${w.weekNumber}: qualité ${a.day}→${b.day} sans jour de récup`});
    }
  }

  // 12. Fréquence vs déclaré
  if (freq) {
    for (const w of weeks) {
      const real = (w.sessions || []).filter(s => !/renfo|mobilité|cross/i.test(s.type || '')).length;
      if (real > freq) { issues.push({sev:'🟡', cat:'Structure', msg:`S${w.weekNumber}: ${real} séances course vs ${freq} déclarées`}); break; }
    }
  }

  // 13. Sortie longue présente sur préparation course
  if (weeks.length >= 6 && (goal.includes('marathon') || goal.includes('semi') || trailDist > 0)) {
    let hasSL = false;
    for (const w of weeks) for (const s of (w.sessions || [])) if (/longue/i.test(s.type || '')) hasSL = true;
    if (!hasSL) issues.push({sev:'🔴', cat:'Spécificité', msg:`Aucune sortie longue détectée — indispensable pour endurance`});
  }

  // 13b. Cohérence cible vs VMA — détecte objectifs irréalistes
  // Marathon: temps = 42.195 / (vma * 0.78) en h pour cible élite, 0.70 pour amateur
  if (vma && p.targetTime && p.targetTime !== 'Finisher') {
    const tm = String(p.targetTime).match(/^(\d+)h?(\d+)?/);
    if (tm) {
      const targetH = parseInt(tm[1]) + (tm[2] ? parseInt(tm[2])/60 : 0);
      let dist = null;
      if (goal.includes('marathon') && !goal.includes('semi')) dist = 42.195;
      else if (goal.includes('semi') || subGoal.includes('semi') || subGoal.includes('21')) dist = 21.0975;
      else if (subGoal.includes('10') || goal.includes('10km')) dist = 10;
      else if (subGoal.includes('5')) dist = 5;
      if (dist) {
        const requiredKmh = dist / targetH;
        const pctVMArequired = requiredKmh / vma;
        if (pctVMArequired > 0.92) issues.push({sev:'🔴', cat:'Faisabilité', msg:`Cible ${p.targetTime} sur ${dist}km = ${requiredKmh.toFixed(1)}km/h = ${(pctVMArequired*100).toFixed(0)}%VMA — irréaliste (>90% impossible à tenir)`});
        else if (pctVMArequired > 0.88 && !goal.includes('5')) issues.push({sev:'🟡', cat:'Faisabilité', msg:`Cible ${p.targetTime} = ${(pctVMArequired*100).toFixed(0)}%VMA — très ambitieux`});
        else if (pctVMArequired < 0.60) issues.push({sev:'🟡', cat:'Faisabilité', msg:`Cible ${p.targetTime} = ${(pctVMArequired*100).toFixed(0)}%VMA — très sous-cotée vs potentiel`});
      }
    }
  }

  // 14. Description séances pauvres
  let emptyMain = 0;
  for (const w of weeks) for (const s of (w.sessions || [])) {
    if (!s.mainSet || String(s.mainSet).length < 20) emptyMain++;
  }
  const totalSessions = weeks.reduce((s, w) => s + (w.sessions||[]).length, 0);
  if (totalSessions > 0 && emptyMain / totalSessions > 0.3) issues.push({sev:'🟡', cat:'Qualité', msg:`${emptyMain}/${totalSessions} séances avec mainSet vide ou très court`});

  return { issues, volumes, easy, hard, bmi, ref, renfoCount, totalSessions };
}

// ====== RAPPORT ======
function severityScore(issues) {
  return issues.reduce((s, i) => s + (i.sev==='🔴'?3:i.sev==='🟡'?1:0), 0);
}

function notePlan(issues, totalSessions, isFree) {
  const score = severityScore(issues);
  const ratio = totalSessions ? score / totalSessions : score;
  const suffix = isFree ? ' (audit S1 freemium)' : '';
  if (score === 0) return { note: 'A+', label: `Excellent${suffix}`, emoji: '🏆' };
  if (ratio < 0.3) return { note: 'A', label: `Très bon${suffix}`, emoji: '✅' };
  if (ratio < 0.6) return { note: 'B', label: `Correct, ajustements mineurs${suffix}`, emoji: '👍' };
  if (ratio < 1.0) return { note: 'C', label: `Moyen, à revoir${suffix}`, emoji: '⚠️' };
  return { note: 'D', label: `Problématique, à corriger${suffix}`, emoji: '🚨' };
}

// ====== AUDIT SPÉCIFIQUE S1 (pour plans squelettes) ======
function auditS1(plan) {
  const issues = [];
  const weeks = plan.weeks || [];
  if (weeks.length === 0) { issues.push({sev:'🔴', cat:'Vide', msg:'Aucune semaine déployée'}); return issues; }
  const s1 = weeks[0];
  const ss = s1.sessions || [];
  const ctx = plan.generationContext || {};
  const vma = plan.vma || ctx.vma || 0;
  const curVol = ctx.currentVolume || ctx.questionnaireData?.currentVolume;
  const freq = plan.sessionsPerWeek;

  // Volume S1 vs current
  const vol = ss.reduce((s, x) => s + (parseFloat(String(x.distance || '0').replace(/[^0-9.]/g, '')) || 0), 0);
  if (curVol && vol > curVol * 1.30 && curVol > 5) issues.push({sev:'🔴', cat:'Charge S1', msg:`Volume S1 ${vol.toFixed(0)}km vs actuel ${curVol}km/sem — bond +${((vol/curVol-1)*100).toFixed(0)}%`});
  if (curVol && vol < curVol * 0.5 && curVol > 10) issues.push({sev:'🟡', cat:'Charge S1', msg:`Volume S1 ${vol.toFixed(0)}km << actuel ${curVol}km/sem — démarrage très bas`});

  // Nombre séances
  const courseCount = ss.filter(s => !/renfo|mobilité|cross/i.test(s.type||'')).length;
  if (freq && courseCount !== freq) issues.push({sev:'🟡', cat:'Structure S1', msg:`${courseCount} séances course vs ${freq} déclarées`});

  // S1 = semaine d'adaptation → pas de qualité haute
  for (const s of ss) {
    if (/vma|seuil/i.test(s.intensity || '') || /vma|seuil/i.test(s.type || '')) {
      issues.push({sev:'🟡', cat:'Progression', msg:`S1 contient déjà ${s.type} (${s.intensity}) — S1 idéalement en EF pure pour adaptation`});
    }
  }

  // Allures S1 cohérentes
  if (vma) {
    for (const s of ss) {
      if (!s.targetPace) continue;
      const pct = vmaPctFromPace(s.targetPace, vma);
      if (pct === null) continue;
      const intensity = (s.intensity || '').toLowerCase();
      const type = (s.type || '').toLowerCase();
      let expected = null;
      if (type.includes('longue') || intensity.includes('facile') || type.includes('récup')) expected = [0.62, 0.74];
      if (expected && (pct < expected[0] || pct > expected[1])) {
        issues.push({sev: pct < expected[0]-0.05 || pct > expected[1]+0.05 ? '🔴' : '🟡', cat:'Allures S1', msg:`"${s.title}": ${s.targetPace} = ${(pct*100).toFixed(0)}%VMA hors zone EF`});
      }
    }
  }

  // Description séances vides
  for (const s of ss) {
    if (!s.mainSet || String(s.mainSet).length < 20) issues.push({sev:'🟡', cat:'Qualité S1', msg:`"${s.title}": mainSet vide ou très court`});
  }

  return issues;
}

async function main() {
  const token = await getToken();
  const { data: results, since } = await query24h(token);

  if (!Array.isArray(results) || results.length === 0 || !results[0].document) {
    console.log('📭 Aucun plan trouvé.');
    return;
  }

  const allPlans = results.filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), _createTime: r.document.createTime, ...pf(r.document.fields) }));
  const plans = allPlans.filter(p => {
    const ts = p.createdAt || p._createTime;
    return ts && new Date(ts) >= since;
  });
  if (plans.length === 0) {
    console.log(`📭 Aucun plan généré depuis ${since.toLocaleString('fr-FR')} (24h glissantes).`);
    console.log(`💡 Plan le plus récent: ${allPlans[0]?.createdAt || allPlans[0]?._createTime} — "${allPlans[0]?.name}"`);
    return;
  }

  const lines = [];
  const log = (...args) => { const line = args.join(' '); console.log(line); lines.push(line); };

  log(`\n${'═'.repeat(100)}`);
  log(`  AUDIT COACH — PLANS GÉNÉRÉS DEPUIS 24H`);
  log(`  ${plans.length} plan(s) — Référentiel: VMA-based pacing, 80/20 rule, périodisation Lydiard/Daniels`);
  log(`  Généré: ${new Date().toLocaleString('fr-FR')}`);
  log(`${'═'.repeat(100)}\n`);

  // === STATS GLOBALES ===
  const goals = {};
  const levels = {};
  const dists = [];
  plans.forEach(p => {
    const g = p.goal || '?';
    goals[g] = (goals[g] || 0) + 1;
    const l = p.level || p.generationContext?.level || '?';
    levels[l] = (levels[l] || 0) + 1;
    if (p.durationWeeks) dists.push(p.durationWeeks);
  });
  log(`── RÉPARTITION ──`);
  log(`  Objectifs:  ${Object.entries(goals).map(([k,v]) => `${k}(${v})`).join(', ')}`);
  log(`  Niveaux:    ${Object.entries(levels).map(([k,v]) => `${k}(${v})`).join(', ')}`);
  log(`  Durées:     min=${Math.min(...dists)} max=${Math.max(...dists)} moy=${(dists.reduce((a,b)=>a+b,0)/dists.length).toFixed(1)} sem\n`);

  // === AUDIT PAR PLAN ===
  const allIssues = [];
  const planResults = [];

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const weeksDeployed = (p.weeks || []).length;
    const weeksAnnounced = p.durationWeeks || weeksDeployed;
    // Plan "free" = squelette : 1 semaine déployée sur un plan multi-sem (pas encore payé)
    const isFree = weeksAnnounced >= 4 && weeksDeployed <= 1;

    let a;
    if (isFree) {
      // Audit ciblé S1 + cohérence profil/structure
      const s1Issues = auditS1(p);
      const base = auditPlan(p); // pour récupérer volumes, ref, etc. mais ses issues ne s'appliquent pas
      a = { ...base, issues: s1Issues };
    } else {
      a = auditPlan(p);
    }
    const note = notePlan(a.issues, a.totalSessions, isFree);
    planResults.push({ p, a, note, isFree, weeksDeployed, weeksAnnounced });

    const ctx = p.generationContext || {};
    const time = new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' });
    const peak = Math.max(...a.volumes, 0).toFixed(0);
    const v1 = (a.volumes[0]||0).toFixed(0);
    const vLast = (a.volumes[a.volumes.length-1]||0).toFixed(0);

    const vma = p.vma || ctx.vma || 0;
    log(`\n┌${'─'.repeat(98)}`);
    log(`│ ${note.emoji} PLAN ${i+1}/${plans.length} — ${note.note} (${note.label})`);
    log(`│ ${p.name || '?'}`);
    log(`│ Créé: ${time}  •  ID: ${p.id?.substring(0,12)}  •  ${plans[i].weeks?.length || 0}/${p.durationWeeks || '?'} sem déployées ${plans[i].weeks?.length <= 1 && p.durationWeeks > 1 ? '(freemium)' : '(payant)'}`);
    log(`│`);
    log(`│ PROFIL:    VMA ${vma ? vma.toFixed(1) : '?'} km/h  •  ${p.level || ctx.level || '?'}  •  IMC ${a.bmi ? a.bmi.toFixed(1) : '?'}  •  ${ctx.age || '?'} ans`);
    log(`│ OBJECTIF:  ${p.goal || '?'} ${p.subGoal ? `(${p.subGoal})` : ''}  •  Cible: ${p.targetTime || 'Finisher'}`);
    log(`│ STRUCT:    ${p.sessionsPerWeek || '?'} séances/sem  •  ${p.durationWeeks || '?'} sem  •  Vol actuel: ${ctx.currentVolume || '?'} km/sem`);
    log(`│ CHARGE:    S1=${v1}km  •  Pic=${peak}km  •  Sfinal=${vLast}km  •  ${a.totalSessions} séances totales  •  ${a.renfoCount} renfo`);
    log(`│ 80/20:     ${a.easy} facile / ${a.hard} dur  =  ${a.easy+a.hard ? ((a.easy/(a.easy+a.hard))*100).toFixed(0) : '?'}% facile`);
    if (a.ref) {
      log(`│ ALLURES théoriques (référentiel coach):`);
      log(`│   EF=${a.ref.EF.pace}  •  Seuil=${a.ref.Seuil.pace}  •  VMA courte=${a.ref.VMAcourte.pace}  •  VMA longue=${a.ref.VMAlongue.pace}`);
    }
    log(`│`);
    if (a.issues.length === 0) {
      log(`│ ✅ Aucun problème détecté — plan structurellement solide`);
    } else {
      const byCat = {};
      a.issues.forEach(iss => { (byCat[iss.cat] = byCat[iss.cat] || []).push(iss); });
      log(`│ DIAGNOSTIC (${a.issues.length} point(s)):`);
      for (const [cat, list] of Object.entries(byCat)) {
        log(`│   ▸ ${cat}:`);
        list.forEach(iss => log(`│     ${iss.sev} ${iss.msg}`));
      }
    }
    log(`└${'─'.repeat(98)}`);

    a.issues.forEach(iss => allIssues.push({ plan: p.name, ...iss }));
  }

  // === SYNTHÈSE GLOBALE ===
  log(`\n\n${'═'.repeat(100)}`);
  log(`  SYNTHÈSE COACH`);
  log(`${'═'.repeat(100)}\n`);

  // Notes
  const noteDist = {};
  planResults.forEach(r => { noteDist[r.note.note] = (noteDist[r.note.note]||0)+1; });
  log(`── NOTATION GLOBALE ──`);
  ['A+','A','B','C','D'].forEach(n => { if (noteDist[n]) log(`  ${n}: ${noteDist[n]} plan(s)`); });

  // Top problèmes
  const byCat = {};
  allIssues.forEach(iss => { byCat[iss.cat] = (byCat[iss.cat] || 0) + 1; });
  log(`\n── PROBLÈMES PAR CATÉGORIE ──`);
  Object.entries(byCat).sort((a,b) => b[1]-a[1]).forEach(([cat, n]) => log(`  ${cat.padEnd(20)} ${n} occurrence(s)`));

  // Sévérité
  const red = allIssues.filter(i => i.sev === '🔴').length;
  const yellow = allIssues.filter(i => i.sev === '🟡').length;
  log(`\n── SÉVÉRITÉ ──`);
  log(`  🔴 Critique: ${red}`);
  log(`  🟡 Modéré:   ${yellow}`);
  log(`  Total:       ${allIssues.length} sur ${plans.length} plans (moy ${(allIssues.length/plans.length).toFixed(1)}/plan)`);

  // Recommandations coach
  log(`\n── RECOMMANDATIONS COACH ──`);
  const recs = [];
  if (byCat['Allures'] > plans.length * 0.3) recs.push(`Les allures cibles s'écartent souvent du %VMA attendu (${byCat['Allures']} cas) — vérifier le mapping intensité→%VMA dans le prompt LLM, et imposer une plage par type.`);
  if (byCat['Charge'] > plans.length * 0.3) recs.push(`Trop de plans cassent la règle des 10% (${byCat['Charge']} cas) — ajouter une contrainte dans le générateur: ΔV/V ≤ 0.15 et S1 ≤ 1.20 × volume actuel.`);
  if (byCat['Affûtage'] > plans.length * 0.2) recs.push(`Affûtage insuffisant (${byCat['Affûtage']} cas) — sur prépa marathon/semi, imposer dernière semaine ≤ 55% du pic et avant-dernière ≤ 70%.`);
  if (byCat['80/20']) recs.push(`Distribution intensité non respectée (${byCat['80/20']} cas) — viser 80% facile / 20% dur en nombre de séances; le générateur doit compter les types.`);
  if (byCat['Prévention']) recs.push(`Renforcement absent ou insuffisant (${byCat['Prévention']} cas) — imposer ≥ 1 renfo/sem dès semaine 2.`);
  if (byCat['Récup']) recs.push(`Enchaînements qualité-qualité (${byCat['Récup']} cas) — imposer ≥ 1 jour facile entre deux séances dures (seuil, VMA).`);
  if (byCat['Périodisation']) recs.push(`Durées trop courtes pour l'objectif (${byCat['Périodisation']} cas) — refuser génération ou avertir l'utilisateur si durée < minimum.`);
  if (byCat['Structure']) recs.push(`Problèmes de structure hebdo (${byCat['Structure']} cas) — vérifier dédup jours et nombre de séances course.`);
  if (recs.length === 0) recs.push(`Pas de pattern systémique majeur. Les écarts restent ponctuels.`);
  recs.forEach((r, i) => log(`  ${i+1}. ${r}`));

  log(`\n${'═'.repeat(100)}\n`);

  writeFileSync('audit-24h-coach.txt', lines.join('\n'));
  console.log(`\n📝 Rapport écrit dans: audit-24h-coach.txt`);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
