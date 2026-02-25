
import React from 'react';
import { QuestionnaireData, RunningLevel } from '../types';
import { User, Activity, Flame, Zap, Heart, TrendingUp } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface UserProfileProps {
    data: QuestionnaireData;
    level: RunningLevel;
}

const UserProfile: React.FC<UserProfileProps> = ({ data, level }) => {
    const { paceUnit } = useSettings();

    // Helper to display pace in current unit - Simplified for now
    // Ideally this should use same logic as SessionCard but we don't have per-zone calculator in frontend yet.
    // For now, we display the Reference Times which are static strings

    const showAdvanced = level !== RunningLevel.BEGINNER;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8 animate-in slide-in-from-bottom-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-6">
                <User size={24} className="text-primary" /> Profil & Allures
            </h2>

            <div className="grid md:grid-cols-2 gap-8">

                {/* REFERENCE TIMES */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp size={14} /> Vos Références
                    </h3>

                    <div className="space-y-3">
                        {data.recentRaceTimes?.distance5km && (
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className="font-bold text-slate-700">5 km</span>
                                <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{data.recentRaceTimes.distance5km}</span>
                            </div>
                        )}
                        {data.recentRaceTimes?.distance10km && (
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className="font-bold text-slate-700">10 km</span>
                                <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{data.recentRaceTimes.distance10km}</span>
                            </div>
                        )}
                        {data.recentRaceTimes?.distanceHalfMarathon && (
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className="font-bold text-slate-700">Semi-Marathon</span>
                                <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{data.recentRaceTimes.distanceHalfMarathon}</span>
                            </div>
                        )}
                        {data.recentRaceTimes?.distanceMarathon && (
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className="font-bold text-slate-700">Marathon</span>
                                <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{data.recentRaceTimes.distanceMarathon}</span>
                            </div>
                        )}

                        {!data.recentRaceTimes?.distance5km && !data.recentRaceTimes?.distance10km && (
                            <p className="text-sm text-slate-400 italic">Aucun temps de référence enregistré.</p>
                        )}
                    </div>
                </div>

                {/* TRAINING ZONES (Fixed / Estimations) */}
                {/* NOTE: In a real app, these should be calculated from VMA. 
                    Here we show a placeholder explanation of zones since we don't have the VMA value in frontend state yet (it's in the AI logic).
                */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={14} /> Zones d'entraînement
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-green-100 p-1.5 rounded-lg text-green-600 mt-0.5"><Heart size={16} /></div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Endurance Fondamentale (EF)</p>
                                <p className="text-xs text-slate-500">60-75% VMA. Aisance respiratoire totale. Base de tout entraînement.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 mt-0.5"><Flame size={16} /></div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Endurance Active (EA)</p>
                                <p className="text-xs text-slate-500">75-85% VMA. Souffle légèrement marqué. Allure Marathon/Semi.</p>
                            </div>
                        </div>

                        {showAdvanced && (
                            <div className="flex items-start gap-3">
                                <div className="bg-red-100 p-1.5 rounded-lg text-red-600 mt-0.5"><Zap size={16} /></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">VMA & Seuil</p>
                                    <p className="text-xs text-slate-500">85-100% VMA. Effort intense pour développer la cylindrée.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UserProfile;
