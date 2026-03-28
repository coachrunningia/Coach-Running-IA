/**
 * Plan Validator — 3-layer quality assurance for training plans
 *
 * Layer 1: Rule-based validation (free, no API)
 * Layer 2: Lightweight AI review (1 short Gemini call)
 * Layer 3: Targeted auto-correction (regenerate only flagged weeks)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrainingPlan, Week, Session, QuestionnaireData } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  weekNumber: number;
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
}

export interface AIReviewResult {
  overallScore: number;
  criteria: {
    progression: number;
    injuryRisk: number;
    difficulty: number;
    variety: number;
    specificity: number;
  };
  flaggedWeeks: number[];
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseDistance = (dist?: string): number => {
  if (!dist) return 0;
  const n = parseFloat(dist.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const getWeekVolume = (week: Week): number => {
  let total = 0;
  for (const s of week.sessions) {
    total += parseDistance(s.distance);
  }
  return total;
};

const getIntensitySessions = (week: Week): Session[] =>
  week.sessions.filter(
    (s) => s.intensity === 'Difficile' || s.type === 'Fractionné',
  );

const isConsecutiveDay = (day1: string, day2: string): boolean => {
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const i1 = DAYS.indexOf(day1);
  const i2 = DAYS.indexOf(day2);
  if (i1 < 0 || i2 < 0) return false;
  return Math.abs(i1 - i2) === 1 || (i1 === 0 && i2 === 6) || (i1 === 6 && i2 === 0);
};

const parseDurationMinValidator = (d: any): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};

// ---------------------------------------------------------------------------
// LAYER 1 — Rule-based validation (free)
// ---------------------------------------------------------------------------

export const validatePlanRules = (
  plan: TrainingPlan,
  questionnaire?: QuestionnaireData,
): ValidationResult => {
  const issues: ValidationIssue[] = [];
  const weeks = plan.weeks;
  const level = questionnaire?.level || '';
  const isBeginnerLevel = level.includes('Débutant');
  const isConfirmed = level.includes('Confirmé');
  const isExpertLevel = level.includes('Expert');
  const isExpert = isExpertLevel || isConfirmed; // Pour les caps absolus de progression

  // --- Rule 1: Volume progression week-over-week (adaptatif selon volume absolu) ---
  // Logique : à faible volume, les % de hausse sont naturellement plus élevés (15→20 = +33%)
  // mais ça ne représente que 5km de plus. On raisonne en absolu + relatif.
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1];
    const curr = weeks[i];
    const prevVol = getWeekVolume(prev);
    const currVol = getWeekVolume(curr);

    // Skip si semaine de récup (entrante ou sortante)
    if (prevVol > 0 && currVol > 0 && !curr.isRecoveryWeek && !prev.isRecoveryWeek) {
      const increase = ((currVol - prevVol) / prevVol) * 100;
      const absoluteIncrease = currVol - prevVol;

      // Seuils adaptatifs selon le volume ET le niveau
      let errorPct: number;
      let warningPct: number;
      if (isBeginnerLevel) {
        // Débutant : strict +10% max (prompt dit +5%, on laisse marge Gemini)
        if (prevVol < 20) {
          errorPct = 15;
          warningPct = 8;
        } else {
          errorPct = 12;
          warningPct = 7;
        }
      } else if (prevVol < 20) {
        // Non-débutant, faible volume : +20% max (ex: 15→18km)
        errorPct = 25;
        warningPct = 15;
      } else if (prevVol < 40) {
        // Volume modéré : +15% max
        errorPct = 20;
        warningPct = 12;
      } else {
        // Volume élevé (40km+) : strict +12% max (ex: 50→56km)
        errorPct = 15;
        warningPct = 10;
      }

      // Sécurité absolue : cap adaptatif par niveau (prompt: déb=3, inter=5, confirmé=7, expert=8)
      const absoluteMaxIncrease = isBeginnerLevel ? 3 : isExpertLevel ? 8 : isConfirmed ? 7 : 5;
      const isAbsoluteSpike = absoluteIncrease > absoluteMaxIncrease;

      if ((increase > errorPct || isAbsoluteSpike) && absoluteIncrease > 3) {
        issues.push({
          weekNumber: curr.weekNumber,
          severity: 'error',
          rule: 'volume_spike',
          message: `Volume +${increase.toFixed(0)}% (${prevVol.toFixed(0)}→${currVol.toFixed(0)}km, +${absoluteIncrease.toFixed(0)}km).`,
        });
      } else if (increase > warningPct && absoluteIncrease > 3) {
        issues.push({
          weekNumber: curr.weekNumber,
          severity: 'warning',
          rule: 'volume_spike',
          message: `Volume +${increase.toFixed(0)}% (${prevVol.toFixed(0)}→${currVol.toFixed(0)}km) — à surveiller.`,
        });
      }
    }
  }

  // --- Rule 2: No two consecutive hard sessions ---
  for (const week of weeks) {
    const hardSessions = week.sessions.filter(
      (s) => s.intensity === 'Difficile' || s.type === 'Fractionné',
    );
    for (let i = 0; i < hardSessions.length; i++) {
      for (let j = i + 1; j < hardSessions.length; j++) {
        if (isConsecutiveDay(hardSessions[i].day, hardSessions[j].day)) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'consecutive_hard',
            message: `2 séances intenses consécutives (${hardSessions[i].day} + ${hardSessions[j].day}) : risque de blessure.`,
          });
        }
      }
    }
  }

  // --- Rule 2b: No two long sessions on consecutive days ---
  // SL + SL ou SL + Trail ou toute séance >= 90min sur jours consécutifs
  for (const week of weeks) {
    const longSessions = week.sessions.filter(
      (s) => s.type === 'Sortie Longue' || (s.duration && parseDurationMinValidator(s.duration) >= 90),
    );
    for (let i = 0; i < longSessions.length; i++) {
      for (let j = i + 1; j < longSessions.length; j++) {
        if (isConsecutiveDay(longSessions[i].day, longSessions[j].day)) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'consecutive_long',
            message: `2 séances longues consécutives (${longSessions[i].day} "${longSessions[i].title}" + ${longSessions[j].day} "${longSessions[j].title}") : risque de blessure et surcharge.`,
          });
        }
      }
    }
  }

  // --- Rule 3: Long run ratio (adapté selon objectif et fréquence) ---
  // Trail/ultra avec 2-3 séances : la SL peut naturellement être 45-50% du volume
  // Marathon 5 séances : la SL ne devrait pas dépasser 35%
  const goalStr = questionnaire?.goal || '';
  const isTrail = goalStr.includes('Trail');
  const trailDist = questionnaire?.trailDetails?.distance || 0;
  const freq = questionnaire?.frequency || 3;
  // Plus la fréquence est basse, plus la SL pèse naturellement lourd en %
  const longRunMaxRatio = isTrail && trailDist >= 42 ? 0.55 : freq <= 3 ? 0.50 : 0.40;

  for (const week of weeks) {
    const weekVol = getWeekVolume(week);
    if (weekVol <= 0) continue;
    const longRun = week.sessions.find((s) => s.type === 'Sortie Longue');
    if (longRun) {
      const longRunDist = parseDistance(longRun.distance);
      if (longRunDist > 0 && longRunDist / weekVol > longRunMaxRatio) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'warning',
          rule: 'long_run_ratio',
          message: `Sortie longue = ${((longRunDist / weekVol) * 100).toFixed(0)}% du volume (${longRunDist}/${weekVol.toFixed(0)}km). Max adapté : ${(longRunMaxRatio * 100).toFixed(0)}%.`,
        });
      }
    }
  }

  // --- Rule 4: Beginner shouldn't have Fractionné before week 6 ---
  // Aucun fractionné (même fartlek) avant S6. Uniquement marche/course + EF.
  // Fartlek doux OK à partir de S6, VMA vraie (30/30, 200m) à partir de S8-10.
  if (isBeginnerLevel) {
    for (const week of weeks) {
      // Aucun fractionné avant semaine 6
      if (week.weekNumber <= 5) {
        const hasFrac = week.sessions.some(
          (s) => s.type === 'Fractionné',
        );
        if (hasFrac) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'beginner_too_intense',
            message: `Fractionné en semaine ${week.weekNumber} pour un débutant — trop tôt (recommandé : semaine 6+).`,
          });
        }
      }
      // VMA intense (30/30, 200m, 400m) pas avant semaine 8
      if (week.weekNumber >= 6 && week.weekNumber <= 7) {
        const hasHardVMA = week.sessions.some(
          (s) =>
            s.type === 'Fractionné' &&
            s.intensity === 'Difficile' &&
            (s.mainSet?.toLowerCase().includes('vma') ||
              s.mainSet?.toLowerCase().includes('30/30') ||
              s.mainSet?.toLowerCase().includes('200m') ||
              s.mainSet?.toLowerCase().includes('400m')),
        );
        if (hasHardVMA) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'beginner_too_intense',
            message: `VMA intense en semaine ${week.weekNumber} pour un débutant — trop tôt (fartlek doux uniquement S6-7, VMA à partir de S8).`,
          });
        }
      }
    }

    // --- Rule 4b: Marche/Course doit être présent S1-S4 pour les débutants ---
    for (const week of weeks) {
      if (week.weekNumber <= 4) {
        const marcheCourseCount = week.sessions.filter(
          (s) => s.type === 'Marche/Course',
        ).length;
        if (marcheCourseCount === 0) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'beginner_missing_walk_run',
            message: `Pas de séance Marche/Course en semaine ${week.weekNumber} pour un débutant — obligatoire les 4 premières semaines.`,
          });
        }
      }
    }

    // --- Rule 4c: Aucune séance > 45 min les 4 premières semaines (sauf marche/course) ---
    for (const week of weeks) {
      if (week.weekNumber <= 4) {
        for (const session of week.sessions) {
          if (session.type === 'Renforcement') continue;
          const durationStr = session.duration || '';
          const durationMatch = durationStr.match(/(\d+)\s*min/);
          if (durationMatch) {
            const minutes = parseInt(durationMatch[1], 10);
            if (minutes > 45) {
              issues.push({
                weekNumber: week.weekNumber,
                severity: 'warning',
                rule: 'beginner_session_too_long',
                message: `Séance "${session.title}" = ${minutes}min en S${week.weekNumber} pour un débutant (max 45min les 4 premières semaines).`,
              });
            }
          }
        }
      }
    }
  }

  // --- Rule 5: Recovery week every 3-4 weeks ---
  if (weeks.length >= 6) {
    let lastRecovery = 0;
    for (const week of weeks) {
      if (week.isRecoveryWeek) {
        if (lastRecovery > 0 && week.weekNumber - lastRecovery > 5) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'warning',
            rule: 'missing_recovery',
            message: `${week.weekNumber - lastRecovery} semaines sans récupération (recommandé : toutes les 3-4 semaines).`,
          });
        }
        lastRecovery = week.weekNumber;
      }
    }
    if (lastRecovery === 0 && weeks.length >= 6) {
      issues.push({
        weekNumber: weeks[3]?.weekNumber || 4,
        severity: 'warning',
        rule: 'missing_recovery',
        message: `Aucune semaine de récupération dans ${weeks.length} semaines — risque de surentraînement.`,
      });
    }
  }

  // --- Rule 6: Check session count matches frequency ---
  const targetFreq = questionnaire?.frequency;
  if (targetFreq) {
    for (const week of weeks) {
      if (week.sessions.length !== targetFreq && !week.isRecoveryWeek) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'warning',
          rule: 'session_count',
          message: `${week.sessions.length} séances au lieu de ${targetFreq} demandées.`,
        });
      }
    }
  }

  // --- Rule 7: Must have at least 1 renfo per week ---
  for (const week of weeks) {
    const hasRenfo = week.sessions.some((s) => s.type === 'Renforcement');
    if (!hasRenfo) {
      issues.push({
        weekNumber: week.weekNumber,
        severity: 'warning',
        rule: 'missing_renfo',
        message: `Pas de séance de renforcement en semaine ${week.weekNumber}.`,
      });
    }
  }

  // --- Rule 8: Volume coherence with level + objectif ---
  const subGoal = questionnaire?.subGoal || '';
  const isMarathon = subGoal.toLowerCase().includes('marathon') && !subGoal.toLowerCase().includes('semi');
  const isSemi = subGoal.toLowerCase().includes('semi');
  const isUltra = isTrail && trailDist >= 60;
  const is10k = subGoal.includes('10');
  const isPertePoids = goalStr.includes('Perte');
  const isMaintien = goalStr.includes('Maintien') || goalStr.includes('Remise');

  // Max km/semaine — aligné sur MAX_WEEKLY_VOLUME de geminiService.ts (+10% tolérance validateur)
  const getMaxWeeklyKm = (): number => {
    if (isPertePoids) return isBeginnerLevel ? 22 : isExpertLevel ? 50 : isConfirmed ? 39 : 33;
    if (isMaintien) return isBeginnerLevel ? 28 : isExpertLevel ? 61 : isConfirmed ? 50 : 44;
    if (isBeginnerLevel) {
      if (isUltra) return 50;      // guard: 45
      if (isMarathon) return 50;    // guard: 45
      if (isTrail && trailDist >= 30) return 50; // guard: 45
      if (isTrail) return 39;       // guard: 35
      if (isSemi) return 39;        // guard: 35
      if (is10k) return 33;         // guard: 30
      return 28;                    // guard: 25 (5K)
    }
    if (isExpertLevel) {
      if (isUltra) return 110;      // guard: 100
      if (isMarathon) return 94;    // guard: 85
      if (isTrail && trailDist >= 30) return 88; // guard: 80
      if (isTrail) return 72;       // guard: 65
      if (isSemi) return 77;        // guard: 70
      if (is10k) return 72;         // guard: 65
      return 66;                    // guard: 60 (5K)
    }
    if (isConfirmed) {
      if (isUltra) return 77;       // guard: 70
      if (isMarathon) return 83;    // guard: 75
      if (isTrail && trailDist >= 30) return 77; // guard: 70
      if (isTrail) return 61;       // guard: 55
      if (isSemi) return 66;        // guard: 60
      if (is10k) return 61;         // guard: 55
      return 51;                    // guard: 46 (5K)
    }
    // Intermédiaire — guard values +10%
    if (isUltra) return 61;         // guard: 55
    if (isMarathon) return 72;      // guard: 65
    if (isTrail && trailDist >= 30) return 66; // guard: 60
    if (isTrail) return 55;         // guard: 50
    if (isSemi) return 61;          // guard: 55
    if (is10k) return 55;           // guard: 50
    return 44;                      // guard: 40 (5K)
  };

  // Max km/séance — aligné sur MAX_SESSION_KM de geminiService.ts (+10% tolérance)
  const getMaxSessionKm = (): number => {
    if (isPertePoids) return isBeginnerLevel ? 9 : isExpertLevel ? 17 : isConfirmed ? 15 : 13;
    if (isMaintien) return isBeginnerLevel ? 11 : isExpertLevel ? 20 : isConfirmed ? 19 : 17;
    if (isBeginnerLevel) return isUltra ? 33 : isMarathon ? 28 : (isTrail && trailDist >= 30) ? 28 : isTrail ? 20 : isSemi ? 20 : is10k ? 17 : 13;
    if (isExpertLevel) return isUltra ? 61 : isMarathon ? 42 : (isTrail && trailDist >= 30) ? 50 : isTrail ? 33 : isSemi ? 31 : is10k ? 31 : 28;
    if (isConfirmed) return isUltra ? 55 : isMarathon ? 39 : (isTrail && trailDist >= 30) ? 39 : isTrail ? 28 : isSemi ? 28 : is10k ? 28 : 24;
    // Intermédiaire (+10% sur guard: 10K=22, Semi=22, Marathon=32, Trail=22/32)
    return isUltra ? 44 : isMarathon ? 35 : (isTrail && trailDist >= 30) ? 35 : isTrail ? 24 : isSemi ? 24 : is10k ? 24 : 20;
  };

  const maxWeeklyKm = getMaxWeeklyKm();
  const maxSessionKm = getMaxSessionKm();

  if (weeks.length > 0) {
    const avgVolume = weeks.reduce((sum, w) => sum + getWeekVolume(w), 0) / weeks.length;

    // Cap hebdomadaire dur
    for (const week of weeks) {
      const weekVol = getWeekVolume(week);
      if (weekVol > maxWeeklyKm && !week.isRecoveryWeek) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'error',
          rule: 'volume_exceeds_cap',
          message: `Volume ${weekVol.toFixed(0)}km dépasse le max adapté (${maxWeeklyKm}km/sem pour ${level} / ${goalStr}).`,
        });
      }
    }

    // Cap par séance dur
    for (const week of weeks) {
      for (const session of week.sessions) {
        const dist = parseDistance(session.distance);
        if (dist > maxSessionKm) {
          issues.push({
            weekNumber: week.weekNumber,
            severity: 'error',
            rule: 'session_exceeds_cap',
            message: `Séance "${session.title}" = ${dist}km, dépasse le max adapté (${maxSessionKm}km pour ${level}).`,
          });
        }
      }
    }

    // Débutant : plafond moyen
    if (isBeginnerLevel) {
      const beginnerMaxAvg = isMarathon ? 40 : isTrail ? 35 : isPertePoids ? 20 : 30;
      if (avgVolume > beginnerMaxAvg) {
        issues.push({
          weekNumber: 1,
          severity: 'warning',
          rule: 'volume_too_high',
          message: `Volume moyen ${avgVolume.toFixed(0)}km/sem pour un débutant (max adapté : ~${beginnerMaxAvg}km).`,
        });
      }
    }
    // Expert : alerter si trop faible (sauf perte de poids / forme)
    if (isExpert && avgVolume < 20 && avgVolume > 0 && !isPertePoids && !isMaintien) {
      issues.push({
        weekNumber: 1,
        severity: 'warning',
        rule: 'volume_too_low',
        message: `Volume moyen ${avgVolume.toFixed(0)}km/sem pour un coureur confirmé — potentiellement insuffisant.`,
      });
    }
  }

  // --- Rule 8b: Max 2 séances Difficile par semaine ---
  for (const week of weeks) {
    const hardCount = week.sessions.filter(
      (s) => s.intensity === 'Difficile' || s.type === 'Fractionné',
    ).length;
    if (hardCount > 2) {
      issues.push({
        weekNumber: week.weekNumber,
        severity: 'error',
        rule: 'too_many_hard_sessions',
        message: `${hardCount} séances intenses dans la semaine (max recommandé : 2).`,
      });
    }
  }

  // --- Rule 9: Recovery week should have meaningful volume reduction ---
  // Ultra-trail à 90km/sem : -15 à -25% suffit (pas besoin de -40%)
  // Débutant à 20km/sem : -20 à -30% (on ne descend pas sous 12-15km)
  for (const week of weeks) {
    if (week.isRecoveryWeek) {
      const prevWeek = weeks.find((w) => w.weekNumber === week.weekNumber - 1);
      if (prevWeek) {
        const prevVol = getWeekVolume(prevWeek);
        const currVol = getWeekVolume(week);
        if (prevVol > 0 && currVol > 0) {
          const reduction = ((prevVol - currVol) / prevVol) * 100;
          // Seuil adaptatif : à haut volume, -20% min. À bas volume, -25% min
          const minReduction = prevVol >= 60 ? 20 : prevVol >= 40 ? 22 : 25;
          if (reduction < minReduction) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: 'warning',
              rule: 'recovery_not_enough',
              message: `Semaine de récup : -${reduction.toFixed(0)}% seulement (min recommandé : -${minReduction}%).`,
            });
          }
          // Alerter si trop de réduction (> 50%) — le corps perd ses adaptations
          if (reduction > 50) {
            issues.push({
              weekNumber: week.weekNumber,
              severity: 'warning',
              rule: 'recovery_too_much',
              message: `Semaine de récup : -${reduction.toFixed(0)}% — réduction excessive, risque de perte d'adaptation.`,
            });
          }
        }
      }
    }
  }

  // --- Rule 10: Week 1 volume vs declared current volume (pragmatic) ---
  if (questionnaire?.currentWeeklyVolume && weeks.length > 0) {
    const declaredVolume = questionnaire.currentWeeklyVolume;
    const week1Volume = getWeekVolume(weeks[0]);
    if (week1Volume > 0 && declaredVolume > 0) {
      const increase = ((week1Volume - declaredVolume) / declaredVolume) * 100;
      // Seuils adaptatifs : plus le volume actuel est bas, plus on tolère de hausse
      // car la base est faible et les petits km ajoutés = gros % mais peu de risque
      let errorThreshold: number;
      let warningThreshold: number;
      if (declaredVolume < 15) {
        // Volume très faible : tolérer jusqu'à +50% (ex: 10km → 15km OK)
        errorThreshold = 60;
        warningThreshold = 40;
      } else if (declaredVolume < 30) {
        // Volume modéré : tolérer jusqu'à +25%
        errorThreshold = 30;
        warningThreshold = 20;
      } else {
        // Volume solide (30km+) : strict, max +15%
        errorThreshold = 20;
        warningThreshold = 12;
      }

      if (increase > errorThreshold) {
        issues.push({
          weekNumber: 1,
          severity: 'error',
          rule: 'week1_volume_too_high',
          message: `Volume semaine 1 (${week1Volume.toFixed(0)}km) trop élevé vs volume actuel (${declaredVolume}km) : +${increase.toFixed(0)}%.`,
        });
      } else if (increase > warningThreshold) {
        issues.push({
          weekNumber: 1,
          severity: 'warning',
          rule: 'week1_volume_too_high',
          message: `Volume semaine 1 (${week1Volume.toFixed(0)}km) en hausse de ${increase.toFixed(0)}% vs volume actuel (${declaredVolume}km) — à surveiller.`,
        });
      }
    }
  }

  // --- Rule 11: Trail D+ validation ---
  if (isTrail && trailDist > 0) {
    const trailElevation = questionnaire?.trailDetails?.elevation || 0;

    // 11a: Trail sessions must have elevationGain
    for (const week of weeks) {
      const trailSessions = week.sessions.filter(
        (s) => s.type !== 'Renforcement' && s.type !== 'Récupération',
      );
      const sessionsWithElevation = trailSessions.filter(
        (s) => s.elevationGain !== undefined && s.elevationGain > 0,
      );
      if (trailSessions.length > 0 && sessionsWithElevation.length === 0) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'warning',
          rule: 'trail_missing_elevation',
          message: `Aucune séance avec D+ en semaine ${week.weekNumber} pour un plan trail.`,
        });
      }
    }

    // 11b: D+ progression — later weeks should have more D+ than early weeks
    if (trailElevation > 0 && weeks.length >= 4) {
      const getWeekElevation = (w: Week): number =>
        w.sessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0);

      const firstThirdEnd = Math.ceil(weeks.length / 3);
      const lastThirdStart = weeks.length - Math.ceil(weeks.length / 3);

      const earlyWeeks = weeks.slice(0, firstThirdEnd);
      const lateWeeks = weeks.slice(lastThirdStart).filter(w => !w.isRecoveryWeek);

      if (earlyWeeks.length > 0 && lateWeeks.length > 0) {
        const avgEarlyElev = earlyWeeks.reduce((s, w) => s + getWeekElevation(w), 0) / earlyWeeks.length;
        const avgLateElev = lateWeeks.reduce((s, w) => s + getWeekElevation(w), 0) / lateWeeks.length;

        if (avgLateElev > 0 && avgLateElev < avgEarlyElev * 1.1) {
          issues.push({
            weekNumber: lateWeeks[0].weekNumber,
            severity: 'warning',
            rule: 'trail_elevation_no_progression',
            message: `D+ ne progresse pas : début ${Math.round(avgEarlyElev)}m/sem → fin ${Math.round(avgLateElev)}m/sem.`,
          });
        }
      }

      // 11c: Peak D+ should approach race D+ (at least 70% for SL)
      const peakWeekElev = Math.max(...weeks.filter(w => !w.isRecoveryWeek).map(w => getWeekElevation(w)));
      if (peakWeekElev > 0 && peakWeekElev < trailElevation * 0.5) {
        issues.push({
          weekNumber: weeks[Math.floor(weeks.length * 0.7)]?.weekNumber || 1,
          severity: 'warning',
          rule: 'trail_elevation_too_low',
          message: `D+ max hebdo (${Math.round(peakWeekElev)}m) très en dessous du D+ course (${trailElevation}m). Viser au moins 50-70%.`,
        });
      }
    }

    // 11d: Ultra trail (80km+) should have back-to-back long runs in specific phase
    if (trailDist >= 80 && weeks.length >= 6) {
      const specificWeeks = weeks.filter(w => w.phase === 'specifique' || (w.phase as string) === 'spécifique');
      const hasBackToBack = specificWeeks.some(w => {
        const longSessions = w.sessions.filter(s =>
          s.type === 'Sortie Longue' || (parseDistance(s.distance) >= 20),
        );
        if (longSessions.length < 2) return false;
        for (let i = 0; i < longSessions.length; i++) {
          for (let j = i + 1; j < longSessions.length; j++) {
            if (isConsecutiveDay(longSessions[i].day, longSessions[j].day)) return true;
          }
        }
        return false;
      });
      if (!hasBackToBack) {
        issues.push({
          weekNumber: specificWeeks[0]?.weekNumber || Math.floor(weeks.length * 0.6),
          severity: 'warning',
          rule: 'ultra_missing_back_to_back',
          message: `Trail ${trailDist}km : pas de back-to-back long en phase spécifique (recommandé pour ultra).`,
        });
      }
    }
  }

  // --- Rule 12: Difficulty appropriate for expert/competition level ---
  if (isExpert && weeks.length >= 4) {
    let hasIntenseWork = false;
    for (const week of weeks.slice(0, 4)) {
      if (week.sessions.some((s) => s.intensity === 'Difficile' || s.type === 'Fractionné')) {
        hasIntenseWork = true;
        break;
      }
    }
    if (!hasIntenseWork) {
      issues.push({
        weekNumber: 1,
        severity: 'warning',
        rule: 'not_challenging_enough',
        message: `Aucune séance intense dans les 4 premières semaines pour un coureur confirmé/expert.`,
      });
    }
  }

  // --- Rule 13: Hard rejects — catch critical anomalies before saving ---
  // These are absolute safety nets for bugs that should never reach production.

  // 13a: VMA sanity check
  const planVMA = (plan as any).vma || (plan as any).calculatedVMA;
  if (planVMA && planVMA > 22) {
    issues.push({
      weekNumber: 0,
      severity: 'error',
      rule: 'vma_absurd',
      message: `VMA ${planVMA.toFixed(1)} km/h est aberrante (> 22 km/h). Bug probable dans le parsing du temps de course.`,
    });
  }

  // 13b: D+ session impossible (> 400m en < 60min)
  for (const week of weeks) {
    const wn = week.weekNumber || 1;
    for (const s of week.sessions) {
      if (s.type === 'Renforcement' || s.type === 'Repos') continue;
      const dur = parseDurationMinValidator(s.duration);
      const dplus = (s as any).elevationGain || 0;
      if (dplus > 400 && dur < 60) {
        issues.push({
          weekNumber: wn,
          severity: 'error',
          rule: 'dplus_impossible',
          message: `"${(s.title || s.type).substring(0, 40)}" : ${dplus}m D+ en ${dur}min est physiquement impossible.`,
        });
      }
    }
  }

  // 13c: Footing S1 trop long pour un intermédiaire/débutant
  if (weeks.length > 0) {
    const w1 = weeks[0];
    const isInterOrBeginner = isBeginnerLevel || level.includes('Intermédiaire');
    if (isInterOrBeginner) {
      for (const s of w1.sessions) {
        if (s.type === 'Renforcement' || s.type === 'Repos') continue;
        const dur = parseDurationMinValidator(s.duration);
        if (dur > 100 && s.type !== 'Sortie Longue' && !/sortie longue/i.test(s.title || '')) {
          issues.push({
            weekNumber: 1,
            severity: 'error',
            rule: 's1_footing_too_long',
            message: `"${(s.title || s.type).substring(0, 40)}" : ${dur}min en S1 est trop long pour un ${isBeginnerLevel ? 'débutant' : 'intermédiaire'}.`,
          });
        }
      }
    }
  }

  // 13d: 2+ Sortie Longue dans la même semaine
  for (const week of weeks) {
    const wn = week.weekNumber || 1;
    const slCount = week.sessions.filter(
      (s) => s.type === 'Sortie Longue' || /sortie\s*longue/i.test(s.title || '')
    ).length;
    if (slCount >= 2) {
      issues.push({
        weekNumber: wn,
        severity: 'error',
        rule: 'multiple_sl',
        message: `${slCount} Sorties Longues dans la même semaine — max 1 recommandée.`,
      });
    }
  }

  // Calculate score
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 15 - warningCount * 5);

  return {
    isValid: errorCount === 0,
    issues,
    score,
  };
};

// ---------------------------------------------------------------------------
// LAYER 2 — Lightweight AI review (1 short Gemini call)
// ---------------------------------------------------------------------------

export const aiReviewPlan = async (
  plan: TrainingPlan,
  questionnaire?: QuestionnaireData,
): Promise<AIReviewResult> => {
  // Build a compact summary of the plan (keep tokens low)
  const planSummary = plan.weeks.map((w) => {
    const volume = getWeekVolume(w);
    const sessions = w.sessions.map((s) =>
      `${s.day}:${s.type}(${s.intensity || '?'},${s.duration}${s.distance ? ',' + s.distance : ''})`
    ).join(' | ');
    return `S${w.weekNumber}[${w.phase || '?'}${w.isRecoveryWeek ? ',RECUP' : ''}] ${volume}km: ${sessions}`;
  }).join('\n');

  const profileSummary = questionnaire
    ? `Niveau:${questionnaire.level} | Objectif:${questionnaire.goal}${questionnaire.subGoal ? '(' + questionnaire.subGoal + ')' : ''} | Fréquence:${questionnaire.frequency}/sem | Temps visé:${questionnaire.targetTime || 'Finisher'}`
    : 'Profil non disponible';

  const reviewPrompt = `Tu es un expert en planification d'entraînement running. Évalue ce plan en 200 mots MAX.

PROFIL : ${profileSummary}

PLAN :
${planSummary}

Réponds UNIQUEMENT en JSON :
{
  "overallScore": 0-100,
  "criteria": {
    "progression": 0-10,
    "injuryRisk": 0-10,
    "difficulty": 0-10,
    "variety": 0-10,
    "specificity": 0-10
  },
  "flaggedWeeks": [numéros des semaines problématiques],
  "suggestions": ["suggestion courte 1", "suggestion courte 2"]
}

Critères :
- progression : montée en charge régulière avec récup
- injuryRisk : 10=aucun risque, 0=très dangereux
- difficulty : 10=parfaitement adapté au niveau, 0=trop facile ou trop dur
- variety : diversité des séances et du renfo
- specificity : adapté à l'objectif spécifique (trail/route/perte de poids)

flaggedWeeks : semaines avec un score critère < 6 qui nécessitent une correction.
Sois STRICT et HONNÊTE. Un plan trop facile pour un expert est aussi mauvais qu'un plan trop dur pour un débutant.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: reviewPrompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
    });

    const text = result.response.text();
    const review = JSON.parse(text) as AIReviewResult;
    console.log(`[PlanValidator] AI Review: score=${review.overallScore}, flagged=${review.flaggedWeeks.join(',')}`);
    return review;
  } catch (error) {
    console.error('[PlanValidator] AI Review failed:', error);
    // Return neutral review if AI fails — don't block the flow
    return {
      overallScore: 70,
      criteria: { progression: 7, injuryRisk: 7, difficulty: 7, variety: 7, specificity: 7 },
      flaggedWeeks: [],
      suggestions: [],
    };
  }
};

// ---------------------------------------------------------------------------
// LAYER 3 — Targeted auto-correction (regenerate only flagged weeks)
// ---------------------------------------------------------------------------

export const generateCorrectedWeeks = async (
  plan: TrainingPlan,
  flaggedWeeks: number[],
  issues: ValidationIssue[],
  questionnaire?: QuestionnaireData,
): Promise<Week[]> => {
  if (flaggedWeeks.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const paces = (plan as any).paces;

  // Build issue summary for the prompt
  const issuesSummary = issues
    .filter((i) => flaggedWeeks.includes(i.weekNumber))
    .map((i) => `- Semaine ${i.weekNumber}: [${i.severity}] ${i.message}`)
    .join('\n');

  // Build context of surrounding weeks (non-flagged)
  const contextWeeks = plan.weeks
    .filter((w) => !flaggedWeeks.includes(w.weekNumber))
    .slice(-3)
    .map((w) => {
      const vol = getWeekVolume(w);
      return `S${w.weekNumber}[${w.phase}] ${vol}km: ${w.sessions.map((s) => `${s.day}:${s.type}(${s.duration})`).join(', ')}`;
    })
    .join('\n');

  // Get periodization context for flagged weeks
  const periodContext = flaggedWeeks.map((wn) => {
    const phaseIdx = wn - 1;
    const ctx = plan.generationContext?.periodizationPlan;
    if (!ctx || phaseIdx >= ctx.weeklyPhases.length) return `S${wn}: ?`;
    return `S${wn}: ${ctx.weeklyPhases[phaseIdx]} - ${ctx.weeklyVolumes[phaseIdx]}km${ctx.recoveryWeeks.includes(wn) ? ' (RÉCUP)' : ''}`;
  }).join('\n');

  const correctionPrompt = `Tu es un Coach Running Expert. CORRIGE les semaines problématiques de ce plan.

PROFIL : ${questionnaire ? `${questionnaire.level} | ${questionnaire.goal} ${questionnaire.subGoal || ''} | ${questionnaire.frequency} séances/sem` : 'Non disponible'}

ALLURES :
- EF: ${paces?.efPace} | Seuil: ${paces?.seuilPace} | VMA: ${paces?.vmaPace} | Récup: ${paces?.recoveryPace}

PROBLÈMES DÉTECTÉS :
${issuesSummary}

SEMAINES CORRECTES (contexte) :
${contextWeeks}

PÉRIODISATION DES SEMAINES À CORRIGER :
${periodContext}

GÉNÈRE les semaines corrigées (${flaggedWeeks.join(', ')}) en JSON :
[
  {
    "weekNumber": N,
    "theme": "Thème",
    "phase": "phase",
    "isRecoveryWeek": false,
    "sessions": [
      {
        "day": "Jour", "type": "Type", "title": "Titre",
        "duration": "durée", "distance": "distance",
        "intensity": "Facile|Modéré|Difficile",
        "targetPace": "allure", "elevationGain": 0,
        "warmup": "échauffement", "mainSet": "corps détaillé avec allures EXACTES",
        "cooldown": "retour au calme", "advice": "conseil"
      }
    ]
  }
]

⚠️ CORRIGE spécifiquement les problèmes listés. Garde la cohérence avec les semaines correctes.
⚠️ 1 séance "Renforcement" OBLIGATOIRE par semaine.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: correctionPrompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
    });

    const text = result.response.text();
    const correctedWeeks = JSON.parse(text) as Week[];

    // Re-assign session IDs
    correctedWeeks.forEach((week) => {
      if (week.sessions) {
        week.sessions.forEach((session: any, idx: number) => {
          session.id = `w${week.weekNumber}-s${idx + 1}-fix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        });
      }
    });

    console.log(`[PlanValidator] Corrected ${correctedWeeks.length} weeks`);
    return correctedWeeks;
  } catch (error) {
    console.error('[PlanValidator] Correction failed:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Full validation pipeline
// ---------------------------------------------------------------------------

export const validateAndCorrectPlan = async (
  plan: TrainingPlan,
  questionnaire?: QuestionnaireData,
  onStatus?: (status: string) => void,
): Promise<{ plan: TrainingPlan; validation: ValidationResult; aiReview?: AIReviewResult }> => {
  // ─── Layer 1: Rule-based validation ───
  onStatus?.('Vérification des règles...');
  const validation = validatePlanRules(plan, questionnaire);
  console.log(`[PlanValidator] Layer 1: score=${validation.score}, issues=${validation.issues.length}`);

  // If critical errors found, flag those weeks
  const errorWeeks = [...new Set(
    validation.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.weekNumber),
  )];

  // ─── Layer 2: AI review (only if Layer 1 passes basic checks or plan has 3+ weeks) ───
  let aiReview: AIReviewResult | undefined;
  if (plan.weeks.length >= 3) {
    onStatus?.('Analyse IA du plan...');
    aiReview = await aiReviewPlan(plan, questionnaire);

    // Combine flagged weeks from both layers (deduplicate)
    const aiFlagged = aiReview.flaggedWeeks || [];
    const allFlagged = [...new Set([...errorWeeks, ...aiFlagged])];

    // ─── Layer 3: Auto-correction if needed ───
    if (allFlagged.length > 0 && allFlagged.length <= 5) {
      onStatus?.(`Correction de ${allFlagged.length} semaine(s)...`);
      console.log(`[PlanValidator] Layer 3: correcting weeks ${allFlagged.join(', ')}`);

      const allIssues = [
        ...validation.issues,
        ...aiReview.suggestions.map((s, i) => ({
          weekNumber: aiFlagged[i] || allFlagged[0],
          severity: 'warning' as const,
          rule: 'ai_suggestion',
          message: s,
        })),
      ];

      const correctedWeeks = await generateCorrectedWeeks(plan, allFlagged, allIssues, questionnaire);

      if (correctedWeeks.length > 0) {
        // Replace flagged weeks with corrected ones
        const correctedPlan = { ...plan };
        correctedPlan.weeks = plan.weeks.map((w) => {
          const corrected = correctedWeeks.find((cw) => cw.weekNumber === w.weekNumber);
          return corrected || w;
        });

        // Re-validate after correction (Layer 1 only — no infinite loop)
        const revalidation = validatePlanRules(correctedPlan, questionnaire);
        console.log(`[PlanValidator] Post-correction: score=${revalidation.score}`);

        return {
          plan: correctedPlan,
          validation: revalidation,
          aiReview,
        };
      }
    }
  } else if (errorWeeks.length > 0) {
    // For single-week plans (preview), just log issues
    console.log(`[PlanValidator] Preview plan — ${errorWeeks.length} error weeks, skipping correction`);
  }

  return { plan, validation, aiReview };
};
