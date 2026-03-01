
export enum UserGoal {
  LOSE_WEIGHT = 'Perte de poids',
  FITNESS = 'Maintien en forme',
  ROAD_RACE = 'Course sur route',
  TRAIL = 'Trail',
}

export enum RunningLevel {
  BEGINNER = 'Débutant (0-1 an)',
  INTERMEDIATE = 'Intermédiaire (Régulier)',
  CONFIRMED = 'Confirmé (Compétition)',
  EXPERT = 'Expert (Performance)',
}

export interface QuestionnaireData {
  sex?: 'Homme' | 'Femme';
  goal: UserGoal | null;
  subGoal?: string;
  trailDetails?: {
    distance: number;
    elevation: number;
  };
  level: RunningLevel | null;
  frequency: number;
  preferredDays: string[];

  // Dates
  startDate?: string; // Nouvelle date de début choisie
  raceDate?: string;
  targetTime?: string;

  age?: number;
  weight?: number; // en kg
  height?: number; // en cm (pour calculer IMC)
  city?: string;

  recentRaceTimes?: {
    distance5km?: string;
    distance10km?: string;
    distanceHalfMarathon?: string;
    distanceMarathon?: string;
  };

  injuries?: {
    hasInjury: boolean;
    description?: string;
  };

  // Volume actuel (Course & Trail)
  currentWeeklyVolume?: number; // km/semaine
  currentWeeklyElevation?: number; // D+/semaine (Trail uniquement)

  // Perte de poids
  weightLossSubGoal?: string;
  weeklyTimeAvailable?: string;

  // Remise en forme
  fitnessSubGoal?: string;
  lastActivity?: string;

  comments?: string;
  email?: string;
}

export interface User {
  id: string;
  firstName: string;
  email: string;
  createdAt: string;
  isPremium: boolean;
  isAdmin?: boolean; // Rôle admin pour gérer le blog et le back-office
  isAnonymous: boolean; // Nouveau flag pour les utilisateurs non inscrits
  photoURL?: string;
  questionnaireData?: QuestionnaireData;
  plans?: Record<string, TrainingPlan>; // Stockage direct des plans dans le document User

  // Strava integration
  stravaConnected?: boolean;
  stravaToken?: any;

  // Plan Unique (one-time purchase)
  hasPurchasedPlan?: boolean;
  planPurchaseDate?: string;
  plansRemaining?: number;

  // Stripe subscription
  stripeCustomerId?: string;
  stripeSubscriptionStatus?: string;
  premiumCancelAt?: string; // Date de fin programmée si résiliation en cours
  premiumCancelledAt?: string; // Date effective de résiliation
}

export interface SessionFeedback {
  rpe: number; // 1 (Very Easy) to 10 (Max Effort)
  notes?: string;
  completed: boolean;
  completedAt?: string; // Date de complétion ISO
  adaptationRequested?: boolean; // Si l'user a demandé explicitement une adaptation suite à ce feedback
}

// ============================================
// TYPES POUR PÉRIODISATION PROFESSIONNELLE
// ============================================

export type PeriodizationPhase =
  | 'fondamental'    // Phase de base aérobie (EF dominante)
  | 'developpement'  // Développement VMA + Seuil
  | 'specifique'     // Travail à allure course
  | 'affutage'       // Réduction volume, maintien intensité
  | 'recuperation';  // Semaine de décharge

export interface WeekLoad {
  volumeKm: number;           // Volume total en km
  intensityScore: number;     // Score d'intensité moyen (1-10)
  hardSessions: number;       // Nb séances difficiles (RPE cible > 7)
  easySessions: number;       // Nb séances faciles (RPE cible < 5)
  phase: PeriodizationPhase;  // Phase de périodisation
}

// Tracking des adaptations (limite 2/semaine)
export interface AdaptationLog {
  weekNumber: number;
  adaptationsThisWeek: number;      // Compteur (max 2)
  lastAdaptationDate?: string;      // ISO date
  adaptationHistory: {
    date: string;
    sessionId: string;
    reason: string;                 // "RPE élevé", "Fatigue", etc.
    changes: string;                // Résumé des changements
  }[];
}

export interface Session {
  id: string;
  day: string;
  type: 'Jogging' | 'Fractionné' | 'Sortie Longue' | 'Récupération' | 'Renforcement' | 'Marche/Course';
  duration: string;
  distance?: string;
  intensity?: 'Facile' | 'Modéré' | 'Difficile';
  title: string;
  warmup: string;
  mainSet: string;
  cooldown: string;
  advice: string;
  targetPace?: string; // Ex: "5:00" ou "12.0"
  feedback?: SessionFeedback;
}

export interface Week {
  weekNumber: number;
  theme: string;
  sessions: Session[];

  // PÉRIODISATION PROFESSIONNELLE
  phase?: PeriodizationPhase;       // Phase du mésocycle
  targetLoad?: WeekLoad;            // Charge cible calculée
  isRecoveryWeek?: boolean;         // Semaine de décharge (-30% volume)

