
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Session, Week, StravaActivityMatch } from '../types';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// ============================================
// Sprint G — Cache mémoire + retry 429 (rate limit Strava 200req/15min)
// ============================================
// Doctrine PM : sans cache, 50 modals ouverts → ban Strava. Avec cache module-scope :
// • Map<key, {data, expiresAt}>, TTL 5 min, LRU soft 20 entrées
// • Key = `userId:afterSec:beforeSec` (multi-user safe)
// • Retry 429 backoff exp avec support header `Retry-After`
// • Invalidation explicite via invalidateStravaCache(userId) après rattachement manuel
//
// Justification ligne par ligne (feedback_chaque_ligne_justifiee) :
// - Pas localStorage : multi-user risque, et appel client-only (pas SSR)
// - LRU soft 20 : suffisant pour usage solo, leak mobile Capacitor contrôlé
// - 5 min TTL : compromis rate-limit vs fraîcheur (activité Strava sync ~2-3 min)
type StravaCacheEntry = { data: any[]; expiresAt: number };
const stravaActivitiesCache = new Map<string, StravaCacheEntry>();
const STRAVA_CACHE_TTL_MS = 5 * 60 * 1000;
const STRAVA_CACHE_MAX_ENTRIES = 20;

const buildStravaCacheKey = (userId: string, afterSec: number, beforeSec: number) =>
    `${userId}:${afterSec}:${beforeSec}`;

/**
 * @testing — N'utilise pas en prod. Vide le cache global pour isolation tests Vitest.
 */
export const __clearStravaCacheForTesting = () => stravaActivitiesCache.clear();

/**
 * @testing — État cache pour assertions Vitest.
 */
export const __getStravaCacheSizeForTesting = () => stravaActivitiesCache.size;

/**
 * Invalide toutes les entrées cache d'un user (à appeler après rattachement manuel).
 * Pas de webhook Strava actif → on s'appuie sur invalidation explicite + TTL 5 min.
 */
export const invalidateStravaCache = (userId: string) => {
    let removed = 0;
    for (const key of Array.from(stravaActivitiesCache.keys())) {
        if (key.startsWith(`${userId}:`)) {
            stravaActivitiesCache.delete(key);
            removed++;
        }
    }
    if (removed > 0) console.log(`[Strava] Cache invalidé pour user ${userId} (${removed} entrées)`);
};

/**
 * Fetch avec retry exponentiel sur 429 (rate limit).
 * Honore le header `Retry-After` (en secondes) si présent, sinon backoff min(1000·2^i, 8000) ms.
 * Throw message FR coach-tone après maxRetries échecs.
 */
