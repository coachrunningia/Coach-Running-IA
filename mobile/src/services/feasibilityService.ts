/**
 * Service de calcul de faisabilité — Évaluation déterministe
 * Remplace les ~64 lignes de règles de faisabilité qui étaient dans le prompt Gemini.
 * Produit une évaluation concrète, honnête, avec des chiffres, sans appel IA.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeasibilityResult {
  score: number;            // 0-100
  status: 'EXCELLENT' | 'BON' | 'AMBITIEUX' | 'RISQUÉ';
  message: string;          // Message concret avec chiffres (FR)
  safetyWarning: string;    // Avertissement sécurité (FR)
  alternativeTarget?: string; // Objectif alternatif si cible irréaliste
}

export interface FeasibilityParams {
  vma: number;
  targetTime?: string;      // ex. "1h30", "3:45:00", "sub-4h", "01:30:00"
  distance: string;         // ex. "Semi-Marathon", "Marathon", "10 km", "5 km", "Trail 80km"
  goal: string;             // 'Course sur route' | 'Trail' | etc.
  level: string;            // 'Débutant (0-1 an)' etc.
  planWeeks: number;
  currentVolume?: number;   // km/semaine
  currentWeeklyElevation?: number; // D+/semaine actuel
  trailElevation?: number;  // D+ total de la course trail
  trailDistance?: number;    // Distance trail en km
  hasInjury: boolean;
  hasChrono: boolean;       // true si on a un vrai chrono de course, false si VMA estimée
  age?: number;
  weight?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse une chaîne d'objectif temps en minutes.
 * Formats acceptés :
 *   "1h30"  "1h30min"  "sub-4h"  "sub 3h45"
 *   "3:45:00"  "01:30:00"  "45:00"  "22:30"
 *   "1h"  "4h00"
 * Retourne null si impossible à parser ou si c'est un objectif "finisher".
 */
export function parseTargetTime(target: string): number | null {
  if (!target) return null;

  const cleaned = target
    .trim()
    .toLowerCase()
    .replace(/^sub[- ]?/, '')   // enlever "sub-" / "sub "
    .replace(/\s+/g, '');

  // Format "XhYY" / "XhYYmin" / "Xh"
  const hMinMatch = cleaned.match(/^(\d{1,2})h(\d{0,2})(min)?$/);
  if (hMinMatch) {
    const hours = parseInt(hMinMatch[1], 10);
    const mins = hMinMatch[2] ? parseInt(hMinMatch[2], 10) : 0;
    return hours * 60 + mins;
  }

  // Format "HH:MM:SS"
  const hmsMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10);
    const m = parseInt(hmsMatch[2], 10);
    const s = parseInt(hmsMatch[3], 10);
    return h * 60 + m + s / 60;
  }

  // Format "MM:SS" (pour 5km/10km typiquement)
  const msMatch = cleaned.match(/^(\d{1,3}):(\d{2})$/);
  if (msMatch) {
    const m = parseInt(msMatch[1], 10);
    const s = parseInt(msMatch[2], 10);
    return m + s / 60;
  }

  // Format purement numérique en minutes (ex. "90")
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Formate des minutes en chaîne lisible.
 *  - >= 60 min → "Xh:XXmin"  (ex. "1h:39min")
 *  - < 60 min → "XX:XX"      (ex. "22:30")
 */
export function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convertit un nom de distance en km.
 * Pour le trail on tente d'extraire le kilométrage du nom ("Trail 80km").
 * Retourne null pour les distances non standard / trail sans km.
 */
export function getDistanceKm(distance: string): number | null {
  const d = distance.trim().toLowerCase();

  if (d === '5 km' || d === '5km') return 5;
  if (d === '10 km' || d === '10km') return 10;
  if (d.includes('semi') || d.includes('half')) return 21.1;
  if (d === 'marathon' || d === '42 km' || d === '42km') return 42.195;

  // Trail avec distance — ex. "Trail 80km", "Trail 50 km", "Ultra 100km"
  const trailMatch = d.match(/(\d+)\s*km/);
  if (trailMatch) return parseInt(trailMatch[1], 10);

  return null;
}

/**
 * Retourne le facteur %VMA tenable pour une distance donnée.
 */
function getVmaFactor(distanceKm: number): number {
  if (distanceKm <= 5) return 0.95;
  if (distanceKm <= 10) return 0.90;
  if (distanceKm <= 21.1) return 0.85;
  if (distanceKm <= 42.195) return 0.80;
  // Ultra / trail long : on descend encore
  if (distanceKm <= 80) return 0.70;
  return 0.65;
}

