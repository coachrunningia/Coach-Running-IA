
import { Session } from '../types';

// Mapping jours français → index (Lundi = 0)
export const DAY_TO_INDEX: Record<string, number> = {
  'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3,
  'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6
};

export const INDEX_TO_DAY: Record<number, string> = {
  0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi',
  4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche'
};

/** Parse une date ISO "YYYY-MM-DD" en Date locale à minuit (évite les problèmes de timezone) */
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

/**
 * Calcule la date d'une séance depuis startDate + weekNumber + dayName.
 * Bug 17 Sprint E — Doctrine "startDate = J1 réel, peu importe le jour".
 *
 * Modèle cyclique modulo 7 : offset = (targetIndex - startIndex + 7) % 7.
 * - startDate=Lun, day=Lundi → offset 0 (J1)
 * - startDate=Dim 24/05 (Arnaud), day=Lundi → offset 1 → lun 25/05
 * - startDate=Mar, day=Lundi → offset 6 (lun suivant cyclique)
 *
 * Validation maths : 6 cas table (dev 30 ans).
 */
export const calculateSessionDate = (planStartDate: string, weekNumber: number, dayName: string): Date => {
  const startDate = parseLocalDate(planStartDate);
  // getDay() : 0=dim, 1=lun, ..., 6=sam. Notre DAY_TO_INDEX : Lundi=0..Dimanche=6.
  // Conversion : dim (0) → startIndex 6 ; sinon dow - 1.
  const startDow = startDate.getDay();
  const startIndex = startDow === 0 ? 6 : startDow - 1;
  const targetIndex = DAY_TO_INDEX[dayName] ?? 0;
  // Offset cyclique [0..6], toujours >= 0.
  const dayOffset = (targetIndex - startIndex + 7) % 7;
  const sessionDate = new Date(startDate);
  sessionDate.setDate(startDate.getDate() + (weekNumber - 1) * 7 + dayOffset);
  return sessionDate;
};

/** Résout la date effective d'une séance : dateOverride si présent, sinon calcul */
export const resolveSessionDate = (session: Session, planStartDate: string, weekNumber: number): Date => {
  if (session.dateOverride) {
    return parseLocalDate(session.dateOverride);
  }
  return calculateSessionDate(planStartDate, weekNumber, session.day);
};

/** Détermine le numéro de semaine (1-based) d'une date par rapport au startDate du plan.
 *  Bug 17 Sprint E — Suppression alignToMonday : on utilise startDate tel quel. */
export const getWeekNumberForDate = (date: Date, planStartDate: string): number => {
  const startDate = parseLocalDate(planStartDate);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
};

/** Formate une Date en "YYYY-MM-DD" */
export const toISODateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