export const fetchWithStravaRetry = async (url: string, opts: RequestInit, maxRetries = 3): Promise<Response> => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const res = await fetch(url, opts);
        if (res.status !== 429) return res;
        lastStatus = 429;
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
        const waitMs = retryAfterSec > 0
            ? Math.min(retryAfterSec * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 8000);
        console.warn(`[Strava] 429 rate limit, retry ${attempt + 1}/${maxRetries} dans ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
    }
    throw new Error(
        lastStatus === 429
            ? 'Strava est temporairement saturé (rate limit). Réessaie dans 15 min.'
            : 'Erreur API Strava après plusieurs tentatives.'
    );
};

// --- TYPES ---
export interface WeekComparisonResult {
    weekNumber: number;
    plannedSessions: { day: string; title: string; type: string; duration: string }[];
    stravaActivities: { type: string; distance: number; time: number; date: string; name: string }[];
    compliance: number; // 0-100
    sessionsPlanned: number;
    sessionsDone: number;
    crossTrainingEquivalent: number; // minutes running equivalent from cross-training
    avgRpe: number;
    details: string;
}

export interface AdaptationSuggestion {
    compliance: number;
    avgRpe: number;
    crossTraining: { type: string; hours: number; equivalent: number }[];
    volumeChange: number; // percentage, e.g. -15
    suggestions: {
        type: 'volume' | 'intensity' | 'structure' | 'recovery' | 'cross-training';
        priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
        title: string;
        detail: string;
        icon: string;
    }[];
    overallMessage: string;
    verdict: 'MAINTENIR' | 'AJUSTER' | 'RÉDUIRE' | 'RÉCUPÉRATION';
}

// Refresh Strava token when expired — proxied through server to protect client_secret
const refreshStravaToken = async (userId: string, tokenData: any) => {
    console.log('[Strava] Refreshing expired token via server proxy...');

    const response = await fetch('/api/strava/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: tokenData.refresh_token
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Strava] Refresh failed:', errorText);
        throw new Error('Impossible de rafraîchir le token Strava. Veuillez reconnecter votre compte.');
    }

    const newTokenData = await response.json();
    console.log('[Strava] Token refreshed successfully');

    // Preserve athlete info from original token (not returned in refresh response)
    const mergedToken = {
        ...newTokenData,
        ...(tokenData.athlete ? { athlete: tokenData.athlete } : {})
    };

    // Save new token to Firestore
    await updateDoc(doc(db, 'users', userId), {
        stravaToken: mergedToken,
        lastStravaSync: new Date().toISOString()
    });

    return mergedToken;
};

// Get valid token (refresh if needed)
const getValidToken = async (userId: string) => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error("Utilisateur non trouvé");

    const userData = userDoc.data();
    if (!userData.stravaToken) {
        throw new Error("Strava non connecté. Veuillez d'abord connecter votre compte Strava.");
    }

    const tokenData = userData.stravaToken;
    const now = Math.floor(Date.now() / 1000);

    // Check if token expired (with 5 min buffer)
    if (tokenData.expires_at && tokenData.expires_at < now + 300) {
        console.log('[Strava] Token expired, refreshing...');
        const newToken = await refreshStravaToken(userId, tokenData);
        return newToken.access_token;
    }

    return tokenData.access_token;
};

// --- RATE LIMITING: 1 analyse par semaine ---
export const checkCanAnalyze = async (userId: string): Promise<{ canAnalyze: boolean; nextAvailable?: string; lastAnalysis?: any }> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return { canAnalyze: true };

    const userData = userDoc.data();
    const lastAnalysisDate = userData.lastStravaAnalysisDate;
    const lastAnalysisResult = userData.lastStravaAnalysis;

    if (!lastAnalysisDate) return { canAnalyze: true };

    const lastDate = new Date(lastAnalysisDate);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 7) {
        const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
            canAnalyze: false,
            nextAvailable: nextDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
            lastAnalysis: lastAnalysisResult
        };
    }

    return { canAnalyze: true, lastAnalysis: lastAnalysisResult };
};

// Save analysis result to Firestore
const saveAnalysisResult = async (userId: string, analysis: any) => {
    await updateDoc(doc(db, 'users', userId), {
        lastStravaAnalysis: analysis,
        lastStravaAnalysisDate: new Date().toISOString()
    });
};

// Deauthorize Strava (revoke token + clean Firestore)
export const deauthorizeStrava = async (userId: string) => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const tokenData = userDoc.data()?.stravaToken;

    // Revoke token on Strava side
    if (tokenData?.access_token) {
        try {
            await fetch('https://www.strava.com/oauth/deauthorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `access_token=${tokenData.access_token}`
            });
            console.log('[Strava] Token deauthorized on Strava');
        } catch (e) {
            console.warn('[Strava] Deauthorize API call failed, cleaning up locally anyway', e);
        }
    }

    // Clean Firestore
    await updateDoc(doc(db, 'users', userId), {
        stravaConnected: false,
        stravaToken: null,
        lastStravaSync: null
    });
    console.log('[Strava] User disconnected and token revoked');
};

export const fetchRecentActivities = async (userId: string) => {
    try {
        const token = await getValidToken(userId);

        // Fetch last 30 days
        const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

        const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?after=${thirtyDaysAgo}&per_page=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Strava API Failed");
        return await response.json();
    } catch (error) {
        console.error("Error fetching activities", error);
        throw error;
    }
};

export const analyzeActivitiesWithGemini = async (activities: any[], userId: string, userAge?: number) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("No Gemini Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    // Aligne sur env var pour canary deploy uniforme avec geminiService.
    // Cf audit-modele-gemini-PM.md (29/05) : PM verdict requiert tous les sites alignés.
    const MODEL_ID = import.meta.env.VITE_GEMINI_FLASH_MODEL_ID || "gemini-3-flash-preview";
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    console.log(`[Gemini Strava] model=${MODEL_ID}`);

    // Convert m/s to min/km format (e.g. 3.0 m/s → "5:33 min/km")
    const msToMinKm = (ms: number): string => {
        if (!ms || ms <= 0) return '-';
        const totalMin = 16.6667 / ms;
        const min = Math.floor(totalMin);
        const sec = Math.round((totalMin - min) * 60);
        return `${min}:${String(sec).padStart(2, '0')} min/km`;
    };

    const summary = activities.map(a => ({
        type: a.type,
        distance_km: Math.round((a.distance || 0) / 10) / 100,
        time_min: Math.round((a.moving_time || 0) / 60),
        date: a.start_date,
        elevation: a.total_elevation_gain,
        hr: a.average_heartrate,
        avgPace: msToMinKm(a.average_speed),
        maxPace: msToMinKm(a.max_speed),
        sufferScore: a.suffer_score
    }));

    // FC zones calculation
    const age = userAge || 40;
    const fcMax = 220 - age;
    const fcZones = {
      z1: { min: Math.round(fcMax * 0.50), max: Math.round(fcMax * 0.60), label: 'Z1 Récup' },
      z2: { min: Math.round(fcMax * 0.60), max: Math.round(fcMax * 0.70), label: 'Z2 EF' },
      z3: { min: Math.round(fcMax * 0.70), max: Math.round(fcMax * 0.80), label: 'Z3 Tempo' },
      z4: { min: Math.round(fcMax * 0.80), max: Math.round(fcMax * 0.90), label: 'Z4 Seuil' },
      z5: { min: Math.round(fcMax * 0.90), max: fcMax, label: 'Z5 VMA/Max' },
    };

    // Detect FC alerts: easy runs with HR in Z3+
    const activitiesWithHR = summary.filter(a => a.hr && a.hr > 0);
    const fcAlertActivities = activitiesWithHR.filter(a => {
      // If average HR is in Z3+ and it's a "Run" type (likely easy run based on pace)
      return a.hr && a.hr > fcZones.z2.max;
    });

    const fcSection = activitiesWithHR.length > 0 ? `

═══════════════════════════════════════════════════════════════
              ZONES FC (FCmax estimée : ${fcMax} bpm, âge ${age})
═══════════════════════════════════════════════════════════════

${Object.values(fcZones).map(z => `${z.label}: ${z.min}-${z.max} bpm`).join('\n')}

${fcAlertActivities.length > 0 ? `⚠️ ${fcAlertActivities.length} activité(s) avec FC moyenne au-dessus de Z2 (${fcZones.z2.max} bpm). Analyser si les allures EF sont trop rapides.` : '✅ FC cohérente avec les zones attendues.'}
` : '';

    const prompt = `Tu es un coach running expert diplômé. Analyse ces données Strava des 30 derniers jours
comme un VRAI coach le ferait lors d'un bilan mensuel avec son athlète.

IMPORTANT : Réponds UNIQUEMENT en français. Sois HONNÊTE et CONSTRUCTIF.
IMPORTANT : TOUTES les allures doivent être en min/km (format X:XX min/km), JAMAIS en m/s ou km/h. Les données sont déjà converties en min/km.

Données des activités (30 derniers jours) :
${JSON.stringify(summary)}
${fcSection}
═══════════════════════════════════════════════════════════════
              STRUCTURE DE L'ANALYSE
═══════════════════════════════════════════════════════════════

Analyse comme un vrai coach :
1. Calcule le volume total (distance, temps, dénivelé)
2. Identifie les patterns (régularité, types de séances, intensité)
3. Évalue la progression vs les semaines précédentes
4. Identifie les points forts et les points faibles CONCRETS
5. Donne des recommandations ACTIONNABLES
6. ANALYSE FC : si des données FC sont disponibles, vérifie que la FC correspond aux zones attendues. Signale si des footings sont courus trop vite (FC en Z3+ au lieu de Z2).

Format de réponse JSON :
{
    "totalDistance": "125 km",
    "totalTime": "12h30",
    "totalElevation": "850 m D+",
    "sessionCount": 12,
    "avgPace": "5:30 min/km",
    "weeklyBreakdown": "Semaine 1: 28km (3 séances) | Semaine 2: 35km (4 séances) | ...",
    "strengths": [
        {
            "title": "Titre du point fort",
            "detail": "Explication concrète avec chiffres à l'appui"
        }
    ],
    "weaknesses": [
        {
            "title": "Titre du point faible",
            "detail": "Explication concrète avec données et impact sur la performance"
        }
    ],
    "recommendations": [
        {
            "priority": "HAUTE|MOYENNE|BASSE",
            "title": "Titre de la recommandation",
            "detail": "Action concrète à mettre en place dès la semaine prochaine",
            "why": "Explication de pourquoi c'est important pour progresser"
        }
    ],
    "mainInsight": "Phrase résumé principale du bilan (2-3 phrases max, personnalisée et motivante)",
    "coachVerdict": "EXCELLENT|BON|À AMÉLIORER|INSUFFISANT",
    "coachMessage": "Message personnel du coach comme s'il parlait directement au coureur (3-4 phrases motivantes et constructives)",
    "fcAlert": {
        "hasAlert": true,
        "message": "Tes footings sont courus trop vite : FC moyenne de X bpm (Z3) alors que tu devrais être en Z2 (X-X bpm). Ralentis de 15-30 sec/km.",
        "suggestedEFPace": "6:30 min/km",
        "activitiesCount": 3
    }
}

RÈGLES :
- Minimum 2 points forts, 2 points faibles, 3 recommandations
- Les recommandations doivent être classées par priorité (HAUTE d'abord)
- Chaque point doit contenir des CHIFFRES concrets issus des données
- Le coachVerdict doit être HONNÊTE
- Le coachMessage doit être motivant mais réaliste
- Si des données FC montrent des footings trop rapides (FC en Z3+ sur des runs), inclure le champ fcAlert avec hasAlert=true et un message explicatif. Sinon mettre hasAlert=false.
- Réponds EN FRANÇAIS UNIQUEMENT`;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Tu es un coach running expert francophone diplômé. Réponds toujours en français." }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const analysis = JSON.parse(result.response.text());

    // Save to Firestore for rate limiting and caching
    await saveAnalysisResult(userId, analysis);

    return analysis;
};

// ============================================
// WEEKLY COMPARISON: Plan vs Strava
// ============================================

const fetchActivitiesForDateRange = async (userId: string, startDate: Date, endDate: Date) => {
    const after = Math.floor(startDate.getTime() / 1000);
    const before = Math.floor(endDate.getTime() / 1000);
    const cacheKey = buildStravaCacheKey(userId, after, before);

    // Cache HIT
    const cached = stravaActivitiesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    // Cache MISS (ou expiré) — fetch réel avec retry 429
    const token = await getValidToken(userId);
    const response = await fetchWithStravaRetry(
        `${STRAVA_API_BASE}/athlete/activities?after=${after}&before=${before}&per_page=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error('Erreur API Strava');
    const data = await response.json();

    // LRU soft : si on dépasse la limite, on évince la plus ancienne (Map itère insertion order)
    if (stravaActivitiesCache.size >= STRAVA_CACHE_MAX_ENTRIES) {
        const oldestKey = stravaActivitiesCache.keys().next().value;
        if (oldestKey) stravaActivitiesCache.delete(oldestKey);
    }
    stravaActivitiesCache.set(cacheKey, { data, expiresAt: Date.now() + STRAVA_CACHE_TTL_MS });
    return data;
};

// ============================================
// Sprint G — Liste 7-14 jours pour le picker "Pas la bonne séance ?"
// ============================================
// Doctrine PM : fenêtre dynamique
//   • Séance planifiée ≤ 7j de today → fenêtre 7j (cas standard 95%)
//   • Séance planifiée > 7j → fenêtre 14j (cas Arnaud étendu)
//   • Séance > 14j → fenêtre 14j max + UI affichera message "saisie manuelle"
// Filtrage type course uniquement, exclusion `manual=true` NON appliquée (cf. PM Q4 — montre HS légitime)
export const fetchStravaActivitiesForPicker = async (
    userId: string,
    sessionDate: Date
): Promise<any[]> => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sessionTime = sessionDate.getTime();
    const todayTime = today.getTime();
    const daysFromToday = Math.abs(todayTime - sessionTime) / (1000 * 60 * 60 * 24);
    const windowDays = daysFromToday > 7 ? 14 : 7;

    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - windowDays);
    startDate.setHours(0, 0, 0, 0);

    const activities = await fetchActivitiesForDateRange(userId, startDate, endDate);
    // Filtrer types course (idem matching auto). Inclure manual=true (cf. PM doctrine).
    return activities.filter((a: any) =>
        a.type === 'Run' || a.type === 'TrailRun' || a.type === 'Trail Run' || a.type === 'VirtualRun'
    );
};

