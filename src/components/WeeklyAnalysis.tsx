
import React, { useState } from 'react';
import { TrendingUp, Loader, BarChart2, X } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AnalysisData {
    totalDistance?: string;
    totalTime?: string;
    totalElevation?: string;
    sessionCount?: number;
    avgPace?: string;
    weeklyBreakdown?: string;
    strengths?: { title: string; detail: string }[];
    weaknesses?: { title: string; detail: string }[];
    recommendations?: { priority: string; title: string; detail: string; why: string }[];
    mainInsight?: string;
    coachVerdict?: string;
    coachMessage?: string;
    activities?: any[];
    analysis?: string;
}

// Parse **bold** and newlines into React elements
const renderMarkdown = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    const lines = part.split('\n');
    return lines.map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
};

interface WeeklyAnalysisProps {
    compact?: boolean;
}

const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({ compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

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

// --- Verdict Badge ---
const VerdictBadge = ({ verdict }: { verdict: string }) => {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    'EXCELLENT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'BON': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'À AMÉLIORER': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'INSUFFISANT': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };
  const c = config[verdict] || config['BON'];
  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border ${c.bg} ${c.text} ${c.border}`}>
      {verdict}
    </span>
  );
};

// --- Priority Badge ---
const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    'HAUTE': 'bg-red-500',
    'MOYENNE': 'bg-orange-400',
    'BASSE': 'bg-emerald-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[priority] || 'bg-slate-400'}`} />
  );
};

// --- Volume Progress Bar ---
const VolumeBar = ({ label, value, max }: { label: string; value: string; max: number }) => {
  const numericMatch = value.match(/([\d.]+)/);
  const numeric = numericMatch ? parseFloat(numericMatch[1]) : 0;
  const pct = max > 0 ? Math.min((numeric / max) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-16 text-right">{value}</span>
    </div>
  );
};

// --- Type Distribution Bar ---
const TypeDistributionBar = ({ breakdown }: { breakdown: string }) => {
  // Parse the weeklyBreakdown text to extract session counts per week
  // This is a visual representation of the weekly distribution
  const weeks = breakdown.split('|').map(s => s.trim()).filter(Boolean);
  const maxKm = Math.max(...weeks.map(w => {
    const match = w.match(/([\d.]+)\s*km/i);
    return match ? parseFloat(match[1]) : 0;
  }), 1);

  return (
    <div className="space-y-2">
      {weeks.map((week, i) => {
        const kmMatch = week.match(/([\d.]+)\s*km/i);
        const km = kmMatch ? parseFloat(kmMatch[1]) : 0;
        const pct = (km / maxKm) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 shrink-0 truncate">{week.split(':')[0]?.trim()}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #f97316 100%)`
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 w-24 text-right">{week.split(':')[1]?.trim()}</span>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Analysis Modal ---
const AnalysisModal = ({ analysis, onClose }: { analysis: AnalysisData; onClose: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-100 p-6 pb-4 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-accent/10 p-2 rounded-full text-accent"><TrendingUp size={24} /></span>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Bilan Mensuel</h2>
                  {analysis.coachVerdict && (
                    <div className="mt-1"><VerdictBadge verdict={analysis.coachVerdict} /></div>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {analysis.totalDistance && (
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <p className="text-2xl font-black text-blue-700">{analysis.totalDistance}</p>
                  <p className="text-xs text-blue-500 font-medium">Distance</p>
                </div>
              )}
              {analysis.totalTime && (
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                  <p className="text-2xl font-black text-purple-700">{analysis.totalTime}</p>
                  <p className="text-xs text-purple-500 font-medium">Temps</p>
                </div>
              )}
              {analysis.totalElevation && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">{analysis.totalElevation}</p>
                  <p className="text-xs text-emerald-500 font-medium">Dénivelé</p>
                </div>
              )}
              {analysis.sessionCount != null && (
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                  <p className="text-2xl font-black text-orange-700">{analysis.sessionCount}</p>
                  <p className="text-xs text-orange-500 font-medium">Séances</p>
                </div>
              )}
            </div>

            {/* Average Pace */}
            {analysis.avgPace && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                <span className="text-2xl">⏱</span>
                <div>
                  <p className="text-sm text-slate-500">Allure moyenne</p>
                  <p className="text-lg font-bold text-slate-900">{analysis.avgPace}</p>
                </div>
              </div>
            )}

            {/* Weekly Breakdown with bars */}
            {analysis.weeklyBreakdown && (
              <div>
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BarChart2 size={18} className="text-accent" />
                  Volume par semaine
                </h4>
                <TypeDistributionBar breakdown={analysis.weeklyBreakdown} />
              </div>
            )}

            {/* Main Insight */}
            {analysis.mainInsight && (
              <div className="bg-gradient-to-r from-accent/5 to-orange-50 rounded-xl p-5 border border-accent/20">
                <p className="text-slate-800 font-medium leading-relaxed">{renderMarkdown(analysis.mainInsight)}</p>
              </div>
            )}

            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-3">Points forts</h4>
                <div className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <div key={i} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 shrink-0">✅</span>
                        <div>
                          <p className="font-bold text-emerald-800">{renderMarkdown(s.title)}</p>
                          <p className="text-sm text-emerald-700 mt-1">{renderMarkdown(s.detail)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses && analysis.weaknesses.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-3">Points à améliorer</h4>
                <div className="space-y-2">
                  {analysis.weaknesses.map((w, i) => (
                    <div key={i} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 shrink-0">⚠️</span>
                        <div>
                          <p className="font-bold text-amber-800">{renderMarkdown(w.title)}</p>
                          <p className="text-sm text-amber-700 mt-1">{renderMarkdown(w.detail)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-3">Recommandations</h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 shrink-0">
                          <PriorityBadge priority={r.priority} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">{renderMarkdown(r.title)}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              r.priority === 'HAUTE' ? 'bg-red-100 text-red-700' :
                              r.priority === 'MOYENNE' ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.priority}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{renderMarkdown(r.detail)}</p>
                          {r.why && <p className="text-xs text-slate-400 mt-2 italic">{renderMarkdown(r.why)}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coach Message */}
            {analysis.coachMessage && (
              <div className="bg-slate-900 rounded-xl p-5 text-white">
                <p className="text-xs font-bold text-accent uppercase mb-2">Message du Coach</p>
                <p className="leading-relaxed text-slate-200">{renderMarkdown(analysis.coachMessage)}</p>
              </div>
            )}

            {/* Fallback for old-format analysis */}
            {!analysis.strengths && analysis.analysis && (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-3">Analyse IA :</h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{analysis.analysis}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 pt-4 rounded-b-2xl">
            <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
                Compris
            </button>
          </div>
        </div>
    </div>
);

export default WeeklyAnalysis;
