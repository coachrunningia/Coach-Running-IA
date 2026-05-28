/**
 * F-17 — Pace Recalibration Service (pure TS, zéro dépendance Firebase/Gemini)
 *
 * Patche `targetPace` + `mainSet` + `warmup` + `cooldown` d'une Session après
 * changement de VMA, en utilisant un swap map (oldPaces → newPaces) construit
 * globalement, sans regex blind. Approche Dev senior plan F17-DEV-PLAN.md.
 *
 * Pourquoi un swap GLOBAL plutôt qu'un paceKey unique par session :
 * - Cas multi-paces dans 1 mainSet : "4×800 à 4:30 récup à 6:00" → 2 swaps indépendants
 * - Cas même pace plusieurs fois (warmup + main à 8:17) → toutes swappées
 * - Filtre `swap.has(mm:ss)` = garde-fou anti faux-positif sur durées
 *   ("Repos 1:30", "6×3:00") — si pas dans oldPaces, on laisse intact.
 */

import type { Session, TrainingPaces } from '../types';

/**
 * Construit un swap map { oldPace: newPace } à partir de toutes les clés paces
 * communes entre les 2 objets. Strip " min/km" si présent.
 */
/**
 * Doctrine `feedback_jamais_baisser_allure_cible` + décision Romane F-17 :
 * Quand l'user a un `targetTime` (objectif chrono), on GÈLE les allures
 * spécifiques course (5K/10K/Semi/Marathon). Le plan reste stable côté
 * objectif. On ne touche que les allures d'ENTRAÎNEMENT (EF/Seuil/VMA/etc.).
 *
 * `options.freezeRaceSpecificPaces=true` → exclut allureSpecifique* du swap.
 *
 * Doctrine `feedback_patch_live_plans_jour_seulement` :
 * `options.referenceDate` permet à l'appelant (script admin / handler app)
 * de filtrer les sessions par date — ce service reste pure, il ne fait
 * PAS le filtrage lui-même (la résolution de session date dépend du Plan,
 * pas de la Session seule, donc l'orchestration appartient à l'appelant).
 */
export interface BuildSwapOptions {
  freezeRaceSpecificPaces?: boolean;
}

const RACE_SPECIFIC_KEYS: (keyof TrainingPaces)[] = [
  'allureSpecifique5k',
  'allureSpecifique10k',
  'allureSpecifiqueSemi',
  'allureSpecifiqueMarathon',
];

const TRAINING_PACE_KEYS: (keyof TrainingPaces)[] = [
  'vmaPace',
  'seuilPace',
  'eaPace',
  'efPace',
  'recoveryPace',
];

export function buildPaceSwapMap(
  oldPaces: Partial<TrainingPaces> | null | undefined,
  newPaces: Partial<TrainingPaces> | null | undefined,
  options: BuildSwapOptions = {}
): Map<string, string> {
  const swap = new Map<string, string>();
  if (!oldPaces || !newPaces) return swap;
  const stripUnit = (s: string | undefined): string =>
    (s || '').replace(/\s*min\s*\/\s*km/i, '').trim();
  const keys: (keyof TrainingPaces)[] = options.freezeRaceSpecificPaces
    ? TRAINING_PACE_KEYS // gel allures course (cf. décision Romane F-17)
    : [...TRAINING_PACE_KEYS, ...RACE_SPECIFIC_KEYS];
  for (const k of keys) {
    const oldRaw = oldPaces[k];
    const newRaw = newPaces[k];
    if (typeof oldRaw !== 'string' || typeof newRaw !== 'string') continue;
    const oldVal = stripUnit(oldRaw);
    const newVal = stripUnit(newRaw);
    if (!/^\d{1,2}:[0-5]\d$/.test(oldVal)) continue;
    if (!/^\d{1,2}:[0-5]\d$/.test(newVal)) continue;
    swap.set(oldVal, newVal);
  }
  return swap;
}

/**
 * 3 patterns regex pour reconnaître une pace dans un texte généré par Gemini.
 * Garde-fous : `\b` aux bornes pour éviter "15:07" matché en "5:07",
 * `[0-5]\d` rejette `:60+`.
 */
const PACE_PATTERNS = [
  // P1 — "8:12 min/km" / "8:12/km" / "8:12 min /km"
  /\b(\d{1,2}):([0-5]\d)\s*(?:min\s*)?\/\s*km\b/g,
  // P2 — "à 8:12" / "allure 8:12" / "allure : 8:12" (sans /km après).
  // Pas de \b avant "à" car JS \b ASCII-only ne matche pas " à" (à non-word ASCII).
  // On exige plutôt un caractère non-alphanumérique avant (lookbehind) ou début de string.
  /(?:^|[^A-Za-zÀ-ÿ])(à|allure\s*:?)\s+(\d{1,2}):([0-5]\d)\b(?!\s*[:.\/])/g,
  // P3 — "(8:12)" / "(8:12 en référence)" / "(allure : 8:12)"
  /\((?:allure\s*:\s*)?(\d{1,2}):([0-5]\d)(?:\s+en\s+r[ée]f[ée]rence)?\s*(?:min\s*\/\s*km)?\s*[^)]*\)/g,
];