// Helper exposé pour reformater une activité brute Strava en StravaActivityMatch (utilisé picker)
export const stravaActivityToMatch = (a: any): StravaActivityMatch => ({
    activityId: a.id,
    name: a.name,
    distance: Math.round((a.distance || 0) / 10) / 100,
    movingTime: Math.round((a.moving_time || 0) / 60),
    elapsedTime: Math.round((a.elapsed_time || 0) / 60),
    elevationGain: Math.round(a.total_elevation_gain || 0),
    avgHeartrate: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    maxHeartrate: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    avgPace: a.average_speed ? msToMinKm(a.average_speed) : '-',
    type: a.type,
    startDate: a.start_date_local || a.start_date,
});

// ============================================
// MATCH STRAVA ACTIVITY TO A SESSION
// ============================================

const msToMinKm = (ms: number): string => {
    if (!ms || ms <= 0) return '-';
    const totalMin = 16.6667 / ms;
    const min = Math.floor(totalMin);
    const sec = Math.round((totalMin - min) * 60);
    if (sec >= 60) {
        return `${min + 1}:00 min/km`;
    }
    return `${min}:${String(sec).padStart(2, '0')} min/km`;
};

/**
 * Cherche l'activité Strava correspondant à une séance du plan.
 * Matching : date de la séance ± 1 jour + type running/trail.
 * Retourne null si aucune activité ne matche.
 */
