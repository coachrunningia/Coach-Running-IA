/**
 * Tests anti-régression Fix Validator — règle `mainset_duration_mismatch`.
 *
 * Détecte les séances où le `mainSet` annonce une durée/distance très
 * différente de `duration`/`distance` officiels (>20% drift).
 *
 * Cause racine : 24 sites geminiService mutent dur/km sans réécrire mainSet
 * (steph-fanny SL : duration "60 min" / mainSet "116 min de course").
 *
 * Skip explicite des types risqués (Fractionné, Tempo, Renforcement, ...)
 * où le mainSet contient des sous-ensembles structurés non comparables au
 * total séance.
 *
 * Lancer : npx vitest run src/services/__tests__/planValidator-mainset-mismatch.test.ts
 */

import { describe, it, expect } from 'vitest';
import { validatePlanRules } from '../planValidator';

// Helper pour construire un plan minimal acceptable par validatePlanRules
function makePlan(sessions: any[]): any {
  return {
    weeks: [
      {
        weekNumber: 1,
        phase: 'fondamental',
        isRecoveryWeek: false,
        sessions,
      },
    ],
  };
}

const baseQuestionnaire = {
  goal: 'Course sur route',
  subGoal: '10 km',
  level: 'Intermédiaire (Régulier)',
  frequency: 4,
};

