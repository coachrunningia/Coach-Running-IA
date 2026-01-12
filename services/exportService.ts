
import { TrainingPlan, Session } from '../types';

const WEEK_DAYS_MAP: { [key: string]: number } = {
  'Lundi': 0,
  'Mardi': 1,
  'Mercredi': 2,
  'Jeudi': 3,
  'Vendredi': 4,
  'Samedi': 5,
  'Dimanche': 6
};

// Helper pour ajouter des jours à une date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Formatage date ICS (YYYYMMDD)
const formatDateICS = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICS = (plan: TrainingPlan): string => {
  let calendarContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CoachRunningIA//TrainingPlan//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  // 1. Déterminer la date de début du plan (Lundi de la semaine 1)
  let startDate = new Date();
  
  if (plan.raceDate) {
    // Si date de course, on rétro-calcule
    const raceDateObj = new Date(plan.raceDate);
    // La course est souvent le dimanche de la dernière semaine
    const totalWeeks = plan.weeks.length;
    const daysToSubtract = (totalWeeks * 7) - 1; // Approx
    startDate = addDays(raceDateObj, -daysToSubtract);
    
    // On s'assure de tomber sur un Lundi pour aligner la logique
    const day = startDate.getDay(); // 0 = Dimanche, 1 = Lundi...
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // ajuster au lundi précédent
    startDate = new Date(startDate.setDate(diff));
  } else {
    // Sinon on part de la date de création (ou lundi suivant)
    const created = new Date(plan.createdAt);
    const day = created.getDay();
    // Si créé lundi, on commence ce lundi. Sinon lundi suivant ? 
    // Pour simplifier l'UX, on commence le Lundi de la semaine de création
    const diff = created.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(created.setDate(diff));
  }

  // 2. Itérer sur chaque séance
  plan.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      // Calcul de la date précise de la séance
      const dayIndex = WEEK_DAYS_MAP[session.day] || 0;
      const weekOffset = (week.weekNumber - 1) * 7;
      const sessionDate = addDays(startDate, weekOffset + dayIndex);

      // Création de l'événement (Durée par défaut 1h si non parsable, ou matin 8h)
      // On fixe l'heure à 08:00 par défaut pour l'agenda
      sessionDate.setHours(8, 0, 0, 0);
      const endDate = addDays(sessionDate, 0);
      endDate.setHours(9, 0, 0, 0); // Durée 1h par défaut

      const description = `Type: ${session.type}\\nDurée: ${session.duration}\\n\\nÉchauffement: ${session.warmup}\\nCorps: ${session.mainSet}\\nRetour au calme: ${session.cooldown}\\n\\nConseil: ${session.advice}`;

      calendarContent.push(
        'BEGIN:VEVENT',
        `UID:${session.id}@coachrunningia.app`,
        `DTSTAMP:${formatDateICS(new Date())}`,
        `DTSTART;VALUE=DATE:${formatDateICS(sessionDate).split('T')[0]}`, // All day event souvent mieux pour le sport
        `SUMMARY:🏃 ${session.title} (${session.type})`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  });

  calendarContent.push('END:VCALENDAR');
  return calendarContent.join('\n');
};

export const downloadICS = (plan: TrainingPlan) => {
  const icsContent = generateICS(plan);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `plan_running_${plan.name.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