export const findStravaActivityForSession = async (
    userId: string,
    sessionDate: Date,
    sessionType: string
): Promise<StravaActivityMatch | null> => {
    try {
        // Fenêtre de recherche : jour de la séance ± 1 jour
        const startDate = new Date(sessionDate);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(sessionDate);
        endDate.setDate(endDate.getDate() + 2);
        endDate.setHours(0, 0, 0, 0);

        const activities = await fetchActivitiesForDateRange(userId, startDate, endDate);

        // Filtrer par type compatible
        const isStrength = sessionType === 'Renforcement';
        const compatibleActivities = activities.filter((a: any) => {
            if (isStrength) {
                return a.type === 'WeightTraining' || a.type === 'Workout';
            }
            return a.type === 'Run' || a.type === 'TrailRun' || a.type === 'Trail Run' || a.type === 'VirtualRun';
        });

        if (compatibleActivities.length === 0) return null;

        // Trouver l'activité la plus proche en date CALENDAIRE de la séance
        // Comparer par jour (pas par timestamp) pour éviter les décalages soirée→lendemain
        const sessionDay = sessionDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // Prioriser les activités du MÊME JOUR calendaire
        const sameDayActivities = compatibleActivities.filter((a: any) => {
            const aLocal = a.start_date_local || a.start_date;
            const aDay = new Date(aLocal).toISOString().split('T')[0];
            return aDay === sessionDay;
        });

        let closest;
        if (sameDayActivities.length > 0) {
            // Même jour : prendre la plus longue (la "vraie" séance, pas un déplacement)
            closest = sameDayActivities.reduce((best: any, a: any) =>
                (a.moving_time || 0) > (best.moving_time || 0) ? a : best
            );
        } else {
            // Pas d'activité le même jour → fallback sur la plus proche en date
            const sessionTime = sessionDate.getTime();
            closest = compatibleActivities.reduce((best: any, a: any) => {
                const aDate = new Date(a.start_date_local || a.start_date).getTime();
                const bestDate = new Date(best.start_date_local || best.start_date).getTime();
                return Math.abs(aDate - sessionTime) < Math.abs(bestDate - sessionTime) ? a : best;
            });
        }

        return {
            activityId: closest.id,
            name: closest.name,
            distance: Math.round((closest.distance || 0) / 10) / 100,
            movingTime: Math.round((closest.moving_time || 0) / 60),
            elapsedTime: Math.round((closest.elapsed_time || 0) / 60),
            elevationGain: Math.round(closest.total_elevation_gain || 0),
            avgHeartrate: closest.average_heartrate ? Math.round(closest.average_heartrate) : undefined,
            maxHeartrate: closest.max_heartrate ? Math.round(closest.max_heartrate) : undefined,
            avgPace: closest.average_speed ? msToMinKm(closest.average_speed) : '-',
            type: closest.type,
            startDate: closest.start_date_local || closest.start_date,
        };
    } catch (error) {
        console.warn('[Strava] Erreur matching activité:', error);
        return null;
    }
};