/**
 * Calcule le temps théorique en minutes pour une distance donnée à une certaine VMA.
 */
function theoreticalTimeMinutes(vma: number, distanceKm: number): number {
  const factor = getVmaFactor(distanceKm);
  const speedKmh = vma * factor;
  return (distanceKm / speedKmh) * 60;
}

/**
 * Vérifie si le niveau correspond à "débutant".
 */
function isBeginner(level: string): boolean {
  return level.toLowerCase().includes('débutant') || level.toLowerCase().includes('debutant');
}

/**
 * Vérifie si le niveau correspond à "intermédiaire".
 */
function isIntermediate(level: string): boolean {
  return level.toLowerCase().includes('intermédiaire') || level.toLowerCase().includes('intermediaire');
}

/**
 * Calcule la VMA requise pour un temps cible sur une distance donnée.
 */
function requiredVmaForTarget(targetMinutes: number, distanceKm: number): number {
  const factor = getVmaFactor(distanceKm);
  const requiredSpeed = distanceKm / (targetMinutes / 60); // km/h
  return requiredSpeed / factor;
}

// ---------------------------------------------------------------------------
// Calcul principal
// ---------------------------------------------------------------------------

export function calculateFeasibility(params: FeasibilityParams): FeasibilityResult {
  const {
    vma,
    targetTime,
    distance,
    goal,
    level,
    planWeeks,
    currentVolume,
    hasInjury,
    hasChrono,
  } = params;

  const distanceKm = getDistanceKm(distance);
  const isTrail = goal.toLowerCase().includes('trail');
  const beginner = isBeginner(level);
  const intermediate = isIntermediate(level);
  const isMarathon = distanceKm !== null && distanceKm >= 42;
  const isSemi = distanceKm !== null && distanceKm >= 21 && distanceKm < 42;

  // -----------------------------------------------------------------------
  // Cas Trail sans distance standard ou objectif "Finisher" (pas de temps)
  // -----------------------------------------------------------------------
  const targetMinutes = parseTargetTime(targetTime ?? '');
  const hasTimeTarget = targetMinutes !== null && targetMinutes > 0;

  // Si pas de distance standard (trail exotique) ou pas de temps cible,
  // on fait une évaluation simplifiée basée sur le profil.
  if (distanceKm === null || !hasTimeTarget) {
    return buildFinisherFeasibility(params, distanceKm, beginner, isTrail, isMarathon, isSemi);
  }

  // -----------------------------------------------------------------------
  // Temps théorique et écart
  // -----------------------------------------------------------------------
  const theoMinutes = theoreticalTimeMinutes(vma, distanceKm);
  // Un temps cible inférieur au théorique = plus rapide = plus ambitieux → écart positif
  const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;
  // gapPercent > 0 signifie que la cible est PLUS RAPIDE que le théorique

  let score: number;
  let status: FeasibilityResult['status'];

  if (gapPercent <= -5) {
    // Cible plus lente que théorique de >5% → très confortable
    score = 95;
    status = 'EXCELLENT';
  } else if (gapPercent <= 5) {
    // Écart < 5% (cible ≈ théorique ou un peu plus lent)
    score = Math.round(100 - (Math.abs(gapPercent) * 3));
    score = clamp(score, 85, 100);
    status = 'EXCELLENT';
  } else if (gapPercent <= 15) {
    // 5-15% plus rapide que théorique
    score = Math.round(84 - ((gapPercent - 5) * 1.4));
    score = clamp(score, 70, 84);
    status = 'BON';
  } else if (gapPercent <= 25) {
    // 15-25% plus rapide
    score = Math.round(69 - ((gapPercent - 15) * 1.4));
    score = clamp(score, 55, 69);
    status = 'AMBITIEUX';
  } else {
    // > 25% plus rapide
    score = Math.round(54 - ((gapPercent - 25) * 0.8));
    score = clamp(score, 10, 54);
    status = 'RISQUÉ';
  }

  // -----------------------------------------------------------------------
  // Facteurs aggravants
  // -----------------------------------------------------------------------

  // Débutant + Marathon < 12 semaines → forcer RISQUÉ très bas
  if (beginner && isMarathon && planWeeks < 12) {
    score = clamp(Math.min(score, 25), 15, 30);
    status = 'RISQUÉ';
  }

  // Débutant + sub-3h marathon → forcer RISQUÉ score plancher
  if (beginner && isMarathon && targetMinutes < 180) {
    score = clamp(Math.min(score, 15), 10, 20);
    status = 'RISQUÉ';
  }

  // Débutant + sub-3h30 marathon → forcer RISQUÉ
  if (beginner && isMarathon && targetMinutes < 210 && targetMinutes >= 180) {
    score = clamp(Math.min(score, 30), 20, 35);
    status = 'RISQUÉ';
  }

  // Débutant + sub-4h marathon → AMBITIEUX (pas RISQUÉ mais alerte)
  if (beginner && isMarathon && targetMinutes < 240 && targetMinutes >= 210) {
    score = Math.min(score, 50);
    if (score < 55) status = 'RISQUÉ';
  }

  // Débutant + sub-1h30 semi → forcer RISQUÉ
  if (beginner && isSemi && targetMinutes < 90) {
    score = clamp(Math.min(score, 25), 15, 30);
    status = 'RISQUÉ';
  }

  // Débutant + sub-1h45 semi → AMBITIEUX strict
  if (beginner && isSemi && targetMinutes < 105 && targetMinutes >= 90) {
    score = Math.min(score, 50);
    if (score < 55) status = 'RISQUÉ';
  }

  // Intermédiaire + sub-3h marathon → ambitieux (nécessite VMA ~15.5+)
  if (intermediate && isMarathon && targetMinutes < 180) {
    score = Math.min(score, 45);
    if (score < 55) status = 'RISQUÉ';
  }

  // Intermédiaire + sub-3h15 marathon → à surveiller
  if (intermediate && isMarathon && targetMinutes < 195 && targetMinutes >= 180) {
    score = Math.min(score, 60);
  }

  // Intermédiaire + sub-1h20 semi → très ambitieux
  if (intermediate && isSemi && targetMinutes < 80) {
    score = Math.min(score, 50);
    if (score < 55) status = 'RISQUÉ';
  }

  // Préparation trop courte
  if (isSemi && planWeeks < 8) {
    score -= 20;
  }
  if (isMarathon && planWeeks < 12) {
    score -= 20;
  }

  // Volume insuffisant
  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) {
      score -= 25;
    } else if (isSemi && currentVolume < 20) {
      score -= 20;
    } else if (distanceKm <= 10 && currentVolume < 15) {
      score -= 15;
    }
  }

  // Pas de chrono + objectif temps précis → plafonner avec interpolation continue
  if (!hasChrono && hasTimeTarget) {
    const absGap = Math.abs(Math.min(gapPercent, 0));
    const noChronoCap = gapPercent >= 0
      ? 65
      : Math.round(clamp(65 + (absGap - 5) * 2, 65, 85));
    score = Math.min(score, noChronoCap);
    status = resolveStatus(score);
  }

  // Blessure → -10
  if (hasInjury) {
    score -= 10;
  }

  // IMC → risque articulaire, adapté par palier médical
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) {
      // Obésité classe 2+ : risque très élevé quelle que soit la distance
      score -= isMarathon ? 30 : 25;
    } else if (bmi >= 30) {
      // Obésité classe 1 : risque significatif
      score -= isMarathon ? 20 : 15;
    } else if (bmi >= 25) {
      // Surpoids : risque modéré sur longue distance
      score -= isMarathon ? 10 : isSemi ? 5 : 0;
    }
  }

  // Clamp final
  score = clamp(score, 10, 100);
  status = resolveStatus(score);

  // -----------------------------------------------------------------------
  // Messages
  // -----------------------------------------------------------------------
  const vmaNeeded = requiredVmaForTarget(targetMinutes, distanceKm);
  const theoFormatted = formatTime(theoMinutes);
  const targetFormatted = formatTime(targetMinutes);

  let message = buildMessage(
    vma, theoFormatted, targetFormatted, vmaNeeded,
    distanceKm, distance, score, status, beginner,
    planWeeks, isMarathon, isSemi, hasChrono, currentVolume, targetMinutes,
  );

  let alternativeTarget: string | undefined;
  if (status === 'AMBITIEUX' || status === 'RISQUÉ') {
    // Proposer un objectif réaliste : temps théorique + 5% de marge
    const realisticMinutes = theoMinutes * 1.05;
    alternativeTarget = formatTime(realisticMinutes);
  }

  const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height);

  return { score, status, message, safetyWarning, alternativeTarget };
}

