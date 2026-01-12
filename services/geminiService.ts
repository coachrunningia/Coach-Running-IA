import { GoogleGenAI, Type } from "@google/genai";
import { QuestionnaireData, TrainingPlan, Week, UserGoal } from "../types";

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * PROMPT MASTERCLASS : Expertise Elite Running
 */
const SYSTEM_INSTRUCTION = `
  Tu es le meilleur coach de course à pied au monde, certifié FFA (France) et expert en physiologie de l'effort.
  Ta mission est de concevoir un plan d'entraînement professionnel, ultra-personnalisé et scientifiquement cohérent.

  RÈGLES DE CONCEPTION PHYSIOLOGIQUE :
  1. RÉPARTITION DES ZONES : Respecte la règle des 80/20 (80% endurance fondamentale, 20% haute intensité).
  2. PROGRESSION : Structure le plan en 3 phases : 
     - Phase 1 (Développement Foncier) : Augmentation graduelle du volume, renforcement musculaire.
     - Phase 2 (Préparation Spécifique) : Travail de l'allure cible, séances de seuil et VMA.
     - Phase 3 (Affûtage / Tapering) : Réduction du volume (30-50%) pour arriver frais le jour J.
  3. SPÉCIFICITÉS :
     - Pour le TRAIL : Intègre impérativement des séances de côtes, de rando-course et de PPG.
     - Pour la ROUTE (Marathon/Semi) : Inclus des blocs à allure spécifique (AS42, AS21).
  4. SÉCURITÉ : Adapte l'intensité selon l'âge, le sexe et le niveau de l'utilisateur pour éviter les blessures.

  FORMAT DE RÉPONSE :
  - Uniquement un objet JSON valide.
  - Pas de texte avant ou après.
`;

export const generateTrainingPlan = async (
  data: QuestionnaireData, 
  userId: string,
  userName: string,
  isPremium: boolean = false
): Promise<TrainingPlan> => {
  
  // Utilisation exclusive de process.env.API_KEY comme requis par les consignes
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: La clé API Gemini n'est pas configurée.");
  }

  // Initialisation avec le modèle gemini-2.0-flash-exp comme demandé
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash-exp"; 

  let durationWeeks = 8;
  const startDateStr = data.startDate || new Date().toISOString().split('T')[0];
  
  if (data.raceDate) {
    const start = new Date(startDateStr);
    const race = new Date(data.raceDate);
    const diffWeeks = Math.ceil((race.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    durationWeeks = Math.max(4, Math.min(diffWeeks, 16));
  }

  const trailDetails = data.goal === UserGoal.TRAIL 
    ? `Trail de ${data.trailDetails?.distance}km avec ${data.trailDetails?.elevation}m de D+.` 
    : '';
  const roadDetails = data.goal === UserGoal.ROAD_RACE 
    ? `Course sur route : ${data.subGoal}.` 
    : '';

  const prompt = `
    GÉNÉRER UN PLAN D'ENTRAÎNEMENT ÉLITE POUR :
    Utilisateur: ${userName} | Sexe: ${data.sex} | Âge: ${data.age || 'Inconnu'}
    Objectif: ${data.goal}. ${roadDetails} ${trailDetails}
    Niveau actuel: ${data.level}. 
    Référence (Record): ${data.recentRaceTime || 'N/A'}.
    Performance visée: ${data.targetTime || 'Finir la course'}.
    Contraintes: ${data.frequency} séances par semaine, début le ${startDateStr}.
    Durée du plan: ${durationWeeks} semaines.

    INSTRUCTIONS DE GÉNÉRATION JSON :
    ${isPremium 
      ? "Génère TOUTES les semaines avec le détail complet des séances (titre, warmup, mainSet, cooldown, intensity, duration, advice)." 
      : "Génère UNIQUEMENT la semaine 1 avec les détails complets. Pour les semaines suivantes (2 à " + durationWeeks + "), fournis seulement le 'theme' et laisse le tableau 'sessions' vide []."
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nom motivant pour le programme" },
      feasibility: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, description: "EXCELLENT, BON, AMBITIEUX ou RISQUÉ" },
          message: { type: Type.STRING },
          safetyWarning: { type: Type.STRING }
        },
        required: ["status", "message", "safetyWarning"]
      },
      weeks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            weekNumber: { type: Type.INTEGER },
            theme: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  type: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  intensity: { type: Type.STRING },
                  title: { type: Type.STRING },
                  warmup: { type: Type.STRING },
                  mainSet: { type: Type.STRING },
                  cooldown: { type: Type.STRING },
                  advice: { type: Type.STRING }
                },
                required: ["day", "type", "title", "mainSet", "intensity", "duration"]
              }
            }
          },
          required: ["weekNumber", "theme", "sessions"]
        }
      }
    },
    required: ["name", "weeks", "feasibility"]
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA.");
    const parsed = JSON.parse(text);
    
    return {
      id: generateId(),
      userId,
      userEmail: data.email || null,
      createdAt: new Date().toISOString(),
      startDate: startDateStr,
      goal: data.goal!,
      name: parsed.name || `Objectif ${data.subGoal || data.goal}`,
      feasibility: parsed.feasibility,
      weeks: parsed.weeks.map((w: any) => ({
        ...w,
        sessions: w.sessions.map((s: any) => ({ ...s, id: generateId() }))
      })),
      isFreePreview: !isPremium
    };
  } catch (error: any) {
    console.error("[Gemini] Erreur lors de la génération Masterclass:", error);
    throw error;
  }
};

export const adaptTrainingPlan = async (currentPlan: TrainingPlan, userFeedback: string): Promise<TrainingPlan> => {
    // Logique d'adaptation à implémenter si nécessaire
    return currentPlan;
};