export const compareWeekWithStrava = async (
    userId: string,
    week: Week,
    weekStartDate: Date
): Promise<WeekComparisonResult> => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const activities = await fetchActivitiesForDateRange(userId, weekStartDate, weekEndDate);

    // Count running activities
    const runningActivities = activities.filter((a: any) =>
        a.type === 'Run' || a.type === 'TrailRun' || a.type === 'Trail Run' || a.type === 'VirtualRun'
    );

    // Cross-training detection
    const crossTrainingActivities = activities.filter((a: any) =>
        a.type === 'Ride' || a.type === 'VirtualRide' ||
        a.type === 'Swim' ||
        a.type === 'WeightTraining' || a.type === 'Workout'
    );

    // Calculate cross-training equivalent in running minutes
    let crossTrainingEquivalent = 0;
    crossTrainingActivities.forEach((a: any) => {
        const hours = a.moving_time / 3600;
        if (a.type === 'Ride' || a.type === 'VirtualRide') {
            crossTrainingEquivalent += hours * 20; // 1h vélo = 20min running
        } else if (a.type === 'Swim') {
            crossTrainingEquivalent += hours * 15; // 1h natation = 15min running
        }
    });

    // Count renfo/strength activities from Strava
    const strengthActivities = activities.filter((a: any) =>
        a.type === 'WeightTraining' || a.type === 'Workout'
    );

    // Count planned renfo sessions to know how many strength activities to credit
    const plannedRenfoCount = week.sessions.filter(s =>
        s.type === 'Renforcement'
    ).length;
    const creditedStrength = Math.min(strengthActivities.length, plannedRenfoCount);

    const sessionsPlanned = week.sessions.length;
    const sessionsDone = runningActivities.length + creditedStrength;

    // Compliance: sessions done / planned, capped at 100%
    const compliance = sessionsPlanned > 0
        ? Math.min(Math.round((sessionsDone / sessionsPlanned) * 100), 100)
        : 100;

    // Average RPE from session feedback (if available)
    const feedbackSessions = week.sessions.filter(s => s.feedback?.completed && s.feedback?.rpe);
    const avgRpe = feedbackSessions.length > 0
        ? feedbackSessions.reduce((acc, s) => acc + (s.feedback?.rpe || 5), 0) / feedbackSessions.length
        : 5;

    const plannedSessions = week.sessions.map(s => ({
        day: s.day,
        title: s.title,
        type: s.type,
        duration: s.duration
    }));

    const stravaActivitiesMapped = activities.map((a: any) => ({
        type: a.type,
        distance: Math.round(a.distance / 10) / 100, // meters to km
        time: Math.round(a.moving_time / 60), // seconds to min
        date: a.start_date_local || a.start_date,
        name: a.name
    }));

    // Build detail text
    let details = '';
    if (compliance >= 90) {
        details = `Excellent ! ${sessionsDone}/${sessionsPlanned} séances réalisées. Tu es très régulier(e) cette semaine.`;
    } else if (compliance >= 70) {
        details = `Bien ! ${sessionsDone}/${sessionsPlanned} séances. La régularité est importante pour progresser.`;
    } else if (compliance >= 50) {
        details = `${sessionsDone}/${sessionsPlanned} séances réalisées. Essaie de maintenir au moins ${Math.ceil(sessionsPlanned * 0.7)} séances par semaine.`;
    } else {
        details = `Seulement ${sessionsDone}/${sessionsPlanned} séances cette semaine. Il faudra adapter le volume pour la suite.`;
    }

    if (crossTrainingEquivalent > 0) {
        details += ` (+ ${Math.round(crossTrainingEquivalent)} min équivalent running en cross-training)`;
    }

    return {
        weekNumber: week.weekNumber,
        plannedSessions,
        stravaActivities: stravaActivitiesMapped,
        compliance,
        sessionsPlanned,
        sessionsDone,
        crossTrainingEquivalent,
        avgRpe: Math.round(avgRpe * 10) / 10,
        details
    };
};

