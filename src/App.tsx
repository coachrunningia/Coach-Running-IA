
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Questionnaire from './components/Questionnaire';
import PlanView from './components/PlanView';
import AuthModal from './components/AuthModal';
import LoadingScreen from './components/LoadingScreen';
import ProfilePage from './components/ProfilePage';
import SuccessPage from './components/SuccessPage';
import VerifyEmail from './components/VerifyEmail';
import EmailSentScreen from './components/EmailSentScreen';
import StravaCallback from './components/StravaCallback';
import BlogList from './components/blog/BlogList';
import BlogArticle from './components/blog/BlogArticle';
import BlogAdmin from './components/admin/BlogAdmin';
import GlossaryPage from './components/GlossaryPage';
import CGVPage from './components/CGVPage';
import ConfidentialitePage from './components/ConfidentialitePage';
import MentionsLegalesPage from './components/MentionsLegalesPage';
import LandingPage from './components/LandingPage';
import SemiMarathonLanding from './components/SemiMarathonLanding';
import MarathonLanding from './components/MarathonLanding';
import TrailLanding from './components/TrailLanding';
import PaceConverterPage from './components/tools/PaceConverterPage';
import VMACalculatorPage from './components/tools/VMACalculatorPage';
import RacePredictorPage from './components/tools/RacePredictorPage';
import MarathonPacePage from './components/tools/MarathonPacePage';
import ToolsIndexPage from './components/tools/ToolsIndexPage';
import { User, TrainingPlan, QuestionnaireData } from './types';
import {
  observeAuthState,
  savePlan,
  getUserPlans,
  getPlanById,
  createStripeCheckoutSession,
  checkCanGeneratePlan,
  saveUserQuestionnaire,
  upgradeUserToPremium,
  registerUser
} from './services/storageService';
import { generateTrainingPlan, generatePreviewPlan, generateRemainingWeeks, adaptPlanFromFeedback } from './services/geminiService';
import { Trophy, CheckCircle, Zap, Loader2, Sparkles, X, ChevronRight } from 'lucide-react';
import { APP_NAME, STRIPE_PRICES } from './constants';


