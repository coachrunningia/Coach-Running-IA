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
export function recalibrateSession(
  session: Session,
  oldPaces: Partial<TrainingPaces> | null | undefined,
  newPaces: Partial<TrainingPaces> | null | undefined,
  options: BuildSwapOptions = {}
): Session {
  if (!oldPaces || !newPaces) return session;
  const swap = buildPaceSwapMap(oldPaces, newPaces, options);
  if (swap.size === 0) return session;

  const stripUnit = (s: string | undefined): string =>
    (s || '').replace(/\s*min\s*\/\s*km/i, '').trim();

  const newSession: Session = { ...session };

  // 1. targetPace — swap si présent dans map
  if (session.targetPace) {
    const tp = stripUnit(session.targetPace);
    if (swap.has(tp)) {
      // Préserve le suffix " min/km" si présent
      const hadUnit = /min\s*\/\s*km/i.test(session.targetPace);
      newSession.targetPace = hadUnit ? `${swap.get(tp)!} min/km` : swap.get(tp)!;
    }
  }

  // 2. mainSet — recalibrate text
  if (session.mainSet) {
    newSession.mainSet = recalibrateText(session.mainSet, swap);
  }

  // 3. warmup — recalibrate text (champ optionnel, peut ne pas exister)
  const anyS = session as any;
  if (typeof anyS.warmup === 'string') {
    (newSession as any).warmup = recalibrateText(anyS.warmup, swap);
  }

  // 4. cooldown — recalibrate text (idem)
  if (typeof anyS.cooldown === 'string') {
    (newSession as any).cooldown = recalibrateText(anyS.cooldown, swap);
  }

  return newSession;
}
