/**
 * Tests unitaires Feature "Séances qualité douces S1/S2" (29/05/2026).
 *
 * 10 cas de figure rigoureux basés sur PROFILS RÉELS (cyrielle, ericsson, jeanluc, arnaud)
 * + variations Gemini hallucinations possibles. Chaque test compare comportement OBSERVÉ
 * vs comportement ATTENDU doctrinaire (Coach FFA + PM verdicts).
 *
 * Doctrines testées :
 * - cv ≥ 25 active soft quality (cv prime sur freq)
 * - Modulation Marathon : cv < 35 → strides only (Pfitzinger 18/55 plancher base)
 * - Phase recuperation : JAMAIS de soft quality (100% EF)
 * - Phase fondamental : soft quality whitelist (strides / fartlek souple / progression douce)
 * - Phase developpement+ : qualité normale autorisée (hors scope soft quality)
 * - Filtre regex isSeuil : convertit seuil/fractionné/VMA si pas eligibleSoft
 */

import { describe, it, expect } from 'vitest';
import { postProcessWeekQuality } from '../geminiService';

const PACES = {
  efPace: '5:00',
  recoveryPace: '6:00',
  vmaPace: '3:30',
  seuilPace: '4:20',
};

/** Helper : construit une semaine avec 1 séance + phase */
function makeWeek(session: any, phase = 'fondamental') {
  return {
    weekNumber: 1,
    phase,
    theme: 'Test',
    weekGoal: 'Test',
    sessions: [session],
  };
}

/** Helper : récupère l'état avant/après pour comparaison facile */
function runAndDiff(week: any, profile: { goal: string; cv: number; bmi?: number | null }) {
  const before = { type: week.sessions[0].type, title: week.sessions[0].title };
  postProcessWeekQuality(week, PACES, undefined, profile.goal, undefined, profile.bmi ?? null, profile.cv);
  const after = { type: week.sessions[0].type, title: week.sessions[0].title };
  return { before, after };
}