// ---------------------------------------------------------------------------
// Évaluation "finisher" (pas de temps cible ou distance non standard)
// ---------------------------------------------------------------------------

function buildFinisherFeasibility(
  params: FeasibilityParams,
  distanceKm: number | null,
  beginner: boolean,
  isTrail: boolean,
  isMarathon: boolean,
  isSemi: boolean,
): FeasibilityResult {
  const { vma, planWeeks, currentVolume, hasInjury, level } = params;
  let score = 80; // Base confortable pour un objectif finisher
  let status: FeasibilityResult['status'] = 'BON';

  // -----------------------------------------------------------------------
  // Débutant + Ultra trail (60km+) → quasi-bloquant
  // -----------------------------------------------------------------------
  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = clamp(15, 10, 20); // RISQUÉ plancher — ultra débutant = irréaliste
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
    score = clamp(30, 25, 35); // Trail marathon débutant = très ambitieux
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 30) {
    score = Math.min(score, 55); // Trail long débutant = ambitieux
  } else if (beginner && isTrail) {
    score -= 10; // Trail court débutant = pénalité légère (technique, D+)
  }

  // Intermédiaire + ultra 100km+ → très ambitieux
  const intermediate = isIntermediate(level);
  if (intermediate && isTrail && distanceKm !== null && distanceKm >= 100) {
    score = Math.min(score, 50); // Ultra 100km+ intermédiaire = ambitieux
  } else if (intermediate && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = Math.min(score, 60); // Ultra 60km+ intermédiaire = à surveiller
  }

  // Débutant + marathon < 12 semaines
  if (beginner && isMarathon && planWeeks < 12) {
    score = Math.min(score, 40);
  }

  // Préparation courte
  if (isSemi && planWeeks < 8) score -= 15;
  if (isMarathon && planWeeks < 12) score -= 20;

  // Volume insuffisant
  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) score -= 20;
    else if (isSemi && currentVolume < 20) score -= 15;
  }

  // Trail long avec peu de volume
  if (isTrail && distanceKm !== null && distanceKm > 42 && (currentVolume ?? 0) < 40) {
    score -= 20;
  }

  // Trail elevation analysis
  if (isTrail && params.trailElevation && params.trailDistance) {
    const ratio = params.trailElevation / params.trailDistance;
    const currentElev = params.currentWeeklyElevation || 0;

    // High ratio (>80 D+/km) = very technical/steep trail
    if (ratio > 80 && beginner) {
      score -= 15;
    } else if (ratio > 100) {
      score -= 10; // Extreme ratio even for experienced
    }

    // Ultra trail tier penalties
    if (params.trailDistance >= 100 && planWeeks < 16) {
      score -= 20; // 100km+ needs 16+ weeks minimum
    } else if (params.trailDistance >= 80 && planWeeks < 14) {
      score -= 15; // 80km+ needs 14+ weeks
    }

    // Current weekly elevation vs race elevation gap
    if (currentElev > 0 && params.trailElevation > 0) {
      // If current weekly D+ is < 20% of race D+, it's a big gap
      if (currentElev < params.trailElevation * 0.15) {
        score -= 20;
      } else if (currentElev < params.trailElevation * 0.25) {
        score -= 10;
      }
    } else if (currentElev === 0 && params.trailElevation > 1500) {
      // No current elevation training + big D+ race
      score -= 15;
    }
  }

  if (hasInjury) score -= 10;

  score = clamp(score, 10, 100);
  status = resolveStatus(score);

  // Message
  let message: string;
  if (isTrail && distanceKm !== null) {
    const trailElev = params.trailElevation || 0;
    const ratio = trailElev > 0 && params.trailDistance ? Math.round(trailElev / params.trailDistance) : 0;
    message = `Avec ta VMA de ${vma.toFixed(1)} km/h, tu as une base solide pour aborder cette épreuve.`;
    if (trailElev > 0) {
      message += ` Trail de ${distanceKm}km avec ${trailElev}m D+ (${ratio}m/km).`;
      if (ratio > 80) {
        message += ` Le ratio D+/km est élevé : la gestion de l'effort en montée sera déterminante.`;
      }
    }
    if (distanceKm > 42) {
      message += ` L'endurance, la nutrition et la gestion de l'effort seront clés.`;
    }
    if (distanceKm >= 100) {
      message += ` Sur un ultra de ${distanceKm}km, la gestion mentale et le ravitaillement sont aussi importants que la condition physique.`;
    }
    if (beginner) {
      message += ` En tant que débutant, concentre-toi sur la régularité et l'écoute de ton corps.`;
    }
  } else if (isMarathon) {
    const theoMarathon = formatTime(theoreticalTimeMinutes(vma, 42.195));
    message = `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique marathon est d'environ ${theoMarathon}. Objectif finisher : concentre-toi sur la régularité.`;
  } else if (isSemi) {
    const theoSemi = formatTime(theoreticalTimeMinutes(vma, 21.1));
    message = `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique semi est d'environ ${theoSemi}. Sans objectif de temps, profite de la course !`;
  } else {
    message = `Avec ta VMA de ${vma.toFixed(1)} km/h, ce plan est adapté à ton profil. Bonne préparation !`;
  }

  // Messages spécifiques débutant + trail
  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
    message = `Un ultra-trail de ${distanceKm}km n'est pas adapté pour un débutant. Ce type d'épreuve demande plusieurs années d'expérience en trail et un volume d'entraînement conséquent. Je te recommande de commencer par un trail de 20-30km pour acquérir l'expérience technique et l'endurance nécessaires. C'est le meilleur chemin pour progresser en sécurité !`;
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
    message = `Un trail de ${distanceKm}km est très ambitieux pour un débutant. La distance combinée au dénivelé demande une solide base d'endurance. Je te conseille de viser un trail de 20-25km d'abord pour te familiariser avec les spécificités du trail (gestion du D+, descentes, ravitaillement).`;
  } else if (beginner && isMarathon && planWeeks < 12) {
    message = `Un marathon nécessite minimum 16-20 semaines de préparation pour un débutant. ${planWeeks} semaines, c'est insuffisant pour construire l'endurance nécessaire sans risque de blessure. Nous te recommandons soit de reporter ta course, soit de viser un semi-marathon.`;
  }

  const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height);

  return { score, status, message, safetyWarning };
}

