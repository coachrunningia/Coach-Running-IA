import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle, Lightbulb, Dumbbell, Target } from 'lucide-react';
import { parseMainSetExercises, ExerciseInfo } from '../services/exerciseCatalog';

interface ExerciseDetailDrawerProps {
  mainSet: string;
  sessionTitle: string;
  isOpen: boolean;
  onClose: () => void;
  isPremium?: boolean;
}

const ExerciseDetailDrawer: React.FC<ExerciseDetailDrawerProps> = ({
  mainSet,
  sessionTitle,
  isOpen,
  onClose,
  isPremium = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const exercises = parseMainSetExercises(mainSet);

  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < exercises.length - 1) setCurrentIndex(i => i + 1);
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(i => i - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentIndex, exercises.length, onClose]);

  if (!isOpen || exercises.length === 0) return null;

  // Si pas premium, afficher un teaser
  if (!isPremium) {
    return (
      <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg p-8 text-center" onClick={e => e.stopPropagation()}>
          <Dumbbell className="text-accent mx-auto mb-4" size={48} />
          <h3 className="text-2xl font-black text-slate-900 mb-3">Fiches exercices illustrées</h3>
          <p className="text-slate-600 mb-6">
            Accédez aux fiches détaillées de chaque exercice : posture correcte, erreurs à éviter, conseils kiné et progression. Disponible avec l'abonnement Premium.
          </p>
          <button onClick={onClose} className="bg-accent hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold transition-all">
            Découvrir Premium
          </button>
        </div>
      </div>
    );
  }

  const current = exercises[currentIndex];
  const info = current.info;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="text-accent" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{sessionTitle}</h3>
              <p className="text-xs text-slate-500">{exercises.length} exercices • Exercice {currentIndex + 1}/{exercises.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>

        {/* Exercise content */}
        <div className="p-6 space-y-5">
          {/* Exercise name + sets */}
          <div className="text-center">
            <span className="text-4xl mb-2 block">{info?.icon || '💪'}</span>
            <h4 className="text-2xl font-black text-slate-900">{current.name}</h4>
            <span className="inline-block mt-2 bg-accent/10 text-accent font-bold text-sm px-4 py-1.5 rounded-full">
              {current.sets}
            </span>
          </div>

          {/* Image placeholder */}
          {info?.imageUrl ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={info.imageUrl} alt={current.name} className="w-full h-auto" loading="lazy" />
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-8 text-center">
              <span className="text-6xl block mb-2">{info?.icon || '💪'}</span>
              <p className="text-xs text-slate-400">Illustration bientôt disponible</p>
            </div>
          )}

          {/* Running benefit */}
          {info?.runningBenefit && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
              <Target className="text-accent shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Pourquoi pour le running</p>
                <p className="text-sm text-slate-700">{info.runningBenefit}</p>
              </div>
            </div>
          )}

          {/* Muscles */}
          {info && (
            <div className="flex flex-wrap gap-2">
              {info.muscle.split(',').map((m, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-100">
                  {m.trim()}
                </span>
              ))}
              {info.muscleSecondary.split(',').map((m, i) => (
                <span key={`s${i}`} className="bg-slate-50 text-slate-500 text-xs px-3 py-1 rounded-full border border-slate-100">
                  {m.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Posture */}
          {info?.posture && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h5 className="flex items-center gap-2 font-bold text-green-800 text-sm mb-3">
                <CheckCircle size={16} /> Posture correcte
              </h5>
              <ul className="space-y-2">
                {info.posture.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                    <span className="text-green-500 font-bold mt-0.5">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Erreurs */}
          {info?.mistakes && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h5 className="flex items-center gap-2 font-bold text-red-800 text-sm mb-3">
                <XCircle size={16} /> Erreurs à éviter
              </h5>
              <ul className="space-y-2">
                {info.mistakes.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                    <span className="text-red-500 font-bold mt-0.5">✗</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contre-indications */}
          {info?.contraindications && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Contre-indications</p>
                <p className="text-sm text-amber-900">{info.contraindications}</p>
              </div>
            </div>
          )}

          {/* Conseil coach + tempo */}
          {info && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h5 className="flex items-center gap-2 font-bold text-blue-800 text-sm mb-3">
                <Lightbulb size={16} /> Conseil coach
              </h5>
              <p className="text-sm text-blue-900 mb-3">{info.tipCoach}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-500 font-bold mb-1">TEMPO</p>
                  <p className="text-sm text-slate-700">{info.tempo}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-500 font-bold mb-1">PROGRESSION</p>
                  <p className="text-sm text-slate-700">{info.progression}</p>
                </div>
              </div>
              {info.alternative && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-500 font-bold mb-1">ALTERNATIVE (si trop difficile)</p>
                  <p className="text-sm text-slate-700">{info.alternative}</p>
                </div>
              )}
            </div>
          )}

          {/* Exercice non trouvé dans le catalogue */}
          {!info && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">
                Fiche détaillée bientôt disponible pour cet exercice.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Effectue le mouvement lentement et avec contrôle. En cas de doute, demande à un coach.
              </p>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-accent disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            Précédent
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {exercises.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-accent w-6' : 'bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex(i => Math.min(exercises.length - 1, i + 1))}
            disabled={currentIndex === exercises.length - 1}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-accent disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailDrawer;
