
import React from 'react';
import { TrainingPlan } from '../types';
import { Trophy, Calendar, MapPin, Target, Quote, TrendingUp, AlertTriangle, CheckCircle, Navigation, Activity, Zap } from 'lucide-react';

interface PlanHeroProps {
    plan: TrainingPlan;
}

const PlanHero: React.FC<PlanHeroProps> = ({ plan }) => {
    // Calcul de la jauge de confiance (0-5)
    // On utilise confidenceScore (0-100) si présent, sinon on mappe le status
    const getScore = () => {
        if (plan.confidenceScore) return Math.round(plan.confidenceScore / 20); // 100 -> 5
        switch (plan.feasibility?.status) {
            case 'EXCELLENT': return 5;
            case 'BON': return 4;
            case 'AMBITIEUX': return 3;
            case 'RISQUÉ': return 2;
            default: return 1;
        }
    };

    const score = getScore();
    const bars = [1, 2, 3, 4, 5];

    // Messages contextuels basés sur le score
    const getConfidenceText = (s: number) => {
        if (s >= 5) return "Objectif très réaliste, c'est dans la poche !";
        if (s === 4) return "Objectif ambitieux mais atteignable avec sérieux.";
        if (s === 3) return "Gros challenge en vue, il va falloir être rigoureux !";
        if (s === 2) return "Objectif difficile, soyez prudent sur la progression.";
        return "Objectif très élevé, écoutez votre corps avant tout.";
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden mb-10 border border-slate-100 relative">
            {/* BACKGROUND DECORATION */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-accent/10 to-transparent rounded-full blur-3xl -mr-32 -mt-64 pointer-events-none" />

            <div className="p-6 md:p-10 relative z-10">

                {/* HEADLINE SECTION */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-slate-200">
                                {plan.goal}
                            </span>
                            {plan.targetTime && (
                                <span className="bg-accent text-white text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-orange-200 flex items-center gap-2">
                                    <Target size={14} /> {plan.targetTime}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-4">
                            {plan.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-slate-500 font-medium text-sm md:text-base">
                            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><Calendar size={18} className="text-accent" /> Début : {new Date(plan.startDate).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><TrendingUp size={18} className="text-emerald-500" /> {plan.durationWeeks} semaines</span>
                            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><Activity size={18} className="text-blue-500" /> {plan.sessionsPerWeek}x / semaine</span>
                        </div>
                    </div>

                    {/* CONFIDENCE CARD */}
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 w-full lg:w-80 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Trophy size={16} className="text-amber-500" /> Indice Confiance
                            </h3>
                            <span className="font-black text-2xl text-slate-900">{score}/5</span>
                        </div>

                        {/* GAUGE */}
                        <div className="flex gap-1 h-3 mb-3">
                            {bars.map((bar) => (
                                <div
                                    key={bar}
                                    className={`flex-1 rounded-full transition-all duration-1000 ${bar <= score
                                            ? score >= 4 ? 'bg-emerald-500' : score === 3 ? 'bg-amber-500' : 'bg-red-500'
                                            : 'bg-slate-200'
                                        }`}
                                />
                            ))}
                        </div>

                        <p className="text-xs text-slate-500 leading-snug font-medium">
                            {getConfidenceText(score)}
                        </p>
                    </div>
                </div>

                {/* CONTENT GRID */}
                <div className="grid md:grid-cols-12 gap-6">

                    {/* COL 1: WELCOME MESSAGE (Spans 7 cols) */}
                    <div className="md:col-span-7 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 md:p-8 border border-indigo-100 relative overflow-hidden group hover:shadow-lg transition-all">
                        <Quote size={80} className="absolute top-0 right-0 text-indigo-200/40 -mr-4 -mt-4 transform group-hover:scale-110 transition-transform duration-700" />

                        <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-4 relative z-10">
                            <span className="bg-indigo-200/50 p-1.5 rounded-lg"><Quote size={18} className="text-indigo-700" /></span>
                            Le mot du coach
                        </h3>

                        <div className="relative z-10 text-indigo-900/80 leading-relaxed font-medium md:text-lg">
                            {plan.welcomeMessage ? (
                                <p className="whitespace-pre-line">{plan.welcomeMessage}</p>
                            ) : (
                                <p>
                                    {plan.feasibility?.message || "Bienvenue dans votre plan !"}
                                    <br /><br />
                                    <span className="font-bold text-indigo-600">Note de sécurité :</span> {plan.feasibility?.safetyWarning || "Soyez à l'écoute de vos sensations."}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* COL 2: LOCATIONS (Spans 5 cols) */}
                    <div className="md:col-span-5 flex flex-col gap-4">
                        {/* Card Location */}
                        <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 h-full flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-10 -mt-10" />

                            <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-4 relative z-10">
                                <span className="bg-emerald-200/50 p-1.5 rounded-lg"><Navigation size={18} className="text-emerald-700" /></span>
                                Où courir à {plan.location || "proximité"} ?
                            </h3>

                            {plan.suggestedLocations && plan.suggestedLocations.length > 0 ? (
                                <div className="space-y-3 relative z-10 flex-1">
                                    {plan.suggestedLocations.slice(0, 3).map((loc, i) => (
                                        <div key={i} className="bg-white/80 p-3 rounded-xl border border-emerald-100 shadow-sm flex items-start gap-3">
                                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mt-0.5">
                                                <MapPin size={16} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-800 block text-sm">{loc.name}</span>
                                                <span className="text-xs text-emerald-700/80 font-medium">{loc.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-emerald-700/50 text-sm italic">
                                    Aucun lieu spécifique suggéré pour le moment.
                                </div>
                            )}
                        </div>
                    </div>


                {/* SECTION ALLURES */}
                <div className="mt-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10" />
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="font-bold text-orange-900 flex items-center gap-2">
                            <span className="bg-orange-200/50 p-1.5 rounded-lg"><Zap size={18} className="text-orange-700" /></span>
                            Mes allures d'entraînement
                        </h3>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Estimations initiales</span>
                    </div>
                    
                    <p className="text-xs text-orange-700/70 mb-4 relative z-10">
                        Ces allures sont calculées selon ton profil. Elles s'affineront au fil de tes entraînements.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                        <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">Endurance Fondamentale</p>
                            <p className="font-bold text-slate-800">{plan.paces?.efPace || "-"}</p>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">Allure Seuil</p>
                            <p className="font-bold text-slate-800">{plan.paces?.seuilPace || "-"}</p>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">VMA</p>
                            <p className="font-bold text-slate-800">{plan.paces?.vmaPace || "-"}</p>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-orange-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">VMA (km/h)</p>
                            <p className="font-bold text-slate-800">{plan.vma ? plan.vma.toFixed(1) + " km/h" : "-"}</p>
                        </div>
                    </div>
                    
                    {plan.vmaSource && (
                        <p className="text-xs text-orange-600 mt-3 relative z-10">📊 Source : {plan.vmaSource}</p>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default PlanHero;
