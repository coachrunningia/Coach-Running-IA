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
  status: 'EXCELLENT' | 'BON' | 'AMBITIEUX' | 'RISQUÉ' | 'IRRÉALISTE';
  message: string;          // Message concret avec chiffres (FR)
  safetyWarning: string;    // Avertissement sécurité (FR)
  alternativeTarget?: string; // Objectif alternatif si cible irréaliste
  recommendation?: string;  // Suggestion intelligente pour le modal de warning (ex: "un temps cible de 1h23")
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
  vmaFromTarget?: boolean;  // true si VMA recalculée depuis l'objectif (raisonnement circulaire)
  age?: number;
  weight?: number;
  height?: number;
  frequency?: number;       // séances par semaine
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

  // Format "XXmin" (sans heures, ex. "30min", "45min")
  const minOnlyMatch = cleaned.match(/^(\d{1,3})min$/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1], 10);
  }

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
 * Calcule la distance équivalente plate pour un trail avec D+.
 * Règle standard trail : chaque 100m de D+ ≈ 1km de distance plate supplémentaire.
 * On ajoute aussi un facteur pour le terrain technique (sentier vs route).
 */
function getEquivalentFlatDistance(distanceKm: number, elevationM?: number): number {
  if (!elevationM || elevationM <= 0) return distanceKm;
  // Chaque 100m D+ ≈ 1km plat (règle de Kilian / standard trail)
  const elevationEquivalent = elevationM / 100;
  return distanceKm + elevationEquivalent;
}

