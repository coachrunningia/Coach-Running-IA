
import React, { useState, useEffect } from 'react';
import { QuestionnaireData, UserGoal, RunningLevel, User } from '../types';
import { GOAL_OPTIONS, LEVEL_OPTIONS, ROAD_DISTANCES } from '../constants';
import { ChevronRight, ChevronLeft, Calendar, History, AlertCircle, Info, Scale, User as UserIcon, MapPin, Activity, Mountain, Clock, Mail } from 'lucide-react';

interface QuestionnaireProps {
  onComplete: (data: QuestionnaireData) => void;
  isGenerating: boolean;
  user?: User | null;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ onComplete, isGenerating, user }) => {
  const [step, setStep] = useState(1);
  const todayStr = new Date().toISOString().split('T')[0];

  const [data, setData] = useState<QuestionnaireData>({
    goal: null,
    level: null,
    frequency: 3,
    preferredDays: [],
    startDate: todayStr,
    sex: 'Homme',
    trailDetails: { distance: 20, elevation: 500 }
  });

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const updateData = (key: keyof QuestionnaireData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateTrail = (key: 'distance' | 'elevation', value: number) => {
    setData(prev => ({
      ...prev,
      trailDetails: { ...prev.trailDetails!, [key]: value }
    }));
  };

  useEffect(() => {
    if (user?.email && !data.email) updateData('email', user.email);
    if (user?.firstName && !data.comments) updateData('comments', user.firstName);
  }, [user]);

  const nextStep = () => {
    setShowValidationErrors(false);
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const getValidationErrors = () => {
    const errors = [];
    if (step >= 1 && !data.goal) errors.push("Veuillez choisir un objectif.");
    if (step >= 2) {
      if ((data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && !data.raceDate) 
        errors.push("La date de la course est obligatoire.");
      if (data.goal === UserGoal.ROAD_RACE && !data.subGoal) 
        errors.push("Veuillez choisir une distance de course.");
      
      if (data.startDate && data.raceDate && new Date(data.startDate) >= new Date(data.raceDate))
        errors.push("La date de début doit être avant la date de la course.");
    }
    if (step >= 3 && !data.level) errors.push("Veuillez indiquer votre niveau.");
    if (step === 4) {
        if (!data.email && !user) errors.push("L'email est requis pour sauvegarder votre plan.");
    }
    return errors;
  };

  const handleFinalSubmit = () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    if (isGenerating) return; // Sécurité double clic
    onComplete(data);
  };

  // --- Step 1: Objectif ---
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-900">Quel est votre défi ?</h2>
        <p className="text-slate-500">Choisissez votre objectif principal pour commencer.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GOAL_OPTIONS.map((option) => (
          <button
            key={option.value}
            disabled={isGenerating}
            onClick={() => { updateData('goal', option.value); nextStep(); }}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center gap-4 group ${
              data.goal === option.value ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30 bg-white'
            } disabled:opacity-50`}
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">{option.icon}</span>
            <div>
                <span className="block font-bold text-lg text-slate-800">{option.label}</span>
                <span className="text-xs text-slate-400">Cliquez pour sélectionner</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // --- Step 2: Détails Techniques ---
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Détails de l'objectif</h2>
        <p className="text-slate-500">Précisons les paramètres techniques de votre course.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={16}/> Date de la course</label>
            <input type="date" min={todayStr} disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
              onChange={(e) => updateData('raceDate', e.target.value)}
              value={data.raceDate || ''}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={16}/> Temps visé (optionnel)</label>
            <input type="text" placeholder="ex: 3h45 ou 55min" disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
              onChange={(e) => updateData('targetTime', e.target.value)}
              value={data.targetTime || ''}
            />
          </div>
      </div>

      {data.goal === UserGoal.ROAD_RACE && (
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700">Distance officielle</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROAD_DISTANCES.map(d => (
              <button key={d} disabled={isGenerating} onClick={() => updateData('subGoal', d)}
                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${data.subGoal === d ? 'border-accent bg-accent text-white' : 'border-slate-100 bg-white text-slate-600'} disabled:opacity-50`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.goal === UserGoal.TRAIL && (
        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
           <div className="flex items-center gap-2 text-orange-800 font-bold"><Mountain size={18}/> Paramètres du Trail</div>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-orange-700 mb-1">Distance (km)</label>
                <input type="number" disabled={isGenerating} value={data.trailDetails?.distance} onChange={e => updateTrail('distance', parseInt(e.target.value))} 
                  className="w-full p-2 rounded-lg border-orange-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-700 mb-1">Dénivelé (D+)</label>
                <input type="number" disabled={isGenerating} value={data.trailDetails?.elevation} onChange={e => updateTrail('elevation', parseInt(e.target.value))}
                  className="w-full p-2 rounded-lg border-orange-200" />
              </div>
           </div>
        </div>
      )}

      <div className="space-y-2">
         <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><History size={16}/> Record ou référence récente</label>
         <input type="text" placeholder="Ex: 10km de Paris en 48:30" disabled={isGenerating} className="w-full p-3 border rounded-xl"
           onChange={(e) => updateData('recentRaceTime', e.target.value)}
           value={data.recentRaceTime || ''}
         />
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStep} disabled={isGenerating} className="bg-primary text-white px-10 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50">Continuer</button>
      </div>
    </div>
  );

  // --- Step 3: Profil ---
  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Votre profil physique</h2>
        <p className="text-slate-500">Ces données aident l'IA à calculer votre charge de travail.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
          <button disabled={isGenerating} onClick={() => updateData('sex', 'Homme')} className={`p-3 rounded-xl border-2 font-bold ${data.sex === 'Homme' ? 'border-accent bg-accent/5' : 'border-slate-100'} disabled:opacity-50`}>👨 Homme</button>
          <button disabled={isGenerating} onClick={() => updateData('sex', 'Femme')} className={`p-3 rounded-xl border-2 font-bold ${data.sex === 'Femme' ? 'border-accent bg-accent/5' : 'border-slate-100'} disabled:opacity-50`}>👩 Femme</button>
          <div className="relative">
              <input type="number" disabled={isGenerating} placeholder="Âge" value={data.age || ''} onChange={e => updateData('age', parseInt(e.target.value))}
                className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50" />
          </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">Votre niveau actuel</label>
        <div className="space-y-2">
            {LEVEL_OPTIONS.map((option) => (
            <button key={option.value} disabled={isGenerating} onClick={() => updateData('level', option.value)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${data.level === option.value ? 'border-accent bg-accent/5' : 'border-slate-100 bg-white hover:border-accent/30'} disabled:opacity-50`}>
                <div className="font-bold text-slate-800">{option.label}</div>
                <div className="text-xs text-slate-500">{option.sub}</div>
            </button>
            ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStep} disabled={!data.level || isGenerating} className="bg-primary text-white px-10 py-3 rounded-full font-bold shadow-lg disabled:opacity-50">Suivant</button>
      </div>
    </div>
  );

  // --- Step 4: Finalisation ---
  const renderStep4 = () => {
    const errors = getValidationErrors();
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Dernière étape</h2>
            <p className="text-slate-500">Prêt à recevoir votre programme personnalisé ?</p>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 space-y-4">
           <div>
              <label className="block mb-2 font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-accent" /> Date de début du plan
              </label>
              <input type="date" value={data.startDate} min={todayStr} disabled={isGenerating}
                onChange={(e) => updateData('startDate', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent bg-white disabled:bg-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1">C'est le jour où vous commencerez votre première séance.</p>
           </div>

           <div>
              <label className="block mb-2 font-bold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-accent" /> Fréquence hebdomadaire
              </label>
              <div className="flex items-center gap-4">
                  <input type="range" min="2" max="6" step="1" disabled={isGenerating} value={data.frequency} onChange={e => updateData('frequency', parseInt(e.target.value))}
                    className="flex-1 accent-accent disabled:opacity-50" />
                  <span className="font-black text-xl text-accent w-12">{data.frequency}x</span>
              </div>
           </div>
        </div>

        {!user && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Mail size={16} className="text-accent"/> Votre Email</label>
            <input type="email" placeholder="votre@email.com" value={data.email || ''} disabled={isGenerating}
              onChange={(e) => updateData('email', e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50"
            />
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-[10px]">
               <Info size={14} />
               <span>Indispensable pour retrouver votre plan et recevoir les rappels de séances.</span>
            </div>
          </div>
        )}

        {showValidationErrors && errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-bounce-in">
            <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
              <AlertCircle size={16} /> Informations manquantes :
            </h4>
            <ul className="text-red-700 text-xs space-y-1 list-disc list-inside">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
          <button onClick={handleFinalSubmit} disabled={isGenerating}
            className="bg-accent text-white px-12 py-4 rounded-full font-bold shadow-xl hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[200px]">
            {isGenerating ? <><Activity className="animate-spin" size={20}/> Génération...</> : 'Créer mon programme IA'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      
      <div className="mb-10 flex items-center justify-between relative z-10">
         <div className="h-2 flex-1 bg-slate-100 rounded-full mr-6 overflow-hidden">
            <div className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${(step/4)*100}%` }} />
         </div>
         <span className="text-sm font-black text-slate-300 tracking-widest uppercase">Etape 0{step}</span>
      </div>

      <div className="relative z-10">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default Questionnaire;
