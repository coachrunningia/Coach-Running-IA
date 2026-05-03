import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle, Lightbulb, Dumbbell, Target, Lock, Zap } from 'lucide-react';
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

  // Extraire le nombre de tours du mainSet (ex: "Circuit 3 tours", "Circuit 4 tours")
  const toursMatch = mainSet.match(/(\d+)\s*tours?/i);
  const nbTours = toursMatch ? parseInt(toursMatch[1]) : null;

  // Extraire le repos entre tours (ex: "Repos 1 min 30 entre tours")
  const reposMatch = mainSet.match(/repos?\s*([\d]+\s*min\s*\d*)\s*entre\s*tours/i);
  const reposTours = reposMatch ? reposMatch[1].trim() : null;

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

  // Si pas premium, afficher un aperçu flouté qui donne envie
  if (!isPremium) {
    return (
      <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
          {/* Fausse fiche floutée en arrière-plan */}
          <div className="filter blur-[6px] pointer-events-none select-none p-6 space-y-4">
            {/* Header flouté */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                <img src="/exercises/squats-poids-de-corps.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">Squats poids de corps</h4>
                <span className="inline-block mt-1 bg-accent/10 text-accent font-bold text-sm px-3 py-1 rounded-full">3×15</span>
              </div>
            </div>
            {/* Bénéfice running flouté */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
              <p className="text-xs font-bold text-accent">POURQUOI POUR LE RUNNING</p>
              <p className="text-sm text-slate-700">Renforce les muscles moteurs de la foulée et améliore la puissance...</p>
            </div>
            {/* Posture floutée */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm font-bold text-green-800">✅ Posture correcte</p>
              <p className="text-sm text-green-900">• Pieds largeur d'épaules, pointes ouvertes</p>
              <p className="text-sm text-green-900">• Dos droit, regard devant, poitrine ouverte</p>
              <p className="text-sm text-green-900">• Descendre cuisses parallèles au sol</p>
            </div>
            {/* Erreurs floutées */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm font-bold text-red-800">❌ Erreurs à éviter</p>
              <p className="text-sm text-red-900">• Genoux qui rentrent vers l'intérieur</p>
              <p className="text-sm text-red-900">• Dos arrondi en bas du mouvement</p>
            </div>
            {/* Tips flouté */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-sm font-bold text-blue-800">💡 Conseil coach</p>
              <p className="text-sm text-blue-900">Inspire en descendant, expire en remontant...</p>
            </div>
          </div>

          {/* Overlay avec CTA */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-white/60 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <Lock size={28} className="text-accent" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">Fiches exercices illustrées</h3>
            <p className="text-slate-600 text-center mb-2 max-w-md">
              {exercises.length} exercices avec illustration, posture correcte, erreurs à éviter et conseils de coach.
            </p>
            <p className="text-sm text-slate-400 mb-6 text-center">Validé par des kinésithérapeutes et préparateurs physiques</p>
            <a href="/pricing" className="bg-accent hover:bg-orange-600 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-2">
              <Zap size={18} fill="currentColor" />
              Débloquer avec Premium
            </a>
            <button onClick={onClose} className="mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Fermer
            </button>
          </div>
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

        {/* Rappel circuit */}
        {nbTours && (
          <div className="mx-4 md:mx-6 mt-3 bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="font-bold">🔄 Circuit {nbTours} tours</span>
            {reposTours && <span className="text-slate-300">Repos {reposTours} entre tours</span>}
          </div>
        )}

        {/* Exercise content */}
        <div className="p-4 md:p-6 space-y-3">
          {/* Exercise name + sets */}
          <div>
            <div className="flex items-center gap-4">
              {/* Image compacte à gauche */}
              {info?.imageUrl ? (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={info.imageUrl} alt={current.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-4xl">{info?.icon || '💪'}</span>
                </div>
              )}
              {/* Nom + reps à droite */}
              <div>
                <h4 className="text-xl md:text-2xl font-black text-slate-900">{current.name}</h4>
                <span className="inline-block mt-1 bg-accent/10 text-accent font-bold text-sm px-3 py-1 rounded-full">
                  {current.sets}
                </span>
              </div>
            </div>
          </div>

          {/* Running benefit */}
          {info?.runningBenefit && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
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
