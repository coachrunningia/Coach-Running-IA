
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionnaireData, UserGoal, RunningLevel, User } from '../types';
import { GOAL_OPTIONS, LEVEL_OPTIONS, ROAD_DISTANCES } from '../constants';
import { ChevronRight, ChevronLeft, Calendar, AlertCircle, Info, MapPin, Activity, Mountain, Clock, Mail, ShieldAlert, Scale, Ruler, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { registerUser, savePlan, saveUserQuestionnaire, createEmailVerificationToken } from '../services/storageService';

interface QuestionnaireProps {
  initialGoal?: string;
  initialSubGoal?: string;
  onComplete: (data: QuestionnaireData) => void;
  isGenerating: boolean;
  user?: User | null;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ onComplete, isGenerating: externalIsGenerating, user, initialGoal, initialSubGoal }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(initialGoal ? 2 : 1);
  const totalSteps = 5;
  const todayStr = new Date().toISOString().split('T')[0];
  const minRaceDate = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000);
  const minRaceDateStr = minRaceDate.toISOString().split('T')[0];

  const [data, setData] = useState<QuestionnaireData>({
    goal: initialGoal || null,
    subGoal: initialSubGoal || undefined,
    level: null,
    frequency: 3,
    preferredDays: [],
    startDate: todayStr,
    sex: 'Homme',
    trailDetails: (initialGoal === 'Trail' || initialGoal === UserGoal.TRAIL) ? { distance: 20, elevation: 500 } : undefined,
    recentRaceTimes: {},
    city: '',
    injuries: { hasInjury: false },
    comments: ''
  });

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Nouveaux états pour l'inscription
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Combine external et internal loading states
  const isGenerating = externalIsGenerating || isProcessing;

  const updateData = (key: keyof QuestionnaireData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateTrail = (key: 'distance' | 'elevation', value: number) => {
    setData(prev => ({
      ...prev,
      trailDetails: { ...prev.trailDetails!, [key]: value }
    }));
  };

  const updateRaceTime = (key: keyof NonNullable<QuestionnaireData['recentRaceTimes']>, value: string) => {
    setData(prev => ({
      ...prev,
      recentRaceTimes: { ...prev.recentRaceTimes, [key]: value }
    }));
  };

  const updateInjury = (hasInjury: boolean, description?: string) => {
    setData(prev => ({
      ...prev,
      injuries: { hasInjury, description: description ?? prev.injuries?.description }
    }));
  };

  // Helper: met à jour targetTime depuis 2 selects (heures + minutes) → "XhYY"
  const [targetHours, setTargetHours] = useState<string>('');
  const [targetMinutes, setTargetMinutes] = useState<string>('');
  const updateTargetTime = (h: string, m: string) => {
    setTargetHours(h);
    setTargetMinutes(m);
    const hours = parseInt(h) || 0;
    const mins = parseInt(m) || 0;
    if (hours === 0 && mins === 0) {
      updateData('targetTime', undefined);
    } else if (hours === 0) {
      updateData('targetTime', `${mins}min`);
    } else {
      updateData('targetTime', `${hours}h${mins > 0 ? String(mins).padStart(2, '0') : '00'}`);
    }
  };

  // Helper: met à jour un recentRaceTime depuis 2 inputs (mm:ss ou h:mm)
  const updateStructuredRaceTime = (key: keyof NonNullable<QuestionnaireData['recentRaceTimes']>, h: string, m: string, s?: string) => {
    const hours = parseInt(h) || 0;
    const mins = parseInt(m) || 0;
    const secs = parseInt(s || '') || 0;
    let formatted = '';
    if (hours > 0) {
      formatted = `${hours}h${String(mins).padStart(2, '0')}`;
    } else if (mins > 0) {
      formatted = secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}min`;
    }
    updateRaceTime(key, formatted);
  };

  // States pour les temps de course structurés
  const [raceTimeInputs, setRaceTimeInputs] = useState<Record<string, { h: string; m: string; s: string }>>({
    distance5km: { h: '', m: '', s: '' },
    distance10km: { h: '', m: '', s: '' },
    distanceHalfMarathon: { h: '', m: '', s: '' },
    distanceMarathon: { h: '', m: '', s: '' },
  });
  const updateRaceTimeInput = (key: string, field: 'h' | 'm' | 's', value: string) => {
    // Autoriser uniquement des chiffres
    const clean = value.replace(/\D/g, '').slice(0, 2);
    const updated = { ...raceTimeInputs[key], [field]: clean };
    setRaceTimeInputs(prev => ({ ...prev, [key]: updated }));
    updateStructuredRaceTime(
      key as keyof NonNullable<QuestionnaireData['recentRaceTimes']>,
      updated.h, updated.m, updated.s
    );
  };

  useEffect(() => {
    if (user?.email && !data.email) updateData('email', user.email);
  }, [user]);

  const nextStep = () => {
    setShowValidationErrors(false);
    setStep(s => s + 1);
  };
  const nextStepWithValidation = () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    nextStep();
  };
  const prevStep = () => setStep(s => s - 1);

  const getValidationErrors = () => {
    const errors = [];

    // Validation PAR ÉTAPE — chaque étape ne valide que ses propres champs
    if (step === 1) {
      if (!data.goal) errors.push("Choisissez un objectif pour continuer.");
    }

    if (step === 2) {
      if (data.goal === UserGoal.ROAD_RACE && !data.subGoal) errors.push("Choisissez une distance de course.");
      if (data.goal === UserGoal.FITNESS && !data.fitnessSubGoal) errors.push("Précisez votre objectif forme.");
      if ((data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && !data.raceDate)
        errors.push("La date de la course est obligatoire.");
      if (data.startDate && data.raceDate && new Date(data.startDate) >= new Date(data.raceDate))
        errors.push("La date de début doit être avant la date de la course.");
      if (data.raceDate) {
        const raceD = new Date(data.raceDate);
        const now = new Date();
        const diffWeeks = Math.floor((raceD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks < 6)
          errors.push("La date de course doit être dans au moins 6 semaines.");
      }
      if (!data.city || !data.city.trim()) errors.push("Ta ville est nécessaire pour te proposer des lieux d'entraînement adaptés.");
    }

    if (step === 3) {
      if (data.injuries?.hasInjury && !data.injuries.description) {
        errors.push("Décris ta blessure ou ton antécédent pour qu'on adapte le plan.");
      }
      if ((data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) &&
          (data.currentWeeklyVolume === undefined || data.currentWeeklyVolume === null || isNaN(data.currentWeeklyVolume))) {
        errors.push("Le volume hebdomadaire actuel est obligatoire. Si tu ne cours pas encore, indique 0.");
      }
    }

    if (step === 4) {
      if (!data.level) errors.push("Indique ton niveau de course.");
      if (!data.age) errors.push("Ton âge est nécessaire pour adapter le plan.");
      if (data.age && data.age < 18) errors.push("Tu dois avoir au moins 18 ans pour utiliser Coach Running IA. Demande à un adulte de t'accompagner dans ta pratique sportive.");
      if (!data.weight) errors.push("Ton poids est nécessaire pour calibrer les charges.");
      if (!data.height) errors.push("Ta taille est nécessaire pour évaluer ton profil.");
    }

    if (step === 5 && !user) {
      if (!data.email) errors.push("L'email est requis.");
      if (!firstName.trim()) errors.push("Le prénom est requis.");
      if (!password) errors.push("Le mot de passe est requis.");
      if (password && password.length < 6) errors.push("Le mot de passe doit contenir au moins 6 caractères.");
    }
    return errors;
  };

  const handleFinalSubmit = async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    if (isGenerating) return;

    // Si l'utilisateur est déjà connecté, on appelle directement onComplete
    if (user) {
      onComplete(data);
      return;
    }

    // === NOUVEAU FLUX : Inscription + Génération + Email de vérification ===
    setIsProcessing(true);

    try {
      // Étape 1: Vérification limite de plan par email
      setProcessingStep('Vérification de votre email...');
      const emailToCheck = data.email!;

      try {
        const response = await fetch('/api/check-plan-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToCheck })
        });

        const result = await response.json();

        if (!result.allowed && result.reason === 'email_limit_reached') {
          setIsProcessing(false);
          alert('Cet email a déjà un plan gratuit. Connectez-vous pour y accéder.');
          navigate('/auth');
          return;
        }
      } catch (error) {
        console.error('[Check Limit Error]', error);
        // En cas d'erreur réseau, on continue
      }

      // Étape 2: Créer le compte Firebase (non vérifié)
      setProcessingStep('Création de votre compte...');
      let newUser;
      try {
        newUser = await registerUser(firstName.trim(), emailToCheck, password, data);
        console.log('[Questionnaire] User registered:', newUser.id);
      } catch (authError: any) {
        setIsProcessing(false);
        if (authError.code === 'auth/email-already-in-use') {
          alert('Cet email est déjà utilisé. Veuillez vous connecter.');
          navigate('/auth');
        } else {
          alert('Erreur lors de la création du compte : ' + authError.message);
        }
        return;
      }

      // Étape 3: Générer le plan avec l'IA
      setProcessingStep('Génération de votre plan personnalisé...');
      const { generatePreviewPlan } = await import('../services/geminiService');
      const plan = await generatePreviewPlan(data);

      if (plan) {
        plan.userId = newUser.id;
        plan.userEmail = emailToCheck;
      }

      // Étape 4: Sauvegarder le plan
      setProcessingStep('Sauvegarde de votre plan...');
      await savePlan(plan);
      await saveUserQuestionnaire(newUser.id, data);
      console.log('[Questionnaire] Plan saved:', plan.id);

      // Étape 5: Créer le token de vérification côté client puis envoyer l'email via Brevo
      setProcessingStep('Envoi de l\'email de confirmation...');
      try {
        // Générer le token côté client (utilise Firebase client SDK, pas Admin SDK)
        const verificationToken = await createEmailVerificationToken(newUser.id, emailToCheck, plan.id, firstName.trim());
        console.log('[Questionnaire] Token created:', verificationToken.substring(0, 10) + '...');

        // Envoyer l'email via le serveur (le serveur n'a plus besoin d'écrire dans Firestore)
        await fetch('/api/send-verification-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: verificationToken,
            email: emailToCheck,
            firstName: firstName.trim()
          })
        });
        console.log('[Questionnaire] Verification email sent');
      } catch (emailError) {
        console.error('[Questionnaire] Email sending failed:', emailError);
        // On continue même si l'email échoue - l'utilisateur pourra demander un renvoi
      }

      // Étape 6: Rediriger vers l'écran de confirmation
      setIsProcessing(false);
      navigate('/email-sent?email=' + encodeURIComponent(emailToCheck) + '&uid=' + encodeURIComponent(newUser.id) + '&fn=' + encodeURIComponent(firstName.trim()));

    } catch (error: any) {
      console.error('[Questionnaire] Error:', error);
      setIsProcessing(false);
      alert('Une erreur est survenue : ' + error.message);
    }
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
            onClick={() => {
              // Single setState to avoid race condition — all goal + trailDetails in one call
              if (option.value === UserGoal.TRAIL) {
                setData(prev => ({ ...prev, goal: option.value, trailDetails: prev.trailDetails || { distance: 20, elevation: 500 } }));
              } else {
                setData(prev => ({ ...prev, goal: option.value, trailDetails: undefined }));
              }
              // All goals go directly to step 2 (sub-selections like distance, trail details, etc. are on step 2)
              nextStep();
            }}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center gap-4 group ${data.goal === option.value ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-accent/30 bg-white'
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
        <p className="text-slate-500">Précisons les paramètres techniques.</p>
      </div>

      {/* Date de course - uniquement pour Course sur route et Trail */}
      {(data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={16} /> Date de la course</label>
            <input type="date" min={minRaceDateStr} disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
              onChange={(e) => updateData('raceDate', e.target.value)}
              value={data.raceDate || ''}
            />
            {/* Warning si plan > 20 semaines */}
            {(() => {
              if (!data.raceDate) return null;
              const start = data.startDate ? new Date(data.startDate) : new Date();
              const race = new Date(data.raceDate);
              const weeks = Math.floor((race.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
              if (weeks <= 20) return null;
              return (
                <div className="mt-2 p-3 rounded-xl text-sm bg-amber-50 border border-amber-200 text-amber-800">
                  <strong>{weeks} semaines de préparation</strong> — c'est long ! Pour la plupart des courses, 12 à 20 semaines suffisent. Tu peux rapprocher ta date de début ou augmenter ta fréquence d'entraînement pour un plan plus efficace.
                </div>
              );
            })()}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin size={16} /> Ville d'entraînement</label>
            <input type="text" placeholder="Ex: Lyon, Paris..." disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
              onChange={(e) => updateData('city', e.target.value)}
              value={data.city || ''}
            />
          </div>
        </div>
      )}

      {/* Ville seule - pour Perte de poids et Remise en forme */}
      {(data.goal === UserGoal.LOSE_WEIGHT || data.goal === UserGoal.FITNESS) && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin size={16} /> Ville d'entraînement</label>
          <input type="text" placeholder="Ex: Lyon, Paris..." disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
            onChange={(e) => updateData('city', e.target.value)}
            value={data.city || ''}
          />
        </div>
      )}

      {/* Temps visé - uniquement pour Course sur route et Trail */}
      {(data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={16} /> Temps visé (optionnel)</label>
          <div className="flex items-center gap-2">
            <select
              disabled={isGenerating}
              value={targetHours}
              onChange={(e) => updateTargetTime(e.target.value, targetMinutes)}
              className="p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">--</option>
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={String(i)}>{i}h</option>
              ))}
            </select>
            <select
              disabled={isGenerating}
              value={targetMinutes}
              onChange={(e) => updateTargetTime(targetHours, e.target.value)}
              className="p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">--</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i * 5} value={String(i * 5)}>{String(i * 5).padStart(2, '0')}min</option>
              ))}
            </select>
            {data.targetTime && (
              <span className="text-sm text-accent font-bold ml-2">{data.targetTime}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 italic">Laissez vide si pas d'objectif chrono.</p>
        </div>
      )}

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
          <div className="flex items-center gap-2 text-orange-800 font-bold"><Mountain size={18} /> Paramètres du Trail</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">Distance (km)</label>
              <input type="number" disabled={isGenerating} value={data.trailDetails?.distance || ''} onChange={e => updateTrail('distance', parseInt(e.target.value) || 0)}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">Dénivelé (D+)</label>
              <input type="number" disabled={isGenerating} value={data.trailDetails?.elevation || ''} onChange={e => updateTrail('elevation', parseInt(e.target.value) || 0)}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-orange-200">
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">Volume actuel (km/sem) <span className="text-red-500">*</span></label>
              <input type="number" min={0} disabled={isGenerating} placeholder="Ex: 50 (0 si débutant)" value={data.currentWeeklyVolume !== undefined && data.currentWeeklyVolume !== null ? data.currentWeeklyVolume : ''}
                onChange={e => updateData('currentWeeklyVolume', e.target.value === '' ? undefined as any : parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">D+ actuel (m/sem)</label>
              <input type="number" disabled={isGenerating} placeholder="Ex: 800" value={data.currentWeeklyElevation || ''}
                onChange={e => updateData('currentWeeklyElevation', parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
          </div>
          <p className="text-xs text-orange-600 italic">Optionnel - Aide à calibrer la progression</p>
        </div>
      )}

      {/* PERTE DE POIDS */}
      {data.goal === UserGoal.LOSE_WEIGHT && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold"><Activity size={18} /> Perte de poids</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">Temps disponible par semaine</label>
              <select
                disabled={isGenerating}
                value={data.weeklyTimeAvailable || '1h'}
                onChange={e => updateData('weeklyTimeAvailable', e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-200 bg-white text-slate-700"
              >
                <option value="30min">30 min</option>
                <option value="45min">45 min</option>
                <option value="1h">1h</option>
                <option value="1h-1h30">1h - 1h30</option>
                <option value="2h+">2h et +</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-emerald-600 italic">Programme : 8 semaines progressif</p>
        </div>
      )}

      {/* REMISE EN FORME */}
      {data.goal === UserGoal.FITNESS && (
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
          <div className="flex items-center gap-2 text-blue-800 font-bold"><Activity size={18} /> Objectifs spécifiques</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">Sous-objectif principal</label>
              <select
                disabled={isGenerating}
                value={data.fitnessSubGoal || 'restart'}
                onChange={e => updateData('fitnessSubGoal', e.target.value)}
                className="w-full p-3 rounded-lg border border-blue-200 bg-white text-slate-700"
              >
                <option value="restart">Reprendre le sport en douceur</option>
                <option value="20-30min">Courir 20-30 min sans s'arrêter</option>
                <option value="routine">Établir une routine sportive régulière</option>
                <option value="general">Améliorer ma condition physique générale</option>
                <option value="wellbeing">Réduire le stress / bien-être mental</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">Dernière activité sportive régulière</label>
              <select
                disabled={isGenerating}
                value={data.lastActivity || '3-6months'}
                onChange={e => updateData('lastActivity', e.target.value)}
                className="w-full p-3 rounded-lg border border-blue-200 bg-white text-slate-700"
              >
                <option value="<3months">Moins de 3 mois</option>
                <option value="3-6months">3-6 mois</option>
                <option value="6-12months">6-12 mois</option>
                <option value="1-2years">1-2 ans</option>
                <option value=">2years">Plus de 2 ans ou jamais</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-blue-600 italic">Programme : 8 semaines de routine</p>
        </div>
      )}

      {showValidationErrors && getValidationErrors().length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl mt-3">
          <ul className="text-red-700 text-xs space-y-1 list-disc list-inside">
            {getValidationErrors().map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStepWithValidation} disabled={isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Continuer</button>
      </div>
    </div>
  );

  // --- Step 3: Chronos & Santé ---
  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Chronos & Santé</h2>
        <p className="text-slate-500">Pour calibrer votre plan sur mesure.</p>
      </div>

      {/* INJURIES */}
      <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
        <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3"><ShieldAlert size={18} /> Blessures / Antécédents</h3>
        <div className="space-y-3">
          <div className="flex gap-4">
            <button
              onClick={() => updateInjury(false)}
              className={`flex-1 py-2 px-4 rounded-xl border-2 font-bold text-sm ${data.injuries?.hasInjury === false ? 'bg-white border-red-200 text-red-700 shadow-sm' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
            >
              Aucune blessure
            </button>
            <button
              onClick={() => updateInjury(true)}
              className={`flex-1 py-2 px-4 rounded-xl border-2 font-bold text-sm ${data.injuries?.hasInjury === true ? 'bg-white border-red-200 text-red-700 shadow-sm' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
            >
              J'ai une douleur/blessure
            </button>
          </div>

          {data.injuries?.hasInjury && (
            <textarea
              className="w-full p-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-200 outline-none text-sm min-h-[80px]"
              placeholder="Décrivez votre blessure (ex: Douleur genou gauche après 5km, Périostite tibiale...)"
              value={data.injuries.description || ''}
              onChange={(e) => updateInjury(true, e.target.value)}
            />
          )}
        </div>
      </div>

      {/* RACE TIMES */}
      <div>
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock size={16} /> Temps de référence (Optionnel)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {([
            { key: 'distance5km', label: '5 km', showH: false },
            { key: 'distance10km', label: '10 km', showH: true },
            { key: 'distanceHalfMarathon', label: 'Semi', showH: true },
            { key: 'distanceMarathon', label: 'Marathon', showH: true },
          ] as const).map(({ key, label, showH }) => (
            <div key={key} className="flex items-center gap-1.5 p-2 border rounded-xl bg-white">
              <span className="text-xs font-bold text-slate-500 min-w-[40px]">{label}</span>
              {showH && (
                <>
                  <input
                    type="text" inputMode="numeric" maxLength={2}
                    placeholder="h" className="w-10 p-2 text-center border rounded-lg outline-none focus:border-accent text-sm"
                    value={raceTimeInputs[key]?.h || ''}
                    onChange={e => updateRaceTimeInput(key, 'h', e.target.value)}
                  />
                  <span className="text-slate-400 font-bold">h</span>
                </>
              )}
              <input
                type="text" inputMode="numeric" maxLength={2}
                placeholder="min" className="w-12 p-2 text-center border rounded-lg outline-none focus:border-accent text-sm"
                value={raceTimeInputs[key]?.m || ''}
                onChange={e => updateRaceTimeInput(key, 'm', e.target.value)}
              />
              <span className="text-slate-400 text-xs">min</span>
              <input
                type="text" inputMode="numeric" maxLength={2}
                placeholder="s" className="w-10 p-2 text-center border rounded-lg outline-none focus:border-accent text-sm"
                value={raceTimeInputs[key]?.s || ''}
                onChange={e => updateRaceTimeInput(key, 's', e.target.value)}
              />
              <span className="text-slate-400 text-xs">s</span>
              {data.recentRaceTimes?.[key] && (
                <span className="text-xs text-accent font-medium ml-auto">{data.recentRaceTimes[key]}</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2 italic">Laissez vide si vous ne connaissez pas vos temps.</p>

        {/* Volume hebdomadaire pour Course/Trail — OBLIGATOIRE */}
        {(data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && (
          <div className="mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">Combien de km courez-vous par semaine ? <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 20 (mettez 0 si vous ne courez pas encore)"
              disabled={isGenerating}
              value={data.currentWeeklyVolume !== undefined && data.currentWeeklyVolume !== null ? data.currentWeeklyVolume : ''}
              onChange={e => updateData('currentWeeklyVolume', e.target.value === '' ? undefined as any : parseInt(e.target.value))}
              className={`w-full p-3 border rounded-xl outline-none focus:border-accent ${showValidationErrors && (data.currentWeeklyVolume === undefined || data.currentWeeklyVolume === null || isNaN(data.currentWeeklyVolume)) ? 'border-red-400 bg-red-50' : ''}`}
            />
            <p className="text-xs text-slate-500 mt-1">Essentiel pour calibrer votre plan. Si vous débutez, indiquez 0.</p>
          </div>
        )}
      </div>

      {/* COMMENTAIRE LIBRE */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Précisions supplémentaires (Optionnel)</label>
        <textarea
          className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-accent text-sm min-h-[60px]"
          placeholder="Ex: Je préfère courir le matin, je fais du vélo le weekend..."
          value={data.comments || ''}
          onChange={e => updateData('comments', e.target.value)}
        />
      </div>

      {showValidationErrors && getValidationErrors().length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <ul className="text-red-700 text-xs space-y-1 list-disc list-inside">
            {getValidationErrors().map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStepWithValidation} disabled={isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Continuer</button>
      </div>
    </div>
  );

  // Calcul IMC
  const calculateBMI = (weight: number, height: number): number => {
    if (!weight || !height || height === 0) return 0;
    return weight / ((height / 100) ** 2);
  };

  const getBMICategory = (bmi: number): { color: string; advice: string } => {
    if (bmi === 0) return { color: '', advice: '' };
    if (bmi < 18.5) return { color: 'text-slate-700 bg-slate-50', advice: 'Votre plan inclura des conseils pour bien accompagner votre effort et préserver votre énergie.' };
    if (bmi < 25) return { color: 'text-slate-700 bg-emerald-50', advice: 'Votre profil est bien adapté à la course. Le plan sera calibré pour progresser efficacement.' };
    if (bmi < 30) return { color: 'text-slate-700 bg-amber-50', advice: 'Votre plan sera progressif et adapté pour vous accompagner en toute sécurité vers vos objectifs.' };
    return { color: 'text-slate-700 bg-orange-50', advice: 'Votre plan privilégiera une approche douce et progressive (marche/course) pour démarrer sereinement.' };
  };

  const bmi = useMemo(() => calculateBMI(data.weight || 0, data.height || 0), [data.weight, data.height]);
  const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi]);

  // Calcul de la fréquence recommandée selon niveau et objectif
  const getRecommendedFrequency = useMemo(() => {
    const { goal, level, subGoal, targetTime } = data;

    // Valeurs par défaut si niveau non sélectionné
    if (!level) {
      return { min: 2, max: 4, recommended: 3, reason: "Sélectionnez votre niveau pour une recommandation personnalisée", warning: null };
    }

    let base = { min: 2, max: 4, recommended: 3 };
    let reason = "";
    let warning: string | null = null;

    // ===== LOGIQUE INTELLIGENTE PAR NIVEAU ET OBJECTIF =====

    // DÉBUTANT : Priorité absolue = Ne pas se blesser !
    if (level === RunningLevel.BEGINNER) {
      if (goal === UserGoal.LOSE_WEIGHT) {
        base = { min: 2, max: 2, recommended: 2 };
        reason = "2 séances/semaine suffisent pour débuter en toute sécurité et perdre du poids progressivement.";
        warning = "En tant que débutant, la régularité compte plus que le volume. Votre corps a besoin de s'adapter !";
      } else if (goal === UserGoal.FITNESS) {
        base = { min: 2, max: 2, recommended: 2 };
        reason = "2 séances/semaine pour reprendre en douceur. Votre corps doit d'abord s'habituer à l'effort.";
        warning = "Commencez doucement pour éviter les blessures et installer une routine durable.";
      } else if (goal === UserGoal.ROAD_RACE) {
        if (subGoal === '5 km') {
          base = { min: 2, max: 2, recommended: 2 };
          reason = "2 séances/semaine pour préparer un 5km en tant que débutant, en toute sécurité.";
        } else if (subGoal === '10 km') {
          base = { min: 2, max: 2, recommended: 2 };
          reason = "2 séances/semaine pour progresser vers le 10km sans risque de surmenage.";
          warning = "Le 10km demande une préparation progressive. Respectez les jours de repos !";
        } else if (subGoal === 'Semi-marathon') {
          base = { min: 3, max: 3, recommended: 3 };
          reason = "3 séances/semaine (2 running + 1 renfo) pour préparer un semi-marathon en toute sécurité.";
          warning = "Un semi-marathon est un objectif ambitieux pour un débutant. Prévois suffisamment de temps !";
        } else if (subGoal === 'Marathon') {
          base = { min: 3, max: 4, recommended: 3 };
          reason = "3 séances/semaine minimum (2 running + 1 renfo) pour préparer un marathon progressivement.";
          warning = "Un marathon débutant demande au moins 16 semaines de préparation. Écoute ton corps !";
        }
      } else if (goal === UserGoal.TRAIL) {
        const trailDist = data.trailDetails?.distance || 20;
        if (trailDist <= 30) {
          base = { min: 3, max: 3, recommended: 3 };
          reason = "3 séances/semaine (2 running + 1 renfo) pour préparer un trail en toute sécurité.";
        } else {
          base = { min: 3, max: 4, recommended: 3 };
          reason = "3 séances/semaine minimum pour un trail long, avec du spécifique montagne.";
          warning = "Un trail de cette distance est ambitieux pour un débutant. Envisagez un objectif intermédiaire.";
        }
      }
    }

    // INTERMÉDIAIRE : Équilibre progression / récupération
    else if (level === RunningLevel.INTERMEDIATE) {
      if (goal === UserGoal.LOSE_WEIGHT) {
        base = { min: 3, max: 4, recommended: 3 };
        reason = "3 séances/semaine optimisent la perte de poids tout en préservant la récupération.";
      } else if (goal === UserGoal.FITNESS) {
        base = { min: 3, max: 4, recommended: 3 };
        reason = "3 séances/semaine établissent une routine sportive solide.";
      } else if (goal === UserGoal.ROAD_RACE) {
        if (subGoal === '5 km' || subGoal === '10 km') {
          base = { min: 3, max: 4, recommended: 3 };
          reason = `3 séances/semaine pour progresser efficacement sur ${subGoal}.`;
        } else if (subGoal === 'Semi-marathon') {
          base = { min: 3, max: 5, recommended: 4 };
          reason = "4 séances/semaine pour une préparation semi-marathon complète.";
        } else if (subGoal === 'Marathon') {
          base = { min: 4, max: 5, recommended: 4 };
          reason = "4 séances/semaine pour préparer votre marathon sereinement.";
        }
      } else if (goal === UserGoal.TRAIL) {
        const trailDist = data.trailDetails?.distance || 20;
        if (trailDist <= 40) {
          base = { min: 3, max: 4, recommended: 3 };
          reason = "3-4 séances/semaine avec du spécifique montagne/descente.";
        } else {
          base = { min: 4, max: 5, recommended: 4 };
          reason = "4 séances/semaine pour un trail de cette envergure.";
        }
      }
    }

    // CONFIRMÉ : Volume plus important possible
    else if (level === RunningLevel.CONFIRMED) {
      if (goal === UserGoal.LOSE_WEIGHT || goal === UserGoal.FITNESS) {
        base = { min: 3, max: 5, recommended: 4 };
        reason = "4 séances/semaine pour des résultats optimaux avec votre niveau.";
      } else if (goal === UserGoal.ROAD_RACE) {
        if (subGoal === '5 km' || subGoal === '10 km') {
          base = { min: 4, max: 5, recommended: 4 };
          reason = `4 séances/semaine pour performer sur ${subGoal}.`;
        } else if (subGoal === 'Semi-marathon') {
          base = { min: 4, max: 5, recommended: 4 };
          reason = "4-5 séances/semaine pour optimiser votre semi-marathon.";
        } else if (subGoal === 'Marathon') {
          base = { min: 4, max: 5, recommended: 5 };
          reason = "5 séances/semaine pour une préparation marathon de qualité.";
        }
      } else if (goal === UserGoal.TRAIL) {
        const trailDist = data.trailDetails?.distance || 20;
        if (trailDist >= 80) {
          base = { min: 5, max: 6, recommended: 5 };
          reason = "5-6 séances/semaine indispensables pour un ultra de cette envergure.";
          warning = `Un ultra de ${trailDist}km demande un volume d'entraînement élevé. Avec moins de 5 séances, le volume maximal sera limité.`;
        } else if (trailDist >= 42) {
          base = { min: 4, max: 5, recommended: 5 };
          reason = "5 séances/semaine recommandées pour un trail long.";
        } else {
          base = { min: 4, max: 5, recommended: 4 };
          reason = "4-5 séances/semaine avec du travail spécifique trail.";
        }
      }
    }

    // EXPERT : Haut volume si nécessaire
    else if (level === RunningLevel.EXPERT) {
      if (goal === UserGoal.LOSE_WEIGHT || goal === UserGoal.FITNESS) {
        base = { min: 4, max: 5, recommended: 4 };
        reason = "4-5 séances/semaine, vous gérez bien votre entraînement.";
      } else if (goal === UserGoal.ROAD_RACE) {
        if (subGoal === '5 km' || subGoal === '10 km') {
          base = { min: 4, max: 6, recommended: 5 };
          reason = `5 séances/semaine pour optimiser votre ${subGoal}.`;
        } else if (subGoal === 'Semi-marathon') {
          base = { min: 5, max: 6, recommended: 5 };
          reason = "5 séances/semaine pour performer sur semi-marathon.";
        } else if (subGoal === 'Marathon') {
          base = { min: 5, max: 6, recommended: 5 };
          reason = "5-6 séances/semaine pour atteindre vos objectifs chronométriques.";

          // Bonus si temps ambitieux (sub 3h30)
          if (targetTime) {
            const timeMatch = targetTime.match(/(\d+)h?(\d*)/);
            if (timeMatch) {
              const hours = parseInt(timeMatch[1]) || 0;
              const mins = parseInt(timeMatch[2]) || 0;
              const totalMins = hours * 60 + mins;
              if (totalMins > 0 && totalMins <= 210) {
                base.recommended = 6;
                reason = `Pour viser ${targetTime} sur marathon, 6 séances/semaine sont recommandées.`;
              }
            }
          }
        }
      } else if (goal === UserGoal.TRAIL) {
        const trailDist = data.trailDetails?.distance || 20;
        if (trailDist > 60) {
          base = { min: 5, max: 6, recommended: 5 };
          reason = "5-6 séances/semaine pour un ultra-trail de cette envergure.";
        } else {
          base = { min: 4, max: 6, recommended: 5 };
          reason = "5 séances/semaine pour performer sur ce trail.";
        }
      }
    }

    return { ...base, reason, warning };
  }, [data.goal, data.level, data.subGoal, data.targetTime, data.trailDetails]);

  // Auto-ajuster la fréquence quand la recommandation change
  useEffect(() => {
    if (getRecommendedFrequency.recommended && data.frequency !== getRecommendedFrequency.recommended) {
      // Ne mettre à jour que si la valeur actuelle est en dehors de la plage recommandée
      if (data.frequency < getRecommendedFrequency.min || data.frequency > getRecommendedFrequency.max) {
        updateData('frequency', getRecommendedFrequency.recommended);
      }
    }
  }, [data.goal, data.level, data.subGoal]);

  // --- Step 4: Profil ---
  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Votre profil physique</h2>
        <p className="text-slate-500">Ces données aident l'IA à calculer votre charge de travail.</p>
      </div>

      {/* Sexe et Âge */}
      <div className="grid grid-cols-3 gap-3">
        <button disabled={isGenerating} onClick={() => updateData('sex', 'Homme')} className={`p-3 rounded-xl border-2 font-bold ${data.sex === 'Homme' ? 'border-accent bg-accent/5' : 'border-slate-100'} disabled:opacity-50`}>👨 Homme</button>
        <button disabled={isGenerating} onClick={() => updateData('sex', 'Femme')} className={`p-3 rounded-xl border-2 font-bold ${data.sex === 'Femme' ? 'border-accent bg-accent/5' : 'border-slate-100'} disabled:opacity-50`}>👩 Femme</button>
        <div className="relative">
          <input type="number" disabled={isGenerating} placeholder="Âge (18 ans min.) *" min="18" max="99" value={data.age || ''} onChange={e => updateData('age', parseInt(e.target.value))}
            className={`w-full p-3 border-2 rounded-xl focus:border-accent outline-none disabled:bg-slate-50 ${data.age ? 'border-slate-100' : 'border-orange-200'}`} />
        </div>
      </div>

      {/* Poids et Taille */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Scale size={18} className="text-accent" /> Données physiques
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 flex items-center gap-1">
              <Scale size={14} /> Poids (kg) *
            </label>
            <input
              type="number"
              min="30"
              max="200"
              disabled={isGenerating}
              placeholder="Ex: 70"
              value={data.weight || ''}
              onChange={e => updateData('weight', parseInt(e.target.value))}
              className={`w-full p-3 border-2 rounded-xl focus:border-accent outline-none disabled:bg-slate-100 ${data.weight ? 'border-slate-200' : 'border-orange-200'}`}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 flex items-center gap-1">
              <Ruler size={14} /> Taille (cm) *
            </label>
            <input
              type="number"
              min="120"
              max="220"
              disabled={isGenerating}
              placeholder="Ex: 175"
              value={data.height || ''}
              onChange={e => updateData('height', parseInt(e.target.value))}
              className={`w-full p-3 border-2 rounded-xl focus:border-accent outline-none disabled:bg-slate-100 ${data.height ? 'border-slate-200' : 'border-orange-200'}`}
            />
          </div>
        </div>

        {/* Conseil adapté pour objectif Perte de poids */}
        {bmi > 0 && data.goal === UserGoal.LOSE_WEIGHT && (
          <div className={`p-4 rounded-xl ${bmiCategory.color} animate-fade-in`}>
            <p className="text-sm">{bmiCategory.advice}</p>
          </div>
        )}
      </div>

      {/* Niveau */}
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

      {showValidationErrors && getValidationErrors().length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <ul className="text-red-700 text-xs space-y-1 list-disc list-inside">
            {getValidationErrors().map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStepWithValidation} disabled={isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Suivant</button>
      </div>
    </div>
  );

  // --- Step 5: Finalisation ---
  const renderStep5 = () => {
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
              <Calendar size={18} className="text-accent" /> Quand veux-tu commencer ?
            </label>
            <p className="text-xs text-slate-500 mb-2">C'est la date de ta première séance. Le plan sera calculé entre cette date et ta course.</p>
            <input type="date" value={data.startDate} min={todayStr} disabled={isGenerating}
              onChange={(e) => updateData('startDate', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent bg-white disabled:bg-slate-100 text-lg"
            />
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

            {/* Recommandation dynamique */}
            <div className={`mt-3 p-3 rounded-xl text-sm ${
              data.frequency === getRecommendedFrequency.recommended
                ? 'bg-emerald-50 border border-emerald-200'
                : data.frequency < getRecommendedFrequency.min || data.frequency > getRecommendedFrequency.max
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold ${
                  data.frequency === getRecommendedFrequency.recommended
                    ? 'text-emerald-700'
                    : data.frequency < getRecommendedFrequency.min || data.frequency > getRecommendedFrequency.max
                      ? 'text-amber-700'
                      : 'text-blue-700'
                }`}>
                  {data.frequency === getRecommendedFrequency.recommended
                    ? '✓ Fréquence recommandée'
                    : `Recommandé : ${getRecommendedFrequency.recommended} séances/semaine`
                  }
                </span>
              </div>
              <p className={`text-xs ${
                data.frequency === getRecommendedFrequency.recommended
                  ? 'text-emerald-600'
                  : data.frequency < getRecommendedFrequency.min || data.frequency > getRecommendedFrequency.max
                    ? 'text-amber-600'
                    : 'text-blue-600'
              }`}>
                {getRecommendedFrequency.reason}
                {data.frequency < getRecommendedFrequency.min && (
                  <span className="block mt-1 font-medium">
                    Attention : {data.frequency} séances peuvent être insuffisantes pour votre objectif.
                  </span>
                )}
                {data.frequency > getRecommendedFrequency.max && (
                  <span className="block mt-1 font-medium">
                    Attention : {data.frequency} séances augmentent le risque de surmenage et de blessure.
                  </span>
                )}
              </p>
            </div>

            {/* Répartition visuelle running / renfo */}
            <div className="mt-3 p-4 bg-gradient-to-r from-accent/5 to-orange-50 border-2 border-accent/20 rounded-xl">
              <div className="flex items-center justify-center gap-3 mb-2">
                {Array.from({ length: data.frequency - 1 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-lg">🏃</span>
                    <span className="text-[10px] font-bold text-accent">Running</span>
                  </div>
                ))}
                <span className="text-lg font-bold text-slate-300">+</span>
                <div className="flex flex-col items-center">
                  <span className="text-lg">💪</span>
                  <span className="text-[10px] font-bold text-blue-600">Renfo</span>
                </div>
              </div>
              <p className="text-center text-sm font-bold text-slate-800">
                {data.frequency - 1} séance{data.frequency - 1 > 1 ? 's' : ''} de course à pied + 1 séance de renforcement musculaire
              </p>
              <p className="text-center text-[11px] text-slate-500 mt-1">
                Le renforcement (gainage, proprioception) est essentiel pour prévenir les blessures
              </p>
            </div>

            {/* Warning spécifique au niveau débutant */}
            {getRecommendedFrequency.warning && data.level === RunningLevel.BEGINNER && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700">
                    <span className="font-bold">Conseil pour débutant :</span> {getRecommendedFrequency.warning}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SÉLECTEUR DE JOURS PRÉFÉRÉS */}
          <div>
            <label className="block mb-2 font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-accent" /> Jours préférés <span className="text-xs font-normal text-slate-400">(optionnel)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => {
                const isSelected = (data.preferredDays || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => {
                      const current = data.preferredDays || [];
                      if (isSelected) {
                        updateData('preferredDays', current.filter((d: string) => d !== day));
                      } else if (current.length < data.frequency) {
                        updateData('preferredDays', [...current, day]);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'bg-accent text-white shadow-md'
                        : (data.preferredDays || []).length >= data.frequency
                          ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-accent hover:text-accent'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-1 italic">
              {(data.preferredDays || []).length > 0
                ? (data.preferredDays || []).length < data.frequency
                  ? `⚠️ ${(data.preferredDays || []).length}/${data.frequency} jours sélectionnés — sélectionne au moins ${data.frequency} jours ou laisse vide`
                  : `${(data.preferredDays || []).length}/${data.frequency} jours sélectionnés`
                : `Sélectionnez jusqu'à ${data.frequency} jours, ou laissez vide pour une répartition automatique`
              }
            </p>
          </div>

          {/* SÉLECTEUR JOUR SORTIE LONGUE */}
          {(data.goal === 'Course sur route' || data.goal === 'Trail') && data.frequency >= 3 && (
            <div>
              <label className="block mb-2 font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-accent" /> Jour de la sortie longue <span className="text-xs font-normal text-slate-400">(optionnel — Dimanche par défaut)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => {
                  const isSelected = (data.preferredLongRunDay || 'Dimanche') === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => updateData('preferredLongRunDay', day)}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                        isSelected
                          ? 'bg-accent text-white shadow-md'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1 italic">
                La sortie longue est la séance clé de ta semaine. Choisis le jour où tu as le plus de temps.
              </p>
            </div>
          )}
        </div>

        {!user && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-accent/10 to-orange-50 p-4 rounded-xl border border-accent/20">
              <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <UserIcon size={18} className="text-accent" />
                Créez votre compte pour accéder à votre plan
              </h3>
              <p className="text-sm text-slate-600">
                Un email de confirmation vous sera envoyé pour activer votre compte.
              </p>
            </div>

            {/* Prénom */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                <UserIcon size={16} className="text-accent" /> Prénom
              </label>
              <input
                type="text"
                placeholder="Votre prénom"
                value={firstName}
                disabled={isGenerating}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail size={16} className="text-accent" /> Email
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={data.email || ''}
                disabled={isGenerating}
                onChange={(e) => updateData('email', e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                <Lock size={16} className="text-accent" /> Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  value={password}
                  disabled={isGenerating}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-12 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-xs">
              <Info size={14} className="flex-shrink-0" />
              <span>Vous recevrez un email pour confirmer votre adresse et accéder à votre plan.</span>
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

        {/* Indicateur de progression */}
        {isProcessing && processingStep && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <Activity className="animate-spin flex-shrink-0" size={20} />
            <span className="font-medium">{processingStep}</span>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
          <button onClick={handleFinalSubmit} disabled={isGenerating}
            className="bg-accent text-white px-12 py-4 rounded-full font-bold shadow-xl hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[200px]">
            {isGenerating ? (
              <><Activity className="animate-spin" size={20} /> {user ? 'Génération...' : 'Inscription...'}</>
            ) : (
              user ? 'Créer mon programme IA' : 'Créer mon compte et mon plan'
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-4">* En générant mon plan, j'accepte les <a href="/cgv" className="underline hover:text-accent">Conditions Générales de Vente</a></p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[2rem] shadow-lg p-8 border border-orange-100/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -mr-16 -mt-16 blur-3xl" />

      <div className="mb-10 flex items-center justify-between relative z-10">
        <div className="h-2 flex-1 bg-slate-100 rounded-full mr-6 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
        <span className="text-sm font-black text-orange-400 tracking-widest uppercase">Étape 0{step}</span>
      </div>

      <div className="relative z-10">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>
    </div>
  );
};

export default Questionnaire;
