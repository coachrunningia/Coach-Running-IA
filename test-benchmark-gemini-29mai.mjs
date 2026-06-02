#!/usr/bin/env node
/**
 * Benchmark 3 modèles Gemini Flash pour décision swap (29/05/2026 17:00).
 * Compare latence réelle p50 sur 3 runs chacun avec prompt réaliste (~3500 tokens).
 *
 * Usage : node test-benchmark-gemini-29mai.mjs
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'node:fs';

// Lit la clé depuis .env
const envContent = readFileSync('.env', 'utf-8');
const apiKey = envContent.match(/VITE_GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error('Pas de clé Gemini'); process.exit(1); }
const genAI = new GoogleGenerativeAI(apiKey);

// Prompt réaliste représentant ce que l'app envoie pour 1 semaine de plan course
const PROMPT_REALISTIC = `Tu es coach running pro. Génère semaine 1 d'un plan de préparation MARATHON 3h30 pour ce coureur.

PROFIL UTILISATEUR :
- Homme, 35 ans, 72 kg, 175 cm
- VMA : 14.5 km/h (Marathon 3h45 récent)
- Niveau : Confirmé (Compétition)
- Volume actuel : 45 km/sem
- Fréquence : 5 séances/sem
- Sortie longue : Dimanche
- Jours disponibles : Lun / Mar / Jeu / Sam / Dim
- Ville : Paris
- Pas de blessure

ALLURES CALCULÉES :
- EF : 6:11 min/km (67% VMA)
- EA : 5:24 min/km
- Seuil : 4:55 min/km
- VMA : 4:08 min/km
- Allure Marathon : 4:58 min/km
- Récupération : 6:54 min/km

PHASE S1 : fondamental
VOLUME CIBLE S1 : 45 km
SORTIE LONGUE : Dimanche, 17 km minimum

RÈGLES :
- EXACTEMENT 5 séances dans la semaine 1
- Jours : Lundi, Mardi, Jeudi, Samedi, Dimanche UNIQUEMENT
- Sortie longue Dimanche OBLIGATOIRE
- 1 séance Renforcement OBLIGATOIRE (samedi)
- En phase fondamentale : Jogging + Sortie Longue + Renforcement uniquement
- VARIÉTÉ : chaque footing doit avoir un thème DIFFÉRENT

Génère un JSON strict avec ce schéma :
{
  "weekNumber": 1,
  "phase": "fondamental",
  "theme": "string court",
  "weekGoal": "string court",
  "sessions": [
    {
      "id": "w1-sN-string",
      "day": "Lundi|Mardi|Jeudi|Samedi|Dimanche",
      "type": "Jogging|Sortie Longue|Renforcement",
      "title": "string",
      "intensity": "Facile|Modéré|Difficile",
      "distance": "X km",
      "duration": "Xh XX min",
      "targetPace": "X:XX",
      "warmup": "string 30 mots max",
      "mainSet": "string 80 mots max",
      "cooldown": "string 30 mots max",
      "advice": "string 50 mots max"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans markdown ni explications.`;

const MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

async function bench(modelId) {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
  });
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    try {
      const result = await model.generateContent(PROMPT_REALISTIC);
      const latency = Date.now() - start;
      const text = result.response.text();
      const usage = result.response.usageMetadata || {};
      const finishReason = result.response.candidates?.[0]?.finishReason || '?';
      runs.push({
        latency,
        ok: true,
        promptTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
        finishReason,
        outputLength: text.length,
      });
      console.log(`  Run ${i+1}: ${latency}ms | tokens=${usage.promptTokenCount}+${usage.candidatesTokenCount} | finish=${finishReason} | output=${text.length} chars`);
    } catch (e) {
      const latency = Date.now() - start;
      runs.push({ latency, ok: false, error: e.message.slice(0, 100) });
      console.log(`  Run ${i+1}: ${latency}ms | ERROR: ${e.message.slice(0, 80)}`);
    }
  }
  return runs;
}

(async () => {
  console.log('=== Benchmark Gemini Flash 29/05/2026 ===\n');
  console.log(`Prompt réaliste : ${PROMPT_REALISTIC.length} chars (~${Math.round(PROMPT_REALISTIC.length/4)} tokens estimé)\n`);

  const results = {};
  for (const model of MODELS) {
    console.log(`--- ${model} ---`);
    results[model] = await bench(model);
    console.log();
  }

  console.log('\n=== Résumé ===');
  console.log('Modèle                       | p50 latence | p99 (max) | avg tokens out | finishReason');
  console.log('-----------------------------+-------------+-----------+----------------+-------------');
  for (const [model, runs] of Object.entries(results)) {
    const okRuns = runs.filter(r => r.ok);
    if (okRuns.length === 0) {
      console.log(`${model.padEnd(28)} | ALL FAILED  | -         | -              | ERROR`);
      continue;
    }
    const latencies = okRuns.map(r => r.latency).sort((a,b)=>a-b);
    const p50 = latencies[Math.floor(latencies.length / 2)];
    const max = latencies[latencies.length - 1];
    const avgOut = Math.round(okRuns.reduce((s, r) => s + (r.outputTokens || 0), 0) / okRuns.length);
    const finishes = [...new Set(okRuns.map(r => r.finishReason))].join(',');
    console.log(`${model.padEnd(28)} | ${String(p50).padStart(8)}ms | ${String(max).padStart(6)}ms | ${String(avgOut).padStart(14)} | ${finishes}`);
  }
})();
