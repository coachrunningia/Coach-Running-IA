import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { User, TrainingPlan } from '../../types';
import {
  LayoutDashboard, AlertTriangle, ClipboardList, Users, ArrowLeft,
  Loader2, TrendingUp, Shield, Activity, ChevronRight, ExternalLink,
  Search, Filter, ChevronDown, ChevronUp, Eye, X, Clock, CheckCircle,
  XCircle, MessageSquare, User as UserIcon, Calendar, MapPin, Zap, Heart,
  CreditCard, Ban, ShoppingBag, RefreshCw
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PlanScore {
  planId: string;
  qualityScore: number;
  qualityDetails: Record<string, number>;
  healthRiskScore: number;
  healthRiskDetails: Record<string, number>;
  riskMessages?: string[];
  alerts: Array<{ type: string; severity: string; message: string }>;
  lastEvaluated?: string;
  // Plan metadata (denormalized)
  planName?: string;
  userEmail?: string;
  level?: string;
  objective?: string;
  startDate?: string;
  weekCount?: number;
  isPreview?: boolean;
  createdAt?: string;
  isPremium?: boolean;
  profileData?: {
    age?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    sex?: string | null;
    hasInjury?: boolean;
    injuryDescription?: string | null;
    currentWeeklyVolume?: number | null;
    frequency?: number | null;
    lastActivity?: string | null;
  };
}

type AlertStatus = 'NOUVELLE' | 'VUE' | 'EN_COURS' | 'RÉSOLUE' | 'IGNORÉE';

interface AdminAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  planId: string;
  userEmail?: string;
  planName?: string;
  status: AlertStatus;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

type TabId = 'overview' | 'plans' | 'alerts' | 'users' | 'subscribers' | 'plan-detail';

interface AdminDashboardProps {
  user: User;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const qualityLabel = (score: number) => {
  if (score >= 80) return { text: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (score >= 60) return { text: 'Bon', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 40) return { text: 'Moyen', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { text: 'Faible', color: 'text-red-600', bg: 'bg-red-50' };
};

const riskLabel = (score: number) => {
  if (score <= 10) return { text: 'Faible', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (score <= 25) return { text: 'Modéré', color: 'text-amber-600', bg: 'bg-amber-50' };
  if (score <= 50) return { text: 'Élevé', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { text: 'Critique', color: 'text-red-600', bg: 'bg-red-50' };
};

const severityStyle = (severity: string) => {
  switch (severity) {
    case 'CRITIQUE': return 'bg-red-100 text-red-700 border-red-200';
    case 'ÉLEVÉ': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'MODÉRÉ': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'overview';

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<PlanScore[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Plan detail
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(searchParams.get('planId'));

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const setTab = (tab: TabId, planId?: string) => {
    const params: Record<string, string> = { tab };
    if (planId) params.planId = planId;
    setSearchParams(params);
    if (planId) setSelectedPlanId(planId);
  };

  // ─── Data Loading ───
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load scores
      const scoresSnap = await getDocs(collection(db, 'admin', 'scores', 'plans'));
      const scoresData = scoresSnap.docs.map(d => ({ planId: d.id, ...d.data() } as PlanScore));
      setScores(scoresData);

      // Load plans
      const plansSnap = await getDocs(query(collection(db, 'plans'), orderBy('createdAt', 'desc')));
      const plansData = plansSnap.docs.map(d => ({ ...d.data(), id: d.id } as TrainingPlan));
      setPlans(plansData);

      // Load users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      // Load admin alerts
      try {
        const alertsSnap = await getDocs(collection(db, 'admin', 'alerts', 'items'));
        const alertsData = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAlert));
        setAdminAlerts(alertsData);
      } catch { /* alerts collection may not exist yet */ }

    } catch (err: any) {
      console.error('[Admin] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed Data ───
  const scoresMap = new Map(scores.map(s => [s.planId, s]));

  const allAlerts = scores.flatMap(s =>
    (s.alerts || []).map(a => ({ ...a, planId: s.planId, userEmail: s.userEmail, planName: s.planName }))
  );
  const criticalAlerts = allAlerts.filter(a => a.severity === 'CRITIQUE');
  const highAlerts = allAlerts.filter(a => a.severity === 'ÉLEVÉ');

  const premiumUsers = users.filter(u => u.isPremium);
  const stravaUsers = users.filter(u => u.stravaConnected);

  const avgQuality = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.qualityScore, 0) / scores.length) : 0;
  const avgRisk = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.healthRiskScore, 0) / scores.length) : 0;

  const now = new Date();
  const activePlans = plans.filter(p => !p.endDate || new Date(p.endDate) >= now);

  // Merge score-derived alerts with persisted admin alert statuses
  const alertStatusMap = new Map(adminAlerts.map(a => [a.id, a]));

  const mergedAlerts: AdminAlert[] = allAlerts.map((a, i) => {
    const alertId = `${a.planId}_${a.type}_${i}`;
    const persisted = alertStatusMap.get(alertId);
    return {
      id: alertId,
      type: a.type,
      severity: a.severity,
      message: a.message,
      planId: a.planId,
      userEmail: a.userEmail,
      planName: a.planName,
      status: persisted?.status || 'NOUVELLE',
      note: persisted?.note || '',
      createdAt: persisted?.createdAt || new Date().toISOString(),
      updatedAt: persisted?.updatedAt,
    };
  });

  const updateAlertStatus = async (alertId: string, status: AlertStatus, note?: string) => {
    const alertRef = doc(db, 'admin', 'alerts', 'items', alertId);
    const existing = alertStatusMap.get(alertId);
    const data = {
      ...existing,
      id: alertId,
      status,
      note: note ?? existing?.note ?? '',
      updatedAt: new Date().toISOString(),
      ...(existing ? {} : { createdAt: new Date().toISOString() }),
    };
    await setDoc(alertRef, data, { merge: true });
    setAdminAlerts(prev => {
      const idx = prev.findIndex(a => a.id === alertId);
      if (idx >= 0) return prev.map(a => a.id === alertId ? data as AdminAlert : a);
      return [...prev, data as AdminAlert];
    });
  };

  // Filtered & sorted plans for the Plans tab
  const getFilteredPlans = () => {
    let filtered = plans.map(p => ({
      plan: p,
      score: scoresMap.get(p.id),
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(({ plan, score }) =>
        (plan.userEmail?.toLowerCase() || '').includes(term) ||
        (plan.name?.toLowerCase() || '').includes(term) ||
        plan.id.includes(term)
      );
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(({ score }) => {
        if (!score) return riskFilter === 'no-score';
        if (riskFilter === 'critique') return score.healthRiskScore > 50;
        if (riskFilter === 'eleve') return score.healthRiskScore > 25 && score.healthRiskScore <= 50;
        if (riskFilter === 'modere') return score.healthRiskScore > 10 && score.healthRiskScore <= 25;
        if (riskFilter === 'faible') return score.healthRiskScore <= 10;
        return true;
      });
    }

    if (qualityFilter !== 'all') {
      filtered = filtered.filter(({ score }) => {
        if (!score) return qualityFilter === 'no-score';
        if (qualityFilter === 'faible') return score.qualityScore < 40;
        if (qualityFilter === 'moyen') return score.qualityScore >= 40 && score.qualityScore < 60;
        if (qualityFilter === 'bon') return score.qualityScore >= 60 && score.qualityScore < 80;
        if (qualityFilter === 'excellent') return score.qualityScore >= 80;
        return true;
      });
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(b.plan.createdAt).getTime() - new Date(a.plan.createdAt).getTime();
      else if (sortBy === 'quality') cmp = (b.score?.qualityScore || 0) - (a.score?.qualityScore || 0);
      else if (sortBy === 'risk') cmp = (b.score?.healthRiskScore || 0) - (a.score?.healthRiskScore || 0);
      else if (sortBy === 'email') cmp = (a.plan.userEmail || '').localeCompare(b.plan.userEmail || '');
      return sortDir === 'asc' ? -cmp : cmp;
    });

    return filtered;
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-accent mx-auto mb-4" size={40} />
          <p className="text-slate-500">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <h2 className="text-red-700 font-bold mb-2">Erreur</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Réessayer</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════════

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard size={18} /> },
    { id: 'alerts', label: 'Alertes', icon: <AlertTriangle size={18} />, badge: criticalAlerts.length + highAlerts.length },
    { id: 'plans', label: 'Plans', icon: <ClipboardList size={18} /> },
    { id: 'subscribers', label: 'Abonnés', icon: <CreditCard size={18} />, badge: premiumUsers.length },
    { id: 'users', label: 'Utilisateurs', icon: <Users size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield size={20} className="text-accent" />
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-400">{plans.length} plans · {users.length} utilisateurs · {scores.length} scorés</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/blog')}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              Blog Admin <ExternalLink size={12} />
            </button>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab
          plans={plans} activePlans={activePlans} scores={scores} users={users}
          premiumUsers={premiumUsers} stravaUsers={stravaUsers}
          avgQuality={avgQuality} avgRisk={avgRisk}
          criticalAlerts={criticalAlerts} highAlerts={highAlerts} allAlerts={allAlerts}
          onNavigate={setTab}
        />}
        {activeTab === 'alerts' && <AlertsTab
          alerts={mergedAlerts}
          onViewPlan={(id) => setTab('plan-detail', id)}
          onUpdateStatus={updateAlertStatus}
        />}
        {activeTab === 'plans' && <PlansTab
          filteredPlans={getFilteredPlans()}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          riskFilter={riskFilter} setRiskFilter={setRiskFilter}
          qualityFilter={qualityFilter} setQualityFilter={setQualityFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          sortDir={sortDir} setSortDir={setSortDir}
          onViewPlan={(id) => setTab('plan-detail', id)}
        />}
        {activeTab === 'plan-detail' && selectedPlanId && <PlanDetailTab
          planId={selectedPlanId}
          plan={plans.find(p => p.id === selectedPlanId)}
          score={scoresMap.get(selectedPlanId)}
          alerts={mergedAlerts.filter(a => a.planId === selectedPlanId)}
          onUpdateStatus={updateAlertStatus}
          onBack={() => setTab('plans')}
        />}
        {activeTab === 'subscribers' && <SubscribersTab users={users} plans={plans} />}
        {activeTab === 'users' && <UsersTab users={users} plans={plans} scoresMap={scoresMap} />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════

// ─── Helpers for 3-note grading ───

const computeTripleGrade = (score: PlanScore) => {
  const qd = score.qualityDetails || {};
  const hd = score.healthRiskDetails || {};
  const p = score.profileData;

  // Note Sportive (0-100, higher = better) — from quality sub-scores
  const sportif = score.qualityScore;

  // Note Prévention Blessure (0-100, higher = safer) — invert non-profile risk sub-scores
  const injuryRiskRaw = (hd.volumeSpike || 0) + (hd.intensityForLevel || 0) + (hd.elevationRisk || 0);
  const prevention = Math.max(0, Math.round(100 - (injuryRiskRaw / 75) * 100));

  // Note Santé/Profil (0-100, higher = safer) — invert profile risk
  const sante = Math.max(0, Math.round(100 - ((hd.profileRisk || 0) / 25) * 100));

  // Indice de confiance (0-100) — based on data completeness
  let confidencePoints = 0;
  let confidenceMax = 0;
  const check = (val: any, weight = 1) => { confidenceMax += weight; if (val != null && val !== '' && val !== false) confidencePoints += weight; };
  check(p?.age, 2);
  check(p?.weight, 2);
  check(p?.height, 1);
  check(p?.sex, 1);
  check(p?.frequency, 2);
  check(p?.currentWeeklyVolume, 2);
  check(p?.hasInjury !== undefined ? true : null, 2);
  check(p?.lastActivity, 1);
  check(score.level && score.level !== 'unknown', 2);
  check(score.objective && score.objective !== 'unknown', 2);
  check(score.weekCount && score.weekCount > 1, 1);
  const confiance = confidenceMax > 0 ? Math.round((confidencePoints / confidenceMax) * 100) : 0;

  return { sportif, prevention, sante, confiance };
};

const gradeColor = (v: number) => {
  if (v >= 80) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Excellent' };
  if (v >= 60) return { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Bon' };
  if (v >= 40) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Moyen' };
  return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Faible' };
};

const confianceColor = (v: number) => {
  if (v >= 75) return 'text-emerald-600';
  if (v >= 50) return 'text-amber-600';
  return 'text-red-500';
};

const OverviewTab: React.FC<{
  plans: TrainingPlan[]; activePlans: TrainingPlan[]; scores: PlanScore[];
  users: any[]; premiumUsers: any[]; stravaUsers: any[];
  avgQuality: number; avgRisk: number;
  criticalAlerts: any[]; highAlerts: any[]; allAlerts: any[];
  onNavigate: (tab: TabId, planId?: string) => void;
}> = ({ plans, activePlans, scores, users, premiumUsers, stravaUsers, avgQuality, avgRisk, criticalAlerts, highAlerts, allAlerts, onNavigate }) => {

  const scoresMap = new Map(scores.map(s => [s.planId, s]));

  // ─── Last 10 plans with triple grading ───
  const last10 = [...plans]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(plan => {
      const score = scoresMap.get(plan.id);
      const grades = score ? computeTripleGrade(score) : null;
      return { plan, score, grades };
    });

  // ─── Premium engagement ───
  const premiumPlans = plans.filter(p => {
    const s = scoresMap.get(p.id);
    return s?.isPremium;
  });

  const engagementStats = (() => {
    let totalSessions = 0;
    let completedSessions = 0;
    let rpeGiven = 0;
    let adaptationsRequested = 0;
    const userEngagement = new Map<string, { sessions: number; completed: number; rpe: number; adaptations: number; plans: number }>();

    premiumPlans.forEach(plan => {
      const userId = plan.userId;
      if (!userEngagement.has(userId)) {
        userEngagement.set(userId, { sessions: 0, completed: 0, rpe: 0, adaptations: 0, plans: 0 });
      }
      const ue = userEngagement.get(userId)!;
      ue.plans++;

      (plan.weeks || []).forEach((week: any) => {
        (week.sessions || []).forEach((session: any) => {
          totalSessions++;
          ue.sessions++;
          if (session.feedback?.completed) {
            completedSessions++;
            ue.completed++;
          }
          if (session.feedback?.rpe != null) {
            rpeGiven++;
            ue.rpe++;
          }
        });
      });

      if (plan.adaptationLog?.adaptationHistory) {
        adaptationsRequested += plan.adaptationLog.adaptationHistory.length;
        ue.adaptations += plan.adaptationLog.adaptationHistory.length;
      }
    });

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const rpeRate = totalSessions > 0 ? Math.round((rpeGiven / totalSessions) * 100) : 0;

    // Top engaged users
    const topUsers = [...userEngagement.entries()]
      .map(([uid, data]) => {
        const u = users.find((u: any) => u.id === uid);
        return { ...data, email: u?.email || uid, firstName: u?.firstName || '—', stravaConnected: !!u?.stravaConnected };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);

    return { totalSessions, completedSessions, rpeGiven, adaptationsRequested, completionRate, rpeRate, premiumCount: premiumPlans.length, topUsers };
  })();

  // ─── KPIs ───
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPlans = plans.filter(p => new Date(p.createdAt) >= sevenDaysAgo);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Plans total" value={plans.length} sub={`${activePlans.length} actifs · ${recentPlans.length} cette semaine`} icon={<ClipboardList size={20} />} color="blue" />
        <KPICard label="Utilisateurs" value={users.length} sub={`${premiumUsers.length} premium · ${stravaUsers.length} Strava`} icon={<Users size={20} />} color="purple" />
        <KPICard label="Alertes" value={criticalAlerts.length + highAlerts.length} sub={`${criticalAlerts.length} critiques · ${highAlerts.length} élevées`} icon={<AlertTriangle size={20} />} color="red" />
        <KPICard label="Engagement" value={`${engagementStats.completionRate}%`} sub={`${engagementStats.completedSessions}/${engagementStats.totalSessions} séances`} icon={<Activity size={20} />} color="emerald" />
      </div>

      {/* ═══ LAST 10 PLANS WITH TRIPLE GRADING ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-accent" />
            10 derniers plans — Évaluation détaillée
          </h2>
          <button onClick={() => onNavigate('plans')} className="text-xs text-accent font-bold flex items-center gap-1">
            Tous les plans <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold">
                <th className="text-left px-4 py-2.5">Plan</th>
                <th className="text-center px-3 py-2.5">
                  <div className="flex flex-col items-center"><Zap size={13} className="text-blue-500 mb-0.5" /><span>Sportif</span></div>
                </th>
                <th className="text-center px-3 py-2.5">
                  <div className="flex flex-col items-center"><Shield size={13} className="text-amber-500 mb-0.5" /><span>Prévention</span></div>
                </th>
                <th className="text-center px-3 py-2.5">
                  <div className="flex flex-col items-center"><Heart size={13} className="text-red-500 mb-0.5" /><span>Santé</span></div>
                </th>
                <th className="text-center px-3 py-2.5">Confiance</th>
                <th className="text-center px-3 py-2.5">Détails</th>
              </tr>
            </thead>
            <tbody>
              {last10.map(({ plan, score, grades }) => (
                <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 max-w-[250px] truncate">{plan.name || '—'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {plan.userEmail || '—'} · {new Date(plan.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {score?.level && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{score.level}</span>}
                      {score?.objective && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{score.objective}</span>}
                      {score?.profileData?.age && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{score.profileData.age}a</span>}
                      {score?.profileData?.bmi && <span className={`text-[10px] px-1.5 py-0.5 rounded ${(score.profileData.bmi ?? 0) >= 30 ? 'bg-red-100 text-red-600' : (score.profileData.bmi ?? 0) >= 25 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>IMC {score.profileData.bmi}</span>}
                      {score?.profileData?.hasInjury && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Blessure</span>}
                      {plan.isPreview && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">PREVIEW</span>}
                    </div>
                  </td>
                  {grades ? (
                    <>
                      <td className="px-3 py-3 text-center">
                        <GradeCell value={grades.sportif} details={[
                          { label: 'Progression volume', val: score?.qualityDetails?.volumeProgression, max: 20 },
                          { label: 'Semaines récup', val: score?.qualityDetails?.recoveryWeeks, max: 20 },
                          { label: 'Affûtage', val: score?.qualityDetails?.taperQuality, max: 20 },
                          { label: 'Cohérence allures', val: score?.qualityDetails?.paceCoherence, max: 20 },
                          { label: 'Variété séances', val: score?.qualityDetails?.sessionVariety, max: 20 },
                        ]} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <GradeCell value={grades.prevention} details={[
                          { label: 'Montée de charge', val: 25 - (score?.healthRiskDetails?.volumeSpike || 0), max: 25 },
                          { label: 'Intensité/niveau', val: 25 - (score?.healthRiskDetails?.intensityForLevel || 0), max: 25 },
                          { label: 'Dénivelé', val: 25 - (score?.healthRiskDetails?.elevationRisk || 0), max: 25 },
                        ]} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <GradeCell value={grades.sante} details={[
                          { label: 'Risque profil', val: 25 - (score?.healthRiskDetails?.profileRisk || 0), max: 25 },
                        ]}
                        riskMessages={score?.riskMessages} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className={`text-lg font-black ${confianceColor(grades.confiance)}`}>{grades.confiance}%</div>
                        <div className="text-[10px] text-slate-400">{grades.confiance >= 75 ? 'Données complètes' : grades.confiance >= 50 ? 'Données partielles' : 'Données insuffisantes'}</div>
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="px-3 py-3 text-center text-xs text-slate-300">Non scoré</td>
                  )}
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => onNavigate('plan-detail', plan.id)}
                      className="p-1.5 text-slate-400 hover:text-accent transition-colors rounded-lg hover:bg-accent/10" title="Voir détail">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ PREMIUM ENGAGEMENT REPORT ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-5">
          <Activity size={18} className="text-accent" />
          Engagement Premium
          <span className="text-xs font-normal text-slate-400 ml-2">{engagementStats.premiumCount} plans premium</span>
        </h2>

        {/* Engagement KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900">{engagementStats.completionRate}%</div>
            <div className="text-xs text-slate-500 mt-1">Taux complétion</div>
            <div className="text-[10px] text-slate-400">{engagementStats.completedSessions}/{engagementStats.totalSessions} séances</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900">{engagementStats.rpeRate}%</div>
            <div className="text-xs text-slate-500 mt-1">Taux feedback RPE</div>
            <div className="text-[10px] text-slate-400">{engagementStats.rpeGiven} avis donnés</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900">{engagementStats.adaptationsRequested}</div>
            <div className="text-xs text-slate-500 mt-1">Adaptations demandées</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900">{stravaUsers.length}</div>
            <div className="text-xs text-slate-500 mt-1">Strava connectés</div>
            <div className="text-[10px] text-slate-400">sur {premiumUsers.length} premium</div>
          </div>
        </div>

        {/* Top engaged users */}
        {engagementStats.topUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Top utilisateurs premium</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 font-bold">
                    <th className="text-left px-3 py-2">Utilisateur</th>
                    <th className="text-center px-3 py-2">Plans</th>
                    <th className="text-center px-3 py-2">Séances complétées</th>
                    <th className="text-center px-3 py-2">RPE donnés</th>
                    <th className="text-center px-3 py-2">Adaptations</th>
                    <th className="text-center px-3 py-2">Strava</th>
                    <th className="text-center px-3 py-2">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {engagementStats.topUsers.map((u, i) => {
                    const engRate = u.sessions > 0 ? Math.round((u.completed / u.sessions) * 100) : 0;
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-700">{u.firstName}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{u.plans}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-bold text-slate-700">{u.completed}</span>
                          <span className="text-slate-400">/{u.sessions}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{u.rpe}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{u.adaptations}</td>
                        <td className="px-3 py-2 text-center">
                          {u.stravaConnected
                            ? <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Oui</span>
                            : <span className="text-[10px] text-slate-300">Non</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            engRate >= 50 ? 'bg-emerald-50 text-emerald-700'
                            : engRate >= 20 ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-600'
                          }`}>{engRate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alerts summary */}
      {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Alertes actives
            </h2>
            <button onClick={() => onNavigate('alerts')} className="text-xs text-accent font-bold flex items-center gap-1">
              Tout voir <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-3">
            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                <span className="text-sm font-bold text-red-700">{criticalAlerts.length} Critiques</span>
              </div>
            )}
            {highAlerts.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-4 py-2">
                <span className="text-sm font-bold text-orange-700">{highAlerts.length} Élevées</span>
              </div>
            )}
            {allAlerts.filter(a => a.severity === 'MODÉRÉ').length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
                <span className="text-sm font-bold text-amber-700">{allAlerts.filter(a => a.severity === 'MODÉRÉ').length} Modérées</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Grade Cell (used in overview table) ───
const GradeCell: React.FC<{
  value: number;
  details: Array<{ label: string; val?: number; max: number }>;
  riskMessages?: string[];
}> = ({ value, details, riskMessages }) => {
  const [open, setOpen] = useState(false);
  const g = gradeColor(value);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`inline-flex flex-col items-center px-2.5 py-1.5 rounded-xl border ${g.bg} ${g.border} ${g.text} cursor-pointer hover:shadow-sm transition-shadow`}>
        <span className="text-lg font-black leading-none">{value}</span>
        <span className="text-[9px] font-bold mt-0.5">{g.label}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[200px] text-left">
          <div className="space-y-1.5">
            {details.filter(d => d.val != null).map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-600">{d.label}</span>
                  <span className="font-bold text-slate-700">{d.val}/{d.max}</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.val! / d.max >= 0.8 ? 'bg-emerald-500' : d.val! / d.max >= 0.6 ? 'bg-blue-500' : d.val! / d.max >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${(d.val! / d.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {riskMessages && riskMessages.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              {riskMessages.slice(0, 3).map((msg, i) => (
                <div key={i} className="text-[10px] text-red-500 flex items-start gap-1">
                  <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                  <span>{msg}</span>
                </div>
              ))}
              {riskMessages.length > 3 && <div className="text-[10px] text-slate-400">+{riskMessages.length - 3} autre(s)</div>}
            </div>
          )}
          <button onClick={() => setOpen(false)} className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 w-full text-center">Fermer</button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ALERTS TAB (with lifecycle management)
// ═══════════════════════════════════════════════════════════════

const statusConfig: Record<AlertStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'NOUVELLE': { label: 'Nouvelle', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <AlertTriangle size={14} /> },
  'VUE': { label: 'Vue', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: <Eye size={14} /> },
  'EN_COURS': { label: 'En cours', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={14} /> },
  'RÉSOLUE': { label: 'Résolue', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle size={14} /> },
  'IGNORÉE': { label: 'Ignorée', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <XCircle size={14} /> },
};

const AlertsTab: React.FC<{
  alerts: AdminAlert[];
  onViewPlan: (id: string) => void;
  onUpdateStatus: (alertId: string, status: AlertStatus, note?: string) => Promise<void>;
}> = ({ alerts, onViewPlan, onUpdateStatus }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = alerts.filter(a => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus === 'active') return !['RÉSOLUE', 'IGNORÉE'].includes(a.status);
    if (filterStatus === 'resolved') return ['RÉSOLUE', 'IGNORÉE'].includes(a.status);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const sevOrder: Record<string, number> = { 'CRITIQUE': 0, 'ÉLEVÉ': 1, 'MODÉRÉ': 2, 'INFO': 3 };
    const statusOrder: Record<string, number> = { 'NOUVELLE': 0, 'VUE': 1, 'EN_COURS': 2, 'RÉSOLUE': 3, 'IGNORÉE': 4 };
    const sCmp = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (sCmp !== 0) return sCmp;
    return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
  });

  const handleStatusChange = async (alertId: string, status: AlertStatus) => {
    setUpdating(alertId);
    try {
      await onUpdateStatus(alertId, status, noteInput || undefined);
      if (status === 'RÉSOLUE' || status === 'IGNORÉE') setExpandedAlert(null);
      setNoteInput('');
    } finally {
      setUpdating(null);
    }
  };

  const activeCount = alerts.filter(a => !['RÉSOLUE', 'IGNORÉE'].includes(a.status)).length;
  const resolvedCount = alerts.length - activeCount;

  return (
    <div className="space-y-4">
      {/* Filter bars */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 mr-4">
          {[
            { val: 'active', label: `Actives (${activeCount})` },
            { val: 'resolved', label: `Résolues (${resolvedCount})` },
            { val: 'all', label: `Toutes (${alerts.length})` },
          ].map(s => (
            <button key={s.val} onClick={() => setFilterStatus(s.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === s.val ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {['all', 'CRITIQUE', 'ÉLEVÉ', 'MODÉRÉ'].map(sev => (
          <button key={sev} onClick={() => setFilterSeverity(sev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterSeverity === sev
                ? sev === 'CRITIQUE' ? 'bg-red-500 text-white'
                  : sev === 'ÉLEVÉ' ? 'bg-orange-500 text-white'
                  : sev === 'MODÉRÉ' ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {sev === 'all' ? 'Toutes sév.' : `${sev} (${alerts.filter(a => a.severity === sev).length})`}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Aucune alerte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(alert => {
            const sc = statusConfig[alert.status];
            const isExpanded = expandedAlert === alert.id;
            return (
              <div key={alert.id} className={`rounded-lg border ${severityStyle(alert.severity)} overflow-hidden`}>
                <div className="px-4 py-3 flex items-start gap-3 cursor-pointer" onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold uppercase">{alert.severity}</span>
                      <span className="text-xs opacity-70">· {alert.type}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    {alert.userEmail && (
                      <p className="text-xs opacity-70 mt-1">{alert.userEmail} · {alert.planName || alert.planId}</p>
                    )}
                    {alert.note && <p className="text-xs mt-1 italic opacity-60">Note : {alert.note}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onViewPlan(alert.planId); }}
                      className="p-1.5 rounded-lg hover:bg-white/50 transition-colors" title="Voir le plan">
                      <Eye size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 py-3 bg-white/60 border-t border-current/10 space-y-3">
                    {/* Status transitions */}
                    <div className="flex flex-wrap gap-2">
                      {alert.status === 'NOUVELLE' && (
                        <>
                          <StatusButton label="Marquer vue" status="VUE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="purple" />
                          <StatusButton label="Prendre en charge" status="EN_COURS" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="amber" />
                          <StatusButton label="Ignorer" status="IGNORÉE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="slate" />
                        </>
                      )}
                      {alert.status === 'VUE' && (
                        <>
                          <StatusButton label="Prendre en charge" status="EN_COURS" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="amber" />
                          <StatusButton label="Résoudre" status="RÉSOLUE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="emerald" />
                          <StatusButton label="Ignorer" status="IGNORÉE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="slate" />
                        </>
                      )}
                      {alert.status === 'EN_COURS' && (
                        <>
                          <StatusButton label="Résoudre" status="RÉSOLUE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="emerald" />
                          <StatusButton label="Ignorer" status="IGNORÉE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="slate" />
                        </>
                      )}
                      {(alert.status === 'RÉSOLUE' || alert.status === 'IGNORÉE') && (
                        <StatusButton label="Réouvrir" status="NOUVELLE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="blue" />
                      )}
                    </div>
                    {/* Note input */}
                    <div className="flex gap-2">
                      <input type="text" placeholder="Ajouter une note..." value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" />
                      <button onClick={() => handleStatusChange(alert.id, alert.status)}
                        disabled={!noteInput || updating === alert.id}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 disabled:opacity-50">
                        <MessageSquare size={12} className="inline mr-1" />Sauver note
                      </button>
                    </div>
                    {alert.updatedAt && (
                      <p className="text-[10px] text-slate-400">Dernière MAJ : {new Date(alert.updatedAt).toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatusButton: React.FC<{
  label: string; status: AlertStatus; alertId: string; updating: string | null;
  onUpdate: (id: string, status: AlertStatus) => void; color: string;
}> = ({ label, status, alertId, updating, onUpdate, color }) => (
  <button onClick={() => onUpdate(alertId, status)} disabled={updating === alertId}
    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors bg-${color}-100 text-${color}-700 hover:bg-${color}-200 disabled:opacity-50`}>
    {updating === alertId ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
    {label}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// PLAN DETAIL TAB
// ═══════════════════════════════════════════════════════════════

const PlanDetailTab: React.FC<{
  planId: string;
  plan?: TrainingPlan;
  score?: PlanScore;
  alerts: AdminAlert[];
  onUpdateStatus: (alertId: string, status: AlertStatus, note?: string) => Promise<void>;
  onBack: () => void;
}> = ({ planId, plan, score, alerts, onUpdateStatus, onBack }) => {
  const [noteInput, setNoteInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const handleStatusChange = async (alertId: string, status: AlertStatus) => {
    setUpdating(alertId);
    try { await onUpdateStatus(alertId, status, noteInput || undefined); setNoteInput(''); }
    finally { setUpdating(null); }
  };

  if (!plan) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400">Plan introuvable (ID: {planId})</p>
        <button onClick={onBack} className="mt-4 text-accent font-bold text-sm">Retour</button>
      </div>
    );
  }

  const q = score ? qualityLabel(score.qualityScore) : null;
  const r = score ? riskLabel(score.healthRiskScore) : null;
  const p = score?.profileData;

  const qualitySubScores = score?.qualityDetails ? Object.entries(score.qualityDetails) : [];
  const riskSubScores = score?.healthRiskDetails ? Object.entries(score.healthRiskDetails) : [];

  // Compute week volumes
  const weekSummaries = (plan.weeks || []).map((week: any, i: number) => {
    const sessions = week.sessions || [];
    const totalKm = sessions.reduce((sum: number, s: any) => sum + (s.distance || 0), 0);
    const totalDPlus = sessions.reduce((sum: number, s: any) => sum + (s.elevationGain || 0), 0);
    const sessionCount = sessions.length;
    const types = sessions.map((s: any) => s.type || '?');
    return { weekNum: i + 1, totalKm: Math.round(totalKm * 10) / 10, totalDPlus, sessionCount, types, sessions, phase: week.phase };
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="text-accent font-bold flex items-center gap-1 hover:underline">
          <ArrowLeft size={16} /> Retour aux plans
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{plan.name || planId}</span>
      </div>

      {/* Plan Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">{plan.name || 'Plan sans nom'}</h2>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><UserIcon size={12} /> {plan.userEmail || '—'}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {plan.startDate ? new Date(plan.startDate).toLocaleDateString('fr-FR') : '—'}</span>
              {plan.endDate && <span>→ {new Date(plan.endDate).toLocaleDateString('fr-FR')}</span>}
              <span className="flex items-center gap-1"><ClipboardList size={12} /> {plan.weeks?.length || 0} semaines</span>
              {plan.isPreview && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">PREVIEW</span>}
              {score?.isPremium && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PREMIUM</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Créé le {new Date(plan.createdAt).toLocaleString('fr-FR')} · ID: {planId}
            </div>
          </div>
          <div className="flex gap-3">
            {q && <div className={`text-center px-4 py-2 rounded-xl ${q.bg}`}>
              <div className={`text-2xl font-black ${q.color}`}>{score!.qualityScore}</div>
              <div className={`text-xs font-bold ${q.color}`}>Qualité</div>
            </div>}
            {r && <div className={`text-center px-4 py-2 rounded-xl ${r.bg}`}>
              <div className={`text-2xl font-black ${r.color}`}>{score!.healthRiskScore}</div>
              <div className={`text-xs font-bold ${r.color}`}>Risque</div>
            </div>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><UserIcon size={16} /> Profil coureur</h3>
          {p ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {p.age && <ProfileRow label="Âge" value={`${p.age} ans`} />}
              {p.sex && <ProfileRow label="Sexe" value={p.sex} />}
              {p.weight && <ProfileRow label="Poids" value={`${p.weight} kg`} />}
              {p.height && <ProfileRow label="Taille" value={`${p.height} cm`} />}
              {p.bmi && <ProfileRow label="IMC" value={String(p.bmi)} warn={p.bmi >= 25} critical={p.bmi >= 30} />}
              {p.frequency && <ProfileRow label="Fréquence" value={`${p.frequency}x/sem`} />}
              {p.currentWeeklyVolume != null && <ProfileRow label="Volume actuel" value={`${p.currentWeeklyVolume} km/sem`} />}
              {p.lastActivity && <ProfileRow label="Dernière activité" value={p.lastActivity} />}
              {p.hasInjury && <ProfileRow label="Blessure" value={p.injuryDescription || 'Oui'} critical />}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucune donnée de profil</p>
          )}
          {score?.level && <div className="mt-3 text-xs"><span className="font-bold text-slate-500">Niveau :</span> {score.level}</div>}
          {score?.objective && <div className="text-xs"><span className="font-bold text-slate-500">Objectif :</span> {score.objective}</div>}
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><TrendingUp size={16} /> Détail des scores</h3>
          {qualitySubScores.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Qualité (/20 par critère)</h4>
              <div className="space-y-2">
                {qualitySubScores.map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold">{val}/20</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${val >= 16 ? 'bg-emerald-500' : val >= 12 ? 'bg-blue-500' : val >= 8 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${(val / 20) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {riskSubScores.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Risque santé (/25 par critère)</h4>
              <div className="space-y-2">
                {riskSubScores.map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold">{val}/25</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${val <= 5 ? 'bg-emerald-500' : val <= 12 ? 'bg-amber-500' : val <= 18 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${(val / 25) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {qualitySubScores.length === 0 && riskSubScores.length === 0 && (
            <p className="text-sm text-slate-400">Plan non scoré</p>
          )}
        </div>
      </div>

      {/* Risk Messages */}
      {score?.riskMessages && score.riskMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3"><Heart size={16} className="text-red-500" /> Messages de risque</h3>
          <div className="space-y-1">
            {score.riskMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={14} className="flex-shrink-0 text-amber-500 mt-0.5" />
                <span className="text-slate-700">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts for this plan */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-500" /> Alertes ({alerts.length})
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => {
              const sc = statusConfig[alert.status];
              return (
                <div key={alert.id} className={`rounded-lg border px-4 py-3 ${severityStyle(alert.severity)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold uppercase">{alert.severity}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.note && <p className="text-xs mt-1 italic opacity-60">Note : {alert.note}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {alert.status === 'NOUVELLE' && (
                        <>
                          <StatusButton label="Vue" status="VUE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="purple" />
                          <StatusButton label="En cours" status="EN_COURS" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="amber" />
                        </>
                      )}
                      {alert.status === 'VUE' && (
                        <StatusButton label="En cours" status="EN_COURS" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="amber" />
                      )}
                      {(alert.status === 'NOUVELLE' || alert.status === 'VUE' || alert.status === 'EN_COURS') && (
                        <StatusButton label="Résoudre" status="RÉSOLUE" alertId={alert.id} updating={updating} onUpdate={handleStatusChange} color="emerald" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weeks Overview */}
      {weekSummaries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4"><Calendar size={16} /> Semaines ({weekSummaries.length})</h3>
          <div className="space-y-1">
            {weekSummaries.map(w => (
              <div key={w.weekNum}>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedWeek(expandedWeek === w.weekNum ? null : w.weekNum)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-6">S{w.weekNum}</span>
                    {w.phase && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold capitalize">{w.phase}</span>}
                    <span className="text-sm font-bold text-slate-700">{w.totalKm} km</span>
                    {w.totalDPlus > 0 && <span className="text-xs text-slate-400">{w.totalDPlus} D+</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{w.sessionCount} séances</span>
                    {expandedWeek === w.weekNum ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </div>
                {expandedWeek === w.weekNum && (
                  <div className="ml-9 mb-2 space-y-1">
                    {w.sessions.map((s: any, si: number) => (
                      <div key={si} className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-3">
                        <span className="font-bold text-slate-500 w-16">{s.day || `Jour ${si + 1}`}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          s.type === 'Repos' ? 'bg-slate-100 text-slate-400'
                          : s.type?.includes('VMA') ? 'bg-red-50 text-red-600'
                          : s.type?.includes('Seuil') ? 'bg-orange-50 text-orange-600'
                          : s.type?.includes('Long') ? 'bg-blue-50 text-blue-600'
                          : 'bg-emerald-50 text-emerald-600'
                        }`}>{s.type || '?'}</span>
                        {s.distance && <span className="text-slate-600">{s.distance} km</span>}
                        {s.duration && <span className="text-slate-400">{s.duration}</span>}
                        {s.elevationGain > 0 && <span className="text-slate-400">{s.elevationGain} D+</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileRow: React.FC<{ label: string; value: string; warn?: boolean; critical?: boolean }> = ({ label, value, warn, critical }) => (
  <div className="flex justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-bold ${critical ? 'text-red-600' : warn ? 'text-amber-600' : 'text-slate-700'}`}>{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PLANS TAB
// ═══════════════════════════════════════════════════════════════

const PlansTab: React.FC<{
  filteredPlans: Array<{ plan: TrainingPlan; score?: PlanScore }>;
  searchTerm: string; setSearchTerm: (s: string) => void;
  riskFilter: string; setRiskFilter: (s: string) => void;
  qualityFilter: string; setQualityFilter: (s: string) => void;
  sortBy: string; setSortBy: (s: string) => void;
  sortDir: 'asc' | 'desc'; setSortDir: (d: 'asc' | 'desc') => void;
  onViewPlan: (id: string) => void;
}> = ({ filteredPlans, searchTerm, setSearchTerm, riskFilter, setRiskFilter, qualityFilter, setQualityFilter, sortBy, setSortBy, sortDir, setSortDir, onViewPlan }) => {

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    sortBy === col ? (sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />) : null
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par email, nom de plan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>
        <select
          value={qualityFilter}
          onChange={e => setQualityFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Qualité : Tous</option>
          <option value="excellent">Excellent (≥80)</option>
          <option value="bon">Bon (60-79)</option>
          <option value="moyen">Moyen (40-59)</option>
          <option value="faible">Faible (&lt;40)</option>
          <option value="no-score">Non scoré</option>
        </select>
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Risque : Tous</option>
          <option value="critique">Critique (&gt;50)</option>
          <option value="eleve">Élevé (26-50)</option>
          <option value="modere">Modéré (11-25)</option>
          <option value="faible">Faible (≤10)</option>
          <option value="no-score">Non scoré</option>
        </select>
      </div>

      <p className="text-xs text-slate-400">{filteredPlans.length} plan(s)</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('email')}>
                  <span className="flex items-center gap-1">Email <SortIcon col="email" /></span>
                </th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">Plan</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('quality')}>
                  <span className="flex items-center justify-center gap-1">Qualité <SortIcon col="quality" /></span>
                </th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('risk')}>
                  <span className="flex items-center justify-center gap-1">Risque <SortIcon col="risk" /></span>
                </th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('date')}>
                  <span className="flex items-center justify-center gap-1">Date <SortIcon col="date" /></span>
                </th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.slice(0, 100).map(({ plan, score }) => {
                const q = score ? qualityLabel(score.qualityScore) : null;
                const r = score ? riskLabel(score.healthRiskScore) : null;
                const p = score?.profileData;
                return (
                  <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-medium">{plan.userEmail || '—'}</div>
                      {p && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.age && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.age} ans</span>}
                          {p.bmi && <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.bmi >= 30 ? 'bg-red-100 text-red-600' : p.bmi >= 25 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>IMC {p.bmi}</span>}
                          {p.hasInjury && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Blessure</span>}
                          {p.sex && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.sex}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-slate-900 font-medium">{plan.name || '—'}</span>
                        {plan.isPreview && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">PREVIEW</span>}
                        {score?.isPremium && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">PREMIUM</span>}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{score?.level || '?'} · {score?.objective || '?'} · {score?.weekCount || plan.weeks?.length || '?'} sem.</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {q ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${q.bg} ${q.color}`}>
                          {score!.qualityScore} — {q.text}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r ? (
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${r.bg} ${r.color}`}>
                            {score!.healthRiskScore} — {r.text}
                          </span>
                          {score!.riskMessages && score!.riskMessages.length > 0 && (
                            <div className="mt-1 max-w-[200px]">
                              {score!.riskMessages.slice(0, 2).map((msg, i) => (
                                <div key={i} className="text-[10px] text-red-500 truncate" title={msg}>{msg}</div>
                              ))}
                              {score!.riskMessages.length > 2 && (
                                <div className="text-[10px] text-slate-400">+{score!.riskMessages.length - 2} autre(s)</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {new Date(plan.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewPlan(plan.id)}
                        className="p-1.5 text-slate-400 hover:text-accent transition-colors rounded-lg hover:bg-accent/10"
                        title="Voir le plan"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredPlans.length > 100 && (
          <div className="px-4 py-3 bg-slate-50 text-center text-xs text-slate-400">
            Affichage limité à 100 plans. Utilisez les filtres pour affiner.
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SUBSCRIBERS TAB
// ═══════════════════════════════════════════════════════════════

type SubFilter = 'all' | 'active' | 'cancelled' | 'plan-unique' | 'expired';

const getSubscriptionInfo = (u: any) => {
  const isPremium = !!u.isPremium;
  const isPlanUnique = !!u.hasPurchasedPlan && !u.stripeSubscriptionStatus;
  const isCancelling = !!u.premiumCancelAt && isPremium;
  const isCancelled = !!u.premiumCancelledAt && !isPremium;
  const stripeStatus = u.stripeSubscriptionStatus || '';
  const isActive = isPremium && !isCancelling && !isPlanUnique;
  const isExpired = !isPremium && !isPlanUnique && (isCancelled || stripeStatus === 'canceled');

  let label = 'Free';
  let color = 'text-slate-400';
  let bg = 'bg-slate-50';
  let icon = <Ban size={14} />;

  if (isPlanUnique) {
    label = 'Plan Unique';
    color = 'text-indigo-700';
    bg = 'bg-indigo-50';
    icon = <ShoppingBag size={14} />;
  } else if (isCancelling) {
    label = 'Résiliation en cours';
    color = 'text-orange-700';
    bg = 'bg-orange-50';
    icon = <Clock size={14} />;
  } else if (isActive) {
    label = 'Actif';
    color = 'text-emerald-700';
    bg = 'bg-emerald-50';
    icon = <CheckCircle size={14} />;
  } else if (isExpired) {
    label = 'Expiré';
    color = 'text-red-700';
    bg = 'bg-red-50';
    icon = <XCircle size={14} />;
  }

  return { isPremium, isPlanUnique, isCancelling, isCancelled, isActive, isExpired, stripeStatus, label, color, bg, icon };
};

const SubscribersTab: React.FC<{
  users: any[];
  plans: TrainingPlan[];
}> = ({ users, plans }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SubFilter>('all');
  const [sortBy, setSortBy] = useState<'date' | 'email' | 'plans'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Only show paying users (premium, plan unique, cancelled premium)
  const subscribers = users
    .map(u => {
      const info = getSubscriptionInfo(u);
      const userPlans = plans.filter(p => p.userId === u.id || p.userEmail === u.email);
      const now = new Date();
      const activePlanCount = userPlans.filter(p => !p.endDate || new Date(p.endDate) >= now).length;
      return { ...u, ...info, userPlans, planCount: userPlans.length, activePlanCount };
    })
    .filter(u => u.isPremium || u.isPlanUnique || u.isCancelled || u.isExpired);

  const filtered = subscribers.filter(u => {
    if (search) {
      const term = search.toLowerCase();
      if (!(u.email || '').toLowerCase().includes(term) && !(u.firstName || '').toLowerCase().includes(term)) return false;
    }
    if (filter === 'active') return u.isActive;
    if (filter === 'cancelled') return u.isCancelling || u.isCancelled;
    if (filter === 'plan-unique') return u.isPlanUnique;
    if (filter === 'expired') return u.isExpired;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') cmp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    else if (sortBy === 'email') cmp = (a.email || '').localeCompare(b.email || '');
    else if (sortBy === 'plans') cmp = b.planCount - a.planCount;
    return sortDir === 'asc' ? -cmp : cmp;
  });

  const toggleSort = (col: 'date' | 'email' | 'plans') => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    sortBy === col ? (sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />) : null
  );

  // KPIs
  const activeCount = subscribers.filter(u => u.isActive).length;
  const cancellingCount = subscribers.filter(u => u.isCancelling).length;
  const planUniqueCount = subscribers.filter(u => u.isPlanUnique).length;
  const expiredCount = subscribers.filter(u => u.isExpired).length;

  // MRR estimate (would need actual price data — show count-based for now)
  const totalRevenue = activeCount; // placeholder

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total abonnés" value={subscribers.length} sub="payants (tous statuts)" icon={<CreditCard size={20} />} color="blue" />
        <KPICard label="Actifs" value={activeCount} sub="abonnement en cours" icon={<CheckCircle size={20} />} color="emerald" />
        <KPICard label="Résiliation" value={cancellingCount} sub="en cours de résiliation" icon={<Clock size={20} />} color="orange" />
        <KPICard label="Plan Unique" value={planUniqueCount} sub="achat unique" icon={<ShoppingBag size={20} />} color="indigo" />
        <KPICard label="Expirés" value={expiredCount} sub="abonnement terminé" icon={<XCircle size={20} />} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher par email ou prénom..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
        </div>
        {([
          { val: 'all' as SubFilter, label: `Tous (${subscribers.length})` },
          { val: 'active' as SubFilter, label: `Actifs (${activeCount})` },
          { val: 'plan-unique' as SubFilter, label: `Plan Unique (${planUniqueCount})` },
          { val: 'cancelled' as SubFilter, label: `Résiliation (${cancellingCount})` },
          { val: 'expired' as SubFilter, label: `Expirés (${expiredCount})` },
        ]).map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === f.val ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">{sorted.length} abonné(s)</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('email')}>
                  <span className="flex items-center gap-1">Abonné <SortIcon col="email" /></span>
                </th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Statut</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Stripe</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase cursor-pointer hover:text-slate-700" onClick={() => toggleSort('plans')}>
                  <span className="flex items-center justify-center gap-1">Plans <SortIcon col="plans" /></span>
                </th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Strava</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Dates</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.firstName || '—'}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                    {u.source && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">{u.source}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${u.bg} ${u.color}`}>
                      {u.icon} {u.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs text-slate-500">{u.stripeStatus || '—'}</div>
                    {u.stripeCustomerId && (
                      <div className="text-[10px] text-slate-300 truncate max-w-[120px] mx-auto" title={u.stripeCustomerId}>{u.stripeCustomerId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-700">{u.planCount}</div>
                    <div className="text-[10px] text-slate-400">{u.activePlanCount} actif(s)</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.stravaConnected ? (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Connecté</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <div className="text-slate-500">
                      Inscrit : {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </div>
                    {u.premiumCancelAt && (
                      <div className="text-orange-600">Fin : {new Date(u.premiumCancelAt).toLocaleDateString('fr-FR')}</div>
                    )}
                    {u.premiumCancelledAt && (
                      <div className="text-red-500">Résilié : {new Date(u.premiumCancelledAt).toLocaleDateString('fr-FR')}</div>
                    )}
                    {u.planPurchaseDate && (
                      <div className="text-indigo-600">Achat : {new Date(u.planPurchaseDate).toLocaleDateString('fr-FR')}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Aucun abonné trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════

const UsersTab: React.FC<{
  users: any[];
  plans: TrainingPlan[];
  scoresMap: Map<string, PlanScore>;
}> = ({ users, plans, scoresMap }) => {
  const [search, setSearch] = useState('');

  const enrichedUsers = users.map(u => {
    const userPlans = plans.filter(p => p.userId === u.id || p.userEmail === u.email);
    return { ...u, planCount: userPlans.length };
  });

  const filtered = search
    ? enrichedUsers.filter(u => (u.email || '').toLowerCase().includes(search.toLowerCase()) || (u.firstName || '').toLowerCase().includes(search.toLowerCase()))
    : enrichedUsers;

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par email ou prénom..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      <p className="text-xs text-slate-400">{filtered.length} utilisateur(s)</p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">Utilisateur</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Premium</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Strava</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Plans</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 text-xs uppercase">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-slate-900 font-medium">{u.firstName || '—'}</span>
                      <span className="text-slate-400 ml-2 text-xs">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.isPremium ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Premium</span>
                    ) : (
                      <span className="text-xs text-slate-300">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.stravaConnected ? (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Connecté</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-slate-700">{u.planCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

const KPICard: React.FC<{ label: string; value: string | number; sub: string; icon: React.ReactNode; color: string }> = ({ label, value, sub, icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
      <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-500`}>{icon}</div>
    </div>
    <div className="text-2xl font-black text-slate-900">{value}</div>
    <div className="text-xs text-slate-400 mt-1">{sub}</div>
  </div>
);

const DistBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-700">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default AdminDashboard;
