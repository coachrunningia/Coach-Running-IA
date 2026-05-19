/**
 * raceDayInject.ts
 * ============================================================================
 * Injection déterministe de la séance "course officielle" sur la date raceDate.
 *
 * Bug audit Thomas Weill (2026-05-19, plan Marathon fullPlanGenerated:true) :
 *   - dernière séance du plan = "Sortie Longue EF 20 km" au lieu de
 *     "Course Marathon 42.195 km @ 4:44/km".
 *   - cause racine triple : (1) aucun calcul `raceDayIndex` dans la
 *     périodisation ; (2) aucune instruction dans le prompt LLM ;
 *     (3) `enforceSLDay` force la SL au dimanche y compris la semaine course.
 *
 * Doctrine fix :
 *   - On laisse le LLM générer la phase d'affûtage librement, puis on REMPLACE
 *     post-enforce la séance positionnée le jour raceDate par la séance course.
 *   - On marque la séance avec `_raceDay: true` pour que `enforceSLDay`,
 *     `getWeekKm`, le cap affûtage et la resync weeklyVolumes la traitent
 *     spécifiquement (skip ou inclusion explicite).
 *
 * Source de vérité : INVESTIGATION-VARIATION-ET-COURSE-FINALE.md
 * Validation : PM 10 ans + Dev senior + Coach 20 ans (verdict 2026-05-19).
 * ============================================================================
 */

import type { TrainingPaces } from './geminiService';

/** Identifie une séance déjà marquée comme race-day. */
export const isRaceDaySession = (s: any): boolean => {
  return !!(s && s._raceDay === true);
};

const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** JS Date.getDay() → "Lundi" / "Dimanche" / ... (1=Lundi, 0=Dimanche). */
const dayNameFromDate = (d: Date): string => {
  const dow = d.getDay(); // 0=dim, 1=lun, …, 6=sam
  // Mapping : 0→Dimanche (idx 6), 1→Lundi (idx 0), 2→Mardi (idx 1), …
  return dow === 0 ? 'Dimanche' : DAYS_ORDER[dow - 1];
};

/**
 * Description "Jour J" par discipline (verdict coach 20 ans).
 * Adresse l'utilisateur en tutoyant, ton sécurité + concret.
 */