// ---------------------------------------------------------------------------
// Construction du message principal
// ---------------------------------------------------------------------------

function buildMessage(
  vma: number,
  theoFormatted: string,
  targetFormatted: string,
  vmaNeeded: number,
  distanceKm: number,
  distanceName: string,
  score: number,
  status: FeasibilityResult['status'],
  beginner: boolean,
  planWeeks: number,
  isMarathon: boolean,
  isSemi: boolean,
  hasChrono: boolean,
  currentVolume?: number,
  targetMinutes?: number,
): string {
  const distanceLabel = distanceKm <= 5 ? '5km'
    : distanceKm <= 10 ? '10km'
    : distanceKm <= 21.1 ? 'semi'
    : distanceKm <= 42.195 ? 'marathon'
    : `${distanceKm}km`;

  const parts: string[] = [];

  // Toujours mentionner VMA et temps théorique
  parts.push(
    `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique sur ${distanceLabel} est d'environ ${theoFormatted}.`
  );

  // Comparer avec la cible
  if (status === 'EXCELLENT') {
    parts.push(`Ton objectif de ${targetFormatted} est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.`);
  } else if (status === 'BON') {
    parts.push(`Viser ${targetFormatted} est un bel objectif. Avec un entraînement régulier, c'est tout à fait atteignable.`);
  } else if (status === 'AMBITIEUX') {
    parts.push(
      `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. C'est un écart significatif par rapport à ton niveau actuel.`
    );
    parts.push(`Ce plan te fera progresser, mais un objectif autour de ${theoFormatted} serait plus réaliste pour cette préparation.`);
  } else {
    // RISQUÉ
    parts.push(
      `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. L'écart avec ton niveau actuel (${vma.toFixed(1)} km/h) est très important.`
    );
  }

  // Cas concrets débutant
  if (beginner && isMarathon && planWeeks < 12) {
    parts.length = 0; // Remplacer tout le message
    parts.push(
      `Un marathon nécessite minimum 16-20 semaines de préparation pour un débutant. ${planWeeks} semaines, c'est insuffisant pour construire l'endurance nécessaire sans risque de blessure. Nous te recommandons soit de reporter ta course, soit de viser un semi-marathon.`
    );
  } else if (beginner && isMarathon && score <= 50) {
    parts.length = 0;
    if (targetMinutes < 180) {
      parts.push(
        `Sub-3h au marathon demande une VMA d'environ 17-18 km/h et plusieurs années d'entraînement structuré. Avec ta VMA actuelle de ${vma.toFixed(1)} km/h, l'écart est très important. Pour ton premier marathon, je te recommande de viser 4h30-5h — c'est déjà un bel objectif et surtout un objectif atteignable en sécurité !`
      );
    } else if (targetMinutes < 210) {
      parts.push(
        `Sub-3h30 au marathon est ambitieux pour un premier marathon. Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique est d'environ ${theoFormatted}. Je te conseille de viser ${theoFormatted} ou un peu plus pour ta première expérience marathon — la priorité est de franchir la ligne d'arrivée en bonne santé.`
      );
    } else {
      parts.push(
        `Sub-4h au marathon est un objectif courant mais ambitieux pour un débutant. Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique est d'environ ${theoFormatted}. Ton plan te guidera progressivement, mais écoute ton corps.`
      );
    }
  } else if (beginner && isSemi && score <= 55) {
    // Débutant + semi ambitieux
    const theoSemi = formatTime(theoreticalTimeMinutes(vma, 21.1));
    parts.length = 0;
    parts.push(
      `Avec ta VMA de ${vma.toFixed(1)} km/h, ton temps théorique semi est d'environ ${theoSemi}. Sans historique confirmé, viser un temps très rapide est risqué. Vise plutôt ${theoSemi} pour ton premier semi.`
    );
  }

  // Avertissements supplémentaires
  if (!hasChrono) {
    parts.push(`Note : ta VMA est estimée (pas de chrono de référence), l'évaluation comporte donc une marge d'incertitude.`);
  }

  if (isMarathon && planWeeks < 12 && !beginner) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une préparation marathon optimale. Le plan sera condensé.`);
  }

  if (isSemi && planWeeks < 8) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une préparation semi-marathon. Le plan sera condensé.`);
  }

  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour un marathon. La montée en charge sera progressive mais exigeante.`);
    } else if (isSemi && currentVolume < 20) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour un semi. La montée en charge sera progressive.`);
    }
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Avertissement sécurité
// ---------------------------------------------------------------------------

