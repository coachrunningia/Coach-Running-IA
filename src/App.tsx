
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import LoadingScreen from './components/LoadingScreen';
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
import { Trophy, CheckCircle, Zap, Loader2, Sparkles, X, ChevronRight, Lock, XCircle } from 'lucide-react';
import { APP_NAME, STRIPE_PRICES } from './constants';

// Lazy-loaded route components
const PlanView = lazy(() => import('./components/PlanView'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const SuccessPage = lazy(() => import('./components/SuccessPage'));
const VerifyEmail = lazy(() => import('./components/VerifyEmail'));
const EmailSentScreen = lazy(() => import('./components/EmailSentScreen'));
const StravaCallback = lazy(() => import('./components/StravaCallback'));
const BlogList = lazy(() => import('./components/blog/BlogList'));
const BlogArticle = lazy(() => import('./components/blog/BlogArticle'));
const BlogAdmin = lazy(() => import('./components/admin/BlogAdmin'));
const GlossaryPage = lazy(() => import('./components/GlossaryPage'));
const CGVPage = lazy(() => import('./components/CGVPage'));
const ConfidentialitePage = lazy(() => import('./components/ConfidentialitePage'));
const MentionsLegalesPage = lazy(() => import('./components/MentionsLegalesPage'));
const SemiMarathonLanding = lazy(() => import('./components/SemiMarathonLanding'));
const MarathonLanding = lazy(() => import('./components/MarathonLanding'));
const TrailLanding = lazy(() => import('./components/TrailLanding'));
const PaceConverterPage = lazy(() => import('./components/tools/PaceConverterPage'));
const VMACalculatorPage = lazy(() => import('./components/tools/VMACalculatorPage'));
const RacePredictorPage = lazy(() => import('./components/tools/RacePredictorPage'));
const MarathonPacePage = lazy(() => import('./components/tools/MarathonPacePage'));
const ToolsIndexPage = lazy(() => import('./components/tools/ToolsIndexPage'));


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

      // Vérifier les quotas
      const quota = await checkCanGeneratePlan(user);
      if (!quota.allowed) {
        setIsGenerating(false);
        alert("Limite atteinte (1 plan gratuit). Choisis une formule pour continuer.");
        navigate('/pricing');
        return;
      }

      // Générer le plan avec l'IA
      console.log("[Gen] Appel de l'IA Elite Coach (mode PREVIEW)...");
      const { generatePreviewPlan } = await import('./services/geminiService');
      const plan = await generatePreviewPlan(data);

      if (plan) {
        plan.userId = user.id;
        plan.userEmail = data.email || user.email || null;
      }

      // Sauvegarder tout en base de données
      console.log("[Gen] Sauvegarde des données...");
      await savePlan(plan);
      await saveUserQuestionnaire(user.id, data);

      // Redirection vers le plan nouvellement créé
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

      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={32} /></div>}>
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
      </Suspense>
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
        const purchaseType = params.get('type');
        // Nettoyer l'URL immédiatement
        window.history.replaceState({}, '', '/dashboard');

        if (purchaseType === 'plan_unique') {
          // Plan Unique: webhook handles Firestore, just show success
          console.log('[PlanUnique] Payment success detected');
          setShowSuccessModal(true);
          return;
        }

        console.log('[Premium] Payment success detected. User isPremium:', user.isPremium);

        if (!user.isPremium) {
          setUpgrading(true);
          try {
            console.log('[Premium] Upgrading user to Premium... userId:', user.id);
            await upgradeUserToPremium(user.id);
            console.log('[Premium] Upgrade complete. Firestore onSnapshot will update user state.');
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
            <h2 className="text-2xl font-bold mb-2">
              {user.isPremium ? 'Compte Premium Active !' : 'Achat confirme !'}
            </h2>
            <p className="text-slate-600 mb-6">
              {user.isPremium
                ? `Felicitations ${user.firstName}, tu as maintenant acces a toutes les fonctionnalites.`
                : `Merci ${user.firstName} ! Tu peux maintenant generer tes plans d'entrainement.`
              }
            </p>
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
      const { generateRemainingWeeks } = await import('./services/geminiService');
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
      const { adaptPlanFromFeedback } = await import('./services/geminiService');
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
        isLocked={!user?.isPremium && !user?.hasPurchasedPlan && (plan.isFreePreview || plan.isPreview)}
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, mode: 'subscription' | 'payment' = 'subscription') => {
    if (!user) {
      navigate('/auth?redirect=pricing');
      return;
    }
    setLoadingPlan(priceId);
    try {
      await createStripeCheckoutSession(priceId, mode);
    } catch (e: any) {
      alert("Erreur Stripe : " + e.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const includedFeatures = [
    "Plan d'entraînement complet par IA",
    "Export PDF",
    "Export calendrier (iPhone, Google)",
    "Export montres GPS (Garmin, Coros, Suunto)",
  ];

  const planUniqueExtra = "Regeneration illimitee du plan";

  const premiumOnlyFeatures = [
    "Connexion Strava",
    "Bilan mensuel Strava (forces, faiblesses, recommandations)",
    "Analyse hebdomadaire (plan vs reel)",
    "Feedback apres chaque seance",
    "Adaptation automatique du plan",
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Choisis ta formule</h1>
        <p className="text-slate-500 text-lg">Un plan unique ou un suivi complet : a toi de choisir.</p>
      </div>

      {/* 3 Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-16 items-start">

        {/* Plan Unique */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Plan Unique</h3>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl line-through text-slate-400">5,90&euro;</span>
              <span className="text-4xl font-black text-slate-900">3,90&euro;</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Paiement unique</p>
          </div>

          <div className="border-t border-slate-100 pt-4 mb-4 flex-grow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inclus</p>
            <ul className="space-y-2.5 text-sm text-slate-700 mb-4">
              {includedFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
              <li className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />{planUniqueExtra}</li>
            </ul>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-5">Non inclus</p>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {premiumOnlyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><XCircle size={15} className="text-slate-300 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleSubscribe(STRIPE_PRICES.PLAN_UNIQUE, 'payment')}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingPlan === STRIPE_PRICES.PLAN_UNIQUE ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Acheter mon plan</>
            )}
          </button>
        </div>

        {/* Mensuel - Populaire */}
        <div className="bg-white rounded-2xl border-2 border-accent shadow-xl p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-xs font-black uppercase">Populaire</div>

          <div className="text-center mb-6 mt-2">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Premium Mensuel</h3>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl line-through text-slate-400">9,90&euro;</span>
              <span className="text-4xl font-black text-slate-900">4,90&euro;</span>
              <span className="text-slate-500 text-sm">/mois</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Sans engagement</p>
          </div>

          <div className="border-t border-slate-100 pt-4 mb-4 flex-grow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tout inclus</p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {includedFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
              {premiumOnlyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-medium">{f}</span></li>
              ))}
              <li className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-medium">Sans engagement, annulation libre</span></li>
            </ul>
          </div>

          <button
            onClick={() => handleSubscribe(STRIPE_PRICES.MONTHLY)}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingPlan === STRIPE_PRICES.MONTHLY ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Zap size={16} />
                S'abonner
              </>
            )}
          </button>
        </div>

        {/* Annuel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black">+32&euro; ECONOMISES</div>

          <div className="text-center mb-6 mt-2">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Premium Annuel</h3>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl line-through text-slate-400">69,90&euro;</span>
              <span className="text-4xl font-black text-slate-900">39,90&euro;</span>
              <span className="text-slate-500 text-sm">/an</span>
            </div>
            <p className="text-sm text-emerald-600 font-bold mt-1">Soit 3,33&euro;/mois</p>
          </div>

          <div className="border-t border-slate-100 pt-4 mb-4 flex-grow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tout inclus</p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {includedFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
              {premiumOnlyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-medium">{f}</span></li>
              ))}
              <li className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-medium">Presque 4 mois offerts</span></li>
            </ul>
          </div>

          <button
            onClick={() => handleSubscribe(STRIPE_PRICES.YEARLY)}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingPlan === STRIPE_PRICES.YEARLY ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>S'abonner annuel</>
            )}
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Questions frequentes</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Quelle difference entre Plan Unique et Premium ?</h3>
            <p className="text-slate-600 text-sm">Le Plan Unique te donne un plan complet genere par IA avec exports (PDF, calendrier, montres GPS) et regeneration illimitee. Le Premium ajoute la connexion Strava, les analyses hebdomadaires, le feedback apres chaque seance et l'adaptation automatique de ton plan.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Je peux passer du Plan Unique au Premium ?</h3>
            <p className="text-slate-600 text-sm">Oui, a tout moment ! Tu gardes ton plan existant et tu debloques toutes les fonctionnalites Premium (Strava, feedbacks, adaptation).</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Je peux annuler quand je veux ?</h3>
            <p className="text-slate-600 text-sm">Oui, sans engagement. Tu peux annuler ton abonnement Premium a tout moment. Tu gardes l'acces jusqu'a la fin de la periode payee. Le Plan Unique est un achat definitif.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Ca fonctionne pour quel niveau ?</h3>
            <p className="text-slate-600 text-sm">Debutant complet a ultra-trailer confirme. L'IA adapte les seances, les volumes et les allures a TON niveau actuel. Que tu vises ton premier 10km ou un ultra de 100km.</p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-slate-400 mt-8">Paiement securise par Stripe.</p>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
