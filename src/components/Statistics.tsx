
import React, { useMemo } from 'react';
import { TrainingPlan } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Activity, Calendar, Trophy } from 'lucide-react';

interface StatisticsProps {
    plan: TrainingPlan;
}

const COLORS = ['#0f172a', '#f97316', '#3b82f6', '#10b981'];

const Statistics: React.FC<StatisticsProps> = ({ plan }) => {

    const weeklyVolumeData = useMemo(() => {
        return plan.weeks.map(week => {
            // Simple heuristic: sum durations or if distance is present use that.
            // For now, let's just count number of sessions as a proxy for volume if distance missing.
            return {
                name: `S${week.weekNumber}`,
                sessions: week.sessions.length,
                // We could parse duration string "45 min" => 45 to get minutes
                minutes: week.sessions.reduce((acc, s) => {
                    const match = s.duration.match(/(\d+)/);
                    return acc + (match ? parseInt(match[0]) : 0);
                }, 0)
            };
        });
    }, [plan]);

    const intensityData = useMemo(() => {
        const counts: Record<string, number> = { 'Facile': 0, 'Modéré': 0, 'Difficile': 0 };
        plan.weeks.forEach(w => w.sessions.forEach(s => {
            if (s.intensity && counts[s.intensity] !== undefined) {
                counts[s.intensity]++;
            } else {
                // Fallback categorization based on type
                if (s.type === 'Jogging') counts['Facile']++;
                else if (s.type === 'Fractionné') counts['Difficile']++;
                else counts['Modéré']++;
            }
        }));
        return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
    }, [plan]);

    // Nombre de séances dans les semaines GÉNÉRÉES
    const generatedSessions = plan.weeks.reduce((acc, w) => acc + w.sessions.length, 0);
    const generatedWeeks = plan.weeks.length;

    // Nombre TOTAL de semaines prévues (inclut les semaines non encore générées)
    const totalPlannedWeeks = plan.isPreview && plan.generationContext?.periodizationPlan?.totalWeeks
        ? plan.generationContext.periodizationPlan.totalWeeks
        : plan.weeks.length;

    // Estimation du nombre total de séances (basé sur la fréquence ou moyenne par semaine)
    const avgSessionsPerWeek = generatedWeeks > 0 ? generatedSessions / generatedWeeks : 3;
    const estimatedTotalSessions = plan.isPreview
        ? Math.round(avgSessionsPerWeek * totalPlannedWeeks)
        : generatedSessions;

    // Pour l'affichage, on utilise les séances générées
    const totalSessions = generatedSessions;
    const totalWeeks = generatedWeeks;

    // Calcul de la progression globale
    const completedSessions = useMemo(() => {
        return plan.weeks.reduce((acc, w) =>
            acc + w.sessions.filter(s => s.feedback?.completed).length, 0
        );
    }, [plan]);

    // Pourcentage basé sur les séances GÉNÉRÉES (pas estimées)
    const progressPercentage = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    // Est-ce un plan en preview (incomplet) ?
    const isPreviewPlan = plan.isPreview && !plan.fullPlanGenerated;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Avertissement plan preview */}
            {isPreviewPlan && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                        <Calendar size={18} className="text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800 text-sm">Plan en cours de génération</h4>
                        <p className="text-amber-700 text-sm">
                            Seule la semaine 1 a été générée. Les statistiques affichées concernent uniquement les {totalSessions} séances générées.
                            Le plan complet comprendra environ {estimatedTotalSessions} séances sur {totalPlannedWeeks} semaines.
                        </p>
                    </div>
                </div>
            )}

            {/* BARRE DE PROGRESSION GLOBALE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Trophy size={24} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                            {isPreviewPlan ? 'Progression (Semaine 1)' : 'Progression Globale'}
                        </h3>
                        <p className="text-sm text-slate-500">{completedSessions} séances complétées sur {totalSessions}</p>
                    </div>
                    <div className="ml-auto text-3xl font-black text-slate-900">{progressPercentage}%</div>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                {progressPercentage === 100 && !isPreviewPlan && (
                    <p className="text-center text-emerald-600 font-bold mt-3 animate-pulse">
                        🎉 Félicitations ! Tu as terminé ton programme !
                    </p>
                )}
                {progressPercentage === 100 && isPreviewPlan && (
                    <p className="text-center text-amber-600 font-bold mt-3">
                        Semaine 1 terminée ! Générez la suite du plan pour continuer.
                    </p>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-slate-400 mb-2"><TrendingUp size={20} /></div>
                    <div className="text-3xl font-black text-slate-900">
                        {totalSessions}
                        {isPreviewPlan && (
                            <span className="text-lg text-slate-300 font-normal">/{estimatedTotalSessions}</span>
                        )}
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase">
                        {isPreviewPlan ? 'Séances Générées' : 'Séances Totales'}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-slate-400 mb-2"><Calendar size={20} /></div>
                    <div className="text-3xl font-black text-slate-900">
                        {totalWeeks}
                        {isPreviewPlan && (
                            <span className="text-lg text-slate-300 font-normal">/{totalPlannedWeeks}</span>
                        )}
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase">
                        {isPreviewPlan ? 'Semaines Générées' : 'Semaines'}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-accent" size={20} />
                        <span className="text-sm font-bold text-slate-900">Distribution de l'Intensité</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        {intensityData.map((d, i) => {
                            const total = intensityData.reduce((acc, curr) => acc + curr.value, 0);
                            const pct = (d.value / total) * 100;
                            if (pct === 0) return null;
                            return <div key={i} style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} title={d.name} />;
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                        {intensityData.map((d, i) => d.value > 0 && (
                            <div key={i} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Volume Hebdomadaire (minutes)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyVolumeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="minutes" fill="#0f172a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Répartition par Type</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={intensityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {intensityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
