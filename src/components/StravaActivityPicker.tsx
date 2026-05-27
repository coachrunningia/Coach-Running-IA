/**
 * Sprint G — StravaActivityPicker
 *
 * Sous-modal ouvert depuis le SessionFeedbackModal quand l'user clique :
 *   • "Pas la bonne séance ?" (cas correction auto-match)
 *   • Option (a) du modal 3 options (cas aucun match)
 *
 * Affiche la liste des courses Strava de l'user sur 7 ou 14 jours (selon
 * `fetchStravaActivitiesForPicker` — fenêtre dynamique selon ancienneté séance).
 *
 * Activités déjà rattachées à une AUTRE séance du plan courant = GRISÉES + tooltip
 * "Déjà utilisée pour ta [Type] du [DD/MM]" (doctrine PM, lookup O(1) via usedIndex).
 *
 * Doctrine sécurité (feedback_securite_avant_conversion) :
 * • Inclut `manual=true` Strava (montre HS = légitime, cf. PM Q4)
 * • Tap-area ≥ 44pt par carte activité
 * • Loader "Synchronisation en cours..." (wording Romane validé)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { X, Activity, Loader, RefreshCw, AlertCircle, Info } from 'lucide-react';
import {
    fetchStravaActivitiesForPicker,
    stravaActivityToMatch,
} from '../services/stravaAnalysisService';
import type { StravaActivityMatch } from '../types';
import type { UsedStravaActivitiesIndex } from '../utils/stravaUsageIndex';

interface StravaActivityPickerProps {
    userId: string;
    sessionDate: Date;
    usedIndex: UsedStravaActivitiesIndex; // Set + Map info (grisage + tooltip)
    onSelect: (match: StravaActivityMatch) => void;
    onClose: () => void;
}

type FetchState =
    | { status: 'loading' }
    | { status: 'success'; activities: any[] }
    | { status: 'empty' }
    | { status: 'error'; message: string };

export const StravaActivityPicker: React.FC<StravaActivityPickerProps> = ({
    userId,
    sessionDate,
    usedIndex,
    onSelect,
    onClose,
}) => {
    const [state, setState] = useState<FetchState>({ status: 'loading' });

    const loadActivities = useCallback(async () => {
        setState({ status: 'loading' });
        try {
            const activities = await fetchStravaActivitiesForPicker(userId, sessionDate);
            if (!activities || activities.length === 0) {
                setState({ status: 'empty' });
            } else {
                setState({ status: 'success', activities });
            }
        } catch (err: any) {
            const message = err?.message || 'Impossible de joindre Strava.';
            setState({ status: 'error', message });
        }
    }, [userId, sessionDate]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    const formatDate = (iso: string): string => {
        try {
            return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        } catch {
            return '—';
        }
    };

    const formatPace = (a: any): string => {
        if (a.average_speed && a.average_speed > 0) {
            const totalMin = 16.6667 / a.average_speed;
            const min = Math.floor(totalMin);
            const sec = Math.round((totalMin - min) * 60);
            return sec >= 60 ? `${min + 1}:00` : `${min}:${String(sec).padStart(2, '0')}`;
        }
        return '—';
    };

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="strava-picker-title"
        >
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-5 pb-3 border-b border-slate-100">
                    <h3 id="strava-picker-title" className="text-lg font-bold text-slate-900">
                        Tes courses Strava
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 -m-2 rounded-full hover:bg-slate-100"
                        aria-label="Fermer"
                    >
                        <X className="text-slate-400" size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {state.status === 'loading' && (
                        <div className="flex items-center justify-center gap-2 py-12 text-orange-700">
                            <Loader size={16} className="animate-spin" />
                            <span className="text-sm font-medium">Synchronisation en cours...</span>
                        </div>
                    )}

                    {state.status === 'empty' && (
                        <div className="text-center py-10">
                            <Activity size={28} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-700 font-medium mb-1">
                                Aucune course trouvée
                            </p>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                On n'a pas trouvé de course dans tes 7 derniers jours Strava. Tu peux
                                saisir manuellement ou marquer la séance comme non faite.
                            </p>
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800 mb-1">
                                        Strava indisponible
                                    </p>
                                    <p className="text-xs text-red-700 mb-3">{state.message}</p>
                                    <button
                                        onClick={loadActivities}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900"
                                    >
                                        <RefreshCw size={12} /> Réessayer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {state.status === 'success' &&
                        state.activities.map((a) => {
                            const isUsed = usedIndex.ids.has(a.id);
                            const usedInfo = isUsed ? usedIndex.info.get(a.id) : null;
                            const dateLabel = formatDate(a.start_date_local || a.start_date);
                            const distanceKm = Math.round((a.distance || 0) / 10) / 100;
                            const movingMin = Math.round((a.moving_time || 0) / 60);
                            const tooltip = usedInfo
                                ? `Déjà utilisée pour ta ${usedInfo.type} du ${usedInfo.date}`
                                : undefined;

                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => !isUsed && onSelect(stravaActivityToMatch(a))}
                                    disabled={isUsed}
                                    title={tooltip}
                                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                                        isUsed
                                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                            : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50 active:scale-[0.99]'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Activity
                                            size={18}
                                            className={isUsed ? 'text-slate-400 mt-0.5' : 'text-orange-500 mt-0.5'}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2 mb-1">
                                                <span className="font-semibold text-sm text-slate-900 truncate">
                                                    {a.name || 'Course sans titre'}
                                                </span>
                                                <span className="text-xs text-slate-500 flex-shrink-0">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                                <span>{distanceKm} km</span>
                                                <span>{movingMin} min</span>
                                                <span>{formatPace(a)} min/km</span>
                                                {a.total_elevation_gain != null && (
                                                    <span>D+ {Math.round(a.total_elevation_gain)} m</span>
                                                )}
                                            </div>
                                            {isUsed && usedInfo && (
                                                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 italic">
                                                    <Info size={11} />
                                                    Déjà utilisée pour ta {usedInfo.type} du {usedInfo.date}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                </div>

                {/* Footer */}
                <div className="p-4 pt-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StravaActivityPicker;
