import React, { useState } from 'react';
import { Activity, Lock, BarChart2, Zap, LogOut, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { fetchRecentActivities, analyzeActivitiesWithGemini, checkCanAnalyze } from '../services/stravaAnalysisService';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

// ...

interface StravaConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  isPremium?: boolean;
}

const StravaConnect: React.FC<StravaConnectProps> = ({ isConnected, onConnect, isPremium = false }) => {
  const [loading, setLoading] = useState(false);
  // Source of truth local state (starts with prop, updates with listener)
  const [isLinked, setIsLinked] = useState(isConnected);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<string | null>(null);

  const navigate = useNavigate();

  // Debug Logs & Listener
  React.useEffect(() => {
    console.log('[Strava] Component mounted. isConnected Prop:', isConnected);

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    console.log('[Strava] Checking Firestore for user:', userId);

    const unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const connected = !!data.stravaConnected;
        console.log('[Strava] Firestore Update -> Connected:', connected);

        if (connected) {
          setIsLinked(true);
          setLoading(false);
          if (onConnect) onConnect();
        } else {
          setIsLinked(false);
        }
      }
    });
    return () => unsub();
  }, [isConnected, onConnect]);

  const handleConnect = async () => {
    if (!isPremium) {
      navigate('/pricing');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('Vous devez être connecté');
        setLoading(false);
        return;
      }

      console.log('[Strava] Fetching auth URL...');

      // Appel à l'API pour récupérer l'URL d'autorisation
      const response = await fetch('/api/strava/auth', {
        method: 'GET'
      });

      const data = await response.json();
      console.log('[Strava] Auth URL received:', data.url?.substring(0, 50) + '...');

      // Ajoute le userId dans le state OAuth
      const authUrl = `${data.url}&state=${userId}`;

      // Sauvegarder la page actuelle pour y revenir après connexion
      localStorage.setItem('strava_return_url', window.location.pathname + window.location.hash);

      // Redirection directe (le callback redirigera vers /strava-callback)
      // Le composant StravaCallback.tsx sauvegarde les tokens côté client
      console.log('[Strava] Redirecting to Strava OAuth...');
      window.location.href = authUrl;

    } catch (error) {
      console.error('[Strava] Erreur connexion:', error);
      alert('Erreur lors de la connexion à Strava');
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setAnalyzing(true);
    setRateLimitInfo(null);

    try {
      // Check rate limit first
      const rateCheck = await checkCanAnalyze(userId);

      if (!rateCheck.canAnalyze) {
        // Show last analysis from cache
        if (rateCheck.lastAnalysis) {
          setAnalysis(rateCheck.lastAnalysis);
          setShowAnalysisModal(true);
          setRateLimitInfo(`Prochaine analyse disponible : ${rateCheck.nextAvailable}`);
        } else {
          alert(`Vous avez déjà utilisé votre analyse cette semaine. Prochaine analyse disponible : ${rateCheck.nextAvailable}`);
        }
        setAnalyzing(false);
        return;
      }

      const activities = await fetchRecentActivities(userId);
      console.log("Activities fetched:", activities.length);

      if (activities.length === 0) {
        alert("Aucune activité récente trouvée sur Strava.");
        setAnalyzing(false);
        return;
      }

      const result = await analyzeActivitiesWithGemini(activities, userId);
      setAnalysis(result);
      setShowAnalysisModal(true);
      console.log("Analysis result:", result);

    } catch (e) {
      console.error("Analysis failed", e);
      alert("Erreur lors de l'analyse.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      await updateDoc(doc(db, 'users', userId), {
        stravaConnected: false,
        stravaToken: null
      });
      window.location.reload();
    } catch (e) {
      console.error("Error disconnecting", e);
    }
  };

  if (isLinked) {
    return (
      <>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-[#FC4C02] p-3 rounded-full text-white shadow-md">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  Compte Strava lié <span className="text-emerald-500 text-sm bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Actif</span>
                </h3>
                <p className="text-slate-500 text-sm">1 analyse par semaine incluse</p>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="text-slate-400 hover:text-red-500 transition-colors p-2"
              title="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" /> Bilan mensuel
            </h4>

            <p className="text-sm text-slate-600 mb-4">
              Analyse structurée de vos 30 derniers jours : points forts, points faibles et recommandations personnalisées.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
            >
              {analyzing ? (
                <><RefreshCw className="animate-spin" size={18} /> Analyse en cours...</>
              ) : (
                <><Zap size={18} className="text-yellow-400" /> Lancer mon bilan mensuel</>
              )}
            </button>
            {rateLimitInfo && (
              <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                <Clock size={12} /> {rateLimitInfo}
              </p>
            )}
          </div>
        </div>

        {/* ANALYSIS MODAL */}
        {showAnalysisModal && analysis && (
          <StructuredAnalysisModal
            analysis={analysis}
            rateLimitInfo={rateLimitInfo}
            onClose={() => setShowAnalysisModal(false)}
          />
        )}
      </>
    );
  }

return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-slate-100 border border-slate-200">
      <Activity size={20} className="text-slate-400" />
      <div>
        <p className="font-semibold text-slate-600">Connexion Strava bientôt disponible</p>
        <p className="text-xs text-slate-400">En cours de validation par Strava</p>
      </div>
    </div>
  );};

