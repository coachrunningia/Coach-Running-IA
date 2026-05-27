/**
 * Sprint G — Index pur des activités Strava déjà rattachées au plan courant.
 *
 * Pourquoi ce helper :
 * • Le picker "Pas la bonne séance ?" doit griser les activités déjà utilisées par
 *   d'autres séances du plan en O(1) — sans cet index, on scannerait 64-128 séances
 *   à chaque ouverture modal (PM condition bloquante).
 * • Le tooltip "Déjà utilisée pour ta [Type] du [DD/MM]" lit info.get(activityId).
 * • Scope plan courant UNIQUEMENT (doctrine feedback_scope_strict).
 *
 * Pourquoi extraire ici plutôt qu'inline dans PlanView : testabilité Vitest pure.
 */

import type { TrainingPlan } from '../types';
import { resolveSessionDate } from './dateUtils';

export interface UsedStravaActivityInfo {
    type: string;       // ex. "Sortie Longue", "Footing"
    date: string;       // ex. "27/05" (toLocaleDateString fr-FR)
}

export interface UsedStravaActivitiesIndex {
    ids: Set<number>;
    info: Map<number, UsedStravaActivityInfo>;
}

export function buildUsedStravaActivitiesIndex(plan: TrainingPlan): UsedStravaActivitiesIndex {
    const ids = new Set<number>();
    const info = new Map<number, UsedStravaActivityInfo>();
    if (!plan?.weeks) return { ids, info };
    plan.weeks.forEach((week) => {
        if (!week?.sessions) return;
        week.sessions.forEach((session) => {
            const aid = session.feedback?.stravaData?.activityId;
            if (typeof aid !== 'number') return;
            ids.add(aid);
            try {
                const sessionDate = resolveSessionDate(session, plan.startDate, week.weekNumber);
                const datePart = sessionDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                info.set(aid, { type: session.type, date: datePart });
            } catch {
                info.set(aid, { type: session.type, date: '—' });
            }
        });
    });
    return { ids, info };
}
