
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QuestionnaireData, TrainingPlan, GenerationContext, PeriodizationPhase } from "../types";
import { calculateFeasibility } from './feasibilityService';
import { buildRenfoMainSet } from './renfoService';

// --- UTILITAIRES DE CALCUL DES ALLURES ---

/**
 * Convertit un temps en secondes - gère tous les formats
 * Formats: "mm:ss", "hh:mm:ss", "Xh", "XhYY", "XX min"
 */
const timeToSeconds = (time: string): number => {
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
  
  // Format "mm:ss" ou "hh:mm:ss"
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
};

/**
 * Convertit des secondes en format "m:ss min/km"
 */
const secondsToPace = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
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
    const seconds = timeToSeconds(raceTimes.distance5km);
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
    const seconds = timeToSeconds(raceTimes.distance10km);
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
    const seconds = timeToSeconds(raceTimes.distanceHalfMarathon);
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
    const seconds = timeToSeconds(raceTimes.distanceMarathon);
    if (seconds > 0) {
      estimates.push({
        vma: calculateVMAFromTime(42.195, seconds),
        source: `Marathon en ${raceTimes.distanceMarathon}`,
        priority: 4
      });
    }
  }

  if (estimates.length === 0) return null;

  // Tri par priorité (distance courte = plus fiable)
  estimates.sort((a, b) => a.priority - b.priority);

  // Si plusieurs chronos, on fait une moyenne pondérée
  if (estimates.length >= 2) {
    const weighted = estimates.slice(0, 2);
    const avgVma = (weighted[0].vma * 0.6 + weighted[1].vma * 0.4);
    return {
      vma: avgVma,
      source: `Moyenne ${weighted[0].source} et ${weighted[1].source}`
    };
  }

  return estimates[0];
};

// --- SYSTEM INSTRUCTION EXPERT COACH ---
const SYSTEM_INSTRUCTION = `
Tu es un Coach Running Expert, bienveillant et pragmatique. Tu tutoies le coureur.
Tu crées des plans d'entraînement personnalisés, réalistes et sûrs.
Ta priorité absolue : la SANTÉ et la SÉCURITÉ du coureur. Ensuite, sa progression vers son objectif.
Tu es honnête : si un objectif est irréaliste, tu le dis clairement mais avec bienveillance et tu proposes une alternative.
TOUT est en FRANÇAIS. Ton ton est celui d'un coach passionné qui veut voir son coureur progresser sans se blesser.

PRINCIPES FONDAMENTAUX :
- Périodisation : fondamental → développement → spécifique → affûtage
- Supercompensation : jamais 2 séances dures consécutives
- Charge/décharge : 3 semaines montée → 1 semaine allégée
- Honnêteté : si un objectif est irréaliste, le dire clairement et proposer un objectif réaliste
- Réalisme : un débutant qui vise sub-3h au marathon, c'est RISQUÉ → alerter immédiatement

═══════════════════════════════════════
       ALLURES CALCULÉES (OBLIGATOIRES)
═══════════════════════════════════════

{CALCULATED_PACES}

Utilise EXACTEMENT ces allures. Format : "20 min EF ({EF_PACE} min/km)" ou "6x1000m VMA ({VMA_PACE} min/km)".

═══════════════════════════════════════
       STRUCTURE DES SÉANCES
═══════════════════════════════════════

EF (Endurance Fondamentale) : {EF_PACE} min/km | 40-70 min | Échauffement 10 min ({RECOVERY_PACE}) + corps constant + 5 min retour

SEUIL : {SEUIL_PACE} min/km | Échauffement 15-20 min EF + gammes | Corps : 20-30 min continu OU 3-5x8-10 min (récup 2-3 min trot) | Retour 10 min EF

VMA : {VMA_PACE} min/km | Échauffement 20 min EF + gammes + accélérations | Retour 10 min trot
Formats à varier chaque semaine (JAMAIS le même 2 semaines de suite) :
- Court : 10-12x200m (récup=effort) | 10x300m (récup 1'15) | 10x400m (récup 1'30)
- Moyen : 6-8x600m (récup 2') | 6x800m (récup 2'30) | 5x1000m (récup 3')
- Pyramide : 200-400-600-800-600-400-200
- Fartlek : 10x(1'/1') | 8x(1'30/1') | 30/30 : 12-15x(30"/30")
- Côtes : 8-10x45" en côte (récup descente)

SORTIE LONGUE : {EF_PACE} min/km
Variantes : pure EF | progressive (70% EF → 30% EA {EA_PACE}) | blocs spécifiques | négative | finish rapide
Durées max SL selon objectif et niveau :
- 5K : débutant 50min | intermédiaire 1h | expert 1h15
- 10K : débutant 1h | intermédiaire 1h15 | expert 1h30
- Semi : débutant 1h30 | intermédiaire 1h45 | expert 2h (avec blocs à {SEMI_PACE} en phase spé)
- Marathon : débutant 2h | intermédiaire 2h15 | expert 2h30 (avec 45-60min à {MARATHON_PACE} en phase spé) — MAX 2 SL ≥ 30km dans tout le plan
- Trail <30km : débutant 1h30 | intermédiaire 2h | expert 2h30
- Trail 30-60km : débutant 2h | intermédiaire 2h30-3h | expert 3h-3h30
- Trail 60km+ : intermédiaire 3h-4h | expert 4h-5h (SL en durée, pas en km pour les trails)
- Perte de poids : débutant 45min | intermédiaire 1h | expert 1h15
- Maintien : débutant 50min | intermédiaire 1h10 | expert 1h30
⚠️ La SL max n'est atteinte que 1-2 fois dans le plan (en phase spécifique). Les autres SL sont 70-85% de cette durée max.

COMPLÉMENTAIRES : Footing récup ({RECOVERY_PACE}) | EA ({EA_PACE}) | EF + accélérations | Côtes

═══════════════════════════════════════
       RENFORCEMENT MUSCULAIRE
═══════════════════════════════════════

1 séance "Renforcement" par semaine OBLIGATOIRE, comptée dans la fréquence (ex: 4 séances = 3 running + 1 renfo).
Type JSON : "Renforcement" | Durée : 30-45 min selon niveau.
NE PAS générer le contenu de la séance renfo — le code le fera automatiquement.
Place simplement la séance au bon jour (pas la veille d'une VMA ou compétition, idéal après EF).

{TRAIL_SECTION}

{BEGINNER_WALK_RUN_SECTION}

═══════════════════════════════════════
       VARIÉTÉ OBLIGATOIRE
═══════════════════════════════════════

Chaque semaine DOIT être différente. JAMAIS le même format VMA, SL ou Seuil 2 semaines de suite.
Titres de séances : uniques et motivants (pas de titres génériques).
Conseils (advice) : uniques, personnalisés, jamais dupliqués.

═══════════════════════════════════════
       PÉRIODISATION
═══════════════════════════════════════

Phases dans l'ordre :
1. "fondamental" (30%) — EF dominante, VMA légère
2. "developpement" (35%) — VMA + Seuil progressifs
3. "specifique" (25%) — Allure course, blocs spécifiques
4. "affutage" (10%) — Volume réduit, intensité maintenue
+ Semaines "recuperation" toutes les 3-4 semaines (-30% volume)

Par objectif COURSE SUR ROUTE :
┌─────────┬───────────────────────────────────────────────────────────────────────────────────┐
│ 5K      │ VMA+++ dominante, Seuil secondaire                                              │
│         │ Volume pic : 25km (déb) / 40km (inter) / 60km (expert)                          │
│         │ Max séance running : 12km (déb) / 18km (inter) / 25km (expert)                  │
│         │ 3-4 SL dans le plan, dernière SL max en phase spé                                │
├─────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ 10K     │ VMA + Seuil équilibrés                                                           │
│         │ Volume pic : 30km (déb) / 50km (inter) / 65km (expert)                          │
│         │ Max séance running : 15km (déb) / 22km (inter) / 28km (expert)                  │
│         │ 4-5 SL, dernières SL avec blocs à allure spé 10K                                │
├─────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ Semi    │ Seuil+++ dominante, VMA secondaire                                               │
│         │ Volume pic : 35km (déb) / 55km (inter) / 70km (expert)                          │
│         │ Max séance running : 18km (déb) / 22km (inter) / 28km (expert)                  │
│         │ 4-6 SL, 2-3 SL avec blocs à {SEMI_PACE} en phase spé                           │
├─────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ Marathon│ Volume+++ dominante, Seuil en phase spé                                          │
│         │ Volume pic : 45km (déb) / 65km (inter) / 85km (expert)                          │
│         │ Max séance running : 25km (déb) / 32km (inter) / 38km (expert)                  │
│         │ 6-8 SL, 2-3 SL avec blocs à {MARATHON_PACE}, MAX 2 SL ≥ 30km dans tout le plan │
└─────────┴───────────────────────────────────────────────────────────────────────────────────┘

Par objectif TRAIL :
┌──────────────┬────────────────────────────────────────────────────────────────────────────────┐
│ Trail <30km  │ Similaire Semi + D+ progressif + technique descente                           │
│              │ Volume pic : 35km (déb) / 50km (inter) / 65km (expert)                        │
│              │ Cadrage D+ : 50% → 100% du D+ course au fil des semaines                      │
│              │ elevationGain OBLIGATOIRE sur chaque séance trail (sauf Renfo)                 │
├──────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Trail 30-60km│ Volume + Seuil + D+ | SL longues en durée (2h-3h30)                           │
│              │ Volume pic : 45km (déb) / 60km (inter) / 80km (expert)                        │
│              │ SL exprimées en DURÉE (pas en km), avec D+ cible                              │
├──────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Trail 60km+  │ Ultra : volume+++, back-to-back SL, nutrition, gestion mentale                │
│(Ultra)       │ Volume pic : 55km (inter) / 80km (expert) / 100+km (expert ultra)            │
│              │ SL max 3h-5h en durée, back-to-back obligatoire en phase spé                  │
│              │ Haut du corps pour les bâtons, force-endurance                                 │
└──────────────┴────────────────────────────────────────────────────────────────────────────────┘

PERTE DE POIDS :
- Fréquence : 2-3 running + 1 renfo (circuit adapté au profil)
- Pas de VMA intense les 4 premières semaines — EF + marche/course
- Volume pic : 20km (déb) / 30km (inter) / 45km (expert)
- Max séance : 8km (déb) / 12km (inter) / 15km (expert)
- SL max 45min (déb) / 1h (inter) / 1h15 (expert)
- Conseils nutrition et hydratation dans chaque advice
- Séances courtes et régulières > longues et rares

MAINTIEN EN FORME / REMISE EN FORME :
- Programme doux et équilibré : 2-3 running + 1 renfo
- Pas de phase spécifique, pas d'affûtage — progression linéaire douce
- Volume pic : 25km (déb) / 40km (inter) / 55km (expert)
- Max séance : 10km (déb) / 15km (inter) / 18km (expert)
- Variété : footing, EF, SL courte, fartlek ludique
- Ton motivant, focus sur le plaisir de courir

═══════════════════════════════════════
       JOURS & BLESSURES
═══════════════════════════════════════

{PREFERRED_DAYS_INSTRUCTION}
{INJURY_INSTRUCTION}

═══════════════════════════════════════
       PROGRESSION
═══════════════════════════════════════

Volume S1 = {CURRENT_VOLUME} km/sem.
Progression hebdomadaire STRICTE :
- Débutant : +5%/sem, max +3km absolus par semaine
- Intermédiaire : +8%/sem, max +5km absolus par semaine
- Confirmé : +10%/sem, max +7km absolus par semaine
- Expert : +12%/sem, max +8km absolus par semaine

Récupération : toutes les 3-4 sem, -25 à -30% volume, "isRecoveryWeek": true.
Affûtage : J-14 → -25% vol | J-7 → -50% vol | J-2 footing léger ou repos.
Max 2 séances "Difficile"/semaine. Jamais 2 VMA ou Seuil consécutives.
Chaque séance DOIT avoir : warmup (échauffement), mainSet (corps détaillé avec allures en min/km), cooldown (retour au calme).
Toutes les allures TOUJOURS exprimées en min/km (ex: "5:30 min/km"), jamais en km/h.

═══════════════════════════════════════
       FAISABILITÉ
═══════════════════════════════════════

{FEASIBILITY_RESULT}
Reformule ce résultat de faisabilité de façon naturelle et bienveillante dans feasibility.message.
Sois honnête et concret avec des chiffres (VMA, temps théorique, écart).
Si le statut est RISQUÉ, sois DIRECT mais BIENVEILLANT : explique pourquoi c'est risqué, propose un objectif réaliste.
Exemple : "Avec ta VMA de 12 km/h, viser 3h au marathon nécessiterait une VMA de ~17 km/h. C'est un écart trop important pour cette préparation. Je te propose plutôt de viser 4h30-5h, ce qui est déjà un bel objectif pour un premier marathon !"
TOUT EN FRANÇAIS, ton de coach bienveillant qui tutoie.

═══════════════════════════════════════
       CONSEILS PAR SÉANCE
═══════════════════════════════════════

Le champ "advice" est un message PERSONNEL du coach. Règles :
- Personnalise : mentionne l'objectif, adapte au niveau, référence la phase
- Contextualise la séance dans le plan (pourquoi cette séance est importante)
- Motive authentiquement (pas de "Courage !" ou "Bonne séance !")
- Conseils pratiques : hydratation, nutrition, terrain, mental
- Varie le ton : encouragement / technique / stratégie selon la séance

═══════════════════════════════════════
       WELCOME MESSAGE
═══════════════════════════════════════

Le welcomeMessage est la 1ère chose vue par le coureur (TUTOIEMENT obligatoire) :
- Reformule son objectif clairement
- Décris la structure du plan (phases, progression)
- Mot de motivation personnalisé et authentique (pas de "Courage !" générique)
- Ton bienveillant et enthousiaste, comme un coach qui accueille un nouvel athlète
- NE PAS inclure VMA ni allures (affichées séparément)
- TOUT EN FRANÇAIS

═══════════════════════════════════════
       FORMAT JSON
═══════════════════════════════════════

{
  "name": "Nom incluant objectif",
  "goal": "Objectif",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "durationWeeks": X,
  "sessionsPerWeek": X,
  "location": "Ville",
  "targetTime": "hh:mm:ss",
  "distance": "10 km / Semi-Marathon / Marathon",
  "welcomeMessage": "Message personnalisé",
  "confidenceScore": 75,
  "feasibility": { "status": "EXCELLENT|BON|AMBITIEUX|RISQUÉ", "message": "Analyse concrète", "safetyWarning": "Conseil sécurité" },
  "suggestedLocations": [{ "name": "Lieu réel", "type": "PARK|TRACK|NATURE|HILL", "description": "Usage" }],
  "weeks": [{
    "weekNumber": 1,
    "theme": "Thème court de la semaine",
    "weekGoal": "Explication du rôle de cette semaine dans ta préparation et ce qu'on cherche à développer",
    "phase": "fondamental|developpement|specifique|affutage|recuperation",
    "isRecoveryWeek": false,
    "sessions": [{
      "day": "Lundi",
      "type": "Jogging|Fractionné|Sortie Longue|Renforcement|Récupération",
      "title": "Titre UNIQUE et motivant",
      "duration": "50 min",
      "distance": "8 km",
      "intensity": "Facile|Modéré|Difficile",
      "targetPace": "5:45 min/km",
      "elevationGain": 0,
      "locationSuggestion": "Lieu réel adapté",
      "warmup": "10 min footing léger à X:XX min/km + gammes éducatives",
      "mainSet": "Corps DÉTAILLÉ — CHAQUE bloc avec allure EXACTE en min/km",
      "cooldown": "10 min retour au calme à X:XX min/km + étirements",
      "advice": "Conseil PERSONNEL et UNIQUE du coach pour cette séance"
    }]
  }]
}

═══════════════════════════════════════
       VÉRIFICATION FINALE
═══════════════════════════════════════

Pas de séance "Repos" — les jours off sont implicites.

🚨 RÈGLES ABSOLUES POUR CHAQUE SÉANCE (sauf Renforcement) :
1. warmup : TOUJOURS présent, avec allure en min/km (ex: "10 min à 7:00 min/km")
2. mainSet : TOUJOURS avec allures EXACTES en min/km pour CHAQUE bloc (JAMAIS "allure modérée" → toujours "à 5:30 min/km")
3. cooldown : TOUJOURS présent, avec allure en min/km
4. targetPace : TOUJOURS rempli (allure principale de la séance en min/km)
5. advice : TOUJOURS un conseil UNIQUE et PERSONNEL du coach, jamais dupliqué entre séances
6. weekGoal : TOUJOURS une explication de ce que cette semaine apporte à la préparation globale

✅ TOUT en français, tutoiement, ton de coach bienveillant et exigeant
✅ Allures EXCLUSIVEMENT en min/km (JAMAIS en km/h)
✅ Variété : aucun format VMA/SL/Seuil dupliqué d'une semaine à l'autre
✅ Progression logique + récupération toutes les 3-4 semaines
✅ Faisabilité honnête avec chiffres
`;

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("Clé API Gemini manquante (VITE_GEMINI_API_KEY).");
    throw new Error("Clé API Gemini non configurée.");
  }
  return key;
};

