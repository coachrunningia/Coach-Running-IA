// ============================================================================
// Tests V1 J3 — Runner principal
// ============================================================================
// Usage : node tests-v1/run-capture.mjs <variant> <outDir>
//   variant : "AVANT" ou "APRES"
//   outDir  : tests-v1/prompts-AVANT ou tests-v1/prompts-APRES
// ============================================================================

import { bundleGeminiService, capturePreviewPrompt, captureRemainingPrompt } from './build-and-capture.mjs';
import { PROFILES } from './profiles.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const variant = process.argv[2] || 'AVANT';
const outDir = resolve(__dirname, `prompts-${variant}`);
mkdirSync(outDir, { recursive: true });

const srcTs = resolve(ROOT, 'src/services/geminiService.ts');
const bundlePath = resolve(__dirname, `sandbox/bundle-${variant}-${randomBytes(4).toString('hex')}.mjs`);

console.log(`\n=== VARIANT: ${variant} ===`);
console.log(`Source : ${srcTs}`);
console.log(`Bundle : ${bundlePath}`);
console.log(`Output : ${outDir}\n`);

console.log('[1/3] Bundling geminiService.ts with esbuild...');
try {
  await bundleGeminiService(srcTs, bundlePath);
} catch (e) {
  console.error('[BUNDLE ERROR]', e?.message || e);
  if (e?.errors) {
    for (const err of e.errors) console.error('  →', err?.text || err);
  }
  process.exit(1);
}
console.log('[1/3] Bundle OK');

console.log('[2/3] Loading bundle...');
const mod = await import(bundlePath);
const has = (k) => typeof mod[k] === 'function';
if (!has('generatePreviewPlan') || !has('generateRemainingWeeks')) {
  console.error('[ERROR] missing exports:', Object.keys(mod));
  process.exit(1);
}
console.log('[2/3] Bundle loaded — exports OK\n');

// Stub minimal d'un plan preview pour appel generateRemainingWeeks SANS appel API préalable.
// generateRemainingWeeks lit ctx.questionnaireSnapshot et ctx.periodizationPlan ; pour avoir
// un periodizationPlan cohérent on appelle createGenerationContext via le module.
// On a pas exporté createGenerationContext → on dérive un periodizationPlan minimal.
// Pour rester fidèle, on utilise la même logique que createGenerationContext :
//   - faire un 1er appel "preview" capture → on attrape l'erreur __PROMPT_CAPTURED__ après écriture
//   - mais on n'a pas le plan retour. À la place, on construit un faux plan preview avec
//     un periodizationPlan minimaliste (phases égales par défaut + volume constant).
// Solution choisie : construire un plan fake compatible directement.

