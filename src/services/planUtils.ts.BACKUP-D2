/**
 * Fonctions utilitaires critiques pour la génération de plans.
 * Extraites pour être testables unitairement.
 */

/** Parse une durée textuelle en minutes */
export const parseDurationMin = (d: any): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};

/** Parse un temps de course en secondes, selon la distance contexte */
export const timeToSeconds = (time: string, contextDistance?: number): number => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Format "Xh" ou "XhYY" ou "Xh:YY"
  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    return hours * 3600 + mins * 60;
  }

  // Format "XX min" ou "XXmin" (en début de chaîne)
  const minMatchStart = t.match(/^(\d+)\s*min/);
  if (minMatchStart) {
    return parseInt(minMatchStart[1]) * 60;
  }

  // Format "hh:mm:ss"
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // Format "X:YY" — ambigu : mm:ss ou h:mm ?
  // Heuristique : si parts[0] est petit (≤ 3) et la distance est ≥ 5km, c'est h:mm
  // Car personne ne court 5km+ en 1-3 minutes. "1:13" pour 10K = 1h13, "45:30" pour 10K = 45min30s
  if (parts.length === 2) {
    if (contextDistance && contextDistance >= 21) {
      // Semi/Marathon : toujours h:mm
      return parts[0] * 3600 + parts[1] * 60;
    }
    if (contextDistance && contextDistance >= 5 && parts[0] <= 3) {
      // 5K-10K avec premier chiffre ≤ 3 : "1:13" = 1h13, "2:05" = 2h05
      return parts[0] * 3600 + parts[1] * 60;
    }
    // Sinon : mm:ss (ex: "22:15" = 22min15s, "45:30" = 45min30s)
    return parts[0] * 60 + parts[1];
  }

  // Format mixte : "5km 21min", "10K 55min"
  const embeddedMin = t.match(/(\d+)\s*min/);
  if (embeddedMin) {
    const embeddedH = t.match(/(\d+)\s*h/);
    if (embeddedH) return parseInt(embeddedH[1]) * 3600 + parseInt(embeddedMin[1]) * 60;
    return parseInt(embeddedMin[1]) * 60;
  }

  // Nombre seul
  const soloNum = parseInt(t);
  if (!isNaN(soloNum) && soloNum > 0) {
    if (contextDistance && contextDistance >= 21) {
      return soloNum <= 6 ? soloNum * 3600 : soloNum * 60;
    }
    return soloNum * 60;
  }

  return 0;
};

/** Calcule la VMA à partir d'un temps de course sur une distance donnée */
export const calculateVMAFromTime = (distanceKm: number, timeSeconds: number): number => {
  if (timeSeconds <= 0 || distanceKm <= 0) return 0;
  const avgSpeed = (distanceKm / timeSeconds) * 3600;
  const vmaFactor =
    distanceKm <= 1.5 ? 1.0 :
    distanceKm <= 3 ? 0.98 :
    distanceKm <= 5 ? 0.95 :
    distanceKm <= 10 ? 0.90 :
    distanceKm <= 21.1 ? 0.85 :
    distanceKm <= 42.195 ? 0.80 : 0.75;
  return avgSpeed / vmaFactor;
};

/** Calcule le D+ cible hebdo pour un trail */
export const calculateWeekTargetElevation = (
  weekNumber: number,
  totalWeeks: number,
  raceElevation: number,
  level: string,
  currentWeeklyElevation?: number,
): number => {
  if (!raceElevation || isNaN(raceElevation)) return 0;

  // Accepte les deux formats : court ('deb','inter','conf','expert') et long ('Débutant (0-1 an)', etc.)
  const lvl = level.toLowerCase();
  const isDeb = lvl === 'deb' || lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl === 'inter' || lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl === 'conf' || lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');
  const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 2500) :
    Math.min(raceElevation, 3500);

  const defaultStart =
    isDeb ? 150
    : isInter ? 300
    : isConf ? 500
    : 800;

  // Cap startElevation à 60% du max pour garantir une marge de progression
  // + cap absolu à 1500m (aucune S1 ne devrait dépasser ça)
  const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
  const startElevation = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : defaultStart;

  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  return Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
};

/** Classifie une séance pour la distribution D+ */
export const classifySessionForElevation = (
  session: { title?: string; type?: string; intensity?: string; duration?: string },
): 'ZERO' | 'TRAIL_OR_SL' | 'FOOTING' => {
  const title = (session.title || '').toLowerCase();
  const trackTypes = ['fractionné', 'vma', 'intervalle', 'seuil'];
  const isTrack = trackTypes.some(t => title.includes(t)) || trackTypes.some(t => (session.type || '').toLowerCase().includes(t));
  const isRecovery = /récup|recovery|décrassage|régénér/i.test(session.title || '') ||
    session.intensity === 'Très facile' || session.intensity === 'Très Facile';
  const isCotesShort = /côte|hill/i.test(title) && parseDurationMin(session.duration) < 70;

  if (isTrack || isRecovery) return 'ZERO';
  if (isCotesShort) return 'FOOTING';
  if (/trail|côte|dénivelé|montagne|sentier|d\+/i.test(session.title || '') ||
      /sortie longue/i.test(session.title || '') || session.type === 'Sortie Longue') {
    return 'TRAIL_OR_SL';
  }
  return 'FOOTING';
};
