
import { UserGoal, RunningLevel } from './types';

export const GOAL_OPTIONS = [
  { value: UserGoal.ROAD_RACE, label: "Course sur route", icon: "🛣️" },
  { value: UserGoal.TRAIL, label: "Trail & Nature", icon: "🏔️" },
  { value: UserGoal.LOSE_WEIGHT, label: "Perte de poids", icon: "⚖️" },
  { value: UserGoal.FITNESS, label: "Maintien en forme / Santé", icon: "❤️" },
];

export const LEVEL_OPTIONS = [
  { value: RunningLevel.BEGINNER, label: "Débutant", sub: "Je cours parfois, peu d'expérience." },
  { value: RunningLevel.INTERMEDIATE, label: "Intermédiaire", sub: "2-3 sorties par mois, je peux courir 10km." },
  { value: RunningLevel.CONFIRMED, label: "Confirmé", sub: "2-3 fois par semaine, habitué aux courses." },
  { value: RunningLevel.EXPERT, label: "Expert", sub: "4-5 fois par semaine, recherche de performance." },
];

export const ROAD_DISTANCES = ["5 km", "10 km", "Semi-Marathon", "Marathon"];
export const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const APP_NAME = "Coach Running IA";

export const STRIPE_PRICES = {
  PLAN_UNIQUE: "price_1TGEMl1WQbIX14t0KTcx7NdV",
  MONTHLY: "price_1T67fR1WQbIX14t0eCWWtc68",
  YEARLY: "price_1T1pl41WQbIX14t0QycLzNjF"
};