const buildRaceDayMainSet = (
  raceDistKm: number,
  subGoal: string,
  targetPace: string,
  trailElev?: number,
  hyroxDist?: number,
): string => {
  const lc = (subGoal || '').toLowerCase();

  // Trail PRIORITAIRE (avant Marathon, car un trail 42 km a un format spécifique).
  if (lc.includes('trail') || (trailElev && trailElev > 0)) {
    const elev = trailElev || 0;
    return `JOUR J — Course officielle Trail (${raceDistKm} km${elev ? ` / D+ ${elev}m` : ''}).
- Échauffement : 10 min marche active + mobilité chevilles/hanches. Pas de footing rapide.
- Montées : MARCHE active dès que la pente dépasse 8-10% — économie d'énergie capitale. Mains sur les cuisses si raide.
- Descentes : foulée courte, regard 3-4 mètres devant, fléchis les genoux. Ne freine pas — laisse-toi porter, contrôle par la cadence.
- Pacing : oublie le chrono km/km, raisonne en zones (effort 6/10 sur la 1ère moitié, 7-8/10 ensuite).
- Ravitos : EAU + GEL/PÂTE DE FRUIT à chaque ravito, sels minéraux après 2h d'effort. Profite des ravitos pour te poser 30 sec si gros effort en cours.
- Matériel : vérifie sac, lampe (si nocturne), couverture survie, gobelet, gels avant le départ.
- Sécurité : si signal d'alerte (étourdissement, douleur aiguë, déshydratation), tu t'arrêtes au prochain ravito. Le DNF n'est jamais une honte.`;
  }

  // Hyrox PRIORITAIRE également (avant détection 10K standard).
  if (lc.includes('hyrox') || hyroxDist) {
    return `JOUR J — Course officielle Hyrox (partie running : 8 × 1 km entre stations).
- Échauffement général : 10 min mobilité + 5 min footing lent + 2-3 accélérations courtes. Préparation aux stations selon protocole compétition.
- Course (running uniquement) : objectif = courir chaque km à ${targetPace}/km, RÉGULARITÉ avant tout. Les 2 derniers km, tu accélères si tu as la réserve.
- Récupération entre km/station : récupère ta respiration en sortant de station, repars à l'allure cible dès la sortie. Ne te précipite pas sur le 1er km après station.
- Pacing global : ne pars JAMAIS trop fort sur le 1er km — économie pour le 6e/7e/8e km où la fatigue cumulée frappe.
- Hydrate quand tu peux entre stations. Pas de nouveauté nutrition.`;
  }

  // Marathon — bloc pacing/ravitos/mur
  if (raceDistKm >= 35) {
    return `JOUR J — Course officielle Marathon.
- Échauffement : 10-15 min mobilité dynamique + 5 min footing très lent juste avant le départ. Pas de fractionné.
- Pacing : pars 5-10 sec/km PLUS LENT que ton allure cible (${targetPace}/km) sur les 5 premiers km. Tu rattraperas l'objectif km 10-25. Les 17 derniers km, c'est mental.
- Ravitos : bois à CHAQUE ravito même sans soif (toutes les 5 km). Gel ou pâte de fruit toutes les 30-40 min à partir du km 10. Pas de nouveauté nutrition que tu n'as pas testée à l'entraînement.
- Mur (km 30+) : si tu ralentis, accepte. Reste régulier dans l'effort, pas dans l'allure. Garde un mantra court ("je suis fort", "encore 10 km").
- Stratégie négative split : objectif = 2e moitié ≤ 1ère moitié. Si tu pars en surrégime km 1-10, le mur arrive km 30 garanti.
- Arrivée : marche 10-15 min, hydrate, ne t'assieds pas tout de suite. Compression si besoin.`;
  }

  // Semi — pacing GPS
  if (raceDistKm >= 18 && raceDistKm < 35 && (lc.includes('semi') || lc.includes('21'))) {
    return `JOUR J — Course officielle Semi-marathon.
- Échauffement : 10-15 min footing très lent + 3-4 lignes droites (50m) en accélération progressive.
- Pacing : verrouille ton allure cible (${targetPace}/km) sur les 5 premiers km — pas plus rapide même si tu te sens bien. Le piège du semi = partir trop fort.
- Ravitos : 1 ravito à chaque borne. Eau systématique, gel/pâte de fruit au km 8 puis km 15 selon ressenti.
- Stratégie : km 1-7 régulier sur l'allure cible, km 7-15 maintien strict, km 15-21 c'est là que ça se joue — accroche-toi à l'allure.
- Final : si tu as encore du jus au km 18, accélère progressivement (jamais sprint sec).
- Arrivée : marche 10 min, hydrate, étirements légers.`;
  }

  // Trail — gestion D+, technique descente
  if (raceDistKm > 0 && (lc.includes('trail') || (trailElev && trailElev > 0))) {
    const elev = trailElev || 0;
    return `JOUR J — Course officielle Trail (${raceDistKm} km${elev ? ` / D+ ${elev}m` : ''}).
- Échauffement : 10 min marche active + mobilité chevilles/hanches. Pas de footing rapide.
- Montées : MARCHE active dès que la pente dépasse 8-10% — économie d'énergie capitale. Mains sur les cuisses si raide.
- Descentes : foulée courte, regard 3-4 mètres devant, fléchis les genoux. Ne freine pas — laisse-toi porter, contrôle par la cadence.
- Pacing : oublie le chrono km/km, raisonne en zones (effort 6/10 sur la 1ère moitié, 7-8/10 ensuite).
- Ravitos : EAU + GEL/PÂTE DE FRUIT à chaque ravito, sels minéraux après 2h d'effort. Profite des ravitos pour te poser 30 sec si gros effort en cours.
- Matériel : vérifie sac, lampe (si nocturne), couverture survie, gobelet, gels avant le départ.
- Sécurité : si signal d'alerte (étourdissement, douleur aiguë, déshydratation), tu t'arrêtes au prochain ravito. Le DNF n'est jamais une honte.`;
  }

  // Hyrox — partie course uniquement (cf. doctrine project_coach_running_ia_hyrox_scope)
  if (lc.includes('hyrox') || hyroxDist) {
    return `JOUR J — Course officielle Hyrox (partie running : 8 × 1 km entre stations).
- Échauffement général : 10 min mobilité + 5 min footing lent + 2-3 accélérations courtes. Préparation aux stations selon protocole compétition.
- Course (running uniquement) : objectif = courir chaque km à ${targetPace}/km, RÉGULARITÉ avant tout. Les 2 derniers km, tu accélères si tu as la réserve.
- Récupération entre km/station : récupère ta respiration en sortant de station, repars à l'allure cible dès la sortie. Ne te précipite pas sur le 1er km après station.
- Pacing global : ne pars JAMAIS trop fort sur le 1er km — économie pour le 6e/7e/8e km où la fatigue cumulée frappe.
- Hydrate quand tu peux entre stations. Pas de nouveauté nutrition.`;
  }

  // 10K — adrénaline départ
  if (raceDistKm >= 8 && raceDistKm < 15) {
    return `JOUR J — Course officielle 10 km.
- Échauffement : 15-20 min footing très lent + 4-5 lignes droites (50-80m) en accélération + 1-2 accélérations sur 200m allure 10K.
- Pacing : km 1 souvent trop rapide (adrénaline + relances) → CONCENTRE-TOI sur l'allure cible (${targetPace}/km), pas sur le peloton.
- Découpage : km 1-3 lancement à l'allure cible, km 4-7 verrouillage strict, km 8-10 c'est là qu'on lâche les chevaux.
- Si négative split possible (allure 2e moitié < 1ère moitié) = signe de bonne gestion.
- Ravito mi-course : 1 gorgée d'eau au km 5 si soif. Pas plus.
- Arrivée : ne sprinte que les 300 derniers mètres si tu as la réserve.`;
  }

  // 5K — full effort court
  if (raceDistKm > 0 && raceDistKm < 8) {
    return `JOUR J — Course officielle 5 km.
- Échauffement complet : 15 min footing lent + 5-6 lignes droites (50m) en accélération + 2 accélérations 100-200m allure 5K.
- Pacing : tout est dans la régularité d'effort. Pars à allure cible (${targetPace}/km) — ne te laisse pas emporter par les premiers 200m.
- Découpage mental : km 1 = lancement contrôlé, km 2-3 = phase la plus dure (mentale), km 4-5 = on finit fort.
- Si tu doutes au km 3, mantra court ("je suis prêt", "encore 2 km"), accélération progressive km 4.
- Pas de ravito généralement, pas de nutrition pendant. Hydratation 1h avant suffit.
- Arrivée : sprint final OK sur 200-300 derniers mètres si jus.`;
  }

  // Fallback générique
  return `JOUR J — Course officielle (${raceDistKm} km).
- Échauffement : 10-15 min mobilité + footing très lent + accélérations courtes selon distance.
- Pacing : vise ton allure cible (${targetPace}/km), pars contrôlé.
- Hydrate régulièrement, écoute ton corps.
- Final : accélère progressivement les derniers km si tu as la réserve.`;
};

