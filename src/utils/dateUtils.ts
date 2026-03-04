
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

/** Aligne une date au lundi de sa semaine (retourne une nouvelle Date) */
export const alignToMonday = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay(); // 0=Dimanche, 1=Lundi...
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/** Calcule la date d'une séance à partir de startDate + weekNumber + dayName */
export const calculateSessionDate = (planStartDate: string, weekNumber: number, dayName: string): Date => {
  const startDate = alignToMonday(parseLocalDate(planStartDate));
  const weekStart = new Date(startDate);
  weekStart.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  const dayIndex = DAY_TO_INDEX[dayName] ?? 0;
  const sessionDate = new Date(weekStart);
  sessionDate.setDate(weekStart.getDate() + dayIndex);
  return sessionDate;
};

/** Résout la date effective d'une séance : dateOverride si présent, sinon calcul */
export const resolveSessionDate = (session: Session, planStartDate: string, weekNumber: number): Date => {
  if (session.dateOverride) {
    return parseLocalDate(session.dateOverride);
  }
  return calculateSessionDate(planStartDate, weekNumber, session.day);
};

/** Détermine le numéro de semaine (1-based) d'une date par rapport au startDate du plan */
export const getWeekNumberForDate = (date: Date, planStartDate: string): number => {
  const startMonday = alignToMonday(parseLocalDate(planStartDate));
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - startMonday.getTime();
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
