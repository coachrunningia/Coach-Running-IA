
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Questionnaire from './components/Questionnaire';
import PlanView from './components/PlanView';
import AuthModal from './components/AuthModal';
import LoadingScreen from './components/LoadingScreen';
import ProfilePage from './components/ProfilePage';
import { User, TrainingPlan, QuestionnaireData } from './types';
import { 
  observeAuthState, 
  savePlan, 
  getUserPlans, 
  getPlanById, 
  createStripeCheckoutSession,
  checkCanGeneratePlan,
  saveUserQuestionnaire,
  ensureGuestUser,
  upgradeUserToPremium
} from './services/storageService';
import { generateTrainingPlan } from './services/geminiService';
// Correction du module specifier ici : lucide-react au lieu de lucide-center
import { Trophy, BookOpen, CheckCircle, TrendingUp, Zap, Loader2, Star, Sparkles, X, FlaskConical, ChevronRight, AlertCircle } from 'lucide-react';
import { APP_NAME, STRIPE_PRICES } from './constants';

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

  const handlePlanGeneration = async (data: QuestionnaireData) => {
    // 1. Bloquer l'UI immédiatement pour montrer le LoadingScreen
    setIsGenerating(true);
    
    try {
      console.log("[Gen] Initialisation du processus...");
      
      // 2. Assurer l'utilisateur (Anonyme si besoin)
      // On récupère ou crée l'utilisateur avant d'appeler l'IA
      let currentUser = user;
      if (!currentUser) {
        currentUser = await ensureGuestUser(data);
      }

      // 3. Vérifier les quotas (1 plan gratuit max)
      const canGenerate = await checkCanGeneratePlan(currentUser);
      if (!canGenerate) {
        setIsGenerating(false);
        if(confirm("Limite atteinte (1 plan gratuit). Passer Premium pour débloquer les plans illimités ?")) {
          navigate('/pricing');
        }
        return; 
      }

      // 4. Lancer le Prompt Masterclass IA
      console.log("[Gen] Appel de l'IA Elite Coach...");
      const plan = await generateTrainingPlan(
        data, 
        currentUser.id, 
        currentUser.firstName || "Coureur", 
        currentUser.isPremium
      );
      
      // 5. Sauvegarder tout en base de données
      console.log("[Gen] Sauvegarde des données...");
      await savePlan(plan);
      await saveUserQuestionnaire(currentUser.id, data);
      
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
    navigate(params.get('redirect') === 'pricing' ? '/pricing' : '/dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <Layout user={user} setUser={setUser}>
      {isGenerating && <LoadingScreen />}
      
      <Routes>
        <Route path="/" element={
          <div className="bg-surface pb-20">
            <div className="relative bg-primary text-white py-24 md:py-32 text-center overflow-hidden">
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Votre coach running <span className="text-accent">IA</span></h1>
              <p className="max-w-2xl mx-auto text-lg text-slate-300 mb-10 px-4">
                Des plans d'entraînement personnalisés générés par l'IA digne d'un athlète pro.
              </p>
              <button 
                onClick={() => document.getElementById('q-section')?.scrollIntoView({ behavior: 'smooth' })} 
                className="bg-accent hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-xl"
              >
                Créer mon programme
              </button>
            </div>
            <div id="q-section" className="max-w-7xl mx-auto px-4 py-12">
              <Questionnaire onComplete={handlePlanGeneration} isGenerating={isGenerating} user={user} />
            </div>
          </div>
        } />
        <Route path="/auth" element={<div className="min-h-screen flex items-center justify-center bg-slate-50"><AuthModal onAuthSuccess={handleAuthSuccess} /></div>} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/auth" replace />} />
        <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} /> : <Navigate to="/auth" replace />} />
        <Route path="/plan/:planId" element={<PlanDetailsWrapper setIsGenerating={setIsGenerating} user={user} onRegeneratePlan={handlePlanGeneration} />} />
        <Route path="/pricing" element={<PricingPage user={user} />} />
      </Routes>
    </Layout>
  );
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const params = new URLSearchParams(location.search);
      if (params.get('payment_success') === 'true' && !user.isPremium) {
        await upgradeUserToPremium(user.id);
        setShowSuccessModal(true);
        window.history.replaceState({}, '', '/#/dashboard');
      }
    };
    checkPremiumStatus();
  }, [location, user.id, user.isPremium]);

  useEffect(() => {
    getUserPlans(user.id).then(p => { setPlans(p); setLoading(false); });
  }, [user.id]);

  if (loading) return <div className="max-w-7xl px-4 py-12 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
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
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Mes Plans {user.isPremium && "👑"}</h1>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg">Nouveau Plan</button>
      </div>
      
      {plans.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
           <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
           <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun plan trouvé</h3>
           <button onClick={() => navigate('/')} className="text-accent font-bold hover:underline">Créer mon premier plan</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
              {plan.isFreePreview && !user.isPremium && <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] px-2 py-1 font-bold uppercase">Aperçu</div>}
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-6">Généré le {new Date(plan.createdAt).toLocaleDateString()}</p>
              <button onClick={() => navigate(`/plan/${plan.id}`)} className="w-full py-3 bg-slate-100 group-hover:bg-primary group-hover:text-white rounded-xl font-bold text-slate-700 transition-all">Voir le programme</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PlanDetailsWrapper = ({ setIsGenerating, user, onRegeneratePlan }: { setIsGenerating: any, user: any, onRegeneratePlan: any }) => {
  const { planId } = useParams();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId && user) {
      getPlanById(planId, user.id).then(p => { setPlan(p); setLoading(false); });
    }
  }, [planId, user]);

  const handleRegenerateFull = async () => {
    if (user?.questionnaireData) {
      await onRegeneratePlan(user.questionnaireData);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>;
  if (!plan) return <div className="text-center py-20">Plan introuvable ou accès refusé.</div>;

  return (
    <PlanView 
      plan={plan} 
      isLocked={!user?.isPremium && plan.isFreePreview} 
      onRegenerateFull={handleRegenerateFull}
      user={user}
    />
  );
};

const PricingPage = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    if (!user || user.isAnonymous) {
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

  const simulatePremium = () => {
    if (!user) { navigate('/auth?redirect=pricing'); return; }
    navigate('/dashboard?payment_success=true');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Passez à la vitesse supérieure</h1>
        <p className="text-slate-500">Libérez tout le potentiel de votre entraînement IA.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col">
          <h3 className="text-xl font-bold mb-4">Mensuel</h3>
          <p className="text-5xl font-black mb-6">5,90€<span className="text-sm font-normal text-slate-400">/mois</span></p>
          <ul className="text-left space-y-3 mb-8 text-sm text-slate-600 flex-grow">
             <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Plans complets illimités</li>
             <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Adaptation IA chaque semaine</li>
             <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Connexion Strava illimitée</li>
          </ul>
          <button onClick={() => handleSubscribe(STRIPE_PRICES.MONTHLY)} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50">Souscrire mensuel</button>
        </div>
        <div className="bg-white p-8 rounded-3xl border-2 border-accent shadow-2xl text-center transform md:scale-105 relative flex flex-col">
          <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1 rounded-bl-xl font-bold text-xs uppercase">Populaire</div>
          <h3 className="text-xl font-bold mb-4">Annuel</h3>
          <p className="text-5xl font-black mb-2">49,90€<span className="text-sm font-normal text-slate-400">/an</span></p>
          <p className="text-xs text-green-600 font-bold mb-6">Économisez 30%</p>
          <ul className="text-left space-y-3 mb-8 text-sm text-slate-600 flex-grow">
             <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Tous les avantages mensuels</li>
             <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Support coach prioritaire</li>
          </ul>
          <button onClick={() => handleSubscribe(STRIPE_PRICES.YEARLY)} disabled={loading} className="w-full bg-accent text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50">Souscrire annuel</button>
        </div>
      </div>

      <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-center border border-slate-700">
         <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-slate-400 text-[10px] font-bold uppercase mb-4">
            <FlaskConical size={12} /> Mode Preview
         </div>
         <h4 className="text-white font-bold mb-4">Tester le mode Premium maintenant ?</h4>
         <button onClick={simulatePremium} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3 rounded-xl font-bold transition-all">🚀 Activer le Premium (Simulé)</button>
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
