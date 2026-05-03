
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrainingPlan, Session, User, Week, StravaActivityMatch } from '../types';
import { Calendar, Clock, Lock, ShieldCheck, CheckCircle, Activity, AlertTriangle, Star, Zap, RefreshCw, X, ChevronDown, ChevronUp, Target, MapPin, TrendingUp, FileText, Loader, MessageCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateSessionFeedback, savePlan, updateSessionDate, shiftSessionDates, updatePlanStartDate } from '../services/storageService';
import { downloadICS, downloadPDF, downloadSessionTCX } from '../services/exportService';
import StravaConnect from './StravaConnect';
import SessionCard from './SessionCard';
import Statistics from './Statistics';
import PlanHero from './PlanHero';
import UserProfile from './UserProfile';
import Toast from './Toast';
import DatePickerModal from './DatePickerModal';
import CrossWeekConfirmModal from './CrossWeekConfirmModal';
import FeasibilityWarningModal from './FeasibilityWarningModal';
import StartDatePickerModal from './StartDatePickerModal';
import { resolveSessionDate, getWeekNumberForDate, toISODateString } from '../utils/dateUtils';
import { useSettings } from '../context/SettingsContext';
import { compareWeekWithStrava, generateAdaptationSuggestions, applyAdaptation, findStravaActivityForSession, WeekComparisonResult, AdaptationSuggestion } from '../services/stravaAnalysisService';
import { calculateFeasibility, FeasibilityResult } from '../services/feasibilityService';

interface PlanViewProps {
  plan: TrainingPlan;
  isLocked?: boolean;
  onUnlock?: () => void;
  onAdaptPlan?: (feedback: string) => void;
  onRegenerateFull?: () => void;
  onGenerateRemainingWeeks?: () => Promise<void>; // Nouveau: génère semaines 2-N
  isGeneratingRemaining?: boolean; // Nouveau: état de génération
  user?: User | null;
  onRecalculateVMA?: (newVMA: number) => Promise<void>;
}

// Helper function to fix duplicate days in existing plans
const normalizePlanDays = (planToNormalize: TrainingPlan): TrainingPlan => {
  const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const normalizedWeeks = planToNormalize.weeks.map((week) => {
    const usedDays = new Set<string>();
    let hasChanges = false;

    const normalizedSessions = week.sessions.map((session, sessionIndex) => {
      // Check if this day is already used in this week
      if (usedDays.has(session.day)) {
        hasChanges = true;
        // Find the next available day
        const availableDays = DAYS_ORDER.filter(d => !usedDays.has(d));
        if (availableDays.length > 0) {
          const newDay = availableDays[Math.min(sessionIndex, availableDays.length - 1)];
          console.log(`[PlanView] Normalisation: Semaine ${week.weekNumber}, séance "${session.title}" changée de ${session.day} à ${newDay}`);
          usedDays.add(newDay);
          return { ...session, day: newDay };
        }
      }
      usedDays.add(session.day);
      return session;
    });

    // Sort sessions by day order if changes were made
    if (hasChanges) {
      normalizedSessions.sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
    }

    return { ...week, sessions: normalizedSessions };
  });

  return { ...planToNormalize, weeks: normalizedWeeks };
};

