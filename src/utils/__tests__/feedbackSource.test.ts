/**
 * Sprint G — Tests inferSource + isCompletedFeedback
 *
 * Lancer : npx vitest run src/utils/__tests__/feedbackSource.test.ts
 */

import { describe, it, expect } from 'vitest';
import { inferSource, isCompletedFeedback } from '../feedbackSource';
import type { SessionFeedback } from '../../types';

describe('inferSource — Sprint G rétro-compat', () => {
  it('T17. Legacy feedback avec stravaData → strava_auto_matched', () => {
    const fb: SessionFeedback = {
      rpe: 6,
      completed: true,
      stravaData: {
        activityId: 12345,
        name: 'Footing matinal',
        distance: 8,
        movingTime: 45,
        elapsedTime: 47,
        elevationGain: 50,
        avgPace: '5:38 min/km',
        type: 'Run',
        startDate: '2026-05-25T07:00:00Z',
      },
    };
    expect(inferSource(fb)).toBe('strava_auto_matched');
  });

  it('T18. Legacy feedback sans stravaData → manual_no_strava', () => {
    const fb: SessionFeedback = { rpe: 5, completed: true, notes: 'Bien.' };
    expect(inferSource(fb)).toBe('manual_no_strava');
  });

  it('Source déjà posée Sprint G → on retourne tel quel (priorité explicite)', () => {
    const fb: SessionFeedback = { rpe: 7, completed: true, source: 'strava_user_corrected' };
    expect(inferSource(fb)).toBe('strava_user_corrected');
  });

  it('Source not_done explicite → on retourne not_done (pas d’inférence)', () => {
    const fb: SessionFeedback = { rpe: 0, completed: false, source: 'not_done', notDoneReason: 'douleur' };
    expect(inferSource(fb)).toBe('not_done');
  });

  it('Feedback undefined → undefined', () => {
    expect(inferSource(undefined)).toBeUndefined();
  });

  it('Feedback null → undefined (robustesse, JSON Firestore peut renvoyer null)', () => {
    expect(inferSource(null)).toBeUndefined();
  });

  it('Feedback avec stravaData mais source explicite "manual_no_strava" → on respecte la source explicite', () => {
    // Cas théorique : un user a stravaData attaché PUIS s’est corrigé en manual.
    // La source explicite gagne (mécanisme de patch admin futur).
    const fb: SessionFeedback = {
      rpe: 5,
      completed: true,
      source: 'manual_no_strava',
      stravaData: { activityId: 99, name: 'X', distance: 5, movingTime: 30, elapsedTime: 30, elevationGain: 0, avgPace: '6:00 min/km', type: 'Run', startDate: '2026-05-25T07:00:00Z' },
    };
    expect(inferSource(fb)).toBe('manual_no_strava');
  });
});

describe('isCompletedFeedback — exclusion not_done pour adaptationContext', () => {
  it('Feedback completed:true + source strava → TRUE', () => {
    const fb: SessionFeedback = { rpe: 6, completed: true, source: 'strava_auto_matched' };
    expect(isCompletedFeedback(fb)).toBe(true);
  });

  it('Feedback completed:false + source not_done → FALSE (doctrine sécurité)', () => {
    const fb: SessionFeedback = { rpe: 0, completed: false, source: 'not_done', notDoneReason: 'douleur' };
    expect(isCompletedFeedback(fb)).toBe(false);
  });

  it('Feedback completed:true mais source not_done (cas illogique) → FALSE (source prime)', () => {
    // Edge case : ne devrait pas arriver mais on couvre.
    const fb: SessionFeedback = { rpe: 0, completed: true, source: 'not_done' };
    expect(isCompletedFeedback(fb)).toBe(false);
  });

  it('Legacy completed:true sans source mais avec stravaData → TRUE (inferé strava_auto_matched)', () => {
    const fb: SessionFeedback = {
      rpe: 5,
      completed: true,
      stravaData: { activityId: 1, name: 'X', distance: 5, movingTime: 30, elapsedTime: 30, elevationGain: 0, avgPace: '6:00 min/km', type: 'Run', startDate: '2026-05-25' },
    };
    expect(isCompletedFeedback(fb)).toBe(true);
  });

  it('Legacy completed:true sans stravaData → TRUE (inferé manual_no_strava)', () => {
    const fb: SessionFeedback = { rpe: 5, completed: true };
    expect(isCompletedFeedback(fb)).toBe(true);
  });

  it('Feedback undefined → FALSE', () => {
    expect(isCompletedFeedback(undefined)).toBe(false);
  });

  it('Feedback null → FALSE', () => {
    expect(isCompletedFeedback(null)).toBe(false);
  });
});
