/**
 * Service de calcul de faisabilité — Évaluation déterministe
 * Remplace les ~64 lignes de règles de faisabilité qui étaient dans le prompt Gemini.
 * Produit une évaluation concrète, honnête, avec des chiffres, sans appel IA.
 */
import { calculateWeekTargetElevation } from './planUtils';

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
  injuryDescription?: string; // texte libre saisi par l'utilisateur (utilisé pour détecter les drapeaux rouges médicaux)
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
 * Détecte un "drapeau rouge médical" dans une description de blessure :
 * fracture, douleur osseuse, ostéonécrose, etc. → nécessitent imagerie + avis médical
 * AVANT tout démarrage de plan. Renvoie true si match.
 */
const MEDICAL_RED_FLAGS_RE = /douleur osseuse|fracture|fissure|œdème osseux|stress fracture|ostéonécrose|hernie discale|sciatique aigu/i;
export function hasMedicalRedFlag(injuryDescription?: string): boolean {
  if (!injuryDescription) return false;
  return MEDICAL_RED_FLAGS_RE.test(injuryDescription);
}

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
  // Bug fix 2026-05-18 : arrondir le total AVANT split (ex 179.7 min → 180 → "3h00"
  // au lieu de "2h60min" qui apparaissait avant car floor(2.995)=2 + round(59.7)=60).
  if (minutes >= 60) {
    const totalMin = Math.round(minutes);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  // Idem pour mm:ss : convertir en secondes total, arrondir, puis split (évite "22:60")
  const totalSec = Math.round(minutes * 60);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
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

// ═══════════════════════════════════════════════════════════════════════════
// R2 — Gates feasibility trail + saut volume + Expert non validé
// ═══════════════════════════════════════════════════════════════════════════
// Validé par PM 30 ans + dev senior + expert trail (UTMB Academy).
// Helper unique appelé à la fin des 2 fonctions feasibility (calculate +
// buildFinisher) juste avant le clamp final. Retourne :
//   - irrealisticCap : si défini, force score ≤ ce cap + status IRRÉALISTE
//   - scorePenalty : pénalité additive cumulée
//   - reasons : liste des raisons (pour message si besoin)
// ─── Feature flag : R2_GATES_ENABLED ───
// Pilotable via env var VITE_R2_GATES_ENABLED. Default ON.
// Kill switch en prod : set VITE_R2_GATES_ENABLED=false + redeploy (~30s).

const R2_GATES_ENABLED = import.meta.env.VITE_R2_GATES_ENABLED !== 'false';

interface R2Context {
  isTrail: boolean;
  distanceKm: number | null;
  raceDplus: number;          // D+ course trail (0 si pas trail)
  planWeeks: number;
  currentVolume: number;      // km/sem actuel (0 si non déclaré)
  currentElev: number;        // D+/sem actuel (0 si non déclaré)
  s1Volume: number;           // Volume cible S1 (premier élément weeklyVolumes)
  totalDplusCycle: number;    // Somme D+ cible cycle (calculée via calculateWeekTargetElevation)
  level: string;
  hasChrono: boolean;
}

function applyR2Gates(ctx: R2Context): { irrealisticCap?: number; scorePenalty: number; reasons: string[] } {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons: string[] = [];
  let scorePenalty = 0;
  let irrealisticCap: number | undefined;

  // ─── Trail gates (règles 1, 2, 3) ───
  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    // Modulation par distance trail (validé expert trail)
    const isCourt = ctx.distanceKm < 30;
    const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
    const isUltra = ctx.distanceKm >= 60;

    // Règle 1 — Total D+ cycle insuffisant
    // ARBITRAGE EXPERT TRAIL (UTMB Academy) + PM : formule originale
    // (coef × race × N_weeks) imposait mathématiquement impossible pour ultra
    // long (UTMB 170/10000 = 150 000m cycle exigé, infaisable même Expert pro).
    // Doctrine UTMB Academy : D+ cycle = 3-5× race D+ (pas 0.5×N).
    // Formule patchée : min = race_dplus × multiplier selon distance.
    //   5-20 km : 5× | 20-50 km : 4× | 50-100 km : 3.5× | 100+ km : 3×
    // Pour Peterson 50/3500 11sem : min = 3500×3.5 = 12 250m (vs projetté 6000) → IRR via gate 1
    // Pour UTMB 170/10000 30sem Expert : min = 10000×3 = 30 000m (vs 75 000 projeté) → PASS
    // Pour Valentine 20/1000 7sem : min = 1000×4 = 4 000m (vs 4 640 projeté) → PASS
    const r1Multiplier = ctx.distanceKm < 20 ? 5
      : ctx.distanceKm < 50 ? 4
      : ctx.distanceKm < 100 ? 3.5
      : 3;
    const r1Min = r1Multiplier * ctx.raceDplus;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle projeté ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m (${r1Multiplier}× race D+, doctrine UTMB Academy)`);
    }

    // Règle 2 — Ratio D+ actuel/race trop élevé
    // Seuils expert : >15 vigilance, >25 AMBITIEUX, >40 IRRÉALISTE
    if (ctx.currentElev > 0) {
      const ratioDplus = ctx.raceDplus / ctx.currentElev;
      if (ratioDplus > 40) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}× > 40 (hors fenêtre prép)`);
      } else if (ratioDplus > 25) {
        scorePenalty += 25; // AMBITIEUX
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}× > 25 (ambitieux)`);
      } else if (ratioDplus > 15) {
        scorePenalty += 10;
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}× > 15 (vigilance)`);
      }
    }
    // Cas particulier : pas de D+ déclaré + race avec D+ → traiter comme "très loin"
    else if (ctx.raceDplus >= 500) {
      scorePenalty += 15;
      reasons.push(`D+ hebdo actuel non déclaré pour course ${ctx.raceDplus}m D+`);
    }

    // Règle 3 — Ratio vol actuel/race trop bas (modulé par distance)
    if (ctx.currentVolume > 0) {
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const seuils = isCourt ? { irr: 0.50, amb: 0.65 } : isMoyen ? { irr: 0.40, amb: 0.50 } : { irr: 0.30, amb: 0.40 };
      if (ratioVol < seuils.irr) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem trop faible vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.irr})`);
      } else if (ratioVol < seuils.amb) {
        scorePenalty += 20;
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem juste vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.amb})`);
      }
    }
  }

  // ─── Règle 4 — Cap saut volume S0→S1 (toutes distances) ───
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sautPct > 0.50 || sautAbs > 15) {
      irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
      reasons.push(`Saut S0→S1 trop violent : ${ctx.currentVolume}km → ${ctx.s1Volume}km (${(sautPct*100).toFixed(0)}%, +${sautAbs}km)`);
    } else if (sautPct > 0.30) {
      scorePenalty += 10;
      reasons.push(`Saut S0→S1 limite : ${ctx.currentVolume}km → ${ctx.s1Volume}km (+${(sautPct*100).toFixed(0)}%)`);
    }
  }

  // ─── Règle 6 — "Expert" non validé (doctrine : pénaliser + warning, PAS écraser) ───
  // BUG 3 FIX : .includes('Expert') au lieu de === strict (cohérence avec
  // renfoService.ts:223, planValidator.ts:85 du codebase)
  if (ctx.level.includes('Expert') && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push(`Niveau "Expert" déclaré mais aucun chrono validé + volume ${ctx.currentVolume}km/sem (< 40 attendu pour Expert)`);
  }

  return { irrealisticCap, scorePenalty, reasons };
}

