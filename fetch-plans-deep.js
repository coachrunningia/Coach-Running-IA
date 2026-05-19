import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
const refreshToken = config.tokens?.refresh_token;
const PROJECT_ID = 'coach-running-ia';

async function getToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi' }),
  });
  return (await res.json()).access_token;
}

async function query(token) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'plans' }], orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 10 } }),
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

async function main() {
  const token = await getToken();
  const results = await query(token);
  const plans = results.filter(r => r.document).map(r => pf(r.document.fields));

  // Only analyze plans with multiple weeks (premium users with full plans)
  // + the first week of all plans for S1 quality check
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const weeks = p.weeks || [];
    const ctx = p.generationContext || {};
    const q = ctx.questionnaireData || ctx;

    console.log(`\n${'█'.repeat(100)}`);
    console.log(`PLAN ${i+1}/${plans.length}: ${p.name}`);
    console.log(`${'█'.repeat(100)}`);

    console.log(`\n── PROFIL UTILISATEUR ──`);
    console.log(`  Objectif     : ${p.goal || 'N/A'}`);
    console.log(`  Sous-objectif: ${p.subGoal || ctx.subGoal || 'N/A'}`);
    console.log(`  Niveau       : ${p.level || ctx.level || 'N/A'}`);
    console.log(`  VMA          : ${p.vma || ctx.vma || 'N/A'} km/h`);
    console.log(`  Source VMA   : ${p.vmaSource || ctx.vmaSource || 'N/A'}`);
    console.log(`  Temps cible  : ${p.targetTime || 'Finisher'}`);
    console.log(`  Âge          : ${ctx.age || q.age || 'N/A'} ans`);
    console.log(`  Sexe         : ${ctx.gender || q.gender || 'N/A'}`);
    if (ctx.weight && ctx.height) console.log(`  IMC          : ${(ctx.weight / ((ctx.height/100)**2)).toFixed(1)} (${ctx.weight}kg / ${ctx.height}cm)`);
    console.log(`  Fréquence    : ${p.sessionsPerWeek || ctx.frequency || 'N/A'} séances/sem`);
    console.log(`  Vol. actuel  : ${ctx.currentVolume || q.currentVolume || 'N/A'} km/sem`);
    console.log(`  Expérience   : ${ctx.experience || q.experience || 'N/A'}`);
    console.log(`  Blessures    : ${ctx.injuries || q.injuries || 'Aucune'}`);
    console.log(`  Ville        : ${p.location || 'N/A'}`);
    console.log(`  Durée plan   : ${p.durationWeeks || 'N/A'} semaines`);
    console.log(`  Date course  : ${p.startDate || ctx.raceDate || 'N/A'}`);
    console.log(`  Créé le      : ${p.createdAt || 'N/A'}`);

    if (p.feasibility) {
      console.log(`\n── FAISABILITÉ ──`);
      console.log(`  Status       : ${p.feasibility.status}`);
      console.log(`  Score        : ${p.feasibility.score || 'N/A'}`);
      console.log(`  Message      : ${p.feasibility.message || 'N/A'}`);
      if (p.feasibility.safetyWarning) console.log(`  Safety       : ${p.feasibility.safetyWarning}`);
      if (p.feasibility.recommendation) console.log(`  Recomm.      : ${p.feasibility.recommendation}`);
    }

    if (p.welcomeMessage) {
      console.log(`\n── MESSAGE DU COACH ──`);
      console.log(`  ${p.welcomeMessage}`);
    }

    if (p.paces) {
      console.log(`\n── ALLURES CALCULÉES ──`);
      const paces = p.paces;
      for (const [k, v] of Object.entries(paces)) {
        if (v) console.log(`  ${k.padEnd(15)}: ${v}`);
      }
    }

    console.log(`\n── SEMAINES DÉTAILLÉES (${weeks.length}/${p.durationWeeks || '?'}) ──`);

    for (const w of weeks) {
      const ss = w.sessions || [];
      console.log(`\n  ┌─ SEMAINE ${w.weekNumber} — ${w.phase || '?'} ${'─'.repeat(60)}`);

      let weekKm = 0;
      for (const s of ss) {
        const dist = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
        if (!isNaN(dist)) weekKm += dist;

        console.log(`  │`);
        console.log(`  │  📅 ${s.day} — ${s.type || '?'} — ${s.intensity || '?'}`);
        console.log(`  │  Titre    : ${s.title}`);
        console.log(`  │  Durée    : ${s.duration || '?'} | Distance: ${s.distance || '?'} | Allure: ${s.targetPace || 'N/A'}`);
        if (s.locationSuggestion) console.log(`  │  Lieu     : ${s.locationSuggestion}`);
        if (s.warmup) console.log(`  │  Échauft  : ${String(s.warmup).substring(0, 150)}`);
        if (s.mainSet) console.log(`  │  Corps    : ${String(s.mainSet).substring(0, 200)}`);
        if (s.cooldown) console.log(`  │  Retour   : ${String(s.cooldown).substring(0, 150)}`);
        if (s.coachTip) console.log(`  │  💡 Tip   : ${String(s.coachTip).substring(0, 150)}`);
      }
      console.log(`  │`);
      console.log(`  └─ Volume semaine: ~${weekKm.toFixed(1)} km | ${ss.length} séances`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