// ============================================
// CALCUL DU PLAN DE PÉRIODISATION
// ============================================

/**
 * Pré-calcule le plan de périodisation complet.
 * Ce plan est FIGÉ et utilisé pour générer chaque semaine avec cohérence totale.
 */
const calculatePeriodizationPlan = (
  totalWeeks: number,
  currentVolume: number,
  level: string,
  goal: string
): { weeklyVolumes: number[]; weeklyPhases: PeriodizationPhase[]; recoveryWeeks: number[] } => {

  // Taux de progression selon niveau
  const progressionRate = level === 'Débutant (0-1 an)' ? 0.05 :
                          level === 'Intermédiaire (Régulier)' ? 0.08 :
                          level === 'Confirmé (Compétition)' ? 0.10 : 0.12;

  // Répartition des phases selon durée du plan
  const phases: PeriodizationPhase[] = [];
  const fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.30));
  const developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
  const specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
  const affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);

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
  const recoveryWeeks: number[] = [];
  const recoveryInterval = level === 'Débutant (0-1 an)' ? 3 : 4;
  for (let i = recoveryInterval; i <= totalWeeks - 2; i += recoveryInterval) {
    recoveryWeeks.push(i);
    phases[i - 1] = 'recuperation'; // 0-indexed
  }

  // Calculer les volumes hebdomadaires
  const weeklyVolumes: number[] = [];
  let currentVol = currentVolume;

  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;

    if (recoveryWeeks.includes(weekNum)) {
      // Semaine de récup: -30% du volume précédent
      weeklyVolumes.push(Math.round(currentVol * 0.7));
    } else if (phases[i] === 'affutage') {
      // Affûtage: réduction progressive
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25); // De -25% à -50%
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      // Progression normale
      weeklyVolumes.push(Math.round(currentVol));
      currentVol = currentVol * (1 + progressionRate);
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

  let defaultVolume: number;
  if (data.level === 'Débutant (0-1 an)') {
    defaultVolume = isPertePoids ? 10 : isMaintien ? 12 : 15;
  } else if (data.level === 'Intermédiaire (Régulier)') {
    defaultVolume = isPertePoids ? 15 : isMaintien ? 20 : 25;
  } else if (data.level === 'Confirmé (Compétition)') {
    defaultVolume = isPertePoids ? 20 : isMaintien ? 25 : 35;
  } else {
    // Expert
    defaultVolume = isPertePoids ? 25 : isMaintien ? 30 : 45;
  }

  // Si le coureur déclare 0 ou ne renseigne pas, on utilise le default
  // Si le coureur déclare un volume > 0 mais très bas pour son niveau, on respecte SA déclaration
  const currentVolume = (declaredVolume && declaredVolume > 0) ? declaredVolume : defaultVolume;

  const periodizationPlan = calculatePeriodizationPlan(
    totalWeeks,
    currentVolume,
    data.level || 'Intermédiaire (Régulier)',
    data.goal || ''
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
    questionnaireSnapshot: { ...data },
    generatedAt: new Date().toISOString(),
    modelUsed: 'gemini-2.0-flash',
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

export const generateTrainingPlan = async (data: QuestionnaireData): Promise<TrainingPlan> => {
  console.log('[Gemini] Début génération plan');

  try {
    const apiKey = getApiKey();
    console.log('[Gemini] Données questionnaire:', JSON.stringify(data, null, 2));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // === CALCUL DES ALLURES ===
    let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
    let paces: TrainingPaces;
    let vmaSource: string;

    if (vmaEstimate) {
      paces = calculateAllPaces(vmaEstimate.vma);
      vmaSource = vmaEstimate.source;
      console.log(`[Gemini] VMA calculée: ${vmaEstimate.vma.toFixed(1)} km/h depuis ${vmaSource}`);
    } else {
      // Estimation par défaut selon le niveau
      let defaultVma: number;
      switch (data.level) {
        case 'Débutant (0-1 an)':
          defaultVma = 11.0;
          break;
        case 'Intermédiaire (Régulier)':
          defaultVma = 13.5;
          break;
        case 'Confirmé (Compétition)':
          defaultVma = 15.5;
          break;
        case 'Expert (Performance)':
          defaultVma = 17.5;
          break;
        default:
          defaultVma = 12.5;
      }
      paces = calculateAllPaces(defaultVma);
      vmaSource = `Estimation basée sur niveau ${data.level}`;
      console.log(`[Gemini] VMA estimée par défaut: ${defaultVma} km/h`);
    }

    // Calcul durée du plan si date de course
    let planDurationWeeks = 12; // Par défaut
    if (data.raceDate) {
      const raceDate = new Date(data.raceDate);
      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const diffTime = raceDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const diffWeeks = Math.ceil(diffDays / 7); // ceil pour ne jamais couper la dernière semaine
      planDurationWeeks = Math.max(4, Math.min(20, diffWeeks));
    }

    // === CONSTRUCTION DU PROMPT ===
    const pacesSection = `
═══════════════════════════════════════════════════════════════
        🎯 ALLURES CALCULÉES POUR CE COUREUR 🎯
        (Basées sur: ${vmaSource})
═══════════════════════════════════════════════════════════════

📊 VMA ESTIMÉE : ${paces.vmaKmh} km/h

┌─────────────────────────┬────────────────┬─────────────────────────────┐
│ Zone                    │ Allure         │ Utilisation                 │
├─────────────────────────┼────────────────┼─────────────────────────────┤
│ 🔵 Récupération (60%)   │ ${paces.recoveryPace} min/km  │ Récup entre fractions       │
│ 🟢 EF - End. Fond (67%) │ ${paces.efPace} min/km  │ Footings, échauffements     │
│ 🟡 EA - End. Active (77%)│ ${paces.eaPace} min/km  │ Finitions SL, tempo doux    │
│ 🟠 SEUIL (87%)          │ ${paces.seuilPace} min/km  │ Séances seuil               │
│ 🔴 VMA (100%)           │ ${paces.vmaPace} min/km  │ Fractionné                  │
├─────────────────────────┼────────────────┼─────────────────────────────┤
│ Allure spé 5km (95%)    │ ${paces.allureSpecifique5k} min/km  │ Si objectif 5km             │
│ Allure spé 10km (90%)   │ ${paces.allureSpecifique10k} min/km  │ Si objectif 10km            │
│ Allure spé Semi (85%)   │ ${paces.allureSpecifiqueSemi} min/km  │ Si objectif semi            │
│ Allure spé Marathon (80%)│ ${paces.allureSpecifiqueMarathon} min/km  │ Si objectif marathon        │
└─────────────────────────┴────────────────┴─────────────────────────────┘

⚠️ TU DOIS UTILISER CES ALLURES EXACTES DANS TOUT LE PLAN !
`;

    // === INSTRUCTIONS DYNAMIQUES PERSONNALISÉES ===

    // Instruction pour les jours préférés
    const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
      ? `Les séances DOIVENT être placées sur ces jours UNIQUEMENT : ${data.preferredDays.join(', ')}. C'est OBLIGATOIRE.`
      : 'Le coureur n\'a pas indiqué de jours préférés. Répartis les séances de façon équilibrée (ex: Mardi, Jeudi, Dimanche).';

    // Instruction pour les blessures
    let injuryInstruction = 'Aucune blessure signalée. Plan standard.';
    if (data.injuries?.hasInjury && data.injuries.description) {
      const injury = data.injuries.description.toLowerCase();
      injuryInstruction = `
⚠️ BLESSURE SIGNALÉE : "${data.injuries.description}"

ADAPTATIONS OBLIGATOIRES :
${injury.includes('genou') || injury.includes('genoux') ? `
- ÉVITER les descentes rapides et les séances avec beaucoup de sauts
- PRIVILÉGIER le plat ou les montées douces
- RÉDUIRE le volume de course de 15-20%
- AJOUTER du renforcement quadriceps/ischio-jambiers` : ''}
${injury.includes('tendon') || injury.includes('achille') ? `
- ÉVITER les séances de côtes et VMA en montée
- ÉCHAUFFEMENT prolongé (+5 min) obligatoire
- PRIVILÉGIER les surfaces souples (herbe, chemin)
- PAS de fractionné court (200m, 300m) - préférer 600m+ avec récup longue` : ''}
${injury.includes('dos') || injury.includes('lombaire') ? `
- ÉVITER les sorties longues > 1h30 sans pause
- AJOUTER du gainage à chaque séance
- PRIVILÉGIER les surfaces régulières` : ''}
${injury.includes('cheville') || injury.includes('pied') ? `
- ÉVITER les terrains accidentés
- PRIVILÉGIER route ou piste
- PAS de fartlek en nature` : ''}
${!injury.includes('genou') && !injury.includes('tendon') && !injury.includes('dos') && !injury.includes('cheville') ? `
- Adapter les séances en fonction de la gêne ressentie
- RÉDUIRE l'intensité si douleur pendant l'effort
- Consulter un professionnel de santé si persistant` : ''}
`;
    }

    // Volume actuel pour calcul de progression
    const currentVolume = data.currentWeeklyVolume || (
      data.level === 'Débutant (0-1 an)' ? 15 :
      data.level === 'Intermédiaire (Régulier)' ? 30 :
      data.level === 'Confirmé (Compétition)' ? 45 : 60
    );

    // Section ALTERNANCE MARCHE/COURSE pour les débutants
    const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
    const beginnerWalkRunSection = isBeginnerLevel ? `
═══════════════════════════════════════════════════════════════
        🚶‍♂️🏃 ALTERNANCE MARCHE/COURSE - DÉBUTANTS 🚶‍♀️🏃‍♀️
═══════════════════════════════════════════════════════════════

🚨 RÈGLE OBLIGATOIRE POUR LES DÉBUTANTS (niveau "Débutant 0-1 an") :

Les premières semaines du plan DOIVENT inclure des séances en ALTERNANCE MARCHE/COURSE.
C'est la méthode utilisée par TOUS les programmes reconnus (Couch to 5K, etc.).

📋 STRUCTURE TYPE "MARCHE/COURSE" :
- Type de séance : "Marche/Course" (utiliser ce type exact dans le JSON)
- Durée totale : 25-40 min selon la semaine
- Échauffement : 5 min de marche rapide

📈 PROGRESSION RECOMMANDÉE (adapter selon le nombre de semaines) :

Semaines 1-2 (Phase d'adaptation) :
- 8-10 x (1 min course + 2 min marche)
- Total effort : 8-10 min de course fractionnée
- Objectif : S'habituer à courir sans essoufflement excessif

Semaines 3-4 (Augmentation course) :
- 6-8 x (2 min course + 1 min marche)
- Total effort : 12-16 min de course fractionnée
- Objectif : Allonger les périodes de course

Semaines 5-6 (Réduction marche) :
- 5-6 x (3 min course + 1 min marche)
- OU 4 x (4 min course + 1 min marche)
- Total effort : 15-20 min de course

Semaines 7-8 (Transition) :
- 3-4 x (5 min course + 1 min marche)
- OU 2 x (8-10 min course + 2 min marche)
- Objectif : Blocs de course plus longs

Semaines 9+ (Course continue) :
- Transition vers footing continu de 20-30 min
- Marche autorisée si besoin, mais pas programmée
- Introduction progressive de vraies séances EF

⚠️ POINTS CRITIQUES :
1. CHAQUE semaine 1-4 doit avoir AU MOINS 2 séances "Marche/Course"
2. L'allure de course pendant les phases de course = allure EF ({EF_PACE} min/km) ou plus lent
3. NE PAS proposer de fractionné VMA avant la semaine 6-8 minimum
4. La "Sortie Longue" d'un débutant S1-S4 = séance Marche/Course plus longue (35-40 min)
5. Conseils = TOUJOURS encourageants et rappeler que la marche fait partie du programme

📝 FORMAT MAINSET POUR MARCHE/COURSE :
Exemple semaine 1 : "10 x (1 min de course légère + 2 min de marche active). Allure course : aisée, tu dois pouvoir parler."
Exemple semaine 4 : "6 x (3 min de course à {EF_PACE} min/km + 1 min de marche). Si tu te sens bien, le dernier bloc peut être 4 min."

💡 CONSEILS SPÉCIFIQUES DÉBUTANT (pour le champ "advice") :
- "La marche n'est pas une faiblesse, c'est une technique d'entraînement utilisée même par des marathoniens !"
- "Ton corps s'adapte à chaque séance. D'ici quelques semaines, ces intervalles te sembleront faciles."
- "Concentre-toi sur la régularité : 3 séances cette semaine valent mieux qu'une grosse séance isolée."
- "Si tu finis sans être épuisé(e), c'est parfait. L'objectif est de progresser, pas de souffrir."
` : '';

    // === SECTION TRAIL DYNAMIQUE ===
    const trailSection = data.goal === 'Trail' && data.trailDetails ? `
═══════════════════════════════════════
       SPÉCIFICITÉS TRAIL
═══════════════════════════════════════
Distance course : ${data.trailDetails.distance} km | D+ : ${data.trailDetails.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m/km

Séances spécifiques trail :
- Sortie longue avec D+ progressif (50% → 100% du D+ course au fil des semaines)
- Fractionné en côte : côtes courtes (30-45") et longues (2-5 min)
- Travail technique descente : foulée courte, fréquence élevée
- Chaque séance trail DOIT mentionner le D+ cible dans mainSet
${data.trailDetails.distance >= 42 ? '- Sorties longues avec ravitaillement simulé\n- Entraînement avec le matériel de course (sac, bâtons)' : ''}
${data.trailDetails.distance >= 80 ? '- Back-to-back long (SL samedi + sortie dimanche)\n- Gestion effort sur très longue durée' : ''}
` : '';

    // === CALCUL DE FAISABILITÉ (DÉTERMINISTE) ===
    const hasChrono = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    const feasibilityResult = calculateFeasibility({
      vma: paces.vma,
      targetTime: data.targetTime,
      distance: data.subGoal || '',
      goal: data.goal || '',
      level: data.level || '',
      planWeeks: planDurationWeeks,
      currentVolume: data.currentWeeklyVolume,
      currentWeeklyElevation: data.currentWeeklyElevation,
      trailElevation: data.trailDetails?.elevation,
      trailDistance: data.trailDetails?.distance,
      hasInjury: !!(data.injuries?.hasInjury),
      hasChrono,
      age: data.age,
      weight: data.weight,
      height: data.height,
    });
    const feasibilityText = `Score : ${feasibilityResult.score}/100 | Statut : ${feasibilityResult.status}
${feasibilityResult.message}
${feasibilityResult.safetyWarning ? `Sécurité : ${feasibilityResult.safetyWarning}` : ''}
${feasibilityResult.alternativeTarget ? `Objectif alternatif suggéré : ${feasibilityResult.alternativeTarget}` : ''}`;

    // Remplacer les placeholders dans le system instruction
    let systemWithPaces = SYSTEM_INSTRUCTION
      .replace('{CALCULATED_PACES}', pacesSection)
      .replace(/{EF_PACE}/g, paces.efPace)
      .replace(/{EA_PACE}/g, paces.eaPace)
      .replace(/{SEUIL_PACE}/g, paces.seuilPace)
      .replace(/{VMA_PACE}/g, paces.vmaPace)
      .replace(/{RECOVERY_PACE}/g, paces.recoveryPace)
      .replace(/{SEMI_PACE}/g, paces.allureSpecifiqueSemi)
      .replace(/{MARATHON_PACE}/g, paces.allureSpecifiqueMarathon)
      .replace('{PREFERRED_DAYS_INSTRUCTION}', preferredDaysInstruction)
      .replace('{INJURY_INSTRUCTION}', injuryInstruction)
      .replace('{CURRENT_VOLUME}', String(currentVolume))
      .replace('{BEGINNER_WALK_RUN_SECTION}', beginnerWalkRunSection)
      .replace('{TRAIL_SECTION}', trailSection)
      .replace('{FEASIBILITY_RESULT}', feasibilityText);

    const userPrompt = `
═══════════════════════════════════════════════════════════════
              PROFIL COMPLET DU COUREUR
═══════════════════════════════════════════════════════════════

👤 DONNÉES PERSONNELLES (usage INTERNE uniquement — NE JAMAIS mentionner poids/taille/IMC au coureur) :
- Sexe : ${data.sex || 'Non renseigné'}
- Âge : ${data.age || 'Non renseigné'} ans
- Poids : ${data.weight ? `${data.weight} kg` : 'Non renseigné'}
- Taille : ${data.height ? `${data.height} cm` : 'Non renseigné'}

🏃 NIVEAU & EXPÉRIENCE :
- Niveau : ${data.level}
- Volume actuel : ${data.currentWeeklyVolume ? `${data.currentWeeklyVolume} km/semaine` : 'Non renseigné'}
${data.currentWeeklyVolume ? `⚠️ RÈGLE VOLUME DE DÉPART — ADAPTE selon le cas :
${data.currentWeeklyVolume >= 30 ? `- Volume actuel SOLIDE (${data.currentWeeklyVolume}km) : semaine 1 = ${data.currentWeeklyVolume} à ${Math.round(data.currentWeeklyVolume * 1.1)}km max. Progression +5-10%/semaine.` : data.currentWeeklyVolume >= 15 ? `- Volume actuel MODÉRÉ (${data.currentWeeklyVolume}km) : semaine 1 = ${data.currentWeeklyVolume} à ${Math.round(data.currentWeeklyVolume * 1.15)}km max. Progression +10-15%/semaine acceptable.` : data.currentWeeklyVolume > 0 ? `- Volume actuel FAIBLE (${data.currentWeeklyVolume}km) : semaine 1 = ${Math.max(data.currentWeeklyVolume, 10)} à ${Math.round(Math.max(data.currentWeeklyVolume, 10) * 1.2)}km. Progression +15-20%/semaine acceptable au début car la base est basse.` : `- Volume actuel NUL : commencer par de la marche/course, semaine 1 = 8-12km max (dont marche). Progression libre les 3-4 premières semaines.`}
- JAMAIS de saut > +20% d'une semaine à l'autre une fois passé les 30km/semaine.
- Prévoir une semaine de récupération (-30% volume) toutes les 3-4 semaines.` : ''}
${data.currentWeeklyElevation ? `- Dénivelé actuel : ${data.currentWeeklyElevation} m D+/semaine` : ''}
${data.trailDetails ? `
🏔️ DÉTAILS TRAIL DE LA COURSE CIBLE :
- Distance course : ${data.trailDetails.distance} km
- Dénivelé positif course : ${data.trailDetails.elevation} m D+
- Ratio D+/km : ${Math.round(data.trailDetails.elevation / data.trailDetails.distance)} m/km

⚠️ OBLIGATIONS TRAIL BASÉES SUR CES DONNÉES :
- Le D+ total en entraînement doit PROGRESSER vers le D+ de la course (${data.trailDetails.elevation}m)
- Semaines 1-4 : D+ par sortie longue = 50-60% du D+ course (${Math.round(data.trailDetails.elevation * 0.55)}m)
- Semaines 5-8 : D+ par sortie longue = 70-80% (${Math.round(data.trailDetails.elevation * 0.75)}m)
- Semaines 9+ : D+ par sortie longue = 85-100% (${Math.round(data.trailDetails.elevation * 0.9)}m)
- CHAQUE séance trail DOIT mentionner le D+ cible dans le mainSet
- Chaque séance de fractionné en côte DOIT indiquer le D+ total de la séance
` : ''}

📊 CHRONOS DE RÉFÉRENCE :
- 5 km : ${data.recentRaceTimes?.distance5km || 'Non renseigné'}
- 10 km : ${data.recentRaceTimes?.distance10km || 'Non renseigné'}
- Semi-marathon : ${data.recentRaceTimes?.distanceHalfMarathon || 'Non renseigné'}
- Marathon : ${data.recentRaceTimes?.distanceMarathon || 'Non renseigné'}

🎯 OBJECTIF :
- Type : ${data.goal}
- Sous-objectif/Distance : ${data.subGoal || 'Non précisé'}
- Date de course : ${data.raceDate || 'Non définie'}
- Temps visé : ${data.targetTime || 'Finisher'}

📅 DISPONIBILITÉ :
- Fréquence : ${data.frequency} séances/semaine
- Jours préférés : ${data.preferredDays?.length ? data.preferredDays.join(', ') : 'Flexibles'}
- Date de début : ${data.startDate || new Date().toISOString().split('T')[0]}
- Durée du plan : ${planDurationWeeks} semaines

📍 LOCALISATION : ${data.city || 'Non renseignée'}
${data.city ? `
🗺️ LIEUX D'ENTRAÎNEMENT (suggestedLocations) :
Tu DOIS proposer 2-3 lieux RÉELS à ${data.city} ou dans ses environs proches :
- Recherche des parcs, pistes d'athlétisme, forêts ou sentiers CONNUS de cette ville
- Exemples pour Paris : Bois de Vincennes, Parc Montsouris, Jardin du Luxembourg, Stade Charléty
- Exemples pour Lyon : Parc de la Tête d'Or, Berges du Rhône, Parc de Gerland
- Exemples pour Bordeaux : Parc bordelais, Berges de la Garonne, Parc de Majolan
- Pour chaque lieu, indique le type (PARK, TRACK, NATURE, HILL) et pour quel type de séance il convient
- Si tu ne connais pas de lieux spécifiques, propose des types génériques : "Parc municipal", "Piste d'athlétisme locale"

📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE si ville renseignée :
Chaque séance DOIT avoir un champ "locationSuggestion" avec un lieu RÉEL et PRÉCIS de ${data.city} adapté aux EXIGENCES de la séance.

🎯 RÈGLE CLÉ : le lieu doit correspondre au CONTENU de la séance, pas juste au type générique.

MATCHING LIEU ↔ SÉANCE :
- Fractionné VMA / Vitesse (répétitions courtes, 200m-400m) → PISTE D'ATHLÉTISME obligatoire (surface plane, distances balisées). Ex: "Piste d'athlétisme Charléty" ou "Stade [nom local]"
- Fractionné Seuil / Tempo (blocs longs 8-15 min) → chemin plat régulier, berges, voie verte. Ex: "Berges du Canal du Midi" ou "Voie verte de [nom]"
- Séance avec D+ (elevationGain > 0) → lieu avec VRAI dénivelé à proximité : collines, forêts pentues, parcs vallonnés. Ex: "Colline de Fourvière", "Forêt de Meudon", "Parc des Buttes-Chaumont"
- Sortie Longue route (sans D+) → grand parc, boucle longue, berges de fleuve. Ex: "Bois de Vincennes", "Tour du Lac d'Annecy"
- Sortie Longue Trail (avec D+) → forêt/montagne avec sentiers. Ex: "Forêt de Fontainebleau", "Mont Ventoux versant Bédoin"
- Footing / Récupération → parc agréable au sol souple, berges calmes. Ex: "Parc de la Tête d'Or", "Jardin du Luxembourg"
- Renforcement → "À la maison" ou "Salle de sport"

⚠️ COHÉRENCE D+ ↔ LIEU : si une séance a elevationGain: 500, le lieu DOIT avoir du dénivelé réel. NE PAS suggérer un parc plat pour une séance de côtes.
⚠️ VARIER les lieux au fil des semaines pour éviter la monotonie.
⚠️ Si tu ne connais pas de lieu précis, décris le type nécessaire : "Stade avec piste d'athlétisme", "Colline ou sentier pentu près de ${data.city}".
` : ''}

⚠️ BLESSURES :
${data.injuries?.hasInjury
  ? `🔴 BLESSURE : ${data.injuries.description} → ADAPTER LE PLAN !`
  : '✅ Aucune blessure'}

💬 COMMENTAIRES : "${data.comments || 'Aucun'}"

═══════════════════════════════════════════════════════════════
              ALLURES À UTILISER (CALCULÉES)
═══════════════════════════════════════════════════════════════
${pacesSection}

═══════════════════════════════════════════════════════════════
          🚨🚨🚨 RÈGLES ABSOLUES NON-NÉGOCIABLES 🚨🚨🚨
═══════════════════════════════════════════════════════════════

🔴 NOMBRE DE SEMAINES = ${planDurationWeeks} semaines. PAS ${planDurationWeeks - 1}, PAS ${planDurationWeeks + 1}. EXACTEMENT ${planDurationWeeks}.
🔴 NOMBRE DE SÉANCES PAR SEMAINE = ${data.frequency}. CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.
🔴 JOURS DES SÉANCES = ${data.preferredDays?.length ? data.preferredDays.join(', ') + '. CES JOURS ET UNIQUEMENT CES JOURS.' : 'Répartition équilibrée.'}

═══════════════════════════════════════════════════════════════
              INSTRUCTIONS SPÉCIFIQUES
═══════════════════════════════════════════════════════════════

1. UTILISE EXACTEMENT les allures ci-dessus dans chaque séance
2. Mentionne TOUJOURS l'allure en min/km après chaque bloc
3. Structure CHAQUE séance avec échauffement + corps + retour au calme
4. VARIE les formats : JAMAIS 2 séances VMA identiques, JAMAIS 2 SL identiques, JAMAIS 2 séances seuil identiques d'une semaine à l'autre
5. Inclus une semaine de récupération toutes les 3-4 semaines (-30% volume)
6. Prévois l'affûtage si la course est dans les 2 dernières semaines
7. Chaque conseil (advice) doit être UNIQUE, PERSONNEL et référencer l'objectif du coureur

📊 ÉVALUE LA FAISABILITÉ AVEC HONNÊTETÉ :
- Compare le temps visé (${data.targetTime || 'Finisher'}) avec le temps THÉORIQUE calculable depuis la VMA
- SOIS CRITIQUE : si l'écart est grand, dis-le clairement avec des chiffres
- Si l'objectif est irréaliste, PROPOSE un objectif alternatif cohérent
- Score de confiance : EXCEL (85-100), BON (70-84), AMBITIEUX (55-69), RISQUÉ (<55)
- Le message DOIT contenir des chiffres : VMA, temps théorique, écart en %

⚠️ CONSEIL DE SÉCURITÉ (safetyWarning) :
- NE JAMAIS mentionner l'IMC, le poids, la corpulence ou la morphologie
- Privilégie des conseils pratiques de sécurité sportive :
  * Si c'est un premier marathon/semi : "Nous te recommandons de valider ce programme avec ton médecin, surtout pour un premier marathon."
  * Si débutant : "Pense à consulter un médecin pour un certificat d'aptitude avant de débuter."
  * Si objectif ambitieux : "Écoute ton corps à chaque séance. En cas de douleur articulaire persistante, consulte un professionnel de santé."
  * Si blessure signalée : "Fais valider la reprise avec ton kiné/médecin avant d'intensifier."
  * Sinon : "Hydrate-toi bien, échauffe-toi avant chaque séance et n'hésite pas à consulter en cas de gêne inhabituelle."

🏃 MESSAGE DE BIENVENUE (welcomeMessage) :
Ce message est la PREMIÈRE chose que le coureur voit. Il doit se sentir pris en charge par un vrai coach.

INCLUS OBLIGATOIREMENT :
- Son prénom si dispo dans les commentaires
- Son OBJECTIF clairement reformulé (ex: "Tu vises un marathon en 3h45 dans 12 semaines")
- La STRUCTURE du plan : comment les semaines sont organisées pour atteindre cet objectif
  (ex: "Les 4 premières semaines vont construire ta base aérobie, puis on intensifiera progressivement avec du travail au seuil...")
- Un mot de motivation PERSONNALISÉ selon son profil

NE PAS INCLURE :
- La VMA ou les allures (elles seront affichées dans un encadré séparé)
- LIMC ou le poids
`;

    console.log("[Gemini] Envoi du prompt...");

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemWithPaces }, { text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const response = await result.response;
    const text = response.text();
    console.log("[Gemini] Réponse reçue");

    try {
      const plan = JSON.parse(text);

      // Ajout des métadonnées
      plan.id = Date.now().toString();
      plan.createdAt = new Date().toISOString();

      // Stocker la VMA calculée pour traçabilité
      plan.calculatedVMA = vmaEstimate?.vma || paces.vma;

      // Ajouter les allures calculées au plan
      plan.vma = paces.vma;
      plan.vmaSource = vmaEstimate?.source || "Estimation basée sur le niveau";
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

      // Initialiser le log d'adaptations (limite 2/semaine)
      plan.adaptationLog = {
        weekNumber: 0,
        adaptationsThisWeek: 0,
        adaptationHistory: []
      };

      // === VALIDATION ET CORRECTION POST-GÉNÉRATION ===
      const DAYS_ORDER_POST = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const preferredDays = data.preferredDays && data.preferredDays.length > 0 ? data.preferredDays : null;

      // 1. Correction du nombre de semaines
      if (plan.weeks && Array.isArray(plan.weeks)) {
        if (plan.weeks.length < planDurationWeeks) {
          console.warn(`[Gemini] Plan a ${plan.weeks.length} semaines au lieu de ${planDurationWeeks} — manque des semaines`);
        } else if (plan.weeks.length > planDurationWeeks) {
          console.warn(`[Gemini] Plan a ${plan.weeks.length} semaines, tronqué à ${planDurationWeeks}`);
          plan.weeks = plan.weeks.slice(0, planDurationWeeks);
        }
        // Renuméroter les semaines
        plan.weeks.forEach((week: any, idx: number) => {
          week.weekNumber = idx + 1;
        });
      }

      // 2. Correction des jours et du nombre de séances par semaine
      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any) => {
          if (!week.sessions || !Array.isArray(week.sessions)) return;

          // 2a. Forcer les jours préférés si spécifiés
          if (preferredDays && preferredDays.length > 0) {
            week.sessions.forEach((session: any, idx: number) => {
              if (idx < preferredDays.length) {
                const correctDay = preferredDays[idx];
                if (session.day !== correctDay) {
                  console.log(`[Gemini] Correction jour: S${week.weekNumber} séance ${idx + 1} "${session.day}" → "${correctDay}"`);
                  session.day = correctDay;
                }
              }
            });
          }

          // 2b. Dédupliquer les jours (au cas où)
          const usedDays = new Set<string>();
          week.sessions.forEach((session: any, sessionIndex: number) => {
            if (usedDays.has(session.day)) {
              const pool = preferredDays || DAYS_ORDER_POST;
              const available = pool.filter((d: string) => !usedDays.has(d));
              if (available.length > 0) {
                session.day = available[0];
                console.log(`[Gemini] Correction doublon: S${week.weekNumber} séance ${sessionIndex + 1} → "${session.day}"`);
              }
            }
            usedDays.add(session.day);
          });

          // 2c. Ajuster le nombre de séances à la fréquence demandée
          if (week.sessions.length < data.frequency) {
            console.warn(`[Gemini] S${week.weekNumber}: ${week.sessions.length} séances au lieu de ${data.frequency} — séances manquantes`);
            // On ne peut pas inventer des séances en code, mais on log l'erreur
          } else if (week.sessions.length > data.frequency) {
            console.warn(`[Gemini] S${week.weekNumber}: ${week.sessions.length} séances au lieu de ${data.frequency} — tronqué`);
            week.sessions = week.sessions.slice(0, data.frequency);
          }

          // 2d. Trier les sessions par ordre des jours
          week.sessions.sort((a: any, b: any) =>
            DAYS_ORDER_POST.indexOf(a.day) - DAYS_ORDER_POST.indexOf(b.day)
          );
        });
      }

      // 3. Forcer durationWeeks et sessionsPerWeek dans le plan
      plan.durationWeeks = planDurationWeeks;
      plan.sessionsPerWeek = data.frequency;

      // 4. Génération d'IDs UNIQUES pour les sessions
      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any, weekIndex: number) => {
          if (week.sessions && Array.isArray(week.sessions)) {
            week.sessions.forEach((session: any, sessionIndex: number) => {
              session.id = `w${week.weekNumber || weekIndex + 1}-s${sessionIndex + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            });
          }
        });
      }

      // 5. Injection déterministe du contenu renfo (remplace le contenu Gemini)
      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any) => {
          if (!week.sessions || !Array.isArray(week.sessions)) return;
          week.sessions.forEach((session: any) => {
            if (session.type === 'Renforcement') {
              const renfo = buildRenfoMainSet({
                weekNumber: week.weekNumber,
                goal: data.goal || '',
                subGoal: data.subGoal,
                trailDistance: data.trailDetails?.distance,
                level: data.level || '',
                phase: week.phase || 'fondamental',
                weight: data.weight,
                height: data.height,
              });
              session.mainSet = renfo.mainSet;
              session.warmup = renfo.warmup;
              session.cooldown = renfo.cooldown;
              session.duration = renfo.duration;
              session.title = renfo.title;
            }
          });
        });
      }

      // 6. Post-processing : validation qualité de chaque séance
      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any) => {
          // Assurer weekGoal si manquant
          if (!week.weekGoal && week.theme) {
            week.weekGoal = week.theme;
          }
          if (!week.weekGoal) {
            const phaseLabels: Record<string, string> = {
              fondamental: 'Construction de la base aérobie',
              developpement: 'Développement des qualités de vitesse',
              specifique: 'Travail à allure course',
              affutage: 'Réduction du volume, maintien de la forme',
              recuperation: 'Semaine de récupération active',
            };
            week.weekGoal = phaseLabels[week.phase] || 'Progression régulière';
          }
          if (week.sessions && Array.isArray(week.sessions)) {
            week.sessions.forEach((session: any) => {
              if (session.type === 'Renforcement') return;
              // Warmup par défaut si vide
              if (!session.warmup || session.warmup.trim().length < 5) {
                session.warmup = paces
                  ? `10 min de footing léger à ${paces.recoveryPace} min/km + gammes éducatives`
                  : '10 min de footing léger + gammes éducatives';
              }
              // Cooldown par défaut si vide
              if (!session.cooldown || session.cooldown.trim().length < 5) {
                session.cooldown = paces
                  ? `10 min de retour au calme à ${paces.recoveryPace} min/km + étirements`
                  : '10 min de retour au calme + étirements';
              }
              // Allure : injecter si absente du mainSet
              if (paces && session.mainSet && !session.mainSet.includes('min/km')) {
                const paceMap: Record<string, string> = {
                  'Jogging': paces.efPace,
                  'Récupération': paces.recoveryPace,
                  'Sortie Longue': paces.efPace,
                  'Marche/Course': paces.recoveryPace,
                };
                const defaultPace = paceMap[session.type];
                if (defaultPace) {
                  session.mainSet = session.mainSet + ` (allure : ${defaultPace} min/km)`;
                }
              }
              // targetPace : remplir si vide
              if (!session.targetPace && paces) {
                const paceForType: Record<string, string> = {
                  'Jogging': paces.efPace,
                  'Récupération': paces.recoveryPace,
                  'Sortie Longue': paces.efPace,
                  'Marche/Course': paces.recoveryPace,
                  'Fractionné': paces.vmaPace,
                };
                session.targetPace = paceForType[session.type] || paces.efPace;
              }
            });
          }
        });
      }

      // 7. Injection de la faisabilité calculée par code
      if (feasibilityResult) {
        plan.feasibility = {
          status: feasibilityResult.status,
          message: plan.feasibility?.message || feasibilityResult.message,
          safetyWarning: feasibilityResult.safetyWarning,
        };
        plan.confidenceScore = feasibilityResult.score;
      }

      return plan;
    } catch (e) {
      console.error("Erreur parsing JSON Gemini:", e);
      console.error("Réponse brute:", text);
      throw new Error("Format de réponse invalide de l'IA.");
    }

  } catch (error) {
    console.error("Erreur service Gemini:", error);
    throw error;
  }
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

    // Calcul durée du plan
    let planDurationWeeks = 12;
    if (data.raceDate) {
      const raceDate = new Date(data.raceDate);
      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const diffTime = raceDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const diffWeeks = Math.ceil(diffDays / 7); // ceil pour ne jamais couper la dernière semaine
      planDurationWeeks = Math.max(4, Math.min(20, diffWeeks));
    }

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

    // Section marche/course pour les débutants
    const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
    const beginnerInstructionPreview = isBeginnerLevel ? `

🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :
- Type de séance : "Marche/Course" (OBLIGATOIRE pour au moins 2 séances sur ${data.frequency})
- Format semaine 1 : 8-10 x (1 min course légère + 2 min marche active)
- Pas de VMA, pas de fractionné intense
` : '';

    // === SECTION TRAIL DYNAMIQUE (Preview) ===
    const trailSectionPreview = data.goal === 'Trail' && data.trailDetails ? `
🏔️ TRAIL : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
- Sortie longue avec D+ progressif, fractionné en côte
- Chaque séance trail DOIT mentionner le D+ cible
` : '';

    // === CALCUL DE FAISABILITÉ (Preview) ===
    const hasChronoPreview = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
    const feasibilityResultPreview = calculateFeasibility({
      vma: vmaEstimate.vma,
      targetTime: data.targetTime,
      distance: data.subGoal || '',
      goal: data.goal || '',
      level: data.level || '',
      planWeeks: planDurationWeeks,
      currentVolume: data.currentWeeklyVolume,
      currentWeeklyElevation: data.currentWeeklyElevation,
      trailElevation: data.trailDetails?.elevation,
      trailDistance: data.trailDetails?.distance,
      hasInjury: !!(data.injuries?.hasInjury),
      hasChrono: hasChronoPreview,
      age: data.age,
      weight: data.weight,
      height: data.height,
    });
    const feasibilityTextPreview = `Score : ${feasibilityResultPreview.score}/100 | Statut : ${feasibilityResultPreview.status}
${feasibilityResultPreview.message}
${feasibilityResultPreview.alternativeTarget ? `Objectif alternatif : ${feasibilityResultPreview.alternativeTarget}` : ''}`;

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
Reformule cette faisabilité dans feasibility.message de façon naturelle et coach.

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
  "distance": "${data.subGoal || ''}",
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

    // === Injection déterministe du contenu renfo (Preview) ===
    if (plan.weeks && plan.weeks[0]?.sessions) {
      plan.weeks[0].sessions.forEach((session: any) => {
        if (session.type === 'Renforcement') {
          const renfo = buildRenfoMainSet({
            weekNumber: 1,
            goal: data.goal || '',
            subGoal: data.subGoal,
            trailDistance: data.trailDetails?.distance,
            level: data.level || '',
            phase: plan.weeks[0].phase || 'fondamental',
            weight: data.weight,
            height: data.height,
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
      plan.weeks.forEach((week: any) => {
        if (!week.weekGoal && week.theme) week.weekGoal = week.theme;
        if (!week.weekGoal) week.weekGoal = 'Première semaine — mise en route progressive';
        if (week.sessions && Array.isArray(week.sessions)) {
          week.sessions.forEach((session: any) => {
            if (session.type === 'Renforcement') return;
            if (!session.warmup || session.warmup.trim().length < 5) {
              session.warmup = `10 min de footing léger à ${paces.recoveryPace} min/km + gammes éducatives`;
            }
            if (!session.cooldown || session.cooldown.trim().length < 5) {
              session.cooldown = `10 min de retour au calme à ${paces.recoveryPace} min/km + étirements`;
            }
            if (session.mainSet && !session.mainSet.includes('min/km')) {
              const paceMap: Record<string, string> = { 'Jogging': paces.efPace, 'Récupération': paces.recoveryPace, 'Sortie Longue': paces.efPace, 'Marche/Course': paces.recoveryPace };
              const p = paceMap[session.type];
              if (p) session.mainSet += ` (allure : ${p} min/km)`;
            }
            if (!session.targetPace) {
              const paceForType: Record<string, string> = { 'Jogging': paces.efPace, 'Récupération': paces.recoveryPace, 'Sortie Longue': paces.efPace, 'Marche/Course': paces.recoveryPace, 'Fractionné': paces.vmaPace };
              session.targetPace = paceForType[session.type] || paces.efPace;
            }
          });
        }
      });
    }

    // === Injection de la faisabilité calculée ===
    plan.feasibility = {
      status: feasibilityResultPreview.status,
      message: plan.feasibility?.message || feasibilityResultPreview.message,
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
export const generateRemainingWeeks = async (plan: TrainingPlan): Promise<TrainingPlan> => {
  if (!plan.isPreview || !plan.generationContext) {
    throw new Error('Ce plan n\'est pas en mode preview ou manque le contexte de génération');
  }

  console.log('[Gemini Remaining] Génération des semaines restantes par lots...');
  const startTime = Date.now();

  const ctx = plan.generationContext;
  const data = ctx.questionnaireSnapshot;
  const paces = ctx.paces;
  const totalWeeks = ctx.periodizationPlan.totalWeeks;
  const BATCH_SIZE = 3; // Nombre de semaines par lot

  // Résumé de la semaine 1 pour contexte
  const week1Summary = plan.weeks[0].sessions.map(s =>
    `${s.day}: ${s.title} (${s.type}, ${s.duration})`
  ).join('\n');

  // Instructions pour les jours
  const preferredDaysInstruction = data.preferredDays && data.preferredDays.length > 0
    ? `Séances UNIQUEMENT sur : ${data.preferredDays.join(', ')}`
    : 'Répartition équilibrée';

  // Instructions spécifiques pour les débutants (progression marche/course)
  const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
  const beginnerProgressionInstruction = isBeginnerLevel ? `

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
  const isTrailRemaining = data.goal === 'Trail' && data.trailDetails;
  const trailSectionRemaining = isTrailRemaining ? `
═══════════════════════════════════════
       SPÉCIFICITÉS TRAIL
═══════════════════════════════════════
Distance course : ${data.trailDetails!.distance} km | D+ : ${data.trailDetails!.elevation} m
Ratio D+/km : ${Math.round(data.trailDetails!.elevation / data.trailDetails!.distance)} m/km

Séances spécifiques trail :
- Sortie longue avec D+ progressif (50% → 100% du D+ course au fil des semaines)
- Fractionné en côte : côtes courtes (30-45") et longues (2-5 min)
- Travail technique descente : foulée courte, fréquence élevée
- Chaque séance trail DOIT mentionner le D+ cible dans mainSet
- elevationGain OBLIGATOIRE sur chaque séance trail (sauf Renforcement)
${data.trailDetails!.distance >= 42 ? '- Sorties longues avec ravitaillement simulé\n- Entraînement avec le matériel de course (sac, bâtons)' : ''}
${data.trailDetails!.distance >= 80 ? '- Back-to-back long (SL samedi + sortie dimanche)\n- Gestion effort sur très longue durée' : ''}
` : '';

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
`;

      // Appel API avec retry
      let batchWeeks: any[] = [];
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: batchPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 8192
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
          console.error(`[Gemini Remaining] Erreur parsing lot ${batchIndex + 1}, tentative ${retryCount + 1}:`, parseError.message);
          retryCount++;
          if (retryCount > maxRetries) {
            throw new Error(`Échec de génération après ${maxRetries} tentatives: ${parseError.message}`);
          }
          // Attendre un peu avant de retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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

      // Ajouter au résultat global
      allGeneratedWeeks.push(...batchWeeks);
      console.log(`[Gemini Remaining] Lot ${batchIndex + 1} terminé: ${batchWeeks.length} semaines`);
    }

    // Trier les semaines par numéro pour être sûr
    allGeneratedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

    // === Injection déterministe du contenu renfo (Remaining) ===
    allGeneratedWeeks.forEach((week: any) => {
      if (!week.sessions || !Array.isArray(week.sessions)) return;
      week.sessions.forEach((session: any) => {
        if (session.type === 'Renforcement') {
          const renfo = buildRenfoMainSet({
            weekNumber: week.weekNumber,
            goal: data.goal || '',
            subGoal: data.subGoal,
            trailDistance: data.trailDetails?.distance,
            level: data.level || '',
            phase: week.phase || 'fondamental',
            weight: data.weight,
            height: data.height,
          });
          session.mainSet = renfo.mainSet;
          session.warmup = renfo.warmup;
          session.cooldown = renfo.cooldown;
          session.duration = renfo.duration;
          session.title = renfo.title;
        }
      });
    });

    // === Enforcement D+ trail (post-processing déterministe) ===
    if (isTrailRemaining && data.trailDetails) {
      const raceElevation = data.trailDetails.elevation;
      allGeneratedWeeks.forEach((week: any) => {
        if (!week.sessions || !Array.isArray(week.sessions)) return;
        // Calculate expected D+ progression: 50% → 100% over training weeks
        const progress = Math.min(1, 0.5 + (0.5 * (week.weekNumber - 1) / (totalWeeks - 1)));
        const weekTargetElevation = Math.round(raceElevation * progress);

        // Check if Gemini provided elevationGain on trail sessions
        const trailSessions = week.sessions.filter(
          (s: any) => s.type !== 'Renforcement',
        );
        const totalProvidedElev = trailSessions.reduce(
          (sum: number, s: any) => sum + (s.elevationGain || 0), 0,
        );

        // If Gemini didn't provide elevationGain or it's way off, distribute it
        if (totalProvidedElev === 0 || totalProvidedElev < weekTargetElevation * 0.3) {
          // Distribute D+ across trail sessions: SL gets 60-70%, rest split evenly
          const sortieIndex = trailSessions.findIndex((s: any) => s.type === 'Sortie Longue');
          const slShare = 0.65;
          const slElevation = Math.round(weekTargetElevation * slShare);
          const remainingElev = weekTargetElevation - slElevation;
          const otherCount = trailSessions.length - (sortieIndex >= 0 ? 1 : 0);
          const perSessionElev = otherCount > 0 ? Math.round(remainingElev / otherCount) : 0;

          trailSessions.forEach((session: any) => {
            if (session.type === 'Sortie Longue') {
              session.elevationGain = slElevation;
            } else if (session.type === 'Récupération') {
              session.elevationGain = Math.round(perSessionElev * 0.3); // Récup = très peu de D+
            } else {
              session.elevationGain = perSessionElev;
            }
          });
          console.log(`[Trail D+] S${week.weekNumber}: D+ distribué = ${weekTargetElevation}m (${Math.round(progress * 100)}%)`);
        } else if (totalProvidedElev < weekTargetElevation * 0.6) {
          // Gemini provided some elevation but too low — scale up proportionally
          const scaleFactor = weekTargetElevation / totalProvidedElev;
          trailSessions.forEach((session: any) => {
            if (session.elevationGain) {
              session.elevationGain = Math.round(session.elevationGain * scaleFactor);
            }
          });
          console.log(`[Trail D+] S${week.weekNumber}: D+ mis à l'échelle x${scaleFactor.toFixed(1)} → ${weekTargetElevation}m`);
        }
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
    if (fullPlan.weeks && Array.isArray(fullPlan.weeks) && savedPaces) {
      const phaseLabels: Record<string, string> = {
        fondamental: 'Construction de la base aérobie',
        developpement: 'Développement des qualités de vitesse',
        specifique: 'Travail à allure course — phase clé de la préparation',
        affutage: 'Réduction du volume, maintien des acquis avant la course',
        recuperation: 'Semaine de récupération active — recharger les batteries',
      };
      fullPlan.weeks.forEach((week: any) => {
        if (!week.weekGoal && week.theme) week.weekGoal = week.theme;
        if (!week.weekGoal) week.weekGoal = phaseLabels[week.phase] || 'Progression régulière';
        if (week.sessions && Array.isArray(week.sessions)) {
          week.sessions.forEach((session: any) => {
            if (session.type === 'Renforcement') return;
            if (!session.warmup || session.warmup.trim().length < 5) {
              session.warmup = `10 min de footing léger à ${savedPaces.recoveryPace} min/km + gammes éducatives`;
            }
            if (!session.cooldown || session.cooldown.trim().length < 5) {
              session.cooldown = `10 min de retour au calme à ${savedPaces.recoveryPace} min/km + étirements`;
            }
            if (session.mainSet && !session.mainSet.includes('min/km')) {
              const paceMap: Record<string, string> = { 'Jogging': savedPaces.efPace, 'Récupération': savedPaces.recoveryPace, 'Sortie Longue': savedPaces.efPace, 'Marche/Course': savedPaces.recoveryPace };
              const p = paceMap[session.type];
              if (p) session.mainSet += ` (allure : ${p} min/km)`;
            }
            if (!session.targetPace) {
              const paceForType: Record<string, string> = { 'Jogging': savedPaces.efPace, 'Récupération': savedPaces.recoveryPace, 'Sortie Longue': savedPaces.efPace, 'Marche/Course': savedPaces.recoveryPace, 'Fractionné': savedPaces.vmaPace };
              session.targetPace = paceForType[session.type] || savedPaces.efPace;
            }
          });
        }
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

      if (aiReview) {
        console.log(`[PlanValidator] AI score: ${aiReview.overallScore}/100`);
      }
      console.log(`[PlanValidator] Final: score=${validation.score}/100, issues=${validation.issues.length}`);
    } catch (validationError) {
      console.warn('[PlanValidator] Validation failed, using plan as-is:', validationError);
    }

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
Tu es un Coach Running Expert diplômé avec 15 ans d'expérience. Un coureur de ton groupe
te donne son feedback sur une séance récente. Tu réagis comme un VRAI coach qui connaît
personnellement ce coureur, son objectif et son historique.

═══════════════════════════════════════════════════════════════
              🚨 RÈGLE ABSOLUE : COHÉRENCE DES ALLURES 🚨
═══════════════════════════════════════════════════════════════

Les allures du coureur ont été CALCULÉES MATHÉMATIQUEMENT.
Même lors d'une adaptation, tu DOIS utiliser CES ALLURES comme référence.

{CALCULATED_PACES}

⚠️ IMPORTANT :
- Si tu allèges une séance, tu peux réduire le VOLUME (durée, répétitions)
- MAIS les allures de BASE restent les mêmes (EF, Seuil, VMA)
- Exception : tu peux ralentir de 5-15 sec/km TEMPORAIREMENT si RPE > 8

═══════════════════════════════════════════════════════════════
              PHILOSOPHIE D'ADAPTATION
═══════════════════════════════════════════════════════════════

🎯 RÈGLE D'OR : L'objectif final ({GOAL} {TARGET_TIME}) est INTOUCHABLE.
Tu ajustes UNIQUEMENT la méthode pour y arriver, pas la destination.

Les allures calculées sont basées sur la VMA du coureur ({VMA_VALUE} km/h).
Ces allures garantissent l'atteinte de l'objectif si le plan est suivi.

Tu es HONNÊTE : si le feedback montre que le coureur souffre trop, tu adaptes intelligemment
tout en gardant le cap sur l'objectif. Si le feedback montre que c'est trop facile, tu peux
augmenter légèrement la charge sans modifier les allures de référence.

═══════════════════════════════════════════════════════════════
              RÈGLES STRICTES D'ADAPTATION
═══════════════════════════════════════════════════════════════

✅ CE QUE TU PEUX MODIFIER :
- Durée des séances (-10 à -25%)
- Nombre de répétitions (ex: 8x400m → 6x400m)
- Temps de récupération entre fractions (augmenter)
- Distance de la sortie longue (-10 à -20%)
- Ajouter une journée de repos si épuisement
- Remplacer un format de VMA par un format plus adapté (ex: 8x400m → 6x600m)

⚠️ CE QUE TU PEUX FAIRE AVEC PRÉCAUTION :
- Ralentir l'allure de 5-10 sec/km SI RPE > 8 (TEMPORAIRE, 1-2 séances max)
- Remplacer une séance intense par du footing EF si grosse fatigue

❌ CE QUE TU NE PEUX JAMAIS FAIRE :
- Modifier l'objectif ou le temps visé
- Changer les allures de référence de façon permanente
- Supprimer complètement un type de séance du plan
- Modifier plus de 3 séances futures

═══════════════════════════════════════════════════════════════
              MATRICE D'ADAPTATION PAR RPE
═══════════════════════════════════════════════════════════════

RPE 1-4 (Trop facile) :
→ Possible légère augmentation de volume (+5-10%)
→ Ou ajouter quelques accélérations en fin de footing
→ Les allures restent IDENTIQUES
→ Encourager : "Super forme ! On en profite pour renforcer la base."

RPE 5-6 (Zone optimale) :
→ Aucun changement nécessaire
→ Le plan fonctionne parfaitement
→ Encourager : "Pile dans la cible ! C'est exactement l'effort qu'on recherche."

RPE 7-8 (Difficile mais gérable) :
→ Alléger la prochaine séance similaire de 10-15%
→ Augmenter récupération entre fractions
→ Les allures de base restent identiques
→ Rassurer : "C'est normal que ce soit exigeant, on construit ta forme."

RPE 9-10 (Trop dur / Épuisement) :
→ Alléger de 20-25% les 2-3 prochaines séances
→ Possibilité de ralentir TEMPORAIREMENT de 5-10 sec/km
→ Ajouter un jour de repos si nécessaire
→ Vérifier signes de surentraînement
→ Conseiller : "On lève le pied intelligemment. Mieux vaut arriver en forme au jour J."

═══════════════════════════════════════════════════════════════
              🔄 VARIÉTÉ DANS LES MODIFICATIONS
═══════════════════════════════════════════════════════════════

Quand tu modifies une séance, profite-en pour VARIER le format :
- Si la séance originale est 8x400m, ne la remplace pas juste par 6x400m
  → Propose plutôt un format différent : Fartlek 8x(1'vite/1'trot) ou Pyramide 200-400-600-400-200
- Garde la variété pour maintenir la motivation du coureur
- Chaque séance modifiée doit avoir un titre UNIQUE et motivant

═══════════════════════════════════════════════════════════════
              💬 PERSONNALISATION DES MESSAGES
═══════════════════════════════════════════════════════════════

Tes messages (coachNote, adaptationSummary, advice des séances modifiées) doivent :
1. Référencer l'OBJECTIF du coureur : "Pour ton {GOAL}..."
2. Prendre en compte son NIVEAU et son RESSENTI exprimé
3. Expliquer le POURQUOI de chaque modification
4. Donner un conseil PRATIQUE pour la prochaine séance modifiée
5. Être motivant de façon AUTHENTIQUE (pas de phrases creuses)

❌ "Bonne continuation !"
✅ "Tu as bien géré cette séance exigeante. J'allège légèrement jeudi pour que tu récupères
    bien avant la sortie longue de dimanche — c'est elle la séance clé cette semaine pour ton semi."

═══════════════════════════════════════════════════════════════
              FORMAT JSON DE RÉPONSE
═══════════════════════════════════════════════════════════════

{
  "adaptationSummary": "Résumé clair en 2-3 phrases de ce qui change et POURQUOI",
  "objectiveReminder": "Rappel personnalisé de l'objectif avec encouragement contextuel",
  "pacesReminder": "Tes allures de référence restent : EF {EF_PACE}, Seuil {SEUIL_PACE}, VMA {VMA_PACE}",
  "modifications": [
    {
      "weekNumber": X,
      "sessionIndex": X,
      "originalTitle": "Titre original de la séance",
      "changes": {
        "duration": "nouvelle durée si modifiée",
        "mainSet": "nouveau contenu DÉTAILLÉ avec allures EXACTES et format VARIÉ",
        "targetPace": "allure cible si modifiée",
        "elevationGain": "D+ en mètres si modifié (Trail uniquement)",
        "advice": "Conseil PERSONNEL du coach : référence l'objectif, explique pourquoi cette modif, et donne un conseil pratique"
      },
      "reason": "Explication technique de pourquoi cette modification (lien avec la physiologie et l'objectif)"
    }
  ],
  "coachNote": "Message motivant PERSONNALISÉ qui mentionne l'objectif du coureur et contextualise les changements dans le plan global"
}
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // === RECALCUL DES ALLURES POUR MAINTENIR LA COHÉRENCE ===
    let vmaEstimate = getBestVMAEstimate(questionnaireData.recentRaceTimes);
    let paces: TrainingPaces;
    let vmaSource: string;

    if (vmaEstimate) {
      paces = calculateAllPaces(vmaEstimate.vma);
      vmaSource = vmaEstimate.source;
      console.log(`[Gemini Adaptation] VMA recalculée: ${vmaEstimate.vma.toFixed(1)} km/h depuis ${vmaSource}`);
    } else {
      // Estimation par défaut selon le niveau
      let defaultVma: number;
      switch (questionnaireData.level) {
        case 'Débutant (0-1 an)':
          defaultVma = 11.0;
          break;
        case 'Intermédiaire (Régulier)':
          defaultVma = 13.5;
          break;
        case 'Confirmé (Compétition)':
          defaultVma = 15.5;
          break;
        case 'Expert (Performance)':
          defaultVma = 17.5;
          break;
        default:
          defaultVma = 12.5;
      }
      paces = calculateAllPaces(defaultVma);
      vmaSource = `Estimation niveau ${questionnaireData.level}`;
      console.log(`[Gemini Adaptation] VMA estimée par défaut: ${defaultVma} km/h`);
    }

    // Section des allures calculées pour l'adaptation
    const pacesSection = `
┌─────────────────────────┬────────────────┐
│ Zone                    │ Allure         │
├─────────────────────────┼────────────────┤
│ 🟢 EF (Endurance)       │ ${paces.efPace} min/km  │
│ 🟡 EA (Active)          │ ${paces.eaPace} min/km  │
│ 🟠 SEUIL                │ ${paces.seuilPace} min/km  │
│ 🔴 VMA                  │ ${paces.vmaPace} min/km  │
│ 🔵 Récupération         │ ${paces.recoveryPace} min/km  │
└─────────────────────────┴────────────────┘
`;

    // Remplacer les placeholders dans le system instruction
    let systemWithContext = ADAPTATION_SYSTEM_INSTRUCTION
      .replace('{CALCULATED_PACES}', pacesSection)
      .replace(/{GOAL}/g, plan.goal || 'ton objectif')
      .replace(/{TARGET_TIME}/g, plan.targetTime ? `en ${plan.targetTime}` : '')
      .replace(/{VMA_VALUE}/g, paces.vmaKmh)
      .replace(/{EF_PACE}/g, paces.efPace)
      .replace(/{EA_PACE}/g, paces.eaPace)
      .replace(/{SEUIL_PACE}/g, paces.seuilPace)
      .replace(/{VMA_PACE}/g, paces.vmaPace);

    // Construire un résumé des séances futures pour contexte
    const upcomingSessions: string[] = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session, sessionIdx) => {
        if (!session.feedback?.completed) {
          upcomingSessions.push(`S${weekIdx + 1}-${sessionIdx + 1}: ${session.day} - ${session.title} (${session.type}, ${session.duration})`);
        }
      });
    });

    // Calculer le nombre de semaines restantes avant la course
    let weeksRemaining = plan.durationWeeks;
    if (plan.raceDate) {
      const raceDate = new Date(plan.raceDate);
      const today = new Date();
      const diffTime = raceDate.getTime() - today.getTime();
      weeksRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
    }

    // Récupérer l'historique des feedbacks précédents
    const feedbackHistory: string[] = [];
    plan.weeks.forEach((week, weekIdx) => {
      week.sessions.forEach((session) => {
        if (session.feedback?.completed && session.feedback.rpe) {
          feedbackHistory.push(`S${weekIdx + 1} ${session.day}: RPE ${session.feedback.rpe}/10${session.feedback.notes ? ` - "${session.feedback.notes}"` : ''}`);
        }
      });
    });

    const adaptationPrompt = `
═══════════════════════════════════════════════════════════════
              CONTEXTE DU PLAN (INTOUCHABLE)
═══════════════════════════════════════════════════════════════

🎯 OBJECTIF FINAL : ${plan.goal} ${plan.distance ? `(${plan.distance})` : ''}
⏱️ TEMPS VISÉ : ${plan.targetTime || 'Finisher'}
📅 DATE DE COURSE : ${plan.raceDate || 'Non définie'}
📊 DURÉE DU PLAN : ${plan.durationWeeks} semaines
⏳ SEMAINES RESTANTES : ${weeksRemaining} semaines avant la course

═══════════════════════════════════════════════════════════════
              ALLURES DE RÉFÉRENCE (CALCULÉES)
═══════════════════════════════════════════════════════════════

VMA estimée : ${paces.vmaKmh} km/h (source: ${vmaSource})

${pacesSection}

⚠️ Ces allures DOIVENT rester la référence dans les modifications !

═══════════════════════════════════════════════════════════════
              PROFIL DU COUREUR
═══════════════════════════════════════════════════════════════

- Niveau : ${questionnaireData.level}
- Âge : ${questionnaireData.age || 'Non renseigné'}
- Fréquence : ${questionnaireData.frequency} séances/semaine
- Volume actuel : ${questionnaireData.currentWeeklyVolume ? `${questionnaireData.currentWeeklyVolume} km/sem` : 'Non renseigné'}
- Blessures/Contraintes : ${questionnaireData.injuries?.hasInjury ? questionnaireData.injuries.description : 'Aucune'}

═══════════════════════════════════════════════════════════════
              HISTORIQUE DES FEEDBACKS RÉCENTS
═══════════════════════════════════════════════════════════════

${feedbackHistory.length > 0 ? feedbackHistory.slice(-5).join('\n') : 'Aucun feedback précédent'}

═══════════════════════════════════════════════════════════════
              FEEDBACK ACTUEL DU COUREUR
═══════════════════════════════════════════════════════════════

${feedbackContext}

═══════════════════════════════════════════════════════════════
              SÉANCES À VENIR (MODIFIABLES)
═══════════════════════════════════════════════════════════════

${upcomingSessions.slice(0, 10).join('\n')}
${upcomingSessions.length > 10 ? `\n... et ${upcomingSessions.length - 10} autres séances` : ''}

═══════════════════════════════════════════════════════════════
              RÈGLES DE COHÉRENCE (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════

1. JAMAIS 2 séances intensives (VMA, Seuil, SL > 15km) consécutives
2. Minimum 48h entre deux séances de qualité
3. Le volume hebdomadaire ne doit pas dépasser +15% du volume actuel du coureur
4. Pour un ${questionnaireData.level}, les séances VMA ne dépassent pas ${questionnaireData.level === 'Débutant (0-1 an)' ? '15 min' : questionnaireData.level === 'Intermédiaire (Régulier)' ? '20 min' : '30 min'} de travail effectif
5. Si ${weeksRemaining} semaines restantes < 3 : priorité à la récupération et à la confiance

═══════════════════════════════════════════════════════════════
              INSTRUCTIONS D'ADAPTATION
═══════════════════════════════════════════════════════════════

1. Analyse le RPE et les notes du coureur comme un VRAI coach le ferait
2. L'objectif "${plan.goal}${plan.targetTime ? ` en ${plan.targetTime}` : ''}" est INTOUCHABLE
3. Modifie UNIQUEMENT 2-3 séances futures si nécessaire
4. UTILISE les allures calculées (EF: ${paces.efPace}, Seuil: ${paces.seuilPace}, VMA: ${paces.vmaPace})
5. Si tu allèges, réduis le VOLUME pas les allures de base
6. VARIE les formats : si tu modifies une séance VMA, change le format (pas juste moins de reps)
7. Chaque conseil (advice) modifié doit être PERSONNEL :
   - Référence l'objectif du coureur
   - Explique pourquoi tu fais cette modif
   - Donne un conseil pratique pour la séance
8. Le coachNote doit être un message authentique comme un coach humain l'écrirait
   (pas "Bonne continuation" mais un vrai message contextuel)
9. VÉRIFIE que les modifications respectent les RÈGLES DE COHÉRENCE ci-dessus

RAPPEL : Chaque modification doit inclure les allures EXACTES en min/km !
`;

    console.log('[Gemini Adaptation] Envoi prompt avec allures calculées');

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemWithContext }, { text: adaptationPrompt }] }],
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
