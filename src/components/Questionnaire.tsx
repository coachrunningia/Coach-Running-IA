
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

  const [data, setData] = useState<QuestionnaireData>({
    goal: initialGoal || null,
    subGoal: initialSubGoal || undefined,
    level: null,
    frequency: 3,
    preferredDays: [],
    startDate: todayStr,
    sex: 'Homme',
    trailDetails: { distance: 20, elevation: 500 },
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

  useEffect(() => {
    if (user?.email && !data.email) updateData('email', user.email);
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
      if (!data.city) errors.push("Votre ville est requise pour personnaliser l'expérience.");
    }

    if (step >= 3) {
      if (data.injuries?.hasInjury && !data.injuries.description) {
        errors.push("Veuillez décrire votre blessure ou antécédent.");
      }
    }

    if (step >= 4 && !data.level) errors.push("Veuillez indiquer votre niveau.");

    // Étape 5 : Inscription obligatoire pour les non-connectés
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
            onClick={() => { updateData('goal', option.value); nextStep(); }}
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
            <input type="date" min={todayStr} disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
              onChange={(e) => updateData('raceDate', e.target.value)}
              value={data.raceDate || ''}
            />
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
          <input type="text" placeholder="ex: 3h45 ou 55min" disabled={isGenerating} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent/50 outline-none"
            onChange={(e) => updateData('targetTime', e.target.value)}
            value={data.targetTime || ''}
          />
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
              <input type="number" disabled={isGenerating} value={data.trailDetails?.distance} onChange={e => updateTrail('distance', parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">Dénivelé (D+)</label>
              <input type="number" disabled={isGenerating} value={data.trailDetails?.elevation} onChange={e => updateTrail('elevation', parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border-orange-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-orange-200">
            <div>
              <label className="block text-xs font-bold text-orange-700 mb-1">Volume actuel (km/sem)</label>
              <input type="number" disabled={isGenerating} placeholder="Ex: 50" value={data.currentWeeklyVolume || ''}
                onChange={e => updateData('currentWeeklyVolume', parseInt(e.target.value))}
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
          <div className="flex items-center gap-2 text-emerald-800 font-bold"><Activity size={18} /> Objectifs spécifiques</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">Sous-objectif de course (optionnel)</label>
              <select
                disabled={isGenerating}
                value={data.weightLossSubGoal || 'none'}
                onChange={e => updateData('weightLossSubGoal', e.target.value)}
                className="w-full p-3 rounded-lg border border-emerald-200 bg-white text-slate-700"
              >
                <option value="none">Juste perdre du poids progressivement</option>
                <option value="20min">Courir 20 min sans s'arrêter</option>
                <option value="30min">Courir 30 min sans s'arrêter</option>
                <option value="5km">Courir 5 km</option>
                <option value="10km">Courir 10 km</option>
              </select>
            </div>
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

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStep} disabled={isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Continuer</button>
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
          <input
            type="text" placeholder="5km (ex: 25:30)"
            className="p-3 border rounded-xl outline-none focus:border-accent"
            value={data.recentRaceTimes?.distance5km || ''}
            onChange={e => updateRaceTime('distance5km', e.target.value)}
          />
          <input
            type="text" placeholder="10km (ex: 52:15)"
            className="p-3 border rounded-xl outline-none focus:border-accent"
            value={data.recentRaceTimes?.distance10km || ''}
            onChange={e => updateRaceTime('distance10km', e.target.value)}
          />
          <input
            type="text" placeholder="Semi (ex: 1h45)"
            className="p-3 border rounded-xl outline-none focus:border-accent"
            value={data.recentRaceTimes?.distanceHalfMarathon || ''}
            onChange={e => updateRaceTime('distanceHalfMarathon', e.target.value)}
          />
          <input
            type="text" placeholder="Marathon (ex: 4h00)"
            className="p-3 border rounded-xl outline-none focus:border-accent"
            value={data.recentRaceTimes?.distanceMarathon || ''}
            onChange={e => updateRaceTime('distanceMarathon', e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 italic">Laissez vide si vous ne connaissez pas vos temps.</p>

        {/* Volume hebdomadaire pour Course/Trail */}
        {(data.goal === UserGoal.ROAD_RACE || data.goal === UserGoal.TRAIL) && (
          <div className="mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">Volume hebdomadaire actuel (optionnel)</label>
            <input
              type="number"
              placeholder="Ex: 40 km/semaine"
              disabled={isGenerating}
              value={data.currentWeeklyVolume || ''}
              onChange={e => updateData('currentWeeklyVolume', parseInt(e.target.value))}
              className="w-full p-3 border rounded-xl outline-none focus:border-accent"
            />
            <p className="text-xs text-slate-400 mt-1 italic">Aide à calibrer la progression du plan</p>
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

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStep} disabled={isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Continuer</button>
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
        base = { min: 2, max: 3, recommended: 2 };
        reason = "2 séances/semaine suffisent pour débuter en toute sécurité et perdre du poids progressivement.";
        warning = "En tant que débutant, la régularité compte plus que le volume. Votre corps a besoin de s'adapter !";
      } else if (goal === UserGoal.FITNESS) {
        base = { min: 2, max: 3, recommended: 2 };
        reason = "2 séances/semaine pour reprendre en douceur. Votre corps doit d'abord s'habituer à l'effort.";
        warning = "Commencez doucement pour éviter les blessures et installer une routine durable.";
      } else if (goal === UserGoal.ROAD_RACE) {
        if (subGoal === '5 km') {
          base = { min: 2, max: 3, recommended: 3 };
          reason = "3 séances/semaine sont idéales pour préparer un 5km en tant que débutant.";
        } else if (subGoal === '10 km') {
          base = { min: 2, max: 4, recommended: 3 };
          reason = "3 séances/semaine pour progresser vers le 10km sans risque de surmenage.";
          warning = "Le 10km demande une préparation progressive. Respectez les jours de repos !";
        } else if (subGoal === 'Semi-marathon') {
          base = { min: 3, max: 4, recommended: 3 };
          reason = "3 séances/semaine minimum pour un semi-marathon, avec une sortie longue le week-end.";
          warning = "Un semi-marathon est un objectif ambitieux pour un débutant. Prévoyez suffisamment de temps !";
        } else if (subGoal === 'Marathon') {
          base = { min: 3, max: 4, recommended: 4 };
          reason = "4 séances/semaine minimum pour un marathon, mais restez prudent sur les intensités.";
          warning = "Un marathon débutant demande au moins 16 semaines de préparation. Écoutez votre corps !";
        }
      } else if (goal === UserGoal.TRAIL) {
        const trailDist = data.trailDetails?.distance || 20;
        if (trailDist <= 30) {
          base = { min: 2, max: 4, recommended: 3 };
          reason = "3 séances/semaine dont une avec du dénivelé pour s'habituer au trail.";
        } else {
          base = { min: 3, max: 4, recommended: 3 };
          reason = "3 séances/semaine pour débuter, mais le trail long demande de l'expérience préalable.";
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
        base = { min: 4, max: 5, recommended: 4 };
        reason = "4-5 séances/semaine avec du travail spécifique trail.";
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
          <input type="number" disabled={isGenerating} placeholder="Âge" value={data.age || ''} onChange={e => updateData('age', parseInt(e.target.value))}
            className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-accent outline-none disabled:bg-slate-50" />
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
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-accent outline-none disabled:bg-slate-100"
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
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-accent outline-none disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Affichage IMC uniquement pour objectif Perte de poids */}
        {bmi > 0 && data.goal === UserGoal.LOSE_WEIGHT && (
          <div className={`p-4 rounded-xl ${bmiCategory.color} animate-fade-in`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">Votre IMC</span>
              <span className="text-2xl font-black">{bmi.toFixed(1)}</span>
            </div>
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

      <div className="flex justify-between pt-4">
        <button onClick={prevStep} disabled={isGenerating} className="flex items-center text-slate-500 font-bold disabled:opacity-50"><ChevronLeft size={20} /> Retour</button>
        <button onClick={nextStep} disabled={!data.level || isGenerating} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50">Suivant</button>
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
              <Calendar size={18} className="text-accent" /> Date de début du plan
            </label>
            <input type="date" value={data.startDate} min={todayStr} disabled={isGenerating}
              onChange={(e) => updateData('startDate', e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent bg-white disabled:bg-slate-100"
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