/**
 * Calcule le temps théorique en minutes pour une distance donnée à une certaine VMA.
 * Pour le trail, utiliser getEquivalentFlatDistance AVANT d'appeler cette fonction.
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
  // isMarathon/isSemi uniquement pour course sur route, pas trail
  const isMarathon = !isTrail && distanceKm !== null && distanceKm >= 42;
  const isSemi = !isTrail && distanceKm !== null && distanceKm >= 21 && distanceKm < 42;

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
  // Pour le trail avec D+, utiliser la distance équivalente plate
  const effectiveDistanceKm = isTrail
    ? getEquivalentFlatDistance(distanceKm, params.trailElevation)
    : distanceKm;
  const theoMinutes = theoreticalTimeMinutes(vma, effectiveDistanceKm);
  // Un temps cible inférieur au théorique = plus rapide = plus ambitieux → écart positif
  const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;
  // gapPercent > 0 signifie que la cible est PLUS RAPIDE que le théorique

  // -----------------------------------------------------------------------
  // Objectif physiquement impossible (VMA requise > 130% de VMA actuelle)
  // On laisse de la marge pour la progression en entraînement (5-15% VMA
  // possible sur un plan de 12-20 semaines). IRRÉALISTE = vraiment hors
  // de portée, même avec progression optimale.
  // -----------------------------------------------------------------------
  const vmaNeededForTarget = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const vmaRatioPercent = Math.round((vmaNeededForTarget / vma) * 100);
  if (vmaRatioPercent >= 130) {
    const theoFormatted = formatTime(theoMinutes);
    const realisticMinutes = theoMinutes * 1.05;
    const alternativeTarget = formatTime(realisticMinutes);
    const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, 'IRRÉALISTE', params.weight, params.height);

    return {
      score: 5,
      status: 'IRRÉALISTE',
      message: `Ton objectif de ${formatTime(targetMinutes)} sur ${distance} nécessiterait une VMA de ${vmaNeededForTarget.toFixed(1)} km/h, soit ${vmaRatioPercent}% de ta VMA actuelle (${vma.toFixed(1)} km/h). Même avec une progression optimale, cet écart est trop important. Ton temps théorique est de ${theoFormatted}. Un objectif réaliste serait autour de ${alternativeTarget}.`,
      safetyWarning,
      alternativeTarget,
      recommendation: `un temps cible de ${alternativeTarget}`,
    };
  }

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

  // VMA basse + objectif ambitieux → pénalité supplémentaire
  // Plus la VMA est basse, plus chaque % d'amélioration est difficile à obtenir.
  // Ex: VMA 9.6 → gagner 13% = +1.5 km/h de VMA, énorme pour un débutant
  // Ex: VMA 17.7 → gagner 13% = +2.3 km/h mais sur une base déjà haute = progression naturelle
  if (vma < 12 && gapPercent > 5) {
    const lowVmaPenalty = Math.round((12 - vma) * (gapPercent - 5) * 0.5);
    score -= lowVmaPenalty;
    reasons.push({ type: 'warn', text: `ta VMA actuelle (${vma.toFixed(1)} km/h) laisse peu de marge de progression — chaque minute gagnée demande un effort d'entraînement important` });
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
  // Plus le gap est négatif (objectif confortable), plus le cap remonte
  // -5% → cap 65, -15%+ → cap 85, interpolation linéaire entre les deux
  if (!hasChrono && hasTimeTarget) {
    const absGap = Math.abs(Math.min(gapPercent, 0)); // seulement le côté confortable
    const noChronoCap = gapPercent >= 0
      ? 65 // objectif plus rapide que théorique → cap bas
      : Math.round(clamp(65 + (absGap - 5) * 2, 65, 85));
    score = Math.min(score, noChronoCap);
    status = resolveStatus(score);
  }

  // VMA recalculée depuis l'objectif → raisonnement circulaire, confiance très faible
  // Le théorique est mathématiquement dérivé de la cible → la comparaison n'a pas de sens
  if (params.vmaFromTarget && hasTimeTarget) {
    score = Math.min(score, 50);
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
  const vmaNeeded = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const theoFormatted = formatTime(theoMinutes);
  const targetFormatted = formatTime(targetMinutes);

  let message = buildMessage(
    vma, theoFormatted, targetFormatted, vmaNeeded,
    distanceKm, distance, score, status, beginner,
    planWeeks, isMarathon, isSemi, hasChrono, currentVolume, targetMinutes,
    isTrail, params.trailElevation, level,
  );

  // VMA circulaire : remplacer le message par un avertissement clair
  if (params.vmaFromTarget) {
    const distLabel = isMarathon ? 'marathon' : isSemi ? 'semi-marathon' : `${distanceKm}km`;
    message = `Ta VMA est estimée à ${vma.toFixed(1)} km/h à partir de ton objectif de ${targetFormatted} sur ${distLabel} (pas de chrono de référence). Sans donnée réelle, il nous est difficile d'évaluer précisément la faisabilité de cet objectif. Nous te recommandons de réaliser un test VMA ou de renseigner un chrono récent (5km, 10km, semi) pour affiner ton plan et tes allures.`;
    if (hasInjury) {
      message += ` Attention : tes blessures déclarées nécessitent une vigilance particulière. Consulte un professionnel de santé avant de démarrer.`;
    }
  }

  // VMA estimée sans chrono : ajouter la nuance "sous condition" au message
  if (!hasChrono && hasTimeTarget && !params.vmaFromTarget) {
    message += ` Cette évaluation repose sur une VMA estimée (${vma.toFixed(1)} km/h) et non sur un chrono validé. Il faudra ajuster le plan au fil des séances selon ton ressenti, ou régénérer un plan en renseignant un chrono de référence (5km, 10km, semi) pour des allures plus précises.`;
  }

  let alternativeTarget: string | undefined;
  let recommendation: string | undefined;
  if (status === 'AMBITIEUX' || status === 'RISQUÉ') {
    // Proposer un objectif réaliste : temps théorique + 5% de marge
    // MAIS seulement si l'objectif est plus rapide que le théorique (gapPercent > 0)
    // Sinon l'objectif est déjà confortable, la recommandation serait absurde (plus rapide que la cible)
    if (gapPercent > 0) {
      const realisticMinutes = theoMinutes * 1.05;
      alternativeTarget = formatTime(realisticMinutes);
      recommendation = `un temps cible de ${alternativeTarget}`;
    } else if (!hasChrono) {
      recommendation = `valider ta VMA avec un test terrain ou un chrono récent (5km, 10km) pour affiner l'évaluation`;
    }
  }

  // Affiner la recommendation selon le contexte spécifique
  // Priorité : 1) ajuster le temps cible  2) allonger la prépa  3) dernier recours = changer distance
  if (status === 'RISQUÉ') {
    if (isMarathon && planWeeks < 12) {
      recommendation = `une durée de préparation d'au moins 16 semaines`;
    } else if (isSemi && planWeeks < 8) {
      recommendation = `une durée de préparation d'au moins 10 semaines`;
    }
    // sinon on garde le recommendation par défaut = temps cible alternatif
  }

  const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height);

  return { score, status, message, safetyWarning, alternativeTarget, recommendation };
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

  // Tracking des raisons (positives et négatives) pour construire le message
  const reasons: { type: 'risk' | 'warn' | 'good'; text: string }[] = [];
  const trailElev = params.trailElevation || 0;
  const trailRatio = trailElev > 0 && params.trailDistance ? Math.round(trailElev / params.trailDistance) : 0;
  const currentElev = params.currentWeeklyElevation || 0;
  const intermediate = isIntermediate(level);

  // -----------------------------------------------------------------------
  // Débutant + Trail
  // -----------------------------------------------------------------------
  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = clamp(15, 10, 20);
    reasons.push({ type: 'risk', text: `un ultra-trail de ${distanceKm}km n'est pas adapté pour un débutant — il faut plusieurs années d'expérience trail` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
    score = clamp(30, 25, 35);
    reasons.push({ type: 'risk', text: `un trail de ${distanceKm}km est très ambitieux pour un débutant — vise d'abord un trail de 20-25km` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 30) {
    score = Math.min(score, 55);
    reasons.push({ type: 'warn', text: `trail de ${distanceKm}km pour un débutant : la distance combinée au D+ demande une solide base` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 15) {
    score = Math.min(score, 65);
    if (params.trailElevation && params.trailElevation >= 500) score -= 5;
    if (params.trailElevation && params.trailElevation >= 1000) score -= 5;
    reasons.push({ type: 'warn', text: `trail de ${distanceKm}km pour un débutant : progression prudente nécessaire, alterne marche/course en montée` });
  } else if (beginner && isTrail) {
    score -= 15;
    reasons.push({ type: 'warn', text: `le trail demande de la technique même sur courte distance — sois progressif` });
  }

  // Intermédiaire + ultra
  if (intermediate && isTrail && distanceKm !== null && distanceKm >= 100) {
    score = Math.min(score, 50);
    reasons.push({ type: 'risk', text: `un ultra de ${distanceKm}km demande une expérience significative même pour un intermédiaire` });
  } else if (intermediate && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = Math.min(score, 60);
    reasons.push({ type: 'warn', text: `un ultra de ${distanceKm}km en intermédiaire : la gestion de l'effort sera clé` });
  }

  // Débutant + marathon < 12 semaines
  if (beginner && isMarathon && planWeeks < 12) {
    score = Math.min(score, 40);
    reasons.push({ type: 'risk', text: `marathon débutant en ${planWeeks} semaines : minimum 16-20 semaines recommandées` });
  }

  // Préparation courte (route)
  if (isSemi && planWeeks < 8) { score -= 15; reasons.push({ type: 'warn', text: `${planWeeks} semaines pour un semi-marathon, c'est court — 8 à 12 semaines recommandées` }); }
  if (isMarathon && planWeeks < 12) { score -= 20; reasons.push({ type: 'risk', text: `${planWeeks} semaines pour un marathon, c'est insuffisant — 12 à 16 semaines minimum` }); }

  // Trail : préparation trop courte
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 60 && planWeeks < 20) {
      score -= 25;
      if (planWeeks < 12) score -= 15;
      reasons.push({ type: 'risk', text: `${planWeeks} semaines pour un ultra de ${distanceKm}km est dangereux — 20+ semaines sont nécessaires` });
    } else if (distanceKm >= 42 && planWeeks < 16) {
      score -= 20;
      if (planWeeks < 10) score -= 15;
      reasons.push({ type: 'risk', text: `${planWeeks} semaines pour un trail de ${distanceKm}km, c'est court — 16 à 20 semaines idéalement` });
    } else if (distanceKm >= 30 && planWeeks < 12) {
      score -= 15;
      if (planWeeks < 8) score -= 10;
      reasons.push({ type: 'warn', text: `${planWeeks} semaines pour un trail de ${distanceKm}km : 12 à 16 semaines recommandées` });
    } else if (distanceKm >= 15 && planWeeks < 8) {
      score -= 10;
      reasons.push({ type: 'warn', text: `${planWeeks} semaines pour un trail de ${distanceKm}km est un peu juste` });
    }
  }

  // Volume insuffisant
  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) { score -= 20; reasons.push({ type: 'risk', text: `volume actuel de ${currentVolume}km/sem insuffisant pour un marathon (30km/sem minimum)` }); }
    else if (isSemi && currentVolume < 20) { score -= 15; reasons.push({ type: 'warn', text: `volume actuel de ${currentVolume}km/sem un peu faible pour un semi (20km/sem minimum)` }); }
  }

  // Trail long avec peu de volume
  if (isTrail && distanceKm !== null && distanceKm > 42 && (currentVolume ?? 0) < 40) {
    score -= 20;
    if ((currentVolume ?? 0) === 0) {
      reasons.push({ type: 'risk', text: `aucun volume hebdomadaire déclaré pour un trail de ${distanceKm}km — la montée en charge sera très importante` });
    } else {
      reasons.push({ type: 'risk', text: `volume actuel de ${currentVolume}km/sem insuffisant pour un trail de ${distanceKm}km (40km/sem recommandés)` });
    }
  }

  // Trail moyen (15-42km) avec peu de volume
  if (isTrail && distanceKm !== null && distanceKm >= 15 && distanceKm <= 42) {
    if ((currentVolume ?? 0) === 0) {
      score -= 15;
      reasons.push({ type: 'risk', text: `aucun volume hebdomadaire déclaré : la progression devra être très prudente` });
    } else if ((currentVolume ?? 0) < 20) {
      score -= 10;
      reasons.push({ type: 'warn', text: `volume actuel de ${currentVolume}km/sem un peu faible pour cette distance` });
    }
  }

  // Trail elevation analysis
  if (isTrail && params.trailElevation && params.trailDistance) {
    const ratio = params.trailElevation / params.trailDistance;

    if (ratio > 80 && beginner) {
      score -= 15;
      reasons.push({ type: 'risk', text: `ratio D+/km de ${trailRatio}m/km très élevé pour un débutant — terrain très exigeant` });
    } else if (ratio > 100) {
      score -= 10;
      reasons.push({ type: 'warn', text: `ratio D+/km de ${trailRatio}m/km extrême — la gestion en montée sera déterminante` });
    } else if (ratio > 60 && trailElev > 0) {
      reasons.push({ type: 'warn', text: `${trailRatio}m D+/km : terrain vallonné, la gestion des montées comptera` });
    }

    // Ultra trail tier penalties
    if (params.trailDistance >= 100 && planWeeks < 16) {
      score -= 20;
    } else if (params.trailDistance >= 80 && planWeeks < 14) {
      score -= 15;
    }

    // Current weekly elevation vs race elevation gap
    if (currentElev > 0 && params.trailElevation > 0) {
      if (currentElev < params.trailElevation * 0.15) {
        score -= 20;
        reasons.push({ type: 'risk', text: `ton D+ hebdo actuel (${currentElev}m) est très loin des ${params.trailElevation}m de la course — gros travail à faire` });
      } else if (currentElev < params.trailElevation * 0.25) {
        score -= 10;
        reasons.push({ type: 'warn', text: `ton D+ hebdo actuel (${currentElev}m) est bas par rapport aux ${params.trailElevation}m de la course` });
      }
    } else if (currentElev === 0 && params.trailElevation > 0) {
      if (params.trailElevation >= 1500) {
        score -= 20;
        reasons.push({ type: 'risk', text: `aucun entraînement en D+ pour ${params.trailElevation}m de dénivelé — intègre du D+ progressivement dès le début` });
      } else if (params.trailElevation >= 500) {
        score -= 12;
        reasons.push({ type: 'warn', text: `pas d'entraînement en D+ actuellement pour ${params.trailElevation}m de dénivelé — à travailler` });
      } else {
        score -= 5;
      }
    }
  }

  if (hasInjury) { score -= 10; reasons.push({ type: 'warn', text: `blessure déclarée : adapte les séances et consulte un professionnel de santé` }); }

  // IMC → risque articulaire
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) {
      score -= 25;
      reasons.push({ type: 'risk', text: `ton IMC (${bmi.toFixed(1)}) indique un risque articulaire élevé — consulte un médecin avant de démarrer, privilégie les surfaces souples et le cross-training (vélo, natation)` });
    } else if (bmi >= 30) {
      score -= 15;
      reasons.push({ type: 'warn', text: `ton IMC (${bmi.toFixed(1)}) augmente le risque articulaire — consulte un médecin, privilégie un bon amorti et des surfaces souples` });
    } else if (bmi >= 25 && (isMarathon || (isTrail && distanceKm !== null && distanceKm >= 30))) {
      score -= 5;
      reasons.push({ type: 'warn', text: `avec un IMC de ${bmi.toFixed(1)}, investis dans de bonnes chaussures avec amorti pour cette distance` });
    }
  }

  // VMA estimée (pas de chrono) → confiance réduite sur l'évaluation
  if (!params.hasChrono) {
    score -= 10;
    reasons.push({ type: 'warn', text: `VMA estimée (pas de chrono validé) : l'évaluation comporte une marge d'incertitude` });
  }

  // Bonus : volume courant élevé par rapport à la distance
  // MAIS pas si on a déjà un warn/risk sur le volume (sinon contradiction dans le message)
  const hasVolumeWarn = reasons.some(r => (r.type === 'warn' || r.type === 'risk') && r.text.includes('volume'));
  if (currentVolume !== undefined && currentVolume > 0 && distanceKm !== null && !hasVolumeWarn) {
    if (currentVolume >= distanceKm * 0.50) {
      score += 15;
      reasons.push({ type: 'good', text: `ton volume actuel de ${currentVolume}km/sem est une excellente base pour cette distance` });
    } else if (currentVolume >= distanceKm * 0.30) {
      score += 8;
      reasons.push({ type: 'good', text: `ton volume actuel de ${currentVolume}km/sem est un bon point de départ` });
    }
  }

  // Bonus : prep longue et volume élevé
  if (!beginner && planWeeks >= 16 && (currentVolume ?? 0) >= 40) {
    score += 5;
    reasons.push({ type: 'good', text: `${planWeeks} semaines de préparation avec un bon volume : conditions favorables` });
  }

  // Avertissement fréquence insuffisante pour un plan long
  const frequency = params.frequency;
  if (frequency && planWeeks && planWeeks > 16 && frequency <= 3) {
    reasons.push({ type: 'warn', text: `avec ${frequency} séances/semaine sur ${planWeeks} semaines, chaque séance sera très chargée en volume — passer à 4 séances rendrait le plan plus équilibré` });
  }

  // Avertissement volume < minimum viable par niveau
  if (currentVolume !== undefined && currentVolume > 0) {
    const minStartByLevel: Record<string, number> = {
      'Débutant (0-1 an)': 8, 'Intermédiaire (Régulier)': 15,
      'Confirmé (Compétition)': 20, 'Expert (Performance)': 25,
    };
    const minStart = Object.entries(minStartByLevel).find(([k]) => (level || '').includes(k))?.[1] || 15;
    if (currentVolume < minStart) {
      reasons.push({ type: 'warn', text: `ton volume actuel (${currentVolume} km/sem) est en dessous du minimum pour ton niveau (${minStart} km/sem) — le plan démarrera légèrement au-dessus` });
    }
  }

  score = clamp(score, 10, 100);
  status = resolveStatus(score);

  // -----------------------------------------------------------------------
  // Construction du message personnalisé à partir des raisons trackées
  // -----------------------------------------------------------------------
  const riskReasons = reasons.filter(r => r.type === 'risk');
  const warnReasons = reasons.filter(r => r.type === 'warn');
  const goodReasons = reasons.filter(r => r.type === 'good');

  let message: string;

  // Intro contextualisée
  const goalLower = params.goal.toLowerCase();
  const isPertePoids = goalLower.includes('perte');
  const isMaintien = goalLower.includes('maintien') || goalLower.includes('remise');
  const isNonRace = isPertePoids || isMaintien;

  const distLabel = isNonRace
    ? (isPertePoids ? 'programme perte de poids' : 'programme remise en forme')
    : isTrail && distanceKm
      ? `trail de ${distanceKm}km${trailElev > 0 ? ` / ${trailElev}m D+` : ''}`
      : isMarathon ? 'marathon' : isSemi ? 'semi-marathon' : distanceKm ? `${distanceKm}km` : 'cette course';

  if (isNonRace) {
    // Messages spécifiques pour objectifs non-compétitifs
    if (status === 'EXCELLENT' || status === 'BON') {
      message = `Ton ${distLabel} sur ${planWeeks} semaines est bien calibré pour ton profil. Avec ta VMA de ${vma.toFixed(1)} km/h, concentre-toi sur la régularité et le plaisir.`;
    } else {
      message = `Ton ${distLabel} est ambitieux mais faisable. Sois progressif et écoute ton corps.`;
    }
  } else if (status === 'EXCELLENT') {
    message = `Ton profil est très bien adapté à ce ${distLabel}. Avec ta VMA de ${vma.toFixed(1)} km/h et ${planWeeks} semaines de préparation, les conditions sont réunies pour une belle course.`;
  } else if (status === 'BON') {
    message = `Ton objectif de finisher sur ce ${distLabel} est tout à fait atteignable. Avec ta VMA de ${vma.toFixed(1)} km/h, concentre-toi sur la régularité.`;
  } else if (status === 'AMBITIEUX') {
    message = `Ce ${distLabel} est un beau défi. Avec ta VMA de ${vma.toFixed(1)} km/h, c'est faisable mais attention :`;
  } else if (status === 'RISQUÉ') {
    message = `Ce ${distLabel} présente des risques sérieux dans ta configuration actuelle.`;
  } else {
    message = `Ce ${distLabel} n'est pas réaliste dans les conditions actuelles.`;
  }

  // Ajouter les raisons selon le status
  if (riskReasons.length > 0) {
    message += ' ' + riskReasons.map(r => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join('. ') + '.';
  }
  if (warnReasons.length > 0 && (status !== 'EXCELLENT')) {
    // En status BON, ne montrer qu'un warning max pour ne pas alarmer
    const showWarns = status === 'BON' ? warnReasons.slice(0, 1) : warnReasons;
    message += ' ' + showWarns.map(r => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join('. ') + '.';
  }
  if (goodReasons.length > 0 && riskReasons.length > 0) {
    // Quand il y a des risques, montrer aussi les points positifs pour nuancer
    message += ' Point positif : ' + goodReasons.map(r => r.text).join(', ') + '.';
  } else if (goodReasons.length > 0 && status === 'BON') {
    message += ' ' + goodReasons.map(r => r.text.charAt(0).toUpperCase() + r.text.slice(1)).join('. ') + '.';
  }

  // Conseil final adapté
  if (status === 'RISQUÉ' || status === 'IRRÉALISTE') {
    if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
      message += ` Nous te recommandons de viser un trail de 20-25km d'abord pour acquérir l'expérience nécessaire.`;
    } else {
      message += ` Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan si nécessaire.`;
    }
  } else if (status === 'AMBITIEUX') {
    message += ` Suis le plan avec rigueur et régularité, c'est la clé pour y arriver.`;
  }

  const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height);

  // Recommendation intelligente pour le modal de warning (finisher = pas de temps cible)
  // Priorité : 1) allonger la prépa  2) passer en objectif finisher (déjà le cas)  3) dernier recours = distance
  let recommendation: string | undefined;
  if (status === 'RISQUÉ' || status === 'IRRÉALISTE') {
    // D'abord vérifier si la durée de prépa est le problème principal
    if (isTrail && distanceKm !== null && distanceKm >= 100 && planWeeks < 20) {
      recommendation = `une durée de préparation d'au moins 20 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 60 && planWeeks < 16) {
      recommendation = `une durée de préparation d'au moins 16 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 42 && planWeeks < 12) {
      recommendation = `une durée de préparation d'au moins 12 semaines`;
    } else if (isMarathon && planWeeks < 12) {
      recommendation = `une durée de préparation d'au moins 16 semaines`;
    } else if (isSemi && planWeeks < 8) {
      recommendation = `une durée de préparation d'au moins 10 semaines`;
    } else if (isTrail && distanceKm !== null && distanceKm >= 15 && planWeeks < 8) {
      recommendation = `une durée de préparation d'au moins 10 semaines`;
    } else {
      // Dernier recours : changer de distance (seulement cas extrêmes comme débutant + ultra)
      if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
        recommendation = `un trail plus court (20-30km) pour acquérir l'expérience`;
      } else if (beginner && isMarathon) {
        recommendation = `un semi-marathon comme première expérience longue distance`;
      } else {
        recommendation = `un objectif adapté à ton profil actuel`;
      }
    }
  }

  return { score, status, message, safetyWarning, recommendation };
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
  isTrail?: boolean,
  trailElevation?: number,
  level?: string,
): string {
  // Label adapté : pour le trail, mentionner distance + D+
  const distanceLabel = isTrail && trailElevation
    ? `${distanceKm}km avec ${trailElevation}m D+`
    : distanceKm <= 5 ? '5km'
    : distanceKm <= 10 ? '10km'
    : distanceKm <= 21.1 ? 'semi-marathon'
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
    // Si la VMA nécessaire est inférieure à la VMA actuelle, l'objectif est en réalité confortable
    // mais le score a été capé (ex: pas de chrono). Le message doit refléter ça.
    if (vmaNeeded < vma) {
      parts.push(`Ton objectif de ${targetFormatted} est a priori confortable par rapport à ton temps théorique de ${theoFormatted}.`);
      if (!hasChrono) {
        parts.push(`Cependant, ta VMA est estimée (pas de chrono validé), ce qui ajoute une marge d'incertitude à cette évaluation.`);
      }
    } else {
      parts.push(
        `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. C'est un écart significatif par rapport à ton niveau actuel.`
      );
      parts.push(`Ce plan te fera progresser, mais un objectif autour de ${theoFormatted} serait plus réaliste pour cette préparation.`);
    }
  } else {
    // RISQUÉ
    if (vmaNeeded < vma) {
      parts.push(`Ton objectif de ${targetFormatted} semble confortable, mais des facteurs de risque limitent la confiance dans cette évaluation.`);
    } else {
      parts.push(
        `Viser ${targetFormatted} demande une VMA d'environ ${vmaNeeded.toFixed(1)} km/h. L'écart avec ton niveau actuel (${vma.toFixed(1)} km/h) est très important.`
      );
    }
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

  // Avertissements supplémentaires (seulement si pas déjà mentionné)
  const alreadyMentionedChrono = parts.some(p => p.includes('VMA est estimée'));
  if (!hasChrono && !alreadyMentionedChrono) {
    parts.push(`Note : ta VMA est estimée (pas de chrono de référence), l'évaluation comporte donc une marge d'incertitude.`);
  }

  if (isMarathon && planWeeks < 12 && !beginner) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une préparation marathon optimale. Le plan sera condensé.`);
  }

  if (isSemi && planWeeks < 8) {
    parts.push(`Attention : ${planWeeks} semaines, c'est court pour une préparation semi-marathon. Le plan sera condensé.`);
  }

  if (currentVolume !== undefined && currentVolume > 0) {
    const distDesc = isTrail ? `un trail de ${distanceKm}km` : isMarathon ? 'un marathon' : 'un semi';
    if (isMarathon && currentVolume < 30) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour ${distDesc}. La montée en charge sera progressive mais exigeante.`);
    } else if (isSemi && currentVolume < 20) {
      parts.push(`Ton volume actuel (${currentVolume} km/sem) est bas pour ${distDesc}. La montée en charge sera progressive.`);
    }

    // Avertissement si le volume déclaré est inférieur au minimum viable par niveau
    // (le plan démarrera au-dessus du volume actuel pour garantir la progression)
    const minStartByLevel: Record<string, number> = {
      'Débutant (0-1 an)': 8, 'Intermédiaire (Régulier)': 15,
      'Confirmé (Compétition)': 20, 'Expert (Performance)': 25,
    };
    const minStart = Object.entries(minStartByLevel).find(([k]) => (level || '').includes(k))?.[1] || 15;
    if (currentVolume < minStart) {
      parts.push(`Note : ton volume actuel (${currentVolume} km/sem) est en dessous du minimum pour ton niveau (${minStart} km/sem). Le plan démarrera légèrement au-dessus pour garantir une progression cohérente.`);
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
  if (score > 10) return 'RISQUÉ';
  return 'IRRÉALISTE';
}