function buildFakePreviewPlan(profile) {
  const data = structuredClone(profile.data);
  // Estimation VMA mêmes valeurs par défaut que generatePreviewPlan
  let vma = 13.5;
  switch (data.level) {
    case 'Débutant (0-1 an)': vma = 11.0; break;
    case 'Intermédiaire (Régulier)': vma = 13.5; break;
    case 'Confirmé (Compétition)': vma = 15.5; break;
    case 'Expert (Performance)': vma = 17.5; break;
  }
  // Si chrono 5km/10km/semi/marathon → recalcule VMA grossière (cas profil 3,4,5,6,7,8,9)
  // Pour simplifier on garde la VMA par défaut pour Hyrox/Trail aussi ; la valeur exacte
  // n'affecte PAS la structure du prompt remaining (seulement les paces numériques affichés).
  const efPace = (60 / (vma * 0.67)).toFixed(2).replace('.', ':');
  const eaPace = (60 / (vma * 0.77)).toFixed(2).replace('.', ':');
  const seuilPace = (60 / (vma * 0.87)).toFixed(2).replace('.', ':');
  const vmaPace = (60 / vma).toFixed(2).replace('.', ':');
  const recovPace = (60 / (vma * 0.60)).toFixed(2).replace('.', ':');

  // Durée plan : calcule comme generatePreviewPlan
  let planDurationWeeks = 12;
  if (data.raceDate) {
    const raceDate = new Date(data.raceDate);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const diffDays = (raceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    planDurationWeeks = Math.max(4, Math.min(30, Math.ceil(diffDays / 7)));
  }

  // Garde-fou fréquence
  const goal = data.goal || '';
  const isAmbitiousGoal = goal.includes('Trail') || data.subGoal === 'Semi-Marathon' || data.subGoal === 'Marathon';
  if (data.frequency < 2) data.frequency = 2;
  if (isAmbitiousGoal && data.frequency < 3) data.frequency = 3;

  // Volume cible par sem — constant pour simplifier (le contenu textuel reste correct)
  const baseVolume = data.currentWeeklyVolume || 20;
  const weeklyVolumes = Array(planDurationWeeks).fill(baseVolume);

  // Phases — placeholders réalistes
  const weeklyPhases = [];
  for (let i = 0; i < planDurationWeeks; i++) {
    if (i < Math.floor(planDurationWeeks * 0.4)) weeklyPhases.push('fondamental');
    else if (i < Math.floor(planDurationWeeks * 0.7)) weeklyPhases.push('developpement');
    else if (i < planDurationWeeks - 2) weeklyPhases.push('specifique');
    else weeklyPhases.push('affutage');
  }

  // Récup weeks
  const recoveryWeeks = [];
  for (let w = 4; w <= planDurationWeeks; w += 4) recoveryWeeks.push(w);

  const weeklyElevationTarget = goal.includes('Trail') && data.trailDetails
    ? Array(planDurationWeeks).fill(Math.round(data.trailDetails.elevation * 0.55))
    : undefined;

  const fakePlan = {
    id: 'TEST_FAKE_PLAN_' + Math.random().toString(36).slice(2, 8),
    userId: 'test',
    createdAt: new Date().toISOString(),
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    name: 'Fake plan',
    goal: data.goal,
    raceDate: data.raceDate,
    weeks: [
      {
        weekNumber: 1,
        theme: 'Semaine 1 — Base',
        sessions: Array(data.frequency).fill(null).map((_, i) => ({
          id: 's' + i, day: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][i],
          type: i === data.frequency - 1 ? 'Renforcement' : 'Jogging',
          duration: '40 min', title: 'Test', warmup: '', mainSet: '', cooldown: '', advice: '',
        })),
      },
    ],
    isPreview: true,
    fullPlanGenerated: false,
    generationContext: {
      vma,
      vmaSource: `Estimation niveau ${data.level}`,
      paces: {
        efPace, eaPace, seuilPace, vmaPace, recoveryPace: recovPace,
        allureSpecifique5k: efPace, allureSpecifique10k: efPace,
        allureSpecifiqueSemi: efPace, allureSpecifiqueMarathon: efPace,
      },
      periodizationPlan: {
        totalWeeks: planDurationWeeks,
        weeklyVolumes,
        weeklyPhases,
        recoveryWeeks,
        weeklyElevationTarget,
      },
      questionnaireSnapshot: data,
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
  };
  return fakePlan;
}

console.log('[3/3] Capturing 10 profiles × 2 prompts each = 20 prompts...\n');

let successPreview = 0, successRemaining = 0, failures = [];
for (let i = 0; i < PROFILES.length; i++) {
  const p = PROFILES[i];
  const idx = String(i + 1).padStart(2, '0');

  // Preview
  const previewOut = resolve(outDir, `profil-${idx}-${p.label}-preview.txt`);
  try {
    await capturePreviewPrompt(mod, p.data, previewOut);
    console.log(`  ✓ [${idx}] preview : ${p.label}`);
    successPreview++;
  } catch (e) {
    console.error(`  ✗ [${idx}] preview FAIL : ${p.label} →`, e?.message || e);
    failures.push({ profile: p.label, type: 'preview', error: String(e?.message || e) });
  }

  // Remaining
  const remainingOut = resolve(outDir, `profil-${idx}-${p.label}-remaining.txt`);
  try {
    const fakePlan = buildFakePreviewPlan(p);
    await captureRemainingPrompt(mod, fakePlan, remainingOut);
    console.log(`  ✓ [${idx}] remaining : ${p.label}`);
    successRemaining++;
  } catch (e) {
    console.error(`  ✗ [${idx}] remaining FAIL : ${p.label} →`, e?.message || e);
    failures.push({ profile: p.label, type: 'remaining', error: String(e?.message || e) });
  }
}

console.log(`\n=== RESULT ${variant} ===`);
console.log(`Preview captured : ${successPreview}/${PROFILES.length}`);
console.log(`Remaining captured : ${successRemaining}/${PROFILES.length}`);
if (failures.length) {
  console.log(`Failures :`);
  for (const f of failures) console.log(`  - [${f.profile}] ${f.type} : ${f.error}`);
}
console.log('Output dir :', outDir);