/** Mapping subGoal → distance officielle (km) + clé pace cible dans TrainingPaces. */
const goalDistanceMap = (
  subGoal: string,
  trailDistKm?: number,
  hyroxDistKm?: number,
): { raceDistKm: number; paceKey: keyof TrainingPaces; titleSuffix: string } | null => {
  const lc = (subGoal || '').toLowerCase().replace(/\s+/g, ' ').trim();

  if (lc === 'marathon' || lc.includes('marathon') && !lc.includes('semi')) {
    return { raceDistKm: 42.195, paceKey: 'allureSpecifiqueMarathon', titleSuffix: 'Marathon' };
  }
  if (lc.includes('semi') || lc.includes('21')) {
    return { raceDistKm: 21.1, paceKey: 'allureSpecifiqueSemi', titleSuffix: 'Semi-marathon' };
  }
  if (lc === '10 km' || lc === '10km' || lc.includes('10 km')) {
    return { raceDistKm: 10, paceKey: 'allureSpecifique10k', titleSuffix: '10 km' };
  }
  if (lc === '5 km' || lc === '5km' || lc.includes('5 km')) {
    return { raceDistKm: 5, paceKey: 'allureSpecifique5k', titleSuffix: '5 km' };
  }
  if (lc.includes('trail') && trailDistKm && trailDistKm > 0) {
    return { raceDistKm: trailDistKm, paceKey: 'efPace', titleSuffix: `Trail ${trailDistKm} km` };
  }
  if (lc.includes('hyrox')) {
    return { raceDistKm: hyroxDistKm || 8, paceKey: 'allureSpecifique10k', titleSuffix: 'Hyrox' };
  }
  return null;
};

