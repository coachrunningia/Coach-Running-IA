
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
  weight?: number;
  city?: string;
  
  recentRaceTime?: string;
  recentRaceName?: string;
  maxRunTime?: string;
  
  comments?: string;
  email?: string;
}

export interface User {
  id: string;
  firstName: string;
  email: string;
  createdAt: string;
  isPremium: boolean;
  isAnonymous: boolean; // Nouveau flag pour les utilisateurs non inscrits
  photoURL?: string;
  questionnaireData?: QuestionnaireData;
  plans?: Record<string, TrainingPlan>; // Stockage direct des plans dans le document User
  
  // Strava integration
  stravaConnected?: boolean;
  stravaToken?: any;
}

export interface SessionFeedback {
  rpe: number; // 1 (Very Easy) to 10 (Max Effort)
  notes?: string;
  completed: boolean;
  adaptationRequested?: boolean; // Si l'user a demandé explicitement une adaptation suite à ce feedback
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
  feedback?: SessionFeedback;
}

export interface Week {
  weekNumber: number;
  theme: string;
  sessions: Session[];
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
}