// ============================================
// ADAPTATION RULES
// ============================================

export const generateAdaptationSuggestions = (
    comparison: WeekComparisonResult,
    nextWeek: Week
): AdaptationSuggestion => {
    const { compliance, avgRpe, stravaActivities, crossTrainingEquivalent } = comparison;
    const suggestions: AdaptationSuggestion['suggestions'] = [];
    let volumeChange = 0;
    let verdict: AdaptationSuggestion['verdict'] = 'MAINTENIR';

    // --- COMPLIANCE RULES ---
    if (compliance >= 90) {
        suggestions.push({
            type: 'volume',
            priority: 'BASSE',
            title: 'Plan maintenu',
            detail: 'Compliance excellente ! On garde le cap, continue comme ça.',
            icon: '🎯'
        });
    } else if (compliance >= 70) {
        suggestions.push({
            type: 'volume',
            priority: 'MOYENNE',
            title: 'Maintenir le rythme',
            detail: `Tu as fait ${comparison.sessionsDone}/${comparison.sessionsPlanned} séances. C'est correct mais essaie de ne pas sauter de séances la semaine prochaine.`,
            icon: '📋'
        });
    } else if (compliance >= 50) {
        volumeChange = -15;
        verdict = 'AJUSTER';
        suggestions.push({
            type: 'volume',
            priority: 'HAUTE',
            title: 'Réduction du volume de 15%',
            detail: `Compliance à ${compliance}%. On réduit légèrement le volume tout en gardant la sortie longue et 1 séance de qualité.`,
            icon: '📉'
        });
    } else {
        volumeChange = -25;
        verdict = 'RÉDUIRE';
        suggestions.push({
            type: 'structure',
            priority: 'HAUTE',
            title: 'Simplification à 2-3 séances max',
            detail: `Compliance à ${compliance}%. On simplifie la semaine prochaine : maximum 3 séances, focus sur la régularité avant l'intensité.`,
            icon: '⚡'
        });
    }

    // --- RPE RULES ---
    if (avgRpe < 5) {
        suggestions.push({
            type: 'intensity',
            priority: 'MOYENNE',
            title: 'Augmenter légèrement l\'intensité',
            detail: `RPE moyen de ${avgRpe}/10 : tu peux te pousser un peu plus. Ajoute du rythme sur tes sorties en endurance.`,
            icon: '🔥'
        });
    } else if (avgRpe >= 5 && avgRpe <= 7) {
        suggestions.push({
            type: 'intensity',
            priority: 'BASSE',
            title: 'Zone optimale d\'effort',
            detail: `RPE moyen de ${avgRpe}/10 : c'est la zone idéale. On maintient cette charge.`,
            icon: '✅'
        });
    } else if (avgRpe > 7 && avgRpe <= 8) {
        if (verdict === 'MAINTENIR') verdict = 'AJUSTER';
        suggestions.push({
            type: 'intensity',
            priority: 'HAUTE',
            title: 'Allègement de la charge',
            detail: `RPE moyen de ${avgRpe}/10 : c'est élevé. On allège la semaine prochaine pour éviter le surentraînement.`,
            icon: '⚠️'
        });
        if (volumeChange === 0) volumeChange = -10;
    } else if (avgRpe > 8) {
        verdict = 'RÉCUPÉRATION';
        volumeChange = Math.min(volumeChange, -30);
        suggestions.push({
            type: 'recovery',
            priority: 'HAUTE',
            title: 'Semaine de récupération obligatoire',
            detail: `RPE moyen de ${avgRpe}/10 : ton corps a besoin de repos. Semaine légère avec seulement de l'endurance fondamentale.`,
            icon: '🛑'
        });
    }

    // --- CROSS-TRAINING RULES ---
    const crossTraining: AdaptationSuggestion['crossTraining'] = [];

    const cyclingActivities = stravaActivities.filter(a => a.type === 'Ride' || a.type === 'VirtualRide');
    if (cyclingActivities.length > 0) {
        const totalHours = cyclingActivities.reduce((acc, a) => acc + a.time / 60, 0);
        crossTraining.push({
            type: 'Vélo',
            hours: Math.round(totalHours * 10) / 10,
            equivalent: Math.round(totalHours * 20)
        });
        suggestions.push({
            type: 'cross-training',
            priority: 'BASSE',
            title: `Vélo détecté (${Math.round(totalHours)}h)`,
            detail: `Équivalent de ${Math.round(totalHours * 20)} min de running pour le cardio. Bon complément !`,
            icon: '🚴'
        });
    }

    const swimmingActivities = stravaActivities.filter(a => a.type === 'Swim');
    if (swimmingActivities.length > 0) {
        const totalHours = swimmingActivities.reduce((acc, a) => acc + a.time / 60, 0);
        crossTraining.push({
            type: 'Natation',
            hours: Math.round(totalHours * 10) / 10,
            equivalent: Math.round(totalHours * 15)
        });
        suggestions.push({
            type: 'cross-training',
            priority: 'BASSE',
            title: `Natation détectée (${Math.round(totalHours)}h)`,
            detail: `Équivalent de ${Math.round(totalHours * 15)} min de running. Excellent pour la récupération active.`,
            icon: '🏊'
        });
    }

    const weightActivities = stravaActivities.filter(a =>
        a.type === 'WeightTraining' || a.type === 'Workout'
    );
    if (weightActivities.length > 2) {
        suggestions.push({
            type: 'volume',
            priority: 'MOYENNE',
            title: `Musculation fréquente (${weightActivities.length} séances)`,
            detail: 'Plus de 2 séances de musculation cette semaine. On réduit légèrement le volume running pour éviter la surcharge.',
            icon: '🏋️'
        });
        if (volumeChange === 0) volumeChange = -10;
    }

    // --- OVERALL MESSAGE ---
    let overallMessage = '';
    if (verdict === 'MAINTENIR') {
        overallMessage = 'Bonne semaine ! On continue sur cette lancée. Le plan est maintenu tel quel.';
    } else if (verdict === 'AJUSTER') {
        overallMessage = `On ajuste légèrement la semaine prochaine (${volumeChange}% de volume) pour optimiser ta progression.`;
    } else if (verdict === 'RÉDUIRE') {
        overallMessage = `La semaine a été difficile. On simplifie la semaine prochaine (${volumeChange}% de volume) pour retrouver de la régularité.`;
    } else {
        overallMessage = 'Ton corps demande du repos. La semaine prochaine sera une semaine de récupération active.';
    }

    return {
        compliance,
        avgRpe,
        crossTraining,
        volumeChange,
        suggestions,
        overallMessage,
        verdict
    };
};

