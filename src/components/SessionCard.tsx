
import React, { useState } from 'react';
import { downloadSessionTCX } from '../services/exportService';
import { Session } from '../types';
import { useSettings } from '../context/SettingsContext';
import {
    Clock, MapPin, ChevronDown, Activity, Dumbbell, Watch, HelpCircle,
    Flame, CheckCircle, MessageSquare, Zap, Target, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SessionCardProps {
    session: Session;
    weekNumber: number;
    isLocked?: boolean;
    onFeedbackClick?: (session: Session, weekNumber: number) => void;
    onQuickComplete?: (session: Session, completed: boolean, weekNumber: number) => void;
    sessionDate?: Date;
    isToday?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, weekNumber, isLocked, onFeedbackClick, onQuickComplete, sessionDate, isToday }) => {
    const [expanded, setExpanded] = useState(false);
    const [showExportHelp, setShowExportHelp] = useState(false);
    const { paceUnit } = useSettings();

    const isCompleted = session.feedback?.completed ?? false;

    // Formater la date de la séance
    const formatSessionDate = (date?: Date) => {
        if (!date) return '';
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };


    // Convertir les allures dans le texte selon le toggle
    const convertPacesInText = (text: string): string => {
        if (!text || paceUnit === "min/km") return text;
        return text.replace(/(\d+):(\d+)(\s*(\/km|min\/km)?)/g, (match, min, sec) => {
            const totalMin = parseInt(min) + parseInt(sec) / 60;
            if (totalMin > 0) return (60 / totalMin).toFixed(1) + " km/h";
            return match;
        });
    };
    const formatText = (text: string) => {
        if (!text) return null;
        return text.split("\n").map((line, i) => (
            <span key={i} className="block mb-1 last:mb-0">
                {convertPacesInText(line)}
            </span>
        ));
    };

    const getPaceDisplay = () => {
        const raw = session.targetPace;
        if (!raw) return null; // No pace target

        // Check if it's already a complex string or strict format
        // We try to extract mm:ss
        const minKmMatch = raw.match(/(\d+):(\d+)/);
        // We try to extract km/h float
        const kmhMatch = raw.match(/(\d+(\.\d+)?)\s*km\/h/i);

        let minKm = '';
        let kmh = '';

        if (minKmMatch) {
            minKm = `${minKmMatch[1]}:${minKmMatch[2]}`;
            // Convert to km/h
            const min = parseInt(minKmMatch[1]);
            const sec = parseInt(minKmMatch[2]);
            const totalMin = min + sec / 60;
            if (totalMin > 0) kmh = (60 / totalMin).toFixed(1);
        } else if (kmhMatch) {
            kmh = kmhMatch[1];
            // Convert to min/km
            const speed = parseFloat(kmh);
            if (speed > 0) {
                const pace = 60 / speed;
                const pMin = Math.floor(pace);
                const pSec = Math.round((pace - pMin) * 60);
                minKm = `${pMin}:${pSec.toString().padStart(2, '0')}`;
            }
        } else {
            // Fallback for text like "EF" or ranges
            return { main: raw, sub: '' };
        }

        return { minKm, kmh };
    };

    const paceData = getPaceDisplay();

    const getIntensityStyle = (intensity?: string) => {
        switch (intensity) {
            case 'Facile': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <Activity size={14} /> };
            case 'Modéré': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: <Flame size={14} /> };
            case 'Difficile': return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <Zap size={14} /> };
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: <Activity size={14} /> };
        }
    };

    const intensityStyle = getIntensityStyle(session.intensity);

    const getSessionIcon = () => {
        if (session.type === 'Fractionné') return <Zap size={24} className="text-orange-500" />
        if (session.type === 'Sortie Longue') return <MapPin size={24} className="text-blue-500" />
        if (session.type === 'Renforcement') return <Dumbbell size={24} className="text-purple-500" />
        return <Activity size={24} className="text-emerald-500" />
    };

    // Variable non utilisée directement mais passée pour compatibilité
    void isLocked;

    // Handler pour le marquage rapide
    const handleQuickToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onQuickComplete) {
            onQuickComplete(session, !isCompleted, weekNumber);
        }
    };

    return (
        <div className={cn(
            "bg-white rounded-2xl border transition-all duration-300 overflow-hidden group mb-4 relative",
            expanded ? "shadow-xl border-primary/30 ring-1 ring-primary/10" : "shadow-sm border-slate-200 hover:shadow-md hover:border-primary/30",
            isToday && !isCompleted && "ring-2 ring-accent/30 border-accent",
            isCompleted && "bg-emerald-50/30 border-emerald-200"
        )}>
            {/* --- HEADER --- */}
            <div
                className="p-5 cursor-pointer grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center"
                onClick={() => setExpanded(!expanded)}
            >
                {/* 1. Icon & Quick Complete Toggle */}
                <div className="flex items-center gap-4">
                    {/* Quick Complete Button */}
                    <button
                        onClick={handleQuickToggle}
                        className={cn(
                            "relative p-3 rounded-xl border transition-all duration-200 flex-shrink-0 group/btn",
                            isCompleted
                                ? "bg-emerald-100 border-emerald-300 text-emerald-600 hover:bg-red-50 hover:border-red-300"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                        )}
                        title={isCompleted ? "Cliquer pour annuler" : "Marquer comme fait"}
                    >
                        {isCompleted ? (
                            <>
                                <CheckCircle size={24} className="text-emerald-600 group-hover/btn:hidden" />
                                <X size={24} className="text-red-500 hidden group-hover/btn:block" />
                            </>
                        ) : (
                            <>
                                <span className="group-hover/btn:hidden">{getSessionIcon()}</span>
                                <CheckCircle size={24} className="text-emerald-500 hidden group-hover/btn:block" />
                            </>
                        )}
                    </button>
                    <div className="md:hidden flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{session.day}</span>
                            {sessionDate && (
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isToday ? "bg-accent text-white" : "bg-slate-100 text-slate-500")}>
                                    {isToday ? "Aujourd'hui" : formatSessionDate(sessionDate)}
                                </span>
                            )}
                        </div>
                        <h3 className={cn("font-bold leading-tight", isCompleted ? "text-emerald-700" : "text-slate-800")}>
                            {session.title}
                            {isCompleted && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Fait ✓</span>}
                        </h3>
                    </div>
                </div>

                {/* 2. Main Info (Hidden on mobile, visible desktop) */}
                <div className="hidden md:block">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{session.day}</span>
                        {sessionDate && (
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isToday ? "bg-accent text-white" : "bg-slate-100 text-slate-500")}>
                                {isToday ? "Aujourd'hui" : formatSessionDate(sessionDate)}
                            </span>
                        )}
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1", intensityStyle.bg, intensityStyle.text)}>
                            {intensityStyle.icon} {session.intensity}
                        </span>
                    </div>
                    <h3 className={cn("font-bold text-lg transition-colors", isCompleted ? "text-emerald-700" : "text-slate-900 group-hover:text-primary")}>
                        {session.title}
                        {isCompleted && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold align-middle">Fait ✓</span>}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Clock size={14} /> {session.duration}</span>
                        {session.distance && <span className="flex items-center gap-1">• <MapPin size={14} /> {session.distance}</span>}
                    </div>
                </div>

                {/* 3. Pace & Toggle (Mobile + Desktop) */}
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 md:pl-8 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">

                    {/* Mobile details showing up here */}
                    <div className="md:hidden flex flex-col gap-1">
                        <span className={cn("text-[10px] w-fit px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1", intensityStyle.bg, intensityStyle.text)}>
                            {intensityStyle.icon} {session.intensity}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} /> {session.duration}</span>
                    </div>

                    {paceData && (
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                                <Target size={12} /> Allure Cible
                            </div>
                            {typeof paceData.main === 'string' ? (
                                <div className="font-black text-lg text-slate-800">{paceData.main}</div>
                            ) : (
                                <div className="flex flex-col items-end leading-none">
                                    <div className={cn("text-lg font-black transition-all", paceUnit === 'min/km' ? 'text-slate-800' : 'text-slate-400 scale-90')}>
                                        {paceData.minKm} <span className="text-[10px] font-normal text-slate-400">min/km</span>
                                    </div>
                                    <div className={cn("text-lg font-black transition-all -mt-1", paceUnit === 'km/h' ? 'text-slate-800' : 'text-slate-400 scale-90')}>
                                        {paceData.kmh} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all ml-2",
                        expanded ? "bg-primary text-white rotate-180" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* --- EXPANDED CONTENT --- */}
            <div className={cn(
                "grid transition-all duration-300 ease-in-out bg-slate-50/50 border-t border-slate-100",
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    <div className="p-5 md:p-8 grid md:grid-cols-2 gap-8">

                        {/* LEFT: SESSION STRUCTURE */}
                        <div className="space-y-6">
                            <h4 className="font-black text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                                Structure de la séance
                            </h4>

                            <div className="relative space-y-6 pl-2">
                                {/* WARMUP */}
                                <div className="relative pl-6 border-l-2 border-emerald-300 pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                                    <h5 className="font-bold text-emerald-700 text-sm uppercase mb-1">🔥 Échauffement</h5>
                                    <div className="text-slate-700 text-sm leading-relaxed">{formatText(session.warmup)}</div>
                                </div>

                                {/* MAIN SET */}
                                <div className="relative pl-6 border-l-2 border-primary pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-sm" />
                                    <h5 className="font-bold text-primary text-sm uppercase mb-1">🏃 Séance Principale</h5>
                                    <div className="font-medium text-slate-900 text-base leading-relaxed bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        {formatText(session.mainSet)}
                                    </div>
                                </div>

                                {/* COOLDOWN */}
                                <div className="relative pl-6 border-l-2 border-blue-300">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                                    <h5 className="font-bold text-blue-700 text-sm uppercase mb-1">💨 Retour au calme</h5>
                                    <div className="text-slate-700 text-sm leading-relaxed">{formatText(session.cooldown)}</div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: ADVICE & ACTIONS */}
                        <div className="flex flex-col justify-between gap-6">
                            <div>
                                <h4 className="font-black text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
                                    Conseils du Coach
                                </h4>
                                <div className="bg-amber-50 border border-amber-100 p-5 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl text-amber-900 text-sm italic relative">
                                    <MessageSquare size={20} className="text-amber-400 absolute -top-3 -left-2 bg-white rounded-full p-0.5" />
                                    "{session.advice}"
                                </div>
                            </div>

                                {/* EXPORT MONTRE */}
                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadSessionTCX(session, weekNumber, "Plan");
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                                    >
                                        <Watch size={16} /> Exporter vers montre
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowExportHelp(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                        title="Comment importer sur ma montre ?"
                                    >
                                        <HelpCircle size={16} />
                                    </button>
                                </div>

                                {/* POPUP AIDE EXPORT */}
                                {showExportHelp && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExportHelp(false)}>
                                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-slate-900">📲 Importer sur ta montre</h3>
                                                <button onClick={() => setShowExportHelp(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">Télécharge le fichier</p>
                                                        <p className="text-sm text-slate-500">Clique sur "Exporter vers montre"</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">Ouvre ton app montre</p>
                                                        <p className="text-sm text-slate-500">Garmin Connect, Coros, Suunto...</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">Importe le fichier .tcx</p>
                                                        <p className="text-sm text-slate-500">Menu → Entraînement → Importer</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">✓</div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">Synchronise ta montre</p>
                                                        <p className="text-sm text-slate-500">La séance apparaît sur ta montre !</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowExportHelp(false)}
                                                className="w-full mt-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                                            >
                                                J'ai compris !
                                            </button>
                                        </div>
                                    </div>
                                )}

                            <div className="mt-auto space-y-3">
                                {session.feedback?.completed ? (
                                    <>
                                        {/* Statut séance terminée */}
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
                                            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><CheckCircle size={24} /></div>
                                            <div className="flex-1">
                                                <p className="font-bold text-emerald-800">Séance terminée !</p>
                                                <p className="text-xs text-emerald-600">RPE: {session.feedback.rpe}/10 • {session.feedback.notes || 'Aucune note'}</p>
                                            </div>
                                        </div>
                                        {/* Bouton pour annuler / marquer comme non faite */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onQuickComplete) onQuickComplete(session, false, weekNumber);
                                            }}
                                            className="w-full py-2.5 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 hover:border-amber-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <X size={16} /> En fait, je ne l'ai pas faite
                                        </button>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        <p className="text-center text-xs text-slate-400 mb-1">Séance terminée ?</p>
                                        {/* Bouton cocher rapidement */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onQuickComplete) onQuickComplete(session, true, weekNumber);
                                            }}
                                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                                        >
                                            <CheckCircle size={18} /> C'est fait !
                                        </button>
                                        {/* Bouton valider avec notation détaillée */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onFeedbackClick && onFeedbackClick(session, weekNumber); }}
                                            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <MessageSquare size={16} /> Valider + Noter la séance (RPE)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionCard;
