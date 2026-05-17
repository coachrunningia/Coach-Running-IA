/**
 * Fonctions utilitaires critiques pour la génération de plans.
 * Extraites pour être testables unitairement.
 */

/** Parse "12.5 km" / "12,5 km" / "12.5" / "12.5km" → 12.5 (0 si invalide ou ≤ 0) */
export const parseKm = (d: unknown): number => {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};

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

/**
 * Calcule le D+ cible hebdo pour un trail.
 * - Plafond par niveau pour éviter les volumes irréalistes
 * - Plancher minimum 15% du D+ course (un trail 1500m D+ ne peut pas démarrer à 50m/sem)
 * - Réduction par phase (récup: 55%, affûtage progressif: 40/50/70%)
 */
export const calculateWeekTargetElevation = (
  weekNumber: number,
  totalWeeks: number,
  raceElevation: number,
  level: string,
  currentWeeklyElevation?: number,
  phase?: string,
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

  // Cap startElevation à 60% du max + plancher minimum 15% D+ course
  const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
  const minStartElevation = Math.round(raceElevation * 0.15);
  const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : Math.min(defaultStart, maxStart);
  const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));

  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  let target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);

  // Réduction par phase (récup & affûtage)
  const p = (phase || '').toLowerCase();
  if (p.includes('recup') || p.includes('récup')) {
    target = Math.round(target * 0.55);
  } else if (p.includes('affut') || p.includes('affût') || p.includes('taper')) {
    const remainingWeeks = totalWeeks - weekNumber;
    const affutageReduction = remainingWeeks <= 0 ? 0.40
      : remainingWeeks === 1 ? 0.50
      : 0.70;
    target = Math.round(target * affutageReduction);
  }

  return target;
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