const PlanView: React.FC<PlanViewProps> = ({ plan: initialPlan, isLocked = false, onAdaptPlan, onRegenerateFull, onGenerateRemainingWeeks, isGeneratingRemaining = false, user, onRecalculateVMA }) => {
  const navigate = useNavigate();
  // Normalize the plan on load to fix any duplicate days from old plans
  const [plan, setPlan] = useState<TrainingPlan>(() => normalizePlanDays(initialPlan));
  const [activeTab, setActiveTab] = useState<'PROGRAMME' | 'STATS' | 'STRAVA' | 'PROFIL'>('PROGRAMME');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<Session | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);

  // Strava comparison state
  const [comparisonLoading, setComparisonLoading] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<WeekComparisonResult | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [adaptationSuggestion, setAdaptationSuggestion] = useState<AdaptationSuggestion | null>(null);
  const [showAdaptationModal, setShowAdaptationModal] = useState(false);
  const [adaptationNextWeek, setAdaptationNextWeek] = useState<Week | null>(null);

  // Ask coach modal
  const [showAskCoach, setShowAskCoach] = useState(false);
  const [askCoachQuestion, setAskCoachQuestion] = useState('');
  const [askCoachSending, setAskCoachSending] = useState(false);
  const [askCoachSent, setAskCoachSent] = useState(false);

  // Date editing states
  const [datePickerSession, setDatePickerSession] = useState<Session | null>(null);
  const [datePickerWeek, setDatePickerWeek] = useState<number>(0);
  const [showCrossWeekConfirm, setShowCrossWeekConfirm] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{
    session: Session; weekNumber: number; newDateISO: string; daysDiff: number; fromWeek: number; toWeek: number;
  } | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showFeasibilityWarning, setShowFeasibilityWarning] = useState(false);

  // VMA recalculation modal states
  const [showVMAModal, setShowVMAModal] = useState(false);
  const [vmaMode, setVmaMode] = useState<'manual' | 'feeling'>('manual');
  const [newVMAValue, setNewVMAValue] = useState(plan.vma ? plan.vma.toFixed(1) : '');
  const [vmaFeeling, setVmaFeeling] = useState<'too_fast' | 'ok' | 'too_slow'>('too_fast');
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Sync plan if prop changes (also normalize)
  useEffect(() => {
    setPlan(normalizePlanDays(initialPlan));
  }, [initialPlan]);

  // Toast state pour la célébration
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubMessage, setToastSubMessage] = useState('');


  // Settings Context
  const { paceUnit, togglePaceUnit } = useSettings();

  // Fonction de conversion des allures
  const convertPace = (pace: string | undefined): string => {
    if (!pace || pace === "-") return "-";
    
    // Extraire le format mm:ss
    const minKmMatch = pace.match(/(\d+):(\d+)/);
    if (!minKmMatch) return pace;
    
    const min = parseInt(minKmMatch[1]);
    const sec = parseInt(minKmMatch[2]);
    const totalMin = min + sec / 60;
    
    if (paceUnit === "km/h") {
      // Convertir en km/h
      if (totalMin > 0) {
        return (60 / totalMin).toFixed(1) + " km/h";
      }
      return pace;
    }
    // Garder en min/km
    return pace;
  };

  // Feedback Form State
  const [feedbackRpe, setFeedbackRpe] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [stravaMatch, setStravaMatch] = useState<StravaActivityMatch | null>(null);
  const [stravaMatchLoading, setStravaMatchLoading] = useState(false);
  const [stravaSearchDone, setStravaSearchDone] = useState(false);
  const stravaRequestRef = useRef(0);

  useEffect(() => {
    if (user?.stravaConnected) {
      setStravaConnected(true);
    }
  }, [user]);

  const handleUnlockClick = () => {
    navigate('/pricing');
  };

  // Helper to match sessions: prefer ID, fallback to composite key (day + title)
  const sessionsMatch = (s1: Session, s2: Session): boolean => {
    if (s1.id && s2.id && s1.id !== '' && s2.id !== '') {
      return s1.id === s2.id;
    }
    return s1.day === s2.day && s1.title === s2.title;
  };

  // Vérifier si l'utilisateur est Premium (double check: prop isLocked OU user.isPremium)
  const userIsPremium = user?.isPremium ?? false;
  const isPlanUniqueUser = !userIsPremium && (user?.hasPurchasedPlan ?? false);
  const canAccessPremiumFeatures = userIsPremium && !isLocked;
  // Plan Unique = accès complet au plan (toutes semaines) mais pas Strava/feedback/adaptation
  const canViewFullPlan = canAccessPremiumFeatures || isPlanUniqueUser;

  const handleExport = () => {
    setShowExportMenu(!showExportMenu);
  };

  const handleExportCalendar = () => {
    downloadICS(plan);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    downloadPDF(plan);
    setShowExportMenu(false);
  };

  const handleOpenFeedback = (session: Session, weekNumber: number) => {
    setSelectedSessionForFeedback(session);
    setSelectedWeekNumber(weekNumber);
    setFeedbackRpe(session.feedback?.rpe || 5);
    setFeedbackNotes(session.feedback?.notes || "");
    setStravaSearchDone(false);

    // Si Strava connecté, chercher l'activité correspondante
    const existingStrava = session.feedback?.stravaData;
    if (existingStrava) {
      setStravaMatch(existingStrava);
      setStravaMatchLoading(false);
      setStravaSearchDone(true);
    } else if (user?.stravaConnected && user?.id) {
      setStravaMatch(null);
      setStravaMatchLoading(true);
      const requestId = ++stravaRequestRef.current;
      const sessionDate = resolveSessionDate(session, plan.startDate, weekNumber);
      findStravaActivityForSession(user.id, sessionDate, session.type)
        .then(match => {
          if (requestId !== stravaRequestRef.current) return;
          setStravaMatch(match);
          setStravaMatchLoading(false);
          setStravaSearchDone(true);
        })
        .catch(() => {
          if (requestId !== stravaRequestRef.current) return;
          setStravaMatch(null);
          setStravaMatchLoading(false);
          setStravaSearchDone(true);
        });
    } else {
      setStravaMatch(null);
      setStravaMatchLoading(false);
      setStravaSearchDone(false);
    }
  };

  const handleValidateFeedback = async (needsAdaptation: boolean) => {
    if (selectedSessionForFeedback && selectedWeekNumber !== null) {
      setIsSaving(true);
      try {
        const updatedSession = {
          ...selectedSessionForFeedback,
          feedback: {
            rpe: feedbackRpe,
            notes: feedbackNotes,
            completed: true,
            completedAt: new Date().toISOString(),
            adaptationRequested: needsAdaptation,
            ...(stravaMatch ? { stravaData: stravaMatch } : {})
          }
        };

        await updateSessionFeedback(plan.id, updatedSession, plan.userId, selectedWeekNumber);

        // Update local state immediately - only update the specific week
        setPlan(prevPlan => ({
          ...prevPlan,
          weeks: prevPlan.weeks.map(week => {
            if (week.weekNumber !== selectedWeekNumber) return week;
            return {
              ...week,
              sessions: week.sessions.map(s =>
                sessionsMatch(s, selectedSessionForFeedback) ? updatedSession : s
              )
            };
          })
        }));

        if (needsAdaptation && onAdaptPlan) {
          // Determine adaptation direction from RPE
          let direction: string;
          if (feedbackRpe <= 4) {
            direction = 'TOO_EASY';
          } else if (feedbackRpe <= 6) {
            direction = 'OPTIMAL';
          } else if (feedbackRpe <= 8) {
            direction = 'HARD';
          } else {
            direction = 'TOO_HARD';
          }

          // Current session details
          const sessionWeek = plan.weeks.find(w => w.weekNumber === selectedWeekNumber);
          const sessionPhase = sessionWeek?.phase || 'unknown';

          // Collect recent RPE history for trend detection
          const recentRPEs: string[] = [];
          plan.weeks.forEach((w) => {
            w.sessions.forEach((s) => {
              if (s.feedback?.completed && s.feedback.rpe) {
                recentRPEs.push(`S${w.weekNumber} ${s.day} "${s.title}" (${s.type}): RPE ${s.feedback.rpe}/10${s.feedback.notes ? ` — "${s.feedback.notes}"` : ''}`);
              }
            });
          });

          // Count missed/skipped sessions this week + identify which ones
          const currentWeekSessions = sessionWeek?.sessions || [];
          const completedThisWeek = currentWeekSessions.filter(s => s.feedback?.completed).length;
          const totalThisWeek = currentWeekSessions.filter(s => s.type !== 'Repos').length;
          const missedSessions = currentWeekSessions
            .filter(s => s.type !== 'Repos' && !s.feedback?.completed && s !== selectedSessionForFeedback)
            .map(s => `"${s.title}" (${s.type})`)
            .join(', ');

          // Build Strava comparison block if available
          const stravaBlock = stravaMatch ? `
══ DONNÉES STRAVA RÉELLES ══
Activité: "${stravaMatch.name}" (${stravaMatch.type})
Distance réelle: ${stravaMatch.distance} km (prévu: ${selectedSessionForFeedback.distance || 'N/A'})
Durée réelle: ${stravaMatch.movingTime} min (prévu: ${selectedSessionForFeedback.duration})
Allure moyenne: ${stravaMatch.avgPace} (cible: ${selectedSessionForFeedback.targetPace || 'N/A'})
D+ réel: ${stravaMatch.elevationGain}m (prévu: ${selectedSessionForFeedback.elevationGain ? selectedSessionForFeedback.elevationGain + 'm' : 'N/A'})
FC moyenne: ${stravaMatch.avgHeartrate ? stravaMatch.avgHeartrate + ' bpm' : 'N/A'}
FC max: ${stravaMatch.maxHeartrate ? stravaMatch.maxHeartrate + ' bpm' : 'N/A'}
` : '';

          const adaptationContext = `
══ SÉANCE ÉVALUÉE ══
Titre: "${selectedSessionForFeedback.title}"
Type: ${selectedSessionForFeedback.type}
Durée prévue: ${selectedSessionForFeedback.duration}
Distance prévue: ${selectedSessionForFeedback.distance || 'N/A'}
D+ prévu: ${selectedSessionForFeedback.elevationGain ? selectedSessionForFeedback.elevationGain + 'm' : 'N/A'}
Allure cible: ${selectedSessionForFeedback.targetPace || 'N/A'}
Semaine: ${selectedWeekNumber} | Phase: ${sessionPhase}
${stravaBlock}
══ FEEDBACK ══
RPE: ${feedbackRpe}/10
Catégorie RPE brut (à cross-checker avec le commentaire) : ${direction}
Commentaire: "${feedbackNotes.trim()}"
${sessionWeek?.isRecoveryWeek || sessionWeek?.phase === 'recuperation' ? '⚠️ SEMAINE DE RÉCUPÉRATION — interpréter le RPE en conséquence' : ''}

══ PROGRESSION CETTE SEMAINE ══
Séances complétées: ${completedThisWeek}/${totalThisWeek}
${missedSessions ? `Séances non encore faites: ${missedSessions}` : ''}

══ HISTORIQUE RPE RÉCENT ══
${recentRPEs.length > 0 ? recentRPEs.slice(-8).join('\n') : 'Premier feedback — être conservateur, max 1 modification'}
           `;

          // Close modal first, then run adaptation (await it so errors are visible)
          setSelectedSessionForFeedback(null);
          setToastMessage("Adaptation en cours...");
          setToastSubMessage("L'IA ajuste les prochaines semaines");
          setToastVisible(true);

          try {
            await onAdaptPlan(adaptationContext);
          } catch (adaptError) {
            console.error('[Feedback] Adaptation failed:', adaptError);
          }
        } else {
          // Afficher le toast de célébration
          const encouragements = [
            "Bravo, tu progresses !",
            "Excellent travail !",
            "Continue comme ça !",
            "Tu es sur la bonne voie !",
            "Séance validée avec succès !"
          ];
          const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
          setToastMessage(randomMessage);
          setToastSubMessage(`"${selectedSessionForFeedback.title}" complétée`);
          setToastVisible(true);
          setSelectedSessionForFeedback(null);
        }
      } catch (error: any) {
        console.error("Failed to save feedback", error);
        const detail = error?.message || error?.code || 'Erreur inconnue';
        alert(`Erreur lors de l'enregistrement du feedback : ${detail}. Vérifie ta connexion et réessaie.`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCloseToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  // Quick complete handler - permet de marquer une séance comme faite/non faite rapidement
  const handleQuickComplete = async (session: Session, completed: boolean, weekNumber: number) => {
    try {
      const updatedSession = {
        ...session,
        feedback: {
          ...session.feedback,
          rpe: session.feedback?.rpe || 5,
          notes: session.feedback?.notes || '',
          completed: completed,
          adaptationRequested: session.feedback?.adaptationRequested || false
        }
      };

      await updateSessionFeedback(plan.id, updatedSession, plan.userId, weekNumber);

      // Update local state immediately for instant UI feedback - only update the specific week
      setPlan(prevPlan => ({
        ...prevPlan,
        weeks: prevPlan.weeks.map(week => {
          if (week.weekNumber !== weekNumber) return week;
          return {
            ...week,
            sessions: week.sessions.map(s =>
              sessionsMatch(s, session) ? updatedSession : s
            )
          };
        })
      }));

      // Toast de feedback
      if (completed) {
        const encouragements = [
          "Bravo !",
          "Bien joué !",
          "Séance validée !",
          "Continue comme ça !"
        ];
        setToastMessage(encouragements[Math.floor(Math.random() * encouragements.length)]);
        setToastSubMessage(`"${session.title}" complétée`);
      } else {
        setToastMessage("Séance réouverte");
        setToastSubMessage(`"${session.title}" marquée comme non faite`);
      }
      setToastVisible(true);
    } catch (error) {
      console.error("Erreur lors du marquage rapide:", error);
      alert("Erreur lors de la mise à jour de la séance.");
    }
  };

  const getFeasibilityStyle = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: <ShieldCheck /> };
      case 'BON': return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: <CheckCircle /> };
      case 'AMBITIEUX': return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: <Activity /> };
      case 'RISQUÉ': return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: <AlertTriangle /> };
      case 'IRRÉALISTE': return { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', icon: <AlertTriangle /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', icon: <Activity /> };
    }
  };

  // Recalcul en temps réel de la faisabilité à partir du contexte de génération
  // Permet de bénéficier des améliorations du scoring sans re-générer les plans
  const liveFeasibility = useMemo<FeasibilityResult | null>(() => {
    const ctx = plan.generationContext;
    if (!ctx?.vma || !ctx.questionnaireSnapshot) return null;
    const q = ctx.questionnaireSnapshot;
    const hasChrono = !!(q.recentRaceTimes?.distance5km || q.recentRaceTimes?.distance10km || q.recentRaceTimes?.distanceHalfMarathon || q.recentRaceTimes?.distanceMarathon);
    try {
      return calculateFeasibility({
        vma: ctx.vma,
        targetTime: q.targetTime || plan.targetTime,
        distance: q.subGoal || plan.distance || (q.trailDetails?.distance ? `${q.trailDetails.distance} km` : ''),
        goal: q.goal || plan.goal || '',
        level: q.level || '',
        planWeeks: ctx.periodizationPlan?.totalWeeks || plan.weeks.length,
        currentVolume: q.currentWeeklyVolume,
        currentWeeklyElevation: q.currentWeeklyElevation,
        trailElevation: q.trailDetails?.elevation,
        trailDistance: q.trailDetails?.distance,
        hasInjury: q.injuries?.hasInjury || false,
        hasChrono,
        age: q.age,
        weight: q.weight,
        height: q.height,
        frequency: q.frequency || plan.sessionsPerWeek,
      });
    } catch (e) {
      console.error('[PlanView] Erreur recalcul faisabilité:', e);
      return null;
    }
  }, [plan]);

  // Utiliser le score recalculé en priorité, sinon le score stocké
  const activeFeasibility = liveFeasibility || plan.feasibility;
  const activeConfidenceScore = liveFeasibility?.score ?? plan.confidenceScore;

  const fStyle = activeFeasibility ? getFeasibilityStyle(activeFeasibility.status) : getFeasibilityStyle('BON');

  // Calcul de la progression globale
  const progressStats = useMemo(() => {
    const totalSessions = plan.weeks.reduce((acc, week) => acc + week.sessions.length, 0);
    const completedSessions = plan.weeks.reduce((acc, week) =>
      acc + week.sessions.filter(s => s.feedback?.completed).length, 0
    );
    // Utiliser le nombre total de semaines prévu si en mode preview
    const totalWeeks = plan.isPreview && plan.generationContext?.periodizationPlan?.totalWeeks
      ? plan.generationContext.periodizationPlan.totalWeeks
      : plan.weeks.length;

    // Calcul de la semaine actuelle
    const rawStartDate273 = new Date(plan.startDate);
    const startDayOfWeek273 = rawStartDate273.getDay();
    const daysToMonday273 = startDayOfWeek273 === 0 ? -6 : 1 - startDayOfWeek273;
    const startDate = new Date(rawStartDate273);
    startDate.setDate(rawStartDate273.getDate() + daysToMonday273);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.max(1, Math.min(totalWeeks, Math.floor(diffDays / 7) + 1));

    // Semaines complétées (toutes les séances d'une semaine sont faites)
    const completedWeeks = plan.weeks.filter(week =>
      week.sessions.length > 0 && week.sessions.every(s => s.feedback?.completed)
    ).length;

    return {
      totalSessions,
      completedSessions,
      totalWeeks,
      currentWeekNumber,
      completedWeeks,
      progressPercent: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
    };
  }, [plan]);

  // Génère les semaines de prévisualisation basées sur le contexte de génération
  const previewWeeks = useMemo(() => {
    if (!plan.isPreview || !plan.generationContext?.periodizationPlan) {
      return [];
    }

    const { totalWeeks, weeklyPhases, weeklyVolumes } = plan.generationContext.periodizationPlan;
    const existingWeekNumbers = new Set(plan.weeks.map(w => w.weekNumber));

    // Mapping des phases vers des thèmes lisibles
    const phaseThemes: Record<string, string> = {
      'fondamental': 'Base aérobie',
      'developpement': 'Développement',
      'specifique': 'Travail spécifique',
      'affutage': 'Affûtage',
      'recuperation': 'Récupération'
    };

    const previewWeeksList: { weekNumber: number; theme: string; volume: number; phase: string; sessionsCount: number }[] = [];

    for (let i = 0; i < totalWeeks; i++) {
      const weekNum = i + 1;
      if (!existingWeekNumbers.has(weekNum)) {
        const phase = weeklyPhases[i] || 'fondamental';
        const volume = weeklyVolumes[i] || 0;
        // Estimer le nombre de séances basé sur le questionnaire
        const sessionsPerWeek = plan.generationContext.questionnaireSnapshot?.frequency || 3;

        previewWeeksList.push({
          weekNumber: weekNum,
          theme: `${phaseThemes[phase] || phase} - S${weekNum}`,
          volume,
          phase,
          sessionsCount: sessionsPerWeek
        });
      }
    }

    return previewWeeksList;
  }, [plan]);

  // Mapping des jours français vers leur index (Lundi = 0)
  const dayToIndex: Record<string, number> = {
    'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3,
    'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6
  };

  // Formater une date en français
  const formatDate = (date: Date, format: 'short' | 'long' | 'dayMonth' = 'short') => {
    const options: Intl.DateTimeFormatOptions = format === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : format === 'dayMonth'
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Calculer la date d'une séance (utilise dateOverride si présent)
  const getSessionDate = (weekNumber: number, dayName: string, session?: Session): Date => {
    if (session) {
      return resolveSessionDate(session, plan.startDate, weekNumber);
    }
    // Fallback sans session (utilisé par getWeekStatus)
    const rawStartDate = new Date(plan.startDate);
    const startDayOfWeek = rawStartDate.getDay();
    const daysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
    const startDate = new Date(rawStartDate);
    startDate.setDate(rawStartDate.getDate() + daysToMonday);
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (weekNumber - 1) * 7);
    const dayIndex = dayToIndex[dayName] ?? 0;
    const sessionDate = new Date(weekStart);
    sessionDate.setDate(weekStart.getDate() + dayIndex);
    return sessionDate;
  };

  // Vérifier si une date est aujourd'hui
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Statut d'une semaine
  const getWeekStatus = (week: typeof plan.weeks[0], weekIndex: number) => {
    // Ajuster startDate au Lundi de sa semaine
    const rawStartDate = new Date(plan.startDate);
    const startDayOfWeek = rawStartDate.getDay();
    const daysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
    const startDate = new Date(rawStartDate);
    startDate.setDate(rawStartDate.getDate() + daysToMonday);
    const now = new Date();

    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (week.weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Dimanche de la semaine

    const completedCount = week.sessions.filter(s => s.feedback?.completed).length;
    const totalCount = week.sessions.length;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    // Formater les dates de la semaine
    const dateRange = `${formatDate(weekStart, 'dayMonth')} - ${formatDate(weekEnd, 'dayMonth')}`;

    if (now < weekStart) {
      return { status: 'future' as const, completedCount, totalCount, allCompleted, weekStart, weekEnd, dateRange };
    } else if (now >= weekStart && now <= weekEnd) {
      return { status: 'current' as const, completedCount, totalCount, allCompleted, weekStart, weekEnd, dateRange };
    } else {
      return { status: 'past' as const, completedCount, totalCount, allCompleted, weekStart, weekEnd, dateRange };
    }
  };

  // State pour gérer les semaines repliées
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());

  const toggleWeekCollapse = (weekNumber: number) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  // --- Strava Week Comparison ---
  const handleCompareWeek = async (week: Week, weekStart: Date) => {
    if (!user?.id || !stravaConnected) return;
    setComparisonLoading(week.weekNumber);
    try {
      const result = await compareWeekWithStrava(user.id, week, weekStart);
      setComparisonResult(result);
      setShowComparisonModal(true);

      // Check if next week exists for adaptation
      const nextWeekIndex = plan.weeks.findIndex(w => w.weekNumber === week.weekNumber) + 1;
      if (nextWeekIndex < plan.weeks.length) {
        setAdaptationNextWeek(plan.weeks[nextWeekIndex]);
      } else {
        setAdaptationNextWeek(null);
      }
    } catch (error) {
      console.error('Erreur comparaison Strava:', error);
      alert('Erreur lors de la comparaison avec Strava. Vérifie ta connexion.');
    } finally {
      setComparisonLoading(null);
    }
  };

  const handleShowAdaptation = () => {
    if (!comparisonResult || !adaptationNextWeek) return;
    const suggestion = generateAdaptationSuggestions(comparisonResult, adaptationNextWeek);
    setAdaptationSuggestion(suggestion);
    setShowAdaptationModal(true);
  };

  const handleApplyAdaptation = async () => {
    if (!adaptationSuggestion || !adaptationNextWeek || !comparisonResult) return;
    const adaptedWeek = applyAdaptation(adaptationNextWeek, adaptationSuggestion);

    const updatedPlan = {
      ...plan,
      weeks: plan.weeks.map(w =>
        w.weekNumber === adaptedWeek.weekNumber ? adaptedWeek : w
      )
    };

    setPlan(updatedPlan);

    // Save to Firestore
    try {
      await savePlan(updatedPlan);
      setToastMessage('Semaine adaptée !');
      setToastSubMessage(`Semaine ${adaptedWeek.weekNumber} modifiée selon tes performances`);
      setToastVisible(true);
    } catch (error) {
      console.error('Erreur sauvegarde adaptation:', error);
    }

    setShowAdaptationModal(false);
    setShowComparisonModal(false);
    setAdaptationSuggestion(null);
  };

  // --- Date editing handlers ---
  const handleOpenDatePicker = (session: Session, weekNumber: number) => {
    setDatePickerSession(session);
    setDatePickerWeek(weekNumber);
  };

  const handleDateSelected = (newDateISO: string) => {
    if (!datePickerSession) return;

    const currentDate = resolveSessionDate(datePickerSession, plan.startDate, datePickerWeek);
    currentDate.setHours(0, 0, 0, 0);
    const [ny, nm, nd] = newDateISO.split('-').map(Number);
    const newDate = new Date(ny, nm - 1, nd, 0, 0, 0, 0);
    const daysDiff = Math.round((newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    const currentWeek = datePickerWeek;
    const targetWeek = getWeekNumberForDate(newDate, plan.startDate);

    if (targetWeek !== currentWeek) {
      // Cross-week: show confirmation
      setPendingDateChange({
        session: datePickerSession,
        weekNumber: datePickerWeek,
        newDateISO,
        daysDiff,
        fromWeek: currentWeek,
        toWeek: targetWeek
      });
      setDatePickerSession(null);
      setShowCrossWeekConfirm(true);
    } else {
      // Same week: apply directly
      applySingleSessionDateChange(datePickerSession, datePickerWeek, newDateISO);
      setDatePickerSession(null);
    }
  };

  const applySingleSessionDateChange = async (session: Session, weekNumber: number, newDateISO: string) => {
    try {
      await updateSessionDate(plan.id, session.id, weekNumber, newDateISO);
      // Update local state
      setPlan(prev => ({
        ...prev,
        weeks: prev.weeks.map(w => {
          if (w.weekNumber !== weekNumber) return w;
          return {
            ...w,
            sessions: w.sessions.map(s =>
              s.id === session.id ? { ...s, dateOverride: newDateISO } : s
            )
          };
        })
      }));
      setToastMessage('Date modifiée');
      setToastSubMessage(`"${session.title}" déplacée`);
      setToastVisible(true);
    } catch (error) {
      console.error('Erreur modification date:', error);
      alert('Erreur lors de la modification de la date.');
    }
  };

  const handleShiftAllSessions = async () => {
    if (!pendingDateChange) return;
    try {
      await shiftSessionDates(
        plan.id,
        pendingDateChange.weekNumber,
        pendingDateChange.session.id,
        pendingDateChange.daysDiff,
        plan.startDate
      );
      // Reload plan from local computation
      const targetSessionId = pendingDateChange.session.id;
      const targetWeekNumber = pendingDateChange.weekNumber;
      const shift = pendingDateChange.daysDiff;
      setPlan(prev => {
        let found = false;
        return {
          ...prev,
          weeks: prev.weeks.map(w => ({
            ...w,
            sessions: w.sessions.map(s => {
              if (s.id === targetSessionId && w.weekNumber === targetWeekNumber) {
                found = true;
              }
              if (!found) return s;
              const currentDate = resolveSessionDate(s, prev.startDate, w.weekNumber);
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + shift);
              return { ...s, dateOverride: toISODateString(newDate) };
            })
          }))
        };
      });
      setToastMessage('Séances décalées');
      setToastSubMessage(`${Math.abs(pendingDateChange.daysDiff)} jour(s) ${pendingDateChange.daysDiff > 0 ? 'en avant' : 'en arrière'}`);
      setToastVisible(true);
    } catch (error) {
      console.error('Erreur decalage:', error);
      alert('Erreur lors du décalage des séances.');
    }
    setShowCrossWeekConfirm(false);
    setPendingDateChange(null);
  };

  const handleMoveOnly = () => {
    if (!pendingDateChange) return;
    applySingleSessionDateChange(pendingDateChange.session, pendingDateChange.weekNumber, pendingDateChange.newDateISO);
    setShowCrossWeekConfirm(false);
    setPendingDateChange(null);
  };

  const handleStartDateChange = async (newStartDate: string) => {
    try {
      // Vérifier si le nouveau startDate réduit le nombre de semaines disponibles
      const raceDate = plan.raceDate || plan.generationContext?.questionnaireSnapshot?.raceDate;
      if (raceDate) {
        const newStart = new Date(newStartDate);
        const race = new Date(raceDate);
        const availableWeeks = Math.floor((race.getTime() - newStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const planWeeks = plan.weeks.length;

        if (availableWeeks < planWeeks) {
          const confirmRecreate = window.confirm(
            `Attention : ta course est dans ${availableWeeks} semaines à partir de cette date, mais ton plan fait ${planWeeks} semaines.\n\n` +
            `Le plan ne rentrera pas dans ce délai. On te recommande de recréer un plan adapté à cette durée.\n\n` +
            `Cliquer OK pour revenir au questionnaire et recréer un plan (tes données seront pré-remplies).`
          );
          if (confirmRecreate) {
            setShowStartDatePicker(false);
            navigate('/');
            return;
          }
          // L'utilisateur a annulé — on ne change pas la date
          setShowStartDatePicker(false);
          return;
        }
      }

      await updatePlanStartDate(plan.id, newStartDate);
      // Update local state: new startDate, remove all dateOverrides
      setPlan(prev => ({
        ...prev,
        startDate: newStartDate,
        weeks: prev.weeks.map(w => ({
          ...w,
          sessions: w.sessions.map(s => ({ ...s, dateOverride: undefined }))
        }))
      }));
      setShowStartDatePicker(false);
      setToastMessage('Date de début modifiée');
      setToastSubMessage('Les dates des séances ont été recalculées');
      setToastVisible(true);
    } catch (error) {
      console.error('Erreur modification date de début:', error);
      alert('Erreur lors de la modification de la date de début.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 relative pb-24">
      {/* HEADER & CONTROLS */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{plan.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <Activity size={16} className="text-secondary" /> {plan.goal}
              </span>
              {plan.targetTime && (
                <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  <Clock size={16} className="text-secondary" /> Objectif: {plan.targetTime}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* PACE TOGGLE */}
            <button
              onClick={togglePaceUnit}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-slate-200 text-sm font-bold text-slate-600 hover:border-slate-300 transition-all"
            >
              <div className={`w-8 h-4 rounded-full relative transition-colors ${paceUnit === 'km/h' ? 'bg-secondary' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${paceUnit === 'km/h' ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span>{paceUnit}</span>
            </button>

            <div className="relative">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-sm bg-white text-slate-700 border border-slate-300 hover:border-accent hover:text-accent"
              >
                <Calendar size={16} />
                Exporter
                <ChevronDown size={14} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 min-w-[200px]">
                  <button onClick={handleExportCalendar} className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" /> Calendrier (.ics)
                  </button>
                  <button onClick={handleExportPDF} className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2">
                    <FileText size={16} className="text-red-500" /> PDF (imprimer)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('PROGRAMME')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'PROGRAMME' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Mon Programme
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'STATS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Statistiques
          </button>
          <button
            onClick={() => setActiveTab("STRAVA")}
            className={`px-6 py-3 text-sm transition-all border-b-2 flex items-center gap-2 text-orange-500 font-bold ${activeTab === "STRAVA" ? "border-orange-500" : "border-transparent"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            Bilan Mensuel
          </button>
        </div>

        {/* SYNTHÈSE DU PLAN + PROGRESSION */}
        {activeTab === 'PROGRAMME' && (
          <div className="space-y-4">
            {/* ROW 1: Message du Coach (pleine largeur) */}
            {plan.welcomeMessage && (
              <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 rounded-2xl border border-indigo-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/50 rounded-full blur-3xl -mr-10 -mt-10" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-indigo-900">Message de ton Coach IA</h3>
                      <p className="text-xs text-indigo-600">Conseils personnalisés pour ta préparation</p>
                    </div>
                  </div>
                  <p className="text-indigo-800 leading-relaxed pl-15">{plan.welcomeMessage}</p>
                </div>
              </div>
            )}


            {/* ENCADRÉ ALLURES */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100/50 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Zap size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-900">Mes allures d'entraînement</h3>
                      <p className="text-xs text-orange-600">Estimations basées sur ton profil</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-orange-700/70 mb-4">Ces allures s'affineront au fil de tes entraînements et retours.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs text-slate-500 mb-1">Endurance (EF)</p>
                    <p className="font-bold text-slate-800">{convertPace(plan.paces?.efPace)}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs text-slate-500 mb-1">Seuil</p>
                    <p className="font-bold text-slate-800">{convertPace(plan.paces?.seuilPace)}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs text-slate-500 mb-1">VMA</p>
                    <p className="font-bold text-slate-800">{convertPace(plan.paces?.vmaPace)}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs text-slate-500 mb-1">VMA (km/h)</p>
                    <p className="font-bold text-slate-800">{plan.vma ? plan.vma.toFixed(1) : "-"}</p>
                  </div>
                </div>
                {plan.vmaSource && <p className="text-xs text-orange-600 mt-3">📊 Source : {plan.vmaSource}</p>}
                {onRecalculateVMA && (
                  <button
                    onClick={() => setShowVMAModal(true)}
                    className="mt-3 w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    Ajuster mes allures
                  </button>
                )}
              </div>
            </div>
            {/* ROW 2: 3 cartes côte à côte */}
            <div className="grid md:grid-cols-3 gap-4">

              {/* CARTE 1: Objectif */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Target size={20} className="text-accent" />
                  </div>
                  <h4 className="font-bold text-slate-900">Objectif</h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{plan.goal}</p>
                    {plan.distance && <p className="text-accent font-semibold text-sm">{plan.distance}</p>}
                  </div>

                  {plan.targetTime && (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Temps visé :</span>
                      <span className="font-bold text-slate-900">{plan.targetTime}</span>
                    </div>
                  )}

                  {plan.raceDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar size={14} />
                      <span>Course le {new Date(plan.raceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                  )}

                  {/* Date de début avec bouton modifier */}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={14} />
                    <span>Début : {(() => { const [y,m,d] = plan.startDate.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); })()}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowStartDatePicker(true); }}
                      className="p-1 text-slate-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                      title="Modifier la date de début"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  {/* Score de confiance explicite (recalculé en temps réel) */}
                  {(activeFeasibility || activeConfidenceScore) && (
                    <div className={`mt-3 p-4 rounded-xl ${fStyle.bg} border ${fStyle.border}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`${fStyle.text}`}>{React.cloneElement(fStyle.icon as React.ReactElement, { size: 18 })}</span>
                        <span className={`font-bold text-sm ${fStyle.text}`}>Niveau de confiance</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-lg font-black ${fStyle.text}`}>{activeFeasibility?.status || 'BON'}</span>
                          {activeConfidenceScore != null && (
                            <span className={`ml-2 text-sm font-bold ${fStyle.text} opacity-70`}>({activeConfidenceScore}%)</span>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs ${fStyle.text} opacity-80 mt-2 leading-relaxed`}>
                        {activeFeasibility?.message || (
                          <>
                            {activeFeasibility?.status === 'EXCELLENT' && "Objectif très réaliste au vu de ton profil. Continue comme ça !"}
                            {activeFeasibility?.status === 'BON' && "Objectif atteignable avec un entraînement régulier."}
                            {activeFeasibility?.status === 'AMBITIEUX' && "Objectif ambitieux qui demandera de la rigueur et de la constance."}
                            {activeFeasibility?.status === 'RISQUÉ' && "Objectif difficile. Écoute ton corps et adapte si nécessaire."}
                            {!activeFeasibility?.status && "Ton plan est calibré selon ton profil."}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CARTE 2: Où courir */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <MapPin size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Où courir</h4>
                    {plan.location && <p className="text-xs text-slate-500">à {plan.location}</p>}
                  </div>
                </div>

                {plan.suggestedLocations && plan.suggestedLocations.length > 0 ? (
                  <div className="space-y-3">
                    {plan.suggestedLocations.slice(0, 3).map((loc, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-emerald-50 to-slate-50 rounded-xl p-4 border border-emerald-100 hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {loc.type === 'PARK' ? '🌳' : loc.type === 'TRACK' ? '🏟️' : loc.type === 'HILL' ? '⛰️' : '🍃'}
                          </span>
                          <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pl-7">{loc.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <MapPin size={24} className="text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Aucun lieu suggéré</p>
                  </div>
                )}
              </div>

              {/* CARTE 3: Progression */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                {/* Fond décoratif subtil */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-orange-100 flex items-center justify-center">
                      <TrendingUp size={20} className="text-accent" />
                    </div>
                    <h4 className="font-bold text-slate-900">Progression</h4>
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span className="text-5xl font-black bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">{progressStats.progressPercent}</span>
                      <span className="text-2xl font-bold text-slate-300">%</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">{progressStats.completedSessions}<span className="text-slate-300">/{progressStats.totalSessions}</span></p>
                      <p className="text-xs text-slate-500">séances complétées</p>
                    </div>
                  </div>

                  {/* Barre de progression améliorée */}
                  <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-orange-400 to-orange-300 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressStats.progressPercent}%` }}
                    >
                      {/* Effet de brillance animé */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                    {/* Marqueurs de progression */}
                    <div className="absolute inset-0 flex justify-between px-1">
                      {[25, 50, 75].map((marker) => (
                        <div
                          key={marker}
                          className="w-px h-full bg-slate-200/50"
                          style={{ marginLeft: `${marker}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mini timeline améliorée */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {plan.weeks.map((week, idx) => {
                      const weekStatus = getWeekStatus(week, idx);
                      return (
                        <div
                          key={week.weekNumber}
                          className="cursor-pointer group relative"
                          onClick={() => {
                            const element = document.getElementById(`week-${week.weekNumber}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          title={`Semaine ${week.weekNumber}: ${week.theme}`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-200 group-hover:scale-110 group-hover:shadow-md
                              ${weekStatus.allCompleted
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm shadow-emerald-200'
                                : weekStatus.status === 'current'
                                  ? 'bg-gradient-to-br from-accent to-orange-500 text-white ring-2 ring-accent/30 shadow-sm shadow-accent/20'
                                  : weekStatus.status === 'past'
                                    ? 'bg-slate-200 text-slate-500'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }
                            `}
                          >
                            {weekStatus.allCompleted ? <CheckCircle size={14} /> : week.weekNumber}
                          </div>
                        </div>
                      );
                    })}
                    {/* Semaines de prévisualisation (verrouillées) */}
                    {previewWeeks.map((previewWeek) => (
                      <div
                        key={`preview-${previewWeek.weekNumber}`}
                        className="group relative"
                        title={`Semaine ${previewWeek.weekNumber}: ${previewWeek.theme} (verrouillée)`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold bg-slate-100 text-slate-300 border border-dashed border-slate-300 relative">
                          {previewWeek.weekNumber}
                          <Lock size={8} className="absolute -bottom-0.5 -right-0.5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: Avertissement sécurité (si présent) */}
            {/* Conseil de prudence - toujours affiché */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-800 text-sm mb-1">Conseil de prudence</h4>
                {activeFeasibility?.safetyWarning && (
                  <p className="text-amber-700 text-sm mb-2">{activeFeasibility.safetyWarning}</p>
                )}
                <p className="text-amber-700 text-sm">Avant de commencer ou reprendre une activité sportive, consulte un médecin pour valider ton aptitude à la pratique de la course à pied.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === "STATS" && <Statistics plan={plan} />}

      {activeTab === "STRAVA" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* HEADER STRAVA */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <div>
                <h2 className="text-2xl font-bold">Bilan Mensuel</h2>
                <p className="text-orange-100 text-sm">
                  {stravaConnected ? 'Analyse de tes 30 derniers jours' : 'Connecte-toi pour débloquer les analyses'}
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          {!canAccessPremiumFeatures ? (
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 text-center">
              <Lock size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {isPlanUniqueUser ? 'Réservé aux abonnés Premium' : 'Fonctionnalité Premium'}
              </h3>
              <p className="text-slate-500 mb-4">
                {isPlanUniqueUser
                  ? 'Passe en Premium pour débloquer Strava, les analyses hebdomadaires et l\'adaptation automatique de ton plan.'
                  : 'Connecte Strava et laisse l\'IA analyser tes sorties pour adapter automatiquement ton plan.'}
              </p>
              <button onClick={handleUnlockClick} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all">
                {isPlanUniqueUser ? 'Passer en Premium' : 'Débloquer'}
              </button>
            </div>
          ) : (
            <StravaConnect isConnected={stravaConnected} onConnect={() => setStravaConnected(true)} isPremium={canAccessPremiumFeatures} />
          )}

          <p className="text-center text-xs text-slate-400">Powered by Strava</p>
        </div>
      )}

      {activeTab === "PROGRAMME" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Upsell banner for Plan Unique users */}
          {isPlanUniqueUser && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-amber-500" />
                <p className="text-sm text-slate-700">
                  <span className="font-bold">Plan Unique actif.</span> Passe en Premium pour débloquer Strava, les feedbacks et l'adaptation automatique.
                </p>
              </div>
              <button onClick={handleUnlockClick} className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-all whitespace-nowrap">
                Voir les offres
              </button>
            </div>
          )}

          {/* WEEKS & SESSIONS LIST */}
          <div className="space-y-6">
            {plan.weeks.map((week, index) => {
              // Semaine verrouillée si: pas premium, pas plan unique, ET pas la première semaine
              const isWeekLocked = !canViewFullPlan && index > 0;
              const weekStatus = getWeekStatus(week, index);
              const isCollapsed = collapsedWeeks.has(week.weekNumber);

              return (
                <div
                  key={week.weekNumber}
                  id={`week-${week.weekNumber}`}
                  className={`relative ${isWeekLocked ? 'select-none' : ''}`}
                >
                  {/* WEEK CARD */}
                  <div className={`
                    rounded-2xl border-2 overflow-hidden transition-all
                    ${weekStatus.status === 'current'
                      ? 'border-accent bg-gradient-to-br from-accent/5 to-orange-50 shadow-lg shadow-accent/10'
                      : weekStatus.allCompleted
                        ? 'border-green-200 bg-green-50/50'
                        : weekStatus.status === 'past'
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-200 bg-white'
                    }
                  `}>
                    {/* WEEK HEADER - Cliquable pour replier */}
                    <div
                      className={`
                        flex items-center gap-4 p-4 cursor-pointer transition-all
                        ${weekStatus.status === 'current' ? 'bg-accent/10' : 'bg-white/80'}
                        hover:bg-slate-50
                      `}
                      onClick={() => toggleWeekCollapse(week.weekNumber)}
                    >
                      {/* Numéro de semaine avec statut */}
                      <div className={`
                        w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold shadow-md
                        ${weekStatus.allCompleted
                          ? 'bg-green-500 text-white'
                          : weekStatus.status === 'current'
                            ? 'bg-accent text-white'
                            : weekStatus.status === 'past'
                              ? 'bg-slate-400 text-white'
                              : 'bg-slate-200 text-slate-600'
                        }
                      `}>
                        {weekStatus.allCompleted ? (
                          <CheckCircle size={24} />
                        ) : (
                          <>
                            <span className="text-[10px] uppercase opacity-80">Sem.</span>
                            <span className="text-xl leading-none">{week.weekNumber}</span>
                          </>
                        )}
                      </div>

                      {/* Infos de la semaine */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 truncate">{week.theme}</h3>
                          {weekStatus.status === 'current' && (
                            <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                              En cours
                            </span>
                          )}
                          {weekStatus.allCompleted && (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Terminée
                            </span>
                          )}
                          {index === 0 && isLocked && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Aperçu Gratuit
                            </span>
                          )}
                        </div>

                        {/* Date + volume de la semaine */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-500 font-medium">{weekStatus.dateRange}</span>
                          </span>
                          {(() => {
                            const weekTotalKm = week.sessions.reduce((sum, s) => {
                              const distStr = s.distance || s.distance_km || '';
                              const match = String(distStr).match(/([\d.]+)\s*km/i);
                              if (match) return sum + parseFloat(match[1]);
                              const num = parseFloat(String(distStr));
                              return !isNaN(num) ? sum + num : sum;
                            }, 0);
                            const runningSessions = week.sessions.filter(s => s.type !== 'Renforcement' && s.type !== 'Repos' && s.type !== 'Repos Actif').length;
                            return weekTotalKm > 0 ? (
                              <span className="text-sm text-slate-400 font-medium">
                                ~{Math.round(weekTotalKm)} km  ·  {week.sessions.length} séances
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400 font-medium">
                                {week.sessions.length} séances
                              </span>
                            );
                          })()}
                        </div>

                        {/* Barre de progression de la semaine */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden max-w-[200px] shadow-inner relative">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                                weekStatus.allCompleted
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                  : weekStatus.status === 'current'
                                    ? 'bg-gradient-to-r from-accent to-orange-400'
                                    : 'bg-gradient-to-r from-slate-300 to-slate-400'
                              }`}
                              style={{ width: `${weekStatus.totalCount > 0 ? (weekStatus.completedCount / weekStatus.totalCount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${
                            weekStatus.allCompleted
                              ? 'text-emerald-600'
                              : weekStatus.status === 'current'
                                ? 'text-accent'
                                : 'text-slate-500'
                          }`}>
                            {weekStatus.completedCount}/{weekStatus.totalCount}
                          </span>
                        </div>
                      </div>

                      {/* Boutons actions semaine */}
                      <div className="flex items-center gap-2">
                        {/* Bouton Analyser ma semaine - semaines passées ou en cours, premium uniquement */}
                        {canAccessPremiumFeatures && (weekStatus.status === 'past' || weekStatus.status === 'current') && !isWeekLocked && (
                          stravaConnected ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompareWeek(week, weekStatus.weekStart);
                              }}
                              disabled={comparisonLoading === week.weekNumber}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all disabled:opacity-50"
                            >
                              {comparisonLoading === week.weekNumber ? (
                                <Loader size={14} className="animate-spin" />
                              ) : (
                                <span>📊</span>
                              )}
                              <span className="hidden sm:inline">Analyser ma semaine</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('STRAVA');
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all"
                              title="Connecte Strava pour analyser tes séances"
                            >
                              <span>📊</span>
                              <span className="hidden sm:inline">Strava</span>
                            </button>
                          )
                        )}

                        {/* Bouton replier/déplier */}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-all
                          ${isCollapsed ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'}
                        `}>
                          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* SESSIONS - Avec animation de repli */}
                    <div className={`
                      transition-all duration-300 ease-in-out overflow-hidden
                      ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}
                    `}>
                      {/* Hint analyse Strava */}
                      {canAccessPremiumFeatures && stravaConnected && (weekStatus.status === 'past' || weekStatus.status === 'current') && !isWeekLocked && (
                        <p className="px-4 pt-2 text-xs text-orange-500 italic">À utiliser quand tu as terminé ta semaine</p>
                      )}
                      <div className={`p-4 pt-2 space-y-3 ${isWeekLocked ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                        {week.sessions
                          .slice()
                          .sort((a, b) => {
                            const dateA = resolveSessionDate(a, plan.startDate, week.weekNumber);
                            const dateB = resolveSessionDate(b, plan.startDate, week.weekNumber);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .map((session, sIdx) => {
                          const sessionDate = getSessionDate(week.weekNumber, session.day, session);
                          const sessionIsToday = isToday(sessionDate);
                          return (
                            <SessionCard
                              key={sIdx}
                              session={session}
                              weekNumber={week.weekNumber}
                              isLocked={isWeekLocked}
                              onFeedbackClick={isWeekLocked ? undefined : handleOpenFeedback}
                              onQuickComplete={isWeekLocked ? undefined : handleQuickComplete}
                              onDateChange={isWeekLocked ? undefined : handleOpenDatePicker}
                              sessionDate={sessionDate}
                              isToday={sessionIsToday}
                              isPremium={userIsPremium || isPlanUniqueUser}
                              userEmail={user?.email}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* LOCKED OVERLAY */}
                  {isWeekLocked && index === 1 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-center border border-white max-w-lg mx-4 ring-1 ring-slate-900/5">
                        <div className="w-16 h-16 bg-gradient-to-br from-accent to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Star className="text-white" size={32} fill="currentColor" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Débloquez votre plan complet</h3>
                        <p className="text-slate-600 mb-8">Passez Premium pour visualiser l'intégralité du plan et exporter vers votre agenda.</p>
                        <button onClick={handleUnlockClick} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg w-full flex items-center justify-center gap-2">
                          <Zap size={20} fill="currentColor" /> Voir les offres Premium
                        </button>
                      </div>
                    </div>
                  )}
                  {/* OVERLAY "REGENERATION" (PREMIUM MAIS PLAN PARTIEL - besoin de regénérer) */}
                  {canViewFullPlan && plan.isFreePreview && index === 1 && onRegenerateFull && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-center border-2 border-green-500 max-w-lg mx-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <RefreshCw className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Plan débloqué !</h3>
                        <p className="text-slate-600 mb-8">
                          Cliquez ci-dessous pour générer le détail de toutes les semaines restantes.
                        </p>

                        <button
                          onClick={onRegenerateFull}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all w-full flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={20} /> Dévoiler les semaines suivantes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {/* Bouton générer pour les premium — JUSTE APRÈS la S1, bien visible */}
            {plan.isPreview && canViewFullPlan && !plan.fullPlanGenerated && onGenerateRemainingWeeks && (
              <div className="my-6 bg-gradient-to-r from-accent/10 to-orange-100 rounded-2xl p-6 border-2 border-accent/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {isGeneratingRemaining ? (
                      <RefreshCw className="text-white animate-spin" size={28} />
                    ) : (
                      <Zap className="text-white" size={28} fill="currentColor" />
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {isGeneratingRemaining ? 'Génération en cours...' : `Générer les ${previewWeeks.length} semaines restantes`}
                    </h3>
                    <p className="text-slate-600">
                      {isGeneratingRemaining
                        ? `L'IA génère les semaines 2 à ${plan.generationContext?.periodizationPlan?.totalWeeks || 12} avec les mêmes allures et la même cohérence.`
                        : `Votre semaine 1 est prête. Cliquez pour générer le plan complet avec la même cohérence d'allures.`
                      }
                    </p>
                    {plan.generationContext && !isGeneratingRemaining && (
                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        <span className="bg-white/80 px-2 py-1 rounded-full text-slate-600">VMA: <strong>{plan.generationContext.vma.toFixed(1)} km/h</strong></span>
                        <span className="bg-white/80 px-2 py-1 rounded-full text-slate-600">EF: <strong>{convertPace(plan.generationContext.paces.efPace)}</strong></span>
                        <span className="bg-white/80 px-2 py-1 rounded-full text-slate-600">Seuil: <strong>{convertPace(plan.generationContext.paces.seuilPace)}</strong></span>
                      </div>
                    )}
                  </div>
                  {!isGeneratingRemaining && (
                    <button
                      onClick={() => {
                        // Si feasibility RISQUÉ, IRRÉALISTE, AMBITIEUX ou score < 15 → afficher modal de warning
                        const status = activeFeasibility?.status;
                        const score = activeConfidenceScore ?? 100;
                        if (status === 'RISQUÉ' || status === 'IRRÉALISTE' || status === 'AMBITIEUX' || score < 15) {
                          setShowFeasibilityWarning(true);
                        } else {
                          onGenerateRemainingWeeks();
                        }
                      }}
                      className="bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Zap size={20} fill="currentColor" />
                      Générer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SEMAINES DE PRÉVISUALISATION (pour les plans en mode preview) */}
            {plan.isPreview && previewWeeks.length > 0 && (
              <>
                {/* CTA Premium au milieu - uniquement pour free users (pas plan_unique ni premium) */}
                {!canViewFullPlan && (
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-dashed border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <div className="bg-white px-6 py-4 rounded-2xl shadow-xl border-2 border-accent">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center">
                            <Lock className="text-white" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">Débloquez les {previewWeeks.length} semaines suivantes</p>
                            <p className="text-sm text-slate-500">Accédez au plan complet avec Premium</p>
                          </div>
                          <button
                            onClick={handleUnlockClick}
                            className="ml-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
                          >
                            <Zap size={18} fill="currentColor" />
                            Voir les offres
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Affichage des semaines verrouillées en aperçu */}
                {previewWeeks.map((previewWeek) => {
                  const rawStartDatePrev = new Date(plan.startDate);
                  const startDayOfWeekPrev = rawStartDatePrev.getDay();
                  const daysToMondayPrev = startDayOfWeekPrev === 0 ? -6 : 1 - startDayOfWeekPrev;
                  const startDate = new Date(rawStartDatePrev);
                  startDate.setDate(rawStartDatePrev.getDate() + daysToMondayPrev);
                  const weekStart = new Date(startDate);
                  weekStart.setDate(startDate.getDate() + (previewWeek.weekNumber - 1) * 7);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  const dateRange = `${formatDate(weekStart, 'dayMonth')} - ${formatDate(weekEnd, 'dayMonth')}`;

                  // Mapping des phases vers des couleurs
                  const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
                    'fondamental': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                    'developpement': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                    'specifique': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                    'affutage': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                    'recuperation': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }
                  };
                  const colors = phaseColors[previewWeek.phase] || phaseColors['fondamental'];

                  return (
                    <div
                      key={previewWeek.weekNumber}
                      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} overflow-hidden opacity-60 hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Numéro de semaine verrouillé */}
                        <div className="w-14 h-14 rounded-xl bg-slate-200 flex flex-col items-center justify-center font-bold shadow-md relative">
                          <span className="text-[10px] uppercase opacity-80 text-slate-500">Sem.</span>
                          <span className="text-xl leading-none text-slate-600">{previewWeek.weekNumber}</span>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                            <Lock size={12} className="text-white" />
                          </div>
                        </div>

                        {/* Infos de la semaine */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-700 truncate">{previewWeek.theme}</h3>
                            <span className={`${colors.bg} ${colors.text} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${colors.border}`}>
                              {previewWeek.phase}
                            </span>
                          </div>

                          {/* Date de la semaine */}
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-500 font-medium">{dateRange}</span>
                          </div>

                          {/* Infos volume */}
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Activity size={14} />
                              ~{previewWeek.volume} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {previewWeek.sessionsCount} séances
                            </span>
                          </div>
                        </div>

                        {/* Icône verrouillée */}
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <Lock size={18} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* CTA Final pour free users (pas plan_unique ni premium) */}
                {!canViewFullPlan && (
                  <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Star className="text-white" size={36} fill="currentColor" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Débloquez votre plan complet</h3>
                    <p className="text-slate-300 mb-6 max-w-md mx-auto">
                      Accédez aux {previewWeeks.length} semaines restantes, exportez vers votre calendrier, et laissez l'IA adapter votre plan en fonction de vos retours.
                    </p>
                    <button
                      onClick={handleUnlockClick}
                      className="bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 text-white font-bold py-4 px-10 rounded-xl shadow-lg transform hover:scale-105 transition-all inline-flex items-center gap-2"
                    >
                      <Zap size={20} fill="currentColor" />
                      Voir les offres Premium
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {selectedSessionForFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-0 mb-6">
              <h3 className="text-xl font-bold text-slate-900">{selectedSessionForFeedback.feedback?.completed ? 'Modifier le bilan' : 'Bilan de séance'}</h3>
              <button onClick={() => setSelectedSessionForFeedback(null)} className="p-1 rounded-full hover:bg-slate-100"><X className="text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-2">
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">{selectedSessionForFeedback.title}</h4>
              <p className="text-sm text-slate-500">{selectedSessionForFeedback.duration} • {selectedSessionForFeedback.type}</p>
            </div>

            {/* Données Strava auto-matchées */}
            {stravaMatchLoading && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 min-h-[110px] flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Loader size={14} className="animate-spin" />
                  Recherche activité Strava...
                </div>
              </div>
            )}
            {stravaMatch && !stravaMatchLoading && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-orange-600" />
                  <span className="text-sm font-bold text-orange-800">Strava : {stravaMatch.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-orange-700">
                  <div><span className="font-medium">Distance :</span> {stravaMatch.distance} km</div>
                  <div><span className="font-medium">Durée :</span> {stravaMatch.movingTime} min</div>
                  <div><span className="font-medium">Allure :</span> {stravaMatch.avgPace}</div>
                  <div><span className="font-medium">D+ :</span> {stravaMatch.elevationGain}m</div>
                  {stravaMatch.avgHeartrate && (
                    <div><span className="font-medium">FC moy :</span> {stravaMatch.avgHeartrate} bpm</div>
                  )}
                  {stravaMatch.maxHeartrate && (
                    <div><span className="font-medium">FC max :</span> {stravaMatch.maxHeartrate} bpm</div>
                  )}
                </div>
              </div>
            )}
            {!stravaMatch && !stravaMatchLoading && stravaSearchDone && (
              <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 text-sm text-slate-500">
                <Activity size={14} className="text-slate-400" />
                Aucune activité Strava trouvée pour cette séance
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Difficulté ressentie (RPE)</label>
              <input type="range" min="1" max="10" step="1" value={feedbackRpe} onChange={(e) => setFeedbackRpe(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent" />
              <div className="text-center font-black text-3xl text-slate-800 mt-4">{feedbackRpe}<span className="text-lg text-slate-400 font-normal">/10</span></div>
            </div>

            <div className="mb-2">
              <label className="block text-sm font-bold text-slate-900 mb-2">Sensations & Notes</label>
              <textarea className="w-full border border-slate-300 rounded-xl p-3 h-24 focus:ring-2 focus:ring-accent/50 outline-none text-sm resize-none" placeholder="Ex: Bonnes jambes, mais un peu essoufflé sur la fin..." value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} />
            </div>
            </div>

            <div className="p-6 pt-3 space-y-3 border-t border-slate-100">
              <button onClick={() => handleValidateFeedback(false)} disabled={isSaving} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold flex items-center justify-between group transition-all">
                <span>✓ Enregistrer (sans modifier)</span>
                <CheckCircle size={18} className="text-slate-400 group-hover:text-slate-600" />
              </button>
              {canAccessPremiumFeatures ? (
                <button onClick={() => handleValidateFeedback(true)} disabled={isSaving} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 p-4 rounded-xl font-bold flex items-center justify-between group transition-all">
                  <span>🔄 Ajuster les semaines suivantes</span>
                  <RefreshCw size={18} className="text-orange-400 group-hover:text-orange-600" />
                </button>
              ) : (
                <div className="relative">
                  <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl opacity-60 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">🔄 Ajuster les semaines suivantes</span>
                      <RefreshCw size={18} className="text-slate-300" />
                    </div>
                  </div>
                  <button
                    onClick={handleUnlockClick}
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/5 rounded-xl hover:bg-slate-900/10 transition-colors"
                  >
                    <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <Lock size={12} /> Premium — L'IA adapte votre plan
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPARISON MODAL */}
      {showComparisonModal && comparisonResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 pb-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  📊 Semaine {comparisonResult.weekNumber}
                </h2>
                <button onClick={() => setShowComparisonModal(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Compliance score */}
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${
                  comparisonResult.compliance >= 90 ? 'border-emerald-400 text-emerald-600' :
                  comparisonResult.compliance >= 70 ? 'border-blue-400 text-blue-600' :
                  comparisonResult.compliance >= 50 ? 'border-amber-400 text-amber-600' :
                  'border-red-400 text-red-600'
                }`}>
                  <span className="text-3xl font-black">{comparisonResult.compliance}%</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">Score de compliance</p>
              </div>

              {/* Sessions planned vs done */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p className="text-3xl font-black text-slate-700">{comparisonResult.sessionsPlanned}</p>
                  <p className="text-xs text-slate-500 mt-1">Séances prévues</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                  <p className="text-3xl font-black text-orange-700">{comparisonResult.sessionsDone}</p>
                  <p className="text-xs text-orange-500 mt-1">Séances Strava</p>
                </div>
              </div>

              {/* RPE */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                <span className="text-2xl">💪</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">RPE moyen</p>
                  <p className="text-lg font-bold text-slate-900">{comparisonResult.avgRpe}/10</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  comparisonResult.avgRpe <= 5 ? 'bg-blue-100 text-blue-700' :
                  comparisonResult.avgRpe <= 7 ? 'bg-emerald-100 text-emerald-700' :
                  comparisonResult.avgRpe <= 8 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {comparisonResult.avgRpe <= 5 ? 'Léger' :
                   comparisonResult.avgRpe <= 7 ? 'Optimal' :
                   comparisonResult.avgRpe <= 8 ? 'Élevé' : 'Très élevé'}
                </span>
              </div>

              {/* Cross-training */}
              {comparisonResult.crossTrainingEquivalent > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-1">Cross-training détecté</p>
                  <p className="text-sm text-blue-700">+{Math.round(comparisonResult.crossTrainingEquivalent)} min équivalent running</p>
                </div>
              )}

              {/* Detail text */}
              <div className="bg-gradient-to-r from-accent/5 to-orange-50 rounded-xl p-4 border border-accent/20">
                <p className="text-sm text-slate-700">{comparisonResult.details}</p>
              </div>

              {/* Strava activities list */}
              {comparisonResult.stravaActivities.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Activités Strava</h4>
                  <div className="space-y-1.5">
                    {comparisonResult.stravaActivities.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-base">
                          {a.type === 'Run' || a.type === 'Trail Run' ? '🏃' :
                           a.type === 'Ride' || a.type === 'VirtualRide' ? '🚴' :
                           a.type === 'Swim' ? '🏊' : '🏋️'}
                        </span>
                        <span className="flex-1 text-slate-700 truncate">{a.name}</span>
                        <span className="text-slate-500 font-medium">{a.distance} km</span>
                        <span className="text-slate-400">{a.time} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 pt-4 rounded-b-2xl space-y-2">
              {adaptationNextWeek && (
                <button
                  onClick={handleShowAdaptation}
                  className="w-full px-6 py-3 bg-gradient-to-r from-accent to-orange-500 text-white rounded-xl font-bold hover:from-accent/90 hover:to-orange-500/90 transition-all flex items-center justify-center gap-2"
                >
                  🔄 Adapter la semaine {adaptationNextWeek.weekNumber}
                </button>
              )}
              <button
                onClick={() => setShowComparisonModal(false)}
                className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADAPTATION MODAL */}
      {showAdaptationModal && adaptationSuggestion && adaptationNextWeek && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 pb-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Adaptation Semaine {adaptationNextWeek.weekNumber}</h2>
                  <span className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                    adaptationSuggestion.verdict === 'MAINTENIR' ? 'bg-emerald-100 text-emerald-700' :
                    adaptationSuggestion.verdict === 'AJUSTER' ? 'bg-amber-100 text-amber-700' :
                    adaptationSuggestion.verdict === 'RÉDUIRE' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {adaptationSuggestion.verdict}
                  </span>
                </div>
                <button onClick={() => setShowAdaptationModal(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Overall message */}
              <div className="bg-gradient-to-r from-accent/5 to-orange-50 rounded-xl p-4 border border-accent/20">
                <p className="text-sm text-slate-800 font-medium">{adaptationSuggestion.overallMessage}</p>
              </div>

              {/* Volume change indicator */}
              {adaptationSuggestion.volumeChange !== 0 && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                  adaptationSuggestion.volumeChange < -20 ? 'bg-red-50 border-red-200' :
                  adaptationSuggestion.volumeChange < 0 ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <span className="text-2xl">📉</span>
                  <div>
                    <p className="font-bold text-slate-800">Volume : {adaptationSuggestion.volumeChange}%</p>
                    <p className="text-xs text-slate-500">Appliqué aux durées de la semaine {adaptationNextWeek.weekNumber}</p>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div className="space-y-2">
                {adaptationSuggestion.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xl mt-0.5">{s.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm">{s.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.priority === 'HAUTE' ? 'bg-red-100 text-red-700' :
                          s.priority === 'MOYENNE' ? 'bg-orange-100 text-orange-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{s.priority}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cross-training summary */}
              {adaptationSuggestion.crossTraining.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-2">Cross-training pris en compte</p>
                  {adaptationSuggestion.crossTraining.map((ct, i) => (
                    <p key={i} className="text-sm text-blue-700">{ct.type} : {ct.hours}h = {ct.equivalent} min running</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with confirm/cancel */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 pt-4 rounded-b-2xl space-y-2">
              <button
                onClick={handleApplyAdaptation}
                className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Appliquer les modifications
              </button>
              <button
                onClick={() => setShowAdaptationModal(false)}
                className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATE PICKER MODAL */}
      {datePickerSession && (
        <DatePickerModal
          session={datePickerSession}
          currentDate={resolveSessionDate(datePickerSession, plan.startDate, datePickerWeek)}
          onConfirm={handleDateSelected}
          onClose={() => setDatePickerSession(null)}
        />
      )}

      {/* CROSS WEEK CONFIRM MODAL */}
      {showCrossWeekConfirm && pendingDateChange && (
        <CrossWeekConfirmModal
          sessionTitle={pendingDateChange.session.title}
          daysDiff={pendingDateChange.daysDiff}
          fromWeek={pendingDateChange.fromWeek}
          toWeek={pendingDateChange.toWeek}
          onMoveOnly={handleMoveOnly}
          onShiftAll={handleShiftAllSessions}
          onClose={() => { setShowCrossWeekConfirm(false); setPendingDateChange(null); }}
        />
      )}

      {/* START DATE PICKER MODAL */}
      {showStartDatePicker && (
        <StartDatePickerModal
          currentStartDate={toISODateString(new Date(plan.startDate))}
          onConfirm={handleStartDateChange}
          onClose={() => setShowStartDatePicker(false)}
        />
      )}

      {/* FEASIBILITY WARNING MODAL */}
      {showFeasibilityWarning && activeFeasibility && onGenerateRemainingWeeks && (
        <FeasibilityWarningModal
          feasibilityMessage={activeFeasibility.message}
          recommendation={liveFeasibility?.recommendation ?? activeFeasibility?.recommendation}
          confidenceScore={activeConfidenceScore}
          onAcceptAndGenerate={() => {
            setShowFeasibilityWarning(false);
            onGenerateRemainingWeeks();
          }}
          onCreateNewPlan={() => {
            setShowFeasibilityWarning(false);
            navigate('/');
          }}
          onClose={() => setShowFeasibilityWarning(false)}
        />
      )}

      {/* TOAST DE CÉLÉBRATION */}
      <Toast
        message={toastMessage}
        subMessage={toastSubMessage}
        isVisible={toastVisible}
        onClose={handleCloseToast}
      />

      {/* Bouton flottant "Poser une question au coach" — premium uniquement */}
      {canViewFullPlan && (
        <button
          onClick={() => { setShowAskCoach(true); setAskCoachSent(false); setAskCoachQuestion(''); }}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-accent to-orange-500 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-40 flex items-center gap-2 group"
          title="Poser une question au coach"
        >
          <MessageCircle size={22} />
          <span className="hidden md:inline text-sm font-bold">Question au coach</span>
        </button>
      )}

      {/* Modale "Poser une question" */}
      {showAskCoach && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAskCoach(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-accent to-orange-500 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle size={24} className="text-white" />
                  <h3 className="text-white font-bold text-lg">Une question ?</h3>
                </div>
                <button onClick={() => setShowAskCoach(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6">
              {askCoachSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 mb-2">Message envoyé !</h4>
                  <p className="text-slate-600 text-sm">On revient vers toi le plus rapidement possible. On ne le rappelle jamais assez, mais si une douleur apparaît, consulte rapidement un médecin et stoppe l'entraînement.</p>
                  <button onClick={() => setShowAskCoach(false)} className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Fermer</button>
                </div>
              ) : (
                <>
                  <p className="text-slate-600 text-sm mb-4">
                    Pose ta question, on te répondra le plus vite possible par email. Tu peux demander des précisions sur une séance, signaler un état de forme particulier, ou tout autre question sur ton plan.
                  </p>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-4 text-sm min-h-[120px] focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                    placeholder="Ex: Je reviens de voyage avec un décalage horaire, comment adapter ma reprise ? / Pourquoi cette séance est-elle plus longue cette semaine ? / J'ai une douleur légère au mollet..."
                    value={askCoachQuestion}
                    onChange={e => setAskCoachQuestion(e.target.value)}
                    maxLength={2000}
                    disabled={askCoachSending}
                  />
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400">{askCoachQuestion.length}/2000</span>
                    <button
                      onClick={async () => {
                        if (!askCoachQuestion.trim()) return;
                        setAskCoachSending(true);
                        try {
                          await fetch('/api/ask-coach', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              question: askCoachQuestion.trim(),
                              userEmail: user?.email || plan.userEmail,
                              userName: user?.firstName || 'Coureur',
                              planName: plan.name,
                            }),
                          });
                          setAskCoachSent(true);
                        } catch (err) {
                          console.error('[AskCoach] Error:', err);
                          alert('Erreur lors de l\'envoi. Vérifie ta connexion et réessaie.');
                        } finally {
                          setAskCoachSending(false);
                        }
                      }}
                      disabled={!askCoachQuestion.trim() || askCoachSending}
                      className="flex items-center gap-2 bg-gradient-to-r from-accent to-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {askCoachSending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                      {askCoachSending ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VMA Recalculation Modal */}
      {showVMAModal && onRecalculateVMA && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw size={20} className="text-accent" />
                  Recalculer mes allures
                </h3>
                <button onClick={() => setShowVMAModal(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Si ta VMA a changé ou si tes allures semblent trop rapides/lentes, tu peux recalculer toutes les allures de ton plan.
              </p>

              {/* Mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setVmaMode('manual')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${vmaMode === 'manual' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  VMA connue
                </button>
                <button
                  onClick={() => setVmaMode('feeling')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${vmaMode === 'feeling' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Ajustement ressenti
                </button>
              </div>

              {vmaMode === 'manual' ? (
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Nouvelle VMA (km/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="8"
                    max="25"
                    value={newVMAValue}
                    onChange={(e) => setNewVMAValue(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-center focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                    placeholder="Ex: 14.5"
                  />
                  <p className="text-xs text-slate-400 mt-1">VMA actuelle : {plan.vma ? plan.vma.toFixed(1) : '-'} km/h</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">Comment te sens-tu sur tes allures actuelles ?</p>
                  {[
                    { value: 'too_fast' as const, label: 'Trop rapide', desc: 'Je suis souvent essouffle(e) en EF', adjustment: -1 },
                    { value: 'ok' as const, label: 'Correct', desc: 'Les allures sont bien calibrees', adjustment: 0 },
                    { value: 'too_slow' as const, label: 'Trop lent', desc: 'Je pourrais aller plus vite sans effort', adjustment: 0.5 },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setVmaFeeling(option.value)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${vmaFeeling === option.value ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <p className="font-bold text-sm text-slate-800">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowVMAModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setIsRecalculating(true);
                  try {
                    let targetVMA: number;
                    if (vmaMode === 'manual') {
                      targetVMA = parseFloat(newVMAValue);
                      if (isNaN(targetVMA) || targetVMA < 8 || targetVMA > 25) {
                        alert('VMA invalide (entre 8 et 25 km/h)');
                        setIsRecalculating(false);
                        return;
                      }
                    } else {
                      const currentVMA = plan.vma || 12;
                      const adjustments = { too_fast: -1, ok: 0, too_slow: 0.5 };
                      targetVMA = currentVMA + adjustments[vmaFeeling];
                    }
                    await onRecalculateVMA(targetVMA);
                    setShowVMAModal(false);
                  } catch (e) {
                    console.error('[VMA Recalc] Error:', e);
                    alert('Erreur lors du recalcul. Reessaie.');
                  } finally {
                    setIsRecalculating(false);
                  }
                }}
                disabled={isRecalculating}
                className="flex-1 py-3 bg-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRecalculating ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {isRecalculating ? 'Recalcul...' : 'Recalculer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanView;