  // Pour calcul de progression
  volumeProgression?: number;       // % d'augmentation vs semaine précédente
}

export interface FeasibilityAnalysis {
  status: 'EXCELLENT' | 'BON' | 'AMBITIEUX' | 'RISQUÉ';
  message: string;
  safetyWarning: string;
}

export interface LocationSuggestion {
  name: string;
  description: string; // "Idéal pour le fractionné (plat)" ou "Parfait pour le dénivelé"
  type: 'TRACK' | 'PARK' | 'HILL' | 'NATURE';
}

export interface TrainingPlan {
  id: string;
  userId: string;
  // Fix: add userEmail to TrainingPlan to resolve TypeScript errors in savePlan and generateTrainingPlan
  userEmail?: string | null;
  planNumber?: number; // Numéro séquentiel (ex: 1 pour le premier plan)
  createdAt: string;

  // Dates clés
  startDate: string; // Date de début réelle du plan
  endDate?: string;  // Calculée

  name: string;

  // Données principales
  goal: UserGoal;
  raceDate?: string;
  distance?: string;
  targetTime?: string;
  location?: string;
  suggestedLocations?: LocationSuggestion[];

  feasibility?: FeasibilityAnalysis;
  weeks: Week[];
  isFreePreview?: boolean;

  // Métadonnées Base de Données (Admin & Stats)
  durationWeeks?: number;
  sessionsPerWeek?: number;
  trainingPhasesDescription?: string; // Ex: "Semaines 1-4: Fondamental..."
  planUrl?: string; // URL d'accès direct pour l'admin

  // New Professional Fields
  welcomeMessage?: string; // Message de bienvenue personnalisé
  confidenceScore?: number; // Score 0-100 (ou 1-5)

  // COACHING PROFESSIONNEL
  calculatedVMA?: number;           // VMA calculée (pour référence)
  adaptationLog?: AdaptationLog;    // Historique des adaptations (limite 2/sem)

  // Règles de périodisation appliquées
  periodizationRules?: {
    phaseDurations: Record<PeriodizationPhase, number>;  // Nb semaines par phase
    recoveryWeekInterval: number;    // Toutes les X semaines (défaut: 4)
    volumeProgressionRate: number;   // % augmentation par semaine (défaut: 10)
    maxHardSessionsPerWeek: number;  // Limite séances difficiles (défaut: 2)
  };

  // === GÉNÉRATION OPTIMISÉE (PREVIEW) ===
  isPreview?: boolean;              // true si seule semaine 1 est générée
  generationContext?: GenerationContext; // Contexte FIGÉ pour générer la suite
  fullPlanGenerated?: boolean;      // true quand toutes les semaines sont générées
}

// ============================================
// GENERATION CONTEXT - GARANTIT LA COHÉRENCE
// ============================================

/**
 * Contexte de génération stocké avec le plan.
 * Permet de générer les semaines restantes avec EXACTEMENT les mêmes paramètres.
 * C'est la clé pour garantir 0 incohérence entre semaine 1 et le reste.
 */
export interface GenerationContext {
  // Allures calculées (FIGÉES à la génération)
  vma: number;
  vmaSource: string; // "5km en 22:30" ou "Estimation niveau Intermédiaire"
  paces: {
    efPace: string;      // Endurance fondamentale (67% VMA)
    eaPace: string;      // Endurance active (77% VMA)
    seuilPace: string;   // Seuil (87% VMA)
    vmaPace: string;     // VMA (100%)
    recoveryPace: string; // Récupération (60% VMA)
    allureSpecifique5k: string;
    allureSpecifique10k: string;
    allureSpecifiqueSemi: string;
    allureSpecifiqueMarathon: string;
  };

  // Plan de périodisation PRÉ-CALCULÉ (non modifiable)
  periodizationPlan: {
    totalWeeks: number;
    weeklyVolumes: number[];        // Volume cible par semaine [40, 42, 45, 38, 48...]
    weeklyPhases: PeriodizationPhase[]; // Phase par semaine
    recoveryWeeks: number[];         // Indices des semaines de récup [4, 8, 12]
  };

  // Données questionnaire FIGÉES
  questionnaireSnapshot: QuestionnaireData;

  // Métadonnées de génération
  generatedAt: string;
  modelUsed: string; // "gemini-2.0-flash"
}

// --- BLOG TYPES ---
export interface BlogPost {
  id: string;
  slug: string; // URL-friendly (ex: "comment-preparer-son-premier-marathon")
  title: string;
  excerpt: string; // Résumé court pour les listings
  content: string; // Contenu HTML ou Markdown
  coverImage?: string; // URL de l'image de couverture
  category: 'conseils' | 'nutrition' | 'entrainement' | 'equipement' | 'temoignages' | 'actualites';
  tags: string[];
  author: string;
  publishedAt: string; // ISO date
  updatedAt?: string;
  isPublished: boolean;
  readingTime?: number; // Temps de lecture en minutes
  seoTitle?: string; // Titre SEO (si différent du title)
  seoDescription?: string; // Meta description
}