// Redirection des anciennes URLs /post/* vers /blog/*
const PostRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/blog/${slug}`} replace />;
};
const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Observer l'auth sans forcer un reset si on est en cours de génération
  useEffect(() => {
    const unsubscribe = observeAuthState((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Génération de plan - sera appelée par le Questionnaire après inscription
  // Dans le nouveau flux, le Questionnaire gère l'inscription puis appelle cette fonction
  const handlePlanGeneration = async (data: QuestionnaireData) => {
    // L'utilisateur DOIT être connecté maintenant (inscription faite dans Questionnaire)
    if (!user) {
      console.error("[Gen] Erreur: utilisateur non connecté");
      alert("Veuillez vous inscrire pour générer un plan.");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("[Gen] Génération du plan pour userId:", user.id);

      // Vérifier les quotas (1 plan gratuit max)
      const canGenerate = await checkCanGeneratePlan(user);
      if (!canGenerate) {
        setIsGenerating(false);
        alert("Limite atteinte (1 plan gratuit). Passez Premium pour débloquer les plans illimités.");
        navigate('/pricing');
        return;
      }

      // Générer le plan avec l'IA
      console.log("[Gen] Appel de l'IA Elite Coach (mode PREVIEW)...");
      const plan = await generatePreviewPlan(data);

      if (plan) {
        plan.userId = user.id;
        plan.userEmail = data.email || user.email || null;
      }


      // 5. Sauvegarder tout en base de données
      console.log("[Gen] Sauvegarde des données...");
      await savePlan(plan);
      await saveUserQuestionnaire(user.id, data);

      // 6. Redirection vers le plan nouvellement créé
      console.log("[Gen] Succès ! Redirection vers /plan/" + plan.id);

      // On attend un tout petit peu pour s'assurer que le store Firestore est à jour avant la redirection
      setTimeout(() => {
        setIsGenerating(false);
        navigate(`/plan/${plan.id}`);
      }, 500);

    } catch (error: any) {
      console.error("[Gen Error] Détails :", error);
      setIsGenerating(false);

      let msg = "Une erreur est survenue lors de la génération de votre plan.";
      if (error.message?.includes("API_KEY")) msg = "Erreur de configuration : La clé API Gemini est manquante ou invalide.";
      else if (error.message?.includes("quota")) msg = "L'IA est actuellement saturée. Réessayez dans quelques minutes.";

      alert(msg);
    }
  };

  const handleAuthSuccess = (loggedInUser: User) => {
    const params = new URLSearchParams(location.search);

    // Priorité 1: planId dans l'URL (après vérification email)
    const urlPlanId = params.get('planId');
    if (urlPlanId) {
      console.log('[Auth] Redirecting to plan from URL:', urlPlanId);
      navigate(`/plan/${urlPlanId}`);
      return;
    }

    // Priorité 2: planId dans localStorage
    const pendingPlanId = localStorage.getItem('pendingPlanId');
    if (pendingPlanId) {
      localStorage.removeItem('pendingPlanId');
      console.log('[Auth] Redirecting to pending plan:', pendingPlanId);
      navigate(`/plan/${pendingPlanId}`);
      return;
    }

    navigate(params.get('redirect') === 'pricing' ? '/pricing' : '/dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <Layout user={user} setUser={setUser}>
      {isGenerating && <LoadingScreen />}

      <Routes>
        <Route path="/" element={<LandingPage user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/auth" element={<div className="min-h-screen flex items-center justify-center bg-slate-50"><AuthModal onAuthSuccess={handleAuthSuccess} /></div>} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/auth" replace />} />
        <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} /> : <Navigate to="/auth" replace />} />
        <Route path="/plan/:planId" element={<PlanDetailsWrapper setIsGenerating={setIsGenerating} user={user} onRegeneratePlan={handlePlanGeneration} />} />
        <Route path="/pricing" element={<PricingPage user={user} />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/plan-semi-marathon" element={<SemiMarathonLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/plan-marathon" element={<MarathonLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/plan-trail" element={<TrailLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/cgv" element={<CGVPage />} />
        <Route path="/confidentialite" element={<ConfidentialitePage />} />
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
        <Route path="/success" element={<SuccessPage onContinue={() => navigate('/plan')} />} />

        {/* Email Verification Flow */}
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/email-sent" element={<EmailSentScreen />} />

        {/* Strava OAuth Callback */}
        <Route path="/strava-callback" element={<StravaCallback />} />

        {/* Outils SEO - Page index et pages dédiées pour les simulateurs */}
        <Route path="/outils" element={<ToolsIndexPage />} />
        <Route path="/outils/convertisseur-allure" element={<PaceConverterPage />} />
        <Route path="/outils/calculateur-vma" element={<VMACalculatorPage />} />
        <Route path="/outils/predicteur-temps" element={<RacePredictorPage />} />
        <Route path="/outils/allure-marathon" element={<MarathonPacePage />} />

        {/* Blog Routes */}
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/post/:slug" element={<PostRedirect />} />

        {/* Admin Routes - Protégé par isAdmin (rôle administrateur uniquement) */}
        <Route path="/admin/blog" element={user?.isAdmin ? <BlogAdmin user={user} /> : <Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

// Helper pour calculer la progression d'un plan
const calculatePlanProgress = (plan: TrainingPlan) => {
  const totalSessions = plan.weeks.reduce((acc, week) => acc + week.sessions.length, 0);
  const completedSessions = plan.weeks.reduce((acc, week) =>
    acc + week.sessions.filter(s => s.feedback?.completed).length, 0
  );
  return { totalSessions, completedSessions, percent: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0 };
};

// Helper pour obtenir le style du score de confiance
const getConfidenceStyle = (score?: number) => {
  if (!score) return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'N/A' };
  if (score >= 85) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Excellent' };
  if (score >= 70) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bon' };
  if (score >= 55) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Ambitieux' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'Difficile' };
};

// Helper pour calculer les jours restants
const getDaysUntilRace = (raceDate?: string) => {
  if (!raceDate) return null;
  const race = new Date(raceDate);
  const today = new Date();
  const diff = Math.ceil((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Track si on a déjà traité le payment_success pour éviter les doubles exécutions
  const [paymentHandled, setPaymentHandled] = useState(false);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const params = new URLSearchParams(location.search);
      if (params.get('payment_success') === 'true' && !paymentHandled) {
        setPaymentHandled(true);
        // Nettoyer l'URL immédiatement
        window.history.replaceState({}, '', '/#/dashboard');
        console.log('[Premium] Payment success detected. User isPremium:', user.isPremium);

        if (!user.isPremium) {
          setUpgrading(true);
          try {
            console.log('[Premium] Upgrading user to Premium... userId:', user.id);
            await upgradeUserToPremium(user.id);
            console.log('[Premium] Upgrade complete. Firestore onSnapshot will update user state.');
            // Attendre que le Firestore listener mette à jour l'état user
            // Le onSnapshot dans observeAuthState détectera isPremium: true
            // et mettra à jour le state automatiquement
          } catch (error) {
            console.error('[Premium] Error upgrading user:', error);
            setUpgrading(false);
            alert('Erreur lors de l\'activation Premium. Veuillez rafraîchir la page.');
          }
        } else {
          console.log('[Premium] User is already Premium, showing success modal');
          setShowSuccessModal(true);
        }
      }
    };
    checkPremiumStatus();
  }, [location, user.id, user.isPremium, paymentHandled]);

  // Quand user passe Premium (via onSnapshot), arrêter le loading et afficher la modal
  useEffect(() => {
    if (upgrading && user.isPremium) {
      console.log('[Premium] User is now Premium via Firestore update!');
      setUpgrading(false);
      setShowSuccessModal(true);
    }
  }, [user.isPremium, upgrading]);

  useEffect(() => {
    getUserPlans(user.id).then(p => { setPlans(p); setLoading(false); });
  }, [user.id]);

  if (loading || upgrading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="animate-spin text-accent mb-4" size={40} />
      {upgrading && <p className="text-slate-600 font-medium">Activation de votre compte Premium...</p>}
    </div>
  );

  // Calculer les stats globales
  const totalCompletedSessions = plans.reduce((acc, plan) => {
    const progress = calculatePlanProgress(plan);
    return acc + progress.completedSessions;
  }, 0);

  const activePlan = plans.length > 0 ? plans[0] : null; // Le plus récent

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl border-2 border-accent animate-in zoom-in duration-300">
            <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
            <Sparkles size={40} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Compte Premium Activé !</h2>
            <p className="text-slate-600 mb-6">Félicitations {user.firstName}, vous avez maintenant accès à l'intégralité des fonctionnalités.</p>
            <button onClick={() => setShowSuccessModal(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">C'est parti</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header de bienvenue */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Salut {user.firstName} ! {user.isPremium && <span className="text-amber-500">👑</span>}
              </h1>
              <p className="text-slate-500 mt-1">
                {plans.length === 0
                  ? "Prêt à créer ton premier plan d'entraînement ?"
                  : `${totalCompletedSessions} séance${totalCompletedSessions > 1 ? 's' : ''} complétée${totalCompletedSessions > 1 ? 's' : ''} au total`
                }
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <Zap size={18} />
              Nouveau Plan
            </button>
          </div>
        </div>

        {/* État vide */}
        {plans.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy size={36} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun plan pour le moment</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Crée ton premier plan d'entraînement personnalisé et commence à progresser vers tes objectifs.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-accent hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all"
            >
              Créer mon programme
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan actif mis en avant */}
            {activePlan && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Plan en cours</h2>
                <ActivePlanCard plan={activePlan} user={user} navigate={navigate} />
              </div>
            )}

            {/* Autres plans */}
            {plans.length > 1 && (
              <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Historique</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.slice(1).map(plan => (
                    <PlanCard key={plan.id} plan={plan} user={user} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Carte du plan actif (mise en avant)
const ActivePlanCard: React.FC<{ plan: TrainingPlan; user: User; navigate: any }> = ({ plan, user, navigate }) => {
  const progress = calculatePlanProgress(plan);
  const confidenceStyle = getConfidenceStyle(plan.confidenceScore);
  const daysLeft = getDaysUntilRace(plan.raceDate);

  // Calcul de la semaine en cours
  const getCurrentWeek = () => {
    if (!plan.startDate) return 1;
    const start = new Date(plan.startDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(plan.weeks.length, Math.floor(diffDays / 7) + 1));
  };
  const currentWeek = getCurrentWeek();

  return (
    <div
      onClick={() => navigate(`/plan/${plan.id}`)}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
    >
      {/* Gradient top bar */}
      <div className="h-1.5 bg-gradient-to-r from-accent via-orange-400 to-emerald-400" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {plan.isFreePreview && !user.isPremium && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Aperçu</span>
              )}
              {daysLeft && (
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">
                  J-{daysLeft}
                </span>
              )}
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                Semaine {currentWeek}/{plan.weeks.length}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
            <p className="text-sm text-slate-500">
              {plan.goal} {plan.distance && `• ${plan.distance}`} {plan.targetTime && `• Objectif ${plan.targetTime}`}
            </p>
          </div>
          {plan.confidenceScore && (
            <div className={`${confidenceStyle.bg} ${confidenceStyle.text} px-3 py-1.5 rounded-lg text-center`}>
              <div className="text-lg font-bold">{plan.confidenceScore}%</div>
              <div className="text-[10px] font-medium uppercase">{confidenceStyle.label}</div>
            </div>
          )}
        </div>

        {/* Progression visuelle améliorée */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 mb-4 text-white">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Progression</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{progress.percent}</span>
                <span className="text-lg font-bold text-slate-400">%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{progress.completedSessions}<span className="text-slate-400">/{progress.totalSessions}</span></p>
              <p className="text-[10px] text-slate-400">séances complétées</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-accent to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Mini timeline des semaines */}
          <div className="flex items-center gap-1">
            {plan.weeks.map((week) => {
              const weekCompleted = week.sessions.length > 0 && week.sessions.every(s => s.feedback?.completed);
              const isCurrent = week.weekNumber === currentWeek;
              return (
                <div
                  key={week.weekNumber}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    weekCompleted
                      ? 'bg-emerald-500'
                      : isCurrent
                        ? 'bg-accent animate-pulse'
                        : week.weekNumber < currentWeek
                          ? 'bg-slate-600'
                          : 'bg-slate-700'
                  }`}
                  title={`S${week.weekNumber}: ${week.theme}`}
                />
              );
            })}
          </div>
        </div>

        {/* Infos rapides */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-slate-900">{plan.durationWeeks || plan.weeks.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-medium">Semaines</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-slate-900">{plan.sessionsPerWeek || Math.round(progress.totalSessions / plan.weeks.length)}</div>
            <div className="text-[10px] text-slate-500 uppercase font-medium">Séances/sem</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-emerald-600">{progress.percent}%</div>
            <div className="text-[10px] text-slate-500 uppercase font-medium">Complété</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">Créé le {new Date(plan.createdAt).toLocaleDateString('fr-FR')}</span>
        <span className="text-sm font-bold text-primary flex items-center gap-1">
          Voir le plan <ChevronRight size={16} />
        </span>
      </div>
    </div>
  );
};

