
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
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
  registerUser,
  deletePlan
} from './services/storageService';
import { Trophy, CheckCircle, Zap, Loader2, Sparkles, X, ChevronRight, Lock, XCircle, Star, ArrowRight, Trash2, Crown } from 'lucide-react';
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
const MilesKmConverterPage = lazy(() => import('./components/tools/MilesKmConverterPage'));


// Redirection des anciennes URLs /post/* vers /blog/*
const PostRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/blog/${slug}`} replace />;
};
const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
    <Helmet>
      <title>Page non trouvée | Coach Running IA</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <h1 className="text-6xl font-black text-slate-900 mb-4">404</h1>
    <p className="text-xl text-slate-600 mb-8">Cette page n'existe pas ou a été déplacée.</p>
    <a href="/" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
      Retour à l'accueil
    </a>
  </div>
);

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

    // Nettoyer le pendingPlanId éventuel (plus utilisé)
    localStorage.removeItem('pendingPlanId');

    navigate(params.get('redirect') === 'pricing' ? '/pricing' : '/dashboard');
  };

  const authSpinner = <div className="min-h-screen flex items-center justify-center bg-surface"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <Layout user={user} setUser={setUser}>
      {isGenerating && <LoadingScreen />}

      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={32} /></div>}>
      <Routes>
        {/* Pages publiques - affichées immédiatement sans attendre Firebase Auth */}
        <Route path="/" element={<LandingPage user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/pricing" element={<PricingPage user={user} />} />
        <Route path="/plan-semi-marathon" element={<SemiMarathonLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/plan-marathon" element={<MarathonLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/plan-trail" element={<TrailLanding user={user} onPlanGeneration={handlePlanGeneration} isGenerating={isGenerating} />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/cgv" element={<CGVPage />} />
        <Route path="/confidentialite" element={<ConfidentialitePage />} />
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
        <Route path="/outils" element={<ToolsIndexPage />} />
        <Route path="/outils/convertisseur-allure" element={<PaceConverterPage />} />
        <Route path="/outils/calculateur-vma" element={<VMACalculatorPage />} />
        <Route path="/outils/predicteur-temps" element={<RacePredictorPage />} />
        <Route path="/outils/allure-marathon" element={<MarathonPacePage />} />
        <Route path="/outils/convertisseur-miles-km" element={<MilesKmConverterPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/post/:slug" element={<PostRedirect />} />

        {/* Auth */}
        <Route path="/auth" element={<div className="min-h-screen flex items-center justify-center bg-slate-50"><AuthModal onAuthSuccess={handleAuthSuccess} /></div>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/email-sent" element={<EmailSentScreen />} />
        <Route path="/strava-callback" element={<StravaCallback />} />
        <Route path="/success" element={<SuccessPage onContinue={() => navigate('/dashboard')} />} />

        {/* Pages authentifiées - spinner pendant le chargement auth */}
        <Route path="/dashboard" element={loading ? authSpinner : user ? <Dashboard user={user} /> : <Navigate to="/auth" replace />} />
        <Route path="/profile" element={loading ? authSpinner : user ? <ProfilePage user={user} setUser={setUser} /> : <Navigate to="/auth" replace />} />
        <Route path="/plan/:planId" element={<PlanDetailsWrapper setIsGenerating={setIsGenerating} user={user} onRegeneratePlan={handlePlanGeneration} />} />
        <Route path="/admin/blog" element={loading ? authSpinner : user?.isAdmin ? <BlogAdmin user={user} /> : <Navigate to="/" replace />} />

        {/* 404 - Page non trouvée */}
        <Route path="*" element={<NotFoundPage />} />
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

        if (purchaseType === 'plan_unique') {
          // Plan Unique: webhook handles Firestore, just show success
          console.log('[PlanUnique] Payment success detected');
          // Meta Pixel: track Purchase event BEFORE cleaning URL
          const sessionId = params.get('session_id');
          const eventID = sessionId ? `purchase_${sessionId}` : `purchase_${Date.now()}`;
          if (typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('track', 'Purchase', {
              value: 3.90,
              currency: 'EUR',
              content_ids: ['plan_unique'],
              content_type: 'product',
              content_name: 'Plan Unique',
            }, { eventID });
            console.log('[Meta Pixel] Plan Unique Purchase tracked, eventID:', eventID);
          }
          // Nettoyer l'URL après le tracking
          setTimeout(() => window.history.replaceState({}, '', '/dashboard'), 500);
          setShowSuccessModal(true);
          return;
        }

        // Nettoyer l'URL pour les abonnements (le tracking se fait sur /success)
        window.history.replaceState({}, '', '/dashboard');
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
              {user.isPremium ? 'Compte Premium Activé !' : 'Achat confirmé !'}
            </h2>
            <p className="text-slate-600 mb-6">
              {user.isPremium
                ? `Félicitations ${user.firstName}, tu as maintenant accès à toutes les fonctionnalités.`
                : `Merci ${user.firstName} ! Tu peux maintenant générer tes plans d'entraînement.`
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
                <ActivePlanCard plan={activePlan} user={user} navigate={navigate} onDeleted={() => setPlans(prev => prev.filter(p => p.id !== activePlan.id))} />
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
const ActivePlanCard: React.FC<{ plan: TrainingPlan; user: User; navigate: any; onDeleted: () => void }> = ({ plan, user, navigate, onDeleted }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePlan(plan.id, user.id);
      setShowDeleteConfirm(false);
      onDeleted();
    } catch (err) {
      console.error('[DeletePlan] Error:', err);
      alert('Erreur lors de la suppression du plan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Modale de confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-100" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Supprimer ce plan ?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Cette action est irr&eacute;versible. Toutes les donn&eacute;es de progression seront perdues. Tu pourras ensuite cr&eacute;er un nouveau plan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Créé le {new Date(plan.createdAt).toLocaleDateString('fr-FR')}</span>
          {user.isPremium && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              title="Supprimer ce plan"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          )}
        </div>
        <span className="text-sm font-bold text-primary flex items-center gap-1">
          Voir le plan <ChevronRight size={16} />
        </span>
      </div>
    </div>
    </>
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
              if (changes.elevationGain !== undefined) session.elevationGain = changes.elevationGain;

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
    "Export Garmin Connect (Coros, Suunto, Polar : en cours d'autorisation)",
  ];

  const premiumOnlyFeatures = [
    "Connexion Strava",
    "Bilan mensuel Strava (forces, faiblesses, recommandations)",
    "Analyse hebdomadaire (plan vs réel)",
    "Feedback après chaque séance",
    "Adaptation automatique du plan",
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <Helmet>
        <title>Tarifs - Plan Unique et Premium | Coach Running IA</title>
        <meta name="description" content="Découvrez nos formules : Plan Unique à 3,90€ ou Premium mensuel/annuel. Programme course à pied personnalisé par IA, exports PDF et GPS, connexion Strava." />
        <link rel="canonical" href="https://coachrunningia.fr/pricing" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Coach Running IA - Programme d'entraînement",
          "description": "Programme course à pied personnalisé par IA avec exports PDF, calendrier et Garmin Connect.",
          "brand": { "@type": "Organization", "name": "Coach Running IA" },
          "offers": [
            { "@type": "Offer", "name": "Plan Unique", "price": "3.90", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" },
            { "@type": "Offer", "name": "Premium Mensuel", "price": "5.90", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" },
            { "@type": "Offer", "name": "Premium Annuel", "price": "44.90", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" }
          ]
        })}</script>
      </Helmet>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Choisis ta formule</h1>
        <p className="text-slate-500 text-lg">Sans engagement, résiliable à tout moment en un clic.</p>
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

        {/* Mensuel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">

          <div className="text-center mb-6">
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

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-5">Non inclus</p>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2 items-start"><XCircle size={15} className="text-slate-300 mt-0.5 flex-shrink-0" />Génération illimitée de plans</li>
              <li className="flex gap-2 items-start"><XCircle size={15} className="text-slate-300 mt-0.5 flex-shrink-0" />Réduction du forfait annuel</li>
            </ul>
          </div>

          <button
            onClick={() => handleSubscribe(STRIPE_PRICES.MONTHLY)}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Annuel - Populaire */}
        <div className="bg-white rounded-2xl border-2 border-accent shadow-xl p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-xs font-black uppercase">Populaire</div>

          <div className="text-center mb-6 mt-2">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Premium Annuel</h3>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl line-through text-slate-400">69,90&euro;</span>
              <span className="text-4xl font-black text-slate-900">39,90&euro;</span>
              <span className="text-slate-500 text-sm">/an</span>
            </div>
            <p className="text-sm mt-1">Soit <span className="text-accent font-black text-lg">3,33&euro;/mois</span></p>
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
              <li className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-black">Plans illimités</span></li>
              <li className="flex gap-2 items-start"><CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" /><span className="font-medium">Presque 4 mois offerts</span></li>
            </ul>
          </div>

          <button
            onClick={() => handleSubscribe(STRIPE_PRICES.YEARLY)}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingPlan === STRIPE_PRICES.YEARLY ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Crown size={16} />
                S'abonner annuel
              </>
            )}
          </button>
        </div>
      </div>

      {/* COMPARATIF */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-4 tracking-tight text-slate-900">
          Pourquoi choisir <span className="text-accent">Coach Running IA</span> ?
        </h2>
        <p className="text-center text-slate-500 mb-10 max-w-2xl mx-auto text-lg">
          Comparez les différentes solutions d'entraînement running
        </p>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-md">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-5 text-left text-sm font-bold text-slate-500">Fonctionnalité</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-slate-500">Coach humain</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-slate-500">Apps classiques</th>
                <th className="px-6 py-5 text-center text-sm font-bold text-accent bg-orange-50">Coach Running IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { feature: 'Plan personnalisé', coach: true, apps: false, us: true },
                { feature: 'Adapté à vos contraintes', coach: true, apps: false, us: true },
                { feature: 'Disponible 24h/24', coach: false, apps: true, us: true },
                { feature: 'Prix accessible', coach: false, apps: true, us: true },
                { feature: 'Ajustement en temps réel', coach: true, apps: false, us: true },
              ].map(({ feature, coach, apps, us }) => (
                <tr key={feature} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700 text-sm">{feature}</td>
                  <td className="px-6 py-4 text-center">
                    {coach ? <CheckCircle className="text-green-500/70 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {apps ? <CheckCircle className="text-green-500/70 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                  </td>
                  <td className="px-6 py-4 text-center bg-orange-50/50">
                    {us ? <CheckCircle className="text-green-500 mx-auto" size={18} /> : <X className="text-red-400/50 mx-auto" size={18} />}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="px-6 py-5 font-bold text-slate-800 text-sm">Prix</td>
                <td className="px-6 py-5 text-center font-bold text-slate-500 text-sm">150-300&euro;/mois</td>
                <td className="px-6 py-5 text-center font-bold text-slate-500 text-sm">10-15&euro;/mois</td>
                <td className="px-6 py-5 text-center bg-orange-50">
                  <span className="font-bold text-accent text-sm">Dès 3,33&euro;/mois</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CHATGPT VS COACH RUNNING IA */}
      <div className="max-w-5xl mx-auto mb-20">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-orange-100 text-orange-600 border border-orange-200 mb-4">
            La question qu'on nous pose le plus
          </span>
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-slate-900">
            "Je peux faire pareil avec ChatGPT, non ?"
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Pas vraiment. Et voici pourquoi.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl p-6 bg-gray-50 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">{"🤖"}</div>
              <h3 className="font-bold text-slate-400 text-lg">ChatGPT</h3>
            </div>
            <div className="space-y-3 text-slate-500 text-sm">
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Génère un plan à partir de tout ce qui existe en ligne — <strong className="text-slate-600">sans distinguer les bons des mauvais conseils</strong></span></div>
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucune validation médicale sur le renforcement musculaire</span></div>
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Oublie tout entre chaque conversation</span></div>
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Aucun suivi réel de ta progression</span></div>
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Pas d'analyse de tes performances Strava</span></div>
              <div className="flex items-start gap-2.5"><X size={16} className="text-red-400 mt-0.5 shrink-0" /><span>Plan en texte brut — pas de calendrier, pas d'export</span></div>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-md relative">
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/30">RECOMMANDE</div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg">{"🏃"}</div>
              <h3 className="font-bold text-orange-600 text-lg">Coach Running IA</h3>
            </div>
            <div className="space-y-3 text-slate-600 text-sm">
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Entraîné sur des <strong className="text-slate-800">milliers de plans validés par des professionnels</strong></span></div>
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span>Renforcement musculaire avec <strong className="text-slate-800">regard médical et exercices spécifiques</strong></span></div>
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong className="text-slate-800">Questionnaire personnalisé</strong> — VMA, objectif, jours dispo, blessures</span></div>
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong className="text-slate-800">Feedback hebdomadaire</strong> — le plan s'adapte à ton ressenti</span></div>
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong className="text-slate-800">Analyse mensuelle Strava</strong> — bilan sur tes performances réelles</span></div>
              <div className="flex items-start gap-2.5"><CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" /><span><strong className="text-slate-800">Plan structure</strong> semaine par semaine avec calendrier et export</span></div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8 max-w-xl mx-auto">
          ChatGPT est un outil génial — mais généraliste. Coach Running IA est un <strong className="text-slate-800">spécialiste de l'entraînement running</strong>, conçu pour une seule mission : te faire progresser.
        </p>
      </div>

      {/* TEMOIGNAGES */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-10 tracking-tight text-slate-900">
          Ils ont atteint leurs objectifs
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl p-8 bg-white border border-gray-100 shadow-md">
            <div className="flex items-center gap-1 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
            </div>
            <p className="text-slate-600 mb-8 italic leading-relaxed">
              "Avoir un plan qui s'adapte à mes contraintes de temps, c'est top ! J'ai gagné <span className="font-bold text-slate-900">10 minutes sur mon semi-marathon</span> sans trop de difficultés. L'IA comprend vraiment mon rythme de vie."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">R</div>
              <div>
                <div className="font-bold text-slate-800">Romane</div>
                <div className="text-sm text-slate-500">Marathonienne, 28 ans</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-8 bg-white border border-gray-100 shadow-md">
            <div className="flex items-center gap-1 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} className="text-orange-400 fill-orange-400" size={16} />)}
            </div>
            <p className="text-slate-600 mb-8 italic leading-relaxed">
              "Surpris en positif de la <span className="font-bold text-slate-900">qualité et diversité des entraînements</span>. Après 10 marathons et un Ironman, je pensais avoir tout vu. Coach Running IA m'a proposé des séances variées et intelligentes."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">D</div>
              <div>
                <div className="font-bold text-slate-800">David</div>
                <div className="text-sm text-slate-500">Multi-marathonien & Finisher Ironman, 59 ans</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONNECTE A STRAVA */}
      <div className="max-w-5xl mx-auto mb-20">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Connecté à <span className="text-[#FC4C02]">Strava</span>
            </h2>
            <svg className="w-8 h-8 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          </div>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Partenaire officiel — vos données au service de votre progression
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Connexion en 1 clic", desc: "Reliez votre compte Strava depuis votre espace Coach Running IA" },
            { title: "Vos données accessibles", desc: "Historique de courses, distances, allures, fréquence cardiaque importés automatiquement" },
            { title: "Plans plus adaptés", desc: "L'IA analyse vos performances réelles pour ajuster votre programme" },
            { title: "Analyse mensuelle", desc: "Bilan automatique de vos sorties Strava avec recommandations personnalisées" },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-2xl p-6 bg-orange-50/50 border border-orange-100 text-center hover:shadow-md hover:border-orange-200 transition-all duration-300">
              <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <span className="text-sm text-slate-400">Compatible with</span>
          <svg className="w-6 h-6 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-label="Logo Strava"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          <span className="text-sm font-bold text-[#FC4C02]">Strava</span>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Questions fréquentes</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Quelle différence entre Plan Unique et Premium ?</h3>
            <p className="text-slate-600 text-sm">Le Plan Unique te donne un plan complet généré par IA avec exports (PDF, calendrier, Garmin Connect). Le Premium ajoute la connexion Strava, les analyses hebdomadaires, le feedback après chaque séance et l'adaptation automatique de ton plan. L'export vers Coros, Suunto et Polar est en cours d'autorisation.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Je peux passer du Plan Unique au Premium ?</h3>
            <p className="text-slate-600 text-sm">Oui, à tout moment ! Tu gardes ton plan existant et tu débloques toutes les fonctionnalités Premium (Strava, feedbacks, adaptation).</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Je peux annuler quand je veux ?</h3>
            <p className="text-slate-600 text-sm">Oui, sans engagement. Tu peux annuler ton abonnement Premium à tout moment. Tu gardes l'accès jusqu'à la fin de la période payée. Le Plan Unique est un achat définitif.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-2">Ca fonctionne pour quel niveau ?</h3>
            <p className="text-slate-600 text-sm">Débutant complet à ultra-trailer confirmé. L'IA adapte les séances, les volumes et les allures à TON niveau actuel. Que tu vises ton premier 10km ou un ultra de 100km.</p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-slate-400 mt-8">Paiement sécurisé par Stripe.</p>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
