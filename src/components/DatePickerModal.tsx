
import React, { useState } from 'react';
import { Session } from '../types';
import { X, AlertTriangle } from 'lucide-react';
import { toISODateString } from '../utils/dateUtils';

interface DatePickerModalProps {
  session: Session;
  currentDate: Date;
  onConfirm: (newDateISO: string) => void;
  onClose: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ session, currentDate, onConfirm, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(toISODateString(currentDate));

  const isCompleted = session.feedback?.completed ?? false;
  const isPast = new Date(selectedDate + 'T00:00:00') < new Date(new Date().toDateString());

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-900">Modifier la date</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          <span className="font-semibold">{session.title}</span> ({session.dateOverride
            ? ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][currentDate.getDay()]
            : session.day})
        </p>

        {/* Warnings */}
        {isCompleted && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Cette seance est deja completee.</p>
          </div>
        )}

        {/* Date Input */}
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-2"
        />

        {isPast && selectedDate !== toISODateString(currentDate) && (
          <p className="text-xs text-amber-600 mb-4">Cette date est dans le passe.</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(selectedDate)}
            disabled={selectedDate === toISODateString(currentDate)}
            className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
