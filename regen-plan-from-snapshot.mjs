#!/usr/bin/env node
// regen-plan-from-snapshot.mjs
// Régénère un plan d'entraînement Coach Running IA depuis un snapshot
// questionnaire JSON (format identique à `questionnaireSnapshot` Firestore),
// en utilisant le code prod tel quel.
//
// Usage :
//   node regen-plan-from-snapshot.mjs --input fixture.json --output plan.json
//
// Pré-requis :
//   1. `.env` à la racine du repo avec VITE_GEMINI_API_KEY=...
//   2. Bundle prod compilé : `node scripts/regen/build-pipeline.mjs`
//      (regénéré auto si manquant)
//
// Approche : voir SETUP-REGEN-PROD-PIPELINE.md (option C : bundle esbuild).

import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname;

// ─── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
const inputPath = getArg('--input');
const outputPath = getArg('--output');
const forceRebuild = args.includes('--rebuild');

if (!inputPath || !outputPath) {
  console.error('Usage: node regen-plan-from-snapshot.mjs --input <profile.json> --output <plan.json> [--rebuild]');
  process.exit(1);
}

// ─── 1. Charger .env ───────────────────────────────────────────────────
const envPath = resolve(repoRoot, '.env');
if (!existsSync(envPath)) {
  console.error(`[regen] .env introuvable : ${envPath}`);
  process.exit(2);
}
dotenv.config({ path: envPath, override: false });
if (!process.env.VITE_GEMINI_API_KEY) {
  console.error('[regen] VITE_GEMINI_API_KEY absent dans .env');
  process.exit(2);
}

// ─── 2. (Re)build du bundle si nécessaire ──────────────────────────────
const bundlePath = resolve(repoRoot, 'scripts/regen/.build/pipeline.mjs');
const builderPath = resolve(repoRoot, 'scripts/regen/build-pipeline.mjs');
const srcPath = resolve(repoRoot, 'src/services/geminiService.ts');

async function bundleIsStale() {
  if (forceRebuild) return true;
  if (!existsSync(bundlePath)) return true;
  try {
    const bundleStat = await stat(bundlePath);
    const srcStat = await stat(srcPath);
    return srcStat.mtimeMs > bundleStat.mtimeMs;
  } catch {
    return true;
  }
}

if (await bundleIsStale()) {
  console.error('[regen] Bundle absent ou périmé → rebuild...');
  const result = spawnSync('node', [builderPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('[regen] Échec du build');
    process.exit(3);
  }
}

// ─── 3. Charger le profil ──────────────────────────────────────────────
const profileRaw = await readFile(resolve(inputPath), 'utf8');
const profile = JSON.parse(profileRaw);
console.error(`[regen] Profil chargé: ${profile.email || '<no-email>'} | ${profile.subGoal || profile.goal} | ${profile.level} | freq=${profile.frequency}`);

// ─── 4. Importer la pipeline et générer ────────────────────────────────
const { generatePreviewPlan } = await import(pathToFileURL(bundlePath).href);

console.error('[regen] Appel generatePreviewPlan() — peut prendre 30-90s...');
const t0 = Date.now();
let plan;
try {
  plan = await generatePreviewPlan(profile);
} catch (err) {
  console.error('[regen] Échec generatePreviewPlan:', err.message);
  console.error(err.stack);
  process.exit(4);
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.error(`[regen] OK en ${elapsed}s`);

// ─── 5. Écrire la sortie ───────────────────────────────────────────────
await writeFile(resolve(outputPath), JSON.stringify(plan, null, 2), 'utf8');
console.error(`[regen] Plan écrit → ${outputPath}`);

// ─── 6. Récap rapide ───────────────────────────────────────────────────
console.error('--- Récap ---');
console.error('feasibility.status   :', plan?.feasibility?.status);
console.error('weeks.length         :', plan?.weeks?.length);
console.error('weeks[0].sessions    :', plan?.weeks?.[0]?.sessions?.length);
console.error('paces.allureSpe10k   :', plan?.paces?.allureSpecifique10k);
console.error('welcomeMessage.len   :', plan?.welcomeMessage?.length);
