
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
  // Nom de fichier: "Programme - [Nom du plan].ics"
  const cleanName = plan.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/gi, '').replace(/\s+/g, '_');
  link.setAttribute('download', `Programme_-_${cleanName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================
// EXPORT TCX (Garmin / Coros)
// ============================================

export const generateTCX = (plan: TrainingPlan, target: "garmin" | "coros"): string => {
  // TCX est un format XML utilisé par Garmin Training Center
  // Compatible avec Garmin Connect et Coros App
  
  let tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Workouts>`;

  plan.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      // Convertir la durée en secondes
      let durationSeconds = 3600; // 1h par défaut
      if (session.duration) {
        const match = session.duration.match(/(\d+)\s*(min|h|mn)/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          if (unit === 'h') durationSeconds = value * 3600;
          else durationSeconds = value * 60;
        }
      }

      // Déterminer l'intensité
      let intensity = "Active";
      if (session.intensity === "Facile" || session.type === "Récupération") {
        intensity = "Resting";
      }

      // Créer le workout
      tcxContent += `
    <Workout Sport="Running">
      <Name>S${week.weekNumber} - ${session.title}</Name>
      <Step xsi:type="Step_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <StepId>1</StepId>
        <Name>${session.type}</Name>
        <Duration xsi:type="Time_t">
          <Seconds>${durationSeconds}</Seconds>
        </Duration>
        <Intensity>${intensity}</Intensity>
        <Target xsi:type="None_t"/>
      </Step>
      <Notes>${session.warmup || ''} | ${session.mainSet || ''} | ${session.cooldown || ''}</Notes>
      <Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <Name>Coach Running IA</Name>
      </Creator>
    </Workout>`;
    });
  });

  tcxContent += `
  </Workouts>
</TrainingCenterDatabase>`;

  return tcxContent;
};

export const downloadTCX = (plan: TrainingPlan, target: "garmin" | "coros") => {
  const tcxContent = generateTCX(plan, target);
  const blob = new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  const cleanName = plan.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/gi, '').replace(/\s+/g, '_');
  link.setAttribute('download', `${cleanName}_${target}.tcx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================
// EXPORT PDF
// ============================================

export const downloadPDF = (plan: TrainingPlan) => {
  // Créer le contenu HTML du PDF
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${plan.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #f97316; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
    h2 { color: #1e293b; margin-top: 30px; }
    h3 { color: #475569; margin-top: 20px; }
    .week { page-break-inside: avoid; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 10px; }
    .session { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #f97316; }
    .session-title { font-weight: bold; font-size: 16px; color: #1e293b; }
    .session-details { margin-top: 8px; font-size: 14px; color: #64748b; }
    .allures { background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🏃 ${plan.name}</h1>
  <p><strong>Objectif :</strong> ${plan.goal} ${plan.targetTime ? '- ' + plan.targetTime : ''}</p>
  <p><strong>Durée :</strong> ${plan.weeks?.length || plan.durationWeeks} semaines</p>
  
  ${plan.paces ? `
  <div class="allures">
    <h3>📊 Mes allures</h3>
    <p><strong>Endurance (EF) :</strong> ${plan.paces.efPace}</p>
    <p><strong>Seuil :</strong> ${plan.paces.seuilPace}</p>
    <p><strong>VMA :</strong> ${plan.paces.vmaPace}</p>
  </div>
  ` : ''}
`;

  plan.weeks?.forEach((week) => {
    htmlContent += `
    <div class="week">
      <h2>Semaine ${week.weekNumber} - ${week.theme || ''}</h2>
      ${week.sessions.map(session => `
        <div class="session">
          <div class="session-title">${session.day} - ${session.title}</div>
          <div class="session-details">
            <p><strong>Type :</strong> ${session.type} | <strong>Durée :</strong> ${session.duration}</p>
            ${session.warmup ? `<p><strong>Échauffement :</strong> ${session.warmup}</p>` : ''}
            <p><strong>Séance :</strong> ${session.mainSet}</p>
            ${session.cooldown ? `<p><strong>Retour au calme :</strong> ${session.cooldown}</p>` : ''}
            ${session.advice ? `<p><em>💡 ${session.advice}</em></p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    `;
  });

  htmlContent += `
  <div class="footer">
    <p>Généré par Coach Running IA - coachrunningia.fr</p>
  </div>
</body>
</html>
  `;

  // Ouvrir dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
};

// ============================================
// EXPORT TCX POUR UNE SEULE SÉANCE
// ============================================

export const generateSessionTCX = (session: Session, weekNumber: number, planName: string): string => {
  // Convertir la durée en secondes
  let durationSeconds = 3600;
  if (session.duration) {
    const match = session.duration.match(/(\d+)\s*(min|h|mn)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'h') durationSeconds = value * 3600;
      else durationSeconds = value * 60;
    }
  }

  // Nettoyer les textes pour XML
  const cleanXML = (text: string) => {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const notes = `${cleanXML(session.warmup || '')} | ${cleanXML(session.mainSet || '')} | ${cleanXML(session.cooldown || '')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Workouts>
    <Workout Sport="Running">
      <Name>S${weekNumber} - ${cleanXML(session.title)}</Name>
      <Step xsi:type="Step_t">
        <StepId>1</StepId>
        <Name>${cleanXML(session.type)}</Name>
        <Duration xsi:type="Time_t">
          <Seconds>${durationSeconds}</Seconds>
        </Duration>
        <Intensity>Active</Intensity>
        <Target xsi:type="None_t"/>
      </Step>
      <Notes>${notes}</Notes>
      <Creator xsi:type="Device_t">
        <Name>Coach Running IA</Name>
      </Creator>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;
};

export const downloadSessionTCX = (session: Session, weekNumber: number, planName: string = "Plan") => {
  const tcxContent = generateSessionTCX(session, weekNumber, planName);
  const blob = new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  const cleanTitle = session.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/gi, '').replace(/\s+/g, '_');
  link.setAttribute('download', `S${weekNumber}_${cleanTitle}.tcx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
