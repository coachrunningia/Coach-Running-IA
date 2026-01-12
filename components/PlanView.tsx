
import React, { useState, useEffect } from 'react';
import { TrainingPlan, Session, LocationSuggestion, User } from '../types';
import { Calendar, Clock, Lock, CheckCircle, Zap, MapPin, Activity, MessageSquare, RefreshCw, X, AlertTriangle, ShieldCheck, Download, Star, Compass, Navigation, TrendingUp, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateSessionFeedback } from '../services/storageService';
import { downloadICS } from '../services/exportService';
import StravaConnect from './StravaConnect';
import WeeklyAnalysis from './WeeklyAnalysis';

interface PlanViewProps {
  plan: TrainingPlan;
  isLocked?: boolean; // Indique si l'utilisateur est restreint (non premium) pour la visualisation globale
  onUnlock?: () => void;
  onAdaptPlan?: (feedback: string) => void;
  onRegenerateFull?: () => void; // Nouvelle prop pour déclencher la régénération complète
  user?: User | null; // Needed for Strava check
}

const PlanView: React.FC<PlanViewProps> = ({ plan, isLocked = false, onUnlock, onAdaptPlan, onRegenerateFull, user }) => {
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  
  // Feedback Form State
  const [feedbackRpe, setFeedbackRpe] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  
  useEffect(() => {
    // Vérifie dans les données user si stravaConnected existe
    if (user?.stravaConnected) {
      setStravaConnected(true);
    }
  }, [user]);

  const handleUnlockClick = () => {
    navigate('/pricing');
  };

  const handleExport = () => {
    if (isLocked) {
      handleUnlockClick();
      return;
    }
    if (window.confirm("Voulez-vous télécharger le fichier calendrier (.ics) pour l'ajouter à votre agenda ?")) {
      downloadICS(plan);
    }
  };

  const handleOpenFeedback = (session: Session) => {
    setSelectedSession(session);
    setFeedbackRpe(session.feedback?.rpe || 5);
    setFeedbackNotes(session.feedback?.notes || "");
  };

  const handleFeedbackClick = (session: Session) => {
     // Si le plan est en mode "Aperçu Gratuit", la fonctionnalité Feedback est bloquée (Payante)
     // On utilise isLocked comme proxy du statut utilisateur (Non Premium)
     if (isLocked) {
         handleUnlockClick();
     } else {
         handleOpenFeedback(session);
     }
  };

  const handleValidateFeedback = async (needsAdaptation: boolean) => {
    if (selectedSession) {
      setIsSaving(true);
      try {
        const updatedSession = { 
            ...selectedSession, 
            feedback: { 
                rpe: feedbackRpe, 
                notes: feedbackNotes, 
                completed: true,
                adaptationRequested: needsAdaptation
            } 
        };
        
        // 1. Sauvegarde du feedback en base
        await updateSessionFeedback(plan.id, updatedSession, plan.userId);
        
        // 2. Si adaptation demandée, on déclenche l'IA
        if (needsAdaptation && onAdaptPlan) {
           const adaptationContext = `
             CONTEXTE: L'utilisateur a trouvé la séance "${selectedSession.title}" trop difficile ou inadaptée.
             RPE (Ressenti): ${feedbackRpe}/10.
             COMMENTAIRE: "${feedbackNotes}".
             ACTION REQUISE: Allège légèrement l'intensité des prochaines séances ou adapte le volume, tout en gardant l'objectif final.
           `;
           onAdaptPlan(adaptationContext);
        }

        setSelectedSession(null);
      } catch (error) {
        console.error("Failed to save feedback", error);
        alert("Erreur lors de l'enregistrement du feedback.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getIntensityColor = (intensity?: string) => {
    switch(intensity) {
      case 'Facile': return 'text-green-600 bg-green-50 border-green-200';
      case 'Modéré': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Difficile': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getFeasibilityStyle = (status: string) => {
    switch(status) {
      case 'EXCELLENT': return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: <ShieldCheck /> };
      case 'BON': return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: <CheckCircle /> };
      case 'AMBITIEUX': return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: <Activity /> };
      case 'RISQUÉ': return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: <AlertTriangle /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', icon: <Activity /> };
    }
  };

  const fStyle = plan.feasibility ? getFeasibilityStyle(plan.feasibility.status) : getFeasibilityStyle('BON');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 relative pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{plan.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
             <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
               <Activity size={16} className="text-accent" /> {plan.goal}
             </span>
             {plan.location && (
               <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                 <MapPin size={16} className="text-green-500" /> {plan.location}
               </span>
             )}
             {plan.targetTime && (
               <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                 <Clock size={16} className="text-blue-500" /> Objectif: {plan.targetTime}
               </span>
             )}
          </div>
        </div>
        
        <button 
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${
             isLocked 
             ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200' 
             : 'bg-white text-slate-700 border border-slate-300 hover:border-accent hover:text-accent'
          }`}
          title={isLocked ? "Réservé aux membres Premium" : "Exporter vers Google Calendar / iCal"}
        >
          {isLocked ? <Lock size={16} /> : <Calendar size={16} />}
          Exporter l'agenda
        </button>
      </div>

      {/* Grid pour les infos importantes : Faisabilité et Lieux */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Feasibility & Safety Box */}
        {plan.feasibility && (
          <div className={`p-6 rounded-xl border h-full ${fStyle.border} ${fStyle.bg}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full bg-white/50 ${fStyle.text}`}>{fStyle.icon}</div>
              <div>
                <h3 className={`font-bold text-lg mb-1 ${fStyle.text}`}>Analyse de faisabilité : {plan.feasibility.status}</h3>
                <p className={`text-sm mb-3 ${fStyle.text}`}>{plan.feasibility.message}</p>
                
                <div className="flex items-start gap-2 bg-white/60 p-3 rounded-lg">
                  <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-700">
                    <span className="underline mb-1 block">Point Vigilance Santé :</span>
                    {plan.feasibility.safetyWarning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOCATION SUGGESTIONS BOX */}
        {plan.suggestedLocations && plan.suggestedLocations.length > 0 && plan.location && (
          <div className="p-6 rounded-xl border border-indigo-100 bg-indigo-50/50 h-full">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Navigation size={20} />
               </div>
               <h3 className="font-bold text-lg text-slate-900">
                  Où courir à <span className="text-indigo-600">{plan.location}</span> ?
               </h3>
            </div>
            
            <div className="space-y-3">
              {plan.suggestedLocations.map((loc, idx) => (
                <div key={idx} className="flex gap-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                   <div className="mt-1">
                      {loc.type === 'TRACK' && <Activity size={16} className="text-red-500" />}
                      {loc.type === 'PARK' && <Compass size={16} className="text-green-500" />}
                      {loc.type === 'HILL' && <TrendingUp size={16} className="text-orange-500" />}
                      {loc.type === 'NATURE' && <MapPin size={16} className="text-emerald-500" />}
                   </div>
                   <div>
                      <p className="font-bold text-sm text-slate-800">{loc.name}</p>
                      <p className="text-xs text-slate-500 leading-tight">{loc.description}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION STRAVA (PREMIUM & PREVIEW) - HEADER */}
      {user && (
        <div className={`mb-8 p-6 bg-white rounded-xl border shadow-sm ${user.isPremium ? 'border-orange-200' : 'border-slate-200'}`}>
           <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                   <h2 className="text-xl font-bold text-slate-900">Suivi Strava</h2>
                   {!user.isPremium && <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Premium</span>}
               </div>
               <StravaConnect 
                  isConnected={stravaConnected}
                  onConnect={() => setStravaConnected(true)}
                  isPremium={user.isPremium}
               />
           </div>
           
           {stravaConnected && user.isPremium ? (
              <WeeklyAnalysis />
           ) : (
              <p className="text-slate-500 text-sm">
                 {user.isPremium 
                    ? "Connectez votre compte Strava pour comparer vos réalisations avec le plan."
                    : "Connectez Strava pour que l'IA analyse vos sorties réelles et adapte le plan chaque semaine."}
              </p>
           )}
        </div>
      )}

      <div className="space-y-12">
        {plan.weeks.map((week, index) => {
          const isWeekLocked = isLocked && index > 0;
          
          return (
            <div key={week.weekNumber} className={`relative ${isWeekLocked ? 'select-none' : ''}`}>
              {/* Week Header */}
              <div className="bg-white p-6 rounded-t-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 relative overflow-hidden">
                 {/* Badge Free / Premium */}
                 {index === 0 && isLocked && (
                   <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wide">
                     Aperçu Gratuit
                   </div>
                 )}
                 {isWeekLocked && (
                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] z-10 flex items-center justify-end pr-6">
                        <Lock className="text-slate-400" size={24} />
                    </div>
                 )}

                 <div>
                   <h3 className="text-lg text-slate-500 font-medium">Semaine {week.weekNumber}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-slate-800">🎯 {week.theme}</span>
                   </div>
                 </div>
              </div>

              {/* Sessions Grid */}
              <div className={`space-y-4 ${isWeekLocked ? 'blur-sm opacity-40 pointer-events-none' : ''}`}>
                {week.sessions.map((session, sIdx) => (
                  <div key={sIdx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="grid md:grid-cols-12 gap-6">
                      
                      {/* Left: Meta Info */}
                      <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                        <div className="flex items-center gap-2 mb-2">
                           <Calendar className="text-slate-400" size={16} />
                           <span className="font-bold text-slate-900">{session.day}</span>
                        </div>
                        <h4 className="font-bold text-lg text-slate-800 mb-3 leading-tight">{session.title}</h4>
                        <div className="flex flex-wrap gap-2">
                           <span className={`text-xs px-2 py-1 rounded-md border font-semibold ${getIntensityColor(session.intensity)}`}>
                             ⚡ {session.intensity || 'Modéré'}
                           </span>
                        </div>
                        {session.feedback?.completed && (
                           <div className="mt-3 text-xs text-green-600 flex items-center gap-1 font-semibold">
                             <CheckCircle size={12} /> Séance réalisée (RPE: {session.feedback.rpe}/10)
                             {session.feedback.adaptationRequested && <span className="bg-orange-100 text-orange-600 px-1 rounded ml-1">Adaptée</span>}
                           </div>
                        )}
                      </div>

                      {/* Middle: Core Stats */}
                      <div className="md:col-span-3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                         <div className="mb-4">
                           <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Durée</p>
                           <p className="text-xl font-bold text-slate-700">{session.duration}</p>
                         </div>
                         <div>
                           <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Activity size={12}/> Type</p>
                           <p className="text-md font-medium text-slate-700">{session.type}</p>
                         </div>
                      </div>

                      {/* Right: Description */}
                      <div className="md:col-span-6 relative">
                         <div className="mb-4">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">📜 Description</p>
                            <div className="text-sm text-slate-600 space-y-2">
                               <p><span className="font-semibold text-green-600">Échauffement:</span> {session.warmup}</p>
                               <p><span className="font-semibold text-blue-600">Séance:</span> {session.mainSet}</p>
                               <p><span className="font-semibold text-purple-600">Retour au calme:</span> {session.cooldown}</p>
                            </div>
                         </div>
                         <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800 italic mb-2">
                            💡 Conseil: {session.advice}
                         </div>

                         {/* BOUTON FEEDBACK - VISIBLE POUR TOUS MAIS PAYANT SI GRATUIT */}
                         <button 
                             onClick={() => handleFeedbackClick(session)}
                             className={`mt-2 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-all border ${
                                isLocked 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-accent hover:border-accent'
                             }`}
                           >
                             {isLocked ? <Lock size={12} /> : <MessageSquare size={14} />} 
                             {session.feedback?.completed 
                               ? 'Modifier le feedback' 
                               : (isLocked ? 'Feedback & Adaptation (Premium)' : 'Noter la séance')
                             }
                         </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* --- BOUTON D'ANALYSE STRAVA À LA FIN DE CHAQUE SEMAINE (Visible même si pas connecté/gratuit pour inciter) --- */}
                {!isWeekLocked && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-orange-100 p-2 rounded-full">
                                <TrendingUp size={20} className="text-orange-600" />
                            </div>
                            <h4 className="font-bold text-slate-900">Analyse de la Semaine {week.weekNumber}</h4>
                        </div>

                        {/* Si User Premium ET Connecté : Vrai Analyse */}
                        {user?.isPremium && stravaConnected ? (
                            <WeeklyAnalysis compact={true} />
                        ) : (
                            /* Sinon : Bouton Incitatif (Fake Analysis Button) */
                            <button 
                                onClick={() => {
                                    if (!user?.isPremium) {
                                        navigate('/pricing');
                                    } else {
                                        // Connecter Strava
                                        const handleConnect = async () => {
                                            try {
                                                const response = await fetch('/api/strava/auth');
                                                const data = await response.json();
                                                window.location.href = `${data.url}&state=${user?.id}`;
                                            } catch(e) { alert("Erreur connexion Strava"); }
                                        };
                                        handleConnect();
                                    }
                                }}
                                className="w-full py-4 bg-white border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50 text-slate-500 hover:text-orange-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 group"
                            >
                                <Activity size={20} className="text-slate-400 group-hover:text-orange-600" />
                                <span>Analyser ma semaine avec Strava</span>
                                {!user?.isPremium && <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full uppercase">Premium</span>}
                            </button>
                        )}
                        {(!stravaConnected || !user?.isPremium) && (
                            <p className="text-center text-xs text-slate-400 mt-2 italic">
                                L'IA compare vos sorties réelles avec le plan et adapte la suite.
                            </p>
                        )}
                    </div>
                )}
              </div>

              {/* OVERLAY SEMAINE VERROUILLÉE (GRATUIT) */}
              {isWeekLocked && index === 1 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center top-20">
                   <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-center border border-white max-w-lg mx-4 ring-1 ring-slate-900/5">
                      <div className="w-16 h-16 bg-gradient-to-br from-accent to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Star className="text-white" size={32} fill="currentColor" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Débloquez votre plan complet</h3>
                      <p className="text-slate-600 mb-8">
                        La version gratuite vous donne accès à la première semaine. 
                        Passez Premium pour visualiser l'intégralité du plan, exporter vers votre agenda et adapter les séances.
                      </p>
                      
                      <button 
                        onClick={handleUnlockClick}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all w-full flex items-center justify-center gap-2"
                      >
                         <Zap size={20} fill="currentColor" /> Voir les offres Premium
                      </button>
                      <p className="mt-4 text-xs text-slate-400">À partir de 5,90€ / mois • Sans engagement</p>
                   </div>
                </div>
              )}

              {/* OVERLAY "REGENERATION" (PREMIUM MAIS PLAN PARTIEL) */}
              {!isLocked && plan.isFreePreview && index === 1 && onRegenerateFull && (
                <div className="absolute inset-0 z-10 flex items-center justify-center top-20">
                   <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-center border-2 border-green-500 max-w-lg mx-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <RefreshCw className="text-green-600" size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Compte Premium Activé !</h3>
                      <p className="text-slate-600 mb-8">
                        Vous avez débloqué l'accès complet. Cliquez ci-dessous pour générer le détail de toutes les semaines restantes.
                      </p>
                      
                      <button 
                        onClick={onRegenerateFull}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all w-full flex items-center justify-center gap-2"
                      >
                         <RefreshCw size={20} /> Dévoiler les semaines suivantes
                      </button>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FEEDBACK & ADAPTATION MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-900">Bilan de séance</h3>
               <button onClick={() => setSelectedSession(null)} className="p-1 rounded-full hover:bg-slate-100"><X className="text-slate-400" /></button>
             </div>
             
             <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-1">{selectedSession.title}</h4>
                <p className="text-sm text-slate-500">{selectedSession.duration} • {selectedSession.type}</p>
             </div>
             
             {/* RPE Section */}
             <div className="mb-6">
                <label className="block text-sm font-bold text-slate-900 mb-2">Difficulté ressentie (RPE)</label>
                <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                   <span className="text-green-600">Facile (1)</span>
                   <span className="text-orange-500">Modéré (5)</span>
                   <span className="text-red-600">Extrême (10)</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={feedbackRpe} onChange={(e) => setFeedbackRpe(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="text-center font-black text-3xl text-slate-800 mt-4">{feedbackRpe}<span className="text-lg text-slate-400 font-normal">/10</span></div>
             </div>

             {/* Notes / Constraints Section */}
             <div className="mb-8">
                <label className="block text-sm font-bold text-slate-900 mb-2">Sensations & Notes</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-xl p-3 h-24 focus:ring-2 focus:ring-accent/50 outline-none text-sm resize-none"
                  placeholder="Ex: Bonnes jambes, mais un peu essoufflé sur la fin..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                />
             </div>

             {/* DECISION BUTTONS */}
             {!isLocked && onAdaptPlan ? (
               <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-900 mb-2">Faut-il modifier la suite du plan ?</p>
                  
                  {/* OPTION 1: NO CHANGE */}
                  <button 
                    onClick={() => handleValidateFeedback(false)} 
                    disabled={isSaving}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full text-green-600 shadow-sm"><CheckCircle size={20} /></div>
                        <div className="text-left">
                            <div className="text-sm">Non, c'était gérable</div>
                            <div className="text-xs text-slate-500 font-normal">Juste valider la séance</div>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-600" />
                  </button>

                  {/* OPTION 2: ADAPT */}
                  <button 
                    onClick={() => handleValidateFeedback(true)} 
                    disabled={isSaving}
                    className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-100 text-orange-800 p-4 rounded-xl font-bold flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full text-orange-500 shadow-sm"><RefreshCw size={20} /></div>
                        <div className="text-left">
                            <div className="text-sm">Oui, c'était trop dur / inadapté</div>
                            <div className="text-xs text-orange-600/80 font-normal">Recalculer la suite du plan</div>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-orange-400 group-hover:text-orange-600" />
                  </button>
               </div>
             ) : (
                <button 
                  onClick={() => handleValidateFeedback(false)} 
                  disabled={isSaving}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 shadow-lg"
                >
                  {isSaving ? 'Enregistrement...' : 'Valider la séance'}
                </button>
             )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PlanView;
