
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// Refresh Strava token when expired
const refreshStravaToken = async (userId: string, tokenData: any) => {
    const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
    const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
        throw new Error("Configuration Strava manquante");
    }

    console.log('[Strava] Refreshing expired token...');

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
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

    // Save new token to Firestore
    await updateDoc(doc(db, 'users', userId), {
        stravaToken: newTokenData,
        lastStravaSync: new Date().toISOString()
    });

    return newTokenData;
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

export const analyzeActivitiesWithGemini = async (activities: any[], userId: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("No Gemini Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const summary = activities.map(a => ({
        type: a.type,
        distance: a.distance,
        time: a.moving_time,
        date: a.start_date,
        elevation: a.total_elevation_gain,
        hr: a.average_heartrate,
        avgSpeed: a.average_speed,
        maxSpeed: a.max_speed,
        sufferScore: a.suffer_score
    }));

    const prompt = `Tu es un coach running expert diplômé. Analyse ces données Strava des 30 derniers jours
comme un VRAI coach le ferait lors d'un bilan mensuel avec son athlète.

IMPORTANT : Réponds UNIQUEMENT en français. Sois HONNÊTE et CONSTRUCTIF.

Données des activités (30 derniers jours) :
${JSON.stringify(summary)}

═══════════════════════════════════════════════════════════════
              STRUCTURE DE L'ANALYSE
═══════════════════════════════════════════════════════════════

Analyse comme un vrai coach :
1. Calcule le volume total (distance, temps, dénivelé)
2. Identifie les patterns (régularité, types de séances, intensité)
3. Évalue la progression vs les semaines précédentes
4. Identifie les points forts et les points faibles CONCRETS
5. Donne des recommandations ACTIONNABLES

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
    "coachMessage": "Message personnel du coach comme s'il parlait directement au coureur (3-4 phrases motivantes et constructives)"
}

RÈGLES :
- Minimum 2 points forts, 2 points faibles, 3 recommandations
- Les recommandations doivent être classées par priorité (HAUTE d'abord)
- Chaque point doit contenir des CHIFFRES concrets issus des données
- Le coachVerdict doit être HONNÊTE
- Le coachMessage doit être motivant mais réaliste
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
