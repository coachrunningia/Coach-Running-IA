
import React, { useState } from 'react';
import { AlertTriangle, X, Zap, RefreshCw } from 'lucide-react';

interface FeasibilityWarningModalProps {
  feasibilityMessage: string;
  recommendation?: string;  // ex: "un temps cible de 1h23", "une durée de 16 semaines"
  onAcceptAndGenerate: () => void;
  onCreateNewPlan: () => void;
  onClose: () => void;
}

const FeasibilityWarningModal: React.FC<FeasibilityWarningModalProps> = ({
  feasibilityMessage,
  recommendation,
  onAcceptAndGenerate,
  onCreateNewPlan,
  onClose,
}) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Objectif ambitieux</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        {/* Feasibility message */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-800 leading-relaxed">{feasibilityMessage}</p>
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
            J'atteste avoir pris note que ce plan est, selon Coach Running IA, trop ambitieux pour mon niveau actuel et pourrait comporter des risques (surcharge, blessure, écart trop important). Je décide de générer ce plan en connaissance de cause.
          </span>
        </label>

        {/* CTAs */}
        <div className="space-y-3">
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
