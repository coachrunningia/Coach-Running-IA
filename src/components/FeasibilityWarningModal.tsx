
import React, { useState } from 'react';
import { AlertTriangle, X, Zap, RefreshCw } from 'lucide-react';

interface FeasibilityWarningModalProps {
  feasibilityMessage: string;
  recommendation?: string;  // ex: "un temps cible de 1h23", "une durée de 16 semaines"
  confidenceScore?: number;
  declaredTarget?: string;    // ex: "2h00"
  declaredDistance?: string;  // ex: "Semi-Marathon"
  onAcceptAndGenerate: () => void;
  onCreateNewPlan: () => void;
  onClose: () => void;
}

const FeasibilityWarningModal: React.FC<FeasibilityWarningModalProps> = ({
  feasibilityMessage,
  recommendation,
  confidenceScore,
  declaredTarget,
  declaredDistance,
  onAcceptAndGenerate,
  onCreateNewPlan,
  onClose,
}) => {
  const [accepted, setAccepted] = useState(false);
  const isVeryLowScore = (confidenceScore ?? 100) < 15;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${isVeryLowScore ? 'bg-red-200' : 'bg-red-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
              <AlertTriangle className={isVeryLowScore ? 'text-red-700' : 'text-red-600'} size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              {isVeryLowScore ? 'Objectif irréaliste — risque sérieux' : 'Objectif ambitieux'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        {/* Score badge — très visible pour les scores critiques */}
        {isVeryLowScore && typeof confidenceScore === 'number' && (
          <div className="mb-4 flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-xl p-3">
            <div className="w-14 h-14 bg-red-600 text-white rounded-full flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xl font-black leading-none">{confidenceScore}</span>
              <span className="text-[9px] font-bold opacity-80">/100</span>
            </div>
            <div className="text-sm">
              <p className="font-black text-red-900">Indice de confiance critique</p>
              <p className="text-red-700 text-xs leading-snug">L'écart entre tes données et ton objectif est trop important pour être comblé en toute sécurité.</p>
            </div>
          </div>
        )}

        {/* Contraste déclaré vs réaliste — la pièce centrale */}
        {isVeryLowScore && declaredTarget && recommendation && (
          <div className="mb-4 bg-white border-2 border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-3 flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ton objectif déclaré</span>
              <span className="font-black text-slate-900">{declaredTarget}{declaredDistance ? ` sur ${declaredDistance}` : ''}</span>
            </div>
            <div className="p-3 flex items-baseline justify-between gap-3 bg-amber-50">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Estimation honnête depuis tes données</span>
              <span className="font-black text-amber-900">{recommendation}</span>
            </div>
          </div>
        )}

        {/* Feasibility message */}
        <div className={`${isVeryLowScore ? 'bg-red-100 border-red-300' : 'bg-red-50 border-red-200'} border rounded-xl p-4 mb-5`}>
          <p className={`text-sm ${isVeryLowScore ? 'text-red-900' : 'text-red-800'} leading-relaxed`}>{feasibilityMessage}</p>
        </div>

        {/* Attestation checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-300 text-accent focus:ring-accent cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
            {isVeryLowScore ? (
              <>
                J'ai bien compris que mon objectif est jugé <strong>irréaliste</strong> par Coach Running IA (indice de confiance {confidenceScore ?? '<15'}/100). {recommendation && (<>L'estimation honnête depuis mes données serait plutôt <strong>{recommendation}</strong>. </>)}Je veux quand même générer ce plan en connaissance de cause, et j'accepte explicitement&nbsp;:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                  <li>que les allures programmées resteront calibrées sur ma <strong>capacité actuelle</strong>, pas sur l'objectif visé&nbsp;;</li>
                  <li>le <strong>risque de blessure</strong> (surcharge, articulations, tendons) lié à un objectif au-delà de mes capacités&nbsp;;</li>
                  <li>le <strong>risque de ne pas finir la course</strong> (DNF) le jour J.</li>
                </ul>
              </>
            ) : (
              "J'atteste avoir pris note que ce plan est, selon Coach Running IA, trop ambitieux pour mon niveau actuel et pourrait comporter des risques (surcharge, blessure, écart trop important). Je décide de générer ce plan en connaissance de cause."
            )}
          </span>
        </label>

        {/* CTAs */}
        <div className="space-y-3">
          {/* Quand score critique + recommandation : l'alternative honnête est mise en avant en PRIMARY */}
          {isVeryLowScore && recommendation ? (
            <>
              <button
                onClick={onCreateNewPlan}
                className="w-full px-4 py-3.5 bg-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCw size={18} />
                Refaire un plan avec {recommendation} (recommandé)
              </button>
              <button
                onClick={onAcceptAndGenerate}
                disabled={!accepted}
                className={`w-full px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  accepted
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Zap size={18} />
                Générer quand même (risque accepté)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAcceptAndGenerate}
                disabled={!accepted}
                className={`w-full px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  accepted
                    ? 'bg-accent text-white hover:bg-orange-600 shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Zap size={18} fill="currentColor" />
                Générer la suite de ce plan
              </button>
              {recommendation && (
                <button
                  onClick={onCreateNewPlan}
                  className="w-full px-4 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Je veux faire un autre plan avec {recommendation}
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeasibilityWarningModal;