/**
 * Applique le swap map à un texte. Pour chaque pace trouvée :
 * - Si présente dans swap → remplace
 * - Sinon → garde intact (filtre swap.has = garde-fou anti faux-positif)
 */
export function recalibrateText(
  text: string | undefined | null,
  swap: Map<string, string>
): string {
  if (!text) return text || '';
  if (swap.size === 0) return text;
  let result = text;
  for (const pattern of PACE_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // Extract "mm:ss" du match (capture group depend du pattern)
      const inner = match.match(/(\d{1,2}):([0-5]\d)/);
      if (!inner) return match;
      const old = `${inner[1]}:${inner[2]}`;
      if (!swap.has(old)) return match;
      return match.replace(old, swap.get(old)!);
    });
  }
  return result;
}

/**
 * Recalibre une Session : patche targetPace + mainSet + warmup + cooldown
 * en utilisant le swap map. Pure function, retourne nouvelle Session.
 *
 * Note : on touche AUSSI targetPace pour cohérence — le swap map est autoritaire.
 * Si oldPaces.efPace === session.targetPace stripé, alors targetPace devient newPaces.efPace.
 */
// ============================================
// F-17 v2 — Force update par paceRole (fix paces fossiles non-canoniques)
// ============================================
// Bug observé prod (Romane.m2 plan Trail 1776451012891) :
// Gemini écrit parfois des paces "approximées" dans mainSet (ex: 5:52 = EF 65%
// au lieu de 67% canonique) qui ne matchent JAMAIS oldPaces canoniques
// → swap V1 les laisse intactes → résidus de VMA fossile figés à chaque recalcul.
//
// Solution : pré-passe role-based qui FORCE la pace canonique attendue dans
// une fenêtre ±20s, UNIQUEMENT sur les sessions "type pur" (Jogging/Récup/SL EF)
// et UNIQUEMENT sur les paces explicitement contextualisées (suivies de min/km,
// précédées de "à"/"allure", ou entre parenthèses).
// → évite faux-positif sur durées de repos (ex: "Récup 4:30 entre tours").

type PaceRole = 'EF' | 'Recup' | null;

function detectSessionPaceRole(session: Session): PaceRole {
  const type = (session.type || '').toLowerCase();
  const title = (session.title || '').toLowerCase();
  const anyS = session as any;
  const intensity = (anyS.intensity || '').toLowerCase();
  // Récupération (haystack du type + title)
  if (type.includes('récupération') || type.includes('recuperation') ||
      /r[ée]cup[ée]ration|r[ée]cup\b/.test(title)) return 'Recup';
  // EF "purs" : Jogging, Sortie Longue, Footing, Marche/Course en EF
  // Exclure fractionné/seuil/VMA/tempo/fartlek (multi-paces, gérés par swap V1)
  const isFractioneOrSeuil = /seuil|fractionn|vma|tempo|fartlek|intervalle|seance.*int|c[ôo]tes?/i.test(title);
  if (isFractioneOrSeuil) return null;
  const isPureEF = type === 'jogging' || type === 'sortie longue' ||
                   /footing|jogging|endurance fondamentale|\bef\b|sortie longue|sortie facile/i.test(title);
  if (isPureEF && (intensity === 'facile' || intensity === 'modéré' || intensity === 'modere' || !intensity)) {
    return 'EF';
  }
  return null;
}

const paceToSec = (mmss: string): number => {
  const m = mmss.match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
};

// Patterns avec CONTEXTE explicite — évite faux-positif sur durées de repos.
const PACE_CONTEXT_PATTERNS = [
  // P1 — "X:XX min/km" ou "X:XX/km"
  /\b(\d{1,2}):([0-5]\d)\s*(?:min\s*)?\/\s*km\b/g,
  // P2 — "à X:XX" / "allure X:XX" / "allure : X:XX"
  /(?:^|[^A-Za-zÀ-ÿ])(?:à|allure\s*:?)\s+(\d{1,2}):([0-5]\d)\b(?!\s*[:.\/])/g,
  // P3 — "(X:XX)" parenthèses sans context spécifique
  /\((\d{1,2}):([0-5]\d)\)/g,
];

function forcePaceInText(
  text: string,
  targetPaceSec: number,
  newPaceStr: string,
  canonicalOldSet: Set<number>, // paces oldPaces (en sec) — on NE FORCE PAS celles-ci (gérées par swap V1)
  toleranceSec = 45
): string {
  // Tolérance ±45s : couvre les paces fossiles Gemini "approximées" (cas réel Romane:
  // 5:52 mainSet vs 5:16 efPace cible = 36s → forcé). Skip les paces canoniques
  // (déjà dans oldPaces) — le swap V1 les gère exactement.
  if (!text) return text;
  let result = text;
  for (const pattern of PACE_CONTEXT_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const inner = match.match(/(\d{1,2}):([0-5]\d)/);
      if (!inner) return match;
      const mm = parseInt(inner[1], 10);
      const ss = parseInt(inner[2], 10);
      if (mm === 0) return match; // durée < 1 min → pas une pace
      const sec = mm * 60 + ss;
      if (sec < 150 || sec > 720) return match; // hors gamme running (< 2:30 ou > 12:00)
      // Skip si la pace est canonique (∈ oldPaces ±2s) → swap V1 la gérera proprement
      for (const canonical of canonicalOldSet) {
        if (Math.abs(sec - canonical) <= 2) return match;
      }
      // Pace non-canonique (fossile) dans la tolérance → force update
      if (Math.abs(sec - targetPaceSec) <= toleranceSec) {
        return match.replace(`${inner[1]}:${inner[2]}`, newPaceStr);
      }
      return match;
    });
  }
  return result;
}