/**
 * Force la dernière séance du `raceDate` à être la course officielle.
 *
 * Algorithme :
 *  1) Vérifie qu'on a startDate + raceDate ; sinon no-op.
 *  2) weekIdx = floor((raceDate - startDate) / 7 jours) ; doit être dans plan.weeks.
 *  3) Trouve la séance positionnée sur le jour raceDate (dayName).
 *     - Si aucune séance ce jour-là : ajoute une nouvelle séance à la fin du tableau
 *       et marque pour que le tri front la place correctement.
 *  4) Retype la séance trouvée en course officielle avec marqueur _raceDay.
 *
 * @returns le `weekIdx` injecté (≥ 0) ou -1 si no-op.
 */
export const injectRaceSession = (
  plan: any,
  data: any,
  paces: TrainingPaces | undefined,
): number => {
  if (!plan || !plan.weeks || !Array.isArray(plan.weeks)) return -1;
  const raceDateRaw = plan.raceDate || data?.raceDate;
  const startDateRaw = plan.startDate;
  if (!raceDateRaw || !startDateRaw) return -1;

  const raceDate = new Date(raceDateRaw);
  const startDate = new Date(startDateRaw);
  if (isNaN(raceDate.getTime()) || isNaN(startDate.getTime())) return -1;

  // Calcul weekIdx (0-based) = floor((raceDate - startDate) / 7 jours).
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((raceDate.getTime() - startDate.getTime()) / msPerDay);
  if (diffDays < 0) {
    // raceDate antérieure au startDate → no-op (cas dégénéré).
    return -1;
  }
  const weekIdx = Math.floor(diffDays / 7);
  if (weekIdx < 0 || weekIdx >= plan.weeks.length) {
    // raceDate après endDate calculée → no-op.
    return -1;
  }

  const week = plan.weeks[weekIdx];
  if (!week || !Array.isArray(week.sessions)) return -1;

  const dayName = dayNameFromDate(raceDate);

  // Détecter le subGoal et calcul mapping.
  const subGoal = data?.subGoal || plan?.subGoal || '';
  const trailDistKm = data?.trailDetails?.distance;
  const trailElev = data?.trailDetails?.elevation;
  const hyroxDistKm = data?.hyroxDetails?.distance;
  const mapping = goalDistanceMap(subGoal, trailDistKm, hyroxDistKm);
  if (!mapping) return -1;

  const { raceDistKm, paceKey, titleSuffix } = mapping;
  const targetPace = (paces && (paces as any)[paceKey]) || (paces && paces.efPace) || '5:00';

  // raceTargetTime libre (data.targetTime peut être "Finisher" → on n'affiche pas de duration chrono).
  const raceTargetTime = data?.targetTime && data.targetTime !== 'Finisher'
    ? data.targetTime
    : undefined;

  // Trouve la session du jour raceDate dans la semaine ; sinon, en ajoute une.
  let raceSession = week.sessions.find((s: any) => s.day === dayName);
  if (!raceSession) {
    raceSession = { day: dayName };
    week.sessions.push(raceSession);
  }

  // Conversion en course officielle.
  raceSession.type = 'Course';
  raceSession.title = `COURSE — ${titleSuffix}`;
  raceSession.distance = `${raceDistKm} km`;
  if (raceTargetTime) {
    raceSession.duration = raceTargetTime;
  }
  raceSession.targetPace = targetPace;
  raceSession.intensity = 'Difficile';
  raceSession.warmup = '15-20 min échauffement progressif + accélérations courtes selon protocole compétition.';
  raceSession.mainSet = buildRaceDayMainSet(raceDistKm, subGoal, targetPace, trailElev, hyroxDistKm);
  raceSession.cooldown = '10-15 min marche / footing très lent + hydratation + étirements légers.';
  if (trailElev && trailElev > 0) {
    raceSession.elevationGain = trailElev;
  }
  raceSession._raceDay = true;

  // Tri standard de la semaine pour que la course se positionne au bon jour.
  week.sessions.sort((a: any, b: any) =>
    DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
  );

  return weekIdx;
};
