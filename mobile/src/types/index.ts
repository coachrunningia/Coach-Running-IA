// Types partagés avec le web — source de vérité unique

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
  preferredLongRunDay?: string; // Jour préféré pour la sortie longue (défaut: Dimanche)
  startDate?: string;
  raceDate?: string;
  targetTime?: string;
  age?: number;
  weight?: number;
  height?: number;
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
  currentWeeklyVolume?: number;
  currentWeeklyElevation?: number;
  weightLossSubGoal?: string;
  weeklyTimeAvailable?: string;
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
  isAnonymous: boolean;
  photoURL?: string;
  questionnaireData?: QuestionnaireData;
  stravaConnected?: boolean;
  stravaToken?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id: number; firstname: string };
  };
  hasPurchasedPlan?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionStatus?: string;
  premiumCancelAt?: string;
  source?: 'web' | 'mobile';
}

export interface SessionFeedback {
  rpe: number;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  adaptationRequested?: boolean;
}

export type PeriodizationPhase =
  | 'fondamental'
  | 'developpement'
  | 'specifique'
  | 'affutage'
  | 'recuperation';

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
  targetPace?: string;
  elevationGain?: number;
  locationSuggestion?: string;
  dateOverride?: string;
  feedback?: SessionFeedback;
}

export interface Week {
  weekNumber: number;
  theme: string;
  sessions: Session[];
  phase?: PeriodizationPhase;
  isRecoveryWeek?: boolean;
  volumeProgression?: number;
}

export interface TrainingPaces {
  efPace: string;
  eaPace: string;
  seuilPace: string;
  vmaPace: string;
  recoveryPace: string;
  allureSpecifique5k: string;
  allureSpecifique10k: string;
  allureSpecifiqueSemi: string;
  allureSpecifiqueMarathon: string;
}

export interface SuggestedLocation {
  name: string;
  type?: string;
  description?: string;
}

export interface PlanFeasibility {
  status: string;
  message: string;
  safetyWarning?: string;
}

export interface GenerationContext {
  vma: number;
  vmaSource: string;
  paces: {
    efPace: string;
    eaPace: string;
    seuilPace: string;
    vmaPace: string;
    recoveryPace: string;
    allureSpecifique5k: string;
    allureSpecifique10k: string;
    allureSpecifiqueSemi: string;
    allureSpecifiqueMarathon: string;
  };
  periodizationPlan: {
    totalWeeks: number;
    weeklyVolumes: number[];
    weeklyPhases: PeriodizationPhase[];
    recoveryWeeks: number[];
  };
  questionnaireSnapshot: QuestionnaireData;
  generatedAt: string;
  modelUsed: string;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  userEmail?: string | null;
  createdAt: string;
  startDate: string;
  endDate?: string;
  name: string;
  goal: UserGoal;
  raceDate?: string;
  distance?: string;
  targetTime?: string;
  location?: string;
  weeks: Week[];
  isFreePreview?: boolean;
  isPreview?: boolean;
  fullPlanGenerated?: boolean;
  welcomeMessage?: string;
  calculatedVMA?: number;
  durationWeeks?: number;
  sessionsPerWeek?: number;
  paces?: TrainingPaces;
  suggestedLocations?: SuggestedLocation[];
  feasibility?: PlanFeasibility;
  confidenceScore?: number;
  generationContext?: GenerationContext;
  adaptationLog?: any;
  vma?: number;
  vmaSource?: string;
}
