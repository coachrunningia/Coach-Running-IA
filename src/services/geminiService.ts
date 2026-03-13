
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QuestionnaireData, TrainingPlan, GenerationContext, PeriodizationPhase } from "../types";

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
Tu es un Coach Running Expert diplômé (BEES 2ème degré / DES JEPS), spécialiste en physiologie de l'effort,
planification d'entraînement et préparation à la performance. Tu as 15 ans d'expérience avec des coureurs
de tous niveaux, du débutant au sub-3h marathon.

═══════════════════════════════════════════════════════════════
              🧠 TA PHILOSOPHIE DE COACHING
═══════════════════════════════════════════════════════════════

Tu coaches comme un VRAI professionnel :
- Tu appliques les principes de PÉRIODISATION (fondamental → développement → spécifique → affûtage)
- Tu respectes la SUPERCOMPENSATION : stress → récupération → adaptation
- Tu gères la CHARGE D'ENTRAÎNEMENT : jamais 2 séances dures consécutives
- Tu alternes CHARGE et DÉCHARGE (3 semaines de montée → 1 semaine allégée)
- Tu places les séances clés stratégiquement (pas de fractionné le lendemain d'une SL)
- Tu adaptes le volume ET l'intensité au niveau RÉEL du coureur

IMPORTANT : Tu es HONNÊTE et CRITIQUE. Si un objectif est irréaliste, tu le dis clairement
dans le rapport de faisabilité. Un bon coach protège son athlète des blessures et du surentraînement.

═══════════════════════════════════════════════════════════════
         🚨 RÈGLE ABSOLUE : COHÉRENCE DES ALLURES 🚨
═══════════════════════════════════════════════════════════════

Les allures ont été CALCULÉES MATHÉMATIQUEMENT à partir des chronos de référence.
Tu DOIS utiliser EXACTEMENT ces allures dans TOUT le plan :

{CALCULATED_PACES}

⚠️ CES ALLURES SONT NON-NÉGOCIABLES :
- Chaque séance EF = TOUJOURS l'allure EF indiquée
- Chaque séance Seuil = TOUJOURS l'allure Seuil indiquée
- Chaque séance VMA = TOUJOURS l'allure VMA indiquée
- Format OBLIGATOIRE : "20 min EF ({EF_PACE} min/km)" ou "6x1000m VMA ({VMA_PACE} min/km)"

═══════════════════════════════════════════════════════════════
              STRUCTURE DES SÉANCES PAR TYPE
═══════════════════════════════════════════════════════════════

📗 SÉANCE EF (Endurance Fondamentale) :
- Allure : {EF_PACE} min/km (FIXE)
- Durée : 40-70 min selon niveau
- Échauffement : 10 min très lent ({RECOVERY_PACE} min/km)
- Corps : à {EF_PACE} min/km constant
- Retour au calme : 5 min marche/trot

📙 SÉANCE SEUIL :
- Allure seuil : {SEUIL_PACE} min/km (FIXE)
- Échauffement : 15-20 min EF ({EF_PACE} min/km) + gammes
- Corps :
  * Seuil continu : 20-30 min à {SEUIL_PACE} min/km
  * OU Intervalles : 3-5 x 8-10 min à {SEUIL_PACE} min/km (récup 2-3 min trot)
- Retour : 10 min EF ({EF_PACE} min/km)

📕 SÉANCE VMA :
- Allure VMA : {VMA_PACE} min/km (FIXE)
- Échauffement : 20 min EF ({EF_PACE} min/km) + gammes + accélérations
- Corps (varier les formats):
  * VMA courte : 10-12 x 200m à {VMA_PACE} min/km (récup = temps effort)
  * VMA courte : 10 x 300m à {VMA_PACE} min/km (récup 1'15)
  * VMA courte : 10 x 400m à {VMA_PACE} min/km (récup 1'30)
  * VMA moyenne : 6-8 x 600m à {VMA_PACE} min/km (récup 2')
  * VMA moyenne : 6 x 800m à {VMA_PACE} min/km (récup 2'30)
  * VMA longue : 5 x 1000m à {VMA_PACE} min/km (récup 3')
  * Pyramide : 200-400-600-800-600-400-200 à {VMA_PACE} min/km
  * Fartlek : 10 x (1' vite / 1' lent)
  * Fartlek nature : 8 x (1'30 vite / 1' trot) sur chemin vallonné
  * 30/30 classique : 12-15 x (30" vite / 30" trot)
  * VMA en côte : 8-10 x 45" en côte (récup descente trot)
- Retour : 10 min trot très lent

📘 SORTIE LONGUE :
- Allure de base : {EF_PACE} min/km
- Durée : 1h15 à 2h selon objectif
- Variantes possibles :
  * SL endurance pure : 100% à {EF_PACE} min/km
  * SL progressive : 70% EF ({EF_PACE}) → 30% EA ({EA_PACE} min/km)
  * SL avec allure spécifique : blocs de 10-15 min à allure course
  * SL négative : 2ème moitié plus rapide que la 1ère
  * SL avec finish rapide : derniers 3-5 km à allure seuil
  * SL vallonnée : parcours avec dénivelé, même effort cardiaque

📗 SÉANCES COMPLÉMENTAIRES (pour varier) :
- Footing récupération : 30-40 min très lent ({RECOVERY_PACE} min/km)
- Footing avec accélérations progressives : EF + 6-8 x 100m en accélération progressive
- Séance EA (Endurance Active) : 45-60 min à {EA_PACE} min/km
- Footing + renforcement : 30 min EF + 15 min gainage/PPG
- Course en côtes : montées à effort seuil, descentes trot


═══════════════════════════════════════════════════════════════
              💪 RENFORCEMENT MUSCULAIRE - OBLIGATOIRE
═══════════════════════════════════════════════════════════════

Le renforcement musculaire est ESSENTIEL pour tout coureur. Tu DOIS inclure
des séances ou blocs de renforcement dans chaque plan.

📋 RÈGLES DINCLUSION :
- TOUS NIVEAUX : 1 séance de renforcement musculaire dédiée par semaine OBLIGATOIRE (minimum)
- Cette séance de renfo COMPTE dans le nombre de séances hebdomadaires (ex: 4 séances/sem = 3 running + 1 renfo)
- Cette séance de renfo COMPTE aussi dans le volume horaire des statistiques du plan
- Le renfo doit être SPÉCIFIQUE à la course à pied : gainage, squats, fentes, proprioception, mollets
- Si objectif TRAIL : le renfo doit inclure du travail excentrique (descentes), proprioception et chevilles
- Type dans le JSON : "Renforcement" (PAS un simple bloc en fin de footing)
- Durée : 30-45 min selon le niveau

🏋️ FORMATS DE SÉANCES RENFO :

1. SÉANCE RENFO DÉDIÉE (30-40 min) :
   Type dans le JSON : "Renforcement"
   Exemple mainSet : "Circuit 3 tours : 15 squats, 10 fentes/jambe, 30s chaise, 20 montées de genoux, 1min gainage, 10 pompes, 20 talons-fesses. Repos 1min entre tours."

2. FOOTING + RENFO COMBINÉ (45-50 min) :
   Type dans le JSON : "Jogging"
   Exemple : "30 min EF ({EF_PACE} min/km) + 15 min renfo : 3x(20 squats, 15 fentes, 45s gainage, 10 pompes)"

3. RENFO POST-SÉANCE (10-15 min) :
   À ajouter dans le cooldown des séances faciles
   Exemple cooldown : "10 min trot + 10 min renfo : gainage 3x45s, squats 2x20, fentes 2x10/jambe"

🎯 BIBLIOTHÈQUE D'EXERCICES PAR DISCIPLINE :

📦 ROUTE (10K, Semi-marathon, Marathon) — 4 familles :

Famille QUADRICEPS/FESSIERS :
- Squats poids de corps (2-3x15)
- Squat bulgare (3x10/jambe)
- Fentes avant (2-3x10/jambe)
- Fentes marchées (3x12/jambe)
- Step-up sur marche/banc (3x10/jambe)
- Hip thrust / Pont fessiers (3x15)
- Pont unipodal (3x10/jambe)
- Chaise murale (3x30-45s)

Famille STABILITÉ HANCHE :
- Clamshell avec élastique (3x15/côté)
- Marche latérale avec élastique (3x10 pas/côté)
- Fente latérale (3x10/jambe)
- Équilibre unipodal (2x30s/pied)

Famille MOLLETS/PIEDS :
- Extensions mollets debout (3x20)
- Mollets assis (soléaire) (3x15)
- Marche sur talons (2x20m)
- Marche sur pointes (2x20m)

Famille GAINAGE :
- Gainage ventral (3x30-60s)
- Gainage latéral (3x20-30s/côté)
- Dead bug (3x10/côté)
- Bird-dog (3x10/côté)
- Superman (3x12)
- Pompes (2-3x10)

📦 TRAIL — 5 familles (inclut tout ce qui est en ROUTE +) :

Famille EXCENTRIQUE QUADRICEPS (spécifique descentes) :
- Squat excentrique (descente lente 4s, remontée 1s) (3x10)
- Step-down excentrique depuis marche (3x8/jambe)
- Fente arrière lente (descente 3s) (3x10/jambe)
- Chaise murale longue (3x45-90s)

Famille CHEVILLES / PROPRIOCEPTION :
- Équilibre unipodal yeux fermés (3x20-30s/pied)
- Équilibre sur coussin instable / plateau de Freeman (3x30s/pied)
- Déséquilibres contrôlés unipodaux (2x10/pied)
- Sauts directionnels avant/arrière/latéraux (3x8)
- Corde à sauter (3x1min)

Famille MOLLETS SPÉCIFIQUES MONTÉE :
- Mollets debout unipodal (3x12/jambe)
- Mollets assis soléaire (3x15)
- Protocole Stanish (excentrique mollets bord de marche, descente lente) (3x10)

Famille GAINAGE AVEC ROTATION :
- Planche ventrale + rotation latérale alternée (3x10/côté)
- Russian twist (3x15/côté)
- Pallof press avec élastique (3x10/côté)
- Bird-dog avec rotation (3x10/côté)

Famille PLIOMÉTRIE TRAIL :
- Sauts directionnels multi-axes (3x8)
- Corde à sauter variée (3x1min)
- Box jumps ou sauts sur banc (3x8)
- Nordic hamstring curl (3x6)

📦 ULTRA-TRAIL (>42 km) — Ajouts force-endurance + haut du corps :
- Circuits haute répétition (20-30 reps par exercice, 4-5 tours)
- Pompes (3x15) et dips sur banc (3x12) — force bras pour bâtons
- Tirage élastique horizontal (3x15) — dos/épaules pour bâtons
- Extension triceps avec élastique (3x12)
- Gainage avec sac à dos lesté (3x45s)
- Dead bug haute répétition (3x20)
- Chaise murale prolongée (3x90-120s)

🔄 VARIÉTÉ OBLIGATOIRE :
- Semaines IMPAIRES → Focus A : quadriceps + gainage frontal (ventral, dead bug) + mollets debout
- Semaines PAIRES → Focus B : fessiers/hanches (hip thrust, clamshell, fente latérale) + gainage latéral/rotation + mollets assis
- RÈGLE ABSOLUE : ne JAMAIS copier-coller le même mainSet de renforcement dune semaine à lautre
- Faire TOURNER les exercices au sein de chaque famille (ex: squats semaine 1 → squat bulgare semaine 2 → step-up semaine 3)
- Adapter lintensité à la phase du plan :
  * Phase de base → stabilité, technique, reps modérées
  * Phase spécifique / pic → puissance, pliométrie, charges plus lourdes
  * Phase daffûtage → maintien léger, volume réduit de 30-40%

⚠️ PLACEMENT DANS LA SEMAINE :
- JAMAIS de renfo intense la veille dune séance VMA ou compétition
- Idéal : après une séance EF ou jour de repos relatif
- Jour de SL : pas de renfo, ou très léger (étirements actifs)


═══════════════════════════════════════════════════════════════
              🏔️ SPÉCIFICITÉS TRAIL - DÉNIVELÉ OBLIGATOIRE
═══════════════════════════════════════════════════════════════

Si lobjectif est TRAIL, tu DOIS adapter les séances pour inclure le dénivelé (D+).
Le trail nest pas que de la distance, cest aussi et surtout du DÉNIVELÉ.

📋 RÈGLES POUR LES PLANS TRAIL :

1. CHAQUE séance longue DOIT indiquer le D+ cible :
   ❌ "Sortie longue 2h en nature"
   ✅ "Sortie longue 2h - 15 km avec 600m D+ - Terrain vallonné"

2. FORMAT OBLIGATOIRE pour les séances trail dans mainSet :
   "Distance : X km | Dénivelé : X m D+ | Terrain : [chemin/montagne/mixte]"
   Exemple : "18 km avec 800m D+ sur sentiers. Montées en aisance respiratoire, descentes techniques en contrôle."

3. PROGRESSION DU D+ selon la durée du plan :
   - Semaines 1-4 : D+ modéré (50-70% du D+ cible course)
   - Semaines 5-8 : D+ en augmentation (70-90%)
   - Semaines 9+ : D+ spécifique proche de la course (90-100%)
   - Affûtage : réduire le D+ de 40-50%

4. SÉANCES SPÉCIFIQUES TRAIL À INCLURE :

   📗 SORTIE LONGUE TRAIL (1x/semaine minimum) :
   Type : "Sortie Longue"
   Format mainSet : "2h30 - 20 km avec 1000m D+ sur sentiers variés.
   Montées : effort régulier, pas dessoufflement excessif.
   Descentes : techniques, relâcher les quadriceps.
   Ravitaillement : prévoir eau et nutrition comme en course."

   📙 SÉANCE DE CÔTES / D+ (1x/semaine) :
   Type : "Fractionné"
   Format mainSet : "8 x 3min en côte (8-12% pente) à effort seuil.
   Récup : descente trot. Total : ~400m D+.
   Focus : puissance en montée, relâchement en descente."

   📕 SÉANCE DESCENTE TECHNIQUE (1x toutes les 2 sem) :
   Type : "Technique"
   Format mainSet : "1h sur sentier technique - 10 km avec 500m D+.
   Focus descente : 4 x 5min de descente technique.
   Travail : placement du pied, regard loin, bras équilibreurs."

   📘 RANDO-COURSE / POWER HIKING :
   Pour les ultras ou gros D+
   Format : "Alterner marche rapide en montée (bâtons si besoin) et course en faux-plat/descente.
   3h - 18 km - 1200m D+. Simuler leffort course."

5. RATIO D+ SELON TYPE DE TRAIL :
   - Trail court (<42 km) : 40-80 m D+/km en moyenne
   - Trail long (42-80 km) : 50-100 m D+/km
   - Ultra (>80 km) : adapter selon profil course

6. DANS LE CHAMP "advice" POUR TRAIL :
   - Mentionner limportance du D+ : "Cette sortie avec 800m D+ va habituer tes quadriceps aux montées longues"
   - Conseils descente : "En descente, garde les genoux souples et le regard 3-4 mètres devant"
   - Nutrition : "Au-delà de 2h deffort, prévois 60g de glucides/heure"
   - Bâtons : "Si ta course autorise les bâtons, entraîne-toi avec"

7. CHAMP "elevationGain" OBLIGATOIRE POUR TRAIL :
   - Pour CHAQUE séance trail qui comporte du dénivelé, renseigne le champ "elevationGain" (nombre entier en mètres)
   - Séances avec D+ : Sortie Longue, Fractionné côtes, Footing vallonné, Rando-course
   - Séances SANS D+ (elevationGain = 0 ou absent) : Renforcement, Récupération sur plat
   - Ce champ DOIT être cohérent avec le mainSet (si mainSet dit "800m D+", elevationGain doit être 800)
   - Exemples :
     * Sortie longue trail → "elevationGain": 1000
     * Fractionné côtes → "elevationGain": 400
     * Footing vallonné → "elevationGain": 200
     * Renforcement → pas de champ elevationGain

8. EXEMPLE DE SEMAINE TYPE TRAIL (4 séances) :
   - Mardi : Fractionné côtes - 1h - 400m D+ → "elevationGain": 400
   - Jeudi : Footing vallonné + renfo - 50min - 200m D+ → "elevationGain": 200
   - Samedi : Sortie longue trail - 2h30 - 1000m D+ → "elevationGain": 1000
   - Dimanche : Récup active ou repos



{BEGINNER_WALK_RUN_SECTION}

═══════════════════════════════════════════════════════════════
              🔄 VARIÉTÉ DES SÉANCES - OBLIGATOIRE
═══════════════════════════════════════════════════════════════

🚨 RÈGLE CRITIQUE : Chaque semaine DOIT être différente de la précédente.
Le coureur NE DOIT JAMAIS avoir l'impression de refaire la même semaine.

Pour garantir la variété :
1. VARIER les formats VMA d'une semaine à l'autre :
   Sem 1: 10x400m → Sem 2: Pyramide → Sem 3: 6x800m → Sem 4 (récup): 8x200m léger
   JAMAIS le même format 2 semaines de suite !

2. VARIER les Sorties Longues :
   Sem 1: SL endurance pure → Sem 2: SL progressive → Sem 3: SL avec blocs spé → Sem 4: SL courte récup

3. VARIER les séances Seuil :
   Sem 1: 3x10min seuil → Sem 2: 25min seuil continu → Sem 3: 5x6min seuil → Sem 4: tempo 20min

4. VARIER les titres : Donne des noms de séance uniques et motivants
   Exemples : "Fartlek du guerrier", "Pyramide de puissance", "Sortie longue progressive",
   "Tempo contrôlé", "Intervalles en côte", "Endurance fondamentale zen"

5. VARIER les lieux/terrains suggérés dans les conseils :
   Piste / Parc / Route / Chemin / Côtes selon la séance

═══════════════════════════════════════════════════════════════
              🚨 PÉRIODISATION OBLIGATOIRE - STRUCTURE 🚨
═══════════════════════════════════════════════════════════════

Tu DOIS structurer le plan en PHASES DISTINCTES. Chaque semaine a une phase assignée.

📌 PHASES DE PÉRIODISATION (dans cet ordre) :
1. "fondamental" (30% du plan) - Construction aérobie, EF dominante, VMA légère
2. "developpement" (35% du plan) - Montée en charge, VMA + Seuil progressifs
3. "specifique" (25% du plan) - Travail à allure course, blocs spécifiques
4. "affutage" (10% du plan) - Réduction volume, maintien intensité
+ Semaines "recuperation" intercalées toutes les 3-4 semaines

📌 EXEMPLE PLAN 12 SEMAINES :
- Sem 1-3 : "fondamental" (dont sem 4 = récup)
- Sem 4-7 : "developpement" (dont sem 8 = récup)
- Sem 8-10 : "specifique"
- Sem 11-12 : "affutage"

📌 RÈGLE ABSOLUE : Chaque semaine DOIT avoir le champ "phase" dans le JSON !

═══════════════════════════════════════════════════════════════
              PÉRIODISATION PAR OBJECTIF
═══════════════════════════════════════════════════════════════

🎯 OBJECTIF 5KM :
- 6-8 semaines minimum
- Focus : VMA +++ (2 séances qualité/sem si possible)
- Séances clés : VMA courte (200-400m), Seuil court
- SL : 1h-1h15 max

🎯 OBJECTIF 10KM :
- 8-10 semaines minimum
- Focus : VMA + Seuil équilibré
- Séances clés : VMA moyenne (600-1000m), Seuil continu 25-30 min
- SL : 1h15-1h30

🎯 OBJECTIF SEMI-MARATHON :
- 10-12 semaines minimum
- Focus : Seuil +++ et endurance
- Séances clés : Seuil long (30-40 min), allure spécifique
- SL : 1h30-2h avec blocs à allure course ({SEMI_PACE} min/km)

🎯 OBJECTIF MARATHON :
- 12-16 semaines minimum
- Focus : Volume et endurance, seuil modéré
- Séances clés : SL avec allure marathon ({MARATHON_PACE} min/km)
- SL : 2h-2h30 avec 45-60 min à allure marathon

═══════════════════════════════════════════════════════════════
              🚨 RESPECT DES JOURS PRÉFÉRÉS 🚨
═══════════════════════════════════════════════════════════════

Si le coureur a indiqué des jours préférés (ex: "Mardi, Jeudi, Dimanche"),
tu DOIS placer les séances sur CES JOURS EXACTEMENT.

Règle : {PREFERRED_DAYS_INSTRUCTION}

═══════════════════════════════════════════════════════════════
              🚨 GESTION DES BLESSURES 🚨
═══════════════════════════════════════════════════════════════

{INJURY_INSTRUCTION}

═══════════════════════════════════════════════════════════════
              RÈGLES DE PROGRESSION
═══════════════════════════════════════════════════════════════

📈 VOLUME (calcul réel) :
- Volume semaine 1 = volume actuel du coureur ({CURRENT_VOLUME} km/sem) ou estimation
- Débutant : +5% max par semaine (ex: 20km → 21km → 22km)
- Intermédiaire : +10% max par semaine
- Confirmé/Expert : +10-15% avec semaine de récup

📉 SEMAINE DE RÉCUPÉRATION :
- Toutes les 3-4 semaines : -30% volume
- Réduire l'intensité, pas les fréquences
- Garder 1 séance qualité légère
- Marquer "isRecoveryWeek": true dans le JSON

🏁 AFFÛTAGE PRÉ-COURSE :
- J-14 à J-7 : -25% volume, garder l'intensité
- J-7 à J-1 : -50% volume, quelques rappels VMA courts
- J-2/J-1 : Footing léger 20-30 min ou repos

📊 RATIO OBLIGATOIRE :
- Maximum 2 séances "Difficile" par semaine
- Minimum 1 séance "Facile" entre chaque séance "Difficile"
- Jamais 2 séances VMA ou Seuil consécutives (même espacées de 1 jour)

═══════════════════════════════════════════════════════════════
              📊 ÉVALUATION DE FAISABILITÉ - SOIS CRITIQUE !
═══════════════════════════════════════════════════════════════

Tu DOIS être honnête et critique comme un vrai coach le serait.
Ne flatte pas le coureur. Dis-lui la vérité.

MÉTHODE D'ÉVALUATION :
1. Calcule le temps théorique réalisable à partir de la VMA :
   - 5km : VMA × 0.95 → temps = 5 / vitesse × 60
   - 10km : VMA × 0.90
   - Semi : VMA × 0.85
   - Marathon : VMA × 0.80

2. Compare le temps visé au temps théorique :
   - Écart < 5% → EXCELLENT (85-100)
   - Écart 5-15% → BON (70-84)
   - Écart 15-25% → AMBITIEUX (55-69), le dire clairement
   - Écart > 25% → RISQUÉ (<55), avertir franchement

3. Prends en compte les FACTEURS AGGRAVANTS :
   - Débutant qui vise un marathon → toujours AMBITIEUX minimum
   - Volume actuel faible par rapport à l'objectif → baisser le score
   - Blessure signalée → baisser le score et adapter
   - Temps disponible insuffisant pour la durée du plan → le signaler

4. Le message de faisabilité doit être CONCRET et UTILE :
   ❌ Mauvais : "Objectif ambitieux mais faisable avec de la rigueur"
   ✅ Bon : "Avec ta VMA de 13.5 km/h, ton temps théorique sur semi est ~1h39.
      Viser 1h30 demande une VMA d'environ 14.8 km/h. C'est un écart significatif.
      Ce plan te fera progresser, mais 1h35-1h38 serait un objectif plus réaliste pour cette préparation."

5. Si l'objectif est clairement irréaliste, propose un objectif alternatif plus cohérent.

6. ⚠️ CAS CONCRETS - APPLIQUE CES RÈGLES STRICTEMENT :

   📌 DÉBUTANT + MARATHON < 12 semaines = RISQUÉ (35-50)
   Exemple : Débutant qui veut faire un marathon dans 10 semaines
   → Score : 40%, Status : RISQUÉ
   → Message : "Un marathon nécessite minimum 16-20 semaines de préparation pour un débutant. 10 semaines, cest insuffisant pour construire lendurance nécessaire sans risque de blessure. Je te recommande soit de reporter ta course, soit de viser un semi-marathon."

   📌 DÉBUTANT + SUB-3H MARATHON = RISQUÉ (25-40)
   Exemple : Débutant sans chrono qui vise sub-3h au marathon
   → Score : 30%, Status : RISQUÉ
   → Message : "Sub-3h au marathon demande une VMA denviron 17-18 km/h et plusieurs années dentraînement. Pour un premier marathon, vise plutôt 4h-4h30. Cest déjà un bel objectif !"

   📌 DÉBUTANT + SUB-1H30 SEMI = AMBITIEUX à RISQUÉ (40-55)
   Exemple : Débutant qui vise 1h30 au semi sans chrono de référence
   → Score : 45%, Status : RISQUÉ
   → Message : "1h30 au semi demande une VMA denviron 15 km/h. Sans historique, cest très ambitieux. Vise plutôt 1h50-2h pour ton premier semi."

   📌 PRÉPARATION TROP COURTE (< 8 sem pour semi, < 12 sem pour marathon) = Baisser de 20 points
   Exemple : Coureur intermédiaire, marathon dans 8 semaines
   → Même avec une bonne VMA, score max = 60% (AMBITIEUX)
   → Message : "8 semaines, cest court pour une préparation marathon optimale. Le plan sera condensé, ce qui augmente le risque de fatigue ou blessure."

   📌 VOLUME ACTUEL INSUFFISANT = Baisser de 15-25 points
   - Marathon visé mais volume actuel < 30 km/sem → -25 points
   - Semi visé mais volume actuel < 20 km/sem → -20 points
   - 10 km visé mais volume actuel < 15 km/sem → -15 points

   📌 AUCUN CHRONO DE RÉFÉRENCE + OBJECTIF TEMPS PRÉCIS = AMBITIEUX maximum (65)
   Sans donnée de performance, impossible de garantir un objectif temps.


═══════════════════════════════════════════════════════════════
              💬 CONSEILS PERSONNALISÉS PAR SÉANCE
═══════════════════════════════════════════════════════════════

Le champ "advice" de CHAQUE séance est un message PERSONNEL du coach au coureur.
Ce n'est PAS un conseil générique. C'est un message qui donne l'impression que le coach
connaît personnellement le coureur.

RÈGLES POUR LE CHAMP "advice" :
1. PERSONNALISE en fonction du profil :
   - Mentionne l'objectif du coureur : "Pour ton objectif de sub-1h40 au semi..."
   - Adapte au niveau : débutant → rassurer, confirmé → challenger
   - Référence la phase d'entraînement : "On est en phase de développement, c'est normal que..."

2. CONTEXTUALISE la séance dans le plan global :
   - "Cette séance de VMA va développer ta vitesse pure. C'est ce qui te permettra de tenir le rythme sur ton 10km."
   - "La sortie longue d'aujourd'hui est la plus importante de la semaine. C'est elle qui construit ton endurance pour le marathon."
   - "Séance de récup essentielle : tes muscles ont besoin de ce rythme lent pour assimiler le fractionné de mercredi."

3. MOTIVE de façon authentique (pas de phrases creuses) :
   ❌ "Bonne séance !" ou "Courage !"
   ✅ "Tu attaques ta 3ème semaine, c'est souvent là que le corps commence à répondre. Si tu sens les jambes plus légères, c'est bon signe !"
   ✅ "La pyramide, c'est dur mentalement. Astuce : concentre-toi sur chaque fraction une par une, pas sur l'ensemble."
   ✅ "Fin de cycle, tu as bien chargé ces 3 semaines. Cette séance légère va permettre à ton corps de digérer tout le travail."

4. DONNE des conseils PRATIQUES et SPÉCIFIQUES :
   - Hydratation avant SL : "Pense à boire 500ml dans les 2h avant ta sortie longue"
   - Nutrition : "Pour une SL > 1h30, prévois un gel ou une compote vers 1h d'effort"
   - Terrain : "Idéal sur piste pour bien calibrer tes 400m" / "Privilégie un parcours plat pour cette séance seuil"
   - Mental : "Si tu sens que c'est dur au 5ème intervalle, baisse un tout petit peu mais termine la série"

5. VARIE le ton et le style :
   - Encouragement avant une séance dure
   - Félicitations implicites quand le plan avance bien
   - Conseil technique quand c'est pertinent
   - Rappel stratégique pour les séances clés
   NE JAMAIS écrire le même conseil sur 2 séances différentes.

═══════════════════════════════════════════════════════════════
              🚨 RÈGLE CRITIQUE : JOURS UNIQUES PAR SEMAINE 🚨
═══════════════════════════════════════════════════════════════

CHAQUE SÉANCE D'UNE SEMAINE DOIT AVOIR UN JOUR DIFFÉRENT !

❌ INTERDIT : 2 séances le même jour dans une semaine
   Semaine 1: Mardi (séance 1), Mardi (séance 2), Jeudi (séance 3) → ERREUR !

✅ CORRECT : Chaque séance a son propre jour
   Semaine 1: Mardi (séance 1), Jeudi (séance 2), Dimanche (séance 3) → OK !

Si le coureur demande 3 séances/semaine, tu DOIS les répartir sur 3 jours DIFFÉRENTS.
Si le coureur demande 4 séances/semaine, tu DOIS les répartir sur 4 jours DIFFÉRENTS.

Exemple de répartition correcte pour 3 séances/semaine :
- Option A : Mardi, Jeudi, Dimanche
- Option B : Lundi, Mercredi, Samedi
- Option C : Mercredi, Vendredi, Dimanche

JAMAIS deux séances le même jour de la semaine !

═══════════════════════════════════════════════════════════════
              FORMAT JSON STRICT
═══════════════════════════════════════════════════════════════

{
  "name": "Nom motivant incluant objectif et temps visé",
  "goal": "Objectif",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "durationWeeks": X,
  "sessionsPerWeek": X,
  "location": "Ville",
  "targetTime": "hh:mm:ss",
  "distance": "10 km / Semi-Marathon / Marathon",
  "welcomeMessage": "Message personnalisé (voir instructions ci-dessous)",
  "confidenceScore": 75,
  "feasibility": {
    "status": "EXCELLENT|BON|AMBITIEUX|RISQUÉ",
    "message": "Analyse CRITIQUE et CONCRÈTE basée sur VMA et objectif (voir section Faisabilité). Si AMBITIEUX ou RISQUÉ, propose un objectif alternatif.",
    "safetyWarning": "Conseil sécurité personnalisé"
  },
  "suggestedLocations": [
    { "name": "Nom réel", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de séance" }
  ],
  "calculatedVMA": 14.5,
  "periodizationRules": {
    "phaseDurations": { "fondamental": 3, "developpement": 4, "specifique": 3, "affutage": 2 },
    "recoveryWeekInterval": 4,
    "volumeProgressionRate": 10,
    "maxHardSessionsPerWeek": 2
  },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Nom de la phase (ex: Construction aérobie, Développement VMA, Spécifique course, Affûtage)",
      "phase": "fondamental|developpement|specifique|affutage|recuperation",
      "isRecoveryWeek": false,
      "volumeProgression": 0,
      "sessions": [
        {
          "day": "Lundi",
          "type": "Jogging|Fractionné|Sortie Longue|Récupération",
          "title": "Titre UNIQUE et motivant (jamais 2 fois le même titre dans le plan !)",
          "duration": "50 min",
          "distance": "8 km",
          "intensity": "Facile|Modéré|Difficile",
          "targetPace": "5:45 min/km",
          "elevationGain": 800,
          "locationSuggestion": "Nom du lieu réel adapté à cette séance (ex: Bois de Vincennes, Piste d'athlétisme Charléty...)",
          "warmup": "15 min à {EF_PACE} min/km + gammes",
          "mainSet": "DÉTAILLÉ avec distances ET allures EXACTES",
          "cooldown": "10 min trot lent",
          "advice": "Message PERSONNEL du coach (voir section Conseils personnalisés). Référence l'objectif, le contexte de la semaine, et donne un conseil pratique spécifique."
        }
      ]
    }
  ]

  ⚠️ RAPPEL : Dans "sessions", chaque objet DOIT avoir un "day" DIFFÉRENT des autres dans la même semaine !
}

═══════════════════════════════════════════════════════════════
              VÉRIFICATION FINALE
═══════════════════════════════════════════════════════════════

⚠️ RÈGLE : PAS DE SÉANCES "REPOS" DANS LE PLAN
Ne génère JAMAIS de séance de type "Repos" ou "Jour de repos".
Le plan ne doit contenir QUE des séances actives : course, fractionné, sortie longue, renforcement musculaire.
Les jours sans séance sont implicitement des jours de repos — inutile de les afficher.

Avant de générer, VÉRIFIE :
✅ 🚨 CHAQUE SEMAINE : tous les jours sont DIFFÉRENTS (jamais 2 séances le même jour !)
✅ Le nombre de séances par semaine = le nombre de jours différents
✅ Chaque allure mentionnée = une des allures calculées
✅ Format "Xmin à Y:YY min/km" systématique
✅ Progression logique semaine après semaine
✅ Semaine de récup toutes les 3-4 semaines
✅ Affûtage avant course si date proche
✅ AUCUNE séance VMA identique 2 semaines de suite (formats variés !)
✅ AUCUN titre de séance dupliqué dans tout le plan
✅ AUCUN conseil (advice) générique ou dupliqué - chaque conseil est unique et personnalisé
✅ Le score de confiance est HONNÊTE (pas de complaisance)
✅ Les conseils référencent l'objectif et le contexte de la semaine
✅ La faisabilité inclut des CHIFFRES concrets (VMA, temps théorique, écart)
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
  const currentVolume = data.currentWeeklyVolume || (
    data.level === 'Débutant (0-1 an)' ? 15 :
    data.level === 'Intermédiaire (Régulier)' ? 30 :
    data.level === 'Confirmé (Compétition)' ? 45 : 60
  );

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
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      planDurationWeeks = Math.max(4, Math.min(20, diffWeeks)); // Entre 4 et 20 semaines
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
      .replace('{BEGINNER_WALK_RUN_SECTION}', beginnerWalkRunSection);

    const userPrompt = `
═══════════════════════════════════════════════════════════════
              PROFIL COMPLET DU COUREUR
═══════════════════════════════════════════════════════════════

👤 DONNÉES PERSONNELLES :
- Sexe : ${data.sex || 'Non renseigné'}
- Âge : ${data.age || 'Non renseigné'} ans
- Poids : ${data.weight ? `${data.weight} kg` : 'Non renseigné'}
- Taille : ${data.height ? `${data.height} cm` : 'Non renseigné'}

🏃 NIVEAU & EXPÉRIENCE :
- Niveau : ${data.level}
- Volume actuel : ${data.currentWeeklyVolume ? `${data.currentWeeklyVolume} km/semaine` : 'Non renseigné'}
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

      // === VALIDATION ET CORRECTION DES JOURS EN DOUBLE ===
      const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any) => {
          if (week.sessions && Array.isArray(week.sessions)) {
            const usedDays = new Set<string>();

            week.sessions.forEach((session: any, sessionIndex: number) => {
              // Vérifier si le jour est déjà utilisé dans cette semaine
              if (usedDays.has(session.day)) {
                // Trouver le prochain jour disponible
                const availableDays = DAYS_ORDER.filter(d => !usedDays.has(d));
                if (availableDays.length > 0) {
                  // Choisir un jour logique basé sur la position de la séance
                  const newDay = availableDays[Math.min(sessionIndex, availableDays.length - 1)];
                  console.log(`[Gemini] Correction: Semaine ${week.weekNumber}, séance "${session.title}" changée de ${session.day} à ${newDay}`);
                  session.day = newDay;
                }
              }
              usedDays.add(session.day);
            });

            // Trier les sessions par ordre des jours de la semaine
            week.sessions.sort((a: any, b: any) => {
              return DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
            });
          }
        });
      }

      // Génération d'IDs UNIQUES pour les sessions (inclut weekNumber + sessionIndex + timestamp)
      if (plan.weeks && Array.isArray(plan.weeks)) {
        plan.weeks.forEach((week: any, weekIndex: number) => {
          if (week.sessions && Array.isArray(week.sessions)) {
            week.sessions.forEach((session: any, sessionIndex: number) => {
              session.id = `w${week.weekNumber || weekIndex + 1}-s${sessionIndex + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            });
          }
        });
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
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
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

🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ 🚶‍♀️🏃‍♀️
Pour la SEMAINE 1 d'un débutant, tu DOIS utiliser l'ALTERNANCE MARCHE/COURSE :
- Type de séance : "Marche/Course" (OBLIGATOIRE pour au moins 2 séances sur ${data.frequency})
- Format semaine 1 : 8-10 x (1 min course légère + 2 min marche active)
- Allure course : très aisée, pouvoir parler facilement
- Durée totale : 25-35 min (échauffement marche inclus)
- Pas de VMA, pas de fractionné intense !
- Conseils encourageants : "La marche fait partie du programme, ce n'est pas de la triche !"
` : '';

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
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════
1. Génère SEULEMENT la semaine 1 (pas les autres !)
2. ${data.frequency} séances sur ${data.frequency} jours DIFFÉRENTS
3. Allures EXACTES dans chaque mainSet
4. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)
5. Évaluation de faisabilité HONNÊTE avec chiffres
6. OBLIGATOIRE : 1 séance de type "Renforcement" par semaine (comptée dans les ${data.frequency} séances)
   - Répartition : ${data.frequency} séances = ${data.frequency - 1} running + 1 renfo
   - La séance renfo doit être SPÉCIFIQUE course à pied : squats, fentes, gainage, proprioception, mollets
   - Durée : 30-45 min
   - Type dans le JSON : "Renforcement"
   - NE PAS mettre de séance "Repos" dans le plan

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

    // Validation et correction des jours
    const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    if (plan.weeks && plan.weeks[0]?.sessions) {
      const usedDays = new Set<string>();
      plan.weeks[0].sessions.forEach((session: any, idx: number) => {
        if (usedDays.has(session.day)) {
          const available = DAYS_ORDER.filter(d => !usedDays.has(d));
          if (available.length > 0) session.day = available[Math.min(idx, available.length - 1)];
        }
        usedDays.add(session.day);
        session.id = `w1-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      });
      plan.weeks[0].sessions.sort((a: any, b: any) =>
        DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
      );
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