// Apply adaptation to a week (returns a modified copy)
export const applyAdaptation = (week: Week, adaptation: AdaptationSuggestion): Week => {
    const { volumeChange, verdict } = adaptation;
    let adaptedSessions = [...week.sessions];

    // If recovery mode, keep only easy sessions (max 3)
    if (verdict === 'RÉCUPÉRATION') {
        adaptedSessions = adaptedSessions
            .filter(s => s.type === 'Jogging' || s.type === 'Récupération' || s.type === 'Sortie Longue')
            .slice(0, 3)
            .map(s => ({
                ...s,
                intensity: 'Facile' as const,
                advice: `[Adapté - Récupération] ${s.advice}`
            }));
    }
    // If compliance < 50%, simplify to max 3 sessions
    else if (verdict === 'RÉDUIRE') {
        // Keep: 1 long run + 1 quality + 1 easy, remove rest
        const longRun = adaptedSessions.find(s => s.type === 'Sortie Longue');
        const quality = adaptedSessions.find(s => s.type === 'Fractionné');
        const easy = adaptedSessions.find(s => s.type === 'Jogging' || s.type === 'Récupération');
        adaptedSessions = [longRun, quality, easy].filter(Boolean) as Session[];
    }

    // Apply volume reduction to durations
    if (volumeChange !== 0) {
        const factor = 1 + volumeChange / 100;
        adaptedSessions = adaptedSessions.map(s => {
            const durationMatch = s.duration.match(/(\d+)/);
            if (durationMatch) {
                const originalMin = parseInt(durationMatch[1]);
                const newMin = Math.round(originalMin * factor);
                return {
                    ...s,
                    duration: s.duration.replace(/\d+/, String(newMin))
                };
            }
            return s;
        });
    }

    return {
        ...week,
        sessions: adaptedSessions
    };
};
