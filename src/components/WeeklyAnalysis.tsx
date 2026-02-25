
import React, { useState } from 'react';
import { TrendingUp, Loader, BarChart2 } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface WeeklyAnalysisProps {
    compact?: boolean;
}

const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({ compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Récupérer le token Strava depuis Firestore (côté client)
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const stravaToken = userData?.stravaToken;

      if (!stravaToken?.access_token) {
        alert('Strava non connecté. Veuillez d\'abord connecter votre compte Strava.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/strava/analyze-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          stravaAccessToken: stravaToken.access_token
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setAnalysis(data);
        setShowModal(true);
      } else {
        alert(data.error || 'Erreur lors de l\'analyse');
      }
    } catch (error) {
      console.error('Erreur analyse:', error);
      alert('Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
      return (
        <>
            <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 py-3 bg-white border-2 border-orange-100 hover:border-orange-300 text-orange-700 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
                {loading ? <Loader size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                {loading ? 'Analyse en cours...' : 'Analyser ma semaine avec Strava'}
            </button>
            {showModal && analysis && <AnalysisModal analysis={analysis} onClose={() => setShowModal(false)} />}
        </>
      );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <TrendingUp size={24} className="text-accent" />
          Analyse de la semaine
        </h3>
        
        <p className="text-slate-600 mb-6 text-sm">
          Comparez vos performances réelles (Strava) avec votre plan d'entraînement et recevez des recommandations d'adaptation.
        </p>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-3 group"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
                <BarChart2 size={20} className="text-accent group-hover:scale-110 transition-transform" />
                Analyser ma semaine avec l'IA
            </>
          )}
        </button>
      </div>

      {showModal && analysis && <AnalysisModal analysis={analysis} onClose={() => setShowModal(false)} />}
    </>
  );
};

const AnalysisModal = ({ analysis, onClose }: { analysis: any, onClose: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="bg-accent/10 p-2 rounded-full text-accent"><TrendingUp size={24} /></span>
            Bilan Hebdomadaire
        </h2>

        <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
            <h3 className="font-bold text-orange-800 mb-1 flex items-center gap-2">
                <ActivityIcon /> Activités Strava détectées
            </h3>
            <p className="text-orange-700">{analysis.activities?.length || 0} séances sur les 7 derniers jours</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-3">Analyse IA :</h4>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {analysis.analysis || "L'analyse comparative est prête à être générée..."}
            </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-700">
                  Pour adapter ton plan, utilise le bouton "J'ai terminé" après chaque séance pour donner ton ressenti.
                </p>
            </div>
        </div>

        <button
            onClick={onClose}
            className="mt-8 w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
            Compris
        </button>
        </div>
    </div>
);

const ActivityIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

export default WeeklyAnalysis;