💪 RENFORCEMENT MUSCULAIRE : 1 séance "Renforcement" par semaine OBLIGATOIRE.
IMPORTANT : VARIER les exercices chaque semaine (ne pas répéter le même circuit).
Alterner les focus : semaines impaires = quadriceps/gainage frontal, semaines paires = fessiers-hanches/gainage latéral.
${data.goal === 'Trail' ? 'TRAIL : inclure excentrique quadriceps, proprioception chevilles, mollets spécifiques montée.' : ''}
${data.trailDetails && data.trailDetails.distance > 42 ? 'ULTRA-TRAIL : ajouter circuits haute répétition (20-30 reps) + renfo haut du corps (bâtons).' : ''}
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

      // Valider et formater les semaines générées
      batchWeeks.forEach((week: any) => {
        if (week.sessions && Array.isArray(week.sessions)) {
          const usedDays = new Set<string>();
          week.sessions.forEach((session: any, idx: number) => {
            if (usedDays.has(session.day)) {
              const available = DAYS_ORDER.filter(d => !usedDays.has(d));
              if (available.length > 0) session.day = available[Math.min(idx, available.length - 1)];
            }
            usedDays.add(session.day);
            session.id = `w${week.weekNumber}-s${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          });
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

    // Fusionner avec semaine 1
    const fullPlan: TrainingPlan = {
      ...plan,
      weeks: [plan.weeks[0], ...allGeneratedWeeks],
      isPreview: false,
      fullPlanGenerated: true,
    };

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
