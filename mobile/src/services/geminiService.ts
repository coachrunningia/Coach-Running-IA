/**
 * Service Gemini Mobile — Génération de plans d'entraînement via IA
 * Miroir allégé du web (uniquement generatePreviewPlan + dépendances)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  QuestionnaireData,
  TrainingPlan,
  TrainingPaces,
  GenerationContext,
  PeriodizationPhase,
} from '../types';
import { calculateFeasibility } from './feasibilityService';
import { buildRenfoMainSet } from './renfoService';

// Clé API Gemini (identique au web — à migrer côté serveur plus tard)
const GEMINI_API_KEY = 'AIzaSyDqelpwRb3BQRjh4gRutf07apUvoVg4m5M';

const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ---------------------------------------------------------------------------
// Utilitaires de calcul des allures
// ---------------------------------------------------------------------------

const timeToSeconds = (time: string, contextDistance?: number): number => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    return hours * 3600 + mins * 60;
  }

  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;

  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  // Format "X:YY" — ambigu : mm:ss ou h:mm ?
  if (parts.length === 2) {
    if (contextDistance && contextDistance >= 21) {
      return parts[0] * 3600 + parts[1] * 60; // Semi/Marathon : h:mm
    }
    return parts[0] * 60 + parts[1]; // 5km/10km : mm:ss
  }
  return 0;
};

const secondsToPace = (seconds: number): string => {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const calculateVMAFromTime = (distance: number, timeSeconds: number): number => {
  const avgSpeed = (distance / timeSeconds) * 3600;
  let vmaFactor: number;
  if (distance <= 5) vmaFactor = 0.95;
  else if (distance <= 10) vmaFactor = 0.90;
  else if (distance <= 21.1) vmaFactor = 0.85;
  else vmaFactor = 0.80;
  return avgSpeed / vmaFactor;
};

interface FullTrainingPaces extends TrainingPaces {
  vma: number;
  vmaKmh: string;
}

const calculateAllPaces = (vma: number): FullTrainingPaces => {
  const vmaPaceSeconds = 3600 / vma;
  const seuilSpeed = vma * 0.87;
  const eaSpeed = vma * 0.77;
  const efSpeed = vma * 0.67;
  const recoverySpeed = vma * 0.60;
  const specific5kSpeed = vma * 0.95;
  const specific10kSpeed = vma * 0.90;
  const specificSemiSpeed = vma * 0.85;
  const specificMarathonSpeed = vma * 0.80;

  return {
    vma,
    vmaKmh: vma.toFixed(1),
    vmaPace: secondsToPace(vmaPaceSeconds),
    seuilPace: secondsToPace(3600 / seuilSpeed),
    eaPace: secondsToPace(3600 / eaSpeed),
    efPace: secondsToPace(3600 / efSpeed),
    recoveryPace: secondsToPace(3600 / recoverySpeed),
    allureSpecifique5k: secondsToPace(3600 / specific5kSpeed),
    allureSpecifique10k: secondsToPace(3600 / specific10kSpeed),
    allureSpecifiqueSemi: secondsToPace(3600 / specificSemiSpeed),
    allureSpecifiqueMarathon: secondsToPace(3600 / specificMarathonSpeed),
  };
};

const getBestVMAEstimate = (
  raceTimes: QuestionnaireData['recentRaceTimes'],
): { vma: number; source: string } | null => {
  if (!raceTimes) return null;
  const estimates: { vma: number; source: string; priority: number }[] = [];

  if (raceTimes.distance5km) {
    const s = timeToSeconds(raceTimes.distance5km, 5);
    if (s > 0) estimates.push({ vma: calculateVMAFromTime(5, s), source: `5km en ${raceTimes.distance5km}`, priority: 1 });
  }
  if (raceTimes.distance10km) {
    const s = timeToSeconds(raceTimes.distance10km, 10);
    if (s > 0) estimates.push({ vma: calculateVMAFromTime(10, s), source: `10km en ${raceTimes.distance10km}`, priority: 2 });
  }
  if (raceTimes.distanceHalfMarathon) {
    const s = timeToSeconds(raceTimes.distanceHalfMarathon, 21.1);
    if (s > 0) estimates.push({ vma: calculateVMAFromTime(21.1, s), source: `Semi en ${raceTimes.distanceHalfMarathon}`, priority: 3 });
  }
  if (raceTimes.distanceMarathon) {
    const s = timeToSeconds(raceTimes.distanceMarathon, 42.195);
    if (s > 0) estimates.push({ vma: calculateVMAFromTime(42.195, s), source: `Marathon en ${raceTimes.distanceMarathon}`, priority: 4 });
  }

  if (estimates.length === 0) return null;

  // Plafond VMA réaliste : 25 km/h = élite mondiale, au-delà = erreur de saisie
  const VMA_MAX = 25;
  const VMA_MIN = 8;

  // Filtrer les VMA aberrantes
  const validEstimates = estimates.filter(e => e.vma >= VMA_MIN && e.vma <= VMA_MAX);

  if (validEstimates.length === 0) {
    console.warn('[VMA] Tous les chronos donnent des VMA hors limites:', estimates.map(e => `${e.source} → ${e.vma.toFixed(1)}`));
    const closest = estimates.reduce((best, e) => Math.abs(e.vma - 16) < Math.abs(best.vma - 16) ? e : best);
    return { vma: Math.min(Math.max(closest.vma, VMA_MIN), VMA_MAX), source: `${closest.source} (corrigé)` };
  }

  validEstimates.sort((a, b) => a.priority - b.priority);

  // Détection d'incohérence entre chronos (> 20% d'écart)
  if (validEstimates.length >= 2) {
    const maxVma = Math.max(...validEstimates.map(e => e.vma));
    const minVma = Math.min(...validEstimates.map(e => e.vma));
    if ((maxVma - minVma) / minVma > 0.20) {
      console.warn(`[VMA] Chronos incohérents (écart ${(((maxVma - minVma) / minVma) * 100).toFixed(0)}%): ${validEstimates.map(e => `${e.source} → ${e.vma.toFixed(1)}`).join(', ')}`);
      return validEstimates[0]; // Distance courte = plus fiable
    }
    const weighted = validEstimates.slice(0, 2);
    return {
      vma: weighted[0].vma * 0.6 + weighted[1].vma * 0.4,
      source: `Moyenne ${weighted[0].source} et ${weighted[1].source}`,
    };
  }
  return validEstimates[0];
};

// ---------------------------------------------------------------------------
// Post-processing qualité — Fonctions partagées
// ---------------------------------------------------------------------------

const forceTutoiement = (text: string): string => {
  if (!text) return text;

  const imperatives: [string, string][] = [
    ['écoutez', 'écoute'], ['hydratez', 'hydrate'], ['alimentez', 'alimente'],
    ['adaptez', 'adapte'], ['concentrez', 'concentre'], ['privilégiez', 'privilégie'],
    ['arrêtez', 'arrête'], ['gérez', 'gère'], ['effectuez', 'effectue'],
    ['emportez', 'emporte'], ['pensez', 'pense'], ['reposez', 'repose'],
    ['étirez', 'étire'], ['respectez', 'respecte'], ['commencez', 'commence'],
    ['augmentez', 'augmente'], ['diminuez', 'diminue'], ['terminez', 'termine'],
    ['accélérez', 'accélère'], ['portez', 'porte'], ['forcez', 'force'],
    ['choisissez', 'choisis'], ['échauffez', 'échauffe'], ['alternez', 'alterne'],
    ['consultez', 'consulte'], ['veillez', 'veille'], ['profitez', 'profite'],
    ['entraînez', 'entraîne'], ['continuez', 'continue'], ['marchez', 'marche'],
    ['notez', 'note'], ['essayez', 'essaie'], ['gardez', 'garde'],
    ['préparez', 'prépare'], ['récupérez', 'récupère'], ['variez', 'varie'],
    ['contrôlez', 'contrôle'], ['assurez', 'assure'], ['ralentissez', 'ralentis'],
    ['utilisez', 'utilise'], ['planifiez', 'planifie'], ['évitez', 'évite'],
    ['travaillez', 'travaille'], ['restez', 'reste'], ['intégrez', 'intègre'],
    ['soyez', 'sois'], ['faites', 'fais'], ['prenez', 'prends'],
    ['mettez', 'mets'], ['courez', 'cours'], ['partez', 'pars'],
    ['sentez', 'sens'], ['maintenez', 'maintiens'], ['finissez', 'finis'],
    ['réduisez', 'réduis'], ['ressentez', 'ressens'],
    ["n'hésitez", "n'hésite"], ["n'oubliez", "n'oublie"],
  ];

  const wordRegex = (word: string, flags = 'g') =>
    new RegExp(`(?<=^|[\\s'"(\\-])${word}(?=[\\s,.:;!?'"()\\-]|$)`, flags);

  let result = text;

  // 1. Réfléchi impératif : "-vous" → "-toi"
  result = result.replace(/-vous(?=\s|[,.:;!?'"]|$)/g, '-toi');

  // 2. Préposition + (adverbe optionnel) + vous → "te"
  result = result.replace(
    /\b(pour|de|en|à|sans|chez|sur)\s+(?:(bien|mieux|très|aussi|ne\s+pas)\s+)?vous\b/gi,
    (match, prep, adv) => adv ? `${prep} ${adv} te` : `${prep} te`
  );

  // 3. Pronom objet après sujet/conjonction
  result = result.replace(
    /\b(nous|je|j'|on|qui|il|elle|ce|cela|ça)\s+vous\b/gi,
    (match, before) => `${before} te`
  );

  // 4. Possessifs
  result = result.replace(/\bVotre\b/g, 'Ton').replace(/\bvotre\b/g, 'ton');
  result = result.replace(/\bVos\b/g, 'Tes').replace(/\bvos\b/g, 'tes');

  // 5. Conjugaisons impératives
  for (const [vous, tu] of imperatives) {
    try {
      result = result.replace(wordRegex(vous), tu);
      const vousUp = vous.charAt(0).toUpperCase() + vous.slice(1);
      const tuUp = tu.charAt(0).toUpperCase() + tu.slice(1);
      result = result.replace(wordRegex(vousUp), tuUp);
    } catch {
      result = result.replace(new RegExp(vous, 'gi'), (m) =>
        m[0] === m[0].toUpperCase() ? tu.charAt(0).toUpperCase() + tu.slice(1) : tu
      );
    }
  }

  // 6. Sujet "vous" → "tu" (filet de sécurité)
  result = result.replace(/\bVous\b/g, 'Tu').replace(/\bvous\b/g, 'tu');

  // 7. Élision : "te " devant voyelle/h → "t'"
  result = result.replace(/\bte ([aeéèêiïoôuùûyhà])/gi, "t'$1");

  return result;
};

const recalculateSessionDistance = (session: any): void => {
  if (session.type === 'Renforcement') return;
  if (!session.duration || !session.targetPace) return;
  const durationStr = session.duration.toString().toLowerCase();
  let durationMinutes = 0;
  const hMatch = durationStr.match(/(\d+)\s*h\s*(\d*)/);
  const minMatch = durationStr.match(/^(\d+)\s*min/);
  if (hMatch) {
    durationMinutes = parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  } else if (minMatch) {
    durationMinutes = parseInt(minMatch[1]);
  } else {
    const num = parseInt(durationStr);
    if (num > 0) durationMinutes = num;
  }
  if (durationMinutes <= 0) return;
  const paceStr = session.targetPace.toString();
  const paceParts = paceStr.split(':').map(Number);
  let paceMinPerKm = 0;
  if (paceParts.length === 2 && !isNaN(paceParts[0]) && !isNaN(paceParts[1])) {
    paceMinPerKm = paceParts[0] + paceParts[1] / 60;
  }
  if (paceMinPerKm <= 0) return;
  const calculatedKm = durationMinutes / paceMinPerKm;
  const currentKm = parseFloat((session.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  if (currentKm > 0 && Math.abs(calculatedKm - currentKm) / calculatedKm > 0.20) {
    const corrected = Math.round(calculatedKm * 10) / 10;
    console.log(`[PostProcess] Distance corrigée: "${session.title}" ${currentKm}km → ${corrected}km`);
    session.distance = `${corrected} km`;
  } else if (!currentKm || currentKm === 0) {
    session.distance = `${Math.round(calculatedKm * 10) / 10} km`;
  }
};

const postProcessWeekQuality = (
  week: any,
  pacesObj: { efPace: string; recoveryPace: string; vmaPace: string } | null,
  defaultWeekGoal?: string,
  planGoal?: string,
): void => {
  if (!week.weekGoal && week.theme) week.weekGoal = week.theme;
  if (!week.weekGoal) {
    const phaseLabels: Record<string, string> = {
      fondamental: 'Construction de la base aérobie',
      developpement: 'Développement des qualités de vitesse',
      specifique: 'Travail à allure course — phase clé de la préparation',
      affutage: 'Réduction du volume, maintien des acquis avant la course',
      recuperation: 'Semaine de récupération active — recharger les batteries',
    };
    week.weekGoal = defaultWeekGoal || phaseLabels[week.phase] || 'Progression régulière';
  }
  if (!week.sessions || !Array.isArray(week.sessions)) return;
  week.sessions.forEach((session: any) => {
    // Tutoiement : appliquer à TOUTES les séances (y compris Renforcement)
    if (session.advice) session.advice = forceTutoiement(session.advice);
    if (session.warmup) session.warmup = forceTutoiement(session.warmup);
    if (session.cooldown) session.cooldown = forceTutoiement(session.cooldown);
    if (session.mainSet) session.mainSet = forceTutoiement(session.mainSet);

    if (session.type === 'Renforcement') return;
    if (pacesObj) {
      if (!session.warmup || session.warmup.trim().length < 5) {
        session.warmup = `10 min de footing léger à ${pacesObj.recoveryPace} min/km + gammes éducatives`;
      } else if (!session.warmup.includes('min/km')) {
        session.warmup += ` (à ${pacesObj.recoveryPace} min/km)`;
      }
      if (!session.cooldown || session.cooldown.trim().length < 5) {
        session.cooldown = `10 min de retour au calme à ${pacesObj.recoveryPace} min/km + étirements`;
      } else if (!session.cooldown.includes('min/km')) {
        session.cooldown += ` (à ${pacesObj.recoveryPace} min/km)`;
      }
      if (session.mainSet && !session.mainSet.includes('min/km')) {
        const paceMap: Record<string, string> = { 'Jogging': pacesObj.efPace, 'Récupération': pacesObj.recoveryPace, 'Sortie Longue': pacesObj.efPace, 'Marche/Course': pacesObj.recoveryPace };
        const p = paceMap[session.type];
        if (p) session.mainSet += ` (allure : ${p} min/km)`;
      }
      if (!session.targetPace) {
        const paceForType: Record<string, string> = { 'Jogging': pacesObj.efPace, 'Récupération': pacesObj.recoveryPace, 'Sortie Longue': pacesObj.efPace, 'Marche/Course': pacesObj.recoveryPace, 'Fractionné': pacesObj.vmaPace };
        session.targetPace = paceForType[session.type] || pacesObj.efPace;
      }
    }
    recalculateSessionDistance(session);
  });

  // Garde-fou : pas de 2 SL consécutives
  const DAYS_ORD = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const longSessions = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' || (s.duration && parseDurationMin(s.duration) >= 90)
  );
  if (longSessions.length >= 2) {
    longSessions.sort((a: any, b: any) => DAYS_ORD.indexOf(a.day) - DAYS_ORD.indexOf(b.day));
    for (let i = 0; i < longSessions.length - 1; i++) {
      const dayA = DAYS_ORD.indexOf(longSessions[i].day);
      const dayB = DAYS_ORD.indexOf(longSessions[i + 1].day);
      if (dayB - dayA <= 1 || (dayA === 6 && dayB === 0)) {
        const shorter = parseDurationMin(longSessions[i].duration) <= parseDurationMin(longSessions[i + 1].duration)
          ? longSessions[i] : longSessions[i + 1];
        shorter.type = 'Récupération';
        shorter.intensity = 'Facile';
        shorter.title = 'Footing de Récupération';
        shorter.duration = '45 min';
        if (pacesObj) {
          shorter.targetPace = pacesObj.recoveryPace;
          shorter.warmup = `10 min de footing léger à ${pacesObj.recoveryPace} min/km`;
          shorter.cooldown = `5 min de marche + étirements (à ${pacesObj.recoveryPace} min/km)`;
          shorter.mainSet = `25 min de footing très léger à ${pacesObj.recoveryPace} min/km`;
        }
        shorter.elevationGain = 0;
        recalculateSessionDistance(shorter);
      }
    }
  }
};

const formatTargetTime = (raw?: string): string => {
  if (!raw) return '';
  const t = raw.trim();
  if (/h|min/i.test(t)) return t;
  const n = parseInt(t);
  if (!isNaN(n) && n > 0) return `${n}min`;
  return t;
};

const buildPlanName = (data: QuestionnaireData, planDurationWeeks: number): string => {
  const goal = data.goal || '';
  if (goal.includes('Perte')) return `Programme Perte de Poids — ${planDurationWeeks} semaines`;
  if (goal.includes('Maintien') || goal.includes('Remise')) return `Programme Remise en Forme — ${planDurationWeeks} semaines`;
  const formattedTime = formatTargetTime(data.targetTime);
  if (goal.includes('Trail') && data.trailDetails) {
    const d = data.trailDetails.distance || 0;
    const e = data.trailDetails.elevation || 0;
    const time = formattedTime ? ` en ${formattedTime}` : ' — Finisher';
    return `Préparation Trail ${d}km / ${e}m D+${time} — ${planDurationWeeks} sem.`;
  }
  if (data.subGoal) {
    const time = formattedTime ? ` en ${formattedTime}` : ' — Finisher';
    return `Préparation ${data.subGoal}${time} — ${planDurationWeeks} sem.`;
  }
  return `Plan d'entraînement — ${planDurationWeeks} semaines`;
};

// ---------------------------------------------------------------------------
// D+ trail — calcul et distribution par niveau
// ---------------------------------------------------------------------------

const calculateWeekTargetElevation = (
  weekNumber: number,
  totalWeeks: number,
  raceElevation: number,
  level: string,
  currentWeeklyElevation?: number,
): number => {
  // Garde-fou : si raceElevation est NaN ou 0, retourner 0 (pas de D+)
  if (!raceElevation || isNaN(raceElevation)) return 0;

  const maxWeeklyElevation =
    level === 'Débutant (0-1 an)' ? Math.min(raceElevation, 800) :
    level === 'Intermédiaire (Régulier)' ? Math.min(raceElevation, 2000) :
    level === 'Confirmé (Compétition)' ? Math.min(raceElevation, 3500) :
    Math.min(raceElevation, 6000);

  const startElevation = currentWeeklyElevation && currentWeeklyElevation > 0
    ? currentWeeklyElevation
    : level === 'Débutant (0-1 an)' ? 150
    : level === 'Intermédiaire (Régulier)' ? 300
    : level === 'Confirmé (Compétition)' ? 500
    : 800;

  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  return Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
};

const distributeElevationToSessions = (sessions: any[], weekTargetElevation: number): void => {
  const trailSessions = sessions.filter((s: any) => s.type !== 'Renforcement');
  if (trailSessions.length === 0) return;

  const totalProvidedElev = trailSessions.reduce(
    (sum: number, s: any) => sum + (s.elevationGain || 0), 0,
  );

  if (totalProvidedElev === 0 || totalProvidedElev < weekTargetElevation * 0.3) {
    const sortieIndex = trailSessions.findIndex((s: any) => s.type === 'Sortie Longue');
    const slElevation = Math.round(weekTargetElevation * 0.65);
    const remainingElev = weekTargetElevation - slElevation;
    const otherCount = trailSessions.length - (sortieIndex >= 0 ? 1 : 0);
    const perSessionElev = otherCount > 0 ? Math.round(remainingElev / otherCount) : 0;

    trailSessions.forEach((session: any) => {
      if (session.type === 'Sortie Longue') {
        session.elevationGain = slElevation;
      } else if (session.type === 'Récupération') {
        session.elevationGain = Math.round(perSessionElev * 0.3);
      } else {
        session.elevationGain = perSessionElev;
      }
    });
  } else if (totalProvidedElev < weekTargetElevation * 0.6) {
    const scaleFactor = weekTargetElevation / totalProvidedElev;
    trailSessions.forEach((session: any) => {
      if (session.elevationGain) {
        session.elevationGain = Math.round(session.elevationGain * scaleFactor);
      }
    });
  } else if (totalProvidedElev > weekTargetElevation * 1.3) {
    // Gemini a fourni TROP de D+ → scaler DOWN
    const scaleFactor = weekTargetElevation / totalProvidedElev;
    trailSessions.forEach((session: any) => {
      if (session.elevationGain) {
        session.elevationGain = Math.round(session.elevationGain * scaleFactor);
      }
    });
  }
};

const parseDurationMin = (d: any): number => {
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
// Périodisation
// ---------------------------------------------------------------------------

const calculatePeriodizationPlan = (
  totalWeeks: number,
  currentVolume: number,
  level: string,
  goal?: string,
  subGoal?: string,
  trailDistance?: number,
): { weeklyVolumes: number[]; weeklyPhases: PeriodizationPhase[]; recoveryWeeks: number[] } => {
  const progressionRate =
    level === 'Débutant (0-1 an)' ? 0.05 :
    level === 'Intermédiaire (Régulier)' ? 0.08 :
    level === 'Confirmé (Compétition)' ? 0.10 : 0.12;

  // Plafond volume pic — aligné sur les tableaux du prompt
  const sub = (subGoal || '').toLowerCase();
  const isMarathonP = sub.includes('marathon') && !sub.includes('semi');
  const isSemiP = sub.includes('semi');
  const is10kP = sub.includes('10');
  const g = goal || '';
  const isTrailP = g.includes('Trail');
  const isUltraP = isTrailP && (trailDistance || 0) >= 60;
  const isTrail30P = isTrailP && (trailDistance || 0) >= 30;
  const isPdpP = g.includes('Perte');
  const isMntP = g.includes('Maintien') || g.includes('Remise');

  let maxVolume: number;
  if (level === 'Débutant (0-1 an)') {
    if (isPdpP) maxVolume = 20;
    else if (isMntP) maxVolume = 25;
    else if (isMarathonP) maxVolume = 45;
    else if (isUltraP) maxVolume = 45;
    else if (isTrail30P) maxVolume = 45;
    else if (isTrailP) maxVolume = 35;
    else if (isSemiP) maxVolume = 35;
    else if (is10kP) maxVolume = 30;
    else maxVolume = 25;
  } else if (level === 'Expert (Performance)') {
    if (isPdpP) maxVolume = 45;
    else if (isMntP) maxVolume = 55;
    else if (isUltraP) maxVolume = 100;
    else if (isMarathonP) maxVolume = 85;
    else if (isTrail30P) maxVolume = 80;
    else if (isTrailP) maxVolume = 65;
    else if (isSemiP) maxVolume = 70;
    else if (is10kP) maxVolume = 65;
    else maxVolume = 60;
  } else if (level === 'Confirmé (Compétition)') {
    if (isPdpP) maxVolume = 35;
    else if (isMntP) maxVolume = 45;
    else if (isUltraP) maxVolume = 70;
    else if (isMarathonP) maxVolume = 75;
    else if (isTrail30P) maxVolume = 70;
    else if (isTrailP) maxVolume = 55;
    else if (isSemiP) maxVolume = 60;
    else if (is10kP) maxVolume = 55;
    else maxVolume = 46;
  } else {
    // Intermédiaire
    if (isPdpP) maxVolume = 30;
    else if (isMntP) maxVolume = 40;
    else if (isUltraP) maxVolume = 55;
    else if (isMarathonP) maxVolume = 65;
    else if (isTrail30P) maxVolume = 60;
    else if (isTrailP) maxVolume = 50;
    else if (isSemiP) maxVolume = 55;
    else if (is10kP) maxVolume = 50;
    else maxVolume = 40;
  }

  const phases: PeriodizationPhase[] = [];
  let fondamentalWeeks: number, developpementWeeks: number, specifiqueWeeks: number, affutageWeeks: number;

  if (totalWeeks <= 4) {
    fondamentalWeeks = 1;
    developpementWeeks = Math.max(1, totalWeeks - 3);
    specifiqueWeeks = 1;
    affutageWeeks = 1;
  } else if (totalWeeks <= 6) {
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(1, Math.floor(totalWeeks * 0.35));
    affutageWeeks = 1;
    specifiqueWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - affutageWeeks);
  } else {
    fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
    specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
    affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);
  }

  for (let i = 0; i < totalWeeks; i++) {
    if (i < fondamentalWeeks) phases.push('fondamental');
    else if (i < fondamentalWeeks + developpementWeeks) phases.push('developpement');
    else if (i < fondamentalWeeks + developpementWeeks + specifiqueWeeks) phases.push('specifique');
    else phases.push('affutage');
  }

  const recoveryWeeks: number[] = [];
  const recoveryInterval = level === 'Débutant (0-1 an)' ? 3 : 4;
  for (let i = recoveryInterval; i <= totalWeeks - 2; i += recoveryInterval) {
    recoveryWeeks.push(i);
    phases[i - 1] = 'recuperation';
  }

  const weeklyVolumes: number[] = [];

  // Backpropagation : calculer le S1 idéal pour atteindre maxVolume au pic
  const peakWeekIndex = totalWeeks - affutageWeeks - 1;
  let progressionWeeksCount = 0;
  for (let i = 0; i <= peakWeekIndex; i++) {
    if (!recoveryWeeks.includes(i + 1)) progressionWeeksCount++;
  }
  const idealStartVolume = maxVolume / Math.pow(1 + progressionRate, Math.max(1, progressionWeeksCount - 1));
  const minStartVolume = level === 'Débutant (0-1 an)' ? 8 :
                         level === 'Intermédiaire (Régulier)' ? 15 :
                         level === 'Confirmé (Compétition)' ? 20 : 25;
  let startVolume = Math.max(idealStartVolume, minStartVolume);
  startVolume = Math.min(startVolume, currentVolume, maxVolume * 0.65);
  if (currentVolume < startVolume) startVolume = currentVolume;

  let currentVol = startVolume;
  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;
    if (recoveryWeeks.includes(weekNum)) {
      weeklyVolumes.push(Math.round(currentVol * 0.7));
    } else if (phases[i] === 'affutage') {
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      weeklyVolumes.push(Math.round(currentVol));
      currentVol = Math.min(currentVol * (1 + progressionRate), maxVolume);
    }
  }

  return { weeklyVolumes, weeklyPhases: phases, recoveryWeeks };
};

const createGenerationContext = (
  data: QuestionnaireData,
  paces: FullTrainingPaces,
  vma: number,
  vmaSource: string,
  totalWeeks: number,
): GenerationContext => {
  // Volume actuel : si le coureur a renseigné 0 ou rien, on estime un plancher réaliste
  const declaredVolume = data.currentWeeklyVolume;
  const goalCtx = data.goal || '';
  const isPdp = goalCtx.includes('Perte');
  const isMnt = goalCtx.includes('Maintien') || goalCtx.includes('Remise');

  let defaultVolume: number;
  if (data.level === 'Débutant (0-1 an)') {
    defaultVolume = isPdp ? 10 : isMnt ? 12 : 15;
  } else if (data.level === 'Intermédiaire (Régulier)') {
    defaultVolume = isPdp ? 15 : isMnt ? 20 : 25;
  } else if (data.level === 'Confirmé (Compétition)') {
    defaultVolume = isPdp ? 20 : isMnt ? 25 : 35;
  } else {
    defaultVolume = isPdp ? 25 : isMnt ? 30 : 45;
  }
  const currentVolume = (declaredVolume && declaredVolume > 0) ? declaredVolume : defaultVolume;

  const periodizationPlan = calculatePeriodizationPlan(
    totalWeeks, currentVolume, data.level || 'Intermédiaire (Régulier)',
    data.goal || '', data.subGoal, data.trailDetails?.distance,
  );

  return {
    vma,
    vmaSource,
    paces: {
      efPace: paces.efPace,
      eaPace: paces.eaPace,
      seuilPace: paces.seuilPace,
      vmaPace: paces.vmaPace,
      recoveryPace: paces.recoveryPace,
      allureSpecifique5k: paces.allureSpecifique5k,
      allureSpecifique10k: paces.allureSpecifique10k,
      allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
      allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon,
    },
    periodizationPlan: { totalWeeks, ...periodizationPlan },
    questionnaireSnapshot: { ...data },
    generatedAt: new Date().toISOString(),
    modelUsed: 'gemini-2.0-flash',
  };
};

// ---------------------------------------------------------------------------
// Instructions de sécurité santé selon le profil
// ---------------------------------------------------------------------------

const buildSafetyInstructions = (data: QuestionnaireData, isBeginnerLevel: boolean): string => {
  const parts: string[] = [];
  const bmi = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : null;
  const age = data.age || 0;
  const isSenior = age >= 50;
  const isRestart = data.fitnessSubGoal === 'Reprendre après une pause' || data.lastActivity === 'Plus de 6 mois';

  // 3-tier BMI system: 25 (surpoids), 30 (obésité modérée), 35 (obésité sévère)
  const imcTier: 0 | 1 | 2 | 3 = bmi !== null
    ? (bmi >= 35 ? 3 : bmi >= 30 ? 2 : bmi >= 25 ? 1 : 0)
    : 0;
  const isOverweight = imcTier >= 2;

  const isHighRisk = (isSenior && isBeginnerLevel) || (isOverweight && isBeginnerLevel) || (isSenior && isOverweight) || imcTier >= 3;
  const isModerateRisk = isSenior || isOverweight || imcTier >= 1;

  if (isHighRisk) {
    parts.push(`🚨 PROFIL À RISQUE ÉLEVÉ — AVIS MÉDICAL IMPÉRATIF
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"⚠️ Compte tenu de votre profil, nous vous recommandons FORTEMENT de consulter un médecin avant de débuter ce programme et d'obtenir un certificat médical d'aptitude au sport."
- Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur.`);
  } else if (isModerateRisk) {
    parts.push(`⚠️ PROFIL À SURVEILLER — AVIS MÉDICAL RECOMMANDÉ
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport."
- Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur.`);
  } else {
    parts.push(`🩺 SÉCURITÉ SANTÉ — OBLIGATOIRE
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport."
- Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur.`);
  }

  if (imcTier >= 3) {
    parts.push(`🚨 IMC ≥ 35 — PRÉCAUTIONS ARTICULAIRES MAXIMALES :
- Objectif temps recommandé : applique un malus de -10% sur le temps cible (ex: si objectif 2h, planifier pour 2h12)
- Priorité ABSOLUE : marche/course alternée systématique les 4 premières semaines minimum
- Cross-training OBLIGATOIRE : intégrer vélo, natation ou elliptique comme alternatives à au moins 1 séance de course/semaine
- Pas de sauts, pas de pliométrie, pas de descentes rapides dans le renforcement
- Durées courtes (20-25 min max au début), augmenter très progressivement (+5 min max/semaine)
- Surfaces souples UNIQUEMENT (herbe, terre, chemin) — jamais d'asphalte
- Volume max semaine 1 : 8-12 km (ou moins si débutant)
- Le warmup DOIT inclure 10 min de marche progressive
- Privilégier la RÉGULARITÉ à l'intensité : mieux vaut 3 séances douces que 2 intenses
- Chaussures avec amorti MAXIMAL obligatoire — le mentionner dans le welcomeMessage
🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.`);
  } else if (imcTier >= 2) {
    parts.push(`⚠️ IMC 30-35 — PRÉCAUTIONS ARTICULAIRES RENFORCÉES :
- Priorité : séances à faible impact (marche rapide, marche/course alternée en début de plan)
- Pas de sauts, pas de pliométrie dans le renforcement
- Durées courtes (20-30 min max au début), augmenter très progressivement
- Surfaces souples (herbe, terre) plutôt qu'asphalte quand possible
- Volume max semaine 1 : 10-15 km (ou moins si débutant)
- Le warmup DOIT inclure 5-10 min de marche progressive
- Privilégier la RÉGULARITÉ à l'intensité : mieux vaut 3 séances douces que 2 intenses
- Cross-training recommandé (vélo, natation) pour réduire l'impact articulaire
- Chaussures avec amorti renforcé — le mentionner dans le welcomeMessage
🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.`);
  } else if (imcTier >= 1) {
    const isLongDistance = data.subGoal === 'Marathon' || data.subGoal === 'Semi-Marathon' || (data.goal === 'Trail' && data.trailDetails && data.trailDetails.distance >= 30);
    if (isLongDistance) {
      parts.push(`💡 IMC 25-30 + LONGUE DISTANCE — PRÉCAUTIONS ARTICULAIRES LÉGÈRES :
- Chaussures avec bon amorti recommandées — le mentionner dans le welcomeMessage
- Surfaces souples quand possible, surtout pour les sorties longues
- Bien s'hydrater pendant et après chaque séance
- Le warmup DOIT inclure 5 min de marche progressive avant les sorties longues
🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.`);
    }
  }

  if (isSenior) {
    parts.push(`👤 COUREUR DE ${age} ANS — ADAPTATIONS :
- Échauffements plus longs (10-15 min progressifs)
- Récupération entre séances : minimum 48h
- Pas plus de 2 séances intenses par semaine
- Étirements et mobilité articulaire dans chaque cooldown
- Surveiller les articulations : genoux, chevilles, hanches`);
  }

  if (isRestart) {
    parts.push(`🔄 REPRISE APRÈS PAUSE — PROGRESSION LENTE :
- Les 2-3 premières semaines doivent être très douces
- Commencer à 50-60% de ce que le coureur faisait avant
- Augmenter le volume de maximum 10% par semaine
- Intégrer du marche/course même si le coureur est de niveau intermédiaire`);
  }

  if (isBeginnerLevel) {
    parts.push(`🛡️ PROTECTION DÉBUTANT :
- Jamais plus de 3 séances de COURSE par semaine (Jogging, Fractionné, SL, Récup, Marche/Course). La séance de Renforcement est EN PLUS et ne compte PAS dans ce total.
- Exemple : 3 séances running + 1 renfo = 4 séances/semaine au total, c'est OK
- Progression du volume : max +10% par semaine
- Aucune séance de course > 45 min les 4 premières semaines (sauf Marche/Course qui peut aller jusqu'à 50 min car elle inclut de la marche)
- Conseil systématique : hydratation, chaussures adaptées, ne pas forcer`);
  }

  return parts.join('\n\n');
};

// ---------------------------------------------------------------------------
// Génération Preview (Semaine 1 uniquement) — miroir exact du web
// ---------------------------------------------------------------------------

export const generatePreviewPlan = async (data: QuestionnaireData): Promise<TrainingPlan> => {
  const startTime = Date.now();

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Calcul VMA & allures
  let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
  let paces: FullTrainingPaces;
  let vmaSource: string;

  if (vmaEstimate) {
    paces = calculateAllPaces(vmaEstimate.vma);
    vmaSource = vmaEstimate.source;
  } else {
    let defaultVma: number;
    switch (data.level) {
      case 'Débutant (0-1 an)': defaultVma = 11.0; break;
      case 'Intermédiaire (Régulier)': defaultVma = 13.5; break;
      case 'Confirmé (Compétition)': defaultVma = 15.5; break;
      case 'Expert (Performance)': defaultVma = 17.5; break;
      default: defaultVma = 12.5;
    }
    paces = calculateAllPaces(defaultVma);
    vmaSource = `Estimation niveau ${data.level}`;
    vmaEstimate = { vma: defaultVma, source: vmaSource };
  }

  // Cross-check VMA vs targetTime
  if (data.targetTime && data.subGoal && vmaEstimate) {
    const raceDistances: Record<string, number> = { '5 km': 5, '10 km': 10, 'Semi-Marathon': 21.1, 'Marathon': 42.195 };
    const raceDist = raceDistances[data.subGoal];
    if (raceDist) {
      const targetSeconds = timeToSeconds(data.targetTime, raceDist);
      if (targetSeconds > 0) {
        const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
        if (vmaEstimate.vma > targetVma * 1.15) {
          const correctedVma = targetVma * 1.05;
          paces = calculateAllPaces(correctedVma);
          vmaSource = `Recalculée depuis objectif ${data.subGoal} en ${data.targetTime}`;
          vmaEstimate = { vma: correctedVma, source: vmaSource };
        }
      }
    }
  }

  // Fréquence minimale absolue : jamais < 2 (sinon 0 séance running)
  if (data.frequency < 2) {
    console.warn(`[Fréquence] ${data.frequency} séance(s) → forcé à 2 minimum`);
    data.frequency = 2;
  }
  // Semi, Marathon, Trail nécessitent au minimum 3 séances (2 running + 1 renfo)
  const goalCheck = data.goal || '';
  const isAmbitiousGoal = goalCheck.includes('Trail') ||
    data.subGoal === 'Semi-Marathon' || data.subGoal === 'Semi-marathon' ||
    data.subGoal === 'Marathon';
  if (isAmbitiousGoal && data.frequency < 3) {
    console.warn(`[Fréquence] ${data.subGoal || goalCheck} avec ${data.frequency} séances → forcé à 3 minimum`);
    data.frequency = 3;
  }

  // Durée du plan
  let planDurationWeeks = 12;
  if (data.raceDate) {
    const raceDate = new Date(data.raceDate);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const diffDays = (raceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const diffWeeks = Math.ceil(diffDays / 7); // ceil pour ne jamais couper la dernière semaine
    planDurationWeeks = Math.max(4, Math.min(20, diffWeeks));
  }

  // Contexte de génération
  const generationContext = createGenerationContext(data, paces, vmaEstimate.vma, vmaSource, planDurationWeeks);

  const pacesSection = `
VMA : ${paces.vmaKmh} km/h (${vmaSource})
- EF (Endurance) : ${paces.efPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récupération : ${paces.recoveryPace} min/km
`;

  const preferredDaysInstruction = data.preferredDays?.length > 0
    ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
    : 'Répartition équilibrée (ex: Mardi, Jeudi, Dimanche)';

  // Instruction jour sortie longue
  const longRunDay = data.preferredLongRunDay || 'Dimanche';
  const longRunDayInstruction = `La SORTIE LONGUE doit être placée le ${longRunDay}.`;

  let injuryInstruction = '';
  if (data.injuries?.hasInjury && data.injuries.description) {
    injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`;
  }

  const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
  const beginnerInstructionPreview = isBeginnerLevel ? `

🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT :
- Type : "Marche/Course" (OBLIGATOIRE pour au moins 2 séances sur ${data.frequency})
- Format semaine 1 : 8-10 x (1 min course + 2 min marche)
- Pas de VMA, pas de fractionné intense
` : '';

  // Trail section
  const trailSectionPreview = data.goal === 'Trail' && data.trailDetails ? `
🏔️ TRAIL : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
- Sortie longue avec D+ progressif, fractionné en côte
- Chaque séance trail DOIT mentionner le D+ cible
` : '';

  // Feasibility calculation
  const hasChronoPreview = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
  const feasibilityResultPreview = calculateFeasibility({
    vma: vmaEstimate.vma,
    targetTime: data.targetTime,
    distance: data.subGoal || '',
    goal: data.goal || '',
    level: data.level || '',
    planWeeks: planDurationWeeks,
    currentVolume: data.currentWeeklyVolume,
    currentWeeklyElevation: data.currentWeeklyElevation,
    trailElevation: data.trailDetails?.elevation,
    trailDistance: data.trailDetails?.distance,
    hasInjury: !!(data.injuries?.hasInjury),
    hasChrono: hasChronoPreview,
    age: data.age,
    weight: data.weight,
    height: data.height,
  });
  const feasibilityTextPreview = `Score : ${feasibilityResultPreview.score}/100 | Statut : ${feasibilityResultPreview.status}
${feasibilityResultPreview.message}
${feasibilityResultPreview.alternativeTarget ? `Objectif alternatif : ${feasibilityResultPreview.alternativeTarget}` : ''}`;

  const safetyInstructions = buildSafetyInstructions(data, isBeginnerLevel);

  const previewPrompt = `
Tu es un Coach Running Expert. Génère UNIQUEMENT la SEMAINE 1 d'un plan d'entraînement.

═══════════════════════════════════════════════════════════════
                    PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════
- Niveau : ${data.level}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Date de course : ${data.raceDate || 'Non définie'}
- Fréquence : ${data.frequency} séances/semaine
- Jours : ${preferredDaysInstruction}
- Jour sortie longue : ${longRunDayInstruction}
- Volume actuel : ${data.currentWeeklyVolume ? `${data.currentWeeklyVolume} km/semaine` : 'Non renseigné'}
- Localisation : ${data.city || 'Non renseignée'}
${data.weight ? `- Poids : ${data.weight} kg` : ''}
${data.height ? `- Taille : ${data.height} cm` : ''}
${data.age ? `- Âge : ${data.age} ans` : ''}
${data.currentWeeklyVolume ? `⚠️ RÈGLE VOLUME DE DÉPART — ADAPTE selon le cas :
${data.currentWeeklyVolume >= 30 ? `- Volume actuel SOLIDE (${data.currentWeeklyVolume}km) : semaine 1 = ${data.currentWeeklyVolume} à ${Math.round(data.currentWeeklyVolume * 1.1)}km max. Progression +5-10%/semaine.` : data.currentWeeklyVolume >= 15 ? `- Volume actuel MODÉRÉ (${data.currentWeeklyVolume}km) : semaine 1 = ${data.currentWeeklyVolume} à ${Math.round(data.currentWeeklyVolume * 1.15)}km max. Progression +10-15%/semaine acceptable.` : data.currentWeeklyVolume > 0 ? `- Volume actuel FAIBLE (${data.currentWeeklyVolume}km) : semaine 1 = ${Math.max(data.currentWeeklyVolume, 10)} à ${Math.round(Math.max(data.currentWeeklyVolume, 10) * 1.2)}km. Progression +15-20%/semaine acceptable au début car la base est basse.` : `- Volume actuel NUL : commencer par de la marche/course, semaine 1 = 8-12km max (dont marche). Progression libre les 3-4 premières semaines.`}
- JAMAIS de saut > +20% d'une semaine à l'autre une fois passé les 30km/semaine.
- Prévoir une semaine de récupération (-30% volume) toutes les 3-4 semaines.` : ''}
${injuryInstruction}
${beginnerInstructionPreview}

${safetyInstructions}

${data.city ? `
📍 LIEUX D'ENTRAÎNEMENT (suggestedLocations) :
Tu DOIS proposer 2-3 lieux RÉELS à ${data.city} ou dans ses environs proches :
- Recherche des parcs, pistes d'athlétisme, forêts ou sentiers CONNUS de cette ville
- Pour chaque lieu, indique le type (PARK, TRACK, NATURE, HILL) et pour quel type de séance il convient

📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Chaque séance DOIT avoir un "locationSuggestion" avec un lieu RÉEL de ${data.city} adapté aux EXIGENCES de la séance :
- Fractionné VMA/vitesse → PISTE D'ATHLÉTISME
- Fractionné seuil/tempo → chemin plat, berges, voie verte
- Sortie Longue route → grand parc, boucle longue, berges
- Footing/Récup → parc agréable, sol souple
- Renforcement → "À la maison" ou "Salle de sport"
` : ''}

═══════════════════════════════════════════════════════════════
              ALLURES CALCULÉES (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════
${pacesSection}

⚠️ UTILISE CES ALLURES EXACTES dans chaque séance !

═══════════════════════════════════════════════════════════════
              PLAN DE PÉRIODISATION PRÉ-CALCULÉ
═══════════════════════════════════════════════════════════════
Durée totale : ${planDurationWeeks} semaines
Semaine 1 : Phase "${generationContext.periodizationPlan.weeklyPhases[0]}"
Volume semaine 1 : ${generationContext.periodizationPlan.weeklyVolumes[0]} km

Phases du plan :
${generationContext.periodizationPlan.weeklyPhases.map((p, i) => `S${i + 1}: ${p} (${generationContext.periodizationPlan.weeklyVolumes[i]}km)`).join('\n')}

═══════════════════════════════════════════════════════════════
          🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨
═══════════════════════════════════════════════════════════════
🔴 EXACTEMENT ${data.frequency} séances dans la semaine 1.
🔴 Jours : ${data.preferredDays?.length ? data.preferredDays.join(', ') + ' — CES JOURS UNIQUEMENT.' : 'Répartition équilibrée.'}
🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.
🔴 Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne génères que la semaine 1 ici).

═══════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════
1. Génère SEULEMENT la semaine 1 (pas les autres !)
2. ${data.frequency} séances sur ${data.frequency} jours DIFFÉRENTS
3. Allures EXACTES dans chaque mainSet
4. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)
5. Évaluation de faisabilité HONNÊTE avec chiffres
6. OBLIGATOIRE : 1 séance de type "Renforcement" par semaine (comptée dans les ${data.frequency} séances)
   - NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance au bon jour.
   - Type dans le JSON : "Renforcement"
${trailSectionPreview}
📊 FAISABILITÉ PRÉ-CALCULÉE :
${feasibilityTextPreview}
Reformule cette faisabilité dans feasibility.message de façon naturelle et coach.

═══════════════════════════════════════════════════════════════
                    FORMAT JSON
═══════════════════════════════════════════════════════════════
{
  "name": "Nom du plan incluant objectif",
  "goal": "${data.goal}",
  "startDate": "${data.startDate || new Date().toISOString().split('T')[0]}",
  "durationWeeks": ${planDurationWeeks},
  "sessionsPerWeek": ${data.frequency},
  "targetTime": "${data.targetTime || ''}",
  "distance": "${data.subGoal || ''}",
  "location": "${data.city || ''}",
  "suggestedLocations": [
    { "name": "Nom réel du lieu", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de séance" }
  ],
  "welcomeMessage": "Message personnalisé orienté OBJECTIF et STRUCTURE du plan",
  "confidenceScore": 75,
  "feasibility": {
    "status": "BON",
    "message": "Analyse avec chiffres VMA/temps théorique",
    "safetyWarning": "Conseil sécurité"
  },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Thème court de la semaine",
      "weekGoal": "Explication du rôle de cette semaine dans ta préparation et ce qu'on cherche à développer",
      "phase": "${generationContext.periodizationPlan.weeklyPhases[0]}",
      "sessions": [
        {
          "day": "Jour",
          "type": "Type",
          "title": "Titre unique",
          "duration": "durée",
          "distance": "distance",
          "intensity": "Facile|Modéré|Difficile",
          "targetPace": "allure",
          "elevationGain": 0,
          "locationSuggestion": "Lieu réel adapté",
          "warmup": "échauffement avec allure",
          "mainSet": "corps détaillé avec allures EXACTES",
          "cooldown": "retour au calme",
          "advice": "conseil personnalisé"
        }
      ]
    }
  ]
}

═══════════════════════════════════════
       VÉRIFICATION FINALE
═══════════════════════════════════════

Pas de séance "Repos" — les jours off sont implicites.

🚨 RÈGLES ABSOLUES POUR CHAQUE SÉANCE (sauf Renforcement) :
1. warmup : TOUJOURS présent, avec allure en min/km (ex: "10 min à 7:00 min/km")
2. mainSet : TOUJOURS avec allures EXACTES en min/km pour CHAQUE bloc (JAMAIS "allure modérée" → toujours "à 5:30 min/km")
3. cooldown : TOUJOURS présent, avec allure en min/km
4. targetPace : TOUJOURS rempli (allure principale de la séance en min/km)
5. advice : TOUJOURS un conseil UNIQUE et PERSONNEL du coach, jamais dupliqué entre séances
6. weekGoal : TOUJOURS une explication de ce que cette semaine apporte à la préparation globale

✅ TOUT en français, tutoiement, ton de coach bienveillant et exigeant
✅ Allures EXCLUSIVEMENT en min/km (JAMAIS en km/h)

RAPPEL : Génère UNIQUEMENT la semaine 1 !
`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: previewPrompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const response = await result.response;
  const text = response.text();
  const plan = JSON.parse(text);

  // Enrichissement du plan
  plan.id = Date.now().toString();
  plan.createdAt = new Date().toISOString();
  plan.calculatedVMA = vmaEstimate.vma;
  plan.vma = paces.vma;
  plan.vmaSource = vmaSource;
  plan.paces = {
    efPace: paces.efPace,
    eaPace: paces.eaPace,
    seuilPace: paces.seuilPace,
    vmaPace: paces.vmaPace,
    recoveryPace: paces.recoveryPace,
    allureSpecifique5k: paces.allureSpecifique5k,
    allureSpecifique10k: paces.allureSpecifique10k,
    allureSpecifiqueSemi: paces.allureSpecifiqueSemi,
    allureSpecifiqueMarathon: paces.allureSpecifiqueMarathon,
  };

  plan.isPreview = true;
  plan.fullPlanGenerated = false;
  plan.generationContext = generationContext;
  plan.adaptationLog = {
    weekNumber: 0,
    adaptationsThisWeek: 0,
    adaptationHistory: [],
  };

  // === VALIDATION ET CORRECTION POST-GÉNÉRATION (Preview) ===
  const prefDays = data.preferredDays && data.preferredDays.length > 0 ? data.preferredDays : null;

  if (plan.weeks?.[0]?.sessions) {
    // Forcer les jours préférés
    if (prefDays) {
      plan.weeks[0].sessions.forEach((session: any, idx: number) => {
        if (idx < prefDays.length && session.day !== prefDays[idx]) {
          console.log(`[Gemini Mobile] Correction jour: séance ${idx + 1} "${session.day}" → "${prefDays[idx]}"`);
          session.day = prefDays[idx];
        }
      });
    }

    // Forcer la Sortie Longue sur le jour préféré
    const slDay = data.preferredLongRunDay || 'Dimanche';
    const slSession = plan.weeks[0].sessions.find((s: any) => s.type === 'Sortie Longue');
    if (slSession && slSession.day !== slDay) {
      const occupant = plan.weeks[0].sessions.find((s: any) => s.day === slDay && s !== slSession);
      if (occupant) {
        console.log(`[Gemini Mobile Preview] Swap SL: "${slSession.day}" ↔ "${occupant.day}" (${occupant.title})`);
        occupant.day = slSession.day;
      }
      console.log(`[Gemini Mobile Preview] SL forcée sur ${slDay} (était ${slSession.day})`);
      slSession.day = slDay;
    }

    // Dédupliquer
    const usedDays = new Set<string>();
    plan.weeks[0].sessions.forEach((session: any, idx: number) => {
      if (usedDays.has(session.day)) {
        const pool = prefDays || DAYS_ORDER;
        const available = pool.filter((d: string) => !usedDays.has(d));
        if (available.length > 0) session.day = available[0];
      }
      usedDays.add(session.day);
      session.id = `w1-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    });

    // Ajuster le nombre de séances
    if (plan.weeks[0].sessions.length > data.frequency) {
      console.warn(`[Gemini Mobile] ${plan.weeks[0].sessions.length} séances au lieu de ${data.frequency} — tronqué`);
      plan.weeks[0].sessions = plan.weeks[0].sessions.slice(0, data.frequency);
    }

    plan.weeks[0].sessions.sort(
      (a: any, b: any) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day),
    );
  }

  // Forcer les métadonnées du plan
  plan.durationWeeks = planDurationWeeks;
  plan.sessionsPerWeek = data.frequency;

  // === Injection déterministe du contenu renfo (Preview Mobile) ===
  if (plan.weeks?.[0]?.sessions) {
    plan.weeks[0].sessions.forEach((session: any) => {
      if (session.type === 'Renforcement') {
        const renfo = buildRenfoMainSet({
          weekNumber: 1,
          goal: data.goal || '',
          subGoal: data.subGoal,
          trailDistance: data.trailDetails?.distance,
          level: data.level || '',
          phase: plan.weeks[0].phase || 'fondamental',
          weight: data.weight,
          height: data.height,
        });
        session.mainSet = renfo.mainSet;
        session.warmup = renfo.warmup;
        session.cooldown = renfo.cooldown;
        session.duration = renfo.duration;
        session.title = renfo.title;
      }
    });
  }

  // === Enforcement D+ trail (Preview Mobile — semaine 1) ===
  if (data.goal === 'Trail' && data.trailDetails && plan.weeks?.[0]?.sessions) {
    const weekTarget = calculateWeekTargetElevation(
      1, planDurationWeeks, data.trailDetails.elevation,
      data.level || '', data.currentWeeklyElevation,
    );
    distributeElevationToSessions(plan.weeks[0].sessions, weekTarget);
    console.log(`[Trail D+ Preview] S1: D+ cible = ${weekTarget}m`);
  }

  // === Post-processing qualité séances (Preview Mobile) ===
  if (plan.weeks && Array.isArray(plan.weeks)) {
    plan.weeks.forEach((week: any) => postProcessWeekQuality(week, paces, 'Première semaine — mise en route progressive', data.goal));
  }
  plan.name = buildPlanName(data, planDurationWeeks);
  if (plan.welcomeMessage) plan.welcomeMessage = forceTutoiement(plan.welcomeMessage);
  if (plan.feasibility?.message) plan.feasibility.message = forceTutoiement(plan.feasibility.message);
  if (plan.feasibility?.safetyWarning) plan.feasibility.safetyWarning = forceTutoiement(plan.feasibility.safetyWarning);

  // === Injection de la faisabilité calculée ===
  plan.feasibility = {
    status: feasibilityResultPreview.status,
    message: plan.feasibility?.message || feasibilityResultPreview.message,
    safetyWarning: feasibilityResultPreview.safetyWarning,
  };
  plan.confidenceScore = feasibilityResultPreview.score;

  // ─── Validation Layer 1 (rules only for preview — fast) ───
  const { validatePlanRules } = await import('./planValidator');
  const validation = validatePlanRules(plan as TrainingPlan, data);
  if (validation.issues.length > 0) {
    console.log(`[Gemini Mobile] Preview validation: score=${validation.score}, issues=${validation.issues.length}`);
    validation.issues.forEach((i) => console.log(`  [${i.severity}] S${i.weekNumber}: ${i.message}`));
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Gemini Mobile] Plan preview généré en ${elapsed}ms`);

  return plan;
};

// ---------------------------------------------------------------------------
// Générer les semaines restantes (2-N) à partir du generationContext
// ---------------------------------------------------------------------------

export const generateRemainingWeeks = async (
  plan: TrainingPlan,
  onProgress?: (batch: number, total: number) => void,
): Promise<TrainingPlan> => {
  if (!plan.isPreview || !plan.generationContext) {
    throw new Error("Ce plan n'est pas en mode preview ou manque le contexte de génération");
  }

  console.log('[Gemini Remaining] Génération des semaines restantes par lots...');
  const startTime = Date.now();

  const ctx = plan.generationContext;
  const data = ctx.questionnaireSnapshot;
  const paces = ctx.paces;
  const totalWeeks = ctx.periodizationPlan.totalWeeks;
  const BATCH_SIZE = 3;

  // Garde-fou fréquence (même logique que generatePreviewPlan)
  const goalRemaining = data.goal || '';
  const isAmbitiousRemaining = goalRemaining.includes('Trail') ||
    data.subGoal === 'Semi-Marathon' || data.subGoal === 'Semi-marathon' ||
    data.subGoal === 'Marathon';
  if (isAmbitiousRemaining && data.frequency < 3) {
    console.warn(`[Fréquence] Remaining: ${data.subGoal || goalRemaining} avec ${data.frequency} séances → forcé à 3`);
    data.frequency = 3;
  }

  const week1Summary = plan.weeks[0].sessions
    .map((s) => `${s.day}: ${s.title} (${s.type}, ${s.duration})`)
    .join('\n');

  const preferredDaysInstruction =
    data.preferredDays && data.preferredDays.length > 0
      ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
      : 'Répartition équilibrée';
  const longRunDayRemaining = data.preferredLongRunDay || 'Dimanche';

  const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
  const safetyInstructions = buildSafetyInstructions(data, isBeginnerLevel);

  const beginnerProgressionInstruction = isBeginnerLevel
    ? `
🚶‍♂️🏃 PROGRESSION MARCHE/COURSE POUR DÉBUTANT
- Semaines 2-3 : "Marche/Course" - 6-8 x (2 min course + 1 min marche)
- Semaines 4-5 : 5-6 x (3 min course + 1 min marche)
- Semaines 6-7 : 3-4 x (5 min course + 1 min marche)
- Semaines 8+ : Footing continu progressif (15-25 min)
- VMA/Fractionné : PAS AVANT semaine 8-10
⚠️ Le type "Marche/Course" doit rester dominant jusqu'à semaine 6-7 !
`
    : '';

  // === SECTION TRAIL pour les lots remaining ===
  const isTrailRemaining = data.goal === 'Trail' && data.trailDetails;
  const trailSectionRemaining = isTrailRemaining ? `
═══════════════════════════════════════
       SPÉCIFICITÉS TRAIL
═══════════════════════════════════════
Distance course : ${data.trailDetails!.distance} km | D+ : ${data.trailDetails!.elevation} m
Ratio D+/km : ${data.trailDetails!.distance > 0 ? Math.round(data.trailDetails!.elevation / data.trailDetails!.distance) : 0} m/km

Séances spécifiques trail :
- Sortie longue avec D+ progressif (50% → 100% du D+ course au fil des semaines)
- Fractionné en côte : côtes courtes (30-45") et longues (2-5 min)
- Travail technique descente : foulée courte, fréquence élevée
- Chaque séance trail DOIT mentionner le D+ cible dans mainSet
- elevationGain OBLIGATOIRE sur chaque séance trail (sauf Renforcement)
${data.trailDetails!.distance >= 42 ? '- Sorties longues avec ravitaillement simulé\n- Entraînement avec le matériel de course (sac, bâtons)' : ''}
${data.trailDetails!.distance >= 80 ? '- Back-to-back long (SL samedi + sortie dimanche)\n- Gestion effort sur très longue durée' : ''}
` : '';

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const weeksToGenerate: number[] = [];
  for (let w = 2; w <= totalWeeks; w++) weeksToGenerate.push(w);

  const batches: number[][] = [];
  for (let i = 0; i < weeksToGenerate.length; i += BATCH_SIZE) {
    batches.push(weeksToGenerate.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Gemini Remaining] ${weeksToGenerate.length} semaines en ${batches.length} lots`);

  const allGeneratedWeeks: any[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const startWeek = batch[0];
    const endWeek = batch[batch.length - 1];

    onProgress?.(batchIndex + 1, batches.length);

    const previousWeeksSummary =
      allGeneratedWeeks.length > 0
        ? `\n\nSEMAINES DÉJÀ GÉNÉRÉES (résumé) :\n` +
          allGeneratedWeeks
            .slice(-2)
            .map(
              (w: any) =>
                `Semaine ${w.weekNumber}: ${w.theme} - ${w.sessions.map((s: any) => s.title).join(', ')}`,
            )
            .join('\n')
        : '';

    const batchPrompt = `
Tu es un Coach Running Expert. Continue ce plan d'entraînement en générant UNIQUEMENT les SEMAINES ${startWeek} à ${endWeek}.

═══════════════════════════════════════════════════════════════
              🚨 CONTEXTE FIGÉ - NE PAS MODIFIER 🚨
═══════════════════════════════════════════════════════════════

VMA du coureur : ${ctx.vma.toFixed(1)} km/h (${ctx.vmaSource})

ALLURES OBLIGATOIRES :
- EF : ${paces.efPace} min/km
- EA : ${paces.eaPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récup : ${paces.recoveryPace} min/km
- Allure spé 5k : ${paces.allureSpecifique5k} min/km
- Allure spé 10k : ${paces.allureSpecifique10k} min/km
- Allure spé Semi : ${paces.allureSpecifiqueSemi} min/km
- Allure spé Marathon : ${paces.allureSpecifiqueMarathon} min/km

═══════════════════════════════════════════════════════════════
              SEMAINE 1 (RÉFÉRENCE)
═══════════════════════════════════════════════════════════════
${week1Summary}
${previousWeeksSummary}

═══════════════════════════════════════════════════════════════
              PÉRIODISATION POUR CES SEMAINES
═══════════════════════════════════════════════════════════════
${batch
  .map((weekNum) => {
    const phaseIdx = weekNum - 1;
    return `Semaine ${weekNum}: ${ctx.periodizationPlan.weeklyPhases[phaseIdx]} - Volume ${ctx.periodizationPlan.weeklyVolumes[phaseIdx]}km${ctx.periodizationPlan.recoveryWeeks.includes(weekNum) ? ' (RÉCUP)' : ''}`;
  })
  .join('\n')}

═══════════════════════════════════════════════════════════════
              PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════
- Niveau : ${data.level}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Fréquence : ${data.frequency} séances/semaine
- Jours : ${preferredDaysInstruction}
- Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}
${data.injuries?.hasInjury ? `⚠️ BLESSURE : ${data.injuries.description}` : ''}
${beginnerProgressionInstruction}
${trailSectionRemaining}
${isTrailRemaining ? `
📊 D+ CIBLE PAR SEMAINE (progression 50% → 100%) :
${batch.map(weekNum => {
  const progress = Math.min(1, 0.5 + (0.5 * (weekNum - 1) / (totalWeeks - 1)));
  const targetElevation = Math.round(data.trailDetails!.elevation * progress);
  return `Semaine ${weekNum}: D+ total cible ≈ ${targetElevation}m (${Math.round(progress * 100)}% du D+ course)`;
}).join('\n')}
⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement). La SL porte 60-70% du D+ hebdo.
` : ''}
${safetyInstructions}

💪 RENFORCEMENT : 1 séance "Renforcement" par semaine OBLIGATOIRE.
NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance au bon jour.
${data.city ? `
📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Ville : ${data.city}. Chaque séance DOIT avoir un "locationSuggestion" RÉEL adapté au type de séance.
` : ''}
═══════════════════════════════════════════════════════════════
              FORMAT JSON STRICT
═══════════════════════════════════════════════════════════════
Retourne UNIQUEMENT un tableau JSON des semaines ${startWeek} à ${endWeek} :

[
  {
    "weekNumber": ${startWeek},
    "theme": "Thème court de la semaine",
    "weekGoal": "Explication du rôle de cette semaine dans ta préparation",
    "phase": "${ctx.periodizationPlan.weeklyPhases[startWeek - 1]}",
    "isRecoveryWeek": ${ctx.periodizationPlan.recoveryWeeks.includes(startWeek)},
    "sessions": [
      {
        "day": "Jour",
        "type": "Type",
        "title": "Titre unique",
        "duration": "durée",
        "distance": "distance",
        "intensity": "Facile|Modéré|Difficile",
        "targetPace": "allure",
        "elevationGain": 0,
        "locationSuggestion": "Lieu réel adapté",
        "warmup": "échauffement",
        "mainSet": "corps avec allures EXACTES",
        "cooldown": "retour au calme",
        "advice": "conseil"
      }
    ]
  }${batch.length > 1 ? `, ...jusqu'à semaine ${endWeek}` : ''}
]

═══════════════════════════════════════
       VÉRIFICATION FINALE
═══════════════════════════════════════
🚨 RÈGLES ABSOLUES POUR CHAQUE SÉANCE (sauf Renforcement) :
1. warmup : TOUJOURS présent, avec allure en min/km
2. mainSet : TOUJOURS avec allures EXACTES en min/km (JAMAIS "allure modérée")
3. cooldown : TOUJOURS présent, avec allure en min/km
4. targetPace : TOUJOURS rempli
5. advice : conseil UNIQUE et PERSONNEL
6. weekGoal : explication de ce que cette semaine apporte

✅ TOUT en français, tutoiement
✅ Allures EXCLUSIVEMENT en min/km (JAMAIS en km/h)
✅ Variété : aucun format VMA/SL/Seuil dupliqué d'une semaine à l'autre

⚠️ GÉNÈRE EXACTEMENT ${batch.length} semaine(s) : ${batch.join(', ')}
🔴 CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.
🔴 Jours : ${data.preferredDays?.length ? data.preferredDays.join(', ') + ' — CES JOURS UNIQUEMENT.' : 'Répartition équilibrée.'}
`;

    let batchWeeks: any[] = [];
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: batchPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
        });

        const response = result.response;
        const text = response.text();
        batchWeeks = JSON.parse(text);

        const generatedWeekNumbers = new Set(batchWeeks.map((w: any) => w.weekNumber));
        const missingWeeks = batch.filter((w) => !generatedWeekNumbers.has(w));

        if (missingWeeks.length > 0) {
          console.warn(`[Gemini Remaining] Semaines manquantes: ${missingWeeks.join(', ')}, retry...`);
          retryCount++;
          if (retryCount > maxRetries) {
            throw new Error(`Semaines manquantes après ${maxRetries} tentatives`);
          }
          continue;
        }
        break;
      } catch (parseError: any) {
        console.error(`[Gemini Remaining] Erreur lot ${batchIndex + 1}, tentative ${retryCount + 1}:`, parseError.message);
        retryCount++;
        if (retryCount > maxRetries) throw parseError;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Valider et corriger les semaines (jours, fréquence)
    const preferredDaysRemaining = data.preferredDays && data.preferredDays.length > 0 ? data.preferredDays : null;
    batchWeeks.forEach((week: any) => {
      if (week.sessions && Array.isArray(week.sessions)) {
        // Forcer les jours préférés
        if (preferredDaysRemaining) {
          week.sessions.forEach((session: any, idx: number) => {
            if (idx < preferredDaysRemaining.length && session.day !== preferredDaysRemaining[idx]) {
              console.log(`[Gemini Remaining] Correction jour: S${week.weekNumber} séance ${idx + 1} "${session.day}" → "${preferredDaysRemaining[idx]}"`);
              session.day = preferredDaysRemaining[idx];
            }
          });
        }

        // Forcer la Sortie Longue sur le jour préféré
        const slDayR = data.preferredLongRunDay || 'Dimanche';
        const slSessionR = week.sessions.find((s: any) => s.type === 'Sortie Longue');
        if (slSessionR && slSessionR.day !== slDayR) {
          const occupantR = week.sessions.find((s: any) => s.day === slDayR && s !== slSessionR);
          if (occupantR) {
            console.log(`[Gemini Remaining] S${week.weekNumber} Swap SL: "${slSessionR.day}" ↔ "${occupantR.day}" (${occupantR.title})`);
            occupantR.day = slSessionR.day;
          }
          console.log(`[Gemini Remaining] S${week.weekNumber} SL forcée sur ${slDayR}`);
          slSessionR.day = slDayR;
        }

        // Dédupliquer
        const usedDays = new Set<string>();
        week.sessions.forEach((session: any, idx: number) => {
          if (usedDays.has(session.day)) {
            const pool = preferredDaysRemaining || DAYS_ORDER;
            const available = pool.filter((d: string) => !usedDays.has(d));
            if (available.length > 0) session.day = available[0];
          }
          usedDays.add(session.day);
          session.id = `w${week.weekNumber}-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        });

        // Ajuster le nombre de séances
        if (week.sessions.length > data.frequency) {
          console.warn(`[Gemini Remaining] S${week.weekNumber}: ${week.sessions.length} séances → tronqué à ${data.frequency}`);
          week.sessions = week.sessions.slice(0, data.frequency);
        }

        week.sessions.sort(
          (a: any, b: any) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day),
        );
      }
    });

    allGeneratedWeeks.push(...batchWeeks);
    console.log(`[Gemini Remaining] Lot ${batchIndex + 1} terminé: ${batchWeeks.length} semaines`);
  }

  allGeneratedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

  // === Injection déterministe du contenu renfo (Remaining Mobile) ===
  allGeneratedWeeks.forEach((week: any) => {
    if (!week.sessions || !Array.isArray(week.sessions)) return;
    week.sessions.forEach((session: any) => {
      if (session.type === 'Renforcement') {
        const renfo = buildRenfoMainSet({
          weekNumber: week.weekNumber,
          goal: data.goal || '',
          subGoal: data.subGoal,
          trailDistance: data.trailDetails?.distance,
          level: data.level || '',
          phase: week.phase || 'fondamental',
          weight: data.weight,
          height: data.height,
        });
        session.mainSet = renfo.mainSet;
        session.warmup = renfo.warmup;
        session.cooldown = renfo.cooldown;
        session.duration = renfo.duration;
        session.title = renfo.title;
      }
    });
  });

  // === Post-processing qualité séances (Remaining Mobile) ===
  const savedPaces = plan.generationContext?.paces;
  allGeneratedWeeks.forEach((week: any) => {
    postProcessWeekQuality(week, savedPaces || null, undefined, data.goal);
  });

  // === Enforcement D+ trail (post-processing déterministe) ===
  if (isTrailRemaining && data.trailDetails) {
    allGeneratedWeeks.forEach((week: any) => {
      if (!week.sessions || !Array.isArray(week.sessions)) return;
      const weekTarget = calculateWeekTargetElevation(
        week.weekNumber, totalWeeks, data.trailDetails!.elevation,
        data.level || '', data.currentWeeklyElevation,
      );
      distributeElevationToSessions(week.sessions, weekTarget);
      console.log(`[Trail D+] S${week.weekNumber}: D+ cible = ${weekTarget}m`);
    });
  }

  let fullPlan: TrainingPlan = {
    ...plan,
    weeks: [plan.weeks[0], ...allGeneratedWeeks],
    isPreview: false,
    fullPlanGenerated: true,
  };

  // ─── Validation & Auto-correction (3 layers) ───
  onProgress?.(batches.length, batches.length); // show final progress
  try {
    const { validateAndCorrectPlan } = await import('./planValidator');
    const { plan: validatedPlan, validation, aiReview } = await validateAndCorrectPlan(
      fullPlan,
      data,
      (status) => console.log(`[PlanValidator] ${status}`),
    );
    fullPlan = validatedPlan;

    if (aiReview) {
      console.log(`[PlanValidator] AI score: ${aiReview.overallScore}/100`);
      console.log(`[PlanValidator] Criteria: progression=${aiReview.criteria.progression}, injury=${aiReview.criteria.injuryRisk}, difficulty=${aiReview.criteria.difficulty}`);
    }
    console.log(`[PlanValidator] Final validation score: ${validation.score}/100, issues: ${validation.issues.length}`);
  } catch (validationError) {
    console.warn('[PlanValidator] Validation failed, using plan as-is:', validationError);
  }

  const elapsed2 = Date.now() - startTime;
  console.log(`[Gemini Remaining] ${allGeneratedWeeks.length} semaines en ${elapsed2}ms`);

  return fullPlan;
};

// ---------------------------------------------------------------------------
// Adaptation du plan après feedback RPE (Premium uniquement)
// ---------------------------------------------------------------------------

export const adaptPlanFromFeedback = async (
  plan: TrainingPlan,
  questionnaireData: QuestionnaireData,
  feedbackContext: string,
): Promise<{
  adaptationSummary: string;
  coachNote: string;
  pacesReminder?: string;
  objectiveReminder?: string;
  modifications: any[];
}> => {
  console.log('[Gemini Adaptation] Début adaptation plan');

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Recalculer les allures
  let vmaEstimate = getBestVMAEstimate(questionnaireData.recentRaceTimes);
  let paces: FullTrainingPaces;
  let vmaSource: string;

  if (vmaEstimate) {
    paces = calculateAllPaces(vmaEstimate.vma);
    vmaSource = vmaEstimate.source;
  } else {
    let defaultVma: number;
    switch (questionnaireData.level) {
      case 'Débutant (0-1 an)': defaultVma = 11.0; break;
      case 'Intermédiaire (Régulier)': defaultVma = 13.5; break;
      case 'Confirmé (Compétition)': defaultVma = 15.5; break;
      case 'Expert (Performance)': defaultVma = 17.5; break;
      default: defaultVma = 12.5;
    }
    paces = calculateAllPaces(defaultVma);
    vmaSource = `Estimation niveau ${questionnaireData.level}`;
    vmaEstimate = { vma: defaultVma, source: vmaSource };
  }

  // Cross-check VMA vs targetTime
  if (questionnaireData.targetTime && questionnaireData.subGoal && vmaEstimate) {
    const raceDistances: Record<string, number> = { '5 km': 5, '10 km': 10, 'Semi-Marathon': 21.1, 'Marathon': 42.195 };
    const raceDist = raceDistances[questionnaireData.subGoal];
    if (raceDist) {
      const targetSeconds = timeToSeconds(questionnaireData.targetTime, raceDist);
      if (targetSeconds > 0) {
        const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
        if (vmaEstimate.vma > targetVma * 1.15) {
          const correctedVma = targetVma * 1.05;
          paces = calculateAllPaces(correctedVma);
          vmaSource = `Recalculée depuis objectif ${questionnaireData.subGoal} en ${questionnaireData.targetTime}`;
          vmaEstimate = { vma: correctedVma, source: vmaSource };
        }
      }
    }
  }

  // Séances futures
  const upcomingSessions: string[] = [];
  plan.weeks.forEach((week, weekIdx) => {
    week.sessions.forEach((session, sessionIdx) => {
      if (!session.feedback?.completed) {
        upcomingSessions.push(
          `S${weekIdx + 1}-${sessionIdx + 1}: ${session.day} - ${session.title} (${session.type}, ${session.duration})`,
        );
      }
    });
  });

  // Feedbacks précédents
  const feedbackHistory: string[] = [];
  plan.weeks.forEach((week, weekIdx) => {
    week.sessions.forEach((session) => {
      if (session.feedback?.completed && session.feedback.rpe) {
        feedbackHistory.push(
          `S${weekIdx + 1} ${session.day}: RPE ${session.feedback.rpe}/10${session.feedback.notes ? ` - "${session.feedback.notes}"` : ''}`,
        );
      }
    });
  });

  let weeksRemaining = plan.durationWeeks || plan.weeks.length;
  if (plan.raceDate) {
    const raceDate = new Date(plan.raceDate);
    const diffTime = raceDate.getTime() - Date.now();
    weeksRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
  }

  const pacesSection = `
EF : ${paces.efPace} min/km | EA : ${paces.eaPace} min/km | Seuil : ${paces.seuilPace} min/km
VMA : ${paces.vmaPace} min/km | Récup : ${paces.recoveryPace} min/km`;

  const systemInstruction = `
Tu es un Coach Running Expert diplômé avec 15 ans d'expérience. Un coureur de ton groupe
te donne son feedback sur une séance récente. Tu réagis comme un VRAI coach qui connaît
personnellement ce coureur, son objectif et son historique.

🚨 RÈGLE ABSOLUE : COHÉRENCE DES ALLURES
Les allures ont été CALCULÉES MATHÉMATIQUEMENT. Tu DOIS les garder comme référence :
${pacesSection}
- Si tu allèges une séance, tu réduis le VOLUME (durée, répétitions), PAS les allures
- Exception : ralentir de 5-15 sec/km TEMPORAIREMENT si RPE > 8

PHILOSOPHIE : L'objectif final est INTOUCHABLE. Tu ajustes la méthode, pas la destination.

✅ CE QUE TU PEUX MODIFIER :
- Durée des séances (-10 à -25%)
- Nombre de répétitions (ex: 8x400m → 6x400m)
- Temps de récupération entre fractions
- Distance de la sortie longue (-10 à -20%)
- Ajouter un jour de repos si épuisement
- Remplacer un format de VMA par un format plus adapté

❌ CE QUE TU NE PEUX JAMAIS FAIRE :
- Modifier l'objectif ou le temps visé
- Changer les allures de référence de façon permanente
- Supprimer complètement un type de séance
- Modifier plus de 3 séances futures

MATRICE D'ADAPTATION PAR RPE :
RPE 1-4 (Trop facile) → Possible +5-10% volume. Encourager.
RPE 5-6 (Zone optimale) → Aucun changement. Plan parfait.
RPE 7-8 (Difficile) → Alléger -10-15% la prochaine séance similaire. Rassurer.
RPE 9-10 (Trop dur) → Alléger -20-25% les 2-3 prochaines. Possibilité ralentir 5-10s/km TEMPORAIRE. Vérifier surentraînement.

VARIÉTÉ : Quand tu modifies une séance, VARIE le format (pas juste réduire les reps).
PERSONNALISATION : Référence l'objectif du coureur, explique le pourquoi, donne un conseil pratique.
`;

  const adaptationPrompt = `
OBJECTIF : ${plan.goal} ${plan.distance ? `(${plan.distance})` : ''} ${plan.targetTime ? `en ${plan.targetTime}` : ''}
DATE COURSE : ${plan.raceDate || 'Non définie'} | SEMAINES RESTANTES : ${weeksRemaining}
NIVEAU : ${questionnaireData.level}

HISTORIQUE FEEDBACKS :
${feedbackHistory.length > 0 ? feedbackHistory.slice(-5).join('\n') : 'Aucun'}

FEEDBACK ACTUEL :
${feedbackContext}

SÉANCES À VENIR :
${upcomingSessions.slice(0, 10).join('\n')}

Réponds en JSON :
{
  "adaptationSummary": "Résumé en 2-3 phrases",
  "objectiveReminder": "Rappel objectif avec encouragement",
  "pacesReminder": "Allures de référence",
  "modifications": [
    {
      "weekNumber": X,
      "sessionIndex": X,
      "originalTitle": "Titre original",
      "changes": {
        "duration": "nouvelle durée si modifiée",
        "mainSet": "nouveau contenu avec allures EXACTES",
        "targetPace": "allure si modifiée",
        "advice": "Conseil personnalisé"
      },
      "reason": "Explication technique"
    }
  ],
  "coachNote": "Message motivant PERSONNALISÉ"
}
`;

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemInstruction }, { text: adaptationPrompt }] },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const response = result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text);
    if (!parsed.pacesReminder) {
      parsed.pacesReminder = `Allures de référence : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`;
    }
    return parsed;
  } catch {
    return {
      adaptationSummary: 'Adaptation prise en compte.',
      objectiveReminder: `Ton objectif de ${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ''} reste notre cap !`,
      pacesReminder: `Allures : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`,
      coachNote: 'Merci pour ton retour ! Continue à progresser.',
      modifications: [],
    };
  }
};