function buildSafetyWarning(
  beginner: boolean,
  isMarathon: boolean,
  isSemi: boolean,
  hasInjury: boolean,
  status: FeasibilityResult['status'],
  weight?: number,
  height?: number,
): string {
  const bmi = (weight && height && height > 0) ? weight / ((height / 100) ** 2) : 0;

  // Priorité : blessure > IMC ≥ 35 > IMC ≥ 30 > IMC ≥ 25 > marathon/semi > débutant > défaut
  if (hasInjury) {
    return 'Fais valider la reprise avec ton kiné/médecin avant de démarrer ce plan. Adapte les séances si nécessaire.';
  }

  if (bmi >= 35) {
    return 'Consulte impérativement ton médecin avant de démarrer ce programme. Avec ton IMC, le risque articulaire est élevé : privilégie le cross-training (vélo, natation, elliptique), les surfaces souples, et investis dans des chaussures avec un amorti maximal. Alterne marche et course si nécessaire.';
  }

  if (bmi >= 30) {
    return 'On te recommande de consulter ton médecin avant de démarrer. Investis dans de bonnes chaussures avec un amorti renforcé, privilégie les surfaces souples (herbe, terre, chemin), et intègre du cross-training (vélo, natation) pour réduire l\'impact sur les articulations.';
  }

  if (bmi >= 25 && (isMarathon || isSemi)) {
    return 'Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c\'est possible. Pense à bien t\'hydrater.';
  }

  if (beginner && (isMarathon || isSemi)) {
    return 'On te recommande de valider ce programme avec ton médecin, surtout pour un premier effort de cette distance. Un certificat médical d\'aptitude est vivement conseillé.';
  }

  if (beginner) {
    return 'Pense à consulter un médecin pour un certificat d\'aptitude avant de commencer ta préparation.';
  }

  if (status === 'AMBITIEUX' || status === 'RISQUÉ') {
    return 'Écoute ton corps à chaque séance. Si tu ressens des douleurs inhabituelles, n\'hésite pas à adapter ou sauter une séance.';
  }

  return 'Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.';
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveStatus(score: number): FeasibilityResult['status'] {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'BON';
  if (score >= 55) return 'AMBITIEUX';
  return 'RISQUÉ';
}