export function forceUpdatePaceByRole(
  session: Session,
  oldPaces: Partial<TrainingPaces>,
  newPaces: Partial<TrainingPaces>
): Session {
  const role = detectSessionPaceRole(session);
  if (!role) return session;
  const targetPaceStr = (role === 'EF' ? newPaces.efPace : newPaces.recoveryPace) || '';
  const targetClean = targetPaceStr.replace(/\s*min\s*\/\s*km/i, '').trim();
  const targetSec = paceToSec(targetClean);
  if (isNaN(targetSec)) return session;

  // Build canonical old set (en secondes) — on NE force PAS ces paces (swap V1 le gère)
  const canonicalOldSet = new Set<number>();
  for (const v of Object.values(oldPaces)) {
    if (typeof v === 'string') {
      const sec = paceToSec(v.replace(/\s*min\s*\/\s*km/i, '').trim());
      if (!isNaN(sec)) canonicalOldSet.add(sec);
    }
  }

  const out: Session = { ...session };

  // targetPace : si NON canonique ET dans tolérance ±45s → normaliser
  if (session.targetPace) {
    const tpClean = session.targetPace.replace(/\s*min\s*\/\s*km/i, '').trim();
    const tpSec = paceToSec(tpClean);
    if (!isNaN(tpSec)) {
      let isCanonical = false;
      for (const canonical of canonicalOldSet) {
        if (Math.abs(tpSec - canonical) <= 2) { isCanonical = true; break; }
      }
      if (!isCanonical && Math.abs(tpSec - targetSec) <= 45) {
        const hadUnit = /min\s*\/\s*km/i.test(session.targetPace);
        out.targetPace = hadUnit ? `${targetClean} min/km` : targetClean;
      }
    }
  }

  // mainSet : force toutes paces context-explicites NON-canoniques dans la tolérance
  if (session.mainSet) {
    out.mainSet = forcePaceInText(session.mainSet, targetSec, targetClean, canonicalOldSet);
  }
  const a = session as any;
  if (typeof a.warmup === 'string') {
    (out as any).warmup = forcePaceInText(a.warmup, targetSec, targetClean, canonicalOldSet);
  }
  if (typeof a.cooldown === 'string') {
    (out as any).cooldown = forcePaceInText(a.cooldown, targetSec, targetClean, canonicalOldSet);
  }
  return out;
}

export function recalibrateSession(
  session: Session,
  oldPaces: Partial<TrainingPaces> | null | undefined,
  newPaces: Partial<TrainingPaces> | null | undefined,
  options: BuildSwapOptions = {}
): Session {
  if (!oldPaces || !newPaces) return session;
  // F-17 v2 — Pré-passe role-based (force update paces fossiles non-canoniques)
  const roleForced = forceUpdatePaceByRole(session, oldPaces, newPaces);
  // Swap V1 derrière pour multi-paces (fractionné/seuil/VMA) — opère sur roleForced
  const swap = buildPaceSwapMap(oldPaces, newPaces, options);
  if (swap.size === 0) return roleForced;

  const stripUnit = (s: string | undefined): string =>
    (s || '').replace(/\s*min\s*\/\s*km/i, '').trim();

  // IMPORTANT : on PART de roleForced (résultat de la pré-passe), pas de session.
  // Sinon le swap V1 écraserait les forces appliquées par la pré-passe.
  const newSession: Session = { ...roleForced };

  // 1. targetPace — swap si présent dans map
  if (roleForced.targetPace) {
    const tp = stripUnit(roleForced.targetPace);
    if (swap.has(tp)) {
      // Préserve le suffix " min/km" si présent
      const hadUnit = /min\s*\/\s*km/i.test(roleForced.targetPace);
      newSession.targetPace = hadUnit ? `${swap.get(tp)!} min/km` : swap.get(tp)!;
    }
  }

  // 2. mainSet — recalibrate text
  if (roleForced.mainSet) {
    newSession.mainSet = recalibrateText(roleForced.mainSet, swap);
  }

  // 3. warmup — recalibrate text (champ optionnel, peut ne pas exister)
  const anyS = roleForced as any;
  if (typeof anyS.warmup === 'string') {
    (newSession as any).warmup = recalibrateText(anyS.warmup, swap);
  }

  // 4. cooldown — recalibrate text (idem)
  if (typeof anyS.cooldown === 'string') {
    (newSession as any).cooldown = recalibrateText(anyS.cooldown, swap);
  }

  return newSession;
}
