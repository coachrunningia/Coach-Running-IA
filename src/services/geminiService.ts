
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QuestionnaireData, TrainingPlan, GenerationContext, PeriodizationPhase } from "../types";
import { calculateFeasibility } from './feasibilityService';
import { buildRenfoMainSet } from './renfoService';

// --- UTILITAIRES DE CALCUL DES ALLURES ---

/**
 * Convertit un temps en secondes - gère tous les formats
 * Formats: "mm:ss", "hh:mm:ss", "Xh", "XhYY", "XX min"
 */
const timeToSeconds = (time: string, contextDistance?: number): number => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Format "Xh" ou "XhYY" ou "Xh:YY" (ex: 4h, 4h30, 4h:30, 2h08)
  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    return hours * 3600 + mins * 60;
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
 * Convertit des secondes en format "m:ss min/km"
 */
const secondsToPace = (seconds: number): string => {
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  // Garde-fou : si secs === 60 (ne devrait pas arriver avec Math.floor, mais sécurité)
  if (secs >= 60) return `${mins + 1}:00`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
interface TrainingPaces {
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

const calculateAllPaces = (vma: number): TrainingPaces => {
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

/**
 * Passe de correction français par IA.
 * Un seul appel Gemini léger : corrige grammaire, tutoiement, accords genre/nombre.
 * Ne touche PAS au contenu sportif ni aux allures.
 */
const correctFrenchWithAI = async (plan: any): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Collecter tous les champs textuels à corriger
    const textsToFix: { path: string; text: string }[] = [];

    if (plan.welcomeMessage) textsToFix.push({ path: 'welcomeMessage', text: plan.welcomeMessage });
    if (plan.feasibility?.message) textsToFix.push({ path: 'feasibility.message', text: plan.feasibility.message });

    (plan.weeks || []).forEach((w: any, wi: number) => {
      if (w.weekGoal) textsToFix.push({ path: `weeks[${wi}].weekGoal`, text: w.weekGoal });
      (w.sessions || []).forEach((s: any, si: number) => {
        const prefix = `weeks[${wi}].sessions[${si}]`;
        if (s.warmup) textsToFix.push({ path: `${prefix}.warmup`, text: s.warmup });
        if (s.mainSet) textsToFix.push({ path: `${prefix}.mainSet`, text: s.mainSet });
        if (s.cooldown) textsToFix.push({ path: `${prefix}.cooldown`, text: s.cooldown });
        if (s.advice) textsToFix.push({ path: `${prefix}.advice`, text: s.advice });
      });
    });

    if (textsToFix.length === 0) return;

    // Construire le payload compact : index → texte
    const payload = textsToFix.map((t, i) => `[${i}] ${t.text}`).join('\n---\n');

    const prompt = `Tu es un correcteur de français. Corrige UNIQUEMENT la grammaire, l'orthographe et les accords dans les textes ci-dessous.

RÈGLES STRICTES :
1. TUTOIEMENT obligatoire partout (tu, ton, ta, tes — jamais vous/votre/vos)
2. Accords genre/nombre : "ta sortie" (pas "ton sortie"), "ta forme" (pas "ton forme"), "ta vitesse", "ta progression", "ta base", "ta foulée"
3. Conjugaison tutoiement : "tu dois" (pas "tu devez"), "tu peux" (pas "tu pouvez"), "ne te préoccupe pas" (pas "ne tu préoccupez pas")
4. Élision devant voyelle : "t'initie" (pas "tu initie"), "t'aide", "t'amène", "t'alerter"
5. NE CHANGE PAS le contenu sportif, les allures (min/km), les distances, les durées, les noms d'exercices

Réponds UNIQUEMENT avec un JSON : {"corrections": {"0": "texte corrigé", "3": "texte corrigé"}}
N'inclus que les textes qui ont été modifiés. Si rien à corriger, réponds {"corrections": {}}.

TEXTES :
${payload}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    });

    const responseText = result.response.text();
    // Extraire le JSON de la réponse
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[FrenchAI] Pas de JSON dans la réponse');
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const corrections = parsed.corrections || {};
    const correctionCount = Object.keys(corrections).length;

    if (correctionCount === 0) {
      console.log('[FrenchAI] ✅ Aucune correction nécessaire');
      return;
    }

    // Appliquer les corrections
    for (const [indexStr, correctedText] of Object.entries(corrections)) {
      const idx = parseInt(indexStr);
      if (idx < 0 || idx >= textsToFix.length) continue;
      const entry = textsToFix[idx];

      // Vérifier que le texte corrigé ne supprime pas d'allures (safety check)
      const originalPaces = (entry.text.match(/\d+:\d+\s*min\/km/g) || []);
      const correctedPaces = ((correctedText as string).match(/\d+:\d+\s*min\/km/g) || []);
      if (originalPaces.length > 0 && correctedPaces.length < originalPaces.length) {
        console.warn(`[FrenchAI] ⚠️ Skip ${entry.path}: allures supprimées`);
        continue;
      }

      // Appliquer via le path
      const parts = entry.path.split('.');
      let obj: any = plan;
      for (let i = 0; i < parts.length - 1; i++) {
        const match = parts[i].match(/(\w+)\[(\d+)\]/);
        if (match) {
          obj = obj[match[1]][parseInt(match[2])];
        } else {
          obj = obj[parts[i]];
        }
      }
      const lastKey = parts[parts.length - 1];
      const lastMatch = lastKey.match(/(\w+)\[(\d+)\]/);
      if (lastMatch) {
        obj[lastMatch[1]][parseInt(lastMatch[2])] = correctedText;
      } else {
        obj[lastKey] = correctedText;
      }
    }

    console.log(`[FrenchAI] ✅ ${correctionCount} texte(s) corrigé(s)`);
  } catch (err) {
    // Non-bloquant : si la correction échoue, on garde les textes originaux
    console.warn('[FrenchAI] Correction échouée (non-bloquant):', err);
  }
};

/**
 * Recalcule la distance d'une séance à partir de la durée et du targetPace.
 * Corrige les erreurs fréquentes de Gemini sur les distances (surtout à pace lent).
 */
const recalculateSessionDistance = (session: any): void => {
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

  // Calculer la distance correcte
  const calculatedKm = durationMinutes / paceMinPerKm;
  const currentKm = parseFloat((session.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));

  // Corriger si l'écart est > 20% (tolérance pour warmup/cooldown à pace différent)
  if (currentKm > 0 && Math.abs(calculatedKm - currentKm) / calculatedKm > 0.20) {
    const corrected = Math.round(calculatedKm * 10) / 10;
    console.log(`[PostProcess] Distance corrigée: "${session.title}" ${currentKm}km → ${corrected}km (${durationMinutes}min à ${paceStr}/km)`);
    session.distance = `${corrected} km`;
  } else if (!currentKm || currentKm === 0) {
    session.distance = `${Math.round(calculatedKm * 10) / 10} km`;
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

  // Détection de séances monotones : si 2+ footings ont un titre quasi-identique, varier
  const joggingSessions = week.sessions.filter((s: any) => s.type === 'Jogging' && s.title);
  if (joggingSessions.length >= 2 && pacesObj) {
    const normalize = (t: string) => t.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ').trim();
    const seen = new Map<string, number>();
    const variants = [
      { title: 'Footing Progressif', mainSet: (dur: number) => `${dur - 10} min en commençant à ${pacesObj.recoveryPace} min/km, accélérer progressivement pour finir les 10 dernières minutes à ${pacesObj.efPace} min/km.` },
      { title: 'Footing Vallonné', mainSet: (dur: number) => `${dur} min sur terrain vallonné en aisance respiratoire (${pacesObj.efPace} min/km), en intégrant des côtes légères sans forcer.` },
      { title: 'Footing Technique', mainSet: (dur: number) => `${dur} min en EF (${pacesObj.efPace} min/km) avec focus technique : cadence 170-180 pas/min, posture haute, foulée médio-pied.` },
    ];
    let variantIdx = 0;
    joggingSessions.forEach((s: any) => {
      const key = normalize(s.title);
      seen.set(key, (seen.get(key) || 0) + 1);
      if ((seen.get(key) || 0) > 1 && variantIdx < variants.length) {
        const v = variants[variantIdx++];
        const dur = Math.max(parseDurationMin(s.duration) - 15, 30);
        console.log(`[PostProcess] Dedup footing: "${s.title}" → "${v.title}"`);
        s.title = v.title;
        s.mainSet = v.mainSet(dur);
      }
    });
  }

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
      session.targetPace = paceForType[session.type] || pacesObj.efPace;
    }

    // Distance : recalculer si incohérente
    recalculateSessionDistance(session);

  });

  // ══════════════════════════════════════════════════════════════
  // GARDE-FOU : max 1 SL par semaine (sauf Trail back-to-back)
  // Si 2+ SL détectées, garder la plus longue, convertir les autres en Jogging
  // ══════════════════════════════════════════════════════════════
  const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const slSessions = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' || /sortie\s*longue/i.test(s.title || '')
  );
  if (slSessions.length >= 2) {
    // Garder la plus longue, convertir les autres en Jogging EF
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

  // GARDE-FOU : pas de 2 séances longues sur jours consécutifs
  const longSessions = week.sessions.filter((s: any) =>
    s.type === 'Sortie Longue' || (s.duration && parseDurationMin(s.duration) >= 90 &&
      !['Fractionné', 'VMA', 'Intervalle', 'Seuil', 'Renforcement', 'Repos'].some((t: string) => (s.type || '').includes(t)))
  );
  if (longSessions.length >= 2) {
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
  'PertePoids':{ deb: 8,  inter: 12, conf: 14, expert: 15 },
  'Maintien':  { deb: 10, inter: 15, conf: 17, expert: 18 },
};

/** Max durée SL en minutes selon objectif × niveau */
const MAX_SL_DURATION: Record<string, Record<string, number>> = {
  '5K':        { deb: 50, inter: 60, conf: 70, expert: 75 },
  '10K':       { deb: 60, inter: 75, conf: 85, expert: 90 },
  'Semi':      { deb: 90, inter: 105, conf: 115, expert: 120 },
  'Marathon':  { deb: 120, inter: 135, conf: 145, expert: 150 },
  'VK':        { deb: 60, inter: 80, conf: 100, expert: 120 },
  'TrailSteep':{ deb: 75, inter: 100, conf: 120, expert: 140 },
  'Trail<30':  { deb: 90, inter: 120, conf: 140, expert: 150 },
  'Trail30+':  { deb: 120, inter: 180, conf: 200, expert: 210 },
  'Trail60+':  { deb: 150, inter: 240, conf: 270, expert: 300 },
  'Trail100+': { deb: 180, inter: 300, conf: 360, expert: 480 },
  'PertePoids':{ deb: 45, inter: 60, conf: 70, expert: 75 },
  'Maintien':  { deb: 50, inter: 70, conf: 80, expert: 90 },
};

/** Max volume hebdomadaire absolu selon objectif × niveau (filet de sécurité) */
const MAX_WEEKLY_VOLUME: Record<string, Record<string, number>> = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  'TrailSteep':{ deb: 25, inter: 35, conf: 45, expert: 55 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 20, inter: 30, conf: 35, expert: 45 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};

/** Proportion minimale que la SL doit représenter dans le volume hebdo, par objectif × niveau */
const MIN_SL_PROPORTION: Record<string, Record<string, number>> = {
  '5K':        { deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
  '10K':       { deb: 0.30, inter: 0.30, conf: 0.30, expert: 0.30 },
  'Semi':      { deb: 0.32, inter: 0.32, conf: 0.30, expert: 0.30 },
  'Marathon':  { deb: 0.35, inter: 0.35, conf: 0.33, expert: 0.30 },
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

/** Détecte le niveau normalisé — avec override VMA si incohérence flagrante */
const detectLevelFromData = (data: any): string => {
  const level = (data.level || '').toLowerCase();
  let declared: string;
  if (level.includes('débutant') || level.includes('debutant')) declared = 'deb';
  else if (level.includes('expert') || level.includes('performance')) declared = 'expert';
  else if (level.includes('confirmé') || level.includes('confirme') || level.includes('compétition')) declared = 'conf';
  else declared = 'inter';

  // Override par VMA si incohérence flagrante
  // VMA < 11 = débutant, 11-14 = inter, 14-17 = confirmé, > 17 = expert
  const vma = data.vma || data.estimatedVMA;
  if (vma && vma > 0) {
    let vmaLevel: string;
    if (vma < 11) vmaLevel = 'deb';
    else if (vma < 14) vmaLevel = 'inter';
    else if (vma < 17) vmaLevel = 'conf';
    else vmaLevel = 'expert';

    const levelRank: Record<string, number> = { deb: 0, inter: 1, conf: 2, expert: 3 };
    // Si le niveau déclaré est au-dessus de ce que la VMA indique → override
    if (levelRank[declared] - levelRank[vmaLevel] >= 1) {
      console.log(`[Enforce] Level override: declared="${declared}" but VMA=${vma} implies "${vmaLevel}" → using "${vmaLevel}"`);
      return vmaLevel;
    }
  }

  return declared;
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
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
        console.log(`[Enforce] SL capped: ${dur}min → ${maxSlDur}min [${objective} ${level}]`);
      }
    });
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
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
      const slKm = parseFloat((slSession.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));

      // Calculate total weekly running volume
      const totalKm = runningSessions.reduce((sum: number, s: any) => {
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        return sum + km;
      }, 0);

      // Check proportion
      const targetSlKm = totalKm > 0 ? Math.round(totalKm * minProportion * 10) / 10 : 0;

      if (slKm > 0 && totalKm > 0 && slKm < targetSlKm) {
        // SL is under-proportioned — redistribute from other sessions
        const deficit = targetSlKm - slKm;
        const otherRunningSessions = runningSessions.filter((s: any) => s !== slSession);
        const otherTotalKm = otherRunningSessions.reduce((sum: number, s: any) => {
          const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
          return sum + km;
        }, 0);

        if (otherTotalKm > 0 && otherRunningSessions.length > 0) {
          // Take proportionally from other sessions
          const reductionFactor = (otherTotalKm - deficit) / otherTotalKm;
          if (reductionFactor >= 0.65) { // Don't reduce others by more than 35%
            otherRunningSessions.forEach((s: any) => {
              const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
          const km = parseFloat((slSession.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
      return sum + (km > 0 ? km : 0);
    }, 0);
    if (currVol > absMaxVolume && currVol > 0) {
      const factor = absMaxVolume / currVol;
      runSess.forEach((s: any) => {
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
    const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
    return sum + (km > 0 ? km : 0);
  }, 0);

  if (currentVolume <= 0) return;

  // Scale DOWN if more than 10% over target
  if (currentVolume > targetVolume * 1.10) {
    const factor = targetVolume / currentVolume;
    runSessions.forEach((s: any) => {
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (km > 0) {
        s.distance = `${Math.round(km * factor * 10) / 10} km`;
        const dur = parseDurationMin(s.duration);
        if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume: ${Math.round(currentVolume)}km → ${targetVolume}km (factor ${factor.toFixed(2)})`);
  }
  // Scale UP if more than 20% under target (Gemini sometimes underestimates)
  else if (currentVolume < targetVolume * 0.80) {
    const factor = targetVolume / currentVolume;
    runSessions.forEach((s: any) => {
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
          s.duration = formatDurationStr(isWalkRun(s) ? Math.min(newDur, 50) : newDur);
        }
      }
    });
    console.log(`[Enforce] Week ${week.weekNumber} volume UP: ${Math.round(currentVolume)}km → ${targetVolume}km (factor ${factor.toFixed(2)})`);
  }

  // --- 7. Convertir séances running trop courtes en Repos actif ---
  // Si volume moyen par séance running < 3.5km, les micro-séances n'ont pas de valeur
  // d'entraînement. Mieux vaut moins de séances running plus consistantes + repos.
  const MIN_AVG_KM_PER_SESSION = 3.5;
  const finalRunSessions = week.sessions.filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos');
  if (finalRunSessions.length >= 3) {
    const finalVol = finalRunSessions.reduce((sum: number, s: any) => {
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
      return sum + (km > 0 ? km : 0);
    }, 0);
    const avgKm = finalVol / finalRunSessions.length;

    if (avgKm < MIN_AVG_KM_PER_SESSION && finalRunSessions.length > 2) {
      // Trier par distance croissante pour convertir les plus courtes
      const sorted = [...finalRunSessions].sort((a: any, b: any) => {
        const kmA = parseFloat((a.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        const kmB = parseFloat((b.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        return kmA - kmB;
      });

      // Combien de séances convertir ? On en enlève jusqu'à avg >= MIN_AVG_KM_PER_SESSION
      // mais on garde minimum 2 séances running
      let sessionsToConvert = 0;
      let testRunCount = finalRunSessions.length;
      let testVol = finalVol;
      for (const s of sorted) {
        if (testRunCount <= 2) break;
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
          const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
            const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
            return sum + (km > 0 ? km : 0);
          }, 0);
          if (keepVol > 0 && keepSessions.length > 0) {
            keepSessions.forEach((s: any) => {
              const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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
    const getKm = (s: any) => parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
    const km0 = getKm(footings[0]);
    const km1 = getKm(footings[1]);
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
        const newKm = getKm(s);
        const oldKm = s === footings[0] ? km0 : km1;
        if (oldKm > 0) {
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * (newKm / oldKm)));
        }
      });

      console.log(`[Enforce] S${week.weekNumber}: Footing variation ${km0}/${km1}km → ${getKm(footings[0])}/${getKm(footings[1])}km`);
    }
  }
};

/**
 * Guard cross-semaines : appliqué sur le plan complet après enforceWeekConstraints.
 * 1. Affûtage : chaque semaine d'affûtage doit avoir un volume ≤ semaine précédente
 * 2. Progression : max +15% d'une semaine à l'autre (hors post-récup)
 * 3. Re-cap sessions après lissage
 */
const enforceFullPlanConstraints = (
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
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
      return sum + (km > 0 ? km : 0);
    }, 0);
  };

  const scaleWeekVolume = (week: any, targetKm: number) => {
    const currentKm = getWeekKm(week);
    if (currentKm <= 0 || Math.abs(currentKm - targetKm) < 1) return;
    const factor = targetKm / currentKm;
    (week.sessions || []).forEach((s: any) => {
      if (s.type === 'Renforcement' || s.type === 'Repos') return;
      const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
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

      // Post-recovery : tolérance +30% (au lieu de +15% normal)
      if (isFromRecovery) {
        if (increase > 0.30) {
          const targetNext = Math.round(currKm * 1.30);
          if (targetNext < nextKm) {
            scaleWeekVolume(weeks[i + 1], targetNext);
            console.log(`[Guard] Post-recovery S${weeks[i + 1].weekNumber}: ${Math.round(nextKm)}km → ${targetNext}km (+30% max from recovery ${Math.round(currKm)}km)`);
          }
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
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (km > maxKm) {
          const factor = maxKm / km;
          s.distance = `${maxKm} km`;
          const dur = parseDurationMin(s.duration);
          if (dur > 0) s.duration = formatDurationStr(Math.round(dur * factor));
        }
      });
    });
  }
};