// Carte de plan simple (historique)
const PlanCard: React.FC<{ plan: TrainingPlan; user: User; navigate: any }> = ({ plan, user, navigate }) => {
  const progress = calculatePlanProgress(plan);

  return (
    <div
      onClick={() => navigate(`/plan/${plan.id}`)}
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
    >
      {plan.isFreePreview && !user.isPremium && (
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">Aperçu</span>
      )}
      <h3 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">{plan.name}</h3>
      <p className="text-xs text-slate-400 mb-3">{plan.goal} {plan.distance && `• ${plan.distance}`}</p>

      {/* Mini barre de progression */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500">{progress.percent}%</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{new Date(plan.createdAt).toLocaleDateString('fr-FR')}</span>
        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Ouvrir →</span>
      </div>
    </div>
  );
};

const PlanDetailsWrapper = ({ setIsGenerating, user, onRegeneratePlan }: { setIsGenerating: any, user: any, onRegeneratePlan: any }) => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [adaptationMessage, setAdaptationMessage] = useState<string | null>(null);
  const [isGeneratingRemaining, setIsGeneratingRemaining] = useState(false);

const ADMIN_EMAILS = ["programme@coachrunningia.fr"];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");
  
  useEffect(() => {
    if (planId) {
      if (isAdmin) {
        getPlanById(planId, "admin").then(p => { setPlan(p); setLoading(false); });
      } else if (user) {
        getPlanById(planId, user.id).then(p => { setPlan(p); setLoading(false); });
      }
    }
  }, [planId, user]);
  const handleRegenerateFull = async () => {
    if (user?.questionnaireData) {
      await onRegeneratePlan(user.questionnaireData);
    }
  };

  // Handler pour générer les semaines restantes (2-N) avec contexte FIGÉ
  const handleGenerateRemainingWeeks = async () => {
    if (!plan || !plan.isPreview || !plan.generationContext) {
      console.error('[Remaining] Plan non éligible pour génération des semaines restantes');
      return;
    }

    setIsGeneratingRemaining(true);
    console.log('[Remaining] Début génération des semaines restantes...');

    try {
      const fullPlan = await generateRemainingWeeks(plan);

      // Ajouter userId/userEmail
      fullPlan.userId = plan.userId;
      fullPlan.userEmail = plan.userEmail;

      // Sauvegarder le plan complet
      await savePlan(fullPlan);
      console.log('[Remaining] Plan complet sauvegardé !');

      // Mettre à jour l'état local
      setPlan(fullPlan);

      // Message de succès
      setAdaptationMessage(
        `Plan complet généré ! ${fullPlan.weeks.length} semaines avec cohérence totale des allures.`
      );
      setTimeout(() => setAdaptationMessage(null), 8000);

    } catch (error) {
      console.error('[Remaining] Erreur:', error);
      setAdaptationMessage('Erreur lors de la génération des semaines. Réessayez.');
      setTimeout(() => setAdaptationMessage(null), 5000);
    } finally {
      setIsGeneratingRemaining(false);
    }
  };

  const handleAdaptPlan = async (feedbackContext: string) => {
    if (!plan || !user?.questionnaireData) return;

    try {
      console.log('[Adaptation] Demande d\'adaptation avec contexte:', feedbackContext);
      const result = await adaptPlanFromFeedback(plan, user.questionnaireData, feedbackContext);
      console.log('[Adaptation] Résultat:', result);

      // === APPLIQUER LES MODIFICATIONS AU PLAN ===
      if (result.modifications && result.modifications.length > 0) {
        const updatedPlan = { ...plan };
        const updatedWeeks = [...plan.weeks].map(w => ({
          ...w,
          sessions: [...w.sessions]
        }));

        for (const mod of result.modifications) {
          const weekIdx = (mod.weekNumber || 1) - 1;
          const sessionIdx = mod.sessionIndex ?? 0;

          if (weekIdx >= 0 && weekIdx < updatedWeeks.length) {
            const week = updatedWeeks[weekIdx];
            // Trouver la session par index ou par titre
            let targetIdx = sessionIdx;
            if (mod.originalTitle) {
              const foundIdx = week.sessions.findIndex(s => s.title === mod.originalTitle);
              if (foundIdx >= 0) targetIdx = foundIdx;
            }

            if (targetIdx >= 0 && targetIdx < week.sessions.length) {
              const session = { ...week.sessions[targetIdx] };
              const changes = mod.changes || {};

              if (changes.duration) session.duration = changes.duration;
              if (changes.mainSet) session.mainSet = changes.mainSet;
              if (changes.targetPace) session.targetPace = changes.targetPace;
              if (changes.advice) session.advice = changes.advice;
              if (changes.warmup) session.warmup = changes.warmup;
              if (changes.cooldown) session.cooldown = changes.cooldown;
              if (changes.title) session.title = changes.title;
              if (changes.distance) session.distance = changes.distance;

              week.sessions[targetIdx] = session;
              console.log(`[Adaptation] Séance modifiée: S${weekIdx + 1}-${targetIdx + 1} "${session.title}"`);
            }
          }
        }

        updatedPlan.weeks = updatedWeeks;

        // Sauvegarder le plan modifié dans Firestore
        await savePlan(updatedPlan);
        console.log('[Adaptation] Plan sauvegardé dans Firestore');

        // Mettre à jour le state local pour que l'UI se rafraîchisse
        setPlan(updatedPlan);

        // Message du coach avec résumé des modifications
        const modCount = result.modifications.length;
        const summaryMsg = result.adaptationSummary || result.coachNote || '';
        setAdaptationMessage(
          `${modCount} séance${modCount > 1 ? 's' : ''} ajustée${modCount > 1 ? 's' : ''} ! ${summaryMsg}`
        );
      } else {
        // Pas de modifications nécessaires
        setAdaptationMessage(result.coachNote || result.adaptationSummary || 'Aucune modification nécessaire. Continue comme ça !');
      }

      // Masquer après 10 secondes
      setTimeout(() => setAdaptationMessage(null), 10000);

    } catch (error) {
      console.error('[Adaptation] Erreur:', error);
      setAdaptationMessage('Erreur lors de l\'adaptation. Réessaie plus tard.');
      setTimeout(() => setAdaptationMessage(null), 5000);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>;
  if (!plan) return <div className="text-center py-20">Plan introuvable ou accès refusé.</div>;

  return (
    <>
      {adaptationMessage && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-indigo-600 text-white p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-yellow-300 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-sm mb-1">Message du Coach</p>
              <p className="text-sm text-indigo-100">{adaptationMessage}</p>
            </div>
            <button onClick={() => setAdaptationMessage(null)} className="text-indigo-200 hover:text-white ml-auto">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      <PlanView
        plan={plan}
        isLocked={!user?.isPremium && (plan.isFreePreview || plan.isPreview)}
        onRegenerateFull={handleRegenerateFull}
        onGenerateRemainingWeeks={handleGenerateRemainingWeeks}
        isGeneratingRemaining={isGeneratingRemaining}
        onAdaptPlan={handleAdaptPlan}
        user={user}
      />
    </>
  );
};

const PricingPage = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      navigate('/auth?redirect=pricing');
      return;
    }
    setLoading(true);
    try {
      await createStripeCheckoutSession(priceId);
    } catch (e: any) {
      alert("Erreur Stripe : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Passez à la vitesse supérieure</h1>
        <p className="text-slate-500">Libérez tout le potentiel de votre entraînement IA.</p>
        <p className="text-emerald-600 font-bold mt-2">✓ Sans engagement - Annulez quand vous voulez</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col">
          <h3 className="text-xl font-bold mb-4">Mensuel</h3>
          <p className="text-5xl font-black mb-6"><span className="text-2xl line-through text-slate-400 mr-2">5,90€</span>3,90€<span className="text-sm font-normal text-slate-400">/mois</span></p>
          <ul className="text-left space-y-3 mb-8 text-sm text-slate-600 flex-grow">
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Plans illimités (toutes les semaines)</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Feedback après chaque séance</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Export calendrier Google/Apple</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Adaptation intelligente du plan</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Connexion Strava (bientôt)</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Rappels hebdomadaires</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Sans engagement, annulation libre</li>
          </ul>
          <button onClick={() => handleSubscribe(STRIPE_PRICES.MONTHLY)} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50">Souscrire mensuel</button>
        </div>
        <div className="bg-white p-8 rounded-3xl border-2 border-accent shadow-2xl text-center transform md:scale-105 relative flex flex-col">
          <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1 rounded-bl-xl font-bold text-xs uppercase">Populaire</div>
          <h3 className="text-xl font-bold mb-4">Annuel</h3>
          <p className="text-5xl font-black mb-2"><span className="text-2xl line-through text-slate-400 mr-2">49,90€</span>39,90€<span className="text-sm font-normal text-slate-400">/an</span></p>
          <p className="text-xs text-green-600 font-bold mb-6">Économisez 15%</p>
          <ul className="text-left space-y-3 mb-8 text-sm text-slate-600 flex-grow">
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Tous les avantages mensuels</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> Support coach prioritaire 24h</li>
            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500" /> 2 mois offerts</li>
          </ul>
          <button onClick={() => handleSubscribe(STRIPE_PRICES.YEARLY)} disabled={loading} className="w-full bg-accent text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50">Souscrire annuel</button>
        </div>
      </div>
      {/* FAQ */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Questions fréquentes</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Quelle différence avec un programme PDF gratuit ?</h3>
            <p className="text-slate-600 text-sm">Un PDF est figé et identique pour tout le monde. Coach Running IA génère un plan 100% personnalisé selon TON niveau, TES disponibilités et TON objectif. Le plan s adapte chaque semaine selon ton ressenti et tes performances réelles.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Quelle différence avec un coach personnel ?</h3>
            <p className="text-slate-600 text-sm">Un coach coûte 50-100€ par séance. Ici tu as un suivi personnalisé pour moins de 6€/mois. L IA analyse tes données et adapte ton plan exactement comme le ferait un coach, mais 15x moins cher.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Je peux annuler quand je veux ?</h3>
            <p className="text-slate-600 text-sm">Oui, sans engagement. Tu peux annuler ton abonnement à tout moment depuis ton espace. Tu gardes l accès jusqu à la fin de la période payée.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Ça fonctionne pour quel niveau ?</h3>
            <p className="text-slate-600 text-sm">Débutant complet à ultra-trailer confirmé. L IA adapte les séances, les volumes et les allures à TON niveau actuel. Que tu vises ton premier 10km ou un ultra de 100km.</p>
          </div>
        </div>
      </div>


    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