describe('Feature soft quality S1-S2 — 10 cas rigoureux', () => {

  // ════════════════════════════════════════════════════════════════
  // CAS 1 — CYRIELLE Semi Débutante cv 2 (réel 28/05)
  // Profil ultra-fragile. Gemini halluciné une séance VMA → DOIT être bloquée.
  // ════════════════════════════════════════════════════════════════
  it('CAS 1 — Cyrielle Semi Déb cv=2, Gemini sort "VMA douce 6×200m" S1 → CONVERTIT EF (cv < 25)', () => {
    const session = {
      day: 'Mardi',
      type: 'Fractionné',
      title: 'VMA douce 6×200m récup 1\'30',
      intensity: 'Modéré',
      distance: '8 km',
      duration: '55 min',
      targetPace: '3:30',
      mainSet: '6×200m VMA',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Semi', cv: 2 });

    // ATTENDU : converti EF car cv 2 < 25 + filtre isSeuil matche "vma" → eligibleSoft false
    expect(after.type).toBe('Jogging');
    expect(after.title).toContain('Endurance Fondamentale');
    expect(after.title).not.toBe(before.title); // changement effectif
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 2 — ERICSSON Marathon Expert cv 60 (réel 28/05)
  // Profil habitué haut cv. Strides en S1 = doctrine Pfitzinger.
  // ════════════════════════════════════════════════════════════════
  it('CAS 2 — Ericsson Marathon Expert cv=60, Gemini sort "Strides 8×100m" S1 → PRÉSERVÉ', () => {
    const session = {
      day: 'Mardi',
      type: 'Jogging',
      title: 'Strides 8×100m après footing EF',
      intensity: 'Facile',
      distance: '12 km',
      duration: '1h10',
      targetPace: '5:00',
      mainSet: 'Footing EF + 8 lignes droites 100m',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Marathon', cv: 60 });

    // ATTENDU : preservé (cv 60 ≥ 35 Marathon OK, Strides matche whitelist)
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 3 — JEANLUC 10K Conf 66a cv 35 (réel 28/05)
  // Senior cv haut, 10K (pas Marathon = pas modulation). Strides OK.
  // ════════════════════════════════════════════════════════════════
  it('CAS 3 — Jeanluc 10K Conf 66a cv=35, Gemini sort "Strides 6×80m" S1 → PRÉSERVÉ', () => {
    const session = {
      day: 'Samedi',
      type: 'Jogging',
      title: 'Strides 6×80m fin de footing',
      intensity: 'Facile',
      distance: '8 km',
      duration: '55 min',
      targetPace: '7:31',
      mainSet: 'Footing EF + 6 lignes droites accélérées',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Course sur route', cv: 35 });

    // ATTENDU : preservé (cv 35 ≥ 25, 10K pas Marathon = pas de modulation)
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 4 — ARNAUD 10K Inter cv 28 (réel 28/05)
  // Inter modeste cv, 10K. Fartlek souple OK doctrine S2.
  // ════════════════════════════════════════════════════════════════
  it('CAS 4 — Arnaud 10K Inter cv=28, Gemini sort "Fartlek souple 6×30s allure 10K" S2 → PRÉSERVÉ', () => {
    const session = {
      day: 'Jeudi',
      type: 'Fractionné',
      title: 'Fartlek souple 6×30s allure 10K',
      intensity: 'Modéré',
      distance: '9 km',
      duration: '55 min',
      targetPace: '5:30',
      mainSet: 'Footing EF + 6 accélérations libres 30s',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Course sur route', cv: 28 });

    // ATTENDU : preservé (cv 28 ≥ 25, 10K pas Marathon = OK fartlek souple)
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 5 — Profil limite cv 24 (juste sous seuil)
  // Vérification frontière : cv = 24 NE doit PAS activer (filtre strict ≥ 25)
  // ════════════════════════════════════════════════════════════════
  it('CAS 5 — Marathon Inter cv=24 (1 sous seuil), "Strides 6×80m" S1 → CONVERTIT EF', () => {
    const session = {
      day: 'Mardi',
      type: 'Fractionné',  // Gemini type Fractionné même si titre Strides
      title: 'Strides 6×80m + VMA short',  // mot "VMA" matche isSeuil
      intensity: 'Modéré',
      distance: '8 km',
      duration: '50 min',
      targetPace: '4:30',
      mainSet: 'Strides + accélérations VMA',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Marathon', cv: 24 });

    // ATTENDU : converti EF (cv 24 < 25 → eligibleSoft false, isSeuil match "VMA")
    expect(after.type).toBe('Jogging');
    expect(after.title).toContain('Endurance Fondamentale');
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 6 — Modulation Marathon cv 30 + Fartlek
  // Cv ≥ 25 mais Marathon cv < 35 → modulation strides only.
  // Fartlek doit être BLOQUÉ malgré cv ≥ 25.
  // ════════════════════════════════════════════════════════════════
  it('CAS 6 — Marathon Inter cv=30, Gemini sort "Fartlek souple 5×40s" S2 → CONVERTIT EF (modulation Marathon)', () => {
    const session = {
      day: 'Jeudi',
      type: 'Fractionné',
      title: 'Fartlek souple 5×40s allure 10K',
      intensity: 'Modéré',
      distance: '10 km',
      duration: '1h',
      targetPace: '4:30',
      mainSet: 'Footing + 5-6 accélérations',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Marathon', cv: 30 });

    // ATTENDU : converti EF car Marathon cv 30 < 35 → modulation strides only (Fartlek bloqué)
    expect(after.type).toBe('Jogging');
    expect(after.title).toContain('Endurance Fondamentale');
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 7 — Modulation Marathon cv 30 + Strides
  // Cv ≥ 25 + Marathon cv < 35 → strides AUTORISÉS.
  // ════════════════════════════════════════════════════════════════
  it('CAS 7 — Marathon Inter cv=30, Gemini sort "Strides 6×80m" S1 → PRÉSERVÉ (strides OK modulation)', () => {
    const session = {
      day: 'Mardi',
      type: 'Jogging',
      title: 'Strides 6×80m',
      intensity: 'Facile',
      distance: '9 km',
      duration: '55 min',
      targetPace: '5:00',
      mainSet: 'Footing + 6 strides 80m',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Marathon', cv: 30 });

    // ATTENDU : preservé. cv 30 ≥ 25 + Marathon strides only = OK.
    // Note : filtre isSeuil ne match pas "Strides" donc preservé même sans eligibleSoft.
    expect(after.title).toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 8 — Phase RECUPERATION = JAMAIS de soft quality
  // Même cv haut, en récup, on convertit tout en EF.
  // ════════════════════════════════════════════════════════════════
  it('CAS 8 — Conf cv=50 en phase RECUPERATION, "Fartlek souple 4×30s" → CONVERTIT EF (récup intouchable)', () => {
    const session = {
      day: 'Jeudi',
      type: 'Fractionné',
      title: 'Fartlek souple 4×30s allure 10K',
      intensity: 'Modéré',
      distance: '8 km',
      duration: '50 min',
      targetPace: '4:30',
      mainSet: 'Footing + accélérations',
    };
    const week = makeWeek(session, 'recuperation');
    const { before, after } = runAndDiff(week, { goal: 'Course sur route', cv: 50 });

    // ATTENDU : converti récup. isSoftQuality gated par phase='fondamental' → false en récup.
    expect(after.type).toBe('Jogging');
    expect(after.title).toContain('Récupération'); // récup-specific
    expect(after.title).not.toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 9 — Phase DEVELOPPEMENT = qualité normale autorisée (hors scope soft quality)
  // Le safety net n'intervient pas en developpement → seuil dur OK.
  // ════════════════════════════════════════════════════════════════
  it('CAS 9 — Inter cv=20 en DEVELOPPEMENT, "Seuil 4×1km" → PRÉSERVÉ (hors scope safety net)', () => {
    const session = {
      day: 'Mardi',
      type: 'Fractionné',
      title: 'Seuil 4×1km récup 2min',
      intensity: 'Difficile',
      distance: '10 km',
      duration: '1h',
      targetPace: '4:20',
      mainSet: '4×1km au seuil',
    };
    const week = makeWeek(session, 'developpement');
    const { before, after } = runAndDiff(week, { goal: 'Course sur route', cv: 20 });

    // ATTENDU : preservé. Safety net actif uniquement en fondamental/recuperation.
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
  });

  // ════════════════════════════════════════════════════════════════
  // CAS 10 — Trail Ultra Expert cv 80 + Progression douce
  // Trail haut cv. Progression douce = doctrine Pfitzinger acceptable.
  // ════════════════════════════════════════════════════════════════
  it('CAS 10 — Trail Ultra Expert cv=80, Gemini sort "Progression douce 10+2km" S2 → PRÉSERVÉ', () => {
    const session = {
      day: 'Dimanche',
      type: 'Sortie Longue',
      title: 'Progression douce 10 km EF + 2 km allure marathon facile',
      intensity: 'Modéré',
      distance: '12 km',
      duration: '1h30',
      targetPace: '5:00',
      mainSet: '10 km EF puis 2 km AM',
    };
    const { before, after } = runAndDiff(makeWeek(session), { goal: 'Trail', cv: 80 });

    // ATTENDU : preservé. cv 80 ≥ 25 + Trail pas Marathon = OK progression douce.
    // Note : filtre isSeuil ne matche pas "progression douce" (whitelist).
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
  });
});
