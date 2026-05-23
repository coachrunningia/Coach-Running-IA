/**
 * Sprint E Phase 2 — Bug 16 : seuilPace réajustement post-override Elite.
 *
 * Source :
 *   - Patch zone : applyTargetTimeOverride end (~ L1460), helper paceToSeconds local.
 *   - Daniels T-pace : seuil = pace HM + 5-10 sec/km (milieu fourchette : +8s).
 *
 * Cas Armando-like (Elite VMA > 16, PB Semi 1h20) :
 *   - allureSpecifiqueSemi VMA-based = 3:47/km
 *   - seuilPace VMA-based = 3:47/km (identité)
 *   - → séance seuil = séance spécifique → brise pédagogie 80/20
 * Correction : seuil repoussé à semi + 8 sec/km = 3:55/km (≥ 3:52).
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase2-bug16-seuilpace-elite.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateAllPaces, applyTargetTimeOverride } from '../geminiService';
import type { QuestionnaireData } from '../../types';

// Helper : convertit "m:ss" en secondes pour comparaison numérique.
const paceSec = (pace: string): number => {
  const m = pace.match(/^(\d+):(\d+)/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
};

describe('Bug 16 — seuilPace Elite réajusté post-override', () => {
  it('Armando-like Elite Semi 1h20 → seuilPace ≥ semi + 5s/km (≥ 3:52/km)', () => {
    const vma = 19.5;                          // Elite > 16
    const paces = calculateAllPaces(vma);
    const data: Partial<QuestionnaireData> = {
      subGoal: 'Semi-marathon',
      targetTime: '1h20',
    };
    applyTargetTimeOverride(paces, data as QuestionnaireData, vma);

    const semiSec = paceSec(paces.allureSpecifiqueSemi);
    const seuilSec = paceSec(paces.seuilPace);
    // Critère Daniels : seuil ≥ semi + 5 sec/km
    expect(seuilSec).toBeGreaterThanOrEqual(semiSec + 5);
    // Cas concret Armando : allureSemi 3:47 → seuilPace doit être ≥ 3:52
    expect(seuilSec).toBeGreaterThanOrEqual(3 * 60 + 52);
  });

  it('Débutant Semi 2h30 → seuilPace inchangé (déjà cohérent vs allureSemi)', () => {
    const vma = 9.5;                           // débutant
    const paces = calculateAllPaces(vma);
    const seuilBefore = paces.seuilPace;
    const data: Partial<QuestionnaireData> = {
      subGoal: 'Semi-marathon',
      targetTime: '2h30',
    };
    applyTargetTimeOverride(paces, data as QuestionnaireData, vma);

    const semiSec = paceSec(paces.allureSpecifiqueSemi);
    const seuilSec = paceSec(paces.seuilPace);
    // Cohérent (semi 7:07, seuil VMA-based ~5:30) → écart >> 5 → no-op
    expect(seuilSec).toBeGreaterThanOrEqual(semiSec + 5);
    // Le seuil ne doit PAS avoir bougé (no-op confirmé)
    expect(paces.seuilPace).toBe(seuilBefore);
  });

  it('Format pace toujours valide après réajustement (pas de "5:60")', () => {
    const vma = 18;
    const paces = calculateAllPaces(vma);
    const data: Partial<QuestionnaireData> = {
      subGoal: 'Semi-marathon',
      targetTime: '1h25',
    };
    applyTargetTimeOverride(paces, data as QuestionnaireData, vma);
    // Format m:ss avec ss < 60
    expect(paces.seuilPace).toMatch(/^\d+:[0-5]\d$/);
    expect(paces.allureSpecifiqueSemi).toMatch(/^\d+:[0-5]\d$/);
  });

  it('Marathon Elite 2h30 → seuilPace cohérent vs allureMarathon', () => {
    // Bug16 ne corrige que seuil vs allureSemi (Daniels T-pace réfère HM).
    // On vérifie ici qu'on ne casse rien pour Marathon : seuil reste valide.
    const vma = 18;
    const paces = calculateAllPaces(vma);
    const data: Partial<QuestionnaireData> = {
      subGoal: 'Marathon',
      targetTime: '2h30',
    };
    applyTargetTimeOverride(paces, data as QuestionnaireData, vma);
    expect(paces.seuilPace).toMatch(/^\d+:[0-5]\d$/);
    // Sanity : seuil ne tombe pas à 0
    expect(paceSec(paces.seuilPace)).toBeGreaterThan(0);
  });

  it('Sans subGoal ni targetTime → applyTargetTimeOverride early-return, no-op', () => {
    const vma = 19;
    const paces = calculateAllPaces(vma);
    const seuilBefore = paces.seuilPace;
    const semiBefore = paces.allureSpecifiqueSemi;
    applyTargetTimeOverride(paces, {} as QuestionnaireData, vma);
    expect(paces.seuilPace).toBe(seuilBefore);
    expect(paces.allureSpecifiqueSemi).toBe(semiBefore);
  });
});
