
import React from 'react';
import { X } from 'lucide-react';

interface CrossWeekConfirmModalProps {
  sessionTitle: string;
  daysDiff: number;
  fromWeek: number;
  toWeek: number;
  onMoveOnly: () => void;
  onShiftAll: () => void;
  onClose: () => void;
}

const CrossWeekConfirmModal: React.FC<CrossWeekConfirmModalProps> = ({
  sessionTitle, daysDiff, fromWeek, toWeek, onMoveOnly, onShiftAll, onClose
}) => {
  const direction = daysDiff > 0 ? 'en avant' : 'en arriere';
  const absDays = Math.abs(daysDiff);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-900">Changement de semaine</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Tu deplaces <span className="font-bold">"{sessionTitle}"</span> de{' '}
          <span className="font-bold">{absDays} jour{absDays > 1 ? 's' : ''} {direction}</span>{' '}
          (semaine {fromWeek} → semaine {toWeek}).
        </p>

        <div className="space-y-3">
          <button
            onClick={onMoveOnly}
            className="w-full px-4 py-3 bg-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
          >
            Deplacer cette seance uniquement
          </button>
          <button
            onClick={onShiftAll}
            className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Decaler toutes les seances suivantes
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrossWeekConfirmModal;
