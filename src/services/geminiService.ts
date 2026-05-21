
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { QuestionnaireData, TrainingPlan, GenerationContext, PeriodizationPhase } from "../types";
import { calculateFeasibility } from './feasibilityService';
import { buildRenfoMainSet } from './renfoService';
import { buildFootingVariant, detectFootingFlags } from './footingVariants';
import { parseDurationMin, parseKm, calculateWeekTargetElevation } from './planUtils';
import { applySessionScale, isMainSetSyncable } from './sessionScale';
import { injectRaceSession } from './raceDayInject';
import { buildDisciplineBlock } from './doctrine/buildDisciplineBlock';

// --- UTILITAIRES DE CALCUL DES ALLURES ---

/**
 * Écrasement déterministe de plan.distance — anti-hallucination LLM.
 *
 * Bug audit 2026-05-20 : pour les plans route (5K/10K/Semi/Marathon),
 * le LLM hallucinait la distance affichée (Margaux Semi "16 km",
 * Bertrand Semi "14 km", floggyz 10K "36 km"). Seul Trail bénéficiait
 * d'un écrasement déterministe (`{distance}km D+{elevation}m`).
 *
 * Source de vérité : `data.subGoal` (input user, sacré).
 * Cf. [[feedback_input_client_obligatoire]].
 *
 * - Trail : `{trailDistance}km D+{trailElevation}m` (comportement préexistant)
 * - 5 km / 5km → "5 km"
 * - 10 km / 10km → "10 km"
 * - Semi-Marathon / Semi-marathon → "21.1 km (Semi-Marathon)"
 * - Marathon → "42.2 km (Marathon)"
 * - subGoal inconnu / undefined → on ne touche pas (fallback safe)
 */
export const applyDistanceOverride = (
  plan: { distance?: string },
  data: { goal?: string; subGoal?: string; trailDetails?: { distance?: number; elevation?: number } }
): void => {
  // 1. Trail : libellé déterministe distance + dénivelé (préservé)
  if (data.goal === 'Trail' && data.trailDetails?.distance && data.trailDetails?.elevation) {
    plan.distance = `${data.trailDetails.distance}km D+${data.trailDetails.elevation}m`;
    return;
  }

  // 2. Route : mapping subGoal → libellé standardisé
  if (data.subGoal) {
    const subGoalMap: Record<string, string> = {
      '5 km': '5 km',
      '5km': '5 km',
      '10 km': '10 km',
      '10km': '10 km',
      'Semi-Marathon': '21.1 km (Semi-Marathon)',
      'Semi-marathon': '21.1 km (Semi-Marathon)',
      'Marathon': '42.2 km (Marathon)',
    };
    const mapped = subGoalMap[data.subGoal];
    if (mapped) {
      plan.distance = mapped;
    }
    // subGoal inconnu (Hyrox, PdP, etc.) : on laisse plan.distance tel quel
  }
  // subGoal undefined : pas d'écrasement (cas Maintien/PertePoids sans subGoal)
};

/**
 * Convertit un temps en secondes - gère tous les formats
 * Formats: "mm:ss", "hh:mm:ss", "Xh", "XhYY", "XX min"
 */
const timeToSeconds = (time: string, contextDistance?: number): number => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Fix #6 (2026-05-19) : rejet inputs pollués qui contiennent une distance "km"
  // Ex : "50km (6h50)" saisi dans recentRaceTimes.distance10km → input invalide
  // Retourner 0 plutôt que parser n'importe comment (ex : matcher "6h50" et ignorer "50km")
  // qui produit des chronos incohérents (cas Jeremy détecté lors investigation cascade).
  if (/\d+\s*km/i.test(t)) {
    console.warn(`[timeToSeconds] "${time}" contient "km" — input pollué (distance dans champ chrono), retourne 0`);
    return 0;
  }

  // Format "Xh" ou "XhYY" ou "Xh:YY" (ex: 4h, 4h30, 4h:30, 2h08)
  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = hours * 3600 + mins * 60;
    // Garde-fou : si le résultat en heures est physiquement absurde vu la distance,
    // l'utilisateur a probablement écrit "MMmSS" en utilisant "h" comme séparateur
    // (ex: "50h54" pour un 10 km = 50 min 54 s, PAS 50 heures).
    if (contextDistance) {
      const maxPlausibleSec =
        contextDistance <= 5 ? 90 * 60 :        // 5 km : max 1h30
        contextDistance <= 10 ? 150 * 60 :      // 10 km : max 2h30
        contextDistance <= 21.5 ? 4 * 3600 :    // semi : max 4h
        contextDistance <= 43 ? 8 * 3600 :      // marathon : max 8h
        Math.max(30, contextDistance * 0.5) * 3600; // ultras : ~30 min/km max
      if (asHours > maxPlausibleSec) {
        const asMinSec = hours * 60 + mins;
        console.warn(`[timeToSeconds] "${time}" interprété "${hours}h${mins}min"=${asHours}s implausible pour ${contextDistance}km — réinterprété "${hours}min${mins}s" = ${asMinSec}s`);
        return asMinSec;
      }
    }
    return asHours;
  }

  // Format "XX min" ou "XXmin" (ex: 58 min, 58min)
  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
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

  // Format mixte : "5km 21min", "10K 55min", etc. — extraire la partie "XXmin" ou "XhYY"
  const embeddedMin = t.match(/(\d+)\s*min/);
  if (embeddedMin) {
    // Check if there's also an hour part: "1h 21min"
    const embeddedH = t.match(/(\d+)\s*h/);
    if (embeddedH) return parseInt(embeddedH[1]) * 3600 + parseInt(embeddedMin[1]) * 60;
    return parseInt(embeddedMin[1]) * 60;
  }

  // Nombre seul (ex: "46", "120", "3") — interpréter selon le contexte
  const soloNum = parseInt(t);
  if (!isNaN(soloNum) && soloNum > 0) {
    if (contextDistance && contextDistance >= 21) {
      // Semi/Marathon : nombre seul probablement des minutes (ex: "120" = 2h)
      // sauf si petit nombre (1-6) → probablement des heures
      return soloNum <= 6 ? soloNum * 3600 : soloNum * 60;
    }
    // 5km/10km : nombre seul = minutes (ex: "46" = 46min)
    return soloNum * 60;
  }

  return 0;
};

/**
 * Normalise une paire (min, sec) en format m:ss en gérant le débordement
 * sec >= 60 (et au-delà, multiples de 60). Cf. bug abalandreau Trail
 * 2026-05-19 où seuilPace = "5:60" (invalide) atteignait l'UI.
 */
export const normalizePace = (minIn: number, secIn: number): string => {
  let m = Math.floor(minIn);
  let s = Math.floor(secIn);
  if (s >= 60) {
    m += Math.floor(s / 60);
    s = s % 60;
  } else if (s < 0) {
    // Cas dégénéré (saisie invalide LLM) : on remonte
    while (s < 0 && m > 0) { m -= 1; s += 60; }
    if (s < 0) s = 0;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Convertit des secondes en format "m:ss min/km".
 * Utilise normalizePace pour garantir 0 <= sec < 60 en toutes circonstances.
 */
const secondsToPace = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return normalizePace(mins, secs);
};

/**
 * Calcule la VMA à partir d'un chrono de référence
 * Formules scientifiques basées sur les équivalences temps/VMA
 */
const calculateVMAFromTime = (distance: number, timeSeconds: number): number => {
  // Vitesse moyenne en km/h
  const avgSpeed = (distance / timeSeconds) * 3600;

  // Facteur de correction selon la distance (basé sur % VMA tenable)
  // 5km ~ 95% VMA, 10km ~ 90% VMA, Semi ~ 85% VMA, Marathon ~ 80% VMA
  let vmaFactor: number;
  if (distance <= 5) {
    vmaFactor = 0.95;
  } else if (distance <= 10) {
    vmaFactor = 0.90;
  } else if (distance <= 21.1) {
    vmaFactor = 0.85;
  } else {
    vmaFactor = 0.80;
  }

  return avgSpeed / vmaFactor;
};

/**
 * Calcule toutes les allures d'entraînement à partir de la VMA
 */
export interface TrainingPaces {
  vma: number; // km/h
  vmaKmh: string;
  vmaPace: string; // min/km
  seuilPace: string; // 85-88% VMA
  eaPace: string; // Endurance Active 75-80% VMA
  efPace: string; // Endurance Fondamentale 65-70% VMA
  recoveryPace: string; // Récupération 60% VMA
  allureSpecifique5k: string;
  allureSpecifique10k: string;
  allureSpecifiqueSemi: string;
  allureSpecifiqueMarathon: string;
}

export const calculateAllPaces = (vma: number): TrainingPaces => {
  // VMA en pace (secondes par km)
  const vmaPaceSeconds = 3600 / vma;

  // Calcul des zones (en secondes par km)
  const seuilSpeed = vma * 0.87; // 87% VMA
  const eaSpeed = vma * 0.77; // 77% VMA
  const efSpeed = vma * 0.67; // 67% VMA
  const recoverySpeed = vma * 0.60; // 60% VMA

  // Allures spécifiques courses
  const specific5kSpeed = vma * 0.95;
  const specific10kSpeed = vma * 0.90;
  const specificSemiSpeed = vma * 0.85;
  const specificMarathonSpeed = vma * 0.80;

  // Sprint Marathon 2026-05-20 — normalisation finale anti-"5:60" :
  // toutes les paces sortent via secondsToPace (qui utilise normalizePace)
  // donc la garantie 0 ≤ sec < 60 est respectée à la source.
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

/**
 * Détermine la VMA la plus fiable à partir des chronos disponibles
 */
const getBestVMAEstimate = (raceTimes: QuestionnaireData['recentRaceTimes']): { vma: number; source: string } | null => {
  if (!raceTimes) return null;

  const estimates: { vma: number; source: string; priority: number }[] = [];

  // 5km - Meilleure précision
  if (raceTimes.distance5km) {
    const seconds = timeToSeconds(raceTimes.distance5km, 5);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(5, seconds),
        source: `5km en ${raceTimes.distance5km}`,
        priority: 1
      });
    }
  }

  // 10km - Très bonne précision
  if (raceTimes.distance10km) {
    const seconds = timeToSeconds(raceTimes.distance10km, 10);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(10, seconds),
        source: `10km en ${raceTimes.distance10km}`,
        priority: 2
      });
    }
  }

  // Semi-marathon
  if (raceTimes.distanceHalfMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceHalfMarathon, 21.1);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(21.1, seconds),
        source: `Semi en ${raceTimes.distanceHalfMarathon}`,
        priority: 3
      });
    }
  }

  // Marathon
  if (raceTimes.distanceMarathon) {
    const seconds = timeToSeconds(raceTimes.distanceMarathon, 42.195);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(42.195, seconds),
        source: `Marathon en ${raceTimes.distanceMarathon}`,
        priority: 4
      });
    }
  }

  if (estimates.length === 0) return null;

  // Plafond VMA réaliste : 25 km/h = élite mondiale, au-delà = erreur de saisie
  const VMA_MAX = 25;
  const VMA_MIN = 8; // En dessous de 8 km/h ce n'est plus de la course

  // Filtrer les VMA aberrantes (erreur de parsing ou saisie)
  const validEstimates = estimates.filter(e => e.vma >= VMA_MIN && e.vma <= VMA_MAX);

  if (validEstimates.length === 0) {
    // Tous les chronos donnent des VMA aberrantes — prendre le plus raisonnable
    console.warn('[VMA] Tous les chronos donnent des VMA hors limites:', estimates.map(e => `${e.source} → ${e.vma.toFixed(1)}`));
    const closest = estimates.reduce((best, e) => {
      const distToBest = Math.abs(best.vma - 16); // 16 km/h = valeur "médiane" raisonnable
      const distToE = Math.abs(e.vma - 16);
      return distToE < distToBest ? e : best;
    });
    return { vma: Math.min(Math.max(closest.vma, VMA_MIN), VMA_MAX), source: `${closest.source} (corrigé)` };
  }

  // Tri par priorité (distance courte = plus fiable)
  validEstimates.sort((a, b) => a.priority - b.priority);

  // Détection d'incohérence entre chronos (> 20% d'écart = incohérent)
  if (validEstimates.length >= 2) {
    const maxVma = Math.max(...validEstimates.map(e => e.vma));
    const minVma = Math.min(...validEstimates.map(e => e.vma));
    if ((maxVma - minVma) / minVma > 0.20) {
      // Écart > 20% : les chronos sont incohérents → prendre uniquement le plus fiable (distance courte)
      console.warn(`[VMA] Chronos incohérents (écart ${(((maxVma - minVma) / minVma) * 100).toFixed(0)}%): ${validEstimates.map(e => `${e.source} → ${e.vma.toFixed(1)}`).join(', ')} → on garde le plus fiable`);
      return validEstimates[0]; // Le mieux classé par priorité (distance la plus courte)
    }
    // Chronos cohérents : moyenne pondérée
    const weighted = validEstimates.slice(0, 2);
    const avgVma = (weighted[0].vma * 0.6 + weighted[1].vma * 0.4);
    return {
      vma: avgVma,
      source: `Moyenne ${weighted[0].source} et ${weighted[1].source}`
    };
  }

  return validEstimates[0];
};


const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("Clé API Gemini manquante (VITE_GEMINI_API_KEY).");
    throw new Error("Clé API Gemini non configurée.");
  }
  return key;
};

// ============================================
// POST-PROCESSING QUALITÉ — Fonctions partagées
// ============================================

/**
 * Corrige le tutoiement/vouvoiement dans un texte.
 * Gemini utilise parfois "vous/votre" au lieu de "tu/ton".
 */
const forceTutoiement = (text: string): string => {
  if (!text) return text;

  // Table des impératifs vous → tu (couvre tous les verbes vus dans les plans Gemini)
  // Note : \b ne fonctionne pas avec les accents en JS, on utilise (?<=^|[\s'"-]) et (?=[\s,.:;!?'"-]|$)
  const imperatives: [string, string][] = [
    // 1er groupe (-ez → -e)
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
    // 2e/3e groupe irréguliers
    ['soyez', 'sois'], ['faites', 'fais'], ['prenez', 'prends'],
    ['mettez', 'mets'], ['courez', 'cours'], ['partez', 'pars'],
    ['sentez', 'sens'], ['maintenez', 'maintiens'], ['finissez', 'finis'],
    ['réduisez', 'réduis'], ['ressentez', 'ressens'],
    ['surveillez', 'surveille'], ['préférez', 'préfère'],
    ['raccourcissez', 'raccourcis'], ['concentrez', 'concentre'],
    ['arrêtez', 'arrête'], ['adaptez', 'adapte'], ['hydratez', 'hydrate'],
    ['privilégiez', 'privilégie'], ['gérez', 'gère'], ['descendez', 'descends'],
    ['montez', 'monte'], ['poussez', 'pousse'], ['ajustez', 'ajuste'],
    ['respirez', 'respire'], ['pensez', 'pense'], ['reposez', 'repose'],
    ['buvez', 'bois'], ['appuyez', 'appuie'],
    // Formes avec n'...ez
    ["n'hésitez", "n'hésite"], ["n'oubliez", "n'oublie"],
  ];

  // Helper : construit un regex qui fonctionne avec les accents (pas de \b)
  const wordRegex = (word: string, flags = 'g') =>
    new RegExp(`(?<=^|[\\s'"(\\-])${word}(?=[\\s,.:;!?'"()\\-]|$)`, flags);

  let result = text;

  // 1. Réfléchi impératif : "-vous" → "-toi"
  result = result.replace(/-vous(?=\s|[,.:;!?'"]|$)/g, '-toi');

  // 2. Préposition + (adverbe optionnel) + vous : "pour vous", "de bien vous" → "te"
  result = result.replace(
    /\b(pour|de|en|à|sans|chez|sur)\s+(?:(bien|mieux|très|aussi|ne\s+pas)\s+)?vous\b/gi,
    (match, prep, adv) => adv ? `${prep} ${adv} te` : `${prep} te`
  );

  // 3. Pronom objet après sujet/conjonction : "nous vous", "qui vous", etc.
  result = result.replace(
    /\b(nous|je|j'|on|qui|il|elle|ce|cela|ça)\s+vous\b/gi,
    (match, before) => `${before} te`
  );

  // 4. Possessifs
  result = result.replace(/\bVotre\b/g, 'Ton').replace(/\bvotre\b/g, 'ton');
  result = result.replace(/\bVos\b/g, 'Tes').replace(/\bvos\b/g, 'tes');

  // 5. Conjugaisons impératives (minuscule + majuscule)
  for (const [vous, tu] of imperatives) {
    try {
      result = result.replace(wordRegex(vous), tu);
      const vousUp = vous.charAt(0).toUpperCase() + vous.slice(1);
      const tuUp = tu.charAt(0).toUpperCase() + tu.slice(1);
      result = result.replace(wordRegex(vousUp), tuUp);
    } catch {
      // Fallback sans lookbehind si regex échoue
      result = result.replace(new RegExp(vous, 'gi'), (m) =>
        m[0] === m[0].toUpperCase() ? tu.charAt(0).toUpperCase() + tu.slice(1) : tu
      );
    }
  }

  // 5b. Catch-all impératifs 1er groupe en -ez non listés → -e (fonctionne pour 90% des verbes)
  // Ex: "surveillez" → "surveille", "adaptez" → "adapte"
  // Ne transforme PAS les -issez (2e groupe) ni les irréguliers déjà traités
  result = result.replace(/(?<=^|[\s'"(\-])([A-Za-zÀ-ÿ]+)ez(?=[\s,.:;!?'"()\-]|$)/g, (match, stem) => {
    // Skip si c'est un mot qui ne doit pas être transformé (noms, etc.)
    const skipWords = ['chez', 'assez', 'rez', 'nez'];
    if (skipWords.includes(match.toLowerCase())) return match;
    // Skip si déjà dans la liste des impératifs (déjà traité)
    return stem + 'e';
  });

  // 6. Sujet "vous" → "tu" (filet de sécurité, en dernier)
  result = result.replace(/\bVous\b/g, 'Tu').replace(/\bvous\b/g, 'tu');

  // 7. Élision : "te " devant voyelle ou h muet → "t'"
  result = result.replace(/\bte ([aeéèêiïoôuùûyhà])/gi, "t'$1");

  // 8. Formes hybrides cassées par Gemini (tutoiement + vouvoiement mélangés)
  // "tu devez" → "tu dois", "tu pouvez" → "tu peux", etc.
  const hybridFixes: [RegExp, string][] = [
    [/\btu devez\b/gi, 'tu dois'],
    [/\btu pouvez\b/gi, 'tu peux'],
    [/\btu avez\b/gi, 'tu as'],
    [/\btu allez\b/gi, 'tu vas'],
    [/\btu êtes\b/gi, 'tu es'],
    [/\btu voulez\b/gi, 'tu veux'],
    [/\btu savez\b/gi, 'tu sais'],
    [/\btu venez\b/gi, 'tu viens'],
    [/\btu prenez\b/gi, 'tu prends'],
    [/\btu faites\b/gi, 'tu fais'],
    [/\btu ressentez\b/gi, 'tu ressens'],
    // "doit tu/te alerter" → "doit t'alerter"
    [/\bdoit\s+tu\s+/gi, "doit t'"],
    // "Ne tu préoccupez pas" → "Ne te préoccupe pas"
    [/\bNe tu (\w+)ez\b/gi, 'Ne te $1e'],
    [/\bne tu (\w+)ez\b/gi, 'ne te $1e'],
    // "C'est ton sortie" → "C'est ta sortie" (noms féminins avec "ton" au lieu de "ta")
    [/\bton sortie\b/gi, 'ta sortie'],
    [/\bton course\b/gi, 'ta course'],
    [/\bton séance\b/gi, 'ta séance'],
    [/\bton vitesse\b/gi, 'ta vitesse'],
    [/\bton forme\b/gi, 'ta forme'],
    [/\bton progression\b/gi, 'ta progression'],
    [/\bton base\b/gi, 'ta base'],
    [/\bton foulée\b/gi, 'ta foulée'],
    [/\bton endurance\b/gi, 'ton endurance'], // "endurance" commence par voyelle → "ton" est correct
    [/\bton meilleure\b/gi, 'ta meilleure'],
    [/\bton prochaine\b/gi, 'ta prochaine'],
    [/\bton première\b/gi, 'ta première'],
    [/\bton dernière\b/gi, 'ta dernière'],
    // "Ne cherchez pas" → "Ne cherche pas" (vouvoiement résiduel impératif négatif)
    [/\bNe cherchez pas\b/g, 'Ne cherche pas'],
    [/\bne cherchez pas\b/g, 'ne cherche pas'],
    // "Cette séance tu initie" → "Cette séance t'initie"
    [/\btu initie\b/gi, "t'initie"],
    [/\btu aide\b/gi, "t'aide"],
    [/\btu amène\b/gi, "t'amène"],
    [/\btu apprend\b/gi, "t'apprend"],
    // "préoccupez-tu" → "préoccupe-toi"
    [/(\w+)ez-tu\b/gi, '$1e-toi'],
    // "allez-y" → "vas-y"
    [/\ballez-y\b/gi, 'vas-y'],
    [/\bAllez-y\b/g, 'Vas-y'],
    // "arrêt'immédiatement" → "arrête immédiatement" (élision cassée)
    [/\barrêt'imm/gi, 'arrête imm'],
    // Noms féminins avec "ton" au lieu de "ta"
    [/\bton cheville\b/gi, 'ta cheville'],
    [/\bton douleur\b/gi, 'ta douleur'],
    [/\bton respiration\b/gi, 'ta respiration'],
    [/\bton récupération\b/gi, 'ta récupération'],
    [/\bton performance\b/gi, 'ta performance'],
    [/\bton préparation\b/gi, 'ta préparation'],
    [/\bton posture\b/gi, 'ta posture'],
    [/\bton technique\b/gi, 'ta technique'],
    [/\bton condition\b/gi, 'ta condition'],
    [/\bton allure\b/gi, 'ton allure'], // allure = voyelle → "ton" est correct
    // "ton + nom féminin" catch-all pour les plus courants restants
    [/\bton jambe\b/gi, 'ta jambe'],
    [/\bton hanche\b/gi, 'ta hanche'],
    [/\bton cuisse\b/gi, 'ta cuisse'],
    [/\bton blessure\b/gi, 'ta blessure'],
    [/\bton fatigue\b/gi, 'ta fatigue'],
    [/\bton capacité\b/gi, 'ta capacité'],
    [/\bton sensation\b/gi, 'ta sensation'],
    [/\bton puissance\b/gi, 'ta puissance'],
    // Formes mal conjuguées par Gemini
    [/\btu pouve\b/gi, 'tu peux'],
    [/\btu peut\b/gi, 'tu peux'],
    // Élisions cassées par Gemini
    [/\bcôt'/g, 'côte'],
    [/\bCompléte\b/g, 'Complète'],
    [/\bcompléte\b/g, 'complète'],
    // "Ne tu mets pas" → "Ne te mets pas"
    [/\bNe tu mets pas\b/gi, 'Ne te mets pas'],
    [/\bNe tu met pas\b/gi, 'Ne te met pas'],
  ];
  for (const [pattern, replacement] of hybridFixes) {
    result = result.replace(pattern, replacement);
  }

  return result;
};

// ─── correctFrenchWithAI : SUPPRIMÉE Sprint 4 (2026-05-19) ───────────────────
// Pourquoi cette fonction existait : passe finale LLM (gemini-2.5-flash) pour
// rattraper les fautes de français/tutoiement que les regex déterministes
// auraient ratées. Patchait welcomeMessage, feasibility.message, weeks[].weekGoal,
// et pour chaque session : warmup, mainSet, cooldown, advice. Coût : ~7-10s P95
// supplémentaires sur le chemin critique UX preview + 1 appel LLM additionnel.
//
// Pourquoi on la supprime :
// 1. `forceTutoiement` (L308-487) fait DÉJÀ 90% du boulot en regex déterministes
//    (180L : impératifs, accords féminins, élisions, conjugaisons hybrides cassées,
//    formes négatives). Appliqué exhaustivement dans postProcessWeekQuality sur
//    chaque mainSet/advice/warmup/cooldown + welcomeMessage/feasibility (L4175-4177).
// 2. Sur 27 profils audités (Sprint 1+2+3) : 1 seule faute observée
//    (AUDIT-WOZNIAKMAEVA.md:233 "Tu introduire" = conjugaison futur). Pas dans
//    le scope du prompt LLM de correctFrench (qui ciblait accords/tutoiement/élision).
// 3. 3-flash > 2.5-flash en français natif (+60 ELO) → moins de fautes générées
//    en amont, donc moins de rattrapages nécessaires.
// 4. Gain latence preview : -7 à -10s P95 sur le chemin critique UX.
// 5. Gain coût : marginal ($1.05/mois sur 100 plans).
//
// Cf AUDIT-UTILITE-7-APPELS-LLM.md §#3 pour le détail complet.

/**
 * P1f (audit fin 2026-05-20) — Extrait le ratio "course / total" d'un mainSet
 * Marche/Course (ex : "8 × (2 min course + 1 min marche)" → 2/3 = 0.667).
 *
 * Retourne null si pas de pattern détecté (fallback ratio par défaut côté caller).
 * Le pattern accepte course/marche dans n'importe quel ordre.
 */
export const extractRunRatio = (mainSet: string): number | null => {
  if (!mainSet || typeof mainSet !== 'string') return null;
  // Pattern principal : "X min course + Y min marche" ou "X min marche + Y min course"
  const m1 = mainSet.match(/(\d+)\s*min\s*course\s*[+\-/]\s*(\d+)\s*min\s*marche/i);
  if (m1) {
    const run = parseInt(m1[1]);
    const walk = parseInt(m1[2]);
    if (run > 0 && walk > 0) return run / (run + walk);
  }
  const m2 = mainSet.match(/(\d+)\s*min\s*marche\s*[+\-/]\s*(\d+)\s*min\s*course/i);
  if (m2) {
    const walk = parseInt(m2[1]);
    const run = parseInt(m2[2]);
    if (run > 0 && walk > 0) return run / (run + walk);
  }
  // Pattern alternatif (séparateur "/" sans "+") : "2 min / 1 min"
  const m3 = mainSet.match(/(\d+)\s*min\s*(?:course|run)[^,.;]*?\/[^,.;]*?(\d+)\s*min\s*(?:marche|walk)/i);
  if (m3) {
    const run = parseInt(m3[1]);
    const walk = parseInt(m3[2]);
    if (run > 0 && walk > 0) return run / (run + walk);
  }
  return null;
};

/**
 * Recalcule la distance d'une séance à partir de la durée et du targetPace.
 * Corrige les erreurs fréquentes de Gemini sur les distances (surtout à pace lent).
 *
 * P1f (2026-05-20) : pour les séances Marche/Course, la distance "réelle" courue
 * doit être pondérée par le ratio temps couru / temps total (sinon on affiche
 * 6.6 km comme Lilian alors que seulement ~4 km étaient effectivement courus).
 */
export const recalculateSessionDistance = (session: any): void => {
  if (session.type === 'Renforcement') return;
  if (!session.duration || !session.targetPace) return;

  // Parser la durée en minutes
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

  // Parser le pace en min/km
  const paceStr = session.targetPace.toString();
  const paceParts = paceStr.split(':').map(Number);
  let paceMinPerKm = 0;
  if (paceParts.length === 2 && !isNaN(paceParts[0]) && !isNaN(paceParts[1])) {
    paceMinPerKm = paceParts[0] + paceParts[1] / 60;
  }
  if (paceMinPerKm <= 0) return;

  // ─── P1f : Ratio run/walk pour Marche/Course ───
  // Sans pondération, une séance "60 min en alternant 2min course + 1min marche"
  // affichait 60 / pace = 6.6 km, alors que la distance courue réelle ≈ 40 / pace = 4.4 km.
  // Bug observé chez Lilian (10K Débutant cv=0) : "6.6 km / 1h00" affiché vs ~4 km réel.
  // Pour Marche/Course, on pondère la distance par le ratio course/total extrait du mainSet.
  // Si pattern non détecté → ratio par défaut 0.6 (heuristique conservatrice :
  // les séances marche-course typiques sont ~2/3 course en moyenne).
  let runRatio = 1; // par défaut : 100% couru
  if (session.type === 'Marche/Course') {
    const extracted = extractRunRatio(session.mainSet || '');
    runRatio = extracted !== null ? extracted : 0.6;
  }

  // Calculer la distance correcte (pondérée par run ratio si Marche/Course)
  const calculatedKm = (durationMinutes / paceMinPerKm) * runRatio;
  const currentKm = parseKm(session.distance);

  // Patch D: tolérance abaissée 20% → 10% pour forcer la cohérence dist × pace = duration
  // (les écarts >10% étaient massifs sur les plans audités, jusqu'à +78%)
  if (currentKm > 0 && Math.abs(calculatedKm - currentKm) / calculatedKm > 0.10) {
    const corrected = Math.round(calculatedKm * 10) / 10;
    const ctx = session.type === 'Marche/Course' ? ` [Marche/Course ratio ${runRatio.toFixed(2)}]` : '';
    console.log(`[PostProcess] Distance corrigée (tol 10%): "${session.title}" ${currentKm}km → ${corrected}km (${durationMinutes}min à ${paceStr}/km)${ctx}`);
    session.distance = `${corrected} km`;
  } else if (!currentKm || currentKm === 0) {
    session.distance = `${Math.round(calculatedKm * 10) / 10} km`;
  }
};

/**
 * Audit Lilian (2026-05-21) — Force `type = 'Marche/Course'` quand le mainSet
 * décrit une alternance run/walk (Galloway Run-Walk-Run) mais que le LLM a
 * laissé le type initial ('Sortie Longue', 'Footing', etc.). L'UI affichait
 * alors le mauvais label.
 *
 * Patterns acceptés (très permissifs pour couvrir aussi Galloway court 30s/30s) :
 *   - "1 min course / 2 min marche", "2 min course + 1 min marche"
 *   - "30s course / 30s marche", "30 sec course / 30 sec marche"
 *   - "alternance course/marche" (texte libre)
 *   - "run/walk", "run-walk" (anglais si LLM mélange)
 *
 * Idempotent : ne re-log pas si type déjà 'Marche/Course'.
 */
const RUN_WALK_PATTERNS: RegExp[] = [
  // X min/sec course (... ) Y min/sec marche  — séparateur libre (/, +, -, "puis", virgule, espaces)
  /\d+\s*(?:min|sec|s)\s*course[\s\S]{0,40}?\d+\s*(?:min|sec|s)\s*marche/i,
  // X min/sec marche (... ) Y min/sec course — ordre inversé
  /\d+\s*(?:min|sec|s)\s*marche[\s\S]{0,40}?\d+\s*(?:min|sec|s)\s*course/i,
  // Texte libre : "alternance course/marche", "alternance marche/course"
  /alternance[\s\S]{0,20}?(?:course[\s\S]{0,10}?marche|marche[\s\S]{0,10}?course)/i,
  // Anglais (Galloway natif) : "run/walk", "run-walk", "run walk"
  /run[\s/\-]+walk/i,
];

export const applyMarcheCourseRouting = (week: any): void => {
  if (!week || !Array.isArray(week.sessions)) return;
  for (const session of week.sessions) {
    if (!session || !session.mainSet || typeof session.mainSet !== 'string') continue;
    if (session.type === 'Marche/Course') continue; // idempotent
    const matches = RUN_WALK_PATTERNS.some((re) => re.test(session.mainSet));
    if (matches) {
      console.log(
        `[Routing] Force type Marche/Course pour session "${session.title || '(sans titre)'}" (mainSet contient pattern run/walk, type initial="${session.type}")`,
      );
      session.type = 'Marche/Course';
    }
  }
};

/**
 * Post-processing qualité complet pour une semaine.
 * Applique : warmup/cooldown allure, distance, tutoiement, weekGoal.
 */
const postProcessWeekQuality = (
  week: any,
  pacesObj: { efPace: string; recoveryPace: string; vmaPace: string; seuilPace?: string } | null,
  defaultWeekGoal?: string,
  planGoal?: string,
  trailDistance?: number,
): void => {
  // weekGoal
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

  // Fix type "Running" générique → mapper vers le bon type basé sur le titre
  week.sessions.forEach((s: any) => {
    if (s.type === 'Running' || s.type === 'running') {
      const title = (s.title || '').toLowerCase();
      if (title.includes('sortie longue') || title.includes('long run')) {
        s.type = 'Sortie Longue';
      } else if (title.includes('fractionn') || title.includes('vma') || title.includes('seuil') || title.includes('intervalle') || title.includes('fartlek')) {
        s.type = 'Fractionné';
      } else if (title.includes('récup') || title.includes('recup')) {
        s.type = 'Récupération';
      } else if (title.includes('marche') && title.includes('course')) {
        s.type = 'Marche/Course';
      } else {
        s.type = 'Jogging';
      }
    }
  });

  // Safety net : pas de seuil/fractionné/VMA en phase fondamentale ou récupération
  const phase = (week.phase || '').toLowerCase();
  if (phase === 'fondamental' || phase === 'recuperation') {
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement') return;
      const title = (s.title || '').toLowerCase();
      const isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === 'Fractionné';
      if (isSeuil && pacesObj) {
        console.log(`[PostProcess] Phase ${phase}: converting "${s.title}" to footing EF`);
        s.title = phase === 'recuperation' ? 'Footing de Récupération Active' : "Footing d'Endurance Fondamentale";
        s.type = 'Jogging';
        s.intensity = phase === 'recuperation' ? 'Très facile' : 'Facile';
        s.targetPace = pacesObj.efPace;
        s.mainSet = `${Math.max(parseDurationMin(s.duration) - 15, 30)} min en Endurance Fondamentale (${pacesObj.efPace} min/km).`;
        s.warmup = `10 min de footing léger à ${pacesObj.recoveryPace} min/km`;
        s.cooldown = `5 min de retour au calme en marchant. (à ${pacesObj.recoveryPace} min/km)`;
      }
    });
  }

  // La diversification des footings est gérée par footingVariants.ts (injecté avant
  // postProcess). Pas de dédup ici : l'ancien bloc réécrivait titre + mainSet sans
  // toucher warmup/cooldown/advice, ce qui créait des séances incohérentes sur les
  // profils contraints (une seule variante éligible → 2 titres identiques → dédup).

  week.sessions.forEach((session: any) => {
    // Tutoiement : appliquer à TOUTES les séances (y compris Renforcement)
    if (session.advice) session.advice = forceTutoiement(session.advice);
    if (session.warmup) session.warmup = forceTutoiement(session.warmup);
    if (session.cooldown) session.cooldown = forceTutoiement(session.cooldown);
    if (session.mainSet) session.mainSet = forceTutoiement(session.mainSet);

    // Sanitize elevationGain : forcer en nombre, supprimer le texte
    if (session.elevationGain !== undefined && session.elevationGain !== null) {
      const parsed = typeof session.elevationGain === 'number' ? session.elevationGain : parseInt(String(session.elevationGain), 10);
      session.elevationGain = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    if (session.type === 'Renforcement') return;

    // Warmup : injecter allure si absente
    if (pacesObj) {
      if (!session.warmup || session.warmup.trim().length < 5) {
        session.warmup = `10 min de footing léger à ${pacesObj.recoveryPace} min/km + gammes éducatives`;
      } else if (!session.warmup.includes('min/km')) {
        session.warmup = session.warmup.replace(
          /(\d+)\s*min(?:utes?)?\s*(de\s+)?(?:marche\s+rapide|footing|échauffement|marche)/i,
          `$&, à ${pacesObj.recoveryPace} min/km`,
        );
        // Si le replace n'a rien changé (pas de match), forcer l'allure
        if (!session.warmup.includes('min/km')) {
          session.warmup += ` (à ${pacesObj.recoveryPace} min/km)`;
        }
      }
    }

    // Cooldown : injecter allure si absente
    if (pacesObj) {
      if (!session.cooldown || session.cooldown.trim().length < 5) {
        session.cooldown = `10 min de retour au calme à ${pacesObj.recoveryPace} min/km + étirements`;
      } else if (!session.cooldown.includes('min/km')) {
        session.cooldown += ` (à ${pacesObj.recoveryPace} min/km)`;
      }
    }

    // MainSet : injecter allure si absente
    if (pacesObj && session.mainSet && !session.mainSet.includes('min/km')) {
      const paceMap: Record<string, string> = {
        'Jogging': pacesObj.efPace,
        'Récupération': pacesObj.recoveryPace,
        'Sortie Longue': pacesObj.efPace,
        'Marche/Course': pacesObj.recoveryPace,
      };
      const p = paceMap[session.type];
      if (p) session.mainSet += ` (allure : ${p} min/km)`;
    }

    // targetPace : remplir si vide
    if (!session.targetPace && pacesObj) {
      const paceForType: Record<string, string> = {
        'Jogging': pacesObj.efPace,
        'Récupération': pacesObj.recoveryPace,
        'Sortie Longue': pacesObj.efPace,
        'Marche/Course': pacesObj.recoveryPace,
        'Fractionné': pacesObj.vmaPace,
      };
      // Patch C: Fractionné avec intensité Facile/Modéré = fartlek doux, pas vraie VMA
      // → assigner EF pace plutôt que VMA pace pour éviter le mismatch séance/allure
      const isFartlekDoux = session.type === 'Fractionné' &&
        /facile|moder/i.test((session.intensity || '').normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (isFartlekDoux) {
        session.targetPace = pacesObj.efPace;
      } else {
        session.targetPace = paceForType[session.type] || pacesObj.efPace;
      }
    }

    // Distance : recalculer si incohérente
    recalculateSessionDistance(session);

  });

  // ══════════════════════════════════════════════════════════════
  // GARDE-FOU : max 1 SL par semaine (sauf Trail 70km+ back-to-back en phase spécifique)
  // Si 2+ SL détectées, garder la plus longue, convertir les autres en Jogging
  // Exception : ultra-trail 70km+ en phase spécifique/développement → autoriser max 2 SL (back-to-back sam/dim)
  // ══════════════════════════════════════════════════════════════
  const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const isUltraTrailPhase = (trailDistance || 0) >= 70 &&
    ['specifique', 'spécifique', 'developpement', 'développement'].includes((week.phase || '').toLowerCase()) &&
    !week.isRecoveryWeek;

  const slSessions = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' || s.type === 'Sortie longue' ||
    /sortie\s*longue/i.test(s.type || '') || /sortie\s*longue/i.test(s.title || '')
  );
  if (slSessions.length >= 2) {
    if (isUltraTrailPhase && slSessions.length === 2) {
      // Back-to-back autorisé : vérifier que c'est bien samedi/dimanche et capper la 2e sortie
      slSessions.sort((a: any, b: any) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      const longer = slSessions[0];
      const shorter = slSessions[1];
      const shorterDur = parseDurationMin(shorter.duration);
      const longerDur = parseDurationMin(longer.duration);

      // Garde-fou sécurité : la 2e sortie ne doit pas dépasser 60% de la 1ère (prévention blessure)
      const maxBackToBackDur = Math.min(Math.round(longerDur * 0.6), 150); // Cap absolu 2h30
      if (shorterDur > maxBackToBackDur) {
        shorter.duration = maxBackToBackDur >= 60 ? `${Math.floor(maxBackToBackDur / 60)}h${maxBackToBackDur % 60 > 0 ? (maxBackToBackDur % 60).toString().padStart(2, '0') : ''}` : `${maxBackToBackDur} min`;
        recalculateSessionDistance(shorter);
        console.log(`[PostProcess] Back-to-back ultra: 2e SL cappée à ${maxBackToBackDur}min (60% de la 1ère ou 2h30 max)`);
      }
      // La 2e sortie doit être en intensité Facile/Modéré (pas Difficile)
      if (shorter.intensity === 'Difficile') {
        shorter.intensity = 'Modéré';
      }
      console.log(`[PostProcess] Back-to-back ultra autorisé: "${longer.title}" + "${shorter.title}"`);
    } else {
      // Hors ultra ou 3+ SL : comportement normal, garder la plus longue
      slSessions.sort((a: any, b: any) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      for (let i = 1; i < slSessions.length; i++) {
        const extra = slSessions[i];
        console.warn(`[PostProcess] ${slSessions.length} SL détectées → "${extra.title}" converti en Jogging EF`);
        extra.type = 'Jogging';
        extra._dedupedFromSL = true; // Marker pour empêcher l'enforcer de retaper en SL
        extra.intensity = 'Facile';
        const oldTitle = extra.title || '';
        if (!/footing/i.test(oldTitle)) extra.title = "Footing d'Endurance Fondamentale";
        // Cap à 60min pour un footing converti
        const dur = parseDurationMin(extra.duration);
        if (dur > 60) {
          extra.duration = '50 min';
          if (pacesObj) {
            extra.mainSet = `40 min de course en endurance fondamentale à ${pacesObj.efPace} min/km. Maintiens une allure confortable.`;
            extra.warmup = `5 min de footing léger à ${pacesObj.recoveryPace} min/km`;
            extra.cooldown = `5 min de retour au calme à ${pacesObj.recoveryPace} min/km + étirements`;
          }
        }
        if (pacesObj) extra.targetPace = pacesObj.efPace;
        recalculateSessionDistance(extra);
      }
    }
  }

  // GARDE-FOU : pas de 2 séances longues sur jours consécutifs (sauf back-to-back ultra autorisé)
  const longSessions = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' || (s.duration && parseDurationMin(s.duration) >= 90 &&
      !['Fractionné', 'VMA', 'Intervalle', 'Seuil', 'Renforcement', 'Repos'].some((t: string) => (s.type || '').includes(t)))
  );
  if (longSessions.length >= 2 && !isUltraTrailPhase) {
    longSessions.sort((a: any, b: any) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
    for (let i = 0; i < longSessions.length - 1; i++) {
      const dayA = DAYS_ORDER.indexOf(longSessions[i].day);
      const dayB = DAYS_ORDER.indexOf(longSessions[i + 1].day);
      if (dayB - dayA <= 1 || (dayA === 6 && dayB === 0)) {
        const shorter = parseDurationMin(longSessions[i].duration) <= parseDurationMin(longSessions[i + 1].duration)
          ? longSessions[i] : longSessions[i + 1];
        console.warn(`[PostProcess] 2 séances longues consécutives (${longSessions[i].day} + ${longSessions[i + 1].day}) → "${shorter.title}" converti en récupération`);
        shorter.type = 'Récupération';
        shorter._dedupedFromSL = true; // Empêcher l'enforcer de retaper en SL
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

// ══════════════════════════════════════════════════════════════
// POST-PROCESSING DÉTERMINISTE — ENFORCEMENT VOLUMES & DURÉES
// ══════════════════════════════════════════════════════════════

/** Max km par séance selon objectif × niveau */
const MAX_SESSION_KM: Record<string, Record<string, number>> = {
  '5K':        { deb: 12, inter: 18, conf: 22, expert: 25 },
  '10K':       { deb: 15, inter: 22, conf: 25, expert: 28 },
  'Semi':      { deb: 18, inter: 22, conf: 25, expert: 28 },
  'Marathon':  { deb: 25, inter: 32, conf: 35, expert: 38 },
  'VK':        { deb: 10, inter: 14, conf: 16, expert: 18 },
  'TrailSteep':{ deb: 12, inter: 16, conf: 20, expert: 22 },
  'Trail<30':  { deb: 18, inter: 22, conf: 25, expert: 30 },
  'Trail30+':  { deb: 25, inter: 32, conf: 35, expert: 45 },
  'Trail60+':  { deb: 30, inter: 40, conf: 50, expert: 55 },
  'Trail100+': { deb: 40, inter: 55, conf: 65, expert: 70 },
  'Hyrox':     { deb: 8,  inter: 12, conf: 14, expert: 15 },
  'PertePoids':{ deb: 8,  inter: 12, conf: 14, expert: 15 },
  'Maintien':  { deb: 10, inter: 15, conf: 17, expert: 18 },
};


/** True si l'utilisateur n'a pas saisi de chrono cible (mode Finisher) */
export const isFinisherTarget = (t?: string): boolean => {
  const trimmed = (t || '').trim();
  if (!trimmed) return true;
  if (/^finisher$/i.test(trimmed)) return true;
  return !/\d/.test(trimmed);
};

/**
 * P1-7 (2026-05-21, bug floggyz 30 sem 10K) — Cap planDurationWeeks par objectif.
 *
 * Avant : `planDurationWeeks = max(4, min(30, diffWeeks))` global.
 * Floggyz 10K Finisher Expert raceDate +30 sem → plan 30 sem (excessif pour 10K).
 *
 * Après : table de caps par distance route :
 *   5K       → 10 sem max
 *   10K      → 16 sem max
 *   Semi     → 20 sem max
 *   Marathon → 24 sem max
 *   Trail / Hyrox / Perte de poids / Maintien : conservent 30 sem (inchangé).
 *
 * Si `diffWeeks > cap`, on décale le startDate pour que le plan finisse à la course.
 */
export interface ComputePlanDurationParams {
  subGoal?: string;
  raceDate?: string;
  startDate?: string;
}
export interface ComputePlanDurationResult {
  planDurationWeeks: number;
  cap: number;
  diffWeeks: number;
  adjustedStartDate?: string;
}

const PLAN_DURATION_MAX_WEEKS_BY_GOAL: Record<string, number> = {
  '5 km': 10,
  '10 km': 16,
  'Semi-Marathon': 20,
  'Marathon': 24,
};
const PLAN_DURATION_DEFAULT_CAP = 30;

export const computePlanDurationWeeks = (params: ComputePlanDurationParams): ComputePlanDurationResult => {
  const cap = (params.subGoal && PLAN_DURATION_MAX_WEEKS_BY_GOAL[params.subGoal]) ?? PLAN_DURATION_DEFAULT_CAP;
  if (!params.raceDate) {
    return { planDurationWeeks: 12, cap, diffWeeks: 0 };
  }
  const raceDate = new Date(params.raceDate);
  const startDate = params.startDate ? new Date(params.startDate) : new Date();
  const diffTime = raceDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const diffWeeks = Math.ceil(diffDays / 7); // ceil pour ne jamais couper la dernière semaine
  const planDurationWeeks = Math.max(4, Math.min(cap, diffWeeks));
  let adjustedStartDate: string | undefined;
  if (diffWeeks > cap) {
    const newStartDate = new Date(raceDate.getTime() - cap * 7 * 24 * 60 * 60 * 1000);
    adjustedStartDate = newStartDate.toISOString().split('T')[0];
  }
  return { planDurationWeeks, cap, diffWeeks, adjustedStartDate };
};

/** Convertit un label niveau libre en clé canonique. Tolère casse, accents, espaces. */
const labelToLevelKey = (label?: string): 'deb' | 'inter' | 'conf' | 'expert' => {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition')) return 'conf';
  return 'inter';
};

/** Mapping inverse : clé → label canonique pour affichage / passage aux fonctions qui attendent un label complet */
const LEVEL_LABEL: Record<'deb' | 'inter' | 'conf' | 'expert', string> = {
  deb: 'Débutant (0-1 an)',
  inter: 'Intermédiaire (Régulier)',
  conf: 'Confirmé (Compétition)',
  expert: 'Expert (Performance)',
};

/**
 * Garantit que la Sortie Longue de la semaine est placée sur le jour préféré.
 * Détection SL élargie (type, titre, durée) pour attraper les SL mistypées.
 * Si la SL est sur le mauvais jour, swap avec la séance qui occupe le jour cible.
 * Idempotent : safe à appeler plusieurs fois.
 *
 * PATCH 2026-05-16 : dédup si plusieurs séances étiquetées "Sortie Longue" dans la même semaine.
 * Cas Clément : Mardi 12.2km SL + Dimanche 7.5km SL → garde la plus longue (12.2km) comme SL officielle,
 * retype les autres en Jogging avec flag _dedupedFromSL.
 */
export const enforceSLDay = (week: any, preferredLongRunDay: string, logPrefix = ''): boolean => {
  if (!week?.sessions || !Array.isArray(week.sessions)) return false;

  // Race-day guard (Sprint Marathon 2026-05-19) : si la semaine contient une
  // séance race-day injectée par raceDayInject (Course officielle le jour J),
  // on ne touche pas à cette semaine — la course remplace la SL et c'est voulu.
  if (week.sessions.find((s: any) => s._raceDay === true)) {
    return false;
  }

  // 1. Trouve TOUTES les séances étiquetées Sortie Longue
  const allSL = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' ||
    /sortie\s*longue|long\s*run/i.test(s.title || '')
  );

  if (allSL.length === 0) return false;

  // 2. Dédup si > 1 : garde la plus longue (distance, sinon durée)
  let officialSL: any;
  if (allSL.length > 1) {
    officialSL = [...allSL].sort((a: any, b: any) => {
      const da = parseKm(a.distance);
      const db = parseKm(b.distance);
      if (db !== da) return db - da;
      return parseDurationMin(b.duration) - parseDurationMin(a.duration);
    })[0];
    for (const other of allSL) {
      if (other === officialSL) continue;
      console.log(`${logPrefix}S${week.weekNumber} Dédup SL: "${other.title || other.type}" (${other.distance || '?'}) retypé Jogging`);
      other.type = 'Jogging';
      other.title = (other.title || '').replace(/Sortie\s*Longue|Long\s*Run/gi, 'Footing').trim() || 'Footing';
      other._dedupedFromSL = true;
    }
  } else {
    officialSL = allSL[0];
  }

  // 3. Déjà sur le bon jour ? rien à faire
  if (officialSL.day === preferredLongRunDay) return true;

  // 4. Swap avec occupant
  const occupant = week.sessions.find((s: any) => s.day === preferredLongRunDay && s !== officialSL);
  if (occupant) {
    console.log(`${logPrefix}S${week.weekNumber} Swap SL: "${officialSL.day}" ↔ "${occupant.day}" (${occupant.title || occupant.type})`);
    occupant.day = officialSL.day;
  }
  console.log(`${logPrefix}S${week.weekNumber} SL forcée sur ${preferredLongRunDay}`);
  officialSL.day = preferredLongRunDay;
  return true;
};

/**
 * Aligne l'allure spécifique de la course (5k/10k/semi/marathon) sur le CHRONO CIBLE saisi.
 * DOCTRINE PRODUIT : le plan respecte la cible chrono user, même si ambitieuse.
 * Signal d'irréalisme porté par score+welcome, pas par l'allure.
 *
 * SAFEGUARD : si cible > 98% VMA pure → physiologiquement infaisable → garde allure potentiel.
 * (Évite des allures dégénérées pour des cibles impossibles ; warning porté ailleurs.)
 *
 * Remplace l'ancien `if (targetPaceSec > currentPaceSec)` asymétrique qui ne fonctionnait
 * que pour les cibles plus LENTES que le potentiel VMA (bug Clément : cible 5:41 < potentiel 5:49
 * → l'override ne se déclenchait pas → plan préparait 2h02 au lieu de 2h00).
 */
const applyTargetTimeOverride = (paces: TrainingPaces, data: QuestionnaireData, vma: number): void => {
  if (!data.targetTime || !data.subGoal) return;
  // Normalisation : couvre les formats legacy 'Semi-marathon' (m minuscule) potentiels
  const normalizedSubGoal = data.subGoal.toLowerCase().replace(/\s+/g, ' ').trim();
  const raceDistMap: Record<string, { dist: number; paceKey: keyof TrainingPaces }> = {
    '5 km': { dist: 5, paceKey: 'allureSpecifique5k' },
    '10 km': { dist: 10, paceKey: 'allureSpecifique10k' },
    'semi-marathon': { dist: 21.1, paceKey: 'allureSpecifiqueSemi' },
    'marathon': { dist: 42.195, paceKey: 'allureSpecifiqueMarathon' },
  };
  const info = raceDistMap[normalizedSubGoal];
  if (!info) return;

  // ─── Règle "Finisher + PB existant" (Option C, expert FFA 2026-05-18) ───
  // Quand user coche "Finisher" (= pas de chrono visé) ET a déclaré un PB sur la
  // même distance → allure cible = max(allurePB + 5% cushion, allure VMA-based).
  // Logique : Finisher = absence d'allure cible saisie, donc on calibre sur la
  // performance réelle (PB) au lieu d'une allure VMA-based déconnectée. Le
  // cushion +5% évite de faire courir le user à son record en entraînement.
  // Le max() protège aussi le coureur qui a régressé depuis son PB.
  // Cf. [[feedback_finisher_plus_pb_allure]] + [[feedback_input_client_obligatoire]]
  if (data.targetTime === 'Finisher' && data.recentRaceTimes) {
    const pbMap: Record<string, keyof NonNullable<QuestionnaireData['recentRaceTimes']>> = {
      '5 km': 'distance5km',
      '10 km': 'distance10km',
      'semi-marathon': 'distanceSemi',
      'marathon': 'distanceMarathon',
    };
    const pbKey = pbMap[normalizedSubGoal];
    const pbValue = pbKey ? data.recentRaceTimes[pbKey] : undefined;
    if (pbValue) {
      const pbSec = timeToSeconds(pbValue, info.dist);
      if (pbSec > 0) {
        const pbPaceSec = pbSec / info.dist;
        const cushionedPaceSec = pbPaceSec * 1.05; // +5% finisher cushion
        const currentPaceStr = paces[info.paceKey] as string;
        const [vmaMin, vmaSec] = currentPaceStr.split(':').map(Number);
        const vmaBasedPaceSec = (vmaMin || 0) * 60 + (vmaSec || 0);
        const finalPaceSec = Math.max(cushionedPaceSec, vmaBasedPaceSec);
        const finalPaceStr = secondsToPace(finalPaceSec);
        if (currentPaceStr !== finalPaceStr) {
          console.log(`[Paces] Finisher+PB ${data.subGoal} : PB ${pbValue} (${secondsToPace(pbPaceSec)}/km) + 5% cushion → ${secondsToPace(cushionedPaceSec)}, vs VMA-based ${currentPaceStr} → retenu ${finalPaceStr}`);
          (paces as any)[info.paceKey] = finalPaceStr;
        }
      }
      return; // skip suite (mode Finisher : logique chrono ne s'applique pas)
    }
  }

  const targetSec = timeToSeconds(data.targetTime, info.dist);
  if (targetSec === 0) return;
  const targetPaceSec = targetSec / info.dist;
  // DOCTRINE PRODUIT : l'allure suit TOUJOURS la cible chrono du user, sans plafond.
  // Le signal d'irréalisme est porté UNIQUEMENT par feasibility.score + welcome message.
  // Pas de safeguard ici qui modifierait silencieusement l'allure — ce serait trahir l'input user.
  const targetPaceStr = secondsToPace(targetPaceSec);
  const previous = paces[info.paceKey] as string;
  if (previous !== targetPaceStr) {
    const vmaPaceSec = 3600 / vma;
    const ratio = vmaPaceSec / targetPaceSec;
    const ratioInfo = ratio > 1 ? ` (cible = ${(ratio * 100).toFixed(0)}% VMA, ambitieux)` : '';
    console.log(`[Paces] Allure spé ${data.subGoal} : ${previous} → ${targetPaceStr} (cible ${data.targetTime})${ratioInfo}`);
    (paces as any)[info.paceKey] = targetPaceStr;
  }
};

/** Max durée SL en minutes selon objectif × niveau */
const MAX_SL_DURATION: Record<string, Record<string, number>> = {
  '5K':        { deb: 50, inter: 60, conf: 70, expert: 75 },
  '10K':       { deb: 60, inter: 75, conf: 85, expert: 90 },
  'Semi':      { deb: 90, inter: 105, conf: 115, expert: 120 },
  'Marathon':  { deb: 150, inter: 170, conf: 190, expert: 200 },
  'Hyrox':     { deb: 55, inter: 65, conf: 75, expert: 80 },
  'VK':        { deb: 60, inter: 80, conf: 100, expert: 120 },
  'TrailSteep':{ deb: 75, inter: 100, conf: 120, expert: 140 },
  'Trail<30':  { deb: 90, inter: 120, conf: 140, expert: 150 },
  'Trail30+':  { deb: 140, inter: 190, conf: 220, expert: 240 },
  'Trail60+':  { deb: 150, inter: 240, conf: 270, expert: 300 },
  'Trail100+': { deb: 180, inter: 300, conf: 360, expert: 480 },
  'PertePoids':{ deb: 60, inter: 75, conf: 90, expert: 105 },
  'Maintien':  { deb: 50, inter: 70, conf: 80, expert: 90 },
};

/** Max volume hebdomadaire absolu selon objectif × niveau (filet de sécurité) */
const MAX_WEEKLY_VOLUME: Record<string, Record<string, number>> = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  'TrailSteep':{ deb: 25, inter: 35, conf: 45, expert: 55 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 25, inter: 40, conf: 50, expert: 60 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};

/** Proportion minimale que la SL doit représenter dans le volume hebdo, par objectif × niveau */
const MIN_SL_PROPORTION: Record<string, Record<string, number>> = {
  '5K':        { deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
  '10K':       { deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
  'Semi':      { deb: 0.32, inter: 0.32, conf: 0.30, expert: 0.30 },
  'Marathon':  { deb: 0.35, inter: 0.35, conf: 0.33, expert: 0.30 },
  'Hyrox':     { deb: 0.28, inter: 0.28, conf: 0.28, expert: 0.25 },
  'VK':        { deb: 0.28, inter: 0.28, conf: 0.25, expert: 0.25 },
  'TrailSteep':{ deb: 0.30, inter: 0.30, conf: 0.28, expert: 0.28 },
  'Trail<30':  { deb: 0.33, inter: 0.33, conf: 0.30, expert: 0.30 },
  'Trail30+':  { deb: 0.35, inter: 0.35, conf: 0.33, expert: 0.30 },
  'Trail60+':  { deb: 0.38, inter: 0.38, conf: 0.35, expert: 0.33 },
  'Trail100+': { deb: 0.40, inter: 0.40, conf: 0.38, expert: 0.35 },
  'PertePoids':{ deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
  'Maintien':  { deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
};

/** Durée minimale absolue de la SL en minutes, par objectif × niveau */
const MIN_SL_DURATION_MIN: Record<string, Record<string, number>> = {
  '5K':        { deb: 30, inter: 30, conf: 30, expert: 30 },
  '10K':       { deb: 35, inter: 35, conf: 35, expert: 35 },
  'Semi':      { deb: 40, inter: 45, conf: 45, expert: 45 },
  'Marathon':  { deb: 50, inter: 55, conf: 55, expert: 60 },
  'Hyrox':     { deb: 30, inter: 35, conf: 35, expert: 40 },
  'VK':        { deb: 35, inter: 40, conf: 45, expert: 50 },
  'TrailSteep':{ deb: 40, inter: 45, conf: 50, expert: 55 },
  'Trail<30':  { deb: 40, inter: 45, conf: 50, expert: 50 },
  'Trail30+':  { deb: 50, inter: 60, conf: 65, expert: 70 },
  'Trail60+':  { deb: 60, inter: 75, conf: 80, expert: 90 },
  'Trail100+': { deb: 75, inter: 90, conf: 120, expert: 150 },
  'PertePoids':{ deb: 30, inter: 30, conf: 30, expert: 30 },
  'Maintien':  { deb: 30, inter: 35, conf: 35, expert: 35 },
};

/** Détecte l'objectif normalisé à partir des données du questionnaire */
const detectObjectiveFromData = (data: any): string => {
  const goal = (data.goal || '').toLowerCase();
  const sub = (data.subGoal || '').toLowerCase();
  const name = (data.name || '').toLowerCase();
  if (goal.includes('perte')) return 'PertePoids';
  if (goal.includes('hyrox')) return 'Hyrox';
  if (goal.includes('maintien') || goal.includes('remise')) return 'Maintien';
  if (goal.includes('trail') || name.includes('trail')) {
    const td = data.trailDetails?.distance || 0;
    const elev = data.trailDetails?.elevation || 0;
    const ratio = td > 0 ? elev / td : 0;
    // VK et Trail Raide détectés AVANT le cascade de distance
    if (td > 0 && td <= 5 && ratio >= 150) return 'VK';
    if (td > 0 && td <= 15 && ratio >= 80) return 'TrailSteep';
    const hoursMatch = (data.targetTime || '').match(/(\d+)\s*h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    if (td >= 100 || hours >= 16) return 'Trail100+';
    if (td >= 60 || hours >= 10) return 'Trail60+';
    if (td >= 30 || hours >= 4) return 'Trail30+';
    return 'Trail<30';
  }
  if ((sub.includes('marathon') || name.includes('marathon')) && !sub.includes('semi') && !name.includes('semi')) return 'Marathon';
  if (sub.includes('semi') || name.includes('semi')) return 'Semi';
  if (sub.includes('10') || name.includes('10 km') || name.includes('10km')) return '10K';
  if (sub.includes('5') || name.includes('5 km') || name.includes('5km')) return '5K';
  return '10K';
};

/** Seuils minutes pour classification niveau par chrono — [deb_max, inter_max, conf_max] (expert si <=) */
const CHRONO_LEVEL_THRESHOLDS = {
  '10K': { M: [50, 42, 36], F: [60, 50, 42] },
  '5K':  { M: [30, 25, 21], F: [35, 30, 25] },
} as const;

const LEVEL_RANK: Record<string, number> = { deb: 0, inter: 1, conf: 2, expert: 3 };
const LEVEL_NAMES = ['deb', 'inter', 'conf', 'expert'] as const;

function classifyByChrono(seconds: number, dist: '10K' | '5K', isFemale: boolean): string {
  const min = seconds / 60;
  const T = CHRONO_LEVEL_THRESHOLDS[dist][isFemale ? 'F' : 'M'];
  if (min > T[0]) return 'deb';
  if (min > T[1]) return 'inter';
  if (min > T[2]) return 'conf';
  return 'expert';
}

/** Détecte le niveau normalisé — chronos > VMA > déclaratif (avec override sécurité à la baisse) */
export const detectLevelFromData = (data: any): string => {
  const declared = labelToLevelKey(data.level);

  // Fix #5a (2026-05-19) — Préserver niveau déclaré pour senior ≥55 ans.
  // Cas georgeslor1 : Expert 57 ans déclare 10K 1h00 → code rétrogradait à "deb"
  // (10K 1h00 = critère Débutant pour homme jeune). Mais 10K 1h00 à 57 ans = niveau Expert.
  // Les chronos lents en senior reflètent l'âge (déclin VO2max -10%/décennie après 35),
  // PAS le niveau d'entraînement. Si user a coché un niveau ≥ Intermédiaire ET âge ≥ 55,
  // on lui fait confiance. Source : Hammond 2018 "lifelong endurance Masters" + Tanaka 2008.
  const age = data.age || 0;
  if (age >= 55 && declared && declared !== 'deb') {
    console.log(`[detectLevelFromData] Senior ${age}ans niveau déclaré "${declared}" préservé (fix #5a)`);
    return declared;
  }

  // === Override CHRONO : les chronos saisis priment sur déclaratif + VMA estimée ===
  const isFemale = data.sex === 'Femme';
  const c5kSec  = data.recentRaceTimes?.distance5km  ? timeToSeconds(data.recentRaceTimes.distance5km, 5)   : 0;
  const c10kSec = data.recentRaceTimes?.distance10km ? timeToSeconds(data.recentRaceTimes.distance10km, 10) : 0;

  const chronoLevels: string[] = [];
  if (c5kSec > 0)  chronoLevels.push(classifyByChrono(c5kSec, '5K', isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, '10K', isFemale));

  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      console.log(`[Enforce] Chrono override: declared="${declared}" but chronos imply "${chronoLevel}" (5k=${data.recentRaceTimes?.distance5km||'-'}, 10k=${data.recentRaceTimes?.distance10km||'-'}, ${data.sex||'?'})`);
      return chronoLevel;
    }
  }

  // Override par VMA si incohérence flagrante
  // Seuils DIFFÉRENCIÉS par sexe : les femmes ont ~10% de VMA en moins à niveau égal
  // Homme : <11 deb, 11-14 inter, 14-17 conf, >17 expert
  // Femme : <9.5 deb, 9.5-12.5 inter, 12.5-15 conf, >15 expert
  const vma = data.vma || data.estimatedVMA;
  if (vma && vma > 0) {
    const isFemale = data.sex === 'Femme';
    let vmaLevel: string;
    if (isFemale) {
      if (vma < 9.5) vmaLevel = 'deb';
      else if (vma < 12.5) vmaLevel = 'inter';
      else if (vma < 15) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    } else {
      if (vma < 11) vmaLevel = 'deb';
      else if (vma < 14) vmaLevel = 'inter';
      else if (vma < 17) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    }

    const levelRank: Record<string, number> = { deb: 0, inter: 1, conf: 2, expert: 3 };
    const rankNames = ['deb', 'inter', 'conf', 'expert'];
    // Si le niveau déclaré est au-dessus de ce que la VMA indique → baisser
    // VMA < 10 (homme) / < 8.5 (femme) : drop jusqu'à 2 crans
    // Sinon : drop max 1 cran (marge d'erreur possible)
    const gap = levelRank[declared] - levelRank[vmaLevel];
    if (gap >= 1) {
      // VMA basse → drop plus agressif (VMA < 12 homme / < 10.5 femme = clairement pas le niveau déclaré)
      const hardDropThreshold = isFemale ? 10.5 : 12;
      const maxDrop = vma < hardDropThreshold ? 2 : 1;
      const adjustedLevel = rankNames[Math.max(levelRank[declared] - maxDrop, levelRank[vmaLevel])];
      console.log(`[Enforce] Level override: declared="${declared}" but VMA=${vma} (${isFemale ? 'F' : 'M'}) implies "${vmaLevel}" (gap=${gap}, maxDrop=${maxDrop}) → using "${adjustedLevel}"`);
      return adjustedLevel;
    }
  }

  return declared;
};

/**
 * Niveau EFFECTIF sous forme de chaîne, prêt à l'emploi.
 * Croise le niveau déclaré avec la VMA — elle-même issue des chronos passés
 * quand ils existent (voir getBestVMAEstimate). Les chronos priment donc
 * toujours sur le déclaratif. À utiliser partout où le contenu est calibré sur
 * le niveau : renfo, prompt de génération, faisabilité.
 */
export const getEffectiveLevel = (data: any): string => {
  const map: Record<string, string> = {
    deb: 'Débutant (0-1 an)',
    inter: 'Intermédiaire (Régulier)',
    conf: 'Confirmé (Compétition)',
    expert: 'Expert (Performance)',
  };
  return map[detectLevelFromData(data)] || data.level || 'Intermédiaire (Régulier)';
};

/** Format durée en string */
const formatDurationStr = (minutes: number): string => {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${String(m).padStart(2, '0')} min` : `${h}h00`;
  }
  return `${minutes} min`;
};

/**
 * Enforcement déterministe post-Gemini :
 * 1. Recalibre le volume hebdo pour coller à la périodisation (±10%)
 * 2. Cap les sessions individuelles au max km/séance
 * 3. Cap les SL au max durée
 */
export const enforceWeekConstraints = (
  week: any,
  targetVolume: number,
  questionnaireData: any,
  weeklyVolumes?: number[],
  weekIdx?: number,
): void => {
  if (!week.sessions || !Array.isArray(week.sessions)) return;

  const objective = detectObjectiveFromData(questionnaireData);
  const level = detectLevelFromData(questionnaireData);

  // --- 1. Cap SL duration ---
  // Détection SL : par type OU par durée (Gemini génère parfois type="Running" au lieu de "Sortie Longue")
  const slDurRules = MAX_SL_DURATION[objective];
  if (slDurRules) {
    const maxSlDur = slDurRules[level] || slDurRules.inter;
    // Seuil de durée pour considérer une séance comme SL même si mal typée
    // = max SL - 10min (pour attraper les séances longues déguisées)
    const slDurationThreshold = Math.max(maxSlDur - 10, 40);
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos') return;
      const dur = parseDurationMin(s.duration);
      const isSLByType = s.type === 'Sortie Longue';
      const isSLByDuration = dur >= slDurationThreshold &&
        !['Fractionné', 'VMA', 'Intervalle', 'Seuil'].some((t: string) => (s.type || '').includes(t));
      const isSLByTitle = /sortie\s*longue|long\s*run/i.test(s.title || '');

      // Corriger le type si c'est une SL mal typée
      // MAIS ne pas retaper une session déjà dédupliquée (marquée _dedupedFromSL par postProcess)
      if (!isSLByType && (isSLByDuration || isSLByTitle) && dur > maxSlDur * 0.8 && !s._dedupedFromSL) {
        console.log(`[Enforce] Retype: "${s.type}" → "Sortie Longue" (dur=${dur}min, title="${s.title}") [${objective} ${level}]`);
        s.type = 'Sortie Longue';
      }

      if (s.type !== 'Sortie Longue' && !isSLByTitle) return;
      if (dur > maxSlDur) {
        const factor = maxSlDur / dur;
        s.duration = formatDurationStr(maxSlDur);
        const km = parseKm(s.distance);
        if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
        console.log(`[Enforce] SL capped: ${dur}min → ${maxSlDur}min [${objective} ${level}]`);
      }
    });
  }

  // --- 1a-bis. Garde-fou SL minimum en KM selon distance de course ---
  // Le cap en minutes peut produire des SL trop courtes pour les VMA basses
  // On vérifie que la SL max atteint un % minimum de la distance de course
  const raceDistKm = questionnaireData?.trailDetails?.distance ||
    ((questionnaireData?.subGoal || '').toLowerCase().includes('marathon') && !(questionnaireData?.subGoal || '').toLowerCase().includes('semi') ? 42.2 :
     (questionnaireData?.subGoal || '').toLowerCase().includes('semi') ? 21.1 : 0);

  if (raceDistKm > 0) {
    const minSLRatios: Record<string, number> = {
      'Marathon': 0.65,  // SL ≥ 65% = 27.4 km
      'Semi': 0.75,      // SL ≥ 75% = 15.8 km
      'Trail<30': 0.55,  // SL ≥ 55%
      'Trail30+': 0.50,  // SL ≥ 50%
      'Trail60+': 0.40,  // SL ≥ 40%
      'Trail100+': 0.30, // SL ≥ 30%
      '10K': 0.80,       // SL ≥ 80% = 8 km
      '5K': 0.90,        // SL ≥ 90% = 4.5 km
    };
    const minRatio = minSLRatios[objective] || 0.50;
    const minSLKm = Math.round(raceDistKm * minRatio);

    // Trouver la SL dans cette semaine
    const slInWeek = week.sessions.find((s: any) =>
      s.type === 'Sortie Longue' || /sortie\s*longue/i.test(s.type || '') || /sortie\s*longue/i.test(s.title || '')
    );
    if (slInWeek) {
      const slKm = parseKm(slInWeek.distance);
      // Ne booste la SL que si on est en phase spécifique ou pic (pas en fondamental S1)
      const isLatePhase = ['specifique', 'spécifique', 'developpement', 'développement'].includes((week.phase || '').toLowerCase());
      if (slKm > 0 && slKm < minSLKm && isLatePhase) {
        console.log(`[Enforce] SL trop courte: ${slKm}km < ${minSLKm}km (min ${Math.round(minRatio*100)}% de ${raceDistKm}km) → boost`);
        // Ne pas dépasser le cap en minutes converti en km
        const efSpeed = (questionnaireData?.vma || 13) * 0.67; // km/h
        const maxSlKmFromDur = slDurRules ? Math.round((slDurRules[level] || slDurRules.inter) / 60 * efSpeed * 10) / 10 : minSLKm;
        const targetKm = Math.min(minSLKm, maxSlKmFromDur);
        const factor = targetKm / slKm;
        slInWeek.distance = `${targetKm} km`;
        // Ajuster la durée proportionnellement
        const currentDur = parseDurationMin(slInWeek.duration);
        const newDur = Math.round(currentDur * factor);
        slInWeek.duration = formatDurationStr(newDur);
        console.log(`[Enforce] SL boostée: ${slKm}km/${currentDur}min → ${targetKm}km/${newDur}min`);
      }
    }
  }

  // --- 1b. Cap durée max TOUTE séance de course (filet de sécurité) ---
  // Aucune séance non-SL ne devrait dépasser 75% de la durée max SL
  if (slDurRules) {
    const maxSlDur = slDurRules[level] || slDurRules.inter;
    const maxNonSlDur = Math.round(maxSlDur * 0.75);
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos' || s.type === 'Sortie Longue') return;
      const dur = parseDurationMin(s.duration);
      if (dur > maxNonSlDur) {
        const factor = maxNonSlDur / dur;
        s.duration = formatDurationStr(maxNonSlDur);
        const km = parseKm(s.distance);
        if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
        console.log(`[Enforce] Non-SL duration capped: ${dur}min → ${maxNonSlDur}min (${s.type}) [${objective} ${level}]`);
      }
    });
  }

  // --- 1c. Enforce minimum SL proportion and duration ---
  const slProportionRules = MIN_SL_PROPORTION[objective];
  const slMinDurRules = MIN_SL_DURATION_MIN[objective];
  if (slProportionRules && slMinDurRules) {
    const minProportion = slProportionRules[level] || slProportionRules.inter;
    const minSlDur = slMinDurRules[level] || slMinDurRules.inter;

    const runningSessions = week.sessions.filter((s: any) =>
      s.type !== 'Renforcement' && s.type !== 'Repos'
    );

    // Find the SL session
    const slSession = runningSessions.find((s: any) =>
      s.type === 'Sortie Longue' || /sortie\s*longue|long\s*run/i.test(s.title || '')
    );

    if (slSession && runningSessions.length > 1) {
      const slDur = parseDurationMin(slSession.duration);
      const slKm = parseKm(slSession.distance);

      // Calculate total weekly running volume
      const totalKm = runningSessions.reduce((sum: number, s: any) => {
        const km = parseKm(s.distance);
        return sum + km;
      }, 0);

      // Check proportion
      const targetSlKm = totalKm > 0 ? Math.round(totalKm * minProportion * 10) / 10 : 0;

      if (slKm > 0 && totalKm > 0 && slKm < targetSlKm) {
        // SL is under-proportioned — redistribute from other sessions
        const deficit = targetSlKm - slKm;
        const otherRunningSessions = runningSessions.filter((s: any) => s !== slSession);
        const otherTotalKm = otherRunningSessions.reduce((sum: number, s: any) => {
          const km = parseKm(s.distance);
          return sum + km;
        }, 0);

        if (otherTotalKm > 0 && otherRunningSessions.length > 0) {
          // Take proportionally from other sessions
          const reductionFactor = (otherTotalKm - deficit) / otherTotalKm;
          if (reductionFactor >= 0.65) { // Don't reduce others by more than 35%
            otherRunningSessions.forEach((s: any) => {
              const km = parseKm(s.distance);
              if (km > 0) {
                const newKm = Math.round(km * reductionFactor * 10) / 10;
                const dur = parseDurationMin(s.duration);
                if (dur > 0) {
                  s.duration = formatDurationStr(Math.round(dur * reductionFactor));
                }
                s.distance = `${newKm} km`;
              }
            });
            slSession.distance = `${targetSlKm} km`;
            // Adjust SL duration proportionally
            if (slDur > 0) {
              const newSlDur = Math.round(slDur * (targetSlKm / slKm));
              slSession.duration = formatDurationStr(newSlDur);
            }
            console.log(`[Enforce] SL proportion: ${slKm}km → ${targetSlKm}km (${(minProportion*100).toFixed(0)}% of ${totalKm}km) [${objective} ${level}]`);
          }
        }
      }

      // Check minimum duration
      if (slDur > 0 && slDur < minSlDur) {
        const factor = minSlDur / slDur;
        slSession.duration = formatDurationStr(minSlDur);
        if (slKm > 0) {
          slSession.distance = `${Math.round(slKm * factor * 10) / 10} km`;
        }
        console.log(`[Enforce] SL min duration: ${slDur}min → ${minSlDur}min [${objective} ${level}]`);
      }

      // Ensure SL is the longest session
      const maxOtherDur = Math.max(...runningSessions.filter((s: any) => s !== slSession).map((s: any) => parseDurationMin(s.duration)));
      const currentSlDur = parseDurationMin(slSession.duration);
      if (currentSlDur <= maxOtherDur && maxOtherDur > 0) {
        const newSlDur = maxOtherDur + 10; // At least 10 min longer than any other
        const maxAllowed = slDurRules ? (slDurRules[level] || slDurRules.inter) : 180;
        const finalDur = Math.min(newSlDur, maxAllowed);
        if (finalDur > currentSlDur) {
          const factor = finalDur / currentSlDur;
          slSession.duration = formatDurationStr(finalDur);
          const km = parseKm(slSession.distance);
          if (km > 0) slSession.distance = `${Math.round(km * factor * 10) / 10} km`;
          console.log(`[Enforce] SL must be longest: ${currentSlDur}min → ${finalDur}min [${objective} ${level}]`);
        }
      }
    }
  }

  // --- 2. Cap individual session km ---
  const sessionRules = MAX_SESSION_KM[objective];
  if (sessionRules) {
    const maxKm = sessionRules[level] || sessionRules.inter;
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos') return;
      const km = parseKm(s.distance);
      if (km > maxKm) {
        const factor = maxKm / km;
        s.distance = `${maxKm} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        console.log(`[Enforce] Session capped: ${km}km → ${maxKm}km [${objective} ${level}]`);
      }
    });
  }

  // --- 3. D+ sanitize: Zero D+ on track/recovery sessions for trail ---
  // Note: the actual D+ target & distribution is handled by distributeElevationToSessions.
  // This rule only ensures track/recovery sessions never have D+ (safety net).
  const isTrail = objective.startsWith('Trail') || objective === 'VK' || objective === 'TrailSteep';
  if (isTrail) {
    const trackTypes = ['Fractionné', 'VMA', 'Intervalle', 'Seuil'];
    const runningSessions = week.sessions.filter((s: any) =>
      s.type !== 'Renforcement' && s.type !== 'Repos'
    );
    let freedDPlus = 0;
    runningSessions.forEach((s: any) => {
      // VK : on autorise le D+ sur les fracs en côte (c'est le coeur de l'entraînement)
      if (objective === 'VK') return;
      const isTrack = trackTypes.some(t => (s.type || '').includes(t)) ||
        trackTypes.some(t => (s.title || '').includes(t)) ||
        (s.mainSet && /\bVMA\b/.test(s.mainSet) && !/sortie longue/i.test(s.title || ''));
      const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || '') ||
        s.intensity === 'Très facile' || s.intensity === 'Très Facile';
      if ((isTrack || isRecovery) && (s.elevationGain || 0) > 0) {
        freedDPlus += s.elevationGain;
        s.elevationGain = 0;
      }
    });
    // Redistribute freed D+ to longest eligible session (don't lose it)
    if (freedDPlus > 0) {
      const eligible = runningSessions.filter((s: any) => {
        const isTrack = trackTypes.some(t => (s.type || '').includes(t)) || trackTypes.some(t => (s.title || '').includes(t));
        const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || '') || s.intensity === 'Très facile';
        return !isTrack && !isRecovery;
      });
      eligible.sort((a: any, b: any) => parseDurationMin(b.duration) - parseDurationMin(a.duration));
      if (eligible[0]) {
        eligible[0].elevationGain = (eligible[0].elevationGain || 0) + freedDPlus;
        console.log(`[Enforce] Week ${week.weekNumber}: ${freedDPlus}m D+ freed from track/recovery → added to "${eligible[0].title}"`);
      }
    }
  }

  // --- 3b. Si la course déclare 0m D+, supprimer tout D+ des séances ---
  const trailElev = questionnaireData?.trailDetails?.elevation;
  if (trailElev !== undefined && trailElev !== null && parseInt(trailElev) === 0) {
    let removedDPlus = 0;
    week.sessions.forEach((s: any) => {
      if (s.elevationGain && s.elevationGain > 0) {
        removedDPlus += s.elevationGain;
        s.elevationGain = 0;
      }
    });
    if (removedDPlus > 0) {
      console.log(`[Enforce] Course 0m D+ → supprimé ${removedDPlus}m D+ des séances S${week.weekNumber}`);
    }
  }

  // --- 4. Max 2 hard sessions per week (downgrade extras to Modéré) ---
  const hardSessions = week.sessions.filter((s: any) =>
    s.intensity === 'Difficile' || s.intensity === 'Haute' || s.intensity === 'Très difficile'
  );
  if (hardSessions.length > 2) {
    // Keep the 2 most important hard sessions (prioritize VMA, Fractionné, Seuil)
    const priorityTypes = ['Fractionné', 'VMA', 'Seuil', 'Intervalle'];
    hardSessions.sort((a: any, b: any) => {
      const aPri = priorityTypes.some(t => (a.type || '').includes(t)) ? 0 : 1;
      const bPri = priorityTypes.some(t => (b.type || '').includes(t)) ? 0 : 1;
      return aPri - bPri;
    });
    // Downgrade everything after the first 2
    for (let i = 2; i < hardSessions.length; i++) {
      hardSessions[i].intensity = 'Modéré';
      console.log(`[Enforce] Week ${week.weekNumber}: ${hardSessions[i].type} ${hardSessions[i].day} downgraded to Modéré (max 2 hard)`);
    }
  }

  // --- 5. Cap volume hebdo absolu (MAX_WEEKLY_VOLUME) ---
  const volumeRules = MAX_WEEKLY_VOLUME[objective];
  if (volumeRules) {
    const absMaxVolume = volumeRules[level] || volumeRules.inter;
    const runSess = week.sessions.filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos');
    const currVol = runSess.reduce((sum: number, s: any) => {
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
    if (currVol > absMaxVolume && currVol > 0) {
      const factor = absMaxVolume / currVol;
      runSess.forEach((s: any) => {
        const km = parseKm(s.distance);
        if (km > 0) {
          s.distance = `${Math.round(km * factor * 10) / 10} km`;
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        }
      });
      console.log(`[Enforce] Week ${week.weekNumber} VOLUME CAP: ${Math.round(currVol)}km → ${absMaxVolume}km [max ${objective} ${level}]`);
    }
  }

  // --- 6. Recalibrate week volume to match target (±10% tolerance) ---
  if (targetVolume <= 0) return;
  const isWalkRun = (s: any) => /marche.*course|course.*marche|walk.*run/i.test(s.title || '');
  const runSessions = week.sessions.filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos');
  const currentVolume = runSessions.reduce((sum: number, s: any) => {
    const km = parseKm(s.distance);
    return sum + (km > 0 ? km : 0);
  }, 0);

  if (currentVolume <= 0) return;

  // Scale DOWN if more than 10% over target
  if (currentVolume > targetVolume * 1.10) {
    const factor = targetVolume / currentVolume;
    runSessions.forEach((s: any) => {
      const km = parseKm(s.distance);
      if (km > 0) {
        s.distance = `${Math.round(km * factor * 10) / 10} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume: ${Math.round(currentVolume)}km → ${targetVolume}km (factor ${factor.toFixed(2)})`);
  }
  // Scale UP if more than 20% under target (Gemini sometimes underestimates)
  // BUT never exceed SL duration cap — the cap exists for safety (especially overweight/low VMA)
  else if (currentVolume < targetVolume * 0.80) {
    // Determine max allowed duration per session type BEFORE scaling
    const slMaxDur = slDurRules ? (slDurRules[level] || slDurRules.inter) : 999;
    const nonSlMaxDur = Math.round(slMaxDur * 0.75);

    const factor = targetVolume / currentVolume;
    runSessions.forEach((s: any) => {
      const km = parseKm(s.distance);
      if (km > 0) {
        // Marche/course : scale-up limité (×1.3 max, durée max 50min)
        const sessionFactor = isWalkRun(s) ? Math.min(factor, 1.3) : factor;
        const newKm = Math.round(km * sessionFactor * 10) / 10;
        // Don't scale up beyond max session km
        const maxKm = sessionRules ? (sessionRules[level] || sessionRules.inter) : 999;
        s.distance = `${Math.min(newKm, maxKm)} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) {
          const newDur = Math.round(dur * sessionFactor);
          // Re-apply duration cap: SL stays within SL max, others within non-SL max
          const isSL = s.type === 'Sortie Longue' || /sortie\s*longue|long\s*run/i.test(s.title || '');
          const durCap = isSL ? slMaxDur : nonSlMaxDur;
          const cappedDur = isWalkRun(s) ? Math.min(newDur, 50) : Math.min(newDur, durCap);
          s.duration = formatDurationStr(cappedDur);
          // If duration was capped, also cap distance proportionally
          if (cappedDur < newDur && dur > 0) {
            const durFactor = cappedDur / newDur;
            const cappedKm = Math.round(Math.min(newKm, maxKm) * durFactor * 10) / 10;
            s.distance = `${cappedKm} km`;
          }
        }
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume UP: ${Math.round(currentVolume)}km → ${targetVolume}km (factor ${factor.toFixed(2)}, SL cap ${slMaxDur}min)`);
  }

  // --- 7. Convertir séances running trop courtes en Repos actif ---
  // Si volume moyen par séance running < 3.5km, les micro-séances n'ont pas de valeur
  // d'entraînement. Mieux vaut moins de séances running plus consistantes + repos.
  const MIN_AVG_KM_PER_SESSION = 3.5;
  const finalRunSessions = week.sessions.filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos');
  if (finalRunSessions.length >= 3) {
    const finalVol = finalRunSessions.reduce((sum: number, s: any) => {
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
    const avgKm = finalVol / finalRunSessions.length;

    if (avgKm < MIN_AVG_KM_PER_SESSION && finalRunSessions.length > 2) {
      // Trier par distance croissante pour convertir les plus courtes
      const sorted = [...finalRunSessions].sort((a: any, b: any) => {
        const kmA = parseKm(a.distance);
        const kmB = parseKm(b.distance);
        return kmA - kmB;
      });

      // Combien de séances convertir ? On en enlève jusqu'à avg >= MIN_AVG_KM_PER_SESSION
      // mais on garde minimum 2 séances running
      let sessionsToConvert = 0;
      let testRunCount = finalRunSessions.length;
      let testVol = finalVol;
      for (const s of sorted) {
        if (testRunCount <= 2) break;
        const km = parseKm(s.distance);
        testVol -= km;
        testRunCount--;
        sessionsToConvert++;
        if (testVol / testRunCount >= MIN_AVG_KM_PER_SESSION) break;
      }

      if (sessionsToConvert > 0) {
        // Redistribuer le volume des séances supprimées sur les restantes
        let freedKm = 0;
        for (let i = 0; i < sessionsToConvert; i++) {
          const s = sorted[i];
          const km = parseKm(s.distance);
          freedKm += km;
          // Convertir en Repos actif
          s.type = 'Repos';
          s.title = 'Repos Actif — Récupération';
          s.duration = '20-30 min';
          s.distance = undefined;
          s.targetPace = undefined;
          s.elevationGain = 0;
          s.intensity = 'Très Facile';
          s.warmup = undefined;
          s.mainSet = 'Marche douce, étirements, automassage au rouleau (foam roller) ou mobilité articulaire. Pas de course.';
          s.cooldown = undefined;
          s.advice = 'Ce jour de repos actif permet à ton corps de récupérer et de s\'adapter aux efforts de la semaine. La récupération fait partie intégrante de l\'entraînement.';
          console.log(`[Enforce] S${week.weekNumber} ${s.day}: "${s.title}" → Repos actif (avg ${avgKm.toFixed(1)}km/séance trop bas)`);
        }

        // Redistribuer les km libérés sur les séances restantes (proportionnellement)
        if (freedKm > 0) {
          const keepSessions = week.sessions.filter((s: any) =>
            s.type !== 'Renforcement' && s.type !== 'Repos'
          );
          const keepVol = keepSessions.reduce((sum: number, s: any) => {
            const km = parseKm(s.distance);
            return sum + (km > 0 ? km : 0);
          }, 0);
          if (keepVol > 0 && keepSessions.length > 0) {
            keepSessions.forEach((s: any) => {
              const km = parseKm(s.distance);
              if (km > 0) {
                const share = (km / keepVol) * freedKm;
                const newKm = Math.round((km + share) * 10) / 10;
                const dur = parseDurationMin(s.duration);
                if (dur > 0) {
                  s.duration = formatDurationStr(Math.round(dur * (newKm / km)));
                }
                s.distance = `${newKm} km`;
              }
            });
            console.log(`[Enforce] S${week.weekNumber}: ${sessionsToConvert} séance(s) → repos, ${freedKm.toFixed(1)}km redistribués`);
          }
        }
      }
    }
  }

  // --- 8. Forcer au moins 1 fractionné en phase développement/spécifique ---
  // Ne s'applique PAS aux plans perte de poids / maintien (pas de course cible)
  // Si Gemini n'a généré que des Sortie Longue / Jogging, convertir le footing le plus court
  // en fractionné adapté à la phase
  const phase = (week.phase || '').toLowerCase();
  const goalForFrac = (questionnaireData?.goal || '').toLowerCase();
  const isPdpOrMaintien = goalForFrac.includes('perte') || goalForFrac.includes('maintien') || goalForFrac.includes('remise');
  if ((phase === 'developpement' || phase === 'specifique') && !isPdpOrMaintien) {
    const hasIntensity = week.sessions.some((s: any) =>
      s.type === 'Fractionné' || /fractionn|vma|intervalle|seuil|tempo/i.test(s.title || '') ||
      /fractionn|vma|intervalle|seuil/i.test(s.type || '')
    );
    if (!hasIntensity) {
      // Trouver la séance running non-SL la plus courte (candidat à convertir)
      const candidates = week.sessions.filter((s: any) =>
        s.type !== 'Renforcement' && s.type !== 'Repos' && s.type !== 'Sortie Longue' &&
        !/sortie\s*longue/i.test(s.title || '')
      );
      // Si pas de candidat non-SL, prendre la SL la plus courte (s'il y en a 2+)
      const slSess = week.sessions.filter((s: any) =>
        (s.type === 'Sortie Longue' || /sortie\s*longue/i.test(s.title || '')) && s.type !== 'Renforcement'
      );
      const convertTarget = candidates.length > 0
        ? candidates.sort((a: any, b: any) => parseDurationMin(a.duration) - parseDurationMin(b.duration))[0]
        : slSess.length >= 2 ? slSess.sort((a: any, b: any) => parseDurationMin(a.duration) - parseDurationMin(b.duration))[0]
        : null;

      if (convertTarget) {
        const oldType = convertTarget.type;
        const dur = parseDurationMin(convertTarget.duration);
        convertTarget.type = 'Fractionné';
        convertTarget._dedupedFromSL = true; // Ne pas retaper en SL
        convertTarget.intensity = 'Difficile';

        // Contenu adapté à la phase et au type de course
        const sub = (questionnaireData?.subGoal || '').toLowerCase();
        const isMarathonFrac = sub.includes('marathon') && !sub.includes('semi');
        const isSemiFrac = sub.includes('semi');
        const isTrailFrac = goalForFrac.includes('trail');

        if (phase === 'developpement') {
          convertTarget.title = 'Fractionné VMA — Développement';
          if (isTrailFrac) {
            convertTarget.mainSet = `Échauffement 15 min EF, puis 6 × 1 min en côte (effort 9/10) / descente trot, puis 10 min retour au calme.`;
            convertTarget.advice = `Séance clé Trail : les montées courtes développent ta puissance et ta VMA en conditions spécifiques.`;
          } else {
            convertTarget.mainSet = `Échauffement 15 min EF, puis 8 × 30" vite / 30" récup trot, puis 10 min retour au calme.`;
            convertTarget.advice = `Séance clé de développement. Les 30/30 développent ta VMA. Cours les fractions "vite" (effort 8-9/10), récupère en trottinant.`;
          }
        } else {
          // Phase spécifique : adapter au type de course
          if (isMarathonFrac) {
            convertTarget.title = 'Fractionné Allure Marathon — Phase Spécifique';
            convertTarget.mainSet = `Échauffement 15 min EF, puis 3 × 10 min à allure marathon (r=3 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `Séance clé : les blocs à allure marathon te préparent au rythme de course. Reste régulier et contrôlé.`;
          } else if (isSemiFrac) {
            convertTarget.title = 'Fractionné Allure Semi — Phase Spécifique';
            convertTarget.mainSet = `Échauffement 15 min EF, puis 3 × 8 min à allure semi-marathon (r=2 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `Séance clé : les blocs à allure semi t'habituent au rythme de course. Reste fluide et régulier.`;
          } else if (isTrailFrac) {
            convertTarget.title = 'Fractionné Spécifique Trail';
            convertTarget.mainSet = `Échauffement 15 min EF, puis 4 × 5 min en montée (effort seuil) / descente technique, puis 10 min retour au calme.`;
            convertTarget.advice = `Séance spécifique Trail : travaille la montée au seuil et la technique de descente. Gère ton effort en côte.`;
          } else {
            // 5km ou 10km
            const distLabel = sub.includes('5') ? '5km' : '10km';
            convertTarget.title = `Fractionné Allure ${distLabel} — Phase Spécifique`;
            convertTarget.mainSet = `Échauffement 15 min EF, puis 3 × 8 min à allure ${distLabel} (r=2 min trot), puis 10 min retour au calme.`;
            convertTarget.advice = `Séance clé de ta préparation spécifique. Les blocs à allure ${distLabel} t'habituent au rythme de course. Reste régulier.`;
          }
        }
        convertTarget.warmup = '15 min de footing progressif + gammes éducatives';
        convertTarget.cooldown = '10 min de retour au calme en trottinant + étirements';
        recalculateSessionDistance(convertTarget);
        console.log(`[Enforce] S${week.weekNumber} (${phase}): Pas de fractionné → converti "${oldType}" en "${convertTarget.title}"`);
      }
    }
  }

  // --- 9. Varier les distances entre footings identiques ---
  // Si 2+ footings (Jogging) ont la même distance (±0.5km), les varier (55%/45% split)
  const footings = week.sessions.filter((s: any) =>
    s.type === 'Jogging' && s.type !== 'Renforcement' && s.type !== 'Repos'
  );
  if (footings.length >= 2) {
    const km0 = parseKm(footings[0].distance);
    const km1 = parseKm(footings[1].distance);
    if (km0 > 0 && km1 > 0 && Math.abs(km0 - km1) < 0.6) {
      const totalFootingKm = km0 + km1;
      const longer = Math.round(totalFootingKm * 0.57 * 10) / 10;
      const shorter = Math.round((totalFootingKm - longer) * 10) / 10;

      // Le footing le plus "vallonné/trail" ou plus long en titre → séance plus courte (plus intense)
      // Le footing "plat/aisance" → séance plus longue (volume)
      const isHilly = (s: any) => /vallonn|côte|sentier|trail|technique|progressif/i.test(s.title || '');
      const hilly0 = isHilly(footings[0]);
      const hilly1 = isHilly(footings[1]);

      if (hilly0 && !hilly1) {
        // Footing 0 = vallonné → shorter, Footing 1 = plat → longer
        footings[0].distance = `${shorter} km`;
        footings[1].distance = `${longer} km`;
      } else if (hilly1 && !hilly0) {
        footings[0].distance = `${longer} km`;
        footings[1].distance = `${shorter} km`;
      } else {
        // Both similar → just alternate
        footings[0].distance = `${longer} km`;
        footings[1].distance = `${shorter} km`;
      }

      // Adjust durations proportionally
      footings.forEach((s: any) => {
        const newKm = parseKm(s.distance);
        const oldKm = s === footings[0] ? km0 : km1;
        if (oldKm > 0) {
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * (newKm / oldKm)));
        }
      });

      console.log(`[Enforce] S${week.weekNumber}: Footing variation ${km0}/${km1}km → ${parseKm(footings[0].distance)}/${parseKm(footings[1].distance)}km`);
    }
  }

  // ─── Fix D — Sync mainSet sur les types whitelistés ───────────────────
  // Cause racine (INVESTIGATION-MAINSET-DURATION-DESYNC.md) : les 10+ caps
  // ci-dessus mutent `duration`/`distance` mais NE réécrivent JAMAIS le
  // `mainSet`. Conséquence : 51 séances en base avec mainSet "116 min" vs
  // duration officielle "60 min" (cas steph-fanny).
  //
  // Stratégie validée coach (VALIDATION-COACH-AVANT-DEPLOY.md élément D) :
  //   - WHITELIST stricte (Sortie Longue, Jogging, Footing) où sync = sûr ;
  //   - BLACKLIST explicite (Fractionné, Tempo, Côtes, Renforcement, Hyrox,
  //     Marche-Course, ...) où on ne touche JAMAIS le mainSet (le contenu
  //     est structuré : "6 × 800 m", "Squats 3×9", etc).
  //   - Idempotent : peut être ré-appelé sans drift (pattern d'ancrage
  //     "^X min" + premier "X km" non fractionné).
  week.sessions.forEach((s: any) => {
    if (!s || !s.mainSet) return;
    if (!isMainSetSyncable(s.type, s.mainSet)) return;
    const durMin = parseDurationMin(s.duration);
    const km = parseKm(s.distance);
    if (durMin <= 0 && km <= 0) return;
    const before = s.mainSet;
    applySessionScale(s, s.duration || '', s.distance || '');
    if (s.mainSet !== before) {
      console.log(`[Enforce] mainSet sync (${s.type}) S${week.weekNumber} ${s.day}: dur=${durMin}min km=${km}`);
    }
  });

  // ─── Fix point 6 — sync weeklyVolumes vs sum(sessions.distance) ──────
  // Bug Thomas Weill 2026-05-19 (AUDIT-THOMAS-PREMIUM-COMPLET.md) :
  // enforceWeekConstraints mute s.duration/s.distance pour respecter caps
  // (SL max, non-SL max, max session km, MAX_WEEKLY_VOLUME, recalibration
  // ±10%, etc.) MAIS ne réajuste pas weeklyVolumes. Conséquence : l'UI
  // affiche un volume hebdo (depuis weeklyVolumes) qui ne matche pas la
  // somme réelle des séances générées. Cas Thomas : S15 weeklyVolumes=71,
  // somme=66 → drift -7%. Pareil S8 (-4%), S14 (-4.5%).
  //
  // Sync local + chirurgical : on recalcule weeklyVolumes[weekIdx] APRÈS
  // toutes les mutations de cette fonction. Seuil 2 km pour éviter le
  // bruit d'arrondi (0.5 km différence sur 50 km n'est pas un bug).
  if (weeklyVolumes && weekIdx !== undefined && weekIdx >= 0 && weekIdx < weeklyVolumes.length) {
    const sumCourseKm = week.sessions
      .filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos')
      .reduce((sum: number, s: any) => {
        const km = parseKm(s.distance);
        return sum + (km > 0 ? km : 0);
      }, 0);

    const oldVolume = weeklyVolumes[weekIdx];
    const newVolume = Math.round(sumCourseKm);

    if (Math.abs(newVolume - oldVolume) >= 2) {
      console.log(`[Enforce] weeklyVolumes[${weekIdx}] resync: ${oldVolume}km → ${newVolume}km (post-enforceWeekConstraints, sum=${sumCourseKm.toFixed(1)}km)`);
      weeklyVolumes[weekIdx] = newVolume;
    }
  }
};

/**
 * Guard cross-semaines : appliqué sur le plan complet après enforceWeekConstraints.
 * 1. Affûtage : chaque semaine d'affûtage doit avoir un volume ≤ semaine précédente
 * 2. Progression : max +15% d'une semaine à l'autre (hors post-récup)
 * 3. Re-cap sessions après lissage
 */
export const enforceFullPlanConstraints = (
  weeks: any[],
  weeklyVolumes: number[],
  questionnaireData: any,
): void => {
  if (!weeks || weeks.length < 2) return;

  const objective = detectObjectiveFromData(questionnaireData);
  const level = detectLevelFromData(questionnaireData);
  const sessionRules = MAX_SESSION_KM[objective];
  const maxKm = sessionRules ? (sessionRules[level] || sessionRules.inter) : 999;

  const getWeekKm = (week: any): number => {
    return (week.sessions || []).reduce((sum: number, s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos') return sum;
      // Race-day skip : la course officielle ne compte pas dans le volume
      // d'entraînement (sinon le cap affûtage essaie de réduire la séance course).
      if (s._raceDay === true) return sum;
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);
  };

  const scaleWeekVolume = (week: any, targetKm: number) => {
    const currentKm = getWeekKm(week);
    if (currentKm <= 0 || Math.abs(currentKm - targetKm) < 1) return;
    const factor = targetKm / currentKm;
    (week.sessions || []).forEach((s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos') return;
      // Race-day : on ne touche PAS la séance course officielle (distance officielle fixe).
      if (s._raceDay === true) return;
      const km = parseKm(s.distance);
      if (km > 0) {
        const newKm = Math.min(Math.round(km * factor * 10) / 10, maxKm);
        s.distance = `${newKm} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
      }
    });
  };

  // --- 1. Affûtage enforcement: each affûtage week ≤ previous week ---
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].phase !== 'affutage') continue;
    const prevKm = getWeekKm(weeks[i - 1]);
    const currKm = getWeekKm(weeks[i]);
    if (currKm > prevKm && prevKm > 0) {
      // Cap at 85% of previous week (affûtage should decrease)
      const target = Math.round(prevKm * 0.85);
      scaleWeekVolume(weeks[i], target);
      console.log(`[Guard] Affûtage S${weeks[i].weekNumber}: ${Math.round(currKm)}km → ${target}km (≤ prev ${Math.round(prevKm)}km)`);
    }
  }

  // --- 2. Progression smoothing: max +15% week-to-week ---
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < weeks.length - 1; i++) {
      const currKm = getWeekKm(weeks[i]);
      const nextKm = getWeekKm(weeks[i + 1]);
      if (currKm <= 5 || nextKm <= 5) continue;

      const increase = (nextKm - currKm) / currKm;

      // Skip normal recovery drops / taper entries (unless extreme >100%)
      const isFromRecovery = weeks[i].isRecoveryWeek || weeks[i].phase === 'recuperation';
      const isToRecovery = weeks[i + 1].isRecoveryWeek || weeks[i + 1].phase === 'recuperation';
      const isTaperEntry = weeks[i + 1].phase === 'affutage' && weeks[i].phase !== 'affutage';
      // Drops vers recovery/taper sont normaux, on skip
      if (increase < 0 && (isToRecovery || isTaperEntry)) continue;

      // Post-recovery : le retour ne dépasse pas la semaine PRÉ-récup
      if (isFromRecovery) {
        const preRecovKm = i > 0 ? getWeekKm(weeks[i - 1]) : currKm;
        if (nextKm > preRecovKm) {
          scaleWeekVolume(weeks[i + 1], Math.round(preRecovKm));
          console.log(`[Guard] Post-recovery S${weeks[i + 1].weekNumber}: ${Math.round(nextKm)}km → ${Math.round(preRecovKm)}km (capped at pre-recovery volume)`);
        }
        continue;
      }

      // Normal : max +15%
      if (increase > 0.15) {
        const targetNext = Math.round(currKm * 1.15);
        if (targetNext < nextKm) {
          scaleWeekVolume(weeks[i + 1], targetNext);
          console.log(`[Guard] Progression S${weeks[i + 1].weekNumber}: ${Math.round(nextKm)}km → ${targetNext}km (+15% max from ${Math.round(currKm)}km)`);
        }
      }
    }
  }

  // --- 3. Re-cap sessions after smoothing (in case smoothing broke individual session caps) ---
  if (sessionRules) {
    weeks.forEach((w: any) => {
      (w.sessions || []).forEach((s: any) => {
        if (s.type === 'Renforcement' || s.type === 'Repos') return;
        // Race-day skip : la séance course officielle ne doit jamais être cap.
        if (s._raceDay === true) return;
        const km = parseKm(s.distance);
        if (km > maxKm) {
          const factor = maxKm / km;
          s.distance = `${maxKm} km`;
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        }
      });
    });
  }

  // --- 4. Anti-monotonie inter-semaines Marathon (Sprint Marathon 2026-05-20) ---
  // Bug Thomas Weill : 3 SL @ allure Marathon (MP-LR) consécutives sur S13-15 →
  // surentraînement (Pfitzinger Advanced Marathoning 3rd ed. : minSpacing = 2 sem).
  // Guard objectif strict : ne s'applique qu'aux plans subGoal "marathon" (PAS semi,
  // PAS trail, PAS perte de poids). Cf. feedback_scope_strict.
  const subGoalLc = (questionnaireData?.subGoal || '').toLowerCase();
  const isMarathonPlan = subGoalLc.includes('marathon') && !subGoalLc.includes('semi');
  if (isMarathonPlan) {
    // Détecte les SL "AS Marathon" (titre/mainSet contient "marathon" + allure spé + > 24 km).
    const isMpLrPattern = (s: any): boolean => {
      if (!s) return false;
      if (s._raceDay === true) return false; // la course finale n'est jamais un MP-LR
      if (s.type !== 'Sortie Longue') return false;
      const km = parseKm(s.distance);
      if (km < 24) return false; // MP-LR canonique = ≥ 24 km
      const text = `${s.title || ''} ${s.mainSet || ''} ${s.intensity || ''}`.toLowerCase();
      // Heuristiques : titre mention "marathon" / "AS Marathon" / "allure marathon"
      // OU mainSet contient un % significatif d'allure MP (> 4 km @ allure spé).
      return /allure\s*marathon|as\s*marathon|allure\s*sp[ée]cifique\s*marathon|@\s*mp\b|marathon[- ]pace/i.test(text);
    };

    let retypedCount = 0;
    for (let i = 1; i < weeks.length; i++) {
      const slPrev = (weeks[i - 1].sessions || []).find((s: any) =>
        s.type === 'Sortie Longue' && isMpLrPattern(s)
      );
      const slCurr = (weeks[i].sessions || []).find((s: any) =>
        s.type === 'Sortie Longue' && isMpLrPattern(s)
      );
      if (slPrev && slCurr) {
        // Retyper slCurr en LR-EF (récupération MP).
        slCurr.title = 'Sortie Longue EF (récupération entre 2 MP-LR)';
        slCurr.mainSet = `${parseKm(slCurr.distance) || 24} km en endurance fondamentale continue, conversation possible. Pas de bloc allure marathon cette semaine — récupération active entre 2 séances qualité MP-LR.`;
        slCurr.intensity = 'Facile';
        retypedCount++;
        console.log(`[Guard Anti-Monotonie Marathon] S${weeks[i].weekNumber} MP-LR consécutive détectée → retypée en LR-EF`);
      }
    }
    if (retypedCount > 0) {
      console.log(`[Guard Anti-Monotonie Marathon] ${retypedCount} séance(s) retypée(s)`);
    }
  }
};

/**
 * Construit le nom du plan à partir des données du questionnaire (pas de Gemini).
 */
const formatTargetTime = (raw?: string): string => {
  if (!raw) return '';
  const t = raw.trim();
  // Déjà formaté ("3h45", "55min", "1h30")
  if (/h|min/i.test(t)) return t;
  // Nombre seul : si >= 300 c'est probablement des minutes, sinon on ajoute "min"
  const n = parseInt(t);
  if (!isNaN(n) && n > 0) return `${n}min`;
  // Valeur non reconnue (ex: "Lyon", texte libre) → ignorer
  return '';
};

const buildPlanName = (data: QuestionnaireData, planDurationWeeks: number): string => {
  const goal = data.goal || '';
  if (goal.includes('Perte')) {
    return `Programme Perte de Poids — ${planDurationWeeks} semaines`;
  }
  if (goal.includes('Maintien') || goal.includes('Remise')) {
    return `Programme Remise en Forme — ${planDurationWeeks} semaines`;
  }
  const formattedTime = formatTargetTime(data.targetTime);
  if (goal.includes('Trail') && data.trailDetails) {
    const d = data.trailDetails.distance || 0;
    const e = data.trailDetails.elevation || 0;
    const time = formattedTime ? ` en ${formattedTime}` : ' — Finisher';
    return `Préparation Trail ${d}km / ${e}m D+${time} — ${planDurationWeeks} sem.`;
  }
  if (goal.includes('Hyrox')) {
    const time = formattedTime ? ` — Objectif ${formattedTime}` : '';
    return `Prépa Course Hyrox${time} — ${planDurationWeeks} sem.`;
  }
  if (data.subGoal) {
    const time = formattedTime ? ` en ${formattedTime}` : ' — Finisher';
    return `Préparation ${data.subGoal}${time} — ${planDurationWeeks} sem.`;
  }
  return `Plan d'entraînement — ${planDurationWeeks} semaines`;
};

// ============================================
// CALCUL DU PLAN DE PÉRIODISATION
// ============================================

// ---------------------------------------------------------------------------
// Calcul D+ cible par semaine — avec plafond par niveau et départ réaliste
// ---------------------------------------------------------------------------

/**
 * Calcule le D+ cible hebdomadaire pour une semaine donnée du plan trail.
 * - Progression du D+ actuel (ou plancher) vers le D+ course
 * - Plafond par niveau pour éviter les volumes irréalistes
 * - La SL porte ~65% du D+ hebdo
 */

/**
 * Distribue le D+ cible sur les séances d'une semaine trail.
 * SL = 65%, Récupération = 10%, autres = répartition égale du reste.
 */
const distributeElevationToSessions = (sessions: any[], weekTargetElevation: number, level: string = 'inter'): void => {
  if (weekTargetElevation <= 0) return;

  const trackTypes = ['Fractionné', 'VMA', 'Intervalle', 'Seuil'];
  const runningSessions = sessions.filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos');
  if (runningSessions.length === 0) return;

  // Classify each session
  runningSessions.forEach((s: any) => {
    const title = (s.title || '').toLowerCase();
    const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || '') ||
      s.intensity === 'Très facile' || s.intensity === 'Très Facile';
    // Séance de côtes/montée = fractionné en côte, DOIT recevoir du D+ (pas un fractionné piste)
    const isCotesSession = /côte|hill|montée|mont[ée]e/i.test(title);
    // Track = fractionné sur piste plate (VMA, intervalles) — SAUF si c'est une séance de côtes
    const isTrack = !isCotesSession && (
      trackTypes.some(t => title.includes(t.toLowerCase())) || trackTypes.some(t => (s.type || '').includes(t))
    );

    if (isRecovery) {
      s.elevationGain = 0;
      s._dplusRole = 'ZERO';
    } else if (isTrack) {
      s.elevationGain = 0; // Zero D+ on track (piste plate)
      s._dplusRole = 'ZERO';
    } else if (isCotesSession) {
      // Séance de côtes : eligible pour D+ significatif
      s._dplusRole = 'TRAIL_OR_SL';
    } else if (/trail|côte|dénivelé|montagne|sentier|d\+/i.test(s.title || '') ||
               /sortie longue/i.test(s.title || '') || s.type === 'Sortie Longue') {
      s._dplusRole = 'TRAIL_OR_SL';
    } else if (/vallonn|colline|mont[ée]/i.test(title)) {
      // Footing vallonné : priorité D+ sur les footings plats
      s._dplusRole = 'VALLONNE';
    } else {
      s._dplusRole = 'FOOTING';
    }
  });

  // Eligible sessions = non-zero
  const eligible = runningSessions.filter((s: any) => s._dplusRole !== 'ZERO');
  if (eligible.length === 0) {
    // Edge case: all sessions are track/recovery — put D+ on longest anyway
    const longest = runningSessions.reduce((best: any, s: any) =>
      (parseInt(s.duration) || 0) > (parseInt(best?.duration) || 0) ? s : best, null);
    if (longest) longest.elevationGain = weekTargetElevation;
    runningSessions.forEach((s: any) => { delete s._dplusRole; });
    return;
  }

  // Sort by duration desc (parseDurationMin handles "1h30" → 90, not parseInt which gives 1)
  eligible.sort((a: any, b: any) => parseDurationMin(b.duration) - parseDurationMin(a.duration));

  // Find best SL/trail candidate (longest TRAIL_OR_SL, or just longest)
  const mainSession = eligible.find((s: any) => s._dplusRole === 'TRAIL_OR_SL') || eligible[0];
  // Second: priorité TRAIL_OR_SL, puis VALLONNE (vallonné > plat), puis n'importe quel autre
  const secondSession = eligible.find((s: any) => s !== mainSession && s._dplusRole === 'TRAIL_OR_SL') ||
    eligible.find((s: any) => s !== mainSession && s._dplusRole === 'VALLONNE') ||
    (eligible.length > 1 ? eligible.find((s: any) => s !== mainSession) : null);

  // Distribute: main=65%, second=20%, footings=15%
  eligible.forEach((s: any) => { s.elevationGain = 0; });

  mainSession.elevationGain = Math.round(weekTargetElevation * 0.65);

  if (secondSession) {
    secondSession.elevationGain = Math.round(weekTargetElevation * 0.20);
    const others = eligible.filter((s: any) => s !== mainSession && s !== secondSession);
    const remaining = weekTargetElevation - mainSession.elevationGain - secondSession.elevationGain;
    if (others.length > 0) {
      const per = Math.round(remaining / others.length);
      others.forEach((s: any) => { s.elevationGain = per; });
    } else {
      mainSession.elevationGain += remaining;
    }
  } else {
    mainSession.elevationGain = weekTargetElevation;
  }

  // ══════════════════════════════════════════════════════════════
  // SEUIL MINIMUM D+ : les micro-doses (<40m) sont inutiles
  // → on les redistribue sur la séance principale
  // ══════════════════════════════════════════════════════════════
  const MIN_DPLUS_THRESHOLD = 40;
  let redistributed = 0;
  eligible.forEach((s: any) => {
    if (s !== mainSession && s.elevationGain > 0 && s.elevationGain < MIN_DPLUS_THRESHOLD) {
      console.log(`[D+ Micro] "${s.title}": ${s.elevationGain}m < ${MIN_DPLUS_THRESHOLD}m → set to 0, redistributed to main`);
      redistributed += s.elevationGain;
      s.elevationGain = 0;
    }
  });
  if (redistributed > 0) {
    mainSession.elevationGain += redistributed;
  }

  // Cap D+ par séance en fonction de la durée ET du niveau
  // Ratio max D+/min adapté au niveau pour éviter les séances dangereuses
  const dplusPerMinByLevel: Record<string, number> = {
    'deb': 5,     // Débutant : max 5m/min (ex: 50min → max 250m D+)
    'inter': 7,   // Intermédiaire : max 7m/min (ex: 50min → max 350m)
    'conf': 9,    // Confirmé : max 9m/min (ex: 50min → max 450m)
    'expert': 12, // Expert : max 12m/min (ex: 50min → max 600m)
  };
  const dplusPerMin = dplusPerMinByLevel[level] || dplusPerMinByLevel['inter'];

  // Cap absolu par séance par niveau (indépendamment de la durée)
  const maxDplusAbsByLevel: Record<string, number> = {
    'deb': 400,    // Débutant : jamais > 400m D+ en une séance
    'inter': 800,  // Intermédiaire : jamais > 800m
    'conf': 1500,  // Confirmé : jamais > 1500m
    'expert': 2500, // Expert : jamais > 2500m
  };
  const maxDplusAbs = maxDplusAbsByLevel[level] || maxDplusAbsByLevel['inter'];

  eligible.forEach((s: any) => {
    const durationMin = parseDurationMin(s.duration);
    if (durationMin > 0 && s.elevationGain > 0) {
      const maxElevForDuration = Math.round(durationMin * dplusPerMin);
      const effectiveMax = Math.min(maxElevForDuration, maxDplusAbs);
      if (s.elevationGain > effectiveMax) {
        console.log(`[D+ Cap] "${s.title}" ${s.duration}: ${s.elevationGain}m → capped to ${effectiveMax}m (${durationMin}min × ${dplusPerMin} m/min, abs max ${maxDplusAbs}m) [${level}]`);
        s.elevationGain = effectiveMax;
      }
    }
  });

  // Update mainSet D+ mentions
  eligible.forEach((s: any) => {
    if (s.mainSet && s.elevationGain > 0) {
      s.mainSet = s.mainSet.replace(/D\+\s*(?:cible\s+(?:de\s+)?)?(?:de\s+)?\d+\s*m/gi, `D+ cible de ${s.elevationGain}m`);
    }
  });

  const totalAssigned = runningSessions.reduce((sum: number, s: any) => sum + (s.elevationGain || 0), 0);
  console.log(`[D+ Distribute] Cible: ${weekTargetElevation}m → Assigné: ${totalAssigned}m | Main: "${mainSession.title}" ${mainSession.elevationGain}m${secondSession ? ` | Second: "${secondSession.title}" ${secondSession.elevationGain}m` : ''}`);

  // Cleanup
  runningSessions.forEach((s: any) => { delete s._dplusRole; });
};

/**
 * Pré-calcule le plan de périodisation complet.
 * Ce plan est FIGÉ et utilisé pour générer chaque semaine avec cohérence totale.
 */
export const calculatePeriodizationPlan = (
  totalWeeks: number,
  currentVolume: number,
  level: string,
  goal: string,
  subGoal?: string,
  trailDistance?: number,
  trailElevation?: number,
  targetTime?: string,
  age?: number,
  weight?: number,
  vma?: number,
  sessionsPerWeek?: number,
  params?: { height?: number; vmaSource?: string; currentWeeklyElevation?: number },
): { weeklyVolumes: number[]; weeklyPhases: PeriodizationPhase[]; recoveryWeeks: number[]; weeklyElevationTarget?: number[] } => {

  // Taux de progression selon niveau
  // Débutant à 0.08 (comme inter) pour pouvoir atteindre la distance de course
  let progressionRate = level === 'Débutant (0-1 an)' ? 0.08 :
                        level === 'Intermédiaire (Régulier)' ? 0.08 :
                        level === 'Confirmé (Compétition)' ? 0.10 : 0.12;

  // IMC élevé → progression plus douce (priorité = régularité, pas volume)
  const height = params?.height || 0;
  const bmiForRate = (weight && height > 0) ? weight / ((height / 100) ** 2) : 0;
  if (bmiForRate >= 35) {
    progressionRate = Math.min(progressionRate, 0.05); // IMC 35+ : max +5%/sem
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} ≥ 35 → progression réduite à ${(progressionRate*100).toFixed(0)}%/sem`);
  } else if (bmiForRate >= 30) {
    progressionRate = Math.min(progressionRate, 0.06); // IMC 30-35 : max +6%/sem
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} ≥ 30 → progression réduite à ${(progressionRate*100).toFixed(0)}%/sem`);
  }

  // ══════════════════════════════════════════════════════════════
  // PLAFOND DE VOLUME PIC — aligné sur les tableaux du prompt
  // Empêche un coureur à haut volume de départ d'exploser les caps
  // ══════════════════════════════════════════════════════════════
  const sub = (subGoal || '').toLowerCase();
  const isMarathon = sub.includes('marathon') && !sub.includes('semi');
  const isSemi = sub.includes('semi');
  const is10k = sub.includes('10');
  const isTrail = goal.includes('Trail');
  const isUltraLong = isTrail && (trailDistance || 0) >= 100;
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrail30Plus = isTrail && (trailDistance || 0) >= 30;
  const isPertePoids = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien') || goal.includes('Remise');
  // VK / TrailSteep détection via trailDistance + elevation ratio
  const dPlusPerKm = (trailDistance && trailDistance > 0 && trailElevation) ? (trailElevation / trailDistance) : 0;
  const isVK = isTrail && (trailDistance || 0) <= 5 && dPlusPerKm >= 150;
  const isTrailSteep = !isVK && isTrail && (trailDistance || 0) <= 15 && dPlusPerKm >= 80;

  const isHyrox = goal.includes('Hyrox');

  let maxVolume: number;
  if (level === 'Débutant (0-1 an)') {
    if (isHyrox) maxVolume = 16; // -25% vs route (athlète fait aussi fonctionnel)
    else if (isPertePoids) maxVolume = 20;
    else if (isMaintien) maxVolume = 25;
    else if (isVK) maxVolume = 20;
    else if (isTrailSteep) maxVolume = 25;
    else if (isMarathon) maxVolume = 45;
    else if (isUltraLong) maxVolume = 55;
    else if (isUltra) maxVolume = 45;
    else if (isTrail30Plus) maxVolume = 45;
    else if (isTrail) maxVolume = 35;
    else if (isSemi) maxVolume = 35;
    else if (is10k) maxVolume = 30;
    else maxVolume = 25; // 5K
  } else if (level === 'Expert (Performance)') {
    if (isHyrox) maxVolume = 38; // -25% vs route
    else if (isPertePoids) maxVolume = 45;
    else if (isMaintien) maxVolume = 55;
    else if (isVK) maxVolume = 45;
    else if (isTrailSteep) maxVolume = 55;
    else if (isUltraLong) maxVolume = 120;
    else if (isUltra) maxVolume = 100;
    else if (isMarathon) maxVolume = 85;
    else if (isTrail30Plus) maxVolume = 80;
    else if (isTrail) maxVolume = 65;
    else if (isSemi) maxVolume = 70;
    else if (is10k) maxVolume = 65;
    else maxVolume = 60; // 5K
  } else if (level === 'Confirmé (Compétition)') {
    if (isHyrox) maxVolume = 30; // -25% vs route
    else if (isPertePoids) maxVolume = 35;
    else if (isMaintien) maxVolume = 45;
    else if (isVK) maxVolume = 35;
    else if (isTrailSteep) maxVolume = 45;
    else if (isUltraLong) maxVolume = 95;
    else if (isUltra) maxVolume = 70;
    else if (isMarathon) maxVolume = 75;
    else if (isTrail30Plus) maxVolume = 70;
    else if (isTrail) maxVolume = 55;
    else if (isSemi) maxVolume = 60;
    else if (is10k) maxVolume = 55;
    else maxVolume = 46; // 5K
  } else {
    // Intermédiaire
    if (isHyrox) maxVolume = 23; // -25% vs route
    else if (isPertePoids) maxVolume = 30;
    else if (isMaintien) maxVolume = 40;
    else if (isVK) maxVolume = 30;
    else if (isTrailSteep) maxVolume = 35;
    else if (isUltraLong) maxVolume = 75;
    else if (isUltra) maxVolume = 55;
    else if (isMarathon) maxVolume = 65;
    else if (isTrail30Plus) maxVolume = 60;
    else if (isTrail) maxVolume = 50;
    else if (isSemi) maxVolume = 55;
    else if (is10k) maxVolume = 50;
    else maxVolume = 40; // 5K
  }

  // ══════════════════════════════════════════════════════════════
  // AJUSTEMENT PAR FRÉQUENCE DE SESSIONS
  // Les tables ci-dessus sont calibrées pour ~3 sessions running (4 total).
  // Plus de sessions = meilleure distribution = plus de volume supportable.
  // Moins de sessions = tout concentré = moins de volume safe.
  // ══════════════════════════════════════════════════════════════
  if (sessionsPerWeek && sessionsPerWeek > 0) {
    const runningSess = Math.max(1, sessionsPerWeek - 1); // -1 pour le renfo obligatoire
    // Facteurs : 1run=0.70, 2run=0.85, 3run=1.00, 4run=1.10, 5run=1.20
    const sessionFactors: Record<number, number> = { 1: 0.70, 2: 0.85, 3: 1.00, 4: 1.10, 5: 1.20 };
    const sessionFactor = sessionFactors[Math.min(runningSess, 5)] || 1.00;
    if (sessionFactor !== 1.00) {
      const before = maxVolume;
      maxVolume = Math.round(maxVolume * sessionFactor);
      console.log(`[Periodization] Session factor: ${runningSess} running sessions → ×${sessionFactor} → ${before}km → ${maxVolume}km`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // RÉDUCTIONS : Finisher, Âge, Poids
  // Les réductions se cumulent mais sont plafonnées à -40% max du cap de base
  // pour éviter des volumes trop bas (ex: 25km × 0.75 × 0.70 = 13km pour un 5km)
  // ══════════════════════════════════════════════════════════════
  const baseMaxVolume = maxVolume; // Sauvegarder le cap de base avant réductions
  let totalReduction = 1.0;

  const isFinisher = isFinisherTarget(targetTime);
  if (isFinisher && !isPertePoids && !isMaintien) {
    totalReduction *= 0.75;
    console.log(`[Periodization] Finisher detected → factor ×0.75`);
  }

  if (age && age > 0) {
    if (age < 18) {
      totalReduction *= 0.70;
      console.log(`[Periodization] Ado (${age} ans) → factor ×0.70`);
    } else if (age >= 55) {
      totalReduction *= 0.85;
      console.log(`[Periodization] Senior (${age} ans) → factor ×0.85`);
    }
  }

  // IMC-based volume reduction (plus pertinent que le poids brut)
  const bmi = bmiForRate; // Déjà calculé plus haut
  if (bmi >= 35) {
    totalReduction *= 0.65; // Obésité classe 2+ : peak volume à 65%
    console.log(`[Periodization] IMC ${bmi.toFixed(1)} (≥35) → factor ×0.65`);
  } else if (bmi >= 30) {
    totalReduction *= 0.80; // Obésité classe 1 : peak volume à 80%
    console.log(`[Periodization] IMC ${bmi.toFixed(1)} (≥30) → factor ×0.80`);
  } else if (weight && weight > 85 && bmi < 30) {
    // Poids élevé mais IMC < 30 (musculature) : réduction légère
    const weightFactor = weight >= 100 ? 0.85 : 0.90;
    totalReduction *= weightFactor;
    console.log(`[Periodization] Poids ${weight}kg (IMC ${bmi.toFixed(1)}) → factor ×${weightFactor}`);
  }

  // Plafonner la réduction totale à -40% max (facteur min = 0.60)
  totalReduction = Math.max(totalReduction, 0.60);
  if (totalReduction < 1.0) {
    const originalMax = maxVolume;
    maxVolume = Math.round(maxVolume * totalReduction);
    console.log(`[Periodization] Réduction combinée: ${originalMax}km × ${totalReduction.toFixed(2)} = ${maxVolume}km (base=${baseMaxVolume}km)`);
  }

  // ══════════════════════════════════════════════════════════════
  // CAP VMA-DURÉE : le volume max ne peut pas dépasser ce qui est
  // physiquement réalisable en N sessions × durée max par session.
  // Utilise 75% VMA (optimiste : la VMA s'améliorera pendant le plan)
  // et compte TOUTES les sessions comme running (Gemini adapte le mix).
  // Ex: VMA 8, 3 sess → 1 SL 60min + 2×45min à 6.0 km/h = 15km max
  // ══════════════════════════════════════════════════════════════
  if (vma && vma > 0 && sessionsPerWeek && sessionsPerWeek > 0) {
    let objectiveKey = isVK ? 'VK' : isTrailSteep ? 'TrailSteep' :
      isUltraLong ? 'Trail100+' : isUltra ? 'Trail60+' : isTrail30Plus ? 'Trail30+' : isTrail ? 'Trail<30' :
      isMarathon ? 'Marathon' : isSemi ? 'Semi' : is10k ? '10K' : isPertePoids ? 'PertePoids' :
      isMaintien ? 'Maintien' : '5K';

    // FIX: Pour PertePoids/Maintien, si le coureur a des chronos de course validés,
    // utiliser les caps de sa meilleure distance (pas les caps sédentaire PdP/Maintien).
    // Un semi-marathonien qui veut perdre du poids ne doit pas être capé comme un débutant.
    if (objectiveKey === 'PertePoids' || objectiveKey === 'Maintien') {
      // Détecter la plus longue distance courue via VMA source ou chronos récents
      const vmaSource = (params as any)?.vmaSource || '';
      const hasMarathonChrono = vmaSource.toLowerCase().includes('marathon') && !vmaSource.toLowerCase().includes('semi');
      const hasSemiChrono = vmaSource.toLowerCase().includes('semi');
      const has10kChrono = vmaSource.toLowerCase().includes('10k') || vmaSource.toLowerCase().includes('10 km');

      if (hasMarathonChrono) { objectiveKey = 'Marathon'; }
      else if (hasSemiChrono) { objectiveKey = 'Semi'; }
      else if (has10kChrono) { objectiveKey = '10K'; }
      // Sinon rester sur PertePoids/Maintien (pas de chrono → profil sédentaire)

      if (objectiveKey !== 'PertePoids' && objectiveKey !== 'Maintien') {
        console.log(`[Periodization] PdP/Maintien avec expérience course → caps basés sur "${objectiveKey}"`);
      }
    }

    const levelKey = labelToLevelKey(level);
    const slMaxDur = MAX_SL_DURATION[objectiveKey]?.[levelKey] || MAX_SL_DURATION[objectiveKey]?.inter || 90;
    const nonSlMaxDur = Math.round(slMaxDur * 0.75);

    // Speed at endurance fondamentale = ~75% VMA (accounts for improvement during plan)
    const efSpeedKmH = vma * 0.75;
    // 1 séance est toujours du renforcement (obligatoire dans le prompt)
    // → seules les sessions running contribuent au volume kilométrique
    // Ex: 3 séances = 2 running + 1 renfo, 2 séances = 1 running + 1 renfo
    //
    // P0c (2026-05-20, validation Coach 20 ans Pfitzinger Lab) :
    // La doctrine project_coach_running_ia_frequence est IMPÉRATIVE :
    //   freq=3 = 2 course + 1 renfo (TOUJOURS). On ne génère JAMAIS 3 séances
    //   course quand freq=3. → runningSessions reste = sessionsPerWeek - 1.
    //
    // MAIS pour Semi/Marathon freq ≤ 3, le cap VMA-durée plafonnait sous le
    // plancher distance (Margaux Inter VMA 10.9 cv=17 freq=3 → vmaCap 21 km
    // vs plancher Semi 22 km). Pour densifier les 2 séances course (SL plus
    // longue + footing plus dense), on calcule le CAP VOLUME comme si on
    // disposait de 3 slots running — sans changer le nombre réel de séances
    // course (qui reste = sessionsPerWeek - 1, doctrine).
    const runningSessions = Math.max(1, sessionsPerWeek - 1);
    // volumeCapSessions : utilisé UNIQUEMENT dans le calcul vmaBasedMaxVolume
    // pour relever le plafond théorique Semi/Marathon freq ≤ 3, sans amputer
    // la séance renfo. Pour tous les autres cas : identique à runningSessions.
    const volumeCapSessions = (objectiveKey === 'Semi' || objectiveKey === 'Marathon') && sessionsPerWeek <= 3
      ? Math.max(runningSessions, sessionsPerWeek)
      : runningSessions;
    // 1 SL at slMaxDur + remaining running sessions at nonSlMaxDur
    // realisticFactor = facteur de calibration durée réaliste vs durée max théorique.
    // 0.70 pour 5K/10K/Trail/Hyrox (intensité-driven, le volume n'est pas le driver #1).
    // 0.85 pour Semi/Marathon (volume = driver #1 d'adaptation aérobie, le 0.70 plafonnait
    // trop bas — cf. INVESTIGATION-PLANCHER-VOLUME-SEMI.md + validation coach 20 ans).
    // Garde-fous SL spécifiques Débutant ajoutés en aval (cf. plus bas).
    const realisticFactor = (objectiveKey === 'Semi' || objectiveKey === 'Marathon') ? 0.85 : 0.70;
    let slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;

    // Garde-fou cap SL pour profils Débutants tendus (validation coach 20 ans 2026-05-20).
    // Évite le ratio SL/volume hebdo > 55% qui crée un risque blessure tendineuse (Hanson).
    // Ces 2 caps NE TOUCHENT PAS aux inputs user (level/cv/freq préservés), ils plafonnent
    // uniquement la SL maximale possible en construction du plan.
    if (objectiveKey === 'Semi' && level === 'Débutant (0-1 an)' && currentVolume < 10) {
      // Tissus conjonctifs non préparés : cap SL à 12 km (vs 14+ projeté sans cap)
      slMaxKm = Math.min(slMaxKm, 12);
    }
    if (objectiveKey === 'Marathon' && level === 'Débutant (0-1 an)' && currentVolume < 20 && (sessionsPerWeek ?? 3) <= 3) {
      // Marathon Déb 3× avec cv bas : SL pleine 22 km = 60% volume hebdo = zone rouge.
      // Cap SL à 18 km maintient ratio sain (Hanson <30% recommandation, on accepte plus
      // mais on plafonne pour ne pas mettre la SL au-delà de la limite tissulaire débutant).
      slMaxKm = Math.min(slMaxKm, 18);
    }

    // P0c : volumeCapSessions remplace runningSessions UNIQUEMENT dans le calcul
    // du cap volume théorique. Pour Semi/Marathon freq ≤ 3, on densifie les 2
    // séances course (SL plus longue + footing plus dense) sans en ajouter une 3e.
    const otherMaxKm = ((volumeCapSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;
    const vmaBasedMaxVolume = Math.round(slMaxKm + otherMaxKm);

    if (vmaBasedMaxVolume < maxVolume) {
      // Fix: ne pas descendre sous le volume actuel déclaré — la réalité (il court déjà X km)
      // prime sur l'estimation théorique (VMA recalculée, confidence basse, etc.)
      // MAIS plafonner par ce qui est physiquement atteignable sur les sessions running
      // (avec vitesse généreuse à 85% VMA pour compenser une VMA potentiellement sous-estimée)
      let safeVmaCap = vmaBasedMaxVolume;
      if (currentVolume > 0 && currentVolume > vmaBasedMaxVolume) {
        const generousEfSpeed = vma * 0.85;
        // Cohérence cap théorique : utiliser volumeCapSessions (densifie Semi/Marathon freq ≤ 3)
        const maxAchievable = volumeCapSessions === 1
          ? Math.round((slMaxDur / 60) * generousEfSpeed)
          : Math.round((slMaxDur / 60) * generousEfSpeed + ((volumeCapSessions - 1) * nonSlMaxDur / 60) * generousEfSpeed);
        safeVmaCap = Math.max(vmaBasedMaxVolume, Math.min(currentVolume, maxAchievable));
        console.log(`[Periodization] VMA-duration cap: raw=${vmaBasedMaxVolume}km, currentVol=${currentVolume}km, achievable@85%VMA=${maxAchievable}km → safe=${safeVmaCap}km`);
      }
      if (safeVmaCap < maxVolume) {
        console.log(`[Periodization] VMA-duration cap: VMA=${vma}, running=${runningSessions} volumeCap=${volumeCapSessions} sess, SL≤${slMaxDur}min, EF=${efSpeedKmH.toFixed(1)}km/h → max ${safeVmaCap}km (was ${maxVolume}km)`);
        maxVolume = safeVmaCap;
      }
    }
  }

  // Fix: le maxVolume ne peut jamais descendre sous le volume actuel déclaré
  // Un coureur qui fait déjà 70km/sem ne doit pas avoir un plan qui le fait régresser
  // Plafonné par ce qui est atteignable avec les sessions running disponibles
  if (currentVolume > 0 && maxVolume < currentVolume) {
    console.log(`[Periodization] maxVolume ${maxVolume}km < currentVolume ${currentVolume}km → raised to currentVolume`);
    maxVolume = currentVolume;
  }
  // Garantir une progression minimale de 18% au-dessus du volume actuel
  // Un coureur à 45km/sem ne doit pas avoir un plan plat à 45km — il doit progresser
  // Le pic visé est ~+18% car le lissage post-calcul (cap +15%/sem entre récup et charge)
  // rabote 2-3km. Cibler 1.18× donne un pic réel ~+15% après lissage (la "vraie" progression).
  // Et on autorise la cible à dépasser baseMaxVolume de 10% MAX pour absorber ce lissage —
  // sans jamais dépasser le cap VMA-durée (vmaHardCap déjà appliqué plus haut).
  if (currentVolume > 0 && maxVolume <= currentVolume * 1.05) {
    const progressionTarget = Math.round(currentVolume * 1.18);
    // Plafonné par le cap absolu de sécurité (VMA-dur ou table) + 10% pour absorber le lissage
    const safeTarget = Math.min(progressionTarget, Math.round(baseMaxVolume * 1.10));
    if (safeTarget > maxVolume) {
      console.log(`[Periodization] Progression minimale: maxVolume ${maxVolume}km → ${safeTarget}km (currentVol ${currentVolume} × 1.18, cap base ${baseMaxVolume} × 1.10)`);
      maxVolume = safeTarget;
    }
  }

  // Sauvegarder le cap VMA comme plafond absolu de sécurité
  // Les planchers (minViableVolume, minPeakVolume) ne peuvent PAS remonter au-dessus
  // → un runner à VMA 8 SANS volume déclaré ne doit pas avoir 40km/sem
  const vmaHardCap = maxVolume;

  // Distance de course en km — utilisée pour les planchers et garde-fous
  const raceDistanceKm = isTrail ? (trailDistance || 10) :
    isMarathon ? 42.2 : isSemi ? 21.1 : is10k ? 10 : 5;

  // Plancher minimum par distance de course : le peak doit permettre de s'entraîner utilement
  const minViableVolume = raceDistanceKm <= 5 ? 15 : raceDistanceKm <= 10 ? 22 :
    raceDistanceKm <= 21.1 ? 32 : raceDistanceKm <= 42.2 ? 38 : 40;

  // Mode marche-course : pour un coureur avec base mais actuellement à très bas volume
  // (ex: intermédiaire à 5 km/sem qui prépare un semi) qui a déclaré UN CHRONO PRÉCIS
  // (pas Finisher / Maintien / Perte de poids). Sa volonté d'atteindre un temps précis +
  // son attestation IRRÉALISTE = engagement explicite à un entraînement plus ambitieux.
  // On élève le cap en assumant des SL plus longues avec marche-course (la cliente alterne
  // course et marche, accumule plus de distance via une durée de séance plus longue).
  // Hors objectif chrono : on reste sur le cap classique (course continue à 75 % VMA).
  let effectiveVmaCap = vmaHardCap;
  const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);
  // ALIGNEMENT doctrine feedback_mode_marche_course_scope (Débutants uniquement).
  // Ce mécanisme code élève le cap VMA en ASSUMANT que les séances longues seront générées
  // en marche-course par le LLM (alternance course/marche → plus de durée tolérable).
  // Or le prompt LLM ne génère le type "Marche/Course" QUE pour les Débutants.
  // Donc activer ce mécanisme pour Inter/Confirmé/Expert créerait une incohérence dangereuse :
  // cap VMA élevé → volumes longs → mais COURUS en continu (pas marche-course) = risque blessure.
  // Garde-fou : Débutant uniquement, en cohérence avec le scope du type de séance côté prompt.
  const isLevelEligibleForWalkRun = level === 'Débutant (0-1 an)';
  const isLowVolForTimedLongRace = isLevelEligibleForWalkRun &&
    currentVolume > 0 &&
    currentVolume < minViableVolume * 0.30 &&
    raceDistanceKm >= 15 &&
    hasSpecificTimeTarget;
  if (isLowVolForTimedLongRace) {
    // Mode marche-course "préparation à l'objectif" : pousse vraiment le coureur
    // au-delà du cap classique. Le risque est porté par l'attestation IRRÉALISTE
    // qu'il a explicitement cochée. L'app reste honnête (faisabilité, welcome,
    // modal alertent sur l'objectif réaliste) mais le PLAN entraîne pour réussir.
    const slMaxDurMC = 165;
    const otherMaxDurMC = Math.round(slMaxDurMC * 0.75);
    const efSpeedMC = 5.8;
    const realisticFactorMC = 0.80;
    const runningSessionsMC = Math.max(1, (sessionsPerWeek ?? 3) - 1);
    const slMaxKmMC = (slMaxDurMC * realisticFactorMC / 60) * efSpeedMC;
    const otherMaxKmMC = ((runningSessionsMC - 1) * otherMaxDurMC * realisticFactorMC / 60) * efSpeedMC;
    const vmaCapMC = Math.round(slMaxKmMC + otherMaxKmMC);
    if (vmaCapMC > effectiveVmaCap) {
      console.log(`[Periodization] Mode marche-course activé (currentVol ${currentVolume}km, race ${raceDistanceKm}km) : cap ${effectiveVmaCap}km → ${vmaCapMC}km`);
      effectiveVmaCap = vmaCapMC;
    }
  }

  if (maxVolume < minViableVolume) {
    // Ne pas remonter au-dessus du cap VMA-durée (sécurité physique prime)
    const safeMin = Math.min(minViableVolume, effectiveVmaCap);
    if (safeMin > maxVolume) {
      console.log(`[Periodization] maxVolume ${maxVolume}km < plancher viable ${minViableVolume}km → raised to ${safeMin}km (VMA cap: ${effectiveVmaCap}km)`);
      maxVolume = safeMin;
    }
  }

  // Garde-fou : le volume pic doit permettre de couvrir au moins 150% de la distance de course
  // MAIS cappé par MAX_WEEKLY_VOLUME pour le niveau expert du type d'objectif
  // ET par le cap VMA-durée (sécurité physique)
  const rawMinPeakVolume = Math.round(raceDistanceKm * 1.5);
  const objectiveKey = isVK ? 'VK' : isTrailSteep ? 'TrailSteep' :
    isUltraLong ? 'Trail100+' : isUltra ? 'Trail60+' : isTrail30Plus ? 'Trail30+' : isTrail ? 'Trail<30' :
    isMarathon ? 'Marathon' : isSemi ? 'Semi' : is10k ? '10K' : isPertePoids ? 'PertePoids' :
    isMaintien ? 'Maintien' : '5K';
  const absoluteCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert || 100;
  let minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap);

  // Hard floor minPeakVolume Semi/Marathon (audit 2026-05-20 Margaux/Bertrand) :
  // le cap VMA-durée (effectiveVmaCap) pouvait neutraliser le plancher Sprint pour
  // Inter/Confirmé VMA modérée + freq 3 → pic Semi 18 km (Margaux) ou 16 km (Bertrand),
  // ridicule pour préparer une course de 21.1 km.
  // On garantit un plancher minimal Semi ≥ 22 km / Marathon ≥ 32 km, indépendamment
  // du cap VMA-durée. Sous Pfitzinger (référentiel 36/55 km) mais pas ridicule.
  // Cohérent doctrine [[feedback_courte_duree_charge_allegee]] : on plafonne raisonnable.
  if (objectiveKey === 'Semi' && minPeakVolume < 22) {
    console.log(`[Periodization] Semi pic hard floor: ${minPeakVolume} → 22 km (anti-bug Margaux/Bertrand)`);
    minPeakVolume = 22;
  }
  if (objectiveKey === 'Marathon' && minPeakVolume < 32) {
    console.log(`[Periodization] Marathon pic hard floor: ${minPeakVolume} → 32 km`);
    minPeakVolume = 32;
  }
  // P1a — Étendre hard floor à 10K et 5K (audit fin Lilian 10K pic 17 km bloqué) :
  // - 10K ≥ 18 km : sous Pfitzinger novice (25-30), doctrine charge allégée respectée
  // - 5K ≥ 15 km : sous référentiel (20-25), couvre ratio ~3× la distance de course
  // Anti-bug Lilian : 10K pic 17 km stagnait malgré progression, faisabilité insuffisante.
  if (objectiveKey === '10K' && minPeakVolume < 18) {
    console.log(`[Periodization] 10K pic hard floor: ${minPeakVolume} → 18 km (anti-bug Lilian)`);
    minPeakVolume = 18;
  }
  if (objectiveKey === '5K' && minPeakVolume < 15) {
    console.log(`[Periodization] 5K pic hard floor: ${minPeakVolume} → 15 km`);
    minPeakVolume = 15;
  }

  if (maxVolume < minPeakVolume) {
    console.log(`[Periodization] maxVolume ${maxVolume}km < min peak (${minPeakVolume}km, raw=${rawMinPeakVolume}, cap=${absoluteCap}) → raised`);
    maxVolume = minPeakVolume;
  }

  // Répartition des phases selon durée du plan
  // Pour les plans courts (≤6 sem), on adapte pour toujours avoir de l'affûtage
  const phases: PeriodizationPhase[] = [];
  let fondamentalWeeks: number, developpementWeeks: number, specifiqueWeeks: number, affutageWeeks: number;

  if (isMaintien || isPertePoids) {
    // Maintien/Remise/Perte de poids : PAS de phase spécifique ni affûtage — progression linéaire douce
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.45));
    developpementWeeks = Math.max(1, totalWeeks - fondamentalWeeks);
    specifiqueWeeks = 0;
    affutageWeeks = 0;
  } else if (totalWeeks <= 4) {
    // Plan très court : 1 fondamental, 1 developpement, 1 specifique, 1 affutage
    fondamentalWeeks = 1;
    developpementWeeks = Math.max(1, totalWeeks - 3);
    specifiqueWeeks = 1;
    affutageWeeks = 1;
  } else if (totalWeeks <= 6) {
    // Plan court : adapter proportionnellement, toujours 1 sem affutage
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(1, Math.floor(totalWeeks * 0.35));
    affutageWeeks = 1;
    specifiqueWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - affutageWeeks);
  } else {
    fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
    specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
    affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);
    // Fix: cap affûtage à 2 semaines pour plans courts (≤14 sem) — chaque semaine de développement compte
    if (totalWeeks <= 14 && affutageWeeks > 2) {
      const excess = affutageWeeks - 2;
      affutageWeeks = 2;
      specifiqueWeeks += excess;
    }
    // Fix: cap affûtage selon distance de course — un 10km n'a pas besoin de 4 sem d'affûtage
    const maxAffutageByDist = raceDistanceKm <= 10 ? 1 : raceDistanceKm <= 21.1 ? 2 : raceDistanceKm <= 42.2 ? 3 : 4;
    if (affutageWeeks > maxAffutageByDist) {
      const excess = affutageWeeks - maxAffutageByDist;
      affutageWeeks = maxAffutageByDist;
      // Redistribuer vers spécifique (plus utile)
      specifiqueWeeks += excess;
    }

    // === PATCH Code 2 : Taper 3 sem min pour Semi/Marathon Conf/Expert avec vol significatif ===
    // Justification coach (Pfitzinger, Daniels) : 2 sem insuffisant pour purger fatigue accumulée
    // chez profils confirmés/experts avec gros volume. 3 sem = standard.
    // Option 2 (mathématique) : Conf/Expert + Semi/Marathon + peak vol ≥ 50 km/sem
    const lvlKeyForTaper = labelToLevelKey(level);
    const isHighLevelTaper = lvlKeyForTaper === 'conf' || lvlKeyForTaper === 'expert';
    const needLongTaper = (isSemi || isMarathon) && isHighLevelTaper && maxVolume >= 50;
    if (needLongTaper && affutageWeeks < 3) {
      const wanted = 3 - affutageWeeks;
      // Garde-fou Dev : ne pas tomber sous 2 sem sur spécifique/développement
      const fromSpec = Math.min(wanted, Math.max(0, specifiqueWeeks - 2));
      const fromDev = Math.min(wanted - fromSpec, Math.max(0, developpementWeeks - 2));
      const actualGain = fromSpec + fromDev;
      if (actualGain > 0) {
        affutageWeeks += actualGain;
        specifiqueWeeks -= fromSpec;
        developpementWeeks -= fromDev;
        console.log(`[Periodization] Taper 3 sem forcé (${isSemi?'Semi':'Marathon'} ${lvlKeyForTaper} vol${maxVolume}): affutage ${affutageWeeks-actualGain}→${affutageWeeks} (de spec:${fromSpec} + dev:${fromDev})`);
      }
    }
  }

  // Assigner les phases
  for (let i = 0; i < totalWeeks; i++) {
    if (i < fondamentalWeeks) {
      phases.push('fondamental');
    } else if (i < fondamentalWeeks + developpementWeeks) {
      phases.push('developpement');
    } else if (i < fondamentalWeeks + developpementWeeks + specifiqueWeeks) {
      phases.push('specifique');
    } else {
      phases.push('affutage');
    }
  }

  // Calculer les semaines de récupération (toutes les 3-4 semaines)
  // Ne PAS insérer de recovery dans les semaines d'affûtage
  const firstAffutageWeek = totalWeeks - affutageWeeks + 1; // 1-indexed
  const recoveryWeeks: number[] = [];
  const recoveryInterval = level === 'Débutant (0-1 an)' ? 3 : 4;
  // Première récup au minimum à S4 (3 semaines de charge avant), même pour débutants
  const firstRecoveryWeek = Math.max(recoveryInterval, 4);
  for (let i = firstRecoveryWeek; i <= totalWeeks - 2; i += recoveryInterval) {
    if (i >= firstAffutageWeek) continue; // pas de recovery en affûtage
    recoveryWeeks.push(i);
    phases[i - 1] = 'recuperation'; // 0-indexed
  }
  // Si le dernier cycle fait ≥ recoveryInterval semaines sans récup
  // et qu'on n'est pas en fin de plan (affûtage), ajouter une récup
  const lastRecov = recoveryWeeks.length > 0 ? recoveryWeeks[recoveryWeeks.length - 1] : 0;
  const weeksAfterLastRecov = totalWeeks - lastRecov;
  if (weeksAfterLastRecov > recoveryInterval && totalWeeks - 1 > lastRecov) {
    const extraRecov = lastRecov + recoveryInterval;
    // Ne pas insérer en semaine d'affûtage (les 2 dernières semaines pour plans avec course)
    const isRacePlan = !(isMaintien || isPertePoids);
    const minWeek = isRacePlan ? totalWeeks - affutageWeeks : totalWeeks;
    if (extraRecov <= minWeek && extraRecov <= totalWeeks - 1) {
      recoveryWeeks.push(extraRecov);
      phases[extraRecov - 1] = 'recuperation';
    }
  }

  // Calculer les volumes hebdomadaires
  const weeklyVolumes: number[] = [];

  // ══════════════════════════════════════════════════════════════
  // CALCUL DU VOLUME S1 PAR BACKPROPAGATION
  // Le pic doit arriver avant l'affûtage. On calcule le S1 idéal
  // pour atteindre maxVolume au bon moment, en tenant compte des
  // semaines de récup (qui ne progressent pas).
  // ══════════════════════════════════════════════════════════════
  const peakWeekIndex = totalWeeks - affutageWeeks - 1; // Dernière semaine avant affûtage
  // Nombre de semaines effectives de progression (hors récup)
  let progressionWeeks = 0;
  for (let i = 0; i <= peakWeekIndex; i++) {
    if (!recoveryWeeks.includes(i + 1)) progressionWeeks++;
  }
  // Volume S1 idéal = maxVolume / (1 + rate)^(semaines de progression - 1)
  const idealStartVolume = maxVolume / Math.pow(1 + progressionRate, Math.max(1, progressionWeeks - 1));

  // Le volume S1 est le MAX entre :
  // - idealStartVolume (backpropagé depuis le pic)
  // - un plancher minimum par niveau (on ne descend pas en dessous)
  // Et le MIN avec :
  // - currentVolume (on ne fait pas courir plus que ce qu'il court déjà)
  // - maxVolume * 0.65 (jamais plus de 65% du pic en S1, sinon pas de progression)
  let minStartVolume = level === 'Débutant (0-1 an)' ? 8 :
                      level === 'Intermédiaire (Régulier)' ? 15 :
                      level === 'Confirmé (Compétition)' ? 20 : 25;

  // Ajuster le volume de départ pour les profils IMC élevé (marche/course = moins de km)
  if (bmiForRate >= 35 && minStartVolume > 5) {
    minStartVolume = Math.max(5, Math.round(minStartVolume * 0.60));
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} ≥ 35 → minStartVolume réduit à ${minStartVolume}km`);
  } else if (bmiForRate >= 30 && minStartVolume > 6) {
    minStartVolume = Math.max(6, Math.round(minStartVolume * 0.75));
    console.log(`[Periodization] IMC ${bmiForRate.toFixed(1)} ≥ 30 → minStartVolume réduit à ${minStartVolume}km`);
  }

  let startVolume = Math.max(idealStartVolume, minStartVolume);
  // Si le coureur a déclaré un volume actuel > 0, l'utiliser comme référence
  if (currentVolume > 0) {
    // ─── Hard floor S1 = 100% du volume courant (audit 2026-05-18) ───
    // RÈGLE STRICTE : on ne baisse JAMAIS sous le volume actuel du user.
    // L'ancien floor 85% (currentVolume × 0.85) produisait systématiquement
    // une S1 à -15% du current sur les 5 plans audités (Alan/Sébastien/Antoine/
    // Annabelle/Armando) → ressenti "plan mou" pour confirmé/expert (cause
    // probable du désabonnement georgeslor1), illusion "je suis prêt" pour
    // débutant. Cf. [[feedback_input_client_obligatoire]] + audit
    // AUDIT-5-PLANS-TEMPLATE-V2.md pattern #1.
    const currentVolumeFloor = currentVolume; // 100% (au lieu de × 0.85)
    startVolume = Math.max(startVolume, currentVolumeFloor);
    // ─── Sprint 6 (2026-05-19) — volumeCap = +60% MAX sur S1 (audit Romane) ───
    // Avant : volumeCap = max(currentVolume, minStartVolume) → écrasait le déclaré
    //   par minStartVolume du niveau (Inter cv=5 → cap=15 → S1=14, +180% non sûr).
    //   Cf. AUDIT-PLAN-ROMANE-TEST.md + INVESTIGATION-MIN-START-VOLUME.md.
    // Après : on RESPECTE le declared user (doctrine feedback_input_client_obligatoire)
    //   avec un garde-fou de progression S1 ≤ currentVolume × 1.6.
    //   +60% = compromis Coach 15 ans (Daniels +1mi/sem strict serait trop bas,
    //   ACSM "max +10%/sem hors S1" trop bas aussi ; on parie qu'un Inter habitué
    //   qui déclare une semaine faible (5km) est en réalité à 6-8km de baseline).
    //   Validation Romane verbatim : "max +60% vu que la personne se declare
    //   intermediaire et donc habitué. Si jamais elle fait une faible semaine à 5
    //   on peut quand même monter à +60% et pas +50."
    const volumeCap = Math.round(currentVolume * 1.6);
    startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
    // Re-appliquer le hard floor — il prime sur la règle des 65% du peak
    // La règle des 65% garantit de la progression, mais on ne peut pas
    // faire régresser un coureur sous son volume actuel pour ça.
    // Plafonné à 90% du peak pour garder un minimum de marge de progression
    startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90));
  } else {
    // Pas de volume déclaré (débutant ou non renseigné) : utiliser minStartVolume comme base
    // et plafonner à 65% du pic pour garder de la marge de progression
    startVolume = Math.min(startVolume, maxVolume * 0.65);
  }

  // ─── P1d (audit fin 2026-05-20) — Mode "absolute beginner" cv=0 ───
  // Bug Lilian : 10K Débutant cv=0 → saut 0→13 km en S1, beaucoup trop dur.
  // Pour un vrai débutant absolu (cv=0 ET niveau Débutant), il faut un démarrage
  // ULTRA prudent : cap S1 à 10 km max (vs 13+ projeté sans cap) pour permettre
  // une adaptation tissulaire progressive. Le mode marche-course du LLM (déjà
  // actif pour Déb) gère la modalité d'exécution ; ici on cape la quantité.
  // Cohérent doctrine [[project_coach_running_ia_frequence]] + ACSM "max 10%/sem
  // hors S1" appliqué dès le démarrage.
  const isAbsoluteBeginner = currentVolume === 0 && level === 'Débutant (0-1 an)';
  if (isAbsoluteBeginner) {
    const cappedS1 = Math.min(startVolume, 10);
    if (cappedS1 < startVolume) {
      console.log(`[Periodization] Mode absolute beginner (cv=0, Déb): S1 ${Math.round(startVolume)}km → ${cappedS1}km (anti-bug Lilian)`);
      startVolume = cappedS1;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // RATE ADAPTATIF : pour les plans longs, réduire le taux pour que
  // le pic arrive vers 65-70% du plan (pas trop tôt → pas de plateau)
  // ══════════════════════════════════════════════════════════════
  let effectiveRate = progressionRate;
  if (progressionWeeks > 0 && startVolume > 0 && maxVolume > startVolume) {
    // Calculer le rate nécessaire pour atteindre le pic à ~70% des semaines de progression
    const targetPeakAt = Math.round(progressionWeeks * 0.70);
    const neededRate = Math.pow(maxVolume / startVolume, 1 / Math.max(1, targetPeakAt - 1)) - 1;
    // Utiliser le min entre le rate déclaré et le rate adapté (ne jamais monter plus vite que prévu)
    // MAIS ne jamais descendre en dessous de 5% — sinon les plans longs stagnent
    if (neededRate < progressionRate && neededRate > 0.05) {
      effectiveRate = neededRate;
      console.log(`[Periodization] Rate adaptatif: ${(progressionRate*100).toFixed(1)}% → ${(effectiveRate*100).toFixed(1)}% (pic visé à S~${targetPeakAt}/${progressionWeeks})`);
    }
  }

  let currentVol = startVolume;
  let weeksAtPeak = 0; // Compteur pour ondulation

  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;

    if (recoveryWeeks.includes(weekNum)) {
      // Semaine de récup: réduction proportionnelle au volume (plus doux pour gros volumes)
      const prevWeekVol = weeklyVolumes.length > 0 ? weeklyVolumes[weeklyVolumes.length - 1] : currentVol;
      // Drop de récup proportionnel au volume : plus doux pour les petits volumes
      const recoveryFactor = prevWeekVol >= 60 ? 0.80 : prevWeekVol >= 30 ? 0.78 : 0.80;
      weeklyVolumes.push(Math.round(prevWeekVol * recoveryFactor));
      weeksAtPeak = 0; // Reset ondulation après récup
    } else if (phases[i] === 'affutage') {
      // Affûtage: réduction progressive
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25); // De -25% à -50%
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      // Ondulation au pic : alterner 95%→100% quand on est au plafond
      // Évite le plateau monotone de 5+ semaines au même volume
      const atPeak = currentVol >= maxVolume * 0.98;
      if (atPeak) {
        weeksAtPeak++;
        const ondulationFactor = weeksAtPeak % 2 === 0 ? 0.95 : 1.0;
        weeklyVolumes.push(Math.round(maxVolume * ondulationFactor));
      } else {
        weeklyVolumes.push(Math.round(currentVol));
      }
      currentVol = Math.min(currentVol * (1 + effectiveRate), maxVolume);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // GARDE-FOU PIC : si le pic réel est trop bas par rapport à minPeakVolume,
  // recalculer avec un taux ajusté (pour plans courts où currentVolume cap bloque)
  // ══════════════════════════════════════════════════════════════
  const actualPeak = Math.max(...weeklyVolumes);
  if (actualPeak < minPeakVolume * 0.85) {
    // Le pic est plus de 15% en-dessous du minimum requis
    // Recalculer le taux nécessaire pour atteindre minPeakVolume
    const neededRate = Math.pow(minPeakVolume / startVolume, 1 / Math.max(1, progressionWeeks - 1)) - 1;
    // Plafonner le taux ajusté à 20% max (sécurité blessure)
    const adjustedRate = Math.min(neededRate, 0.20);

    if (adjustedRate > progressionRate) {
      console.log(`[Periodization] Peak ${actualPeak}km < 85% of minPeak ${minPeakVolume}km → adjusting rate from ${(progressionRate*100).toFixed(1)}% to ${(adjustedRate*100).toFixed(1)}%`);

      // Recalculer les volumes avec le nouveau taux
      let adjustedVol = startVolume;
      for (let i = 0; i < totalWeeks; i++) {
        const weekNum = i + 1;
        if (recoveryWeeks.includes(weekNum)) {
          // Réduction proportionnelle au volume (plus doux pour gros volumes)
          const prevVol = i > 0 ? weeklyVolumes[i - 1] : adjustedVol;
          const recovFactor = prevVol >= 60 ? 0.80 : prevVol >= 30 ? 0.78 : 0.80;
          weeklyVolumes[i] = Math.round(prevVol * recovFactor);
        } else if (phases[i] === 'affutage') {
          const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
          const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
          weeklyVolumes[i] = Math.round(adjustedVol * reductionFactor);
        } else {
          weeklyVolumes[i] = Math.round(adjustedVol);
          adjustedVol = Math.min(adjustedVol * (1 + adjustedRate), maxVolume);
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // POST-CALCUL : lisser les progressions dans les volumes projetés
  // Mêmes règles que enforceFullPlanConstraints pour cohérence UI/Guard
  // ══════════════════════════════════════════════════════════════
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < weeklyVolumes.length - 1; i++) {
      const curr = weeklyVolumes[i];
      const next = weeklyVolumes[i + 1];
      if (curr <= 5 || next <= 5) continue;
      const increase = (next - curr) / curr;

      // Drops vers recovery/affûtage sont normaux
      if (increase < 0) continue;

      const isFromRecovery = recoveryWeeks.includes(i + 1) || phases[i] === 'recuperation';
      if (isFromRecovery) {
        // Post-récup : le retour ne dépasse pas +15% de la semaine de récup
        // ET ne dépasse pas la semaine PRÉ-récup (double garde-fou)
        const preRecovVol = i > 0 ? weeklyVolumes[i - 1] : curr;
        const maxPostRecov = Math.min(preRecovVol, Math.round(curr * 1.15));
        if (next > maxPostRecov) {
          weeklyVolumes[i + 1] = maxPostRecov;
        }
      } else if (increase > 0.15) {
        weeklyVolumes[i + 1] = Math.round(curr * 1.15);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // R1 — Projection D+ par semaine pour les plans trail
  // Utilise calculateWeekTargetElevation() (planUtils) phase par phase pour
  // produire un tableau aligné sur weeklyVolumes. Permet d'auditer/contrôler
  // la prépa trail (gate IRRÉALISTE D+ insuffisant en R2) et d'injecter la
  // cible D+ dans le prompt Gemini (R3).
  // ──────────────────────────────────────────────────────────────────────────
  let weeklyElevationTarget: number[] | undefined;
  if (isTrail && trailElevation && trailElevation > 0) {
    // Assert défensif : si phases est désaligné avec totalWeeks (ne devrait pas
    // arriver, mais protection contre régression silencieuse côté code amont).
    if (phases.length !== totalWeeks) {
      console.warn(`[Periodization Trail] phases/totalWeeks mismatch: ${phases.length} vs ${totalWeeks}`);
    }
    weeklyElevationTarget = [];
    for (let i = 0; i < totalWeeks; i++) {
      const wn = i + 1;
      const phase = phases[i]; // undefined toléré par calculateWeekTargetElevation (fallback '')
      const t = calculateWeekTargetElevation(wn, totalWeeks, trailElevation, level, params?.currentWeeklyElevation, phase);
      weeklyElevationTarget.push(t);
    }
    // console.debug : log technique utile en dev, silencieux en prod (vs console.log)
    console.debug(`[Periodization Trail] weeklyElevationTarget calculé: [${weeklyElevationTarget.join(', ')}] (race D+ ${trailElevation}m, current ${params?.currentWeeklyElevation || 0}m/sem)`);
  }

  return { weeklyVolumes, weeklyPhases: phases, recoveryWeeks, weeklyElevationTarget };
};

/**
 * Crée le contexte de génération FIGÉ pour garantir la cohérence.
 */
const createGenerationContext = (
  data: QuestionnaireData,
  paces: TrainingPaces,
  vma: number,
  vmaSource: string,
  totalWeeks: number
): GenerationContext => {
  // Volume actuel : si le coureur a renseigné 0 ou rien, on estime un plancher réaliste
  // selon son niveau ET son objectif. Un confirmé qui reprend à 0 ne démarre PAS à 45km.
  const declaredVolume = data.currentWeeklyVolume;
  const goal = data.goal || '';
  const isPertePoids = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien') || goal.includes('Remise');

  // Niveau effectif (avec override VMA) — utilisé partout : defaultVolume + périodisation
  // → cohérence entre volumes planifiés (UI) et enforcement (génération)
  const effectiveLevelKey = detectLevelFromData({ ...data, vma }) as 'deb' | 'inter' | 'conf' | 'expert';
  const effectiveLevel = LEVEL_LABEL[effectiveLevelKey] || data.level || 'Intermédiaire (Régulier)';

  // Default volume par niveau — différencié par type d'objectif ET distance
  const isTrail = goal.includes('Trail');
  const trailDist = data.trailDetails?.distance || 0;
  const trailElev = data.trailDetails?.elevation || 0;
  const trailRatio = trailDist > 0 ? trailElev / trailDist : 0;
  const isVKCtx = isTrail && trailDist <= 5 && trailRatio >= 150;
  const isTrailSteepCtx = !isVKCtx && isTrail && trailDist <= 15 && trailRatio >= 80;
  const isUltra = isTrail && trailDist >= 60;
  const isTrail30Plus = isTrail && trailDist >= 30;
  const sub = (data.subGoal || '').toLowerCase();
  const isMarathon = (sub.includes('marathon') && !sub.includes('semi'));
  const isSemi = sub.includes('semi');

  let defaultVolume: number;
  const is10k = sub.includes('10');
  if (effectiveLevelKey === 'deb') {
    defaultVolume = isPertePoids ? 10 : isMaintien ? 12 : isVKCtx ? 8 : isTrailSteepCtx ? 10 : isUltra ? 20 : isTrail30Plus ? 18 : isMarathon ? 20 : isSemi ? 18 : isTrail ? 15 : is10k ? 15 : 12;
  } else if (effectiveLevelKey === 'inter') {
    defaultVolume = isPertePoids ? 15 : isMaintien ? 22 : isVKCtx ? 15 : isTrailSteepCtx ? 18 : isUltra ? 35 : isTrail30Plus ? 30 : isMarathon ? 38 : isSemi ? 32 : isTrail ? 22 : 28;
  } else if (effectiveLevelKey === 'conf') {
    defaultVolume = isPertePoids ? 20 : isMaintien ? 25 : isVKCtx ? 20 : isTrailSteepCtx ? 25 : isUltra ? 50 : isTrail30Plus ? 40 : isMarathon ? 48 : isSemi ? 38 : isTrail ? 30 : 38;
  } else {
    // Expert
    defaultVolume = isPertePoids ? 25 : isMaintien ? 30 : isVKCtx ? 25 : isTrailSteepCtx ? 30 : isUltra ? 60 : isTrail30Plus ? 50 : isMarathon ? 58 : isSemi ? 42 : isTrail ? 40 : 48;
  }

  // FIX: Pour PdP/Maintien avec expérience course, rehausser le defaultVolume
  // Un semi-marathonien qui veut perdre du poids court déjà bien plus qu'un sédentaire
  if ((isPertePoids || isMaintien) && vmaSource) {
    const src = vmaSource.toLowerCase();
    let raceDefaultVolume = 0;
    const hasMarathonExp = src.includes('marathon') && !src.includes('semi');
    const hasSemiExp = src.includes('semi');
    const has10kExp = src.includes('10k') || src.includes('10 km') || src.includes('10km');
    if (effectiveLevelKey === 'deb') {
      raceDefaultVolume = hasMarathonExp ? 20 : hasSemiExp ? 18 : has10kExp ? 15 : 0;
    } else if (effectiveLevelKey === 'inter') {
      raceDefaultVolume = hasMarathonExp ? 35 : hasSemiExp ? 28 : has10kExp ? 25 : 0;
    } else if (effectiveLevelKey === 'conf') {
      raceDefaultVolume = hasMarathonExp ? 45 : hasSemiExp ? 35 : has10kExp ? 30 : 0;
    } else {
      raceDefaultVolume = hasMarathonExp ? 55 : hasSemiExp ? 40 : has10kExp ? 35 : 0;
    }
    if (raceDefaultVolume > defaultVolume) {
      console.log(`[GenCtx] PdP/Maintien uplift: defaultVolume ${defaultVolume}→${raceDefaultVolume} (expérience ${hasMarathonExp ? 'marathon' : hasSemiExp ? 'semi' : '10k'})`);
      defaultVolume = raceDefaultVolume;
    }
  }

  // Si le coureur déclare 0 ou ne renseigne pas, on utilise le default
  // Si le coureur déclare un volume > 0 mais très bas pour son niveau, on respecte SA déclaration
  const currentVolume = (declaredVolume && declaredVolume > 0) ? declaredVolume : defaultVolume;

  const periodizationPlan = calculatePeriodizationPlan(
    totalWeeks,
    currentVolume,
    effectiveLevel,
    data.goal || '',
    data.subGoal,
    data.trailDetails?.distance,
    data.trailDetails?.elevation,
    data.targetTime,
    data.age,
    data.weight,
    vma,
    data.frequency || 3,
    { height: data.height, vmaSource, currentWeeklyElevation: data.currentWeeklyElevation },
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
    periodizationPlan: {
      totalWeeks,
      ...periodizationPlan,
    },
    questionnaireSnapshot: { ...data, vma },
    generatedAt: new Date().toISOString(),
    modelUsed: 'gemini-3-flash-preview',
  };
};

// ---------------------------------------------------------------------------
// Instructions de sécurité santé selon le profil
// ---------------------------------------------------------------------------

// === Sprint 5 — constantes consolidées pour éviter répétitions x4/x3 dans le prompt ===
// Avant Sprint 5 : "ne pas mentionner poids/IMC" répété 4× (L2947, L2960, L2970, L3037, L3047)
// et "cross-training interdit" répété 3× (L2948, L2961, L2971). 3-flash n'a pas besoin de la
// redite — on garde une mention unique en fin de prompt safety (la priorité doctrinale
// "jamais poids" et "que course à pied" reste cf. mémoires utilisateur).
const NO_WEIGHT_MENTION_RULE = `🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence, la minceur ou la morphologie du coureur dans AUCUN champ (welcomeMessage, advice, mainSet, warmup, cooldown). Rester positif et encourageant.`;
const NO_CROSS_TRAINING_RULE = `🚫 NE JAMAIS proposer ni mentionner de cross-training, vélo, natation, elliptique ou autre sport. Ce coach est EXCLUSIVEMENT course à pied. Repos, marche active et renforcement sont les seules alternatives autorisées.`;

const buildSafetyInstructions = (data: QuestionnaireData, isBeginnerLevel: boolean): string => {
  const parts: string[] = [];
  const bmi = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : null;
  const age = data.age || 0;
  const weight = data.weight || 0;
  const isSenior = age >= 45;
  const isRestart = data.fitnessSubGoal === 'Reprendre après une pause' || data.lastActivity === 'Plus de 6 mois';
  // Sprint 5 — flags pour injecter les règles globales 1×
  let needsNoWeightMention = false;
  let needsNoCrossTraining = false;

  // 3-tier BMI system: 25 (surpoids), 30 (obésité modérée), 35 (obésité sévère)
  const imcTier: 0 | 1 | 2 | 3 = bmi !== null
    ? (bmi >= 35 ? 3 : bmi >= 30 ? 2 : bmi >= 25 ? 1 : 0)
    : 0;
  const isOverweight = imcTier >= 2; // rétro-compat pour isHighRisk/isModerateRisk

  // Détection des profils à risque nécessitant un avis médical OBLIGATOIRE
  const isHighRisk = (isSenior && isBeginnerLevel) || (isOverweight && isBeginnerLevel) || (isSenior && isOverweight) || imcTier >= 3;
  const isModerateRisk = isSenior || isOverweight || imcTier >= 1;

  if (isHighRisk) {
    parts.push(`🚨 PROFIL À RISQUE ÉLEVÉ — AVIS MÉDICAL IMPÉRATIF
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure EN PREMIER, AVANT toute autre information :
"⚠️ Avant de commencer ce programme, il est INDISPENSABLE de consulter votre médecin pour obtenir un certificat médical d'aptitude à la pratique de la course à pied. ${isSenior ? `À partir de ${age} ans` : ''}${isSenior && isOverweight ? ' et ' : ''}${isOverweight ? 'avec votre profil' : ''}, un bilan cardio-vasculaire (test d'effort) est fortement recommandé. Votre santé est notre priorité absolue — ce plan est conçu pour vous accompagner en toute sécurité, mais seul un médecin peut confirmer que vous êtes apte à démarrer."
- Répète ce rappel dans le advice de la PREMIÈRE séance : "Rappel : assurez-vous d'avoir consulté votre médecin avant de démarrer."
- Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps, de s'arrêter immédiatement en cas de douleur thoracique, essoufflement anormal ou malaise.
- Ton ton doit être BIENVEILLANT et ENCOURAGEANT, jamais stigmatisant. Le coureur fait un choix courageux en se lançant.`);
  } else if (isModerateRisk) {
    parts.push(`🩺 SÉCURITÉ SANTÉ — AVIS MÉDICAL RECOMMANDÉ
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.${isSenior ? ` À partir de ${age} ans, un bilan cardio-vasculaire est particulièrement conseillé.` : ''}"
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
- 2 jours de repos complet/sem + marche active 30-45 min 1-2×/sem en jours OFF (allure dynamique, non comptée comme séance course) + renforcement bas du corps 2×/sem (excentrique mollets, gainage, fessiers, équilibre unipodal)
- Pas de sauts, pas de pliométrie, pas de descentes rapides dans le renforcement
- Durées courtes (20-25 min max au début), augmenter très progressivement (+5 min max/semaine)
- Surfaces souples UNIQUEMENT (herbe, terre, chemin) — jamais d'asphalte
- Volume max semaine 1 : 8-12 km (ou moins si débutant)
- Le warmup DOIT inclure 10 min de marche progressive
- Privilégier la RÉGULARITÉ à l'intensité : mieux vaut 3 séances douces que 2 intenses
- Chaussures avec amorti MAXIMAL obligatoire — le mentionner dans le welcomeMessage`);
    needsNoWeightMention = true;
    needsNoCrossTraining = true;
  } else if (imcTier >= 2) {
    parts.push(`⚠️ IMC 30-35 — PRÉCAUTIONS ARTICULAIRES RENFORCÉES :
- Priorité : séances à faible impact (marche rapide, marche/course alternée en début de plan)
- Pas de sauts, pas de pliométrie dans le renforcement
- Durées courtes (20-30 min max au début), augmenter très progressivement
- Surfaces souples (herbe, terre) plutôt qu'asphalte quand possible
- Volume max semaine 1 : 10-15 km (ou moins si débutant)
- Le warmup DOIT inclure 5-10 min de marche progressive
- Privilégier la RÉGULARITÉ à l'intensité : mieux vaut 3 séances douces que 2 intenses
- Renforcement bas du corps 1-2×/sem pour réduire l'impact articulaire
- Chaussures avec amorti renforcé — le mentionner dans le welcomeMessage`);
    needsNoWeightMention = true;
    needsNoCrossTraining = true;
  } else if (imcTier >= 1) {
    const isLongDistance = data.distance === 'Marathon' || data.distance === 'Semi-marathon' || (data.distance === 'Trail' && data.trailDistance && parseInt(data.trailDistance) >= 30);
    if (isLongDistance) {
      parts.push(`💡 IMC 25-30 + LONGUE DISTANCE — PRÉCAUTIONS ARTICULAIRES LÉGÈRES :
- Chaussures avec bon amorti recommandées — le mentionner dans le welcomeMessage
- Surfaces souples quand possible, surtout pour les sorties longues
- Bien s'hydrater pendant et après chaque séance
- Le warmup DOIT inclure 5 min de marche progressive avant les sorties longues`);
      needsNoWeightMention = true;
      needsNoCrossTraining = true;
    }
  }

  if (isSenior) {
    parts.push(`👤 COUREUR DE ${age} ANS — ADAPTATIONS OBLIGATOIRES :
- Échauffements LONGS obligatoires (10-15 min progressifs minimum)
- Récupération entre séances : minimum 48h, idéalement 72h pour les séances intenses
- Maximum 2 séances intenses par semaine (pas 2 jours consécutifs)
- Étirements et mobilité articulaire SYSTÉMATIQUES dans chaque cooldown
- Surveiller les articulations : genoux, chevilles, hanches — mentionner dans les advice
- Progression plus lente : max +8% volume/semaine (au lieu de 10-12%)`);
  }

  if (isRestart) {
    parts.push(`🔄 REPRISE APRÈS PAUSE — PROGRESSION LENTE :
- Les 2-3 premières semaines doivent être très douces
- Commencer à 50-60% de ce que le coureur faisait avant
- Augmenter le volume de maximum 10% par semaine
- Intégrer du marche/course même si le coureur est de niveau intermédiaire`);
  }

  // Forcer la diversité des types de séances (patch E v2 : exception Perte de Poids)
  const isPertePoids = /perte.*poids|weight.*loss/i.test(data.goal || '');
  parts.push(`🔴 DIVERSITÉ OBLIGATOIRE DES SÉANCES :
- ${isPertePoids
    ? 'MAXIMUM 2 séances de type "Sortie Longue" par semaine pour la perte de poids (1 principale dimanche + 1 molle en milieu de semaine — la durée prime sur l\'intensité pour oxydation lipidique).'
    : 'MAXIMUM 1 séance de type "Sortie Longue" par semaine. JAMAIS 2 Sortie Longue la même semaine.'}
- Si le plan a 3 séances/semaine : 1 Jogging/Footing/Marche-Course + 1 Sortie Longue + 1 Renforcement. En phase développement/spécifique : remplacer le Jogging par du Fractionné ou du Seuil.
- Si le plan a 4 séances/semaine : 2 Jogging/Footing + 1 Sortie Longue + 1 Renforcement. En phase développement : 1 Jogging + 1 Fractionné + 1 SL + 1 Renfo.
- Chaque séance de course doit avoir un type DIFFÉRENT (pas 2 "Jogging" identiques — varier : footing EF, footing vallonné, fartlek, progressif, etc.)`);

  if (isBeginnerLevel) {
    parts.push(`🛡️ PROTECTION DÉBUTANT :
- Jamais plus de 3 séances de COURSE par semaine (Jogging, Fractionné, SL, Récup, Marche/Course). La séance de Renforcement est EN PLUS et ne compte PAS dans ce total.
- Exemple : 3 séances running + 1 renfo = 4 séances/semaine au total, c'est OK
- Progression du volume : max +10% par semaine
- Aucune séance de course > 45 min les 4 premières semaines (sauf Marche/Course qui peut aller jusqu'à 50 min car elle inclut de la marche)
- Conseil systématique : hydratation, chaussures adaptées, ne pas forcer`);
  }

  // === Messages préventifs additionnels (sécurité utilisateur, pas blocage) ===
  // Plan long (>24 sem) : risque abandon
  const totalWeeks = data.durationWeeks || 0;
  if (totalWeeks > 24) {
    parts.push(`⚠️ PLAN LONG (${totalWeeks} sem) — MESSAGE D'ADHÉRENCE OBLIGATOIRE dans le welcomeMessage :
- Les plans > 24 semaines ont un taux d'abandon élevé chez les coureurs en construction
- Mentionner : importance de noter les séances, partenaire d'entraînement, reprise possible après pause sans tout recommencer
- À mi-parcours, suggérer d'évaluer la motivation et éventuellement basculer sur un objectif intermédiaire
- Cadrer : "70% des séances réalisées = bon résultat", la régularité prime sur la perfection`);
  }

  // Perte de poids — mention santé/reprise systématique
  // Les utilisateurs avec objectif "Perte de poids" sont souvent en reprise d'activité
  // après une période d'inactivité. La mention médicale générique ne suffit pas :
  // on ajoute une note dédiée reprise + signaux d'alerte, applicable à TOUS les
  // profils perte de poids (la branche RED-S BMI<20 ci-dessous reste en plus).
  const goalLow = (data.goal || '').toLowerCase();
  const isWeightLossGoal = goalLow.includes('perte') && goalLow.includes('poids');
  if (isWeightLossGoal) {
    parts.push(`🏃‍♀️ OBJECTIF PERTE DE POIDS — MENTION REPRISE/SANTÉ OBLIGATOIRE dans le welcomeMessage :
- En complément de la mention médicale générique, ajouter une note dédiée aux personnes qui REPRENNENT le sport après une période d'inactivité (très fréquent pour cet objectif) :
  "Si tu reprends après une longue pause sans activité régulière, un avis médical avec test d'effort est particulièrement recommandé (surtout si tu as des antécédents cardio, des facteurs de risque, ou plus de 35 ans). Écoute ton corps dès les premières séances : essoufflement anormal, douleur thoracique, vertiges → arrête immédiatement et consulte."
- Insister sur un démarrage TRÈS PROGRESSIF et la régularité : mieux vaut 3 séances faciles tenues que 4 ambitieuses abandonnées.
- Mentionner l'importance d'un échauffement long (10 min minimum) et de chaussures adaptées avec bon amorti — les articulations sont souvent peu sollicitées chez les sédentaires en reprise.
- Rappeler qu'une douleur articulaire persistante (genou, cheville, hanche) doit conduire à un avis kiné/médical avant de continuer.`);
    needsNoWeightMention = true;
  }

  // Prévention RED-S — Perte de poids avec profil léger (sans mentionner poids/IMC)
  if (isWeightLossGoal && bmi !== null && bmi < 20) {
    parts.push(`🩺 OBJECTIF PERTE DE POIDS — PRÉVENTION RED-S à inclure dans le welcomeMessage :
- Insister sur l'importance de **manger suffisamment** pour soutenir l'entraînement (pas de déficit calorique strict)
- Avertir du syndrome RED-S (Relative Energy Deficiency in Sport) : un déficit énergétique cause perte de masse maigre, fatigue chronique, troubles hormonaux, blessures
- Recommander : surveiller énergie/fatigue/sommeil/règles (si femme), consulter un nutritionniste sportif si besoin
- Suggérer une alternative : viser performance / endurance / plaisir plutôt qu'une fixation sur la perte de poids`);
    needsNoWeightMention = true;
  }

  // === A3 — Welcome cite PB si Finisher+PB ===
  // Cf. mémoires : feedback_finisher_plus_pb_allure (règle 2026-05-18, validation Coach FFA)
  // + feedback_securite_avant_conversion (transparence : on doit expliquer pourquoi l'allure
  // d'entraînement n'égale pas l'allure PB).
  // La logique TS (applyTargetTimeOverride L992) a déjà recalculé l'allure spé du subGoal
  // (allureSpecifique5k/10k/Semi/Marathon) en max(PB+5% cushion, VMA-based). Ici on instruit
  // Gemini à expliciter cette transparence dans le welcomeMessage.
  const subGoalToPbField: Record<string, string> = {
    '5 km': 'distance5km',
    '10 km': 'distance10km',
    'Semi-marathon': 'distanceHalfMarathon',
    'Marathon': 'distanceMarathon',
  };
  const pbField = data.subGoal ? subGoalToPbField[data.subGoal] : undefined;
  const pbValue = pbField && data.recentRaceTimes ? (data.recentRaceTimes as any)[pbField] : undefined;
  if (data.targetTime === 'Finisher' && pbValue && data.subGoal) {
    // Wording finalisé après validation PM senior + Coach FFA 25 ans (2026-05-18) :
    // - "Sur ton dernier" → "Ton meilleur temps connu sur" (universel, non-stigmatisant régression)
    // - "pour t'entraîner sans risque" → "pour te laisser de la marge et progresser durablement"
    //   (positif, pédagogique, évite engagement marketing implicite incompatible décharge produit)
    // - Ajout variante "PB plus rapide que cible" = palier de reprise (cas régression sensible)
    // - Ajout garde-fou "JAMAIS écrire allure sans risque/sans danger" (verrouille Flash)
    // - Ajout fallback si allure non calculée (protection contre hallucination Gemini)
    parts.push(`🎯 RÈGLE PB EXPLICITE — Finisher + PB déclaré (${data.subGoal} en ${pbValue})
Le welcomeMessage DOIT contenir une phrase qui cite explicitement le PB du coureur ET l'allure d'entraînement calculée sur ce subGoal (voir "ALLURES OBLIGATOIRES" plus haut dans ce prompt, champ "Allure spé ${data.subGoal}").
Si l'allure n'a pas été calculée dans cette section, mentionner uniquement le PB — ne JAMAIS inventer une allure.

Format suggéré (à adapter, ne pas copier littéralement) :
"Ton meilleur temps connu sur ${data.subGoal} est ${pbValue} — ton plan vise une allure d'entraînement à {allure spé calculée}/km pour te laisser de la marge et progresser durablement."

Variantes selon contexte :
- PB récent (< 12 mois) : ton normal "ton dernier" / "ta meilleure performance"
- PB ancien (> 12 mois) ou non précisé : ton encourageant "ton meilleur temps connu"
- PB plus rapide que l'allure cible calculée (potentielle régression) : présenter l'allure comme un palier de reprise ("on repart sur une base saine pour reconstruire", "allure de relance, sans pression sur ton ancien chrono")
- Ne JAMAIS culpabiliser le user qui aurait régressé. Toujours présenter l'allure d'entraînement comme une marge ("plus douce pour garder une réserve"), pas comme une révision à la baisse.
- Ne JAMAIS écrire "allure sans risque" ou "sans danger" — utiliser "allure de travail", "allure d'entraînement", "marge de progression".`);
  }

  // === A4 — Welcome cite blessure significative ===
  // Cf. mémoires : feedback_securite_avant_conversion (transparence + sécurité avant tout)
  // + feedback_compromis_messages_preventifs (proportionnalité reco médicale)
  // + feedback_mode_marche_course_scope (marche-course = débutants only).
  // Wording finalisé après validation PM senior + Coach FFA 25 ans (2026-05-18) :
  // - 3 piliers = checklist contenu (pas format imposé en liste numérotée)
  // - RECOMMANDER conditionné à la sévérité (FORTE si active/significative, soft si ancienne)
  // - Retrait "marche autorisée" des exemples (conflit feedback_mode_marche_course_scope)
  // - Retrait "intensité progressive" (banal, tout plan est progressif) → exemples discriminants
  // - Ajout syndrome rotulien (#1 blessure du coureur loisir), périostite, lombalgie
  // - Reformulation garde-fou : limitante centrée user (KO) vs factuelle centrée plan (OK)
  if (data.injuries?.hasInjury && data.injuries.description && data.injuries.description.trim()) {
    parts.push(`🩹 RÈGLE BLESSURE EXPLICITE — blessure déclarée : "${data.injuries.description.trim()}"
Le welcomeMessage DOIT contenir une mention structurée autour de 3 piliers (checklist de contenu, PAS format imposé — intégrer naturellement en 2-3 phrases fluides, jamais en liste numérotée visible) :

1. RECONNAÎTRE : citer la blessure avec les mots du user (ex : "Compte tenu de ton ${data.injuries.description.trim()}...")
2. ADAPTER : expliquer brièvement comment le plan en tient compte. Exemples discriminants à adapter selon la blessure : progression douce du volume, renfo ciblé selon la zone, surface souple privilégiée, pas de descente technique, pas de côtes explosives sur tendinopathie. NE PAS promettre "marche autorisée" (réservé aux profils débutants où la logique plan le déclenche déjà automatiquement).
3. RECOMMANDER (selon sévérité) :
   - Blessure ACTIVE / RÉCENTE / SIGNIFICATIVE (tendinite en cours, fasciite, ITBS, fracture stress, post-op, syndrome rotulien actif, douleur actuelle, ou termes "en cours" / "actuellement") → recommandation médicale FORTE et explicite avant reprise ("Avant de te lancer, valide avec ton kiné/médecin que tu peux reprendre une activité de course progressive.")
   - Blessure ANCIENNE / SOIGNÉE / MINEURE (mention type "léger" / "ancien" / "j'ai eu" / "résolu") → suggestion souple ("Écoute ton corps : si la gêne revient, lève le pied et consulte.") — PAS de validation kiné systématique qui dramatise.

Liste blessures significatives fréquentes (par fréquence stat coureur loisir) : syndrome rotulien (genou coureur), tendinite, périostite, fasciite plantaire, ITBS, lombalgie, fracture de fatigue.

JAMAIS de formulation limitante centrée sur le user : "ta blessure t'empêche de...", "tu ne devrais pas...", "à cause de ta blessure tu ne peux plus...".
TOUJOURS formulation factuelle centrée sur le plan : "le plan tient compte de...", "on adapte la progression pour...", "on protège ce point en...".`);
  }

  // Cible irréaliste — préventif sur faisabilité haute
  // (Note : le blocage IRRÉALISTE est géré ailleurs avec décharge explicite)

  // === P0c (2026-05-20, validation Coach 20 ans Pfitzinger Lab) ===
  // Warning Marathon freq ≤ 3 + currentWeeklyVolume < 25 km/sem :
  // Configuration tendue (ratio Gabbett pic/cv > 1.5, seuil documenté de risque
  // blessure dans la littérature ACWR — overuse, tendinopathies, stress fracture).
  // Le plan est livré (objectif finisher prioritaire, hard floor distance préservé),
  // MAIS le welcomeMessage doit prévenir explicitement : préparation a minima,
  // vigilance mur 30e km, rampe progression ≤ 10%/sem.
  // Reste sécurité-bienveillant (doctrine feedback_securite_avant_conversion +
  // feedback_jamais_baisser_allure_cible : on ne dégrade pas l'objectif user).
  const cv = data.currentWeeklyVolume;
  const isMarathonSubGoal = (data.subGoal || '').toLowerCase() === 'marathon';
  if (
    isMarathonSubGoal &&
    (data.frequency ?? 0) <= 3 &&
    typeof cv === 'number' &&
    cv > 0 &&
    cv < 25
  ) {
    parts.push(`⚠️ MARATHON CONFIGURATION TENDUE (freq=${data.frequency}, volume actuel ${cv} km/sem) — MENTION OBLIGATOIRE dans le welcomeMessage :
- Préciser : "Tu te prépares pour un Marathon avec ${data.frequency} séances/semaine et un volume actuel sous 25 km/sem. Le plan est calibré en mode 'préparation a minima' — objectif finisher prioritaire."
- Vigilance accrue sur le risque du mur au kilomètre 30 (déplétion glycogène accentuée chez les volumes hebdo bas).
- Insister sur le respect strict de la rampe de progression hebdomadaire (pas plus de +10%/sem) — éviter à tout prix les sauts de volume.
- Tonalité : bienveillante, transparente, jamais culpabilisante. On ne dégrade PAS l'objectif marathon de l'utilisateur, on l'informe du contexte.
- NE PAS recommander de cross-training (vélo/natation) en substitution — doctrine plan course UNIQUEMENT.`);
  }

  // === Sprint 5 — règles globales consolidées (injectées 1× max, doctrine inchangée) ===
  // Avant Sprint 5 : ces 2 règles étaient répétées 3-4× au sein des blocs IMC/Perte/RED-S.
  // Après Sprint 5 : on les flag puis on les injecte 1× en fin → gain ~250 tokens cumulés
  // sur profils multi-flags (ex: Perte + IMC 32).
  if (needsNoWeightMention) {
    parts.push(NO_WEIGHT_MENTION_RULE);
  }
  if (needsNoCrossTraining) {
    parts.push(NO_CROSS_TRAINING_RULE);
  }

  return parts.join('\n\n');
};

// ═══════════════════════════════════════════════════════════════════════════
// R3 — Injection cible D+ par séance dans prompt Gemini (plans Trail)
// ═══════════════════════════════════════════════════════════════════════════
// Validé par PM + dev senior + coach UTMB Academy avec ajustements bloquants.
// Gated isTrailFamily, feature flag VITE_R3_PROMPT_DPLUS_ENABLED.
// Assouplissement trail très plat (<300m/sem → Gemini libre).
// Bloc ultra enrichi (back-to-back + marche montée + descente technique).
// Champ JSON `elevationGain` rappelé explicitement (Flash met sinon en texte
// libre dans mainSet sans remplir le champ structuré).
// Pas de mention "tolérance ±X%" dans le prompt (Flash interpréterait comme
// permission de dériver — clamp côté validateur post-génération si besoin).

const R3_PROMPT_DPLUS_ENABLED = import.meta.env.VITE_R3_PROMPT_DPLUS_ENABLED !== 'false';

// R-F cleanup : constante extraite (dupliquée 4× à l'identique dans le prompt
// ultra100 + ultra70 × preview + remaining). Mention coach courte = OK
// doctrine "petits conseils nutrition courts dans SL/welcome OK, pas +".
// R-F cleanup : constante extraite (4× dupliquée ultra100+70 preview+remaining).
const NUTRITION_SL_BLOCK = `- NUTRITION SUR SL LONGUES (≥2h) : DOIT inclure une mention coach dans la description, SANS chiffres ni timing précis. Formats à explorer : gel, pâte de fruit, banane, boisson glucidique. Hydratation régulière sans attendre la soif. Pour course cible ≥40km : ajouter "consulter un diététicien-sportif est fortement recommandé pour ta stratégie nutrition".`;

// R-G cleanup : 6 bullets back-to-back ultra70, quasi-identiques preview/remaining.
const ULTRA70_BACK_TO_BACK_BULLETS = `- BACK-TO-BACK OBLIGATOIRE en phase spécifique et développement :
  • Samedi = Sortie Longue principale (la plus longue de la semaine, avec D+ important)
  • Dimanche = 2e Sortie Longue sur jambes fatiguées (50-60% de la durée du samedi, en EF strict, avec D+ modéré)
  • Simuler la fatigue cumulée de l'ultra, apprendre à courir/marcher fatigué, travailler l'alimentation en effort
  • Placer 2 à 3 week-ends back-to-back en phase spécifique (PAS en semaine de récupération)
  • Après chaque back-to-back : lundi repos ou récupération très légère`;

// Fix #4b (2026-05-19) — Sortie nuit pour ultras dont la course passe la nuit (≥ 80 km typique).
// Sources : UTMB Academy 2024 (préparation nuit obligatoire pour ultras nocturnes),
// Hammond 2018 "lifelong endurance Masters" (adaptation cognitive à l'effort de nuit).
// Validé par Coach FFA + Expert Trail. Activation : trailDetails.distance >= 80.
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT obligatoire en phase développement/spécifique :
  • Placer 1 à 2 sorties nuit (départ 22h-23h, durée 1h30-2h30) sur la phase préparatoire
  • Lampe frontale obligatoire (matériel imposé en course)
  • Préférer terrain connu pour la 1ère sortie nuit (sécurité)
  • Objectif : habituer le cerveau à l'effort de nuit (perception altérée, fatigue ressentie x1.5)
  • Idéalement intégrer 1 sortie nuit dans un week-end back-to-back (Sam jour + Sam nuit = simulation cumul fatigue)`;

// Sprint Marathon 2026-05-20 — règles anti-hallucination mainSet.
// Bug audit Thomas S13 + audit batch 30 plans : LLM écrit
//   "2 blocs de 35 km à allure marathon"
// alors que session.distance = 30 km. Et il invente parfois des allures
// (5:30/km) qui ne correspondent à aucune entrée paces.
const MAINSET_COHERENCE_RULES = `⚠️ RÈGLE CRITIQUE MAINSET — Cohérence distance :
Ne JAMAIS écrire "N blocs de X km" ni "Y répétitions de X km" si N × X dépasse
la distance affichée de la séance. Ne JAMAIS écrire "tu vas faire Z km" différent
de la distance de la séance. Exemple OK : séance 30 km avec 2 blocs spé →
"30 km total avec 2 × 6 km à AS Marathon, encadrés par 9 km EF échauffement
+ 9 km EF retour". Exemple INTERDIT : séance 30 km → "2 blocs de 35 km".

⚠️ RÈGLE ALLURES MAINSET — Cohérence paces :
Toute allure mentionnée dans mainSet (ex : "à 5:30 min/km") DOIT correspondre
EXACTEMENT à une entrée des allures listées plus haut dans ce prompt (efPace,
seuilPace, vmaPace, allureSpecifiqueXXX, recoveryPace). Ne JAMAIS inventer une
allure qui ne figure pas dans cette liste. Si tu n'es pas sûr, utilise les
LABELS (EF, Seuil, VMA, AS Marathon, AS Semi, AS 10K, AS 5K, Récup) plutôt
qu'une valeur numérique.`;

// Sprint Marathon 2026-05-19 — race-day injection.
// Constante factorisée injectée dans previewPrompt + batchPrompt pour que le LLM
// SACHE que la dernière séance du raceDate sera REMPLACÉE par la course officielle
// post-génération. Évite ainsi qu'il "consomme" cette case avec une SL EF redondante
// (bug Thomas Weill : LLM mettait SL EF 20 km le jour de la course Marathon).
const RACE_DAY_INSTRUCTION = `🏁 JOUR DE COURSE — règle déterministe post-génération :
La dernière séance positionnée sur la DATE de COURSE (raceDate) sera REMPLACÉE automatiquement
par la séance "Course officielle" générée par le code (distance officielle, allure cible,
mainSet sécurité pacing/ravitos). Tu n'as PAS à inventer cette séance toi-même : laisse une
SL d'affûtage courte ou un footing léger ce jour-là — le système écrasera ce slot. NE PAS
forcer une SL longue ni un fractionné le jour de la course (la course EST la séance).`;

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 5 — responseSchema natif Gemini (remplace le bloc FORMAT JSON texte)
// ═══════════════════════════════════════════════════════════════════════════
// Avant Sprint 5 : le previewPrompt incluait un bloc FORMAT JSON texte de ~43 lignes
// (~600 tokens) duplicant manuellement la structure JSON attendue.
// Après Sprint 5 : on passe le schéma directement via generationConfig.responseSchema —
// Gemini garantit le format au niveau API, on supprime le bloc texte du prompt.
// SDK : @google/generative-ai 0.24.1 supporte responseSchema avec SchemaType (vérifié
// dans dist/generative-ai.d.ts L697 + L1252).
// PLAN B si rejet : retomber sur responseMimeType seul (déjà en place avant Sprint 5).
const PREVIEW_RESPONSE_SCHEMA: any = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    goal: { type: SchemaType.STRING },
    startDate: { type: SchemaType.STRING },
    durationWeeks: { type: SchemaType.INTEGER },
    sessionsPerWeek: { type: SchemaType.INTEGER },
    targetTime: { type: SchemaType.STRING },
    distance: { type: SchemaType.STRING },
    location: { type: SchemaType.STRING },
    suggestedLocations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ['name', 'type', 'description'],
      },
    },
    welcomeMessage: { type: SchemaType.STRING },
    confidenceScore: { type: SchemaType.NUMBER },
    feasibility: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING },
        message: { type: SchemaType.STRING },
        safetyWarning: { type: SchemaType.STRING },
      },
      required: ['status', 'message'],
    },
    weeks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          weekNumber: { type: SchemaType.INTEGER },
          theme: { type: SchemaType.STRING },
          phase: { type: SchemaType.STRING },
          sessions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                duration: { type: SchemaType.STRING },
                distance: { type: SchemaType.STRING },
                intensity: { type: SchemaType.STRING },
                targetPace: { type: SchemaType.STRING },
                elevationGain: { type: SchemaType.NUMBER },
                locationSuggestion: { type: SchemaType.STRING },
                warmup: { type: SchemaType.STRING },
                mainSet: { type: SchemaType.STRING },
                cooldown: { type: SchemaType.STRING },
                advice: { type: SchemaType.STRING },
              },
              required: ['day', 'type', 'title', 'duration', 'intensity', 'mainSet'],
            },
          },
        },
        required: ['weekNumber', 'phase', 'sessions'],
      },
    },
  },
  required: ['name', 'goal', 'durationWeeks', 'sessionsPerWeek', 'welcomeMessage', 'weeks'],
};

interface DplusBlockOpts {
  weekIdx: number;                          // 0-indexed (S1=0)
  weeklyElevationTarget?: number[];
  recoveryWeeks: number[];
  totalWeeks: number;
  raceDplus: number;
  raceDistanceKm: number;
  context: 'preview' | 'remaining';
}

function buildDplusPromptBlock(opts: DplusBlockOpts): string {
  if (!R3_PROMPT_DPLUS_ENABLED) return '';
  if (!opts.weeklyElevationTarget || opts.weeklyElevationTarget.length === 0) return '';

  const dplusPerKm = opts.raceDistanceKm > 0 ? Math.round(opts.raceDplus / opts.raceDistanceKm) : 0;

  // Assouplissement coach : trail PLAT (race D+ < 500m) → laisser Gemini libre.
  // Avant : skip basé sur S1 calculée → faux positif pour trails D+ progressifs
  // (ex: 30/1500 Inter vol 200 → S1=225m skipped à tort, alors que la cible
  // monte à 1500m). Maintenant : skip basé sur D+ course (vraie nature plat
  // ou vallonné). Si race D+ ≥ 500m, R3 actif quel que soit S1.
  if (opts.raceDplus < 500) return '';

  let block = '';

  if (opts.context === 'preview') {
    const t = opts.weeklyElevationTarget[opts.weekIdx];
    const slDplus = Math.round(t * 0.58);
    const vallOrCotesDplus = Math.round(t * 0.37);  // fusion vallonnée + fractionné côte (déjà mentionné dans prompt existant)
    const footingsDplus = t - slDplus - vallOrCotesDplus;
    block += `\n🏔️ D+ CIBLE SEMAINE 1 : ${t}m (course = ${dplusPerKm} m/km)\n`;
    block += `Répartition (renseigner \`elevationGain\` chiffré par séance) :\n`;
    block += `- Sortie Longue : ${slDplus}m\n`;
    block += `- Séance vallonnée ou fractionné en côte : ${vallOrCotesDplus}m\n`;
    block += `- Footings : ${footingsDplus}m\n`;
    block += `- Piste / seuil / VMA : 0m (séances plates)\n`;
  } else {
    block += `\n🏔️ D+ CIBLE PAR SEMAINE (renseigner \`elevationGain\` chiffré par séance) :\n`;
    const labels = opts.weeklyElevationTarget.map((d, i) => {
      const isRecov = opts.recoveryWeeks.includes(i + 1);
      const isAffut = i >= opts.totalWeeks - 2;
      const label = isRecov ? ' (récup)' : isAffut ? ' (affût)' : '';
      return `S${i + 1}:${d}m${label}`;
    });
    block += labels.join(' | ') + '\n';
    block += `Répartition par semaine : SL ~58% | vallonnée/côte ~37% | footings ~5% | piste/seuil/VMA 0m.\n`;
    // R-A cleanup : réinjection de l'instruction `elevationGain` (anciennement
    // au bloc legacy L4377-4385 supprimé car contradiction avec R3).
    block += `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).\n`;
  }

  // Note : back-to-back / marche montée / descente technique sont déjà dans
  // le prompt trail existant (lignes 3258, 4254+). Ne pas dupliquer ici.

  return block;
}

// Log post-génération : compare D+ réel des séances vs cible.
// Aide à monitorer la fidélité de Gemini aux instructions R3.
function logDplusActualVsTarget(plan: any, weeklyElevationTarget?: number[]) {
  if (!weeklyElevationTarget || !plan?.weeks) return;
  const lines: string[] = [];
  for (let i = 0; i < plan.weeks.length; i++) {
    const target = weeklyElevationTarget[i] ?? 0;
    if (target === 0) continue;
    const actual = (plan.weeks[i].sessions || []).reduce((s: number, x: any) => s + (x.elevationGain || 0), 0);
    const ecart = target > 0 ? Math.round(((actual - target) / target) * 100) : 0;
    lines.push(`S${i+1}: cible ${target}m, réel ${actual}m (${ecart>=0?'+':''}${ecart}%)`);
  }
  if (lines.length) console.debug(`[R3 D+ Actual vs Target] ${lines.join(' | ')}`);
}

// ============================================
// GÉNÉRATION PREVIEW (SEMAINE 1 UNIQUEMENT)
// ============================================

/**
 * Génère uniquement la SEMAINE 1 du plan (+ métadonnées complètes).
 * BEAUCOUP plus rapide que le plan complet.
 * Le contexte de génération est stocké pour générer la suite avec cohérence totale.
 */
export const generatePreviewPlan = async (data: QuestionnaireData): Promise<TrainingPlan> => {
  console.log('[Gemini Preview] Début génération semaine 1 uniquement');
  const startTime = Date.now();

  try {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const MODEL_ID = "gemini-3-flash-preview";
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    console.log(`[Gemini Preview] model=${MODEL_ID}`);

    // === CALCUL DES ALLURES (IDENTIQUE au plan complet) ===
    let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
    let paces: TrainingPaces;
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

    // Correction VMA pour Remise en forme / Maintien : -15% car le coureur reprend après une pause
    const goalForVma = (data.goal || '').toLowerCase();
    if (goalForVma.includes('maintien') || goalForVma.includes('remise')) {
      const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
      console.log(`[VMA] Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} → ${reducedVma.toFixed(1)} (-15%)`);
      vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajustée -15% remise en forme)` };
      paces = calculateAllPaces(reducedVma);
      vmaSource = vmaEstimate.source;
    }

    // Cross-check VMA vs targetTime : si l'allure EF est plus rapide que l'allure course visée, recalculer
    // UNIQUEMENT si la VMA est estimée (pas de chrono réel). Si le coureur a des chronos,
    // la VMA des chronos est fiable — un objectif plus lent = objectif conservateur, pas une erreur.
    const hasRealChrono = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    if (data.targetTime && data.subGoal && vmaEstimate && !hasRealChrono) {
      const raceDistances: Record<string, number> = { '5 km': 5, '10 km': 10, 'Semi-Marathon': 21.1, 'Marathon': 42.195 };
      const raceDist = raceDistances[data.subGoal];
      if (raceDist) {
        const targetSeconds = timeToSeconds(data.targetTime, raceDist);
        if (targetSeconds > 0) {
          const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
          // Si la VMA estimée est > 15% au-dessus de ce que le targetTime implique, c'est incohérent
          if (vmaEstimate.vma > targetVma * 1.15) {
            console.warn(`[VMA] VMA estimée (${vmaEstimate.vma.toFixed(1)}) incohérente avec targetTime ${data.targetTime} pour ${data.subGoal} (VMA implicite: ${targetVma.toFixed(1)}). Recalcul.`);
            const correctedVma = targetVma * 1.05; // légèrement au-dessus pour laisser de la marge
            paces = calculateAllPaces(correctedVma);
            vmaSource = `Recalculée depuis objectif ${data.subGoal} en ${data.targetTime}`;
            vmaEstimate = { vma: correctedVma, source: vmaSource };
          }
        }
      }
    }

    // Allure spé alignée sur cible chrono (doctrine produit, voir applyTargetTimeOverride)
    applyTargetTimeOverride(paces, data, vmaEstimate.vma);

    // ══════════════════════════════════════════════════════════════
    // GARDE-FOU FRÉQUENCE MINIMUM (indépendant du UI)
    // Semi, Marathon, Trail nécessitent au minimum 3 séances
    // (2 running + 1 renfo). Avec 2 séances = 1 running + 1 renfo,
    // impossible de distribuer le volume correctement.
    // ══════════════════════════════════════════════════════════════
    // Fréquence minimale absolue : jamais < 2 (sinon 0 séance running)
    if (data.frequency < 2) {
      console.warn(`[Fréquence] ${data.frequency} séance(s) → forcé à 2 minimum`);
      data.frequency = 2;
    }
    // Semi, Marathon, Trail nécessitent au minimum 3 séances (2 running + 1 renfo)
    const goal = data.goal || '';
    const isAmbitiousGoal = goal.includes('Trail') ||
      data.subGoal === 'Semi-Marathon' || data.subGoal === 'Semi-marathon' ||
      data.subGoal === 'Marathon';
    if (isAmbitiousGoal && data.frequency < 3) {
      console.warn(`[Fréquence] ${data.subGoal || goal} avec ${data.frequency} séances → forcé à 3 minimum`);
      data.frequency = 3;
    }

    // Calcul durée du plan — délégué à computePlanDurationWeeks (testable).
    const durationResult = computePlanDurationWeeks({
      subGoal: data.subGoal,
      raceDate: data.raceDate,
      startDate: data.startDate,
    });
    let planDurationWeeks = durationResult.planDurationWeeks;
    if (durationResult.adjustedStartDate) {
      data.startDate = durationResult.adjustedStartDate;
      console.log(`[Plan Duration] Course dans ${durationResult.diffWeeks} sem > cap ${durationResult.cap} (objectif ${data.subGoal || 'défaut'}) → startDate décalé au ${data.startDate}`);
    }

    // === Injecter la VMA calculée dans data pour que detectLevelFromData puisse override ===
    (data as any).vma = vmaEstimate.vma;

    // === CRÉER LE CONTEXTE DE GÉNÉRATION (FIGÉ) ===
    const generationContext = createGenerationContext(
      data, paces, vmaEstimate.vma, vmaSource, planDurationWeeks
    );

    // Section des allures
    // Sprint 5 — fix bug latent : buildSafetyInstructions (L3074 règle PB Finisher)
    // demande à Gemini de citer "Allure spé ${data.subGoal}" mais avant Sprint 5 le
    // pacesSection ne fournissait que EF/Seuil/VMA/Récup, jamais les allures spécifiques
    // 5k/10k/Semi/Marathon → risque hallucination welcomeMessage. On injecte l'allure spé
    // correspondant au subGoal pour fermer ce trou (les paces sont déjà recalculées avec
    // override Finisher+PB par applyTargetTimeOverride L992).
    const subGoalKey = (data.subGoal || '').toLowerCase();
    const subGoalToPace: Record<string, { label: string; value: string }> = {
      '5 km': { label: '5 km', value: paces.allureSpecifique5k },
      '10 km': { label: '10 km', value: paces.allureSpecifique10k },
      'semi-marathon': { label: 'Semi-marathon', value: paces.allureSpecifiqueSemi },
      'marathon': { label: 'Marathon', value: paces.allureSpecifiqueMarathon },
    };
    const specificPace = subGoalToPace[subGoalKey];
    const specificPaceLine = specificPace
      ? `- Allure spé ${specificPace.label} : ${specificPace.value} min/km\n`
      : '';
    const pacesSection = `
VMA : ${paces.vmaKmh} km/h (${vmaSource})
- EF (Endurance) : ${paces.efPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récupération : ${paces.recoveryPace} min/km
${specificPaceLine}`;

    // Instruction pour les jours préférés
    const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
      ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
      : 'Répartition équilibrée (ex: Mardi, Jeudi, Dimanche)';

    // Instruction jour sortie longue
    const longRunDay = data.preferredLongRunDay || 'Dimanche';
    // S6: longRunDayInstruction const supprimée (utilisation directe ${longRunDay} L3416, règle complète portée par RÈGLES ABSOLUES L3462)

    // Instruction blessures (S4: queue "Adapter les séances !" retirée — instruction triviale pour LLM, sécurité portée par buildSafetyInstructions)
    let injuryInstruction = '';
    if (data.injuries?.hasInjury && data.injuries.description) {
      injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description}`;
    }

    // Instruction commentaires libres du coureur (S4: meta-instruction "Prends en compte..." retirée — déjà listé en contexte)
    const commentsInstruction = data.comments?.trim()
      ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}"`
      : '';

    // Section marche/course pour les débutants ou VMA très faible (perte de poids/maintien)
    const isBeginnerLevel = labelToLevelKey(data.level) === 'deb';
    const isPertePoidsPrev = goal.includes('Perte');
    const isMaintienPrev = goal.includes('Maintien') || goal.includes('Remise');
    const needsMarcheCourse = isBeginnerLevel || (vmaEstimate.vma < 10.5 && (isPertePoidsPrev || isMaintienPrev));
    const beginnerInstructionPreview = needsMarcheCourse ? `

🚶 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :
- Type de séance : "Marche/Course" (OBLIGATOIRE pour au moins 2 séances sur ${data.frequency})
- Format semaine 1 : 8-10 x (1 min course légère + 2 min marche active)
- Pas de VMA, pas de fractionné intense
` : '';

    // === SECTION TRAIL DYNAMIQUE (Preview) ===
    const previewObjective = detectObjectiveFromData(data);
    const isVKPreview = previewObjective === 'VK';
    const isTrailSteepPreview = previewObjective === 'TrailSteep';

    const trailSectionPreview = data.goal === 'Trail' && data.trailDetails ? (isVKPreview ? `
🏔️ VK / COURSE DE CÔTE : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m (${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m D+/km)
⚠️ FORMAT VK — PAS un trail classique. Plan spécifique :
- Volume hebdomadaire TRÈS RÉDUIT (max 20-45km selon niveau). Ce n'est PAS une course longue distance.
- Priorité ABSOLUE : puissance en côte (VMA côte, fractionné en montée, escaliers, côtes courtes 30-60")
- Sortie longue orientée DÉNIVELÉ (pas distance) — ex: 1h-1h30 avec D+ max, allure secondaire
- Renforcement SPÉCIFIQUE : gainage, squats, mollets, fentes, proprioception — 2 séances si possible
- Séances courtes et intenses > séances longues. Pas de footing > 10km.
- Le fractionné en côte peut commencer dès la phase fondamentale (c'est le geste spécifique)

` : isTrailSteepPreview ? `
🏔️ TRAIL RAIDE : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m (${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m D+/km)
⚠️ FORMAT TRAIL RAIDE — Ratio D+/km élevé. Plan spécifique :
- Volume hebdomadaire RÉDUIT par rapport à un trail classique (max 25-55km selon niveau)
- Priorité : travail en côte (côtes longues 2-5min, VMA en côte, power hiking)
- Sortie longue avec D+ progressif important — le D+ prime sur la distance
- Renforcement : quadriceps (excentrique), mollets, proprioception
- Le fractionné en côte peut commencer dès la phase fondamentale

` : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. Elle doit progresser vers 50-65km ou 6-8h au pic d'entraînement.
${ULTRA70_BACK_TO_BACK_BULLETS}
${ULTRA_NIGHT_RUN_BULLETS}
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL. Sur un ultra, on marche 30-50% du temps.
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec le sac, les bâtons, le matériel obligatoire dès la phase développement.
- GESTION D'ALLURE : l'allure ultra est PLUS LENTE que l'EF. Prévoir des sections à 7:00-8:00 min/km.
${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: 'preview' })}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
` : data.trailDetails.distance >= 70 ? `
🏔️ ULTRA-TRAIL 70km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA — Règles spécifiques :
${ULTRA70_BACK_TO_BACK_BULLETS}
${data.trailDetails.distance >= 80 ? ULTRA_NIGHT_RUN_BULLETS + '\n' : ''}- SL pic doit atteindre 4h30-6h au pic d'entraînement
- MARCHE EN CÔTE (power hiking) : sections de marche rapide en montée dans les SL ≥ 2h30
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec sac et bâtons dès la phase développement

${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: 'preview' })}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
` : `
🏔️ TRAIL : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
- Sortie longue avec D+ progressif, fractionné en côte

${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: generationContext.periodizationPlan.weeklyElevationTarget, recoveryWeeks: generationContext.periodizationPlan.recoveryWeeks, totalWeeks: generationContext.periodizationPlan.totalWeeks, raceDplus: data.trailDetails.elevation, raceDistanceKm: data.trailDetails.distance, context: 'preview' })}
`) : '';

    // === CALCUL DE FAISABILITÉ (Preview) ===
    const hasChronoPreview = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    const feasibilityResultPreview = calculateFeasibility({
      vma: vmaEstimate.vma,
      targetTime: data.targetTime,
      distance: (data.goal === 'Trail' && data.trailDetails?.distance) ? `${data.trailDetails.distance} km` : (data.subGoal || data.distance || ''),
      goal: data.goal || '',
      level: getEffectiveLevel(data),
      planWeeks: planDurationWeeks,
      currentVolume: data.currentWeeklyVolume,
      currentWeeklyElevation: data.currentWeeklyElevation,
      trailElevation: data.goal === 'Trail' ? data.trailDetails?.elevation : undefined,
      trailDistance: data.goal === 'Trail' ? data.trailDetails?.distance : undefined,
      hasInjury: !!(data.injuries?.hasInjury),
      injuryDescription: data.injuries?.description,
      hasChrono: hasChronoPreview,
      vmaFromTarget: vmaSource.includes('Recalculée depuis objectif'),
      age: data.age,
      weight: data.weight,
      height: data.height,
      frequency: data.frequency,
      // Sprint 3 — cross-check VMA vs PB déclarés (path Finisher steph-fanny)
      recentRaceTimes: data.recentRaceTimes,
      // P0c — garde-fou rampe pic/cv > 2.0 (Coach 20 ans 2026-05-20)
      peakVolume: Math.max(...generationContext.periodizationPlan.weeklyVolumes),
    });
    const feasibilityTextPreview = `Score : ${feasibilityResultPreview.score}/100 | Statut : ${feasibilityResultPreview.status}
${feasibilityResultPreview.message}
${feasibilityResultPreview.alternativeTarget ? `Objectif alternatif : ${feasibilityResultPreview.alternativeTarget}` : ''}`;

    // === CALCUL MIN SL DURATION POUR INSTRUCTION PROMPT ===
    const objectiveForSL = detectObjectiveFromData(data);
    const levelForSL = detectLevelFromData(data);
    const minSlDurForPrompt = (MIN_SL_DURATION_MIN[objectiveForSL] || {})[levelForSL] || 45;

    // === PROMPT OPTIMISÉ POUR SEMAINE 1 UNIQUEMENT ===
    const previewPrompt = `
Tu es un Coach Running Expert. Génère UNIQUEMENT la SEMAINE 1 d'un plan d'entraînement.

═══════════════════════════════════════════════════════════════
                    PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════
- Niveau : ${getEffectiveLevel(data)}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Date de course : ${data.raceDate || 'Non définie'}
- Jours : ${preferredDaysInstruction}
- Localisation : ${data.city || 'Non renseignée'}
${injuryInstruction}
${commentsInstruction}
${beginnerInstructionPreview}
${data.city ? `
📍 LIEUX D'ENTRAÎNEMENT (suggestedLocations) :
Tu DOIS proposer 2-3 lieux RÉELS à ${data.city} ou dans ses environs proches :
- Recherche des parcs, pistes d'athlétisme, forêts ou sentiers CONNUS de cette ville
- Exemples pour Paris : Bois de Vincennes, Parc Montsouris, Jardin du Luxembourg
- Exemples pour Lyon : Parc de la Tête d'Or, Berges du Rhône
- Pour chaque lieu, indique le type (PARK, TRACK, NATURE, HILL) et pour quel type de séance il convient

📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Chaque séance DOIT avoir un "locationSuggestion" avec un lieu RÉEL de ${data.city} adapté aux EXIGENCES de la séance :
- Fractionné VMA/vitesse → PISTE D'ATHLÉTISME (surface plane, distances balisées)
- Fractionné seuil/tempo → chemin plat, berges, voie verte
- Séance avec D+ (elevationGain > 0) → colline, forêt pentue, parc vallonné (lieu avec VRAI dénivelé !)
- Sortie Longue route → grand parc, boucle longue, berges
- Sortie Longue Trail → forêt/montagne avec sentiers
- Footing/Récup → parc agréable, sol souple, berges calmes
- Renforcement → "À la maison" ou "Salle de sport"
` : ''}

═══════════════════════════════════════════════════════════════
              ALLURES CALCULÉES (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════
${pacesSection}


═══════════════════════════════════════════════════════════════
              PLAN DE PÉRIODISATION PRÉ-CALCULÉ
═══════════════════════════════════════════════════════════════
Durée totale : ${planDurationWeeks} semaines
Semaine 1 : Phase "${generationContext.periodizationPlan.weeklyPhases[0]}"
Volume actuel déclaré par l'utilisateur : ${data.currentWeeklyVolume !== undefined && data.currentWeeklyVolume !== null && data.currentWeeklyVolume > 0 ? `${data.currentWeeklyVolume} km/semaine` : 'non précisé'}
Volume semaine 1 calibré : ${generationContext.periodizationPlan.weeklyVolumes[0]} km

⚠️ TRANSPARENCE CALIBRAGE — RÈGLE OBLIGATOIRE pour welcomeMessage :
Si l'utilisateur a déclaré un volume actuel > 0 ET que le ratio (S1 calibrée / volume déclaré) > 1.5
(c'est-à-dire : on propose plus de +50 % par rapport à sa baseline), tu DOIS expliquer ce calibrage
dans le welcomeMessage de manière transparente et bienveillante. Modèle :
"Tu nous as indiqué [X] km/semaine actuels. On calibre ta première semaine à [Y] km — c'est un peu
plus que ton volume actuel mais reste progressif pour atteindre ton objectif. Tu peux ajuster ton
volume dans ton profil si tu cours en réalité plus que ça."
Ton : honnête, jamais commercial, jamais culpabilisant. Si le ratio ≤ 1.5, pas besoin de l'évoquer.

Phases du plan :
${generationContext.periodizationPlan.weeklyPhases.map((p, i) => `S${i + 1}: ${p} (${generationContext.periodizationPlan.weeklyVolumes[i]}km)`).join('\n')}

═══════════════════════════════════════════════════════════════
          🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨
═══════════════════════════════════════════════════════════════
🔴 EXACTEMENT ${data.frequency} séances dans la semaine 1.
🔴 Jours : ${data.preferredDays?.length ? data.preferredDays.join(', ') + ' — CES JOURS UNIQUEMENT.' : 'Répartition équilibrée.'}
🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.
🔴 Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne génères que la semaine 1 ici).
🔴 VOLUME S1 = ${generationContext.periodizationPlan.weeklyVolumes[0]} km — CIBLE BILATÉRALE (somme des distances de toutes les séances running). Tu dois VISER ce volume à ±5%, ni en dessous (sous-stimulation) ni au-dessus (surcharge). Distribue les km entre les séances pour atteindre exactement ce volume.
🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume hebdo. Durée minimum SL : ${minSlDurForPrompt} min.

🔴 TYPES DE SÉANCES AUTORISÉS PAR PHASE :
${(isVKPreview || isTrailSteepPreview) ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, Côtes en EF (montée marchée ou trottée). Le travail en côte modéré EST autorisé dès cette phase pour VK/Trail raide.
   - developpement : + intensification (côtes courtes/longues, seuil en montée).
   - specifique : + Répétitions spécifiques course (simulation D+/km cible), allure spécifique.
   - affutage : Jogging, Sortie courte avec rappel côte, Renforcement.
   - recuperation : Jogging (footing EF plat) uniquement + Renforcement léger. PAS d'intensité.` :
`   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement.
     ${(!isBeginnerLevel && !needsMarcheCourse && data.frequency >= 4 && data.fitnessSubGoal !== 'Reprendre après une pause' && data.lastActivity !== 'Plus de 6 mois') ?
     `⚠️ NIVEAU CONFIRMÉ+ / 4+ SÉANCES : à partir de la SEMAINE 3 du fondamental, 1 séance par semaine DOIT inclure du travail de vitesse léger :
       • Fartlek libre (5-6 accélérations de 30s à allure 10km, récup 1min30 trottée) — type "Fractionné", intensité "Modéré"
       • OU Footing avec gammes de vitesse (8-10 lignes droites de 80-100m en fin de footing)
       • OU Côtes courtes (6-8 × 20s en côte, récup descente trottée)
       Cela maintient les qualités neuromusculaires sans casser la base aérobie. Les semaines 1-2 restent 100% EF.` :
     `PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale.`}
     ⚠️ VARIÉTÉ OBLIGATOIRE en phase fondamentale : chaque footing doit avoir un thème DIFFÉRENT. Exemples :
       • "Footing en aisance respiratoire" (classique plat)
       • "Footing vallonné" (terrain avec légères côtes, toujours en EF)
       • "Footing progressif" (départ très lent, finir au haut de la zone EF)
       • "Footing nature / trail doux" (sentiers, chemins, terrain varié — pour les traileurs)
       • "Footing technique" (focus foulée, cadence, posture)
       NE PAS répéter le même intitulé ou le même format deux fois dans la même semaine.
   - developpement : + Fractionné (VMA courte, côtes), seuil court possible.
   - specifique : + Seuil long, allure spécifique course, fractionné seuil.
   - affutage : Jogging court à modéré, Renforcement allégé + 1 rappel fractionné court (200-400m). PAS de Sortie Longue volumineuse (la course remplace la SL la semaine du raceDate).
   - recuperation : Jogging (footing EF) uniquement + Renforcement léger. PAS d'intensité.`}

${data.raceDate ? RACE_DAY_INSTRUCTION : ''}

${MAINSET_COHERENCE_RULES}

${buildDisciplineBlock(data.subGoal, data, paces)}

${goal.includes('Perte') ? (() => {
  const pdpVma = vmaEstimate?.vma || data.vma || 12;
  const pdpEfPace = paces?.efPace || '8:00';
  const pdpBmi = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : 0;
  const pdpIsLowVMA = pdpVma < 12;
  const pdpIsOverweight = pdpBmi >= 30;
  const pdpNeedsMarcheCourse = pdpVma < 10.5 || pdpBmi >= 30 || (pdpEfPace > '7:30');
  const pdpMaxSLmin = pdpIsLowVMA ? 60 : 65;
  const pdpTotalWeeks = data.durationWeeks || 12;
  const pdpFondWeeks = Math.max(1, Math.floor(pdpTotalWeeks * 0.45));
  return `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES (OBLIGATOIRE) :
Ce plan est un plan PERTE DE POIDS, PAS une préparation course.
${pdpIsLowVMA ? `⚠️ VMA ${pdpVma.toFixed(1)} km/h < 12 → TRAITER COMME DÉBUTANT+ quel que soit le niveau déclaré. Réduire volume et intensité en conséquence.` : ''}
${pdpIsOverweight ? `⚠️ IMC ${pdpBmi.toFixed(1)} ≥ 30 → SURPOIDS : max 2 séances course/semaine + 1 renfo. Alternance marche/course OBLIGATOIRE les 4 premières semaines. Priorité protection articulaire.` : ''}

INTERDICTIONS ABSOLUES :
- JAMAIS d'allure spécifique (5k/10k/semi/marathon/course) dans les mainSet ni de mention "allure spé" / "allure course".
- JAMAIS de "phase spécifique" ni "phase affûtage" — seules les phases "fondamental", "developpement" et "recuperation" existent
- JAMAIS de VMA/fractionné intense en phase fondamentale (semaines 1 à ${pdpFondWeeks})
${pdpIsOverweight ? `- JAMAIS de fractionné, fartlek, côtes, ni séance à haute intensité (IMC ${pdpBmi.toFixed(1)} ≥ 30 → risque articulaire). Uniquement : Jogging EF, Sortie Longue EF, Renforcement, Marche/Course. Footing progressif autorisé mais finir en endurance active MAX (PAS au seuil).` : ''}

SÉANCES AUTORISÉES PAR PHASE :
- Phase FONDAMENTALE : ${pdpNeedsMarcheCourse ? 'Alternance marche/course les 2-3 premières semaines, puis Jogging EF' : 'Jogging EF'} + Renforcement + Sortie Longue EF. ZÉRO intensité.
  ${!pdpIsOverweight ? '• Varier les formats : footing nature (sentiers, parcs), footing urbain, marche rapide active avec dénivelé léger.' : '• Varier : footing sur sol souple (parcs, chemins), marche rapide active (excellent pour brûler sans impact).'}
- Phase DÉVELOPPEMENT : Jogging EF + Renforcement + SL EF + fartlek DOUX (accélérations 30s-1min, PAS de VMA pure). Le fartlek ne doit PAS dépasser 15-20% de la durée de la séance. Max 1 séance avec intensité légère par semaine.
  ${!pdpIsOverweight ? `• DIVERSIFIER les séances (OBLIGATOIRE — ne jamais répéter le même format 2 fois dans la semaine) :
    - Fartlek nature : accélérations libres 30s-1min30 au feeling dans un parc/forêt, récup en trottinant
    - Séance côtes douces : 4-6 montées de 30-45s à effort modéré (6-7/10), redescente en marchant
    - Circuit cardio-renfo : alternance 4-5 min course EF + 3-4 exercices renfo (squats, fentes, gainage) × 3-4 tours
    - Footing progressif : départ très lent (récup) → finir les 5 dernières min en endurance active
    - Footing technique : focus cadence élevée (170-180 pas/min), foulée courte, posture droite` : `• Diversifier SANS impact excessif :
    - Footing progressif : départ très lent → finir légèrement plus vite les 5 dernières min
    - Marche rapide en côte : excellent ratio dépense calorique / impact articulaire
    - Circuit renfo allongé : alterner marche rapide 3 min + exercices bas du corps × 4-5 tours`}
- Phase RÉCUPÉRATION : Jogging léger EF + Renforcement allégé. Volume -30%.

STRUCTURE 3+1 OBLIGATOIRE :
3 semaines de charge progressive → 1 semaine de récupération (-30% volume).
Ex sur 12 semaines : S1-S3 (charge) → S4 (récup) → S5-S7 (charge) → S8 (récup) → S9-S11 (charge) → S12 (récup/bilan)

PROGRESSION DU VOLUME TOTAL HEBDO (OBLIGATOIRE) :
- S1-S3 : ${pdpIsLowVMA ? '1h00-1h20' : '1h20-1h40'}/semaine (hors renfo)
- S5-S7 : ${pdpIsLowVMA ? '1h20-1h45' : '1h40-2h00'}/semaine
- S9-S11 : ${pdpIsLowVMA ? '1h40-2h00' : '2h00-2h20'}/semaine
- Augmentation max : +10-15% par semaine. JAMAIS plus.
Les FOOTINGS doivent aussi progresser (pas seulement la SL) : de 25-30 min (S1) à 35-45 min (S9-S11).

PROGRESSION SORTIE LONGUE (OBLIGATOIRE) :
- S1-S3 : SL de 30-35 min
- S5-S7 : SL de 40-50 min
- S9-S11 : SL de 50-${pdpMaxSLmin} min
- Semaines de récup : SL réduite de 30% (ex: 50 min → 35 min)
⚠️ La SL ne doit JAMAIS rester identique 2 semaines de suite. Plafond : ${pdpMaxSLmin} min pour ce profil.

RENFORCEMENT — CADRAGE OBLIGATOIRE :
- Durée : 20-30 min (JAMAIS plus de 35 min)
- Exercices : poids de corps uniquement (squats, fentes, gainage ventral/latéral, pompes adaptées, montées de chaise)
- PAS de pliométrie lourde (pas de box jumps, burpees, sauts en contrebas)
- PAS de charges lourdes sans expérience confirmée
- Focus : bas du corps + gainage = protection articulaire + métabolisme
- Progression : augmenter les reps (3x12 → 3x15 → 3x18) avant de varier les exercices

EFFORT PERÇU dans chaque mainSet (OBLIGATOIRE) : Jogging/SL = "4/10, conversation facile" | Fartlek = "6-7/10 sur accélérations, retour 4/10 entre" | Récup = "3/10, très très facile".

${pdpNeedsMarcheCourse ? `ALTERNANCE MARCHE/COURSE (semaines 1-3) :
L'allure EF (${pdpEfPace}/km) est très lente pour ce profil. Les 2-3 premières semaines, proposer :
- Jogging : alternance 2 min course / 1 min marche, puis 3 min course / 1 min marche
- SL : alternance 3 min course / 2 min marche
Transition vers course continue à partir de S4-S5 selon le ressenti.
` : ''}
SIGNAUX D'ALERTE À MENTIONNER :
Dans l'advice de la première séance, inclure : "Si tu ressens une douleur au genou, à la cheville ou au tibia pendant la course, arrête-toi et marche. Ne force jamais sur une douleur articulaire. Les courbatures musculaires sont normales, les douleurs articulaires ne le sont pas."

NOMMAGE : types autorisés = "Jogging", "Sortie Longue", "Renforcement"${!pdpIsOverweight ? ', "Fractionné"' : ''}${pdpNeedsMarcheCourse ? ', "Marche/Course"' : ''}. ${!pdpIsOverweight ? 'Le type "Fractionné" inclut fartlek doux, côtes douces, circuit cardio-renfo (uniquement en phase développement).' : ''}

PRIORITÉ ABSOLUE : sécurité > régularité > progression > plaisir > dépense calorique.`;
})() : ''}

${goal.includes('Hyrox') ? (() => {
  const hyroxFreq = data.frequency || 3;
  const hyroxVma = vmaEstimate?.vma || data.vma || 14;
  const hyroxLevel = data.level || 'Intermédiaire (Régulier)';
  const hyroxIsBeginnerish = hyroxLevel.includes('Débutant') || hyroxVma < 12;
  const hyroxPrevTime = data.hyroxPreviousTime || '';
  const hyroxVolActuel = data.currentWeeklyVolume;
  return `🔴 PLAN HYROX — PRÉPA COURSE À PIED (OBLIGATOIRE) :
Ce plan couvre UNIQUEMENT la partie course à pied de la préparation Hyrox.
L'athlète fait ses entraînements fonctionnels (rameur, sled push, wall balls, burpees, etc.) À CÔTÉ de ce plan.
${hyroxPrevTime ? `Temps Hyrox précédent : ${hyroxPrevTime} (contexte niveau, pas pour les allures).` : ''}

FORMAT HYROX : 8 × 1km de course entrecoupés de 8 stations fonctionnelles.
→ L'effort running est de type SEUIL FRACTIONNÉ avec coupures.
→ La capacité à RELANCER après un effort non-running est la clé.
→ Distance running totale : 8 km. Ce n'est PAS un 10km continu.

═══════════════════════════════════════
GESTION PAR FRÉQUENCE — ${hyroxFreq} SÉANCES/SEMAINE
═══════════════════════════════════════
${hyroxFreq <= 2 ? `⚠️ FRÉQUENCE BASSE (${hyroxFreq}x/sem) — L'athlète fait beaucoup de fonctionnel à côté.
PRIORITÉ DES SÉANCES (par ordre d'importance) :
1. 🔑 Séance clé Hyrox (simulation 8×1km OU tempo seuil OU relances sous fatigue) — TOUJOURS présente
2. Footing EF (base aérobie, récupération active)
RENFO : intégré en fin de footing EF (10 min de gainage/proprioception) plutôt qu'une séance dédiée.
Volume cible : ${hyroxIsBeginnerish ? '10-15' : '15-25'} km/sem max. Chaque séance compte.` :
hyroxFreq === 3 ? `FRÉQUENCE STANDARD (3x/sem) — Bon équilibre running/fonctionnel.
STRUCTURE HEBDO IDÉALE :
1. 🔑 Séance clé Hyrox (simulation OU tempo OU relances) — OBLIGATOIRE
2. Footing EF (30-45 min) — base aérobie
3. Renforcement prévention (25-35 min) OU 2e footing EF
Volume cible : ${hyroxIsBeginnerish ? '15-20' : '20-35'} km/sem.` :
hyroxFreq === 4 ? `FRÉQUENCE ÉLEVÉE (4x/sem) — Athlète qui investit dans le running.
STRUCTURE HEBDO IDÉALE :
1. 🔑 Séance clé Hyrox (simulation OU tempo OU relances) — OBLIGATOIRE
2. Footing EF (35-50 min) — base aérobie
3. 2e séance qualité OU footing progressif
4. Renforcement prévention
Volume cible : ${hyroxIsBeginnerish ? '20-30' : '30-45'} km/sem.` :
`FRÉQUENCE HAUTE (${hyroxFreq}x/sem) — Volume running important.
STRUCTURE HEBDO IDÉALE :
1. 🔑 Séance clé Hyrox (simulation 8×1km) — OBLIGATOIRE
2. 2e séance qualité (tempo OU relances OU VMA courte)
3-4. Footings EF variés (progressif, nature, technique)
5. Renforcement prévention
Volume cible : ${hyroxIsBeginnerish ? '25-35' : '35-50'} km/sem.
⚠️ Attention à la charge totale (running + fonctionnel). Prévoir au moins 1 jour OFF complet/semaine.`}

${hyroxIsBeginnerish ? `
🚶‍♂️ ADAPTATION DÉBUTANT / VMA BASSE (${hyroxVma.toFixed(1)} km/h) :
- Semaines 1-3 : PAS de séance seuil. Uniquement footings EF + renfo. Construire la base.
- Semaine 4+ : introduction progressive avec fartlek doux (accélérations 20-30s au feeling, récup 1min30).
- Simulation Hyrox (8×1km) : PAS AVANT la phase spécifique. Et commencer par 4×1km puis monter à 6 puis 8.
- Allure des 1km : commencer à allure EA (${paces?.eaPace || '5:30'} min/km), pas au seuil.
- Les footings peuvent inclure de la marche si nécessaire.
` : ''}

${hyroxVolActuel !== undefined && hyroxVolActuel !== null ? `VOLUME ACTUEL DÉCLARÉ : ${hyroxVolActuel} km/sem.
${hyroxVolActuel === 0 ? '→ L\'athlète ne court PAS actuellement. Démarrer à 8-12 km/sem max. Progression très progressive. Marche/course autorisée.' :
hyroxVolActuel < 15 ? `→ Volume faible. Démarrer à ${Math.max(hyroxVolActuel, 8)} km/sem. Ne pas dépasser +15%/semaine.` :
hyroxVolActuel < 30 ? `→ Volume modéré. Démarrer à ${Math.round(hyroxVolActuel * 0.9)} km/sem. Marge de progression confortable.` :
`→ Volume élevé (${hyroxVolActuel}km). Attention : l'athlète fait aussi du fonctionnel. Ne pas cumuler > ${hyroxVolActuel + 10} km running/sem.`}
` : ''}

CATALOGUE DE SÉANCES HYROX (choisir selon la phase et la fréquence) :

1. **Simulation Hyrox (séance reine)** : à allure seuil (${paces?.seuilPace || '4:30'}/km), récup 2min marche/trot entre chaque.
   → Phase spécifique uniquement. PROGRESSION OBLIGATOIRE : début phase spé = 4×1km, milieu = 6×1km, fin = 8×1km. Ne JAMAIS commencer directement par 8×1km.

2. **Relances sous fatigue** : 15min EF → 6×(30s accélération VMA + 1min30 récup trot) → 10min EF.
   → Simule la relance après une station. Phase développement+.

3. **Tempo Run Hyrox** : 20-30min continu à allure seuil (${paces?.seuilPace || '4:30'}/km).
   → Endurance spécifique. Phase développement+.

4. **Intervalles courts** : 10-12×400m à allure VMA (${paces?.vmaPace || '3:30'}/km), récup 1min.
   → Puissance et vitesse. Phase développement+.

5. **Fartlek libre** : footing EF avec 6-8 accélérations de 20-40s au feeling, récup libre.
   → Introduction à l'intensité. Dès la phase fondamentale (S3+).

6-8. **Footing EF** (${paces?.efPace || '6:00'}/km), **Footing progressif** (fin à allure EA/seuil), **Renforcement prévention** (gainage+quads+mollets+proprio, 25-35min — PAS DE FONCTIONNEL HYROX, il le fait à côté).

PHASES :
- FONDAMENTALE : Footings EF variés + fartlek doux dès S3 + Renfo. PAS de simulation Hyrox.
- DÉVELOPPEMENT : 1 séance qualité/sem (tempo OU intervalles OU relances) + footings EF + renfo.
- SPÉCIFIQUE : 1 simulation Hyrox (progression 4→6→8×1km) + ${hyroxFreq >= 4 ? '1 séance qualité (relances ou tempo) + ' : ''}footings EF + renfo.
- AFFÛTAGE : volume -40%. Rappels d'allure courts (3-4×1km). Footings légers.

VOLUME RUNNING HYROX (le running est 8km, pas 42km — adapter les volumes) :
- Les SL ne dépassent PAS 1h15 (12-15km max).
- Le volume hebdo doit rester MODÉRÉ — les stations Hyrox (sled, wall balls, burpees) sont travaillées hors de ce plan.
- Prévoir au moins 1 jour OFF complet sans running NI fonctionnel par semaine.

NOMMAGE TITRES (Hyrox-flavored sur les séances de course — le titre du renfo est généré séparément par le code, NE PAS le réécrire) :
- Footing EF → "Footing — Base aérobie Hyrox" ou "Footing en aisance — Prépa Hyrox"
- Sortie Longue → "Sortie Longue — Volume aérobie Hyrox"
- Marche/Course → "Marche/Course — Démarrage progressif Hyrox"
- Séances spécifiques → "Simulation Hyrox 4×1km", "Simulation Hyrox 6×1km", "Simulation Hyrox 8×1km", "Tempo Hyrox", "Relances sous fatigue Hyrox"
- Types JSON inchangés : "Jogging", "Sortie Longue", "Fractionné", "Renforcement", "Marche/Course"
→ Objectif : l'utilisateur doit voir "Hyrox" sur les titres des séances de course pour percevoir la spécificité du plan. Le titre du renfo est automatiquement "Renfo Hyrox Focus A/B - ..." via le code.

ADVICE PAR SÉANCE — INTERDICTION DE COPY-PASTE :
Chaque advice DOIT être UNIQUE. Pour les séances de COURSE, faire le lien avec la performance Hyrox (réservoir aérobie, capacité à enchaîner les 8 segments de course coupés).
⚠️ Pour le RENFO : le renforcement est du renfo classique de prévention des blessures liées à la course à pied (squats, fentes, gainage). NE PAS faire de lien avec les stations Hyrox (sled push, wall balls, sandbag lunges, etc.) — ce n'est pas l'objet de cette séance. Le renfo prépare le corps à supporter le volume de course, pas à exécuter les stations.

Exemples (à adapter, ne pas copier) :
- Footing EF : "Cette base aérobie te permet de tenir les 8×1km Hyrox sans saturer dès le 3e segment de course. C'est le réservoir cardio sur lequel reposera ta course."
- Renfo : "Ce travail de renforcement prévient les blessures liées à la course à pied (genoux, mollets, chaîne postérieure). Un corps solide tient mieux le volume hebdomadaire et limite le risque d'arrêt sur blessure."
- Sortie Longue : "Volume aérobie = ton réservoir pour enchaîner les 8km coupés. Tu construis ton endurance globale de coureur."
- Marche/Course : "Démarrage en douceur pour habituer ton corps à l'effort répété sans risque de blessure."
- Séance clé Hyrox (phase spé+) : conseils de pacing et technique de relance après un segment de course rapide.
🚫 INTERDIT : répéter "Ce programme couvre la partie course à pied" dans plusieurs advice.
La mention "ce plan = running uniquement, fonctionnel à côté" doit aller UNE SEULE FOIS dans le welcomeMessage.

WELCOMEMESSAGE HYROX (obligatoirement) :
1. UNE phrase qui clarifie : ce plan couvre la partie course à pied de la prépa Hyrox. L'athlète gère son fonctionnel à côté.
2. Mini-roadmap des phases sur ${planDurationWeeks} semaines pour donner de la perspective dès la S1 :
   - "Semaines 1-3 : base aérobie + technique (tu y es)"
   - "Semaines 4-6 : introduction fartlek + accélérations courtes"
   - "Semaines 7+ : simulations Hyrox progressives 4×1km → 6×1km → 8×1km"
   - "Affûtage final : rappels d'allure avant ta course"
3. Une phrase de motivation orientée Hyrox spécifiquement (pas un message running générique).`;
})() : ''}

${isFinisherTarget(data.targetTime) && !goal.includes('Perte') && !goal.includes('Maintien') && !goal.includes('Remise') && !goal.includes('Hyrox') ? `🔴 PLAN FINISHER — RÈGLES SPÉCIFIQUES :
L'objectif est de TERMINER la course, pas de performer. Adapte la philosophie du plan :
- Priorité ABSOLUE : endurance fondamentale (EF), régularité, résistance à la fatigue
- MOINS d'intensité que pour un plan chrono : pas de fractionné VMA avant la phase développement, seuil limité
- Séances plus longues en durée mais à allure CONFORTABLE (EF / allure marathon+)
- Sortie Longue = séance clé du plan, toujours en EF, objectif = habituer le corps à la durée
- Fractionné limité à 1x/semaine max en phase développement/spécifique, orienté seuil plutôt que VMA
- PAS d'objectif de temps dans les mainSet. Pas d'allure spécifique course.` : ''}

═══════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════
1. Génère SEULEMENT la semaine 1 (pas les autres !)
2. Allures EXACTES dans chaque mainSet
3. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)
4. Évaluation de faisabilité HONNÊTE avec chiffres
5. OBLIGATOIRE : 1 séance de type "Renforcement" par semaine (comptée dans les ${data.frequency} séances)
   - Répartition : ${data.frequency} séances = ${data.frequency - 1} running + 1 renfo
   - Type dans le JSON : "Renforcement"
   - NE PAS mettre de séance "Repos" dans le plan
   - NE PAS générer le contenu du mainSet renfo — le code le fera
6. COHÉRENCE DURÉE/DISTANCE/MAINSET (CRITIQUE) :
   "duration" = TEMPS TOTAL de la séance = warmup + mainSet + cooldown.
   "duration" doit donc être cohérent avec "distance × targetPace" (la distance couvre TOUTE la séance, pas juste le bloc principal).
   Exemple : si duration = "45 min" et allure EF = ${data.vma ? Math.floor(3600 / (data.vma * 0.67) / 60) + ':' + String(Math.round(3600 / (data.vma * 0.67) % 60)).padStart(2, '0') : '8:00'}/km, alors distance ≈ ${data.vma ? (45 / (3600 / (data.vma * 0.67) / 60)).toFixed(1) : '5.6'} km.
   Le préfixe "X min" du mainSet décrit le BLOC PRINCIPAL SEUL (donc < duration). Il doit JAMAIS être > duration totale.
   Ex CORRECT : duration="45 min", warmup="5 min...", mainSet="35 min de footing EF", cooldown="5 min...". Total = 45 min.
   Ex INTERDIT : duration="15 min" + warmup="10 min" + mainSet="20 min" + cooldown="5 min" (total réel 35 min, duration sous-évaluée).
${!(data.goal || '').toLowerCase().includes('perte') && !(data.goal || '').toLowerCase().includes('hyrox') ? `7. NOMMAGE types : "Jogging", "Fractionné", "Sortie Longue", "Récupération", "Renforcement", "Marche/Course" (pas de variantes).` : ''}

═══════════════════════════════════════════════════════════════
              TRAIL & FAISABILITÉ
═══════════════════════════════════════════════════════════════
${trailSectionPreview}
📊 CONTEXTE FAISABILITÉ (le welcomeMessage DOIT rester cohérent avec ce texte) :
${feasibilityTextPreview}

${buildSafetyInstructions(data, (data.level || '').includes('Débutant'))}

═══════════════════════════════════════════════════════════════
                    FORMAT DE SORTIE
═══════════════════════════════════════════════════════════════
Sortie : JSON conforme au schéma fourni via responseSchema.
Valeurs à remplir :
- name = "${buildPlanName(data, planDurationWeeks)}"
- goal = "${data.goal}"
- startDate = "${data.startDate || new Date().toISOString().split('T')[0]}"
- durationWeeks = ${planDurationWeeks}
- sessionsPerWeek = ${data.frequency}
- weeks[0].weekNumber = 1, weeks[0].phase = "${generationContext.periodizationPlan.weeklyPhases[0]}"
- sessions[].type ∈ ${'{"Jogging","Fractionné","Sortie Longue","Récupération","Renforcement","Marche/Course"}'}
- sessions[].intensity ∈ ${'{"Facile","Modéré","Difficile"}'}
- suggestedLocations[].type ∈ ${'{"PARK","TRACK","NATURE","HILL"}'}
- welcomeMessage : orienté OBJECTIF et STRUCTURE (NE PAS mentionner VMA ni allures)
- feasibility : sera rempli côté code (status/message/safetyWarning) — laisser strings vides ou placeholder
`;

    console.log('[Gemini Preview] Envoi prompt optimisé...');
    // Sprint 5 — responseSchema natif (remplace bloc FORMAT JSON texte ~600 tokens).
    // Si Gemini rejette le schéma (rare mais possible sur ResponseSchema complexe),
    // catch retry avec responseMimeType seul (plan B). cf. SchemaType import L2.
    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: previewPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PREVIEW_RESPONSE_SCHEMA,
          maxOutputTokens: 8192,
        },
      });
    } catch (schemaErr) {
      // Plan B : retomber sur mode JSON sans schema strict, conserve la robustesse.
      console.warn('[Gemini Preview] responseSchema rejeté, fallback responseMimeType seul:', schemaErr);
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: previewPrompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
      });
    }

    const response = await result.response;
    const text = response.text();

    const plan = JSON.parse(text);

    // === ÉCRASEMENT DÉTERMINISTE : distance (anti-hallucination LLM) ===
    // Le LLM peut altérer la distance affichée (cas audit 2026-05-20 :
    //   Margaux Semi "16 km", Bertrand Semi "14 km", floggyz 10K "36 km").
    // On force la valeur depuis l'input user — source de vérité.
    // Cf. [[feedback_input_client_obligatoire]].
    applyDistanceOverride(plan, data);

    // === ENRICHISSEMENT DU PLAN ===
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

    // Marquer comme preview
    plan.isPreview = true;
    plan.fullPlanGenerated = false;

    // STOCKER LE CONTEXTE DE GÉNÉRATION (CLÉ POUR LA COHÉRENCE)
    plan.generationContext = generationContext;

    // Forcer raceDate depuis les données questionnaire (Gemini ne le retourne pas toujours)
    if (data.raceDate) {
      plan.raceDate = data.raceDate;
    }

    // Initialiser le log d'adaptations
    plan.adaptationLog = {
      weekNumber: 0,
      adaptationsThisWeek: 0,
      adaptationHistory: []
    };

    // === VALIDATION ET CORRECTION POST-GÉNÉRATION (Preview) ===
    const DAYS_ORDER_PREV = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    let prefDays = data.preferredDays && data.preferredDays.length > 0 ? [...data.preferredDays] : null;

    // Fix P1-bis: si moins de jours préférés que de séances, compléter automatiquement
    if (prefDays && prefDays.length < data.frequency) {
      const allDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      while (prefDays.length < data.frequency) {
        const available = allDays.filter(d => !prefDays!.includes(d));
        if (available.length === 0) break;
        // Ajouter le jour le plus éloigné des jours existants pour une bonne répartition
        const existingIndices = prefDays!.map(d => allDays.indexOf(d));
        let bestDay = available[0];
        let bestMinDist = 0;
        for (const candidate of available) {
          const ci = allDays.indexOf(candidate);
          const minDist = Math.min(...existingIndices.map(ei => Math.min(Math.abs(ci - ei), 7 - Math.abs(ci - ei))));
          if (minDist > bestMinDist) { bestMinDist = minDist; bestDay = candidate; }
        }
        prefDays!.push(bestDay);
        console.log(`[Gemini Preview] Jour auto-ajouté: ${bestDay} (${prefDays!.length}/${data.frequency})`);
      }
      // Trier dans l'ordre de la semaine
      prefDays!.sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b));
    }

    if (plan.weeks && plan.weeks[0]?.sessions) {
      // Forcer les jours préférés
      if (prefDays) {
        plan.weeks[0].sessions.forEach((session: any, idx: number) => {
          if (idx < prefDays!.length && session.day !== prefDays![idx]) {
            console.log(`[Gemini Preview] Correction jour: séance ${idx + 1} "${session.day}" → "${prefDays![idx]}"`);
            session.day = prefDays![idx];
          }
        });
      }

      // Forcer la Sortie Longue sur le jour préféré (détection élargie : type | titre)
      enforceSLDay(plan.weeks[0], data.preferredLongRunDay || 'Dimanche', '[Gemini Preview] ');

      // Dédupliquer — fallback sur DAYS_ORDER complet si prefDays épuisé
      const usedDays = new Set<string>();
      plan.weeks[0].sessions.forEach((session: any, idx: number) => {
        if (usedDays.has(session.day)) {
          const pool = prefDays || DAYS_ORDER_PREV;
          let available = pool.filter((d: string) => !usedDays.has(d));
          // Fallback sur tous les jours si le pool préféré est épuisé
          if (available.length === 0) {
            available = DAYS_ORDER_PREV.filter((d: string) => !usedDays.has(d));
          }
          if (available.length > 0) session.day = available[0];
        }
        usedDays.add(session.day);
        session.id = `w1-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      });

      // Ajuster le nombre de séances
      if (plan.weeks[0].sessions.length > data.frequency) {
        console.warn(`[Gemini Preview] ${plan.weeks[0].sessions.length} séances au lieu de ${data.frequency} — tronqué`);
        plan.weeks[0].sessions = plan.weeks[0].sessions.slice(0, data.frequency);
      }

      plan.weeks[0].sessions.sort((a: any, b: any) =>
        DAYS_ORDER_PREV.indexOf(a.day) - DAYS_ORDER_PREV.indexOf(b.day)
      );
    }

    // Forcer les métadonnées du plan
    plan.durationWeeks = planDurationWeeks;
    plan.sessionsPerWeek = data.frequency;

    // Aligner startDate sur le lundi de la semaine (cohérence affichage front)
    if (plan.startDate) {
      const rawSD = new Date(plan.startDate);
      const dow = rawSD.getDay(); // 0=dim, 1=lun, ..., 6=sam
      const daysToMon = dow === 0 ? -6 : 1 - dow;
      if (daysToMon !== 0) {
        rawSD.setDate(rawSD.getDate() + daysToMon);
        plan.startDate = rawSD.toISOString().split('T')[0];
        console.log(`[Gemini Preview] startDate aligned to Monday: ${plan.startDate}`);
      }
    }

    // Calculer endDate = startDate + durationWeeks
    if (plan.startDate && planDurationWeeks) {
      const sd = new Date(plan.startDate);
      sd.setDate(sd.getDate() + planDurationWeeks * 7);
      plan.endDate = sd.toISOString().split('T')[0];
      console.log(`[Gemini Preview] endDate calculée: ${plan.endDate} (${planDurationWeeks} semaines après ${plan.startDate})`);
    }

    // === Injection déterministe du contenu renfo (Preview) ===
    if (plan.weeks && plan.weeks[0]?.sessions) {
      plan.weeks[0].sessions.forEach((session: any) => {
        if (session.type === 'Renforcement') {
          const renfo = buildRenfoMainSet({
            weekNumber: 1,
            goal: data.goal || '',
            subGoal: data.subGoal,
            trailDistance: data.goal === 'Trail' ? data.trailDetails?.distance : undefined,
            level: getEffectiveLevel(data),
            phase: plan.weeks[0].phase || 'fondamental',
            weight: data.weight,
            height: data.height,
            age: data.age,
            injuries: data.injuries,
          });
          session.mainSet = renfo.mainSet;
          session.warmup = renfo.warmup;
          session.cooldown = renfo.cooldown;
          session.duration = renfo.duration;
          session.title = renfo.title;
        }
      });
    }

    // === Post-processing qualité séances (Preview) ===
    if (plan.weeks && Array.isArray(plan.weeks)) {
      const trailDist = data.goal === 'Trail' && data.trailDetails?.distance ? data.trailDetails.distance : 0;
      plan.weeks.forEach((week: any) => postProcessWeekQuality(week, paces, 'Première semaine — mise en route progressive', data.goal, trailDist));
      // Enforcement volumes/durées/caps déterministe
      plan.weeks.forEach((week: any, idx: number) => {
        const targetVol = generationContext.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data, generationContext.periodizationPlan.weeklyVolumes, idx);
      });
      // Routing label Marche/Course (audit Lilian 2026-05-21) : si mainSet contient
      // un pattern run/walk, forcer le type. Doit tourner APRÈS enforceWeekConstraints
      // (qui peut réécrire le mainSet) et AVANT le guard cross-semaines.
      plan.weeks.forEach((week: any) => applyMarcheCourseRouting(week));
      // Guard cross-semaines (affûtage, progression, re-cap)
      enforceFullPlanConstraints(plan.weeks, generationContext.periodizationPlan.weeklyVolumes, data);

      // Sprint Marathon 2026-05-19 — race-day injection (preview).
      // Cas plan court (raceDate tombe dans S1) : on remplace la séance du jour J
      // par la course officielle. Le cap affûtage est désactivé pour _raceDay.
      const injectedIdx = injectRaceSession(plan, data, paces);
      if (injectedIdx >= 0) {
        console.log(`[Race-Day Preview] Course officielle injectée S${injectedIdx + 1}`);
      }
    }

    // === Injection des variantes de footing (Preview) — phase fondamentale/récupération ===
    // Casse la monotonie : varie la FORME des footings EF sans changer l'intensité.
    // Fix D 2026-05-19 — DÉPLACÉ APRÈS enforceWeekConstraints pour que la
    // variante construise son mainSet avec la duration FINALE (post-cap).
    // Cas bug : Gemini sort 1h30, enforce cape à 60min, variant avait déjà
    // écrit "90 min en EF..." → 51 séances en base désync (steph-fanny).
    if (plan.weeks && plan.weeks[0]?.sessions) {
      const w1 = plan.weeks[0];
      const phaseLc = (w1.phase || 'fondamental').toLowerCase();
      if (phaseLc === 'fondamental' || phaseLc === 'recuperation') {
        const footingFlags = detectFootingFlags({
          weight: data.weight, height: data.height, age: data.age,
          level: getEffectiveLevel(data), injuries: data.injuries,
        });
        w1.sessions.forEach((session: any, idx: number) => {
          if (session.type === 'Jogging' && (session.intensity === 'Facile' || !session.intensity)) {
            const variant = buildFootingVariant({
              weekNumber: 1,
              sessionIndex: idx,
              goal: data.goal || '',
              durationStr: session.duration || '45 min',
              efPace: paces.efPace || session.targetPace || '',
              flags: footingFlags,
              sessionElevation: session.elevationGain,
              sessionTitle: session.title,
              seed: plan.id || '',
            });
            session.title = variant.title;
            session.warmup = variant.warmup;
            session.mainSet = variant.mainSet;
            session.cooldown = variant.cooldown;
            session.advice = variant.advice;
          }
        });
      }
    }

    // Forcer le nom du plan + tutoiement sur les champs globaux
    plan.name = buildPlanName(data, planDurationWeeks);
    if (plan.welcomeMessage) plan.welcomeMessage = forceTutoiement(plan.welcomeMessage);
    if (plan.feasibility?.message) plan.feasibility.message = forceTutoiement(plan.feasibility.message);
    if (plan.feasibility?.safetyWarning) plan.feasibility.safetyWarning = forceTutoiement(plan.feasibility.safetyWarning);

    // === Enforcement D+ trail (Preview — semaine 1) ===
    if (data.goal === 'Trail' && data.trailDetails && plan.weeks?.[0]?.sessions) {
      const detectedLevel = detectLevelFromData(data);
      const weekTarget = calculateWeekTargetElevation(
        1, planDurationWeeks, data.trailDetails.elevation,
        detectedLevel, data.currentWeeklyElevation, plan.weeks[0].phase || 'fondamental',
      );
      console.log(`[Trail D+ Preview] S1: raceElev=${data.trailDetails.elevation}m, level=${detectedLevel}, weekTarget=${weekTarget}m, sessions=${plan.weeks[0].sessions.length}`);
      distributeElevationToSessions(plan.weeks[0].sessions, weekTarget, detectedLevel);
      // R3 — log post-génération : compare D+ réel séances vs cible (monitoring)
      logDplusActualVsTarget(plan, generationContext.periodizationPlan.weeklyElevationTarget);
    } else if (data.goal === 'Trail') {
      console.warn(`[Trail D+ Preview] SKIPPED: trailDetails=${!!data.trailDetails}, weeks=${!!plan.weeks?.[0]?.sessions}`);
    }

    // === Strip D+ des plans NON-trail (Gemini en génère parfois spontanément) ===
    if (data.goal !== 'Trail' && plan.weeks?.[0]?.sessions) {
      let stripped = 0;
      plan.weeks[0].sessions.forEach((s: any) => {
        if ((s.elevationGain || 0) > 0) {
          stripped += s.elevationGain;
          s.elevationGain = 0;
        }
      });
      if (stripped > 0) {
        console.log(`[Enforce] Stripped ${stripped}m D+ from non-trail plan (S1)`);
      }
    }

    // === Injection de la faisabilité calculée (TOUJOURS le message pré-calculé, jamais celui de Gemini) ===
    // Fix 2026-05-18 : score persisté DANS feasibility (avant, seul confidenceScore l'avait au
    // niveau plan racine). Sébastien était le seul plan en base avec feasibility.score persisté
    // — patché manuellement. Audit AUDIT-5-PLANS-TEMPLATE-V2.md a révélé que 4/5 plans n'avaient
    // pas le score → schéma incomplet, blocage évolutions UI/API qui lirait feasibility.score.
    plan.feasibility = {
      status: feasibilityResultPreview.status,
      score: feasibilityResultPreview.score,
      message: feasibilityResultPreview.message,
      safetyWarning: feasibilityResultPreview.safetyWarning,
      recommendation: feasibilityResultPreview.recommendation,
    };
    plan.confidenceScore = feasibilityResultPreview.score; // rétro-compat frontend (à supprimer V2)

    // ─── Validation Layer 1 (rules only for preview) ───
    const { validatePlanRules } = await import('./planValidator');
    const validation = validatePlanRules(plan as TrainingPlan, data);
    if (validation.issues.length > 0) {
      console.log(`[Gemini Preview] Validation: score=${validation.score}, issues=${validation.issues.length}`);
      validation.issues.forEach((i: any) => console.log(`  [${i.severity}] S${i.weekNumber}: ${i.message}`));
    }

    // ─── Correction français : supprimée Sprint 4 (correctFrenchWithAI)
    // Le LLM correcteur était redondant avec forceTutoiement (180L regex déterministes,
    // L308-487) qui couvre déjà tutoiement, accords féminins, élisions, conjugaisons
    // hybrides cassées. Sur 27 profils Sprint 1+2+3 audités : 1 seule faute observée
    // (AUDIT-WOZNIAKMAEVA "tu introduire") non couverte par le prompt du LLM. Gain :
    // -7 à -10s P95 sur le chemin critique UX preview. forceTutoiement reste appliqué
    // exhaustivement dans postProcessWeekQuality + welcomeMessage/feasibility.

    // Nettoyer les markers internes (_dedupedFromSL) avant retour
    plan.weeks?.forEach((w: any) => w.sessions?.forEach((s: any) => delete s._dedupedFromSL));

    const elapsed = Date.now() - startTime;
    console.log(`[Gemini Preview] Terminé en ${elapsed}ms (vs ~15-30s pour plan complet)`);

    return plan;

  } catch (error) {
    console.error('[Gemini Preview] Erreur:', error);
    throw error;
  }
};

// ============================================
// GÉNÉRATION DES SEMAINES RESTANTES
// ============================================

/**
 * Génère les semaines 2 à N en utilisant le contexte FIGÉ.
 * Garantit une cohérence TOTALE avec la semaine 1.
 *
 * IMPORTANT: Génère par lots de 3 semaines pour éviter les erreurs JSON
 * dues à la troncature des réponses trop longues.
 */
export const generateRemainingWeeks = async (
  plan: TrainingPlan,
  onProgress?: (partialPlan: TrainingPlan, batchIndex: number, totalBatches: number) => void | Promise<void>,
): Promise<TrainingPlan> => {
  if (!plan.isPreview || !plan.generationContext) {
    throw new Error('Ce plan n\'est pas en mode preview ou manque le contexte de génération');
  }

  console.log('[Gemini Remaining] Génération des semaines restantes par lots...');
  const startTime = Date.now();

  const ctx = plan.generationContext;
  const data = ctx.questionnaireSnapshot;
  const paces = ctx.paces;
  // VMA figée du contexte → detectLevelFromData / getEffectiveLevel la croisent
  // avec le niveau déclaré dans toute la suite de cette fonction.
  (data as any).vma = ctx.vma;
  const totalWeeks = ctx.periodizationPlan.totalWeeks;
  // Adapter la taille des lots au nombre de séances (plus de séances = JSON plus gros)
  const frequency = data.frequency || 3;
  const BATCH_SIZE = frequency >= 5 ? 4 : frequency >= 4 ? 5 : 6;

  // Garde-fou fréquence (même logique que generatePreviewPlan)
  const goalRemaining = data.goal || '';
  const isAmbitiousRemaining = goalRemaining.includes('Trail') ||
    data.subGoal === 'Semi-Marathon' || data.subGoal === 'Semi-marathon' ||
    data.subGoal === 'Marathon';
  if (isAmbitiousRemaining && data.frequency < 3) {
    console.warn(`[Fréquence] Remaining: ${data.subGoal || goalRemaining} avec ${data.frequency} séances → forcé à 3`);
    data.frequency = 3;
  }

  // Résumé de la semaine 1 pour contexte
  const week1Summary = plan.weeks[0].sessions.map(s =>
    `${s.day}: ${s.title} (${s.type}, ${s.duration})`
  ).join('\n');

  // Instructions pour les jours
  const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
    ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
    : 'Répartition équilibrée';
  const longRunDayRemaining = data.preferredLongRunDay || 'Dimanche';

  // Instructions spécifiques pour les débutants ou VMA très faible (progression marche/course)
  const isBeginnerLevel = labelToLevelKey(data.level) === 'deb';
  const isPertePoidsProg = (data.goal || '').includes('Perte');
  const isMaintienProg = (data.goal || '').includes('Maintien') || (data.goal || '').includes('Remise');
  const ctxVma = ctx.vma;
  const needsMarcheCourseRemaining = isBeginnerLevel || (ctxVma < 10.5 && (isPertePoidsProg || isMaintienProg));
  const beginnerProgressionInstruction = needsMarcheCourseRemaining ? `

🚶 PROGRESSION MARCHE/COURSE POUR DÉBUTANT :
Ce coureur est DÉBUTANT. Tu dois appliquer une progression d'alternance marche/course :

- Semaines 2-3 : Continuer avec "Marche/Course" - 6-8 x (2 min course + 1 min marche)
- Semaines 4-5 : Progression vers 5-6 x (3 min course + 1 min marche)
- Semaines 6-7 : Transition 3-4 x (5 min course + 1 min marche)
- Semaines 8+ : Introduction progressive du footing continu (15-25 min)
- VMA/Fractionné : PAS AVANT semaine 8-10, et uniquement sous forme de fartlek doux

⚠️ Le type "Marche/Course" doit rester dominant jusqu'à semaine 6-7 !
` : '';

  // === SECTION HYROX pour les lots remaining ===
  const isHyroxRemaining = (data.goal || '').includes('Hyrox');
  const hyroxIsBeginnerishRemaining = (data.level || '').includes('Débutant') || ctxVma < 12;
  const hyroxSectionRemaining = isHyroxRemaining ? `
═══════════════════════════════════════
       SPÉCIFICITÉS HYROX
═══════════════════════════════════════
Ce plan couvre UNIQUEMENT la course à pied de la prépa Hyrox. L'athlète gère son fonctionnel à côté.
Format Hyrox : 8×1km coupés par 8 stations fonctionnelles → priorité = SEUIL FRACTIONNÉ + capacité à relancer.

NOMMAGE TITRES Hyrox-flavored (titre du renfo généré par le code, ne pas le réécrire) : suffixer/préfixer "Hyrox" sur les titres des séances de course (Footing "Base aérobie Hyrox", SL "Volume aérobie Hyrox", spécifiques "Simulation Hyrox N×1km / Tempo Hyrox / Relances sous fatigue Hyrox"). Types JSON inchangés ("Jogging", "Sortie Longue", "Fractionné", "Renforcement", "Marche/Course").

ADVICE PAR SÉANCE — UNIQUE (PAS de copy-paste) :
Pour les séances de COURSE, faire le lien avec la performance Hyrox (capacité aérobie pour enchaîner les 8 segments de course coupés).
⚠️ Le RENFO est du renfo classique de prévention des blessures liées à la course à pied. NE PAS faire de lien avec les stations Hyrox (sled, wall balls, sandbag lunges, etc.) — c'est hors périmètre. Le renfo prépare le corps à tenir le volume de course.
- Footing : base aérobie pour tenir les 8×1km sans saturer cardio
- Renfo : prévention des blessures de course (genoux, mollets, chaîne postérieure) — permet de tenir le volume sans casse
- Sortie Longue : réservoir pour enchaîner les 8km coupés
- Simulation/Tempo : conseils pacing et technique de relance après un segment de course rapide
🚫 INTERDIT : répéter "Ce programme couvre la partie course à pied" dans plusieurs advice.

PROGRESSION SIMULATION HYROX (séance reine, phase SPÉCIFIQUE uniquement) :
- Début phase spé : 4×1km à allure seuil, récup 2min marche/trot
- Milieu : 6×1km
- Fin : 8×1km
- JAMAIS commencer directement par 8×1km

${hyroxIsBeginnerishRemaining ? `🚶 ADAPTATION DÉBUTANT (VMA ${ctxVma.toFixed(1)} km/h) :
- Semaines 1-3 (fondamental) : PAS de séance seuil. Uniquement footings EF + renfo.
- Semaines 4+ : introduction fartlek doux (accélérations 20-30s au feeling).
- Simulation Hyrox : commencer par 4×1km en phase spécifique seulement.
` : ''}
VOLUME : SL max 1h15 (12-15km). Volume hebdo modéré (les stations Hyrox sont travaillées hors de ce plan).
` : '';

  // === SECTION TRAIL pour les lots remaining ===
  const remainingObjective = detectObjectiveFromData(data);
  const isTrailRemaining = data.goal === 'Trail' && data.trailDetails;
  const isVKRemaining = remainingObjective === 'VK';
  const isTrailSteepRemaining = remainingObjective === 'TrailSteep';
  const trailSectionRemaining = isTrailRemaining ? (isVKRemaining ? `
═══════════════════════════════════════
       SPÉCIFICITÉS VK / COURSE DE CÔTE
═══════════════════════════════════════
Distance course : ${data.trailDetails!.distance} km | D+ : ${data.trailDetails!.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails!.elevation / data.trailDetails!.distance)} m/km

⚠️ FORMAT VK — PAS un trail classique :
- Volume hebdomadaire TRÈS RÉDUIT. Pas de footing > 10km.
- Priorité ABSOLUE : puissance en côte (VMA côte, côtes courtes 30-60", escaliers, répétitions en montée)
- Sortie longue orientée DÉNIVELÉ (pas distance) — 1h-1h30 max avec D+ maximum
- Le fractionné en côte EST AUTORISÉ dès la phase fondamentale (geste spécifique VK)
- Renforcement spécifique : squats, fentes, mollets, gainage, proprioception
` : isTrailSteepRemaining ? `
═══════════════════════════════════════
       SPÉCIFICITÉS TRAIL RAIDE
═══════════════════════════════════════
Distance course : ${data.trailDetails!.distance} km | D+ : ${data.trailDetails!.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails!.elevation / data.trailDetails!.distance)} m/km

⚠️ TRAIL RAIDE — Ratio D+/km élevé :
- Volume hebdomadaire RÉDUIT par rapport à un trail classique
- Priorité : côtes longues (2-5min), VMA en côte, power hiking
- Sortie longue avec D+ progressif important — le D+ prime sur la distance
- Le fractionné en côte EST AUTORISÉ dès la phase fondamentale
- Renforcement : quadriceps excentrique, mollets, proprioception
` : `
═══════════════════════════════════════
       SPÉCIFICITÉS TRAIL
═══════════════════════════════════════
Distance course : ${data.trailDetails!.distance} km | D+ : ${data.trailDetails!.elevation} m
Ratio D+/km : ${data.trailDetails!.distance > 0 ? Math.round(data.trailDetails!.elevation / data.trailDetails!.distance) : 0} m/km

Séances spécifiques trail :
- Sortie longue avec D+ progressif (50% → 100% du D+ course au fil des semaines)
- Fractionné en côte : côtes courtes (30-45") et longues (2-5 min)
- Travail technique descente : foulée courte, fréquence élevée


${data.trailDetails!.distance >= 42 ? '- Sorties longues avec ravitaillement simulé\n- Entraînement avec le matériel de course (sac, bâtons)' : ''}
${data.trailDetails!.distance >= 100 ? `- 🔴 ULTRA 100km+ :
${ULTRA70_BACK_TO_BACK_BULLETS}
${ULTRA_NIGHT_RUN_BULLETS}
- Marche en côte (power hiking) intégrée dans les SL — sur un ultra on marche 30-50% du temps
- SL pic doit atteindre 50-65km ou 6-8h minimum
- Allure ultra PLUS LENTE que EF (7:00-8:00 min/km)
${NUTRITION_SL_BLOCK}` : data.trailDetails!.distance >= 70 ? `- 🔴 ULTRA-TRAIL 70km+ :
${ULTRA70_BACK_TO_BACK_BULLETS}
${data.trailDetails!.distance >= 80 ? ULTRA_NIGHT_RUN_BULLETS + '\n' : ''}- SL pic doit atteindre 4h30-6h au pic d'entraînement (semaine de volume max)
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL ≥ 2h30
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec le sac et les bâtons dès la phase développement
- Gestion effort sur très longue durée : alterner course et marche en montée` : ''}
${buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: ctx.periodizationPlan.weeklyElevationTarget, recoveryWeeks: ctx.periodizationPlan.recoveryWeeks, totalWeeks: ctx.periodizationPlan.totalWeeks, raceDplus: data.trailDetails!.elevation, raceDistanceKm: data.trailDetails!.distance, context: 'remaining' })}
`) : '';

  const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // === RESUME-FROM-WHERE-WE-STOPPED ===
  // Si une génération précédente a partiellement sauvegardé (par batch), on reprend où on en était.
  // plan.weeks contient au minimum la semaine 1 (preview). Si > 1, c'est qu'on a déjà progressé.
  const existingWeekNums = (plan.weeks || []).map((w: any) => w.weekNumber || 0).filter((n: number) => n > 0);
  const lastGeneratedWeek = existingWeekNums.length > 0 ? Math.max(...existingWeekNums) : 1;
  const startFromWeek = lastGeneratedWeek + 1;

  // Pré-remplir allGeneratedWeeks avec les semaines déjà générées (au-delà de la semaine 1)
  // pour que le merge final + le previousWeeksSummary fonctionnent correctement.
  const allGeneratedWeeks: any[] = (plan.weeks || []).filter((w: any) => (w.weekNumber || 0) > 1);

  if (startFromWeek > totalWeeks) {
    console.log(`[Gemini Remaining] Toutes les ${totalWeeks} semaines déjà générées. Plan marqué comme complet.`);
    return {
      ...plan,
      weeks: (plan.weeks || []).slice().sort((a: any, b: any) => (a.weekNumber || 0) - (b.weekNumber || 0)),
      isPreview: false,
      fullPlanGenerated: true,
    } as TrainingPlan;
  }

  console.log(`[Gemini Remaining] Reprise: semaines 1-${lastGeneratedWeek} déjà OK, génération à partir de S${startFromWeek}`);

  // Calculer les lots de semaines à générer
  const weeksToGenerate: number[] = [];
  for (let w = startFromWeek; w <= totalWeeks; w++) {
    weeksToGenerate.push(w);
  }

  // Diviser en lots
  const batches: number[][] = [];
  for (let i = 0; i < weeksToGenerate.length; i += BATCH_SIZE) {
    batches.push(weeksToGenerate.slice(i, i + BATCH_SIZE));
  }

  console.log(`[Gemini Remaining] ${weeksToGenerate.length} semaines à générer en ${batches.length} lots`);

  try {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const MODEL_ID = "gemini-3-flash-preview";
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    console.log(`[Gemini RemainingWeeks] model=${MODEL_ID}`);

    // Générer chaque lot séquentiellement
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const startWeek = batch[0];
      const endWeek = batch[batch.length - 1];

      console.log(`[Gemini Remaining] Lot ${batchIndex + 1}/${batches.length}: semaines ${startWeek} à ${endWeek}...`);

      // Résumé des semaines déjà générées pour contexte
      const previousWeeksSummary = allGeneratedWeeks.length > 0
        ? `\n\nSEMAINES DÉJÀ GÉNÉRÉES (résumé des ${allGeneratedWeeks.length} dernières) :\n` +
          allGeneratedWeeks.slice(-2).map(w =>
            `Semaine ${w.weekNumber}: ${w.theme} - ${w.sessions.map((s: any) => s.title).join(', ')}`
          ).join('\n')
        : '';

      // === CALCUL MIN SL DURATION POUR INSTRUCTION PROMPT (lots remaining) ===
      const batchObjForSL = detectObjectiveFromData(data);
      const batchLevelForSL = detectLevelFromData(data);
      const batchMinSlDurForPrompt = (MIN_SL_DURATION_MIN[batchObjForSL] || {})[batchLevelForSL] || 45;

      // === PROMPT POUR CE LOT ===
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
${batch.map(weekNum => {
  const phaseIdx = weekNum - 1;
  return `Semaine ${weekNum}: ${ctx.periodizationPlan.weeklyPhases[phaseIdx]} - Volume ${ctx.periodizationPlan.weeklyVolumes[phaseIdx]}km${ctx.periodizationPlan.recoveryWeeks.includes(weekNum) ? ' (RÉCUP)' : ''}`;
}).join('\n')}

═══════════════════════════════════════════════════════════════
              PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════
- Niveau : ${getEffectiveLevel(data)}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Fréquence : ${data.frequency} séances/semaine
- Jours : ${preferredDaysInstruction}
- Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}
${data.injuries?.hasInjury ? `⚠️ BLESSURE : ${data.injuries.description}` : ''}
${data.comments?.trim() ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}"` : ''}
${beginnerProgressionInstruction}
${trailSectionRemaining}
${hyroxSectionRemaining}
💪 RENFORCEMENT : 1 séance "Renforcement" par semaine OBLIGATOIRE.
NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance au bon jour.

🔴 TYPES DE SÉANCES AUTORISÉS PAR PHASE :
${(isVKRemaining || isTrailSteepRemaining) ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, Côtes en EF (montée marchée ou trottée). Le travail en côte modéré EST autorisé dès cette phase pour VK/Trail raide.` :
`   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement.
     ${(!isBeginnerLevel && !needsMarcheCourseRemaining && data.frequency >= 4 && data.fitnessSubGoal !== 'Reprendre après une pause' && data.lastActivity !== 'Plus de 6 mois') ?
     `À partir de la SEMAINE 3 du fondamental, 1 séance/semaine DOIT inclure du travail de vitesse léger :
       • Fartlek libre (5-6 accélérations de 30s à allure 10km, récup 1min30 trottée) — type "Fractionné", intensité "Modéré"
       • OU Côtes courtes (6-8 × 20s en côte, récup descente trottée)
       Les semaines 1-2 restent 100% EF.` :
     `PAS de seuil, PAS de fractionné, PAS de VMA.`}
     VARIÉTÉ OBLIGATOIRE : chaque footing doit avoir un thème DIFFÉRENT (progressif, vallonné, technique, nature...).
   - developpement : + Fractionné (VMA courte, côtes), seuil court possible.
   - specifique : + Seuil long, allure spécifique course, fractionné seuil.
   - affutage : Jogging court à modéré, Renforcement allégé + 1 rappel fractionné court (200-400m). PAS de Sortie Longue volumineuse (la course remplace la SL la semaine du raceDate).
   - recuperation : Jogging (footing EF) uniquement + Renforcement léger. PAS d'intensité.`}

${data.raceDate ? RACE_DAY_INSTRUCTION : ''}

${MAINSET_COHERENCE_RULES}

${buildDisciplineBlock(data.subGoal, data, paces)}

${isPertePoidsProg ? (() => {
  const pdpVmaR = ctxVma || 12;
  const pdpIsLowVMAR = pdpVmaR < 12;
  const pdpBmiR = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : 0;
  const pdpIsOverweightR = pdpBmiR >= 30;
  const pdpMaxSLminR = pdpIsLowVMAR ? 60 : 65;
  const pdpNeedsMCR = pdpVmaR < 10.5 || pdpIsOverweightR;
  return `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES (OBLIGATOIRE) :
Ce plan est un plan PERTE DE POIDS, PAS une préparation course.
${pdpIsLowVMAR ? `⚠️ VMA ${pdpVmaR.toFixed(1)} < 12 → TRAITER COMME DÉBUTANT+. Volume et intensité réduits.` : ''}
${pdpIsOverweightR ? `⚠️ IMC ${pdpBmiR.toFixed(1)} ≥ 30 → SURPOIDS : max 2 séances course/sem + alternance marche/course obligatoire.` : ''}

INTERDICTIONS : JAMAIS d'allure spé course, JAMAIS de phase spécifique/affûtage, JAMAIS de VMA/fractionné intense en fondamental, JAMAIS "allure spé" dans les mainSet.
${pdpIsOverweightR ? `JAMAIS de fractionné, fartlek, côtes, ni haute intensité (IMC ${pdpBmiR.toFixed(1)} ≥ 30 → risque articulaire). Uniquement Jogging EF, SL EF, Renforcement, Marche/Course.` : ''}

SÉANCES PAR PHASE :
- FONDAMENTALE : ${pdpNeedsMCR ? 'Marche/Course puis Jogging EF' : 'Jogging EF'} + Renfo + SL EF. ZÉRO intensité.
  ${!pdpIsOverweightR ? '• Varier les formats : footing nature, footing urbain, marche rapide active avec dénivelé léger.' : '• Varier : footing sol souple, marche rapide active (brûler sans impact).'}
- DÉVELOPPEMENT : Jogging EF + Renfo + SL EF + fartlek DOUX (30s-1min accélérations, max 15-20% de la séance). Max 1 séance intensité légère/semaine.
  ${!pdpIsOverweightR ? `• DIVERSIFIER (OBLIGATOIRE — jamais 2 séances identiques dans la semaine) :
    - Fartlek nature : accélérations libres 30s-1min30 au feeling, récup en trottinant
    - Côtes douces : 4-6 montées 30-45s effort modéré (6-7/10), redescente en marchant
    - Circuit cardio-renfo : alternance 4-5 min course EF + 3-4 exos renfo × 3-4 tours
    - Footing progressif : départ très lent → finir 5 dernières min en endurance active
    - Footing technique : focus cadence élevée, foulée courte, posture droite` : `• Diversifier SANS impact :
    - Footing progressif : départ lent → finir légèrement plus vite les 5 dernières min
    - Marche rapide en côte : excellent ratio calories / impact articulaire
    - Circuit renfo allongé : marche rapide 3 min + exos bas du corps × 4-5 tours`}
- RÉCUPÉRATION : Jogging léger + Renfo allégé. Volume -30%.

STRUCTURE 3+1 : 3 semaines charge → 1 semaine récup (-30%).

PROGRESSION VOLUME TOTAL HEBDO :
- Semaines début : ${pdpIsLowVMAR ? '1h00-1h20' : '1h20-1h40'}/sem (hors renfo)
- Semaines milieu : ${pdpIsLowVMAR ? '1h20-1h45' : '1h40-2h00'}/sem
- Semaines fin : ${pdpIsLowVMAR ? '1h40-2h00' : '2h00-2h20'}/sem
- Max +10-15%/semaine. Les FOOTINGS progressent aussi (25-30 min → 35-45 min).

PROGRESSION SL : 30-35 min → 40-50 min → 50-${pdpMaxSLminR} min. Récup : SL -30%. JAMAIS identique 2 semaines de suite.

RENFORCEMENT : 20-30 min, poids de corps (squats, fentes, gainage, pompes adaptées). PAS de pliométrie lourde. Progression par reps (3x12 → 3x15 → 3x18).

EFFORT PERÇU dans chaque mainSet : Jogging/SL = "effort 4/10, conversation facile" | Fartlek = "effort 6-7/10 sur accélérations" | Récup = "effort 3/10".

COHÉRENCE DURÉE/DISTANCE/MAINSET : "duration" = TEMPS TOTAL (warmup + mainSet + cooldown). Distance = duration ÷ allure EF (couvre toute la séance). Le préfixe "X min" du mainSet décrit le bloc principal seul, donc < duration. JAMAIS mainSet > duration totale.

NOMMAGE : "Jogging", "Sortie Longue", "Renforcement"${!pdpIsOverweightR ? ', "Fractionné"' : ''}${pdpNeedsMCR ? ', "Marche/Course"' : ''}. ${!pdpIsOverweightR ? 'Le type "Fractionné" inclut fartlek doux, côtes douces, circuit cardio-renfo (uniquement en phase développement).' : ''}

PRIORITÉ : sécurité > régularité > progression > plaisir > dépense calorique.`;
})() : ''}

${isFinisherTarget(data.targetTime) && !data.goal?.includes('Perte') && !data.goal?.includes('Maintien') && !data.goal?.includes('Remise') ? `🔴 PLAN FINISHER — RÈGLES SPÉCIFIQUES :
L'objectif est de TERMINER la course, pas de performer. Adapte la philosophie du plan :
- Priorité ABSOLUE : endurance fondamentale (EF), régularité, résistance à la fatigue
- MOINS d'intensité que pour un plan chrono : pas de fractionné VMA avant la phase développement, seuil limité
- Séances plus longues en durée mais à allure CONFORTABLE (EF / allure marathon+)
- Sortie Longue = séance clé du plan, toujours en EF, objectif = habituer le corps à la durée
- Fractionné limité à 1x/semaine max en phase développement/spécifique, orienté seuil plutôt que VMA
- PAS d'objectif de temps dans les mainSet. Pas d'allure spécifique course.` : ''}

${buildSafetyInstructions(data, (data.level || '').includes('Débutant'))}
${data.city ? `
📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Ville : ${data.city}. Chaque séance DOIT avoir un "locationSuggestion" RÉEL et COHÉRENT avec le contenu :
- Fractionné VMA/vitesse → PISTE D'ATHLÉTISME (surface plane, distances balisées)
- Fractionné seuil/tempo → chemin plat, berges, voie verte
- Séance avec D+ (elevationGain > 0) → colline, forêt pentue, sentier avec VRAI dénivelé
- Sortie Longue route → grand parc, boucle longue, berges
- Sortie Longue Trail → forêt/montagne avec sentiers
- Footing/Récup → parc agréable, sol souple
- Renforcement → "À la maison"
⚠️ Si elevationGain > 0, le lieu DOIT avoir du dénivelé réel. Varier les lieux entre semaines.
` : ''}
═══════════════════════════════════════════════════════════════
              FORMAT JSON STRICT
═══════════════════════════════════════════════════════════════
Retourne UNIQUEMENT un tableau JSON des semaines ${startWeek} à ${endWeek} :

[
  {
    "weekNumber": ${startWeek},
    "theme": "Thème de la semaine",
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
        "elevationGain": 600,
        "locationSuggestion": "Lieu réel adapté",
        "warmup": "échauffement",
        "mainSet": "corps avec allures EXACTES",
        "cooldown": "retour au calme",
        "advice": "conseil"
      }
    ]
  }${batch.length > 1 ? `, ...jusqu'à semaine ${endWeek}` : ''}
]

⚠️ GÉNÈRE EXACTEMENT ${batch.length} semaine(s) : ${batch.join(', ')}
🔴 CHAQUE semaine doit avoir ${data.frequency} séances.
🔴 Jours : ${data.preferredDays?.length ? data.preferredDays.join(', ') + ' — CES JOURS UNIQUEMENT.' : 'Répartition équilibrée.'}
🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume hebdo. Durée minimum SL : ${batchMinSlDurForPrompt} min.
`;

      // Appel API avec retry (3 tentatives, backoff exponentiel pour 429)
      let batchWeeks: any[] = [];
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount <= maxRetries) {
        try {
          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: batchPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 65536
            }
          });

          const response = await result.response;
          const text = response.text();

          batchWeeks = JSON.parse(text);

          // Vérifier que toutes les semaines attendues sont présentes
          const generatedWeekNumbers = new Set(batchWeeks.map((w: any) => w.weekNumber));
          const missingWeeks = batch.filter(w => !generatedWeekNumbers.has(w));

          if (missingWeeks.length > 0) {
            console.warn(`[Gemini Remaining] Semaines manquantes: ${missingWeeks.join(', ')}, retry...`);
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error(`Semaines manquantes après ${maxRetries} tentatives: ${missingWeeks.join(', ')}`);
            }
            continue;
          }

          break; // Succès, sortir de la boucle de retry

        } catch (parseError: any) {
          const is429 = parseError.message?.includes('429') || parseError.message?.includes('Resource exhausted');
          const backoff = is429 ? 5000 * (retryCount + 1) : 1000;
          console.error(`[Gemini Remaining] Erreur lot ${batchIndex + 1}, tentative ${retryCount + 1}${is429 ? ' (429 rate limit)' : ''}:`, parseError.message);
          retryCount++;
          if (retryCount > maxRetries) {
            throw new Error(`Échec de génération après ${maxRetries} tentatives: ${parseError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }

      // Pause entre les lots pour éviter les 429 rate limits
      if (batchIndex < batches.length - 1) {
        const pauseMs = 4000;
        console.log(`[Gemini Remaining] Pause ${pauseMs/1000}s avant le lot suivant...`);
        await new Promise(resolve => setTimeout(resolve, pauseMs));
      }

      // Valider et corriger les semaines générées (jours, fréquence)
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

          // Forcer la Sortie Longue sur le jour préféré (détection élargie : type | titre)
          enforceSLDay(week, data.preferredLongRunDay || 'Dimanche', '[Gemini Remaining] ');

          // Dédupliquer les jours — fallback sur DAYS_ORDER complet si pool épuisé
          const usedDays = new Set<string>();
          week.sessions.forEach((session: any, idx: number) => {
            if (usedDays.has(session.day)) {
              const pool = preferredDaysRemaining || DAYS_ORDER;
              let available = pool.filter((d: string) => !usedDays.has(d));
              if (available.length === 0) {
                available = DAYS_ORDER.filter((d: string) => !usedDays.has(d));
              }
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

          week.sessions.sort((a: any, b: any) =>
            DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
          );
        }
      });

      // Injection renfo immédiate sur ce lot (avant affichage progressif)
      batchWeeks.forEach((week: any) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        week.sessions.forEach((session: any) => {
          if (session.type === 'Renforcement') {
            const renfo = buildRenfoMainSet({
              weekNumber: week.weekNumber,
              goal: data.goal || '',
              subGoal: data.subGoal,
              trailDistance: data.goal === 'Trail' ? data.trailDetails?.distance : undefined,
              level: getEffectiveLevel(data),
              phase: week.phase || 'fondamental',
              weight: data.weight,
              height: data.height,
              age: data.age,
              injuries: data.injuries,
            });
            session.mainSet = renfo.mainSet;
            session.warmup = renfo.warmup;
            session.cooldown = renfo.cooldown;
            session.duration = renfo.duration;
            session.title = renfo.title;
          }
        });
      });

      // Injection des variantes de footing sur ce lot — phases fondamentale/récupération
      const remainingFootingFlags = detectFootingFlags({
        weight: data.weight, height: data.height, age: data.age,
        level: getEffectiveLevel(data), injuries: data.injuries,
      });
      batchWeeks.forEach((week: any) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        const phaseLc = (week.phase || 'fondamental').toLowerCase();
        if (phaseLc !== 'fondamental' && phaseLc !== 'recuperation') return;
        week.sessions.forEach((session: any, idx: number) => {
          if (session.type === 'Jogging' && (session.intensity === 'Facile' || !session.intensity)) {
            const variant = buildFootingVariant({
              weekNumber: week.weekNumber,
              sessionIndex: idx,
              goal: data.goal || '',
              durationStr: session.duration || '45 min',
              efPace: (plan as any).paces?.efPace || session.targetPace || '',
              flags: remainingFootingFlags,
              sessionElevation: session.elevationGain,
              sessionTitle: session.title,
              seed: plan.id || '',
            });
            session.title = variant.title;
            session.warmup = variant.warmup;
            session.mainSet = variant.mainSet;
            session.cooldown = variant.cooldown;
            session.advice = variant.advice;
          }
        });
      });

      // Ajouter au résultat global
      allGeneratedWeeks.push(...batchWeeks);
      console.log(`[Gemini Remaining] Lot ${batchIndex + 1} terminé: ${batchWeeks.length} semaines`);

      // Callback de progression : montrer les semaines au fur et à mesure
      // ATTENTION : on AWAIT pour éviter race condition entre sauvegardes par batch.
      if (onProgress) {
        const partialWeeks = [plan.weeks[0], ...allGeneratedWeeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
        await onProgress(
          { ...plan, weeks: partialWeeks } as TrainingPlan,
          batchIndex + 1,
          batches.length,
        );
      }
    }

    // Trier les semaines par numéro pour être sûr
    allGeneratedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

    // === Enforcement D+ trail (post-processing déterministe) ===
    if (isTrailRemaining && data.trailDetails) {
      const detectedLvl = detectLevelFromData(data);
      allGeneratedWeeks.forEach((week: any) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        const weekTarget = calculateWeekTargetElevation(
          week.weekNumber, totalWeeks, data.trailDetails!.elevation,
          detectedLvl, data.currentWeeklyElevation, week.phase,
        );
        distributeElevationToSessions(week.sessions, weekTarget, detectedLvl);
        console.log(`[Trail D+] S${week.weekNumber} [${week.phase || '?'}]: D+ cible = ${weekTarget}m [${detectedLvl}]`);
      });
      // R3 — log post-génération : compare D+ réel séances vs cible (monitoring)
      logDplusActualVsTarget({ weeks: allGeneratedWeeks }, ctx.periodizationPlan.weeklyElevationTarget);
    }

    // === Strip D+ des plans NON-trail (Gemini en génère parfois spontanément) ===
    if (!isTrailRemaining) {
      allGeneratedWeeks.forEach((week: any) => {
        if (!week.sessions) return;
        week.sessions.forEach((s: any) => {
          if ((s.elevationGain || 0) > 0) s.elevationGain = 0;
        });
      });
    }

    // Fusionner avec semaine 1
    let fullPlan: TrainingPlan = {
      ...plan,
      weeks: [plan.weeks[0], ...allGeneratedWeeks],
      isPreview: false,
      fullPlanGenerated: true,
    };

    // === Post-processing qualité séances (Remaining) ===
    const savedPaces = plan.generationContext?.paces;
    // ═══════════════════════════════════════════════════════════════
    //  GUARD SUPER PUISSANT — Pipeline post-Gemini complet
    // ═══════════════════════════════════════════════════════════════
    const guardStats = {
      slDurationCapped: 0,
      sessionKmCapped: 0,
      dplusRedistributed: 0,
      hardSessionsDowngraded: 0,
      volumeScaledDown: 0,
      volumeScaledUp: 0,
      affutageCorrected: 0,
      progressionSmoothed: 0,
      postValidatorFixes: 0,
    };

    // Helper to count volume of a week
    const _weekKm = (week: any): number =>
      (week.sessions || []).reduce((sum: number, s: any) => {
        if (s.type === 'Renforcement' || s.type === 'Repos') return sum;
        const km = parseKm(s.distance);
        return sum + (km > 0 ? km : 0);
      }, 0);

    if (fullPlan.weeks && Array.isArray(fullPlan.weeks) && savedPaces) {
      const trailDistFull = data.goal === 'Trail' && data.trailDetails?.distance ? data.trailDetails.distance : 0;
      fullPlan.weeks.forEach((week: any) => postProcessWeekQuality(week, savedPaces, undefined, data.goal, trailDistFull));

      // Snapshot volumes AVANT guard pour mesurer l'impact
      const beforeVolumes = fullPlan.weeks.map(_weekKm);

      // Pass 1 : Enforcement par semaine
      fullPlan.weeks.forEach((week: any, idx: number) => {
        const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data, ctx.periodizationPlan.weeklyVolumes, idx);
      });

      // Routing label Marche/Course (audit Lilian 2026-05-21)
      fullPlan.weeks.forEach((week: any) => applyMarcheCourseRouting(week));

      // Pass 2 : Guard cross-semaines
      enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);

      // Sprint Marathon 2026-05-19 — race-day injection (plan complet).
      // CRITIQUE : sur tous les plans avec raceDate (Marathon, Semi, 10K, 5K, Trail,
      // Hyrox), on force la dernière séance du raceDate à être la course officielle.
      // Bug avant fix : LLM mettait souvent SL EF redondante le jour J (Thomas Weill).
      const fullInjectedIdx = injectRaceSession(fullPlan, data, savedPaces);
      if (fullInjectedIdx >= 0) {
        console.log(`[Race-Day Full] Course officielle injectée S${fullInjectedIdx + 1}`);
        // Resync weeklyVolumes pour la semaine concernée (la course est inclus dans
        // la somme, donc weeklyVolumes[idx] reflète maintenant la distance officielle).
        const w = fullPlan.weeks[fullInjectedIdx];
        if (w && Array.isArray(w.sessions) && ctx.periodizationPlan.weeklyVolumes) {
          const sumKm = w.sessions
            .filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos')
            .reduce((sum: number, s: any) => sum + (parseKm(s.distance) || 0), 0);
          ctx.periodizationPlan.weeklyVolumes[fullInjectedIdx] = Math.round(sumKm);
        }
      }

      // Compter les corrections
      const afterVolumes = fullPlan.weeks.map(_weekKm);
      beforeVolumes.forEach((bv, i) => {
        const diff = afterVolumes[i] - bv;
        if (diff < -0.5) guardStats.volumeScaledDown++;
        else if (diff > 0.5) guardStats.volumeScaledUp++;
      });
    }

    // ─── Validation & Auto-correction (3 layers) ───
    try {
      const { validateAndCorrectPlan } = await import('./planValidator');
      const { plan: validatedPlan, validation, aiReview } = await validateAndCorrectPlan(
        fullPlan,
        data,
        (status) => console.log(`[PlanValidator] ${status}`),
      );
      fullPlan = validatedPlan;

      // P0 CRITIQUE : Re-appliquer le guard APRÈS Layer 3
      // Car Layer 3 re-génère des semaines via Gemini qui peuvent ignorer les caps
      if (fullPlan.weeks && Array.isArray(fullPlan.weeks)) {
        const preL3Volumes = fullPlan.weeks.map(_weekKm);
        const slDayFinal = data.preferredLongRunDay || 'Dimanche';
        fullPlan.weeks.forEach((week: any, idx: number) => {
          const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
          enforceWeekConstraints(week, targetVol, data, ctx.periodizationPlan.weeklyVolumes, idx);
          // Re-forcer jour SL APRÈS enforce (Layer 3 peut avoir régénéré la semaine avec mauvais jour)
          // enforceSLDay skip automatiquement les semaines contenant un _raceDay.
          enforceSLDay(week, slDayFinal, '[Post-Layer3] ');
          // Routing label Marche/Course (audit Lilian 2026-05-21) — re-check post-Layer3
          applyMarcheCourseRouting(week);
        });
        enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);

        // Sprint Marathon 2026-05-19 — race-day re-injection post-Layer3 (résilience).
        // Layer3 peut régénérer la semaine course → on doit re-forcer la séance course.
        const reInjectedIdx = injectRaceSession(fullPlan, data, savedPaces);
        if (reInjectedIdx >= 0) {
          console.log(`[Race-Day Post-L3] Course officielle re-forcée S${reInjectedIdx + 1}`);
        }

        const postL3Volumes = fullPlan.weeks.map(_weekKm);
        preL3Volumes.forEach((bv, i) => {
          if (Math.abs(bv - postL3Volumes[i]) > 0.5) guardStats.postValidatorFixes++;
        });
      }

      if (aiReview) {
        console.log(`[PlanValidator] AI score: ${aiReview.overallScore}/100`);
      }
      console.log(`[PlanValidator] Final: score=${validation.score}/100, issues=${validation.issues.length}`);
    } catch (validationError) {
      console.warn('[PlanValidator] Validation failed, using plan as-is:', validationError);
    }

    // ─── Log structuré Guard ───
    const totalGuardFixes = Object.values(guardStats).reduce((a, b) => a + b, 0);
    console.log(`[Guard] ═══ Résumé Guard ═══`);
    console.log(`[Guard] Volume ↓: ${guardStats.volumeScaledDown} sem | Volume ↑: ${guardStats.volumeScaledUp} sem`);
    console.log(`[Guard] Post-Layer3 re-fixes: ${guardStats.postValidatorFixes} sem`);
    console.log(`[Guard] Total corrections appliquées: ${totalGuardFixes}`);
    if (totalGuardFixes === 0) {
      console.log(`[Guard] ✅ Gemini a respecté toutes les contraintes — aucune correction nécessaire`);
    }

    // Recalculer endDate sur le plan complet (startDate + nombre réel de semaines)
    if (fullPlan.startDate && fullPlan.weeks?.length) {
      const sd = new Date(fullPlan.startDate);
      sd.setDate(sd.getDate() + fullPlan.weeks.length * 7);
      fullPlan.endDate = sd.toISOString().split('T')[0];
      console.log(`[Gemini Remaining] endDate recalculée: ${fullPlan.endDate} (${fullPlan.weeks.length} semaines)`);
    }

    // Stocker les stats sur le plan pour monitoring
    (fullPlan as any).guardStats = guardStats;

    // ─── Correction français : supprimée Sprint 4 (correctFrenchWithAI) ───
    // Cf justification site #1 (generatePreviewPlan). forceTutoiement déjà appliqué
    // dans postProcessWeekQuality sur chaque session générée.

    // Nettoyer les markers internes avant retour
    fullPlan.weeks?.forEach((w: any) => w.sessions?.forEach((s: any) => delete s._dedupedFromSL));

    const elapsed = Date.now() - startTime;
    console.log(`[Gemini Remaining] ${allGeneratedWeeks.length} semaines générées en ${elapsed}ms (${batches.length} lots)`);

    return fullPlan;

  } catch (error) {
    console.error('[Gemini Remaining] Erreur:', error);
    throw error;
  }
};

// --- ADAPTATION DU PLAN APRÈS FEEDBACK ---
const ADAPTATION_SYSTEM_INSTRUCTION = `
Tu es un Coach Running Expert diplômé avec 15 ans d'expérience.
Un coureur de ton groupe te donne son feedback. Tu réagis comme un VRAI coach qui connaît
personnellement ce coureur, son objectif, son niveau, ses contraintes et son historique.

═══════════════════════════════════════════════════════════════
              ALLURES CALCULÉES (RÉFÉRENCE)
═══════════════════════════════════════════════════════════════

{CALCULATED_PACES}

Les allures sont calculées mathématiquement depuis la VMA ({VMA_VALUE} km/h).
- Pour alléger : réduis le VOLUME (durée, répétitions), PAS les allures de base
- Exception : ralentir de 5-15 sec/km TEMPORAIREMENT si RPE ≥ 9

═══════════════════════════════════════════════════════════════
              PHILOSOPHIE PAR TYPE D'OBJECTIF
═══════════════════════════════════════════════════════════════

{OBJECTIVE_PHILOSOPHY}

═══════════════════════════════════════════════════════════════
              INTERPRÉTATION DU FEEDBACK
═══════════════════════════════════════════════════════════════

1. CROSS-CHECK RPE × COMMENTAIRE TEXTUEL :
   Le RPE chiffré peut être incohérent avec le commentaire. Exemples :
   - RPE 6 + "j'ai cru mourir" → le vrai RPE est 8-9, le coureur sous-estime
   - RPE 8 + "c'était bien, juste un peu dur à la fin" → le vrai RPE est 6-7
   - RPE 5 + "jambes lourdes, essoufflée" → RPE réel 7, possible fatigue accumulée
   → TOUJOURS prioriser le TEXTE sur le CHIFFRE. Les débutants sous-évaluent souvent.
   → Si incohérence, mentionne-le dans le coachNote : "Tu as mis RPE X, mais ton ressenti
     décrit plutôt un effort de Y — j'ajuste en conséquence."

   → Si le commentaire est VIDE : se fier uniquement au RPE chiffré + données Strava si disponibles.
     Ne pas inventer ou supposer des problèmes. Un commentaire vide + RPE 5-6 = tout va bien.
     Encourager le coureur à laisser un commentaire la prochaine fois.

2. MOTS-CLÉS D'ALERTE (dans le commentaire) :
   - Blessure/douleur : "genou", "tendon", "cheville", "douleur", "mal à", "blessé", "pied", "hanche", "tibia", "périoste"
     → PRIORITÉ ABSOLUE. Distinguer :
       a) Douleur PENDANT la séance (coureur a continué avec douleur) :
          Mettre en repos complet (PAS de course) sur 2-3 séances. Maintenir la condition aérobie par de la marche 30 min/jour si totalement indolore (cadence libre, terrain plat).
          Renforcement excentrique + mobilité ciblée jusqu'à reprise sans douleur.
          Test de reprise : "10 min marche + 5 min trot léger, arrêt immédiat si réapparition de la douleur."
          Conseiller FORTEMENT de consulter un médecin/kiné si la douleur persiste >48h ou si elle est articulaire/tendineuse.
       b) Douleur APRÈS la séance (courbatures, raideur) :
          Alléger de 20-30% la prochaine séance similaire. Rappeler étirements et auto-massage.
       c) Douleur récurrente (mentionnée dans plusieurs feedbacks) :
          ALERTE ROUGE. Réduire de 50%, supprimer tout impact, proposer un break de 5-7 jours.
     → Si le coureur est DÉBUTANT : ne JAMAIS minimiser une douleur. Les débutants ne savent pas
       distinguer inconfort musculaire normal et blessure naissante. Toujours pencher vers la prudence.
   - Fatigue chronique : "épuisé", "cramé", "pas récupéré", "sommeil mauvais", "stress"
     → Ajouter 1 jour repos, alléger 20-30% sur 2-3 séances, vérifier surentraînement
   - Mental : "démotivé", "ennui", "lassitude", "marre"
     → Varier les formats, proposer du fartlek nature, allonger la récup entre fractions
   - Trop facile : "facile", "pas assez", "envie d'en faire plus", "sous-estimé"
     → Attention à ne pas sur-ajuster. Max +10% volume, pas de saut brutal.

3. TENDANCE RPE (historique) :
   - Si 3+ séances consécutives RPE ≥ 7 → fatigue accumulée, alléger même si la dernière est RPE 6
   - Si RPE en hausse constante (5→6→7→8) → surcharge progressive, intervenir avant RPE 9
   - Si alternance RPE bas/haut → normal, pas d'action sauf si les hauts dépassent 8
   - Si RPE en baisse constante sur 5+ séances (ex: 8→7→6→5→4) → PROGRESSION.
     Le plan fonctionne, le coureur s'adapte. Célébrer dans le coachNote.
     Envisager une progression modérée (+5-10%) pour maintenir le stimulus d'entraînement.
     NE PAS confondre avec une sous-charge — c'est de l'adaptation physiologique.

4. PREMIER FEEDBACK (pas d'historique) :
   - Accueillir chaleureusement : "Merci pour ce premier retour ! C'est ce qui me permet de personnaliser ton plan."
   - Être CONSERVATEUR dans les modifications. Pas de changement majeur sur un seul data point.
   - Maximum 1 séance modifiée. Attendre 2-3 feedbacks pour identifier une vraie tendance.
   - Rappeler au coureur comment utiliser le RPE si utile.

5. SÉANCES MANQUÉES :
   Si le coureur n'a complété que X séances sur Y cette semaine :
   - 1 séance manquée : pas grave, ne pas surcharger pour "rattraper"
   - 2+ séances manquées : réduire légèrement la semaine suivante, le coureur n'est pas prêt
     pour le volume prévu
   - IDENTIFIER les séances manquées :
     → Si séance CLÉ manquée (SL, seuil, VMA) : reporter un stimulus similaire (réduit de 15%)
       dans la semaine suivante. Ne PAS laisser 2 semaines sans séance qualité.
     → Si séances faciles manquées (EF, récup) : le volume aérobie manque, mais la qualité
       peut continuer. Ajouter 5-10min aux prochains footings.
   - JAMAIS "rattraper" des séances manquées en surchargeant
   - JAMAIS culpabiliser. "La vie a ses imprévus, on adapte."

═══════════════════════════════════════════════════════════════
              ADAPTATION PAR NIVEAU
═══════════════════════════════════════════════════════════════

{LEVEL_RULES}

═══════════════════════════════════════════════════════════════
              CONTEXTE DE PÉRIODISATION (CRITIQUE)
═══════════════════════════════════════════════════════════════

{PERIODIZATION_CONTEXT}

RÈGLES DE PÉRIODISATION :
- En semaine de RÉCUPÉRATION : un RPE bas (1-4) est NORMAL et VOULU. Ne JAMAIS augmenter.
  → "C'est exactement ce qu'on cherche sur une semaine de décharge. Ton corps récupère."
- En phase FONDAMENTALE : le RPE doit rester 4-6. Si RPE > 7, le coureur va trop vite.
- En phase DÉVELOPPEMENT : RPE 6-8 est normal sur les séances qualité. Ne PAS alléger à RPE 7.
- En phase SPÉCIFIQUE : RPE 7-8 est attendu et normal. Ne pas alléger sauf si RPE 9-10.
- En phase AFFÛTAGE :
  → Volume réduit, intensité maintenue. RPE 5-7 sur séances qualité longues.
  → EXCEPTION 5km/10km : RPE 7-8 sur séances courtes/rapides est NORMAL et SOUHAITÉ.
  → EXCEPTION trail : RPE 6-7 suffisant. L'affûtage trail = repos musculaire avant tout.
  → Si RPE ≥ 9 en affûtage : TOUJOURS alléger. L'affûtage ne doit jamais épuiser.
  → Le coureur a souvent peur de "perdre sa forme" à cause du volume réduit. TOUJOURS rassurer :
    "La fatigue des semaines précédentes se dissipe — tu ne perds pas ta forme, tu la révèles.
    Le jour J, tu te sentiras beaucoup plus frais que maintenant."
  → Ne JAMAIS dire que le coureur "perd de la forme" ou que l'entraînement est "insuffisant".
  → Si le coureur demande à en faire plus : refuser fermement.
    "C'est frustrant de moins courir, mais c'est EXACTEMENT ce dont ton corps a besoin."
- TOUJOURS interpréter le RPE dans le contexte de la phase ET du type de semaine (récup ou non).
- Si le volume cible de la semaine est plus bas que les semaines précédentes → c'est une décharge,
  ne pas compenser ou augmenter même si le coureur trouve ça facile.

Si aucune périodisation n'est disponible, utiliser les SEMAINES RESTANTES comme guide :
  → > 8 semaines restantes : phase fondamentale probable (RPE idéal 4-6)
  → 4-8 semaines restantes : phase développement probable (RPE idéal 5-7 qualité, 4-5 EF)
  → 2-4 semaines restantes : phase spécifique probable (RPE idéal 6-8 qualité)
  → < 2 semaines restantes : affûtage probable (volume réduit, RPE 5-7)
  Appliquer une récupération implicite toutes les 3-4 semaines.

═══════════════════════════════════════════════════════════════
              INTERPRÉTATION DONNÉES STRAVA (si disponibles)
═══════════════════════════════════════════════════════════════

Si des données Strava réelles sont fournies dans le feedback :
1. COMPARER prévu vs réalisé :
   - Distance réelle >> prévue (+30%) : le coureur en fait trop OU le plan sous-estime.
     → Si RPE bas : le coureur est en forme, pas d'inquiétude SAUF si récurrent.
     → Si RPE élevé : il en fait trop, rappeler de respecter les distances prévues.
     → Si récurrent (surcharge systématique) : insister fermement. Le surentraînement vient souvent de là.
   - Distance réelle << prévue (-30%) : séance écourtée, potentielle fatigue.
   - Allure réelle plus rapide que cible :
     → Sur séance EF/récup : PROBLÈME FRÉQUENT. Le coureur court ses footings trop vite.
       Rappeler fermement que l'EF est une allure de conversation. "Courir lent pour progresser vite."
     → Sur séance qualité : vérifier que le RPE correspond. Si RPE bas + allure rapide = bonne forme.
   - Allure réelle plus lente que cible :
     → Sur séance EF/récup : pas d'inquiétude, c'est même bien.
     → Sur séance QUALITÉ en terrain PLAT :
       Si écart > 15 sec/km ET RPE élevé : les allures cibles sont possiblement trop ambitieuses.
       Si RPE bas + allure lente : le coureur n'a pas assez poussé → encourager.
     → En trail/D+ : ralentissement attendu, NORMAL. Ne pas comparer avec allures route.
2. CROSS-CHECK durée × distance :
   - Durée >> prévue ET Distance >> prévue : le coureur a fait PLUS que prévu (volume en trop).
   - Durée >> prévue MAIS Distance ≈ prévue : le coureur était plus LENT (fatigue ? terrain ?).
   - Durée ≈ prévue MAIS Distance >> prévue : le coureur court trop VITE → risque en EF.
3. La FC moyenne aide à valider le RPE :
   - FC élevée (>85% FCmax estimée) + RPE bas :
     → Si DÉBUTANT : fréquent, le coureur ne perçoit pas l'effort cardiaque.
       Ajuster comme si RPE réel était 2 points plus haut. Rappeler la règle de la conversation.
     → Si CONFIRMÉ/EXPERT : inhabituel. Vérifier : chaleur ? déshydratation ? maladie couvante ?
       Ne pas sur-réagir, mais mentionner : "Ta FC était haute pour ton ressenti. Vérifie ton hydratation."
     → Si RÉCURRENT sur 2+ séances : recommander un jour de repos et surveillance.
   - FC basse + RPE élevé → fatigue musculaire ou mentale, pas cardiovasculaire.
     Le système musculaire est le facteur limitant. Vérifier le renforcement et la récupération.
     En trail : classique après descentes longues (fatigue excentrique, peu de charge cardiaque).
4. Le D+ réel vs prévu est crucial en trail :
   - D+ réel >> prévu (+40%) : explique un RPE élevé. Ne pas pénaliser le coureur.
     Si RÉCURRENT : le coureur n'a peut-être pas accès à des parcours plats →
     adapter les prochaines séances à son terrain réel.
     Compenser en réduisant le D+ prévu de la prochaine séance.
   - D+ réel << prévu : le coureur a évité le dénivelé, investiguer pourquoi.
5. CONTEXTE DURÉE × RPE en trail :
   RPE 7 après une sortie de 4h+ = EXCELLENT (bonne gestion de la fatigue longue).
   RPE 7 après une sortie de 1h-2h = attention, c'est élevé pour une durée courte.
6. Utiliser ces données pour des modifications PRÉCISES et argumentées :
   "Ton allure de 6:14/km sur 6,8km montre que tu es à l'aise en EF. On maintient le cap."
   OU "Tu as fait 42min au lieu des 28min prévues — c'est 50% de plus. Attention à la fatigue accumulée."
   TOUJOURS citer les chiffres Strava dans le coachNote pour montrer qu'on a analysé les données.

═══════════════════════════════════════════════════════════════
              MATRICE RPE → ACTIONS
═══════════════════════════════════════════════════════════════

RPE 1-4 (Trop facile) :
→ Légère augmentation de volume (+5-10%) OU ajouter des accélérations progressives
→ Les allures restent IDENTIQUES — ne JAMAIS accélérer les allures de base
→ Si débutant : vérifier que le coureur ne va pas trop vite en EF (fréquent)
→ Si objectif PERTE DE POIDS ou MAINTIEN : ne PAS augmenter le volume même si RPE bas.
  La priorité est la régularité et le plaisir. Confirmer que l'effort est bon :
  "C'est exactement le bon rythme pour ton objectif. Continue comme ça, la régularité est ta meilleure alliée."
  Augmenter UNIQUEMENT si le coureur le demande explicitement dans son commentaire.
→ Si semaine de RÉCUPÉRATION : RPE bas est ATTENDU. Ne JAMAIS augmenter. Rassurer.
→ Ton : "Super forme ! On capitalise sur cet état pour consolider ta base."

RPE 5-6 (Zone optimale) :
→ PAS de modification sauf si le commentaire textuel suggère autre chose
→ Le plan fonctionne, confirmer et encourager
→ Ton : "Pile dans la cible ! C'est exactement l'effort qu'on recherche."

RPE 7-8 (Difficile mais gérable) :
→ VÉRIFIER LA PHASE avant de modifier :
  - Phase DÉVELOPPEMENT ou SPÉCIFIQUE : RPE 7-8 est NORMAL sur les séances qualité.
    Ne PAS alléger si le commentaire textuel ne mentionne pas de difficulté particulière.
    Rassurer : "C'est exactement l'effort attendu en {PHASE}. Ton corps progresse."
  - Phase FONDAMENTALE : RPE 7-8 est trop élevé. Vérifier l'allure et alléger.
  - Phase AFFÛTAGE : RPE 7-8 est normal sur les séances courtes/rapides (200m, 400m, rappels VMA)
    pour les objectifs 5km/10km. Rassurer : "Tu es affûté, c'est le signe que le système est prêt."
    Mais RPE 8 sur une séance longue en affûtage → alléger.
→ Si la phase ne justifie pas un RPE élevé : alléger la prochaine séance SIMILAIRE de 10-15%
→ Augmenter récupération entre fractions si fractionné
→ NE PAS toucher les séances faciles (footing EF, récup) — elles sont déjà faciles
→ Ton adapté à la phase : "C'est normal que ce soit exigeant en {PHASE}. On ajuste légèrement pour optimiser ta récupération."

RPE 9-10 (Trop dur / Épuisement) :
→ Alléger de 20-25% les 2-3 prochaines séances
→ Ralentir TEMPORAIREMENT de 5-10 sec/km (1-2 séances max)
→ Ajouter un jour de repos si nécessaire
→ Vérifier signaux de surentraînement dans le commentaire
→ Si 2+ feedbacks à RPE 9-10 : proposer une semaine de récupération
→ Même en phase SPÉCIFIQUE/DÉVELOPPEMENT, RPE 9-10 n'est JAMAIS normal → toujours alléger
→ Ton : "On lève le pied intelligemment. Mieux vaut arriver en forme au jour J."

═══════════════════════════════════════════════════════════════
              ADAPTATION TRAIL / D+
═══════════════════════════════════════════════════════════════

{TRAIL_RULES}

═══════════════════════════════════════════════════════════════
              ADAPTATION RENFORCEMENT
═══════════════════════════════════════════════════════════════

Si le feedback concerne une séance de renforcement :
- Le RPE sur renforcement s'interprète DIFFÉREMMENT que sur running :
  RPE 1-4 : trop facile, ajouter 1 série par exercice
  RPE 5-6 : optimal pour un coureur qui fait du renforcement en complément
  RPE 7-8 : trop dur SAUF si le coureur est habitué au renforcement. Risque de DOMS impactant
    les séances running suivantes. Réduire les séries et vérifier qu'il n'y a pas de séance
    qualité running dans les 48h suivantes.
  RPE 9-10 : trop dur, réduire significativement. Le renforcement ne doit JAMAIS compromettre
    la capacité à courir le lendemain ou surlendemain.
- "Douleur à [articulation]" → REMPLACER les exercices impactant cette zone.
  Ex: douleur genou → remplacer squats/fentes par chaise isométrique, pont fessier
  Ex: douleur dos → supprimer gainage dynamique, garder gainage statique, bird-dog
  Ex: douleur cheville → supprimer sauts, remplacer par exercices assis/allongé
- Si DÉBUTANT en renforcement : les DOMS sont normaux les premières semaines. Rassurer mais
  vérifier que ça ne perturbe pas le plan running.
- NE JAMAIS ajouter de sauts/pliométrie si le coureur a des antécédents de blessure

═══════════════════════════════════════════════════════════════
              ADAPTATION PAR ÂGE
═══════════════════════════════════════════════════════════════

Si l'âge du coureur est disponible :
- < 30 ans : récupération standard, pas d'ajustement spécifique.
- 30-45 ans : ajouter 1 jour de récup entre séances qualité si RPE ≥ 7.
- 45-55 ans : privilégier 48-72h entre séances qualité. Si RPE ≥ 7 : alléger 10% de plus
  que pour un coureur jeune. Les tendons et articulations sont plus vulnérables.
- 55+ ans : minimum 72h entre séances qualité. Réduire le fractionné court (200m, 300m)
  au profit de seuil et tempo. Renforcement articulaire PRIORITAIRE.
  Si RPE ≥ 8 : alléger de 25-30%, pas 15-20%.
- Si âge non renseigné : appliquer les règles standard.

═══════════════════════════════════════════════════════════════
              RÈGLES DE COHÉRENCE (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════

1. JAMAIS 2 séances intensives (VMA, Seuil, SL longue) le même jour ou consécutives
2. Minimum 48h entre deux séances de qualité
3. Volume hebdo max +15% par rapport à la semaine précédente
4. Si semaines restantes < 3 : priorité récupération et confiance, très peu de modifications
5. Maximum 3 séances modifiées par adaptation

═══════════════════════════════════════════════════════════════
              VARIÉTÉ DANS LES MODIFICATIONS
═══════════════════════════════════════════════════════════════

Quand tu modifies une séance, VARIE le format pour maintenir la motivation :
- 8x400m → Fartlek 8x(1'vite/1'trot) ou Pyramide 200-400-600-400-200
- 5x1000m → 3x(1000m-400m) en allure décroissante
- Chaque séance modifiée = titre UNIQUE et motivant

═══════════════════════════════════════════════════════════════
              PERSONNALISATION DES MESSAGES
═══════════════════════════════════════════════════════════════

Tes messages doivent :
1. Référencer l'OBJECTIF concret : "Pour ton {GOAL}..."
2. Mentionner la PHASE actuelle : "On est en {PHASE}, c'est normal que..."
3. Si incohérence RPE/texte : le signaler avec bienveillance
4. Expliquer le POURQUOI physiologique de chaque modification
5. Donner un conseil PRATIQUE pour la prochaine séance

❌ "Bonne continuation !"
✅ "Tu as bien géré cette séance exigeante. J'allège légèrement jeudi pour que tu récupères
    bien avant la sortie longue de dimanche — c'est elle la séance clé cette semaine pour ton semi."

═══════════════════════════════════════════════════════════════
              FORMAT JSON DE RÉPONSE
═══════════════════════════════════════════════════════════════

{
  "adaptationSummary": "Résumé clair en 2-3 phrases de ce qui change et POURQUOI",
  "objectiveReminder": "Rappel personnalisé de l'objectif + encouragement contextuel",
  "pacesReminder": "Tes allures de référence : EF {EF_PACE}, Seuil {SEUIL_PACE}, VMA {VMA_PACE}",
  "modifications": [
    {
      "weekNumber": X,
      "sessionIndex": X,
      "originalTitle": "Titre original",
      "changes": {
        "duration": "nouvelle durée si modifiée",
        "mainSet": "contenu DÉTAILLÉ avec allures EXACTES en min/km et format VARIÉ",
        "targetPace": "allure cible si modifiée (min/km)",
        "elevationGain": "D+ en mètres si modifié (Trail uniquement)",
        "advice": "Conseil PERSONNEL : référence objectif + pourquoi cette modif + conseil pratique"
      },
      "reason": "Explication technique (physiologie + objectif)"
    }
  ],
  "coachNote": "Message motivant PERSONNALISÉ mentionnant l'objectif, la phase, et contextualisant les changements"
}

RAPPEL : Chaque modification DOIT inclure les allures EXACTES en min/km !
Si aucune modification n'est nécessaire (RPE optimal, plan fonctionne), renvoie modifications: [] avec un coachNote encourageant.
`;

export const adaptPlanFromFeedback = async (
  plan: TrainingPlan,
  questionnaireData: QuestionnaireData,
  feedbackContext: string
): Promise<{ adaptationSummary: string; coachNote: string; pacesReminder?: string; objectiveReminder?: string; modifications: any[] }> => {
  console.log('[Gemini Adaptation] Début adaptation plan');

  try {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const MODEL_ID = "gemini-3-flash-preview";
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    console.log(`[Gemini Adapt] model=${MODEL_ID}`);

    // === RECALCUL DES ALLURES ===
    let vmaEstimate = getBestVMAEstimate(questionnaireData.recentRaceTimes);
    let paces: TrainingPaces;
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

    // Correction VMA pour Remise en forme / Maintien : -15% car le coureur reprend après une pause
    const goalForVmaBatch = (questionnaireData.goal || '').toLowerCase();
    if (goalForVmaBatch.includes('maintien') || goalForVmaBatch.includes('remise')) {
      const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
      console.log(`[VMA Batch] Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} → ${reducedVma.toFixed(1)} (-15%)`);
      vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajustée -15% remise en forme)` };
      paces = calculateAllPaces(reducedVma);
      vmaSource = vmaEstimate.source;
    }

    // Cross-check VMA vs targetTime
    const hasRealChrono = !!(questionnaireData.recentRaceTimes?.distance5km || questionnaireData.recentRaceTimes?.distance10km || questionnaireData.recentRaceTimes?.distanceHalfMarathon || questionnaireData.recentRaceTimes?.distanceMarathon);
    if (questionnaireData.targetTime && questionnaireData.subGoal && vmaEstimate && !hasRealChrono) {
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

    // Allure spé alignée sur cible chrono (doctrine produit, voir applyTargetTimeOverride)
    applyTargetTimeOverride(paces, questionnaireData, vmaEstimate.vma);

    console.log(`[Gemini Adaptation] VMA: ${vmaEstimate.vma.toFixed(1)} km/h (${vmaSource})`);

    // === SECTIONS DYNAMIQUES DU PROMPT ===
    const objective = detectObjectiveFromData(questionnaireData);
    const level = detectLevelFromData(questionnaireData);
    const isTrail = objective.startsWith('Trail') || objective === 'VK' || objective === 'TrailSteep';
    const isVKAdapt = objective === 'VK';
    const isTrailSteepAdapt = objective === 'TrailSteep';
    const isPertePoids = objective === 'PertePoids';
    const isMaintien = objective === 'Maintien';
    const isRacePrep = !isPertePoids && !isMaintien;

    // Section philosophie par objectif
    let objectivePhilosophy: string;
    if (isPertePoids) {
      objectivePhilosophy = `PERTE DE POIDS :
- L'objectif est le BIEN-ÊTRE et la régularité, PAS un chrono ou une distance.
- Le temps visé n'est PAS intouchable — la priorité c'est que le coureur CONTINUE à courir.
- Si c'est trop dur → réduire SANS culpabilité. Mieux vaut 3x30min/sem régulier que 4x45min abandonné.
- Si c'est trop facile → augmenter très progressivement (+5min max par séance).
- Le RPE idéal est 4-6 : effort modéré, conversation possible. RPE > 7 = TROP pour cet objectif.
- Encourager la régularité, pas la performance. "L'important c'est d'y aller, pas d'aller vite."
- Ne JAMAIS dire "l'objectif est intouchable" — ici l'objectif c'est le plaisir de courir.
- Le objectiveReminder doit être centré sur le PROCESSUS, pas le résultat :
  ✅ "Tu cours régulièrement depuis 3 semaines, c'est une vraie réussite. Continue !"
  ❌ "Pour ton objectif de perte de poids en 12 semaines..."
  Le coureur ne doit jamais sentir de pression sur un résultat chiffré.`;
    } else if (isMaintien) {
      objectivePhilosophy = `MAINTIEN / REMISE EN FORME :
- L'objectif est de maintenir ou retrouver une condition physique, pas de performer.
- Flexibilité sur les volumes et intensités — s'adapter au quotidien du coureur.
- RPE idéal : 5-6. Ne pas pousser au-delà sauf demande explicite.
- Si séances manquées : pas grave du tout, on adapte sans pression.
- Le ton doit être décontracté et encourageant, jamais culpabilisant.`;
    } else if (isVKAdapt) {
      objectivePhilosophy = `VK / COURSE DE CÔTE (${questionnaireData.trailDetails?.distance || '?'}km / ${questionnaireData.trailDetails?.elevation || '?'}m D+) :
- L'objectif est la PUISSANCE EN CÔTE, pas la distance ni le volume.
- Le D+/km de la course (${questionnaireData.trailDetails?.distance ? Math.round((questionnaireData.trailDetails?.elevation || 0) / questionnaireData.trailDetails.distance) : '?'} m/km) est EXTRÊME — tout le plan doit être orienté vertical.
- Volume kilométrique TRÈS BAS. Les séances sont courtes et intenses.
- La sortie longue est orientée D+ (pas km) — 1h-1h30 max avec D+ maximum.
- Le fractionné en côte est LE geste spécifique — il peut commencer dès la phase fondamentale.
- Si RPE élevé sur côtes : vérifier puissance vs technique. La marche en côte rapide est une compétence.
- Renforcement CRUCIAL : squats, fentes, mollets, gainage, proprioception.`;
    } else if (isTrailSteepAdapt) {
      objectivePhilosophy = `TRAIL RAIDE (${questionnaireData.trailDetails?.distance || '?'}km / ${questionnaireData.trailDetails?.elevation || '?'}m D+) :
- Ratio D+/km élevé (${questionnaireData.trailDetails?.distance ? Math.round((questionnaireData.trailDetails?.elevation || 0) / questionnaireData.trailDetails.distance) : '?'} m/km) — le plan doit privilégier le travail vertical.
- Le D+ hebdomadaire est PLUS important que le volume kilométrique.
- Volume réduit par rapport à un trail classique de même distance.
- Les séances en côte (longues 2-5min, power hiking) sont les séances CLÉS.
- Le fractionné en côte peut commencer dès la phase fondamentale.
- Si RPE élevé : vérifier si c'est le D+ ou l'allure. La marche en montée est NORMALE.
- Renforcement : quadriceps excentrique (descente), mollets, proprioception.`;
    } else if (isTrail) {
      objectivePhilosophy = `TRAIL (${questionnaireData.trailDetails?.distance || '?'}km / ${questionnaireData.trailDetails?.elevation || '?'}m D+) :
- L'objectif final (distance + D+) guide le plan. Le chrono est secondaire en trail.
- Le D+ hebdomadaire est AUSSI important que le volume kilométrique.
- Les séances en côte et la sortie longue avec D+ sont les séances CLÉS — ne pas les alléger en priorité.
- Si RPE élevé sur une séance D+ : vérifier si c'est le D+ qui était trop fort ou l'allure trop rapide.
  → En trail, ralentir l'allure en montée est TOUJOURS acceptable (marche en côte = normal).
- En phase spécifique trail : l'inconfort musculaire (cuisses, mollets) est normal et attendu.
- Les séances de renforcement (cuisses, chevilles) sont CRITIQUES pour la prévention des blessures en trail.`;
    } else {
      objectivePhilosophy = `COURSE SUR ROUTE (${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ''}) :
- L'objectif final et le temps visé sont INTOUCHABLES.
- On ajuste la MÉTHODE pour y arriver, pas la destination.
- Les allures calculées garantissent l'atteinte de l'objectif si le plan est suivi.
- Si le coureur souffre : adapter intelligemment tout en gardant le cap.
- Si trop facile : augmenter légèrement sans modifier les allures de référence.`;
    }

    // Section niveau
    let levelRules: string;
    if (level === 'deb') {
      levelRules = `DÉBUTANT :
- Les débutants SOUS-ESTIMENT souvent leur RPE (mettent 5 alors que c'est vraiment 7).
- TOUJOURS cross-checker le RPE avec le commentaire textuel.
- L'erreur la plus fréquente : courir trop vite en EF. Si RPE > 6 sur un footing → rappeler que l'EF doit être CONFORTABLE (pouvoir parler).
- Maximum de modification par adaptation : 2 séances.
- Si adaptation forte nécessaire (RPE 9-10) : ne PAS hésiter à remplacer une séance par de la marche active ou du footing ultra-lent.
- Amplitude max de changement : -25% volume. Ne jamais augmenter de plus de +5%.
- VMA max : 15min de travail effectif par séance.`;
    } else if (level === 'inter') {
      levelRules = `INTERMÉDIAIRE :
- Le coureur connaît ses sensations, le RPE est généralement fiable.
- Les phases de construction (développement) peuvent être inconfortables — c'est normal.
- Maximum de modification : 2-3 séances.
- Amplitude : -20% à +10% volume.
- VMA max : 20min de travail effectif par séance.`;
    } else if (level === 'conf') {
      levelRules = `CONFIRMÉ :
- Le coureur connaît bien son corps. Faire confiance à son RPE.
- En phase spécifique, le RPE 7-8 est NORMAL et attendu — ne pas alléger systématiquement.
- Maximum de modification : 3 séances.
- Amplitude : -15% à +15% volume.
- VMA max : 30min de travail effectif par séance.`;
    } else {
      levelRules = `EXPERT :
- Le coureur est autonome, le feedback est précis et fiable.
- Les RPE élevés en phase spécifique sont normaux et voulus.
- Ne modifier que si le coureur le demande explicitement ou si signes de surentraînement.
- Maximum de modification : 3 séances.
- Amplitude : -15% à +15% volume.`;
    }

    // Section trail D+
    let trailRules = 'Non applicable (pas un plan trail).';
    if (isTrail && questionnaireData.trailDetails) {
      const raceElev = questionnaireData.trailDetails.elevation;
      trailRules = `D+ RACE : ${raceElev}m
- Si RPE élevé lié au D+ (commentaire mentionne "montées", "côtes", "cuisses", "mollets") :
  → Réduire le D+ de la prochaine séance trail de 15-20%, PAS le volume plat
  → Rappeler que la marche en montée est NORMALE et fait partie de la stratégie trail
- Si RPE bas sur une séance D+ : le coureur est prêt, on peut maintenir ou augmenter légèrement
- Le D+ est distribué : ~65% sur la SL, ~20% sur la 2ème séance, ~15% sur les autres
- Ne JAMAIS mettre de D+ sur les séances fractionné/VMA/piste
- Max D+/session selon niveau : deb 400m, inter 800m, conf 1500m, expert 2500m`;
    }

    // Paces section
    const pacesSection = `
┌─────────────────────────┬────────────────┐
│ Zone                    │ Allure         │
├─────────────────────────┼────────────────┤
│ EF (Endurance)          │ ${paces.efPace} min/km  │
│ EA (Active)             │ ${paces.eaPace} min/km  │
│ SEUIL                   │ ${paces.seuilPace} min/km  │
│ VMA                     │ ${paces.vmaPace} min/km  │
│ Récupération            │ ${paces.recoveryPace} min/km  │
└─────────────────────────┴────────────────┘
`;

    // Replace system instruction placeholders
    let systemWithContext = ADAPTATION_SYSTEM_INSTRUCTION
      .replace('{CALCULATED_PACES}', pacesSection)
      .replace(/{GOAL}/g, plan.goal || 'ton objectif')
      .replace(/{TARGET_TIME}/g, plan.targetTime ? `en ${plan.targetTime}` : '')
      .replace(/{VMA_VALUE}/g, paces.vmaKmh)
      .replace(/{EF_PACE}/g, paces.efPace)
      .replace(/{EA_PACE}/g, paces.eaPace)
      .replace(/{SEUIL_PACE}/g, paces.seuilPace)
      .replace(/{VMA_PACE}/g, paces.vmaPace)
      .replace('{OBJECTIVE_PHILOSOPHY}', objectivePhilosophy)
      .replace('{LEVEL_RULES}', levelRules)
      .replace('{TRAIL_RULES}', trailRules);

    // === BUILD PERIODIZATION CONTEXT ===
    const periodizationCtx = plan.generationContext?.periodizationPlan;
    let periodizationSection = 'Non disponible (plan sans périodisation calculée).';
    if (periodizationCtx) {
      const weekLines = periodizationCtx.weeklyPhases.map((phase: string, i: number) => {
        const vol = periodizationCtx.weeklyVolumes[i];
        const isRecov = periodizationCtx.recoveryWeeks.includes(i + 1);
        return `S${i + 1}: ${phase} — ${vol}km${isRecov ? ' ⚠️ RÉCUPÉRATION' : ''}`;
      }).join('\n');
      periodizationSection = `Plan sur ${periodizationCtx.totalWeeks} semaines.
Semaines de récupération : ${periodizationCtx.recoveryWeeks.map((w: number) => 'S' + w).join(', ')}

${weekLines}`;
    } else {
      // Fallback : utiliser les phases des weeks si disponibles
      const weekPhases = plan.weeks
        .filter(w => w.phase)
        .map(w => `S${w.weekNumber}: ${w.phase}${w.isRecoveryWeek ? ' ⚠️ RÉCUPÉRATION' : ''}`);
      if (weekPhases.length > 0) {
        periodizationSection = weekPhases.join('\n');
      }
    }
    systemWithContext = systemWithContext.replace('{PERIODIZATION_CONTEXT}', periodizationSection);

    // {PHASE} will be replaced after currentPhase is computed below

    // === BUILD UPCOMING SESSIONS WITH FULL DETAILS ===
    const upcomingSessions: string[] = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session, sessionIdx) => {
        if (!session.feedback?.completed) {
          let line = `S${weekIdx + 1}-${sessionIdx + 1}: ${session.day} — "${session.title}" (${session.type}, ${session.duration}`;
          if (session.distance) line += `, ${session.distance}`;
          if (session.elevationGain) line += `, D+${session.elevationGain}m`;
          if (session.targetPace) line += `, allure: ${session.targetPace}`;
          line += `)`;
          if (week.phase) line += ` [${week.phase}]`;
          upcomingSessions.push(line);
        }
      });
    });

    // === WEEKS REMAINING ===
    let weeksRemaining = plan.durationWeeks;
    if (plan.raceDate) {
      const raceDate = new Date(plan.raceDate);
      const today = new Date();
      const diffTime = raceDate.getTime() - today.getTime();
      weeksRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
    }

    // === FC ZONES (basées sur l'âge) ===
    const age = questionnaireData.age || 40;
    const fcMax = 220 - age;
    const fcZones = {
      z1: { min: Math.round(fcMax * 0.50), max: Math.round(fcMax * 0.60), label: 'Z1 Récup' },
      z2: { min: Math.round(fcMax * 0.60), max: Math.round(fcMax * 0.70), label: 'Z2 EF' },
      z3: { min: Math.round(fcMax * 0.70), max: Math.round(fcMax * 0.80), label: 'Z3 Tempo' },
      z4: { min: Math.round(fcMax * 0.80), max: Math.round(fcMax * 0.90), label: 'Z4 Seuil' },
      z5: { min: Math.round(fcMax * 0.90), max: fcMax, label: 'Z5 VMA/Max' },
    };
    const getHRZone = (hr: number): string => {
      if (hr <= fcZones.z1.max) return 'Z1';
      if (hr <= fcZones.z2.max) return 'Z2';
      if (hr <= fcZones.z3.max) return 'Z3';
      if (hr <= fcZones.z4.max) return 'Z4';
      return 'Z5';
    };
    const getExpectedZone = (sessionType: string, sessionTitle?: string): string => {
      const t = sessionType || '';
      const title = (sessionTitle || '').toLowerCase();
      if (t === 'Récupération') return 'Z1';
      if (t === 'Jogging') return 'Z2';
      if (t === 'Sortie Longue') return 'Z2';
      if (t === 'Marche/Course') return 'Z1-Z2';
      if (t === 'Fractionné') {
        if (/seuil|tempo|allure/i.test(title)) return 'Z3-Z4';
        if (/vma|intervalle|30.30|200m|300m|400m/i.test(title)) return 'Z4-Z5';
        return 'Z3-Z4';
      }
      if (t === 'Renforcement') return 'N/A';
      return 'Z2';
    };

    // === FEEDBACK HISTORY (enrichi avec Strava si disponible) ===
    const feedbackHistory: string[] = [];
    let fcAlerts: string[] = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session) => {
        if (session.feedback?.completed && session.feedback.rpe) {
          let line = `S${weekIdx + 1} ${session.day} "${session.title}" (${session.type}): RPE ${session.feedback.rpe}/10`;
          if (session.feedback.notes) line += ` — "${session.feedback.notes}"`;
          const sd = session.feedback.stravaData;
          if (sd) {
            line += ` | Strava: ${sd.distance}km en ${sd.movingTime}min, allure ${sd.avgPace}, D+${sd.elevationGain}m`;
            if (sd.avgHeartrate) {
              const zone = getHRZone(sd.avgHeartrate);
              const expected = getExpectedZone(session.type, session.title);
              line += `, FC ${sd.avgHeartrate}bpm (${zone})`;
              if ((expected === 'Z1' || expected === 'Z2' || expected === 'Z1-Z2') && (zone === 'Z3' || zone === 'Z4' || zone === 'Z5')) {
                line += ` ⚠️ FC TROP HAUTE pour ${session.type}`;
                fcAlerts.push(`S${weekIdx + 1} "${session.title}": FC ${sd.avgHeartrate}bpm (${zone}) alors que la zone attendue est ${expected}. L'allure EF est probablement trop rapide pour ce coureur.`);
              }
            }
          }
          feedbackHistory.push(line);
        }
      });
    });

    // === RPE TREND DETECTION ===
    const rpeValues = feedbackHistory.map(f => {
      const match = f.match(/RPE (\d+)\/10/);
      return match ? parseInt(match[1]) : 0;
    }).filter(v => v > 0);
    let rpeTrend = '';
    if (rpeValues.length >= 3) {
      const last3 = rpeValues.slice(-3);
      const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
      if (last3.every(v => v >= 7)) {
        rpeTrend = `⚠️ ALERTE FATIGUE : Les 3 derniers RPE sont tous ≥ 7 (${last3.join(', ')}). Fatigue accumulée probable.`;
      } else if (last3[0] < last3[1] && last3[1] < last3[2] && last3[2] >= 7) {
        rpeTrend = `⚠️ TENDANCE HAUSSE : RPE en augmentation constante (${last3.join(' → ')}). Surveiller surcharge.`;
      } else if (avg <= 4) {
        // Vérifier si c'est une semaine de récup avant de signaler une sous-charge
        const currentWkIdx = plan.weeks.findIndex(w => w.sessions.some(s => !s.feedback?.completed));
        const isRecoveryWk = currentWkIdx >= 0 && (
          plan.weeks[currentWkIdx].isRecoveryWeek ||
          plan.weeks[currentWkIdx].phase === 'recuperation' ||
          plan.generationContext?.periodizationPlan?.recoveryWeeks?.includes(currentWkIdx + 1)
        );
        if (isRecoveryWk) {
          rpeTrend = `✅ RÉCUPÉRATION EN COURS : RPE moyen = ${avg.toFixed(1)} — c'est normal et voulu en semaine de décharge.`;
        } else {
          rpeTrend = `ℹ️ SOUS-CHARGE POSSIBLE : RPE moyen des 3 dernières séances = ${avg.toFixed(1)}. Le coureur est peut-être sous-stimulé.`;
        }
      }
    }

    // Detect fitness improvement (declining RPE over 5+ feedbacks)
    if (rpeValues.length >= 5) {
      const last5 = rpeValues.slice(-5);
      const first2avg = (last5[0] + last5[1]) / 2;
      const last2avg = (last5[3] + last5[4]) / 2;
      if (first2avg - last2avg >= 2 && !rpeTrend.includes('ALERTE')) {
        rpeTrend += `\n📈 PROGRESSION DÉTECTÉE : RPE en baisse constante sur 5+ séances (${last5.join(' → ')}). Le coureur s'adapte bien — envisager une progression modérée (+5-10% volume).`;
      }
    }

    // === CURRENT PHASE ===
    const currentWeekIdx = plan.weeks.findIndex(w => w.sessions.some(s => !s.feedback?.completed));
    const safeWeekIdx = currentWeekIdx >= 0 ? currentWeekIdx : plan.weeks.length - 1;
    const currentPhase = currentWeekIdx >= 0 ? (plan.weeks[currentWeekIdx].phase || 'non définie') : 'fin de plan';

    // Now replace {PHASE} in system instruction
    systemWithContext = systemWithContext.replace(/{PHASE}/g, currentPhase);

    // === BUILD PROMPT ===
    const adaptationPrompt = `
═══════════════════════════════════════════════════════════════
              CONTEXTE DU PLAN
═══════════════════════════════════════════════════════════════

Objectif : ${plan.goal} ${plan.distance ? `(${plan.distance})` : ''}
${isRacePrep ? `Temps visé : ${plan.targetTime || 'Finisher'}` : `Type : ${isPertePoids ? 'Perte de poids' : 'Maintien / Remise en forme'}`}
${plan.raceDate ? `Date de course : ${plan.raceDate}` : ''}
Durée du plan : ${plan.durationWeeks} semaines | Semaines restantes : ${weeksRemaining}
Phase actuelle : ${currentPhase}
${plan.weeks[safeWeekIdx]?.isRecoveryWeek ? '⚠️ SEMAINE DE RÉCUPÉRATION — RPE bas = ATTENDU ET VOULU' : ''}
${isTrail ? `Trail : ${questionnaireData.trailDetails?.distance}km / ${questionnaireData.trailDetails?.elevation}m D+` : ''}
${periodizationCtx ? `
═══════════════════════════════════════════════════════════════
              PÉRIODISATION COMPLÈTE
═══════════════════════════════════════════════════════════════

Semaines de récup : ${periodizationCtx.recoveryWeeks.map((w: number) => 'S' + w).join(', ')}
${periodizationCtx.weeklyPhases.slice(Math.max(0, safeWeekIdx - 2), safeWeekIdx + 5).map((p: string, i: number) => {
  const wNum = Math.max(0, safeWeekIdx - 2) + i + 1;
  const vol = periodizationCtx.weeklyVolumes[wNum - 1];
  const isRecov = periodizationCtx.recoveryWeeks.includes(wNum);
  const isCurrent = wNum === safeWeekIdx + 1;
  return `${isCurrent ? '→ ' : '  '}S${wNum}: ${p} — ${vol}km${isRecov ? ' (RÉCUP)' : ''}`;
}).join('\n')}` : ''}

═══════════════════════════════════════════════════════════════
              ALLURES DE RÉFÉRENCE
═══════════════════════════════════════════════════════════════

VMA : ${paces.vmaKmh} km/h (${vmaSource})
${pacesSection}

═══════════════════════════════════════════════════════════════
              PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════

Niveau : ${questionnaireData.level} (détecté : ${level})
Âge : ${questionnaireData.age || 'Non renseigné'}
Fréquence : ${questionnaireData.frequency} séances/semaine
Volume actuel : ${questionnaireData.currentWeeklyVolume ? `${questionnaireData.currentWeeklyVolume} km/sem` : 'Non renseigné'}
Blessures/Contraintes : ${questionnaireData.injuries?.hasInjury ? questionnaireData.injuries.description : 'Aucune'}
${(() => {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) return 'Saison : été (chaleur probable — RPE naturellement +1-2 points, allures +10-20 sec/km)';
  if (month >= 11 || month <= 1) return 'Saison : hiver (froid, vent — allures naturellement +10-15 sec/km)';
  return 'Saison : mi-saison (conditions normales)';
})()}

═══════════════════════════════════════════════════════════════
              ZONES FC DU COUREUR (FCmax estimée : ${fcMax} bpm, âge ${age})
═══════════════════════════════════════════════════════════════

${Object.values(fcZones).map(z => `${z.label}: ${z.min}-${z.max} bpm`).join('\n')}

Zone attendue par type de séance :
- EF / Footing / Sortie longue → Z2 (${fcZones.z2.min}-${fcZones.z2.max} bpm)
- Seuil / Tempo → Z3-Z4 (${fcZones.z3.min}-${fcZones.z4.max} bpm)
- VMA / Fractionné → Z4-Z5 (${fcZones.z4.min}-${fcZones.z5.max} bpm)
- Récupération → Z1 (${fcZones.z1.min}-${fcZones.z1.max} bpm)
${fcAlerts.length > 0 ? `
⚠️ ALERTES FC DÉTECTÉES (${fcAlerts.length}) :
${fcAlerts.join('\n')}
→ PRIORITÉ : si ces alertes sont récurrentes, les allures EF du coureur sont TROP RAPIDES pour sa condition réelle.
  Recommander de RALENTIR de 15-30 sec/km sur les séances EF et d'ajuster le mainSet des prochaines séances en conséquence.
  Si 3+ alertes FC : recommander un RECALCUL DE VMA (VMA actuelle probablement surestimée).
  Mentionner explicitement dans le coachNote : "Ta fréquence cardiaque montre que tes allures EF sont trop rapides.
  Ralentis à [allure corrigée] pour rester en zone 2 et progresser sans risque de surentraînement."
` : '✅ Aucune alerte FC détectée — les zones cardiaques semblent cohérentes avec les allures.'}

═══════════════════════════════════════════════════════════════
              HISTORIQUE RPE (${feedbackHistory.length} feedbacks)
═══════════════════════════════════════════════════════════════

${feedbackHistory.length > 0 ? feedbackHistory.slice(-8).join('\n') : 'Premier feedback du coureur'}
${rpeTrend ? `\n${rpeTrend}` : ''}

═══════════════════════════════════════════════════════════════
              FEEDBACK ACTUEL
═══════════════════════════════════════════════════════════════

${feedbackContext}

═══════════════════════════════════════════════════════════════
              SÉANCES À VENIR (MODIFIABLES)
═══════════════════════════════════════════════════════════════

${upcomingSessions.slice(0, 12).join('\n')}
${upcomingSessions.length > 12 ? `\n... et ${upcomingSessions.length - 12} autres séances` : ''}

═══════════════════════════════════════════════════════════════
              INSTRUCTIONS
═══════════════════════════════════════════════════════════════

1. CROSS-CHECK le RPE chiffré avec le commentaire textuel (cf. règles ci-dessus)
2. ${isRacePrep ? `L'objectif "${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ''}" est INTOUCHABLE` : 'Objectif flexible — priorité au bien-être et à la régularité'}
3. Phase actuelle : ${currentPhase}${weeksRemaining <= 3 ? ' — AFFÛTAGE/FIN DE PLAN : priorité récupération' : ''}
4. ${plan.weeks[currentWeekIdx]?.isRecoveryWeek ? 'SEMAINE DE RÉCUP : RPE bas est NORMAL. Ne PAS augmenter le volume/intensité.' : 'Consulte la périodisation pour comprendre le rôle de cette semaine.'}
5. Si des DONNÉES STRAVA sont disponibles, compare prévu vs réalisé et argumente tes modifications avec ces données concrètes
6. ⚠️ ANALYSE FC OBLIGATOIRE : si des données FC Strava sont disponibles, VÉRIFIE que la FC correspond à la zone attendue. Si FC en Z3+ sur une séance EF → ALERTE et RALENTIR les allures EF des prochaines séances de 15-30 sec/km. C'est PRIORITAIRE sur toute autre modification.
7. Modifie UNIQUEMENT les séances futures listées ci-dessus (max 3)
8. UTILISE les allures calculées (EF: ${paces.efPace}, Seuil: ${paces.seuilPace}, VMA: ${paces.vmaPace})
9. VARIE les formats de séance modifiée
10. Chaque advice doit être PERSONNEL et référencer l'objectif/la phase/les données Strava
`;

    console.log(`[Gemini Adaptation] Envoi prompt | objective=${objective} level=${level} phase=${currentPhase} trend=${rpeTrend ? 'ALERT' : 'OK'}`);

    // Passer le system instruction comme systemInstruction (pas en user content)
    // pour que Gemini le traite comme instructions prioritaires
    const adaptationModel = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction: systemWithContext,
    });

    const result = await adaptationModel.generateContent({
      contents: [{ role: "user", parts: [{ text: adaptationPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

const response = await result.response;

// Extraction robuste du texte (compatible tous modèles Gemini)
let text = '';
if (typeof response.text === 'function') {
  text = response.text();
} else if (response.candidates && response.candidates[0]) {
  const candidate = response.candidates[0];
  if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
    text = candidate.content.parts[0].text;
  }
}

if (!text) {
  console.error('[Gemini] Structure réponse inattendue:', JSON.stringify(response, null, 2));
  throw new Error("Impossible d'extraire le texte de la réponse Gemini");
}

console.log('[Gemini] Réponse reçue, longueur:', text.length);

    try {
      const parsed = JSON.parse(text);
      // S'assurer que le rappel des allures est inclus
      if (!parsed.pacesReminder) {
        parsed.pacesReminder = `Tes allures de référence : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`;
      }
      return parsed;
    } catch (e) {
      console.error('[Gemini Adaptation] Erreur parsing:', e);
      return {
        adaptationSummary: "Adaptation prise en compte.",
        objectiveReminder: `Ton objectif de ${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ''} reste notre cap !`,
        pacesReminder: `Tes allures de référence : EF ${paces.efPace}, Seuil ${paces.seuilPace}, VMA ${paces.vmaPace}`,
        coachNote: "Merci pour ton retour ! Continue à progresser à ton rythme.",
        modifications: []
      };
    }

  } catch (error) {
    console.error('[Gemini Adaptation] Erreur:', error);
    throw error;
  }
};