describe('Fix Validator — règle mainset_duration_mismatch (détection)', () => {
  it('SL 60 min / mainSet "116 min de course" → mismatch detected (cas steph-fanny, mainOver)', () => {
    const plan = makePlan([
      {
        type: 'Sortie Longue',
        day: 'Dimanche',
        duration: '60 min',
        distance: '8 km',
        intensity: 'Facile',
        mainSet: '116 min de course continue en endurance fondamentale (7:00/km).',
        title: 'SL',
      },
      // Au moins un renfo + 3 autres pour passer les autres règles
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Jogging', day: 'Mardi', duration: '40 min', distance: '6 km', intensity: 'Facile', mainSet: '40 min EF', title: 'Footing' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssue = result.issues.find(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssue).toBeDefined();
    expect(mismatchIssue!.severity).toBe('warning');
    expect(mismatchIssue!.message).toMatch(/116\s*min/);
    expect(mismatchIssue!.message).toMatch(/60\s*min/);
  });

  it('Fartlek S01 dur 15 min / mainSet "20 min de footing" → mismatch (mainOver, bug réel)', () => {
    // Cas mini-batch S01 Mardi : duration=15 trop court vs warmup 10 + mainSet 20 + cooldown 5 = 35.
    // mainSet 20 > duration 15 × 1.10 = 16.5 → flag mainOver.
    const plan = makePlan([
      {
        type: 'Jogging',
        day: 'Mardi',
        duration: '15 min',
        distance: '2 km',
        intensity: 'Facile',
        warmup: '10 min de footing en endurance fondamentale.',
        mainSet: '20 min de footing en alternant librement, au ressenti.',
        cooldown: '5 min de footing lent puis marche.',
        title: 'Footing au ressenti',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssue = result.issues.find(i => i.rule === 'mainset_duration_mismatch' && /20\s*min/.test(i.message) && /15\s*min/.test(i.message));
    expect(mismatchIssue).toBeDefined();
  });

  it('Footing 8 km mainSet "12 km" → mismatch distance detected (>20%)', () => {
    const plan = makePlan([
      {
        type: 'Jogging',
        day: 'Mardi',
        duration: '50 min',
        distance: '8 km',
        intensity: 'Facile',
        mainSet: '50 min de footing soit 12 km en endurance fondamentale.',
        title: 'Footing',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssue = result.issues.find(i => i.rule === 'mainset_duration_mismatch' && /12\s*km/.test(i.message));
    expect(mismatchIssue).toBeDefined();
  });
});

describe('Fix Validator — règle mainset_duration_mismatch (skip)', () => {
  it('Fractionné "3 × 1 km à VMA" + duration 45 min → SKIP (type risky)', () => {
    const plan = makePlan([
      {
        type: 'Fractionné',
        day: 'Mardi',
        duration: '45 min',
        distance: '8 km',
        intensity: 'Difficile',
        mainSet: 'Échauffement 15 min, puis 3 × 1 km à allure VMA (récup 2 min trot), retour au calme 10 min.',
        title: 'Fractionné VMA',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });

  it('Renforcement "Squats 3×9" → SKIP (type risky)', () => {
    const plan = makePlan([
      {
        type: 'Renforcement',
        day: 'Lundi',
        duration: '30 min',
        intensity: 'Modéré',
        mainSet: 'Échauffement, Squats 3×9 récup 60s, Fentes 3×8, Gainage 3×45s. Total ~50 min de travail effectif.',
        title: 'Renfo',
      },
      { type: 'Jogging', day: 'Mardi', duration: '40 min', distance: '6 km', intensity: 'Facile', mainSet: '40 min EF', title: 'Footing' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });

  it('SL cohérente (60 min / mainSet "60 min de course") → pas de mismatch', () => {
    const plan = makePlan([
      {
        type: 'Sortie Longue',
        day: 'Dimanche',
        duration: '60 min',
        distance: '8 km',
        intensity: 'Facile',
        mainSet: '60 min de course continue en endurance fondamentale.',
        title: 'SL',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Jogging', day: 'Mardi', duration: '40 min', distance: '6 km', intensity: 'Facile', mainSet: '40 min EF', title: 'Footing' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });

  it('SL 1h00 / mainSet "42 min" SANS warmup/cooldown → mismatch (mainUnder)', () => {
    // mainSet 42 min < (60 - 0 - 0) × 0.5 = 30 ? NON. Donc 42 ≥ 30 → pas de flag.
    // On force le cas pathologique en mettant un mainSet vraiment trop court
    // pour que warmup+cooldown ne puissent pas combler.
    // Convention nouvelle : on ne flag plus les écarts ≈ wu+cool ; on flag
    // si mainSet > duration OU si mainSet < 50% de (duration - wu - cool).
    // Donc on construit un cas mainUnder réel : dur=60, wu=0, cool=0, main=10
    // → expectedMain=60, main 10 < 60*0.5=30 → flag.
    const plan = makePlan([
      {
        type: 'Sortie Longue',
        day: 'Dimanche',
        duration: '1h00',
        distance: '5.4 km',
        intensity: 'Facile',
        mainSet: '10 min de course continue en endurance fondamentale.',
        title: 'SL',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Jogging', day: 'Mardi', duration: '40 min', distance: '6 km', intensity: 'Facile', mainSet: '40 min EF', title: 'Footing' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBeGreaterThan(0);
  });

  it('Jogging 60 min / wu 5 / cool 5 / mainSet "45 min" → PAS de mismatch (convention LLM normale)', () => {
    // Cas typique mini-batch : mainSet < duration de wu+cool. Avant fix → 25% drift flag.
    // Maintenant : main 45 ≥ (60-5-5)*0.5 = 25 ET main ≤ 60*1.10 → ok.
    const plan = makePlan([
      {
        type: 'Jogging',
        day: 'Mardi',
        duration: '60 min',
        distance: '8 km',
        intensity: 'Facile',
        warmup: '5 min de marche puis montée progressive.',
        mainSet: '45 min de footing en endurance fondamentale (7:30/km).',
        cooldown: '5 min de footing lent puis marche.',
        title: 'Footing EF',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });

  it('SL cohérente avec léger écart 10% → pas de mismatch (sous seuil 20%)', () => {
    // 55 min mainSet vs 60 min duration → drift = 8.3 % → OK
    const plan = makePlan([
      {
        type: 'Sortie Longue',
        day: 'Dimanche',
        duration: '60 min',
        distance: '8 km',
        intensity: 'Facile',
        mainSet: '55 min de course continue en endurance fondamentale.',
        title: 'SL',
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Jogging', day: 'Mardi', duration: '40 min', distance: '6 km', intensity: 'Facile', mainSet: '40 min EF', title: 'Footing' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });

  it('Pas de mainSet → pas de mismatch (early return)', () => {
    const plan = makePlan([
      {
        type: 'Jogging',
        day: 'Mardi',
        duration: '40 min',
        distance: '6 km',
        intensity: 'Facile',
        title: 'Footing',
        // pas de mainSet
      },
      { type: 'Renforcement', day: 'Lundi', duration: '30 min', mainSet: 'Squats 3×9', title: 'Renfo', intensity: 'Modéré' },
      { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '8 km', intensity: 'Facile', mainSet: '60 min de course', title: 'SL' },
      { type: 'Jogging', day: 'Jeudi', duration: '35 min', distance: '5 km', intensity: 'Facile', mainSet: '35 min EF', title: 'Footing' },
    ]);
    const result = validatePlanRules(plan, baseQuestionnaire);
    const mismatchIssues = result.issues.filter(i => i.rule === 'mainset_duration_mismatch');
    expect(mismatchIssues.length).toBe(0);
  });
});
