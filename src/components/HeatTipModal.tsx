import React, { useEffect, useState } from 'react';
import { Thermometer, X, Sun, Droplets, Activity, Calendar, AlertTriangle } from 'lucide-react';

// Pop-up "Conseils forte chaleur" — déclenchée depuis la page Plan.
//
// - Auto-ouverture 1× par jour par client (localStorage `heatTipSeen:<userId>:<YYYY-MM-DD>`)
// - Toujours rappelable via le bouton thermomètre du header
// - Pastille rouge tant que pas vu aujourd'hui
// - Fermable : croix / clic dehors / bouton "J'ai compris"
// - Aucun gating : informatif, l'utilisateur accède normalement à son plan
// - Pas de chiffres précis de température (la doctrine projet évite les protocoles chiffrés
//   dans le contenu plan ; on reste sur des conseils qualitatifs)

const DATE_KEY = (userId: string | undefined) => {
  const today = new Date().toISOString().slice(0, 10);
  return `heatTipSeen:${userId || 'anon'}:${today}`;
};

/** Retourne true si l'utilisateur n'a pas encore marqué le tip comme vu aujourd'hui. */
export function shouldOpenHeatTipAutomatically(userId: string | undefined): boolean {
  try {
    return localStorage.getItem(DATE_KEY(userId)) !== '1';
  } catch {
    return false;
  }
}

function markSeenToday(userId: string | undefined): void {
  try { localStorage.setItem(DATE_KEY(userId), '1'); } catch { /* ignore */ }
}

interface HeatTipModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

const HeatTipModal: React.FC<HeatTipModalProps> = ({ open, onClose, userId }) => {
  if (!open) return null;
  const handleAcknowledge = () => {
    markSeenToday(userId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={handleAcknowledge}
      role="dialog"
      aria-modal="true"
      aria-labelledby="heat-tip-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Thermometer size={20} className="text-orange-600" />
            </div>
            <h2 id="heat-tip-title" className="text-lg font-bold text-slate-900">
              Forte chaleur — cours en sécurité
            </h2>
          </div>
          <button
            onClick={handleAcknowledge}
            aria-label="Fermer"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <Tip
            icon={<Sun size={20} className="text-amber-600" />}
            title="1. Choisis les heures fraîches"
            body="Privilégie tôt le matin ou en soirée, quand les températures ne sont pas au maximum. Évite la tranche 11h–17h, la plus exposée."
          />
          <Tip
            icon={<Droplets size={20} className="text-sky-600" />}
            title="2. Hydrate-toi avant, pendant et après"
            body="La déshydratation peut s'installer tout au long de l'effort, pas seulement à la fin. Bois en amont, par petites gorgées pendant la séance, et reconstitue tes réserves après."
          />
          <Tip
            icon={<Activity size={20} className="text-rose-600" />}
            title="3. Ajuste tes allures"
            body="Par forte chaleur, le cardio grimpe plus vite. Reste toujours en aisance respiratoire et ne force pas. Le fractionné paraîtra plus dur — et le sera réellement pour le corps : n'hésite pas à ralentir."
          />
          <Tip
            icon={<Calendar size={20} className="text-emerald-600" />}
            title="4. Reporte si tu peux"
            body="Si ton plan est flexible, mieux vaut décaler une séance que de t'affaiblir. Repousser d'un jour ou vers un créneau plus frais reste plus bénéfique que de subir."
          />

          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 leading-relaxed">
                <span className="font-bold">Rappel sécurité :</span> vertiges, nausées, frissons ou maux de tête → arrête-toi, mets-toi à l'ombre, hydrate-toi. Une séance écourtée vaut mieux qu'une séance subie.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleAcknowledge}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};

interface TipProps { icon: React.ReactNode; title: string; body: string; }
const Tip: React.FC<TipProps> = ({ icon, title, body }) => (
  <div className="flex gap-3">
    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  </div>
);

interface HeatTipTriggerProps {
  unseen: boolean;
  onClick: () => void;
}

/** Bouton thermomètre du header avec pastille rouge si non vu aujourd'hui. */
export const HeatTipTrigger: React.FC<HeatTipTriggerProps> = ({ unseen, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Conseils forte chaleur"
    className="relative w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 hover:bg-orange-100 transition-colors text-orange-600"
  >
    <Thermometer size={20} />
    {unseen && (
      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
    )}
  </button>
);

export default HeatTipModal;
