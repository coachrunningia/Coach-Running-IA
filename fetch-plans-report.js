#!/usr/bin/env node
/**
 * Fetch 10 most recent plans via Firestore REST API using Firebase CLI token.
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) { console.error('No Firebase refresh token found'); process.exit(1); }

const PROJECT_ID = 'coach-running-ia';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

async function queryPlans(token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 10,
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

function pf(fields) {
  if (!fields) return {};
  const o = {};
  for (const [k, v] of Object.entries(fields)) o[k] = pv(v);
  return o;
}

async function main() {
  console.log('Fetching access token...');
  const token = await getAccessToken();
  console.log('Querying 10 most recent plans...\n');
  const results = await queryPlans(token);

  if (!Array.isArray(results)) {
    console.error('Error:', JSON.stringify(results).substring(0, 500));
    return;
  }

  const plans = results.filter(r => r.document).map(r => pf(r.document.fields));
  console.log(`Found ${plans.length} plans\n`);

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const weeks = p.weeks || [];
    const ctx = p.generationContext || {};

    console.log(`\n${'█'.repeat(3)} PLAN ${i + 1}/${plans.length} ${'█'.repeat(60)}`);
    console.log(`  Nom          : ${p.name || 'N/A'}`);
    console.log(`  Objectif     : ${p.goal || 'N/A'}`);
    console.log(`  Niveau       : ${p.level || 'N/A'}`);
    console.log(`  VMA          : ${p.vma || ctx.vma || 'N/A'} km/h`);
    console.log(`  Temps cible  : ${p.targetTime || 'Finisher'}`);
    console.log(`  Durée prévue : ${p.durationWeeks || 'N/A'} semaines`);
    console.log(`  Fréquence    : ${p.sessionsPerWeek || 'N/A'} séances/sem`);
    console.log(`  Semaines gén.: ${weeks.length}`);
    console.log(`  Ville        : ${p.location || 'N/A'}`);
    console.log(`  Créé le      : ${p.createdAt || 'N/A'}`);

    if (ctx.weight && ctx.height) {
      const bmi = (ctx.weight / ((ctx.height / 100) ** 2)).toFixed(1);
      console.log(`  Poids/Taille : ${ctx.weight}kg / ${ctx.height}cm (IMC: ${bmi})`);
    }
    if (ctx.injuries) console.log(`  Blessures    : ${ctx.injuries}`);
    if (ctx.age) console.log(`  Âge          : ${ctx.age} ans`);

    if (p.feasibility) {
      console.log(`  Faisabilité  : ${p.feasibility.status || '?'} (score: ${p.feasibility.score || '?'})`);
      if (p.feasibility.safetyWarning) console.log(`  ⚠️  Safety    : ${String(p.feasibility.safetyWarning).substring(0, 150)}`);
    }

    if (p.welcomeMessage) console.log(`  Coach msg    : ${String(p.welcomeMessage).substring(0, 120)}...`);

    if (weeks.length > 0) {
      console.log(`\n  SEMAINES :`);
      let maxSL = 0, maxSLInfo = '', hasRenfo = false, allVolumes = [];

      for (const w of weeks) {
        const ss = w.sessions || [];
        const wn = w.weekNumber || '?';
        const ph = w.phase || '';
        const types = {};
        let weekKm = 0;

        for (const s of ss) {
          const t = s.type || '?';
          types[t] = (types[t] || 0) + 1;
          const d = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, ''));
          if (!isNaN(d)) weekKm += d;

          if (t === 'Sortie Longue' || t === 'Sortie longue' || (s.title || '').toLowerCase().includes('sortie longue')) {
            const durStr = s.duration || '';
            let durMin = 0;
            if (durStr.includes('h')) {
              const parts = durStr.split('h');
              durMin = parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0);
            } else {
              durMin = parseInt(durStr) || 0;
            }
            if (durMin > maxSL) { maxSL = durMin; maxSLInfo = `${durStr} / ${s.distance || '?'}`; }
          }
          if (t === 'Renforcement') hasRenfo = true;
        }

        allVolumes.push(weekKm);
        const typesStr = Object.entries(types).map(([t, c]) => `${t}(${c})`).join(', ');
        console.log(`    S${String(wn).padStart(2, '0')} [${String(ph).padEnd(14)}] ${ss.length} séances | ~${weekKm.toFixed(0).padStart(3)}km | ${typesStr}`);
      }

      const avgVol = allVolumes.length ? (allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length).toFixed(1) : 0;
      const maxVol = allVolumes.length ? Math.max(...allVolumes).toFixed(0) : 0;
      console.log(`\n  RÉSUMÉ :`);
      console.log(`    Volume moyen   : ${avgVol} km/sem`);
      console.log(`    Volume max     : ${maxVol} km/sem`);
      console.log(`    SL max         : ${maxSL}min (${maxSLInfo})`);
      console.log(`    Renforcement   : ${hasRenfo ? '✅' : '❌'}`);

      // Checks
      const issues = [];
      if (!hasRenfo) issues.push('❌ Pas de renforcement musculaire');
      if (maxSL > 180 && p.goal !== 'TRAIL') issues.push(`⚠️ SL > 3h pour un non-trail`);
      if (parseFloat(maxVol) > 80 && (p.level || '').includes('Débutant')) issues.push(`⚠️ Volume max > 80km pour un débutant`);
      if (weeks.length < (p.durationWeeks || 0)) issues.push(`⚠️ ${weeks.length} semaines générées sur ${p.durationWeeks} prévues`);

      // Check volume jumps > 15%
      for (let j = 1; j < allVolumes.length; j++) {
        if (allVolumes[j - 1] > 0 && allVolumes[j] > 0) {
          const jump = (allVolumes[j] - allVolumes[j - 1]) / allVolumes[j - 1];
          if (jump > 0.15) issues.push(`⚠️ S${j} → S${j + 1}: +${(jump * 100).toFixed(0)}% volume (${allVolumes[j - 1].toFixed(0)}→${allVolumes[j].toFixed(0)}km)`);
        }
      }

      if (issues.length > 0) {
        console.log(`\n  🚨 ALERTES :`);
        issues.forEach(iss => console.log(`    ${iss}`));
      } else {
        console.log(`    ✅ Aucune alerte`);
      }
    }
    console.log(`\n${'═'.repeat(100)}`);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
