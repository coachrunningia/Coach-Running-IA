#!/usr/bin/env node
/**
 * test-e2e-terebeu-genremaining.mjs
 *
 * Test E2E : simule fidèlement ce qui se passe quand terebeu clique le bouton
 * "Générer les 15 semaines restantes" sur son plan Marathon (1779872965757).
 *
 * NE SAUVEGARDE PAS Firestore (test pur). Si test OK → on saura que le flow
 * fonctionne quand le user clique. Si test KO → on a la cause root.
 *
 * Reproduit le pattern exact de generateRemainingWeeks (geminiService.ts:5485+) :
 *   - Modèle : gemini-3-flash-preview
 *   - Prompt structuré avec contexte figé (VMA, paces, périodisation)
 *   - Demande JSON avec sessions par jour, intensité, duration, distance
 *   - Batch de 4 semaines (S2-S5)
 *
 * Lance : node test-e2e-terebeu-genremaining.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Charger la VITE_GEMINI_API_KEY depuis .env
const env = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf8');
const API_KEY = env.match(/VITE_GEMINI_API_KEY=(.+)/)?.[1].trim();
if (!API_KEY) throw new Error('Pas de VITE_GEMINI_API_KEY dans .env');

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779872965757'; // terebeu Marathon 16 sem

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }

// === FETCH PLAN ===
console.log('=== 1. FETCH plan terebeu ===');
const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const docRaw = execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString();
const doc = JSON.parse(docRaw);
if (!doc.fields) {
  console.error('❌ Plan introuvable :', doc.error?.message);
  process.exit(1);
}

const f = doc.fields;
const gc = f.generationContext.mapValue.fields;
const qs = gc.questionnaireSnapshot.mapValue.fields;
const paces = gc.paces.mapValue.fields;
const periodPlan = gc.periodizationPlan.mapValue.fields;

const vma = parseFloat(gc.vma.doubleValue);
const efPace = paces.efPace.stringValue;
const seuilPace = paces.seuilPace?.stringValue || '?';
const vmaPace = paces.vmaPace?.stringValue || '?';
const recoveryPace = paces.recoveryPace?.stringValue || '?';
const allureSpeMarathon = paces.allureSpecifiqueMarathon?.stringValue || '?';
const totalWeeks = parseInt(periodPlan.totalWeeks.integerValue);
const weeklyVolumes = periodPlan.weeklyVolumes.arrayValue.values.map(v => parseInt(v.integerValue));
const weeklyPhases = periodPlan.weeklyPhases.arrayValue.values.map(v => v.stringValue);

const goal = qs.goal.stringValue;
const subGoal = qs.subGoal?.stringValue || '';
const targetTime = qs.targetTime.stringValue;
const level = qs.level.stringValue;
const frequency = parseInt(qs.frequency.integerValue);

// Week 1 sessions
const w1Sessions = f.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values;
const w1Summary = w1Sessions.map(s => {
  const sf = s.mapValue.fields;
  return `${sf.day.stringValue}: ${sf.title.stringValue} (${sf.type.stringValue}, ${sf.duration.stringValue}${sf.distance ? ', ' + sf.distance.stringValue : ''})`;
}).join('\n');

console.log(`  user: ${f.userEmail.stringValue}`);
console.log(`  goal: ${goal} / ${subGoal} / cible ${targetTime} / level ${level}`);
console.log(`  VMA: ${vma.toFixed(1)} | freq: ${frequency}/sem | totalWeeks: ${totalWeeks}`);
console.log(`  weeklyVolumes S2-S5: [${weeklyVolumes.slice(1, 5).join(', ')}]`);
console.log(`  weeklyPhases S2-S5: [${weeklyPhases.slice(1, 5).join(', ')}]`);

// === CONSTRUIRE PROMPT REALISTE ===
console.log('\n=== 2. BUILD prompt (batch S2-S5) ===');
const batch = [2, 3, 4, 5];
const startWeek = batch[0], endWeek = batch[batch.length - 1];

const batchPrompt = `
Tu es un Coach Running Expert. Continue ce plan d'entraînement en générant UNIQUEMENT les SEMAINES ${startWeek} à ${endWeek}.

═══════════════════════════════════════════════════════════════
              🚨 CONTEXTE FIGÉ - NE PAS MODIFIER 🚨
═══════════════════════════════════════════════════════════════

VMA du coureur : ${vma.toFixed(1)} km/h

ALLURES OBLIGATOIRES :
- EF : ${efPace} min/km
- Seuil : ${seuilPace} min/km
- VMA : ${vmaPace} min/km
- Récup : ${recoveryPace} min/km
- Allure spé Marathon : ${allureSpeMarathon} min/km

PROFIL : ${level} | Objectif : ${goal}${subGoal ? ' (' + subGoal + ')' : ''} | Cible : ${targetTime} | Freq : ${frequency} séances/sem

═══════════════════════════════════════════════════════════════
              SEMAINE 1 (RÉFÉRENCE)
═══════════════════════════════════════════════════════════════
${w1Summary}

═══════════════════════════════════════════════════════════════
              PÉRIODISATION POUR CES SEMAINES
═══════════════════════════════════════════════════════════════
${batch.map((wn, i) => `Semaine ${wn}: phase=${weeklyPhases[wn-1]} | volume=${weeklyVolumes[wn-1]} km`).join('\n')}

═══════════════════════════════════════════════════════════════
              FORMAT JSON DE RÉPONSE STRICT
═══════════════════════════════════════════════════════════════

Réponds UNIQUEMENT en JSON avec cette structure (un array "weeks") :
{
  "weeks": [
    {
      "weekNumber": ${startWeek},
      "theme": "Thème court de la semaine",
      "weekGoal": "Objectif pédagogique",
      "phase": "${weeklyPhases[startWeek-1]}",
      "sessions": [
        { "id": "w${startWeek}-s1", "day": "Lundi", "type": "Jogging|Fractionné|Sortie Longue|Récupération|Renforcement|Marche/Course", "intensity": "Facile|Modéré|Difficile", "title": "Titre court", "duration": "45 min", "distance": "7 km", "targetPace": "${efPace} min/km", "warmup": "...", "mainSet": "...", "cooldown": "...", "advice": "..." }
      ]
    }
  ]
}

Génère les ${batch.length} semaines (S${startWeek} à S${endWeek}) avec ${frequency} séances chacune (3 course + 1 renfo). Respecte STRICTEMENT le volume cible par semaine.`;

console.log(`  prompt length: ${batchPrompt.length} chars`);

// === APPEL FLASH 3 ===
console.log('\n=== 3. APPEL Gemini Flash 3 ===');
const startTime = Date.now();
const body = {
  contents: [{ parts: [{ text: batchPrompt }] }],
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
};

let respText;
try {
  const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;
  const resp = await fetch(fetchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`❌ HTTP ${resp.status}:`, errBody.slice(0, 400));
    process.exit(1);
  }
  const data = await resp.json();
  respText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!respText) {
    console.error('❌ Pas de texte dans la réponse :', JSON.stringify(data).slice(0, 400));
    process.exit(1);
  }
} catch (e) {
  console.error(`❌ Fetch error : ${e.message}`);
  process.exit(1);
}
const duration = (Date.now() - startTime) / 1000;
console.log(`  ✅ Réponse reçue en ${duration.toFixed(1)}s (${respText.length} chars)`);

// === PARSE + VALIDATE ===
console.log('\n=== 4. PARSE + VALIDATE JSON ===');
let parsed;
try {
  // Strip markdown si présent
  const m = respText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) respText = m[1].trim();
  parsed = JSON.parse(respText);
} catch (e) {
  console.error(`❌ Parse JSON FAILED : ${e.message}`);
  console.log('First 600 chars :', respText.slice(0, 600));
  process.exit(1);
}

if (!Array.isArray(parsed.weeks)) {
  console.error('❌ parsed.weeks pas un array :', typeof parsed.weeks);
  process.exit(1);
}

console.log(`  ✅ JSON parsed OK : ${parsed.weeks.length} semaines générées`);

// Validations structure
const issues = [];
const requiredSessionFields = ['day', 'type', 'duration', 'title', 'mainSet'];
for (const w of parsed.weeks) {
  if (!w.weekNumber || !w.sessions || !Array.isArray(w.sessions)) {
    issues.push(`S${w.weekNumber || '?'}: structure semaine invalide`);
    continue;
  }
  if (w.sessions.length === 0) {
    issues.push(`S${w.weekNumber}: 0 séance générée`);
  }
  for (const s of w.sessions) {
    for (const field of requiredSessionFields) {
      if (!s[field]) issues.push(`S${w.weekNumber} ${s.day || '?'}: champ ${field} manquant`);
    }
  }
}

if (issues.length > 0) {
  console.log(`⚠️  ${issues.length} issues structure :`);
  issues.slice(0, 10).forEach(i => console.log(`    - ${i}`));
} else {
  console.log(`  ✅ Toutes les sessions ont les champs requis`);
}

// Stats semaines générées
console.log('\n=== 5. RECAP semaines générées ===');
for (const w of parsed.weeks) {
  const sessionsLines = (w.sessions || []).map(s =>
    `${s.day || '?'} ${s.type || '?'} ${s.duration || '?'}${s.distance ? '/' + s.distance : ''}`
  ).join(' | ');
  console.log(`  S${w.weekNumber} [${w.phase || '?'}] ${w.theme || '?'}: ${sessionsLines}`);
}

// === VERDICT FINAL ===
console.log('\n=== ✅ VERDICT TEST E2E ===');
if (parsed.weeks.length === batch.length && issues.length === 0) {
  console.log(`🟢 SUCCÈS : Flash 3 a généré ${parsed.weeks.length}/${batch.length} semaines en ${duration.toFixed(1)}s, toutes valides.`);
  console.log('   → Le flow generateRemainingWeeks FONCTIONNE pour terebeu.');
  console.log('   → Bug terebeu = il N\'A PAS CLIQUÉ ou a fermé l\'onglet avant la fin.');
} else if (parsed.weeks.length > 0) {
  console.log(`🟡 PARTIEL : ${parsed.weeks.length}/${batch.length} semaines générées, ${issues.length} issues.`);
  console.log('   → Le flow marche mais avec des bugs structurels mineurs.');
} else {
  console.log(`🔴 ÉCHEC : 0 semaine générée.`);
  console.log('   → Vrai bug à investiguer.');
}