// --- STRUCTURED ANALYSIS MODAL ---
const StructuredAnalysisModal = ({ analysis, rateLimitInfo, onClose }: { analysis: any; rateLimitInfo: string | null; onClose: () => void }) => {
  const verdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT': return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', icon: <CheckCircle size={20} /> };
      case 'BON': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: <TrendingUp size={20} /> };
      case 'INSUFFISANT': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: <AlertTriangle size={20} /> };
      default: return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: <TrendingDown size={20} /> };
    }
  };

  const priorityStyle = (priority: string) => {
    switch (priority) {
      case 'HAUTE': return 'bg-red-100 text-red-700 border-red-200';
      case 'MOYENNE': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const vs = verdictStyle(analysis.coachVerdict || 'BON');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 pb-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-[#FC4C02] p-2.5 rounded-xl text-white">
                <BarChart2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bilan Mensuel</h2>
                <p className="text-xs text-slate-500">Analyse IA de vos 30 derniers jours</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Distance</span>
              <p className="text-lg font-black text-slate-900">{analysis.totalDistance}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Temps</span>
              <p className="text-lg font-black text-slate-900">{analysis.totalTime || '-'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Séances</span>
              <p className="text-lg font-black text-slate-900">{analysis.sessionCount}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Allure moy.</span>
              <p className="text-lg font-black text-slate-900">{analysis.avgPace || '-'}</p>
            </div>
          </div>

          {/* Verdict */}
          <div className={`p-4 rounded-xl border ${vs.bg} ${vs.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={vs.text}>{vs.icon}</span>
              <span className={`font-bold text-sm ${vs.text}`}>Verdict du Coach : {analysis.coachVerdict}</span>
            </div>
            <p className={`text-sm ${vs.text} opacity-90`}>{analysis.mainInsight}</p>
          </div>

          {/* Coach Message */}
          {analysis.coachMessage && (
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🎯</span>
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm mb-1">Message du Coach</h4>
                  <p className="text-sm text-indigo-800 leading-relaxed italic">"{analysis.coachMessage}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Points Forts */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                Points Forts
              </h4>
              <div className="space-y-2">
                {analysis.strengths.map((s: any, i: number) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                    <p className="font-bold text-emerald-800 text-sm">{typeof s === 'string' ? s : s.title}</p>
                    {typeof s !== 'string' && s.detail && (
                      <p className="text-xs text-emerald-700 mt-1">{s.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points Faibles */}
          {analysis.weaknesses && analysis.weaknesses.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={14} className="text-amber-600" />
                </div>
                Points Faibles
              </h4>
              <div className="space-y-2">
                {analysis.weaknesses.map((w: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                    <p className="font-bold text-amber-800 text-sm">{typeof w === 'string' ? w : w.title}</p>
                    {typeof w !== 'string' && w.detail && (
                      <p className="text-xs text-amber-700 mt-1">{w.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommandations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Zap size={14} className="text-blue-600" />
                </div>
                Recommandations
              </h4>
              <div className="space-y-3">
                {analysis.recommendations.map((r: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityStyle(r.priority)}`}>
                        {r.priority}
                      </span>
                      <p className="font-bold text-slate-800 text-sm">{r.title}</p>
                    </div>
                    <p className="text-sm text-slate-600">{r.detail}</p>
                    {r.why && <p className="text-xs text-slate-400 mt-2 italic">{r.why}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate limit info */}
          {rateLimitInfo && (
            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1 pt-2">
              <Clock size={12} /> {rateLimitInfo}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Fermer le bilan
          </button>
        </div>
      </div>
    </div>
  );
};

export default StravaConnect;