/** Parse une durée en minutes ("1h30" → 90, "45 min" → 45, "120 minutes" → 120) */
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
const calculateWeekTargetElevation = (
  weekNumber: number,
  totalWeeks: number,
  raceElevation: number,
  level: string,
  currentWeeklyElevation?: number,
): number => {
  // Garde-fou : si raceElevation est NaN ou 0, retourner 0 (pas de D+)
  if (!raceElevation || isNaN(raceElevation)) return 0;

  // Plafond D+ hebdo par niveau (garde-fou absolu)
  // Aucune semaine d'entraînement ne devrait approcher le D+ total de la course
  // Accepte les deux formats de level : court ('deb','inter','conf','expert') et long ('Débutant (0-1 an)', etc.)
  const lvl = level.toLowerCase();
  const isDeb = lvl === 'deb' || lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl === 'inter' || lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl === 'conf' || lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');
  const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 2500) :
    Math.min(raceElevation, 3500); // Expert

  // Point de départ : D+ actuel ou plancher par niveau
  const defaultStart =
    isDeb ? 150
    : isInter ? 300
    : isConf ? 500
    : 800; // Expert

  // Cap startElevation à 60% du max pour garantir une marge de progression
  // + cap absolu à 1500m (aucune S1 ne devrait dépasser ça)
  const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
  // Plancher minimum : au moins 15% du D+ course (un trail 1500m D+ ne peut pas démarrer à 50m/sem)
  const minStartElevation = Math.round(raceElevation * 0.15);
  const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : Math.min(defaultStart, maxStart); // Fix: cap defaultStart par maxStart aussi
  const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));

  // Progression linéaire startElevation → maxWeeklyElevation
  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  const target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);

  return target;
};

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
    const isTrack = trackTypes.some(t => title.includes(t.toLowerCase())) || trackTypes.some(t => (s.type || '').includes(t));
    const isRecovery = /récup|recovery|décrassage|régénér/i.test(s.title || '') ||
      s.intensity === 'Très facile' || s.intensity === 'Très Facile';
    // Séance de côtes courte = fractionné spécifique, pas une sortie trail
    const isCotesSession = /côte|hill/i.test(title) && parseDurationMin(s.duration) < 70;

    if (isTrack || isRecovery) {
      s.elevationGain = 0; // Zero D+ on track & recovery
      s._dplusRole = 'ZERO';
    } else if (isCotesSession) {
      // Séance de côtes courte : eligible pour D+ mais pas candidat principal
      s._dplusRole = 'FOOTING';
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
const calculatePeriodizationPlan = (
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
): { weeklyVolumes: number[]; weeklyPhases: PeriodizationPhase[]; recoveryWeeks: number[] } => {

  // Taux de progression selon niveau
  // Débutant à 0.08 (comme inter) pour pouvoir atteindre la distance de course
  const progressionRate = level === 'Débutant (0-1 an)' ? 0.08 :
                          level === 'Intermédiaire (Régulier)' ? 0.08 :
                          level === 'Confirmé (Compétition)' ? 0.10 : 0.12;

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

  let maxVolume: number;
  if (level === 'Débutant (0-1 an)') {
    if (isPertePoids) maxVolume = 20;
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
    if (isPertePoids) maxVolume = 45;
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
    if (isPertePoids) maxVolume = 35;
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
    if (isPertePoids) maxVolume = 30;
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
  // RÉDUCTION FINISHER : objectif = terminer, pas performer
  // On réduit le cap de 25% mais le minPeakVolume (150% distance) reste plancher
  // → Un Finisher semi fait ~45km au lieu de 60km, mais un Finisher ultra 100km
  //   garde son minPeakVolume de 120km (car 100×1.5 = 150 → cappé par absoluteCap)
  // ══════════════════════════════════════════════════════════════
  const isFinisher = !targetTime || targetTime.trim() === '';
  if (isFinisher && !isPertePoids && !isMaintien) {
    const originalMax = maxVolume;
    maxVolume = Math.round(maxVolume * 0.75);
    console.log(`[Periodization] Finisher detected → maxVolume ${originalMax}km × 0.75 = ${maxVolume}km`);
  }

  // ══════════════════════════════════════════════════════════════
  // RÉDUCTION PAR ÂGE : ados (<18) et seniors (>55)
  // Les os d'un ado et les articulations d'un senior ne supportent pas le même volume
  // ══════════════════════════════════════════════════════════════
  if (age && age > 0) {
    if (age < 18) {
      const originalMax = maxVolume;
      maxVolume = Math.round(maxVolume * 0.70); // -30% pour les ados
      console.log(`[Periodization] Ado (${age} ans) → maxVolume ${originalMax}km × 0.70 = ${maxVolume}km`);
    } else if (age >= 55) {
      const originalMax = maxVolume;
      maxVolume = Math.round(maxVolume * 0.85); // -15% pour les seniors
      console.log(`[Periodization] Senior (${age} ans) → maxVolume ${originalMax}km × 0.85 = ${maxVolume}km`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // RÉDUCTION PAR POIDS : coureurs lourds (>85kg)
  // Impact articulaire augmenté — réduire le volume pour protéger
  // ══════════════════════════════════════════════════════════════
  if (weight && weight > 85) {
    const weightFactor = weight >= 100 ? 0.70 : weight >= 90 ? 0.80 : 0.90;
    const originalMax = maxVolume;
    maxVolume = Math.round(maxVolume * weightFactor);
    console.log(`[Periodization] Poids ${weight}kg → maxVolume ${originalMax}km × ${weightFactor} = ${maxVolume}km`);
  }

  // Garde-fou : le volume pic doit permettre de couvrir au moins 150% de la distance de course
  // (pour que la SL atteigne au moins la distance de course)
  // MAIS cappé par MAX_WEEKLY_VOLUME pour le niveau expert du type d'objectif
  // → Un ultra 400km ne peut PAS forcer un peak de 600km/sem
  const raceDistanceKm = isTrail ? (trailDistance || 10) :
    isMarathon ? 42.2 : isSemi ? 21.1 : is10k ? 10 : 5;
  const rawMinPeakVolume = Math.round(raceDistanceKm * 1.5);

  // Cap absolu : le peak ne peut jamais dépasser la limite expert du type d'objectif
  const objectiveKey = isVK ? 'VK' : isTrailSteep ? 'TrailSteep' :
    isUltraLong ? 'Trail100+' : isUltra ? 'Trail60+' : isTrail30Plus ? 'Trail30+' : isTrail ? 'Trail<30' :
    isMarathon ? 'Marathon' : isSemi ? 'Semi' : is10k ? '10K' : isPertePoids ? 'PertePoids' :
    isMaintien ? 'Maintien' : '5K';
  const absoluteCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert || 100;
  const minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap);

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
  const minStartVolume = level === 'Débutant (0-1 an)' ? 8 :
                         level === 'Intermédiaire (Régulier)' ? 15 :
                         level === 'Confirmé (Compétition)' ? 20 : 25;

  let startVolume = Math.max(idealStartVolume, minStartVolume);
  // Si le coureur a déclaré un volume actuel > 0, l'utiliser comme référence
  if (currentVolume > 0) {
    // Plancher S1 : au moins 70% du volume courant (respecter la condition physique actuelle)
    // 60% était trop bas pour les experts — un runner à 50km/sem commençait à 30km
    const currentVolumeFloor = Math.round(currentVolume * 0.70);
    startVolume = Math.max(startVolume, currentVolumeFloor);
    // Plafond S1 : on ne dépasse pas le volume courant NI 65% du pic...
    // ...SAUF si le volume courant est inférieur au minimum viable par niveau
    // (un débutant à 4km/sem a besoin d'au moins 8km pour un plan cohérent)
    // Dans ce cas on autorise le saut vers minStartVolume — c'est nécessaire pour
    // atteindre un peak suffisant sur la durée du plan.
    const volumeCap = Math.max(currentVolume, minStartVolume);
    startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
  } else {
    // Pas de volume déclaré (débutant ou non renseigné) : utiliser minStartVolume comme base
    // et plafonner à 65% du pic pour garder de la marge de progression
    startVolume = Math.min(startVolume, maxVolume * 0.65);
  }

  let currentVol = startVolume;

  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;

    if (recoveryWeeks.includes(weekNum)) {
      // Semaine de récup: -30% du volume de la semaine PRÉCÉDENTE (pas du volume projeté)
      // On utilise le dernier volume pushé, pas currentVol qui a déjà progressé
      const prevWeekVol = weeklyVolumes.length > 0 ? weeklyVolumes[weeklyVolumes.length - 1] : currentVol;
      weeklyVolumes.push(Math.round(prevWeekVol * 0.7));
    } else if (phases[i] === 'affutage') {
      // Affûtage: réduction progressive
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25); // De -25% à -50%
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      weeklyVolumes.push(Math.round(currentVol));
      currentVol = Math.min(currentVol * (1 + progressionRate), maxVolume);
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
          // -30% du volume de la semaine précédente (pas du volume projeté)
          const prevVol = i > 0 ? weeklyVolumes[i - 1] : adjustedVol;
          weeklyVolumes[i] = Math.round(prevVol * 0.7);
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
      const maxIncrease = isFromRecovery ? 0.30 : 0.15;

      if (increase > maxIncrease) {
        weeklyVolumes[i + 1] = Math.round(curr * (1 + maxIncrease));
      }
    }
  }

  return { weeklyVolumes, weeklyPhases: phases, recoveryWeeks };
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
  const effectiveLevelKey = detectLevelFromData({ ...data, vma });
  const effectiveLevelMap: Record<string, string> = {
    deb: 'Débutant (0-1 an)',
    inter: 'Intermédiaire (Régulier)',
    conf: 'Confirmé (Compétition)',
    expert: 'Expert (Performance)',
  };
  const effectiveLevel = effectiveLevelMap[effectiveLevelKey] || data.level || 'Intermédiaire (Régulier)';

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
    defaultVolume = isPertePoids ? 15 : isMaintien ? 20 : isVKCtx ? 15 : isTrailSteepCtx ? 18 : isUltra ? 35 : isTrail30Plus ? 30 : isMarathon ? 35 : isSemi ? 28 : isTrail ? 22 : 25;
  } else if (effectiveLevelKey === 'conf') {
    defaultVolume = isPertePoids ? 20 : isMaintien ? 25 : isVKCtx ? 20 : isTrailSteepCtx ? 25 : isUltra ? 50 : isTrail30Plus ? 40 : isMarathon ? 45 : isSemi ? 35 : isTrail ? 30 : 35;
  } else {
    // Expert
    defaultVolume = isPertePoids ? 25 : isMaintien ? 30 : isVKCtx ? 25 : isTrailSteepCtx ? 30 : isUltra ? 60 : isTrail30Plus ? 50 : isMarathon ? 55 : isSemi ? 40 : isTrail ? 40 : 45;
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
    modelUsed: 'gemini-2.5-flash',
  };
};

// ---------------------------------------------------------------------------
// Instructions de sécurité santé selon le profil
// ---------------------------------------------------------------------------

const buildSafetyInstructions = (data: QuestionnaireData, isBeginnerLevel: boolean): string => {
  const parts: string[] = [];
  const bmi = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : null;
  const age = data.age || 0;
  const isOverweight = bmi !== null && bmi >= 30;
  const isSenior = age >= 50;
  const isRestart = data.fitnessSubGoal === 'Reprendre après une pause' || data.lastActivity === 'Plus de 6 mois';

  parts.push(`🩺 SÉCURITÉ SANTÉ — OBLIGATOIRE
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure :
"Nous vous recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport."
- Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur.`);

  if (isOverweight) {
    parts.push(`⚠️ PROFIL NÉCESSITANT DES PRÉCAUTIONS ARTICULAIRES :
- Priorité absolue : séances à faible impact (marche rapide, marche/course alternée)
- Pas de sauts, pas de pliométrie
- Durées courtes (20-30 min max au début), augmenter très progressivement
- Surfaces souples (herbe, terre) plutôt qu'asphalte
- Volume max semaine 1 : 10-15 km (ou moins si débutant)
- Le warmup DOIT inclure 5-10 min de marche progressive
🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message.`);
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    // Calcul durée du plan
    // Cap à 30 semaines max (plans longs pour marathon/ultra/objectifs distants)
    // Si > 20 semaines, on décale le début pour que le plan finisse à la course
    let planDurationWeeks = 12;
    if (data.raceDate) {
      const raceDate = new Date(data.raceDate);
      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const diffTime = raceDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const diffWeeks = Math.ceil(diffDays / 7); // ceil pour ne jamais couper la dernière semaine
      // Cap à 30 semaines — si la course est plus loin, on décale le startDate
      const maxWeeks = 30;
      planDurationWeeks = Math.max(4, Math.min(maxWeeks, diffWeeks));
      if (diffWeeks > maxWeeks) {
        // Décaler le startDate pour que le plan finisse à la course
        const newStartDate = new Date(raceDate.getTime() - maxWeeks * 7 * 24 * 60 * 60 * 1000);
        data.startDate = newStartDate.toISOString().split('T')[0];
        console.log(`[Plan Duration] Course dans ${diffWeeks} semaines > cap ${maxWeeks} → startDate décalé au ${data.startDate}`);
      }
    }

    // === Injecter la VMA calculée dans data pour que detectLevelFromData puisse override ===
    (data as any).vma = vmaEstimate.vma;

    // === CRÉER LE CONTEXTE DE GÉNÉRATION (FIGÉ) ===
    const generationContext = createGenerationContext(
      data, paces, vmaEstimate.vma, vmaSource, planDurationWeeks
    );

    // Section des allures
    const pacesSection = `
VMA : ${paces.vmaKmh} km/h (${vmaSource})
- EF (Endurance) : ${paces.efPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récupération : ${paces.recoveryPace} min/km
`;

    // Instruction pour les jours préférés
    const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
      ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
      : 'Répartition équilibrée (ex: Mardi, Jeudi, Dimanche)';

    // Instruction blessures
    let injuryInstruction = '';
    if (data.injuries?.hasInjury && data.injuries.description) {
      injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`;
    }

    // Instruction commentaires libres du coureur
    const commentsInstruction = data.comments?.trim()
      ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}" — Prends en compte ces préférences dans la construction du plan (jours, horaires, habitudes, contraintes).`
      : '';

    // Section marche/course pour les débutants ou VMA très faible (perte de poids/maintien)
    const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
    const isPertePoidsPrev = goal.includes('Perte');
    const isMaintienPrev = goal.includes('Maintien') || goal.includes('Remise');
    const needsMarcheCourse = isBeginnerLevel || (vmaEstimate.vma < 10.5 && (isPertePoidsPrev || isMaintienPrev));
    const beginnerInstructionPreview = needsMarcheCourse ? `

🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :
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
- Chaque séance DOIT mentionner le D+ cible
` : isTrailSteepPreview ? `
🏔️ TRAIL RAIDE : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m (${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m D+/km)
⚠️ FORMAT TRAIL RAIDE — Ratio D+/km élevé. Plan spécifique :
- Volume hebdomadaire RÉDUIT par rapport à un trail classique (max 25-55km selon niveau)
- Priorité : travail en côte (côtes longues 2-5min, VMA en côte, power hiking)
- Sortie longue avec D+ progressif important — le D+ prime sur la distance
- Renforcement : quadriceps (excentrique), mollets, proprioception
- Le fractionné en côte peut commencer dès la phase fondamentale
- Chaque séance DOIT mentionner le D+ cible
` : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. Elle doit progresser vers 50-65km ou 6-8h au pic d'entraînement.
- BACK-TO-BACK OBLIGATOIRE en phase spécifique : SL samedi (longue) + sortie dimanche (modérée en fatigue). Le back-to-back simule la fatigue cumulée de l'ultra.
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL. Sur un ultra, on marche 30-50% du temps.
- RAVITAILLEMENT : les SL ≥3h doivent mentionner la stratégie nutrition (manger toutes les 30-45min, boire régulièrement).
- MATÉRIEL : s'entraîner avec le sac, les bâtons, le matériel obligatoire dès la phase développement.
- GESTION D'ALLURE : l'allure ultra est PLUS LENTE que l'EF. Prévoir des sections à 7:00-8:00 min/km.
- Chaque séance trail DOIT mentionner le D+ cible
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
` : `
🏔️ TRAIL : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
- Sortie longue avec D+ progressif, fractionné en côte
- Chaque séance trail DOIT mentionner le D+ cible
`) : '';

    // === CALCUL DE FAISABILITÉ (Preview) ===
    const hasChronoPreview = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    const feasibilityResultPreview = calculateFeasibility({
      vma: vmaEstimate.vma,
      targetTime: data.targetTime,
      distance: (data.goal === 'Trail' && data.trailDetails?.distance) ? `${data.trailDetails.distance} km` : (data.subGoal || data.distance || ''),
      goal: data.goal || '',
      level: data.level || '',
      planWeeks: planDurationWeeks,
      currentVolume: data.currentWeeklyVolume,
      currentWeeklyElevation: data.currentWeeklyElevation,
      trailElevation: data.goal === 'Trail' ? data.trailDetails?.elevation : undefined,
      trailDistance: data.goal === 'Trail' ? data.trailDetails?.distance : undefined,
      hasInjury: !!(data.injuries?.hasInjury),
      hasChrono: hasChronoPreview,
      vmaFromTarget: vmaSource.includes('Recalculée depuis objectif'),
      age: data.age,
      weight: data.weight,
      height: data.height,
      frequency: data.frequency,
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
- Niveau : ${data.level}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Date de course : ${data.raceDate || 'Non définie'}
- Fréquence : ${data.frequency} séances/semaine
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
🔴 Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne génères que la semaine 1 ici).
🔴 VOLUME S1 = ${generationContext.periodizationPlan.weeklyVolumes[0]} km MAXIMUM (somme des distances de toutes les séances running). NE PAS dépasser ce volume.
🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume hebdo. Durée minimum SL : ${minSlDurForPrompt} min.

🔴 TYPES DE SÉANCES AUTORISÉS PAR PHASE :
${(isVKPreview || isTrailSteepPreview) ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, Côtes en EF (montée marchée ou trottée). Le travail en côte modéré EST autorisé dès cette phase pour VK/Trail raide.
   - developpement : + Fractionné en côte (VMA côte, côtes courtes/longues), seuil en montée.
   - specifique : + Répétitions spécifiques course (simulation D+/km cible), allure spécifique.
   - affutage : Jogging, Sortie courte avec rappel côte, Renforcement.
   - recuperation : Jogging (footing EF plat) uniquement + Renforcement léger. PAS d'intensité.` :
`   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement. PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale.
     ⚠️ VARIÉTÉ OBLIGATOIRE en phase fondamentale : chaque footing doit avoir un thème DIFFÉRENT. Exemples :
       • "Footing en aisance respiratoire" (classique plat)
       • "Footing vallonné" (terrain avec légères côtes, toujours en EF)
       • "Footing progressif" (départ très lent, finir au haut de la zone EF)
       • "Footing nature / trail doux" (sentiers, chemins, terrain varié — pour les traileurs)
       • "Footing technique" (focus foulée, cadence, posture)
       NE PAS répéter le même intitulé ou le même format deux fois dans la même semaine.
   - developpement : + Fractionné (VMA courte, côtes), seuil court possible.
   - specifique : + Seuil long, allure spécifique course, fractionné seuil.
   - affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionné court.
   - recuperation : Jogging (footing EF) uniquement + Renforcement léger. PAS d'intensité.`}

${goal.includes('Perte') ? `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES :
Ce plan est un plan PERTE DE POIDS, PAS une préparation course. NE PAS mentionner d'allure spécifique semi/marathon/course. Les séances doivent être orientées dépense calorique et endurance.
- PAS de références à une course cible, PAS d'allure semi/marathon dans les mainSet
- Priorité : durée des séances, fréquence cardiaque en zone 2, dépense énergétique
- Séances variées : footing, marche/course, vélo, natation si pertinent` : ''}

${(!data.targetTime || data.targetTime.trim() === '') && !goal.includes('Perte') && !goal.includes('Maintien') && !goal.includes('Remise') ? `🔴 PLAN FINISHER — RÈGLES SPÉCIFIQUES :
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
2. ${data.frequency} séances sur ${data.frequency} jours DIFFÉRENTS
3. Allures EXACTES dans chaque mainSet
4. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)
5. Évaluation de faisabilité HONNÊTE avec chiffres
6. OBLIGATOIRE : 1 séance de type "Renforcement" par semaine (comptée dans les ${data.frequency} séances)
   - Répartition : ${data.frequency} séances = ${data.frequency - 1} running + 1 renfo
   - Durée : 30-45 min
   - Type dans le JSON : "Renforcement"
   - NE PAS mettre de séance "Repos" dans le plan

═══════════════════════════════════════════════════════════════
              RENFORCEMENT & TRAIL & FAISABILITÉ
═══════════════════════════════════════════════════════════════
💪 1 séance "Renforcement" obligatoire par semaine (comptée dans les ${data.frequency}).
NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance.
${trailSectionPreview}
📊 FAISABILITÉ PRÉ-CALCULÉE :
${feasibilityTextPreview}
🚨 NE PAS reformuler ce message. Le champ feasibility.message dans ton JSON DOIT être EXACTEMENT le texte ci-dessus, mot pour mot, sans changer aucun chiffre ni aucune distance. Copie-le tel quel.

${buildSafetyInstructions(data, (data.level || '').includes('Débutant'))}

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
  "distance": "${data.goal === 'Trail' && data.trailDetails ? `${data.trailDetails.distance}km D+${data.trailDetails.elevation}m` : (data.subGoal || '')}",
  "location": "${data.city || ''}",
  "suggestedLocations": [
    { "name": "Nom réel du lieu", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de séance" }
  ],
  "welcomeMessage": "Message personnalisé orienté OBJECTIF et STRUCTURE du plan (NE PAS mentionner VMA ni allures)",
  "confidenceScore": 75,
  "feasibility": {
    "status": "BON",
    "message": "Analyse avec chiffres VMA/temps théorique",
    "safetyWarning": "Conseil sécurité"
  },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Thème de la semaine",
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
          "elevationGain": 600,
          "locationSuggestion": "Lieu réel adapté à cette séance",
          "warmup": "échauffement avec allure",
          "mainSet": "corps détaillé avec allures EXACTES",
          "cooldown": "retour au calme",
          "advice": "conseil personnalisé"
        }
      ]
    }
  ]
}

RAPPEL : Génère UNIQUEMENT la semaine 1 !
`;

    console.log('[Gemini Preview] Envoi prompt optimisé...');
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: previewPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    const text = response.text();

    const plan = JSON.parse(text);

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
    const prefDays = data.preferredDays && data.preferredDays.length > 0 ? data.preferredDays : null;

    if (plan.weeks && plan.weeks[0]?.sessions) {
      // Forcer les jours préférés
      if (prefDays) {
        plan.weeks[0].sessions.forEach((session: any, idx: number) => {
          if (idx < prefDays.length && session.day !== prefDays[idx]) {
            console.log(`[Gemini Preview] Correction jour: séance ${idx + 1} "${session.day}" → "${prefDays[idx]}"`);
            session.day = prefDays[idx];
          }
        });
      }

      // Dédupliquer
      const usedDays = new Set<string>();
      plan.weeks[0].sessions.forEach((session: any, idx: number) => {
        if (usedDays.has(session.day)) {
          const pool = prefDays || DAYS_ORDER_PREV;
          const available = pool.filter((d: string) => !usedDays.has(d));
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
            level: data.level || '',
            phase: plan.weeks[0].phase || 'fondamental',
            weight: data.weight,
            height: data.height,
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
      plan.weeks.forEach((week: any) => postProcessWeekQuality(week, paces, 'Première semaine — mise en route progressive'));
      // Enforcement volumes/durées/caps déterministe
      plan.weeks.forEach((week: any, idx: number) => {
        const targetVol = generationContext.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data);
      });
      // Guard cross-semaines (affûtage, progression, re-cap)
      enforceFullPlanConstraints(plan.weeks, generationContext.periodizationPlan.weeklyVolumes, data);
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
        detectedLevel, data.currentWeeklyElevation,
      );
      console.log(`[Trail D+ Preview] S1: raceElev=${data.trailDetails.elevation}m, level=${detectedLevel}, weekTarget=${weekTarget}m, sessions=${plan.weeks[0].sessions.length}`);
      distributeElevationToSessions(plan.weeks[0].sessions, weekTarget, detectedLevel);
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
    plan.feasibility = {
      status: feasibilityResultPreview.status,
      message: feasibilityResultPreview.message,
      safetyWarning: feasibilityResultPreview.safetyWarning,
    };
    plan.confidenceScore = feasibilityResultPreview.score;

    // ─── Validation Layer 1 (rules only for preview) ───
    const { validatePlanRules } = await import('./planValidator');
    const validation = validatePlanRules(plan as TrainingPlan, data);
    if (validation.issues.length > 0) {
      console.log(`[Gemini Preview] Validation: score=${validation.score}, issues=${validation.issues.length}`);
      validation.issues.forEach((i: any) => console.log(`  [${i.severity}] S${i.weekNumber}: ${i.message}`));
    }

    // ─── Correction français par IA (non-bloquant) ───
    await correctFrenchWithAI(plan);

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
  onProgress?: (partialPlan: TrainingPlan, batchIndex: number, totalBatches: number) => void,
): Promise<TrainingPlan> => {
  if (!plan.isPreview || !plan.generationContext) {
    throw new Error('Ce plan n\'est pas en mode preview ou manque le contexte de génération');
  }

  console.log('[Gemini Remaining] Génération des semaines restantes par lots...');
  const startTime = Date.now();

  const ctx = plan.generationContext;
  const data = ctx.questionnaireSnapshot;
  const paces = ctx.paces;
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

  // Instructions spécifiques pour les débutants ou VMA très faible (progression marche/course)
  const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
  const isPertePoidsProg = (data.goal || '').includes('Perte');
  const isMaintienProg = (data.goal || '').includes('Maintien') || (data.goal || '').includes('Remise');
  const ctxVma = ctx.vma;
  const needsMarcheCourseRemaining = isBeginnerLevel || (ctxVma < 10.5 && (isPertePoidsProg || isMaintienProg));
  const beginnerProgressionInstruction = needsMarcheCourseRemaining ? `

🚶‍♂️🏃 PROGRESSION MARCHE/COURSE POUR DÉBUTANT 🚶‍♀️🏃‍♀️
Ce coureur est DÉBUTANT. Tu dois appliquer une progression d'alternance marche/course :

- Semaines 2-3 : Continuer avec "Marche/Course" - 6-8 x (2 min course + 1 min marche)
- Semaines 4-5 : Progression vers 5-6 x (3 min course + 1 min marche)
- Semaines 6-7 : Transition 3-4 x (5 min course + 1 min marche)
- Semaines 8+ : Introduction progressive du footing continu (15-25 min)
- VMA/Fractionné : PAS AVANT semaine 8-10, et uniquement sous forme de fartlek doux

⚠️ Le type "Marche/Course" doit rester dominant jusqu'à semaine 6-7 !
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
- Chaque séance DOIT mentionner le D+ cible
- elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement)
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
- Chaque séance DOIT mentionner le D+ cible
- elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement)
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
- Chaque séance trail DOIT mentionner le D+ cible dans mainSet
- elevationGain OBLIGATOIRE sur chaque séance trail (sauf Renforcement)
${data.trailDetails!.distance >= 42 ? '- Sorties longues avec ravitaillement simulé\n- Entraînement avec le matériel de course (sac, bâtons)' : ''}
${data.trailDetails!.distance >= 100 ? `- 🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE en phase spécifique (SL samedi + sortie dimanche en fatigue)
- Marche en côte (power hiking) intégrée dans les SL — sur un ultra on marche 30-50% du temps
- SL pic doit atteindre 50-65km ou 6-8h minimum
- Allure ultra PLUS LENTE que EF (7:00-8:00 min/km)
- Stratégie ravitaillement dans les SL ≥ 3h` : data.trailDetails!.distance >= 80 ? '- Back-to-back long (SL samedi + sortie dimanche)\n- Gestion effort sur très longue durée' : ''}
`) : '';

  const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const allGeneratedWeeks: any[] = [];

  // Calculer les lots de semaines à générer
  const weeksToGenerate: number[] = [];
  for (let w = 2; w <= totalWeeks; w++) {
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
- Niveau : ${data.level}
- Objectif : ${data.goal} ${data.subGoal ? `(${data.subGoal})` : ''}
- Temps visé : ${data.targetTime || 'Finisher'}
- Fréquence : ${data.frequency} séances/semaine
- Jours : ${preferredDaysInstruction}
${data.injuries?.hasInjury ? `⚠️ BLESSURE : ${data.injuries.description}` : ''}
${data.comments?.trim() ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}"` : ''}
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
💪 RENFORCEMENT : 1 séance "Renforcement" par semaine OBLIGATOIRE.
NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance au bon jour.

🔴 TYPES DE SÉANCES AUTORISÉS PAR PHASE :
${(isVKRemaining || isTrailSteepRemaining) ? `   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, Côtes en EF (montée marchée ou trottée). Le travail en côte modéré EST autorisé dès cette phase pour VK/Trail raide.
   - developpement : + Fractionné en côte (VMA côte, côtes courtes/longues), seuil en montée.
   - specifique : + Répétitions spécifiques course (simulation D+/km cible), allure spécifique.
   - affutage : Jogging, Sortie courte avec rappel côte, Renforcement.
   - recuperation : Jogging (footing EF plat) uniquement + Renforcement léger. PAS d'intensité.` :
`   - fondamental : Jogging (footing EF), Sortie Longue (EF uniquement), Renforcement. PAS de seuil, PAS de fractionné, PAS de VMA.
   - developpement : + Fractionné (VMA courte, côtes), seuil court possible.
   - specifique : + Seuil long, allure spécifique course, fractionné seuil.
   - affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionné court.
   - recuperation : Jogging (footing EF) uniquement + Renforcement léger. PAS d'intensité.`}

${isPertePoidsProg ? `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES :
Ce plan est un plan PERTE DE POIDS, PAS une préparation course. NE PAS mentionner d'allure spécifique semi/marathon/course. Les séances doivent être orientées dépense calorique et endurance.
- PAS de références à une course cible, PAS d'allure semi/marathon dans les mainSet
- Priorité : durée des séances, fréquence cardiaque en zone 2, dépense énergétique
- Séances variées : footing, marche/course, vélo, natation si pertinent` : ''}

${(!data.targetTime || data.targetTime.trim() === '') && !data.goal?.includes('Perte') && !data.goal?.includes('Maintien') && !data.goal?.includes('Remise') ? `🔴 PLAN FINISHER — RÈGLES SPÉCIFIQUES :
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
🔴 CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.
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

          // Dédupliquer les jours
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
              level: data.level || '',
              phase: week.phase || 'fondamental',
              weight: data.weight,
              height: data.height,
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

      // Ajouter au résultat global
      allGeneratedWeeks.push(...batchWeeks);
      console.log(`[Gemini Remaining] Lot ${batchIndex + 1} terminé: ${batchWeeks.length} semaines`);

      // Callback de progression : montrer les semaines au fur et à mesure
      if (onProgress) {
        const partialWeeks = [plan.weeks[0], ...allGeneratedWeeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
        onProgress(
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
          detectedLvl, data.currentWeeklyElevation, // Fix: use detectedLevel instead of data.level
        );
        distributeElevationToSessions(week.sessions, weekTarget, detectedLvl);
        console.log(`[Trail D+] S${week.weekNumber}: D+ cible = ${weekTarget}m [${detectedLvl}]`);
      });
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
        const km = parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        return sum + (km > 0 ? km : 0);
      }, 0);

    if (fullPlan.weeks && Array.isArray(fullPlan.weeks) && savedPaces) {
      fullPlan.weeks.forEach((week: any) => postProcessWeekQuality(week, savedPaces));

      // Snapshot volumes AVANT guard pour mesurer l'impact
      const beforeVolumes = fullPlan.weeks.map(_weekKm);

      // Pass 1 : Enforcement par semaine
      fullPlan.weeks.forEach((week: any, idx: number) => {
        const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
        enforceWeekConstraints(week, targetVol, data);
      });

      // Pass 2 : Guard cross-semaines
      enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);

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
        fullPlan.weeks.forEach((week: any, idx: number) => {
          const targetVol = ctx.periodizationPlan.weeklyVolumes[idx] || 0;
          enforceWeekConstraints(week, targetVol, data);
        });
        enforceFullPlanConstraints(fullPlan.weeks, ctx.periodizationPlan.weeklyVolumes, data);
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

    // ─── Correction français par IA (non-bloquant) ───
    await correctFrenchWithAI(fullPlan);

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
          Remplacer les 2-3 prochaines séances running par cross-training (vélo, natation, elliptique).
          Proposer un test de reprise : "Marche 10min, trot léger 5min, arrête si douleur."
          Conseiller FORTEMENT de consulter un médecin/kiné si douleur articulaire ou tendineuse.
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    // === FEEDBACK HISTORY (enrichi avec Strava si disponible) ===
    const feedbackHistory: string[] = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session) => {
        if (session.feedback?.completed && session.feedback.rpe) {
          let line = `S${weekIdx + 1} ${session.day} "${session.title}" (${session.type}): RPE ${session.feedback.rpe}/10`;
          if (session.feedback.notes) line += ` — "${session.feedback.notes}"`;
          // Ajouter les données Strava si disponibles
          const sd = session.feedback.stravaData;
          if (sd) {
            line += ` | Strava: ${sd.distance}km en ${sd.movingTime}min, allure ${sd.avgPace}, D+${sd.elevationGain}m${sd.avgHeartrate ? `, FC ${sd.avgHeartrate}bpm` : ''}`;
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
6. Modifie UNIQUEMENT les séances futures listées ci-dessus (max 3)
7. UTILISE les allures calculées (EF: ${paces.efPace}, Seuil: ${paces.seuilPace}, VMA: ${paces.vmaPace})
8. VARIE les formats de séance modifiée
9. Chaque advice doit être PERSONNEL et référencer l'objectif/la phase/les données Strava
`;

    console.log(`[Gemini Adaptation] Envoi prompt | objective=${objective} level=${level} phase=${currentPhase} trend=${rpeTrend ? 'ALERT' : 'OK'}`);

    // Passer le system instruction comme systemInstruction (pas en user content)
    // pour que Gemini le traite comme instructions prioritaires
    const adaptationModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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