// ---------------------------------------------------------------------------
// Garde-fou : durée minimum saine pour un Débutant complètement sédentaire
// (volume actuel 0 km/sem). Cf. validation expert coach (Pfitzinger/Daniels/
// Hudson, 40 ans XP) — adaptations ostéo-tendineuses requièrent 8-16 sem
// minimum, règle Tim Noakes +10%/sem borne mathématiquement les minimums.
// Ces minimums sont des PLANCHERS DE SÉCURITÉ, pas des recommandations idéales.
// ---------------------------------------------------------------------------
function getMinimumWeeksForBeginnerVolZero(
  distanceKm: number | null,
  isTrail: boolean,
  bmi: number | null,
  age: number | undefined,
  hasInjury: boolean
): number {
  // Base par distance
  let minWeeks: number;
  if (distanceKm === null) {
    minWeeks = 12; // défaut prudent si distance non standard
  } else if (isTrail) {
    if (distanceKm >= 60) minWeeks = 52;       // ultra : 12 mois mini
    else if (distanceKm >= 30) minWeeks = 36;  // trail long : 9 mois
    else if (distanceKm >= 15) minWeeks = 22;  // trail moyen
    else minWeeks = 12;                         // trail court (< 15 km)
  } else {
    if (distanceKm >= 42) minWeeks = 30;       // marathon : 7 mois
    else if (distanceKm >= 21) minWeeks = 20;  // semi
    else if (distanceKm >= 10) minWeeks = 14;  // 10 km
    else minWeeks = 10;                         // 5 km
  }
  // Modulations cumulables, plafonnées à +8 sem
  let modulations = 0;
  if (bmi !== null && bmi >= 30) modulations += 4;    // obésité classe 1+
  if (age !== undefined && age >= 50) modulations += 2; // senior
  if (hasInjury) modulations += 4;                    // blessure déclarée
  modulations = Math.min(modulations, 8);
  return minWeeks + modulations;
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
    const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, 'IRRÉALISTE', params.weight, params.height, params.age, isTrail, isMarathon || isSemi || (distanceKm !== null && distanceKm >= 21));

    return {
      score: 5,
      status: 'IRRÉALISTE',
      message: `Ton objectif de ${formatTime(targetMinutes)} sur ${distance} nécessiterait une VMA de ${vmaNeededForTarget.toFixed(1)} km/h, soit ${vmaRatioPercent}% de ta VMA actuelle (${vma.toFixed(1)} km/h). Même avec une progression optimale, cet écart est trop important. Ton temps théorique est de ${theoFormatted}. Un objectif réaliste serait autour de ${alternativeTarget}.`,
      safetyWarning,
      alternativeTarget,
      recommendation: `un temps cible de ${alternativeTarget}`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fix C — Seuils %VMA tenu sur distance (Daniels VDOT + Pfitzinger seuil
  // lactique). Cause racine bug mxjulien02 : la gate `vmaRatioPercent >= 130`
  // ci-dessus est asymétrique (utilise getVmaFactor) — un Semi à 97.7% VMA
  // tenu passait à travers (114.9% du ratio) alors qu'il est physiologiquement
  // IRRÉALISTE de tenir 97.7% VMA sur 21 km.
  //
  // Seuils absolus validés coach 15 ans (VALIDATION-COACH-AVANT-DEPLOY.md
  // élément C) :
  //   Distance    AMBITIEUX >   IRRÉALISTE >
  //   5K          93% VMA       98% VMA
  //   10K         90%           95%
  //   Semi        88%           93%
  //   Marathon    83%           88%
  //   Ultra       78%           85%
  //
  // - IRRÉALISTE (strict) : retour anticipé avec message %VMA tenu explicite.
  // - AMBITIEUX : on retient un cap score 60 appliqué APRÈS les pénalités,
  //   juste avant le clamp final (cf. ligne ~720).
  // ─────────────────────────────────────────────────────────────────────────
  const requiredSpeedKmh = effectiveDistanceKm / (targetMinutes / 60);
  const pctVmaTenu = requiredSpeedKmh / vma;
  const distanceThresholds = (() => {
    const d = effectiveDistanceKm;
    if (d <= 5.5)   return { ambitious: 0.93, unrealistic: 0.98, label: '5 km' };
    if (d <= 11)    return { ambitious: 0.90, unrealistic: 0.95, label: '10 km' };
    if (d <= 22)    return { ambitious: 0.88, unrealistic: 0.93, label: 'semi-marathon' };
    if (d <= 43)    return { ambitious: 0.83, unrealistic: 0.88, label: 'marathon' };
    // Ultra (> 43 km) : seuils plus conservatifs
    return { ambitious: 0.78, unrealistic: 0.85, label: `${Math.round(d)} km` };
  })();

  if (pctVmaTenu > distanceThresholds.unrealistic) {
    const theoFormatted = formatTime(theoMinutes);
    const realisticMinutes = theoMinutes * 1.05;
    const alternativeTarget = formatTime(realisticMinutes);
    const pctVmaPercent = Math.round(pctVmaTenu * 100);
    const seuilUnreal = Math.round(distanceThresholds.unrealistic * 100);
    const safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, 'IRRÉALISTE', params.weight, params.height, params.age, isTrail, isMarathon || isSemi || (distanceKm !== null && distanceKm >= 21));
    return {
      score: 5,
      status: 'IRRÉALISTE',
      message: `Ton objectif de ${formatTime(targetMinutes)} sur ${distance} demande de tenir ${pctVmaPercent}% de ta VMA (${vma.toFixed(1)} km/h) pendant toute la course. Sur ${distanceThresholds.label}, le seuil physiologiquement soutenable est d'environ ${seuilUnreal}% VMA (référence Daniels VDOT + Pfitzinger). Au-delà, même un coureur entraîné ne peut maintenir cette intensité. Ton temps théorique est de ${theoFormatted}. Un objectif réaliste serait autour de ${alternativeTarget}.`,
      safetyWarning,
      alternativeTarget,
      recommendation: `un temps cible de ${alternativeTarget}`,
    };
  }

  // Cap "AMBITIEUX" — retenu et appliqué après les autres pénalités, avant le clamp final.
  const vmaThresholdAmbitiousCap = pctVmaTenu > distanceThresholds.ambitious ? 60 : undefined;

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
    // Note: pas de reasons.push ici — cette fonction calculateFeasibility n'a pas la liste reasons[]
    // (qui existe uniquement dans buildFinisherFeasibility). La pénalité de score suffit.
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

  // Trail : pénalité durée (même avec temps cible)
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) {
      score -= 25;
    } else if (distanceKm >= 60 && planWeeks < 14) {
      score -= 20;
    } else if (distanceKm >= 42 && planWeeks < 12) {
      score -= 15;
    } else if (distanceKm >= 30 && planWeeks < 8) {
      score -= 10;
    }
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

  // Drapeau rouge médical (fracture / douleur osseuse / etc.) → forcer score ≤ 25 (= RISQUÉ)
  // Déclenche la modal de validation utilisateur lors du déploiement du plan complet.
  if (hasMedicalRedFlag(params.injuryDescription)) {
    score = Math.min(score, 25);
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
    } else if (bmi >= 27) {
      // Surpoids significatif : risque articulaire toutes distances
      score -= isMarathon ? 10 : isSemi ? 7 : 3;
    } else if (bmi >= 25) {
      // Surpoids léger : risque modéré sur longue distance uniquement
      score -= isMarathon ? 5 : isSemi ? 3 : 0;
    }
  }

  // Cumul facteurs de risque : IMC + senior + débutant + blessure
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    const isSeniorAge = params.age !== undefined && params.age >= 45;
    const isBmiHigh = bmi >= 30;
    const hasInjuryFlag = hasInjury;
    // Cumul 3 facteurs : très risqué
    if (isBmiHigh && isSeniorAge && beginner) {
      score -= 25;
    }
    // Cumul 2 facteurs avec blessure : avis médical obligatoire
    else if (isBmiHigh && hasInjuryFlag) {
      score -= 15;
    }
    else if (isSeniorAge && beginner && hasInjuryFlag) {
      score -= 15;
    }
  }

  // Ultra 100km+ : pénalités spécifiques (même avec temps cible)
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if (currentVolume !== undefined && currentVolume < 50) {
      score -= 15;
    }
    if (params.frequency && params.frequency < 5) {
      score -= 15;
    }
    if (!hasChrono) {
      score -= 10;
    }
  }

  // -----------------------------------------------------------------------
  // GARDE-FOU DÉBUTANT + VOL 0 : durée minimum saine par distance
  // Cf. getMinimumWeeksForBeginnerVolZero(). Surclasse les autres calculs
  // si l'utilisateur est dans la zone dangereuse (adaptation tendineuse
  // insuffisante quel que soit le score). Cas Aureline 1778575564571.
  // -----------------------------------------------------------------------
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0
      ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) {
      score = Math.min(score, 15);
    } else if (planWeeks < minRequired * 1.2) {
      score = Math.min(score, 30);
    }
  }

  // -----------------------------------------------------------------------
  // R2 — Gates feasibility trail + saut volume + Expert non validé
  // Helper applyR2Gates (cf. début fichier). Cas Peterson/Valentine.
  // Recalcule totalDplusCycle à la volée (sum sur N semaines via
  // calculateWeekTargetElevation, sans phase = pic max).
  // -----------------------------------------------------------------------
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      // Phase=undefined → pas de réduction (estimation conservative haute)
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, undefined);
    }
  }
  // Estimation S1 = première semaine projetée (recommandation testeur QA).
  // BUG 1 FIX : avant on prenait currentVolume → saut S0→S1 toujours 0 → règle 4 morte.
  // Maintenant : si vol actuel déclaré → S1 ≈ vol actuel × 1.10 (rampe douce typique)
  // Si vol actuel = 0 → S1 ≈ 30% du vol pic théorique selon distance/objectif.
  const peakVolEstimate = distanceKm
    ? (isMarathon ? 60 : isSemi ? 45 : isTrail && distanceKm >= 60 ? 70
      : isTrail && distanceKm >= 30 ? 55 : 35)
    : 35;
  const s1VolEstimate = currentVolume && currentVolume > 0
    ? Math.round(currentVolume * 1.10)
    : Math.round(peakVolEstimate * 0.30);
  const r2 = applyR2Gates({
    isTrail,
    distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimate,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || '',
    hasChrono: params.hasChrono,
  });
  if (r2.reasons.length > 0) {
    console.debug(`[R2 Gates] reasons:`, r2.reasons);
  }
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) {
    score = Math.min(score, r2.irrealisticCap);
  }

  // ─── Fix C — Cap AMBITIEUX %VMA tenu (cf. bloc seuils ci-dessus) ───
  // Appliqué APRÈS toutes les pénalités, JUSTE avant le clamp final.
  // Force le status à AMBITIEUX (cap 60) si l'objectif demande de tenir une
  // intensité au-dessus du seuil "ambitious" mais en-dessous du seuil
  // "unrealistic" pour la distance. Ne JAMAIS remonter un score plus bas.
  if (vmaThresholdAmbitiousCap !== undefined) {
    score = Math.min(score, vmaThresholdAmbitiousCap);
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

  let safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height, params.age, isTrail, isMarathon || isSemi || (distanceKm !== null && distanceKm >= 21));

  // Warning plans trop longs pour le profil
  const maxRecommendedWeeks = isMarathon ? 20 : isSemi ? 18 : isTrail ? 20 : 14;
  if (planWeeks > maxRecommendedWeeks && !beginner) {
    const longPlanWarning = `⚠️ DURÉE DU PLAN : ${planWeeks} semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en ${maxRecommendedWeeks} semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.`;
    safetyWarning = safetyWarning ? `${safetyWarning}\n\n${longPlanWarning}` : longPlanWarning;
  }

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
    if (distanceKm >= 100 && planWeeks < 20) {
      score -= 40; // Ultra 100km+ en < 20 sem : pénalité sévère
      if (planWeeks < 16) score -= 20;
      reasons.push({ type: 'risk', text: `${planWeeks} semaines pour un ultra de ${distanceKm}km est très dangereux — 20-24 semaines sont le strict minimum` });
    } else if (distanceKm >= 60 && planWeeks < 20) {
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

  // Trail : D+ course vs D+ hebdo actuel — risque musculaire excentrique
  if (isTrail && trailElev > 0 && currentElev > 0) {
    const dPlusRatio = trailElev / currentElev;
    if (dPlusRatio >= 3) {
      score -= 20;
      reasons.push({ type: 'risk', text: `le D+ de la course (${trailElev}m) est ${dPlusRatio.toFixed(1)}x ton D+ hebdomadaire actuel (${currentElev}m/sem) — risque musculaire très élevé en descente, impossible de construire la résistance excentrique nécessaire en ${planWeeks} semaines` });
    } else if (dPlusRatio >= 2) {
      score -= 10;
      reasons.push({ type: 'warn', text: `le D+ de la course (${trailElev}m) est ${dPlusRatio.toFixed(1)}x ton D+ hebdomadaire actuel (${currentElev}m/sem) — renforce le travail excentrique (descentes, squats excentriques)` });
    }
  } else if (isTrail && trailElev >= 2000 && currentElev === 0) {
    score -= 15;
    reasons.push({ type: 'risk', text: `${trailElev}m de D+ en course sans volume de D+ hebdomadaire déclaré — la préparation musculaire en descente sera critique` });
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

  // Ultra 100km+ : pénalités spécifiques
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    // Volume minimal pour ultra 100km+ = 50km/sem
    if ((currentVolume ?? 0) < 50) {
      score -= 15;
      reasons.push({ type: 'risk', text: `volume actuel de ${currentVolume || 0}km/sem bas pour un ultra de ${distanceKm}km (50km/sem+ recommandés)` });
    }
    // Fréquence trop basse pour ultra
    if (params.frequency && params.frequency < 5) {
      score -= 15;
      reasons.push({ type: 'risk', text: `${params.frequency} séances/semaine est insuffisant pour un ultra de ${distanceKm}km — 5-6 séances recommandées pour atteindre le volume nécessaire` });
    }
    // VMA estimée sur ultra = risque accru (allures incertaines sur très longue distance)
    if (!params.hasChrono) {
      score -= 10;
      reasons.push({ type: 'warn', text: `VMA estimée sur un ultra de ${distanceKm}km : les allures sont incertaines, valide avec un chrono (10km, semi) pour plus de fiabilité` });
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

  // Drapeau rouge médical : cap score 25 (= RISQUÉ) + reason explicite
  if (hasMedicalRedFlag(params.injuryDescription)) {
    score = Math.min(score, 25);
    reasons.push({ type: 'risk', text: `blessure articulaire/osseuse déclarée — imagerie médicale + avis d'un spécialiste indispensables avant de démarrer` });
  }

  // IMC → risque articulaire
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) {
      score -= 25;
      reasons.push({ type: 'risk', text: `ton profil actuel impose une vigilance articulaire renforcée — consulte un médecin avant de démarrer, privilégie surfaces souples (herbe, terre, chemin) et chaussures avec amorti maximal` });
    } else if (bmi >= 30) {
      score -= 15;
      reasons.push({ type: 'warn', text: `ton profil impose une vigilance articulaire — consulte un médecin, privilégie un bon amorti et des surfaces souples` });
    } else if (bmi >= 25 && (isMarathon || (isTrail && distanceKm !== null && distanceKm >= 30))) {
      score -= 5;
      reasons.push({ type: 'warn', text: `pour cette distance, investis dans de bonnes chaussures avec un bon amorti` });
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

  // -----------------------------------------------------------------------
  // GARDE-FOU DÉBUTANT + VOL 0 : durée minimum saine par distance
  // Cf. getMinimumWeeksForBeginnerVolZero(). Cas Aureline 1778575564571.
  // -----------------------------------------------------------------------
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0
      ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) {
      score = Math.min(score, 15);
      reasons.push({ type: 'risk', text: `${planWeeks} semaines pour démarrer la course à pied (volume actuel 0) est insuffisant pour ton profil — minimum recommandé : ${minRequired} semaines. Allonge la préparation ou choisis un objectif plus modeste (marcher la majorité du parcours)` });
    } else if (planWeeks < minRequired * 1.2) {
      score = Math.min(score, 30);
      reasons.push({ type: 'warn', text: `${planWeeks} semaines pour démarrer la course (volume actuel 0) est juste pour ton profil — minimum confortable : ${Math.round(minRequired * 1.2)} semaines` });
    }
  }

  // -----------------------------------------------------------------------
  // R2 — Gates feasibility trail + saut volume + Expert non validé
  // Cf. applyR2Gates en haut de fichier. Cas Peterson 1779027192953 (trail
  // 50km/3500D+ en 11 sem, vol 31 + D+ 15) → IRRÉALISTE auto via gate 2.
  // Cas Valentine 1779029895523 (trail 20km/1000D+ en 7 sem, vol 25 + D+ 600)
  // → tous gates passent, statut conservé → bon comportement.
  // -----------------------------------------------------------------------
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, undefined);
    }
  }
  // BUG 1 FIX : estimer s1Volume comme dans calculateFeasibility (cohérence)
  const isMarathonFin = (distanceKm ?? 0) >= 42;
  const isSemiFin = (distanceKm ?? 0) >= 21 && (distanceKm ?? 0) < 42;
  const peakVolEstimateFin = distanceKm
    ? (isMarathonFin ? 60 : isSemiFin ? 45 : isTrail && distanceKm >= 60 ? 70
      : isTrail && distanceKm >= 30 ? 55 : 35)
    : 35;
  const s1VolEstimateFin = currentVolume && currentVolume > 0
    ? Math.round(currentVolume * 1.10)
    : Math.round(peakVolEstimateFin * 0.30);
  const r2 = applyR2Gates({
    isTrail,
    distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimateFin,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || '',
    hasChrono: params.hasChrono,
  });
  for (const r of r2.reasons) {
    reasons.push({ type: r2.irrealisticCap !== undefined ? 'risk' : 'warn', text: r });
  }
  if (r2.reasons.length > 0) {
    console.debug(`[R2 Gates Finisher] reasons:`, r2.reasons);
  }
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) {
    score = Math.min(score, r2.irrealisticCap);
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

  let safetyWarning = buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, params.weight, params.height, params.age, isTrail, isMarathon || isSemi || (distanceKm !== null && distanceKm >= 21));

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

  // Warning plans trop longs pour le profil
  const isTrailLong = isTrail && distanceKm !== null && distanceKm >= 42;
  const maxWeeksTrail = isTrailLong ? 22 : isTrail ? 20 : isMarathon ? 20 : isSemi ? 18 : 14;
  if (planWeeks > maxWeeksTrail && !beginner) {
    const longPlanWarning = `⚠️ DURÉE DU PLAN : ${planWeeks} semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en ${maxWeeksTrail} semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.`;
    safetyWarning = safetyWarning ? `${safetyWarning}\n\n${longPlanWarning}` : longPlanWarning;
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

  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) {
      parts.push(`Attention : ${planWeeks} semaines pour un ultra de ${distanceKm}km, c'est très court — 16 à 20 semaines idéalement. Le plan sera condensé et chaque semaine comptera.`);
    } else if (distanceKm >= 60 && planWeeks < 14) {
      parts.push(`Attention : ${planWeeks} semaines pour un trail de ${distanceKm}km, c'est court — 14 à 18 semaines recommandées. Le plan sera condensé.`);
    } else if (distanceKm >= 42 && planWeeks < 12) {
      parts.push(`Attention : ${planWeeks} semaines pour un trail de ${distanceKm}km, c'est juste — 12 semaines minimum recommandées.`);
    }
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
  age?: number,
  isTrail?: boolean,
  isLongDistance?: boolean,
): string {
  const bmi = (weight && height && height > 0) ? weight / ((height / 100) ** 2) : 0;
  const isSenior = (age || 0) >= 45;

  // Priorité : cumul facteurs > blessure > senior+longue distance > IMC ≥ 35 > IMC ≥ 30 > senior > IMC ≥ 25 > débutant+distance > défaut

  // Cumul facteurs articulaires + blessure : avis médical OBLIGATOIRE
  if (hasInjury && bmi >= 30) {
    return 'AVIS MÉDICAL OBLIGATOIRE : tu cumules des facteurs de prudence (profil + antécédent de blessure). Consulte impérativement ton médecin et ton kiné avant de démarrer. Privilégie surfaces souples et chaussures à amorti maximal.';
  }

  // Cumul senior + débutant + profil à risque articulaire
  if (bmi >= 30 && isSenior && beginner) {
    return `AVIS MÉDICAL OBLIGATOIRE : à ${age} ans, avec un démarrage débutant, consulte impérativement ton médecin pour un test d'effort avant de commencer. Démarre très progressivement en alternant marche et course.`;
  }

  if (hasInjury) {
    return 'Fais valider la reprise avec ton kiné/médecin avant de démarrer ce plan. Adapte les séances si nécessaire.';
  }

  if (isSenior && (isMarathon || isLongDistance)) {
    return `À ${age} ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.`;
  }

  if (bmi >= 35) {
    return 'Consulte impérativement ton médecin avant de démarrer ce programme. Risque articulaire à surveiller : privilégie surfaces souples (herbe, terre, chemin), chaussures à amorti maximal, et alterne marche et course si nécessaire.';
  }

  if (bmi >= 30) {
    return 'On te recommande de consulter ton médecin avant de démarrer. Investis dans de bonnes chaussures avec amorti renforcé et privilégie surfaces souples (herbe, terre, chemin) pour réduire l\'impact sur les articulations.';
  }

  if (isSenior) {
    return `À ${age} ans, on te recommande de consulter ton médecin pour un certificat d'aptitude et idéalement un test d'effort avant de démarrer. Accorde-toi une récupération suffisante entre les séances (48h minimum) et écoute ton corps.`;
  }

  if (bmi >= 27) {
    return 'Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c\'est possible. Pense à bien t\'hydrater et à écouter ton corps.';
  }

  if (bmi >= 25 && (isMarathon || isSemi || isLongDistance)) {
    return 'Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c\'est possible. Pense à bien t\'hydrater.';
  }

  if (beginner && (isMarathon || isSemi || isLongDistance)) {
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
