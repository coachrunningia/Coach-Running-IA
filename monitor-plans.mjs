/**
 * Monitor today's generated plans — quality audit in real-time.
 * Run: node monitor-plans.mjs
 */
import { readFileSync } from 'fs';
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

async function queryToday(token) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: today.toISOString() } } },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 50,
      }
    }),
  });
  return await res.json();
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

function calculateExpectedEF(vma) {
  const efKmh = vma * 0.67;
  const pace = 60 / efKmh;
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function auditPlan(plan, docId) {
  const issues = [];
  const weeks = plan.weeks || [];
  const ctx = plan.generationContext || {};
  const vma = plan.vma || ctx.vma || 0;
  const expectedEF = calculateExpectedEF(vma);

  // Check 1: Allures cohérentes
  for (const w of weeks) {
    for (const s of (w.sessions || [])) {
      if (s.targetPace && (s.intensity === 'Facile' || s.type === 'Sortie Longue')) {
        const paceStr = s.targetPace;
        const paceMatch = paceStr.match(/(\d+):(\d+)/);
        const efMatch = expectedEF.match(/(\d+):(\d+)/);
        if (paceMatch && efMatch) {
          const paceSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
          const efSec = parseInt(efMatch[1]) * 60 + parseInt(efMatch[2]);
          if (Math.abs(paceSec - efSec) > 60) {
            issues.push(`🔴 S${w.weekNumber} "${s.title}": allure EF ${paceStr} vs attendu ${expectedEF} (écart > 1min)`);
          }
        }
      }
    }
  }

  // Check 2: Jours dupliqués
  for (const w of weeks) {
    const days = (w.sessions || []).map(s => s.day);
    const dupes = days.filter((d, i) => days.indexOf(d) !== i);
    if (dupes.length > 0) issues.push(`🔴 S${w.weekNumber}: jours dupliqués [${dupes.join(', ')}]`);
  }

  // Check 3: Volume jumps
  const volumes = weeks.map(w => {
    return (w.sessions || []).reduce((sum, s) => {
      const d = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(d) ? 0 : d);
    }, 0);
  });
  for (let i = 1; i < volumes.length; i++) {
    if (volumes[i - 1] > 5 && volumes[i] > 5) {
      const jump = (volumes[i] - volumes[i - 1]) / volumes[i - 1];
      if (jump > 0.15) issues.push(`🟡 S${i}→S${i + 1}: volume +${(jump * 100).toFixed(0)}% (${volumes[i - 1].toFixed(0)}→${volumes[i].toFixed(0)}km)`);
    }
  }

  // Check 4: Renfo present
  const hasRenfo = weeks.some(w => (w.sessions || []).some(s => s.type === 'Renforcement'));
  if (!hasRenfo && weeks.length > 0) issues.push(`🟡 Pas de renforcement musculaire`);

  // Check 5: Exercices plyométriques si IMC ≥ 28
  const bmi = (ctx.weight && ctx.height) ? ctx.weight / ((ctx.height / 100) ** 2) : 0;
  if (bmi >= 28) {
    for (const w of weeks) {
      for (const s of (w.sessions || [])) {
        if (s.type === 'Renforcement' && s.mainSet) {
          const norm = s.mainSet.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (norm.includes('saute') || norm.includes('box jump') || norm.includes('pliomet')) {
            issues.push(`🔴 S${w.weekNumber} renfo: exercice pliométrique détecté pour IMC ${bmi.toFixed(1)}`);
          }
        }
      }
    }
  }

  // Check 6: Ultra trop court
  const dist = ctx.trailDistance || 0;
  const dur = plan.durationWeeks || 0;
  if (dist >= 100 && dur < 20) issues.push(`🔴 Ultra ${dist}km en ${dur} semaines (min 20 recommandé)`);
  if (dist >= 60 && dur < 16) issues.push(`🟡 Trail ${dist}km en ${dur} semaines (min 16 recommandé)`);

  return issues;
}

async function main() {
  const token = await getToken();
  const results = await queryToday(token);

  if (!Array.isArray(results) || results.length === 0 || !results[0].document) {
    console.log('📭 Aucun plan généré aujourd\'hui pour le moment.');
    return;
  }

  const plans = results.filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), ...pf(r.document.fields) }));
  console.log(`📊 ${plans.length} plan(s) généré(s) aujourd'hui\n`);

  let totalIssues = 0;

  for (const plan of plans) {
    const ctx = plan.generationContext || {};
    const weeks = plan.weeks || [];
    const vma = plan.vma || ctx.vma || 0;
    const bmi = (ctx.weight && ctx.height) ? (ctx.weight / ((ctx.height / 100) ** 2)).toFixed(1) : '?';
    const time = new Date(plan.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    console.log(`┌─ ${time} │ ${plan.name}`);
    console.log(`│  VMA: ${vma} │ Objectif: ${plan.targetTime || 'Finisher'} │ ${plan.sessionsPerWeek || '?'}x/sem │ ${weeks.length}/${plan.durationWeeks || '?'} sem │ IMC: ${bmi} │ Ville: ${plan.location || '?'}`);

    const issues = auditPlan(plan, plan.id);
    if (issues.length === 0) {
      console.log(`│  ✅ Aucun problème détecté`);
    } else {
      totalIssues += issues.length;
      issues.forEach(iss => console.log(`│  ${iss}`));
    }

    // Résumé séances S1
    if (weeks.length > 0) {
      const s1 = weeks[0];
      const types = {};
      let vol = 0;
      (s1.sessions || []).forEach(s => {
        types[s.type || '?'] = (types[s.type || '?'] || 0) + 1;
        const d = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
        if (!isNaN(d)) vol += d;
      });
      const typesStr = Object.entries(types).map(([t, c]) => `${t}(${c})`).join(', ');
      console.log(`│  S1: ~${vol.toFixed(0)}km │ ${typesStr}`);
    }
    console.log(`└${'─'.repeat(80)}`);
  }

  console.log(`\n${totalIssues === 0 ? '✅ Tous les plans sont OK' : `⚠️ ${totalIssues} problème(s) détecté(s)`}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
