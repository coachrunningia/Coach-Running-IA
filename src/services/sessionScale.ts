/**
 * sessionScale — Helper pour scaler une session (duration + distance) tout en
 * gardant le mainSet synchronisé quand c'est SÛR de le faire.
 *
 * Cause racine (INVESTIGATION-MAINSET-DURATION-DESYNC.md) :
 *   24 sites dans `geminiService.ts` mutent `duration` et/ou `distance` sans
 *   réécrire `mainSet`. Résultat : 51 séances en base sur 10+ plans avec un
 *   mainSet "Footing 116 min" alors que la duration officielle = 60 min.
 *   Cas concret : steph-fanny (mainSet ≠ duration sur SL).
 *
 * Décision coach 15 ans (VALIDATION-COACH-AVANT-DEPLOY.md élément D) :
 *   - WHITELIST stricte des types où la sync auto du mainSet est sûre :
 *     `Sortie Longue`, `Jogging`, `Footing`. Le mainSet de ces séances est
 *     généralement narratif ("90 min de course continue", "12 km en deux
 *     moitiés"), donc remplaçable par regex.
 *   - BLACKLIST explicite : `Fractionné`, `Fartlek`, `Côtes`, `Tempo`,
 *     `Trail`, `Renforcement`, `Marche-Course`, `Hyrox`. Sur ces types le
 *     mainSet contient des éléments structurés (`6 × 800 m`, `Squats 3×9`)
 *     qui ne doivent JAMAIS être touchés par une simple regex sur "X km".
 *   - Si type risky → on log silencieusement et un planValidator séparé
 *     détectera les mismatch éventuels.
 */
import { parseDurationMin, parseKm } from './planUtils';

// Whitelist : types où on peut synchroniser le mainSet (texte narratif simple).
export const MAINSET_SYNCABLE_TYPES = new Set<string>([
  'Sortie Longue',
  'Jogging',
  'Footing',
]);

// Blacklist explicite : types où on NE TOUCHE JAMAIS le mainSet.
// Doublon volontaire vs la check whitelist : on ne veut pas qu'un nouvel ajout
// dans MAINSET_SYNCABLE_TYPES (qui collisionnerait avec un type risky) ouvre
// une faille silencieuse.
export const MAINSET_RISKY_TYPES = new Set<string>([
  'Fractionné',
  'Fartlek',
  'Côtes',
  'Tempo',
  'Trail',
  'Renforcement',
  'Marche-Course',
  'Marche/Course',
  'Hyrox',
  'VMA',
  'Intervalle',
  'Seuil',
  'Repos',
]);

/**
 * Pattern "X × Y km" / "X x Y km" / "X×Y km" — caractéristique d'un fractionné.
 * Si le mainSet contient ce motif, on NE PAS sync de distance, même sur un
 * type whitelisté (cas où Gemini aurait mal typé une séance).
 */
const FRACTIONAL_PATTERN_RE = /\d+\s*[x×]\s*\d/i;

function shouldSyncMainSet(sessionType: string | undefined, mainSet: string | undefined): boolean {
  const t = sessionType || '';
  if (!MAINSET_SYNCABLE_TYPES.has(t)) return false;
  if (MAINSET_RISKY_TYPES.has(t)) return false; // double safety net
  if (mainSet && FRACTIONAL_PATTERN_RE.test(mainSet)) return false;
  return true;
}

/**
 * Sync les références "X min" et "X km" du mainSet vers les nouvelles valeurs
 * `newDur` / `newKm`. Ne touche QUE le tout premier "X min" (préfixe typique
 * "60 min de course continue ...") et la première occurrence "X km" non
 * fractionnée. Idempotent : appelable plusieurs fois sans drift.
 */
function syncMainSetText(mainSet: string, newDurMin: number, newKm: number): string {
  let updated = mainSet;

  // Pattern "X min" en début de chaîne (avec ou sans espace, insensitive)
  if (newDurMin > 0) {
    updated = updated.replace(/^(\s*)(\d+)\s*min\b/i, `$1${newDurMin} min`);
  }

  // Pattern "X km" — premier match SEULEMENT si pas dans un contexte "X × Y km"
  if (newKm > 0 && !FRACTIONAL_PATTERN_RE.test(updated)) {
    // Cible "X km" / "X.Y km" / "X,Y km" — première occurrence
    updated = updated.replace(/(\d+(?:[.,]\d+)?)\s*km\b/, `${newKm} km`);
  }

  return updated;
}

/**
 * applySessionScale — Scaling d'une session avec sync mainSet conditionnelle.
 *
 * @param session  L'objet séance (mutation in-place)
 * @param newDur   Nouvelle durée formatée (ex: "60 min", "1h30")
 * @param newKm    Nouvelle distance formatée (ex: "8 km", "10.5 km")
 *                 Si vide/null → on ne touche pas la distance ni le mainSet km
 */
export function applySessionScale(session: any, newDur: string, newKm: string): void {
  if (!session) return;

  const newDurMin = parseDurationMin(newDur);
  const newKmVal = parseKm(newKm);

  // Maj duration/distance officielles
  if (newDur) session.duration = newDur;
  if (newKm) session.distance = newKm;

  // Sync mainSet conditionnellement
  if (session.mainSet && shouldSyncMainSet(session.type, session.mainSet)) {
    session.mainSet = syncMainSetText(session.mainSet, newDurMin, newKmVal);
  }
  // Note: pour les types risky (Fractionné, Tempo, Renforcement, ...) on
  // laisse le mainSet INCHANGÉ — il sera vérifié par planValidator
  // (règle `mainset_duration_mismatch`).
}

/**
 * Helpers exportés pour les tests + planValidator.
 */
export function isMainSetSyncable(sessionType: string | undefined, mainSet?: string): boolean {
  return shouldSyncMainSet(sessionType, mainSet);
}
