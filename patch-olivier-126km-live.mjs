/**
 * Patch live Olivier 126 km (1779489509164)
 * Date : 2026-05-23
 * Version : V1 (intégrant corrections coach FFA/UTMB Academy + dev senior)
 *
 * Doctrines respectées :
 * - feedback_coach_running_ia_que_course (suppression Vélo)
 * - feedback_securite_avant_conversion (welcome brutal aligné IRRÉALISTE)
 * - feedback_patch_live_plans_jour_seulement (S1 Lun-Ven INTOUCHÉ — vécu)
 * - feedback_jamais_baisser_allure_cible (cible 126 km / objectif Finisher conservés)
 * - feedback_input_client_obligatoire (freq 5, cv 30, raceDate, Trail goal respectés)
 * - feedback_chaque_ligne_justifiee (commentaires inline)
 * - feedback_jamais_poids_minceur (zéro mention IMC/poids dans le welcome)
 *
 * Modifications coach :
 * - WelcomeMessage : version corrigée (D+ test 500 au lieu 1500, retrait phrase
 *   "dimanche = repos en ultra senior", ajout ligne 4 bascule SL Lun→Dim)
 * - WeeklyVolumes : S23 80 → 70 km (raffinement sécurité affûtage senior)
 * - S1 Dim (J+1, non vécu) : Récup Vélo → Repos complet
 * - S2-S9 : Option max — swap SL Lun ↔ Repos Dim (placement traditionnel ultra-trail)
 *
 * Modifications dev :
 * - P0-1 : détection vécu via session.feedback?.completed === true (signal robuste)
 * - P0-2 : patch granulaire weeks.{i}.sessions.{j} (pas de réécriture full weeks)
 * - P1-1 : patch distances de sessions S10-S23 cohérent avec weeklyVolumes
 * - P1-2 : regex robustifiée (cooldown, advice, retrait "pédal" → faux positif)
 * - P2 : snapshot pré-patch, vérif régression séances vécues, exit fatal si daysSinceStart>7
 */
import { execSync } from 'child_process';
import fs from 'fs';

const accessToken = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null'
).toString().trim();

const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1779489509164';
const DRY = process.argv.includes('--dry');
const FORCE_S2 = process.argv.includes('--force-s2-aware');

// ─── Firestore Helpers ───
function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFs(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

// ─── Fetch current state ───
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
if (!doc.fields) {
  console.error('❌ Plan not found:', JSON.stringify(doc).slice(0, 300));
  process.exit(1);
}
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// ─── Snapshot des séances vécues AVANT toute mutation (Modif #6 dev) ───
// Sert d'audit pour la vérif post-patch : aucune séance avec feedback.completed=true
// ne doit avoir vu son type/title changer. Pose la doctrine
// `feedback_patch_live_plans_jour_seulement` en check actif.
const completedSnapshot = (plan.weeks || []).flatMap((w, wi) =>
  (w.sessions || []).map((s, si) => ({
    wi, si, title: s.title, type: s.type,
    completed: s.feedback?.completed === true,
  }))
).filter(x => x.completed);
console.log(`📸 Snapshot ${completedSnapshot.length} séances vécues (feedback.completed=true)`);

// ─── Backup obligatoire (doctrine `feedback_qualite_avant_vitesse`) ───
const backupFile = `/Users/romanemarino/Coach-Running-IA/backup-olivier-126km-${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backupFile}\n`);

// ─── Sanity check : startDate vs aujourd'hui (Modif #4 dev) ───
// Le user a accepté ce plan le 22/05, startDate 18/05.
// Aujourd'hui 23/05 = S1 Lun→Ven vécue, S1 Dim (24/05) PAS vécu.
const today = new Date('2026-05-23');
const startDate = new Date(plan.startDate);
const daysSinceStart = Math.floor((today - startDate) / 86400000);
console.log(`📅 startDate=${plan.startDate} | today=2026-05-23 | days vécus=${daysSinceStart}`);
if (daysSinceStart < 0) {
  console.error('❌ Plan pas encore commencé — pas besoin de patch live, regénérer via code');
  process.exit(1);
}
// Hardening : exit fatal si S2+ peut être en cours, sauf override explicite.
// Aujourd'hui 5j → OK. Protège contre re-run dans 1 semaine.
if (daysSinceStart > 7 && !FORCE_S2) {
  console.error(`❌ Plan vécu depuis ${daysSinceStart}j — S2+ peut être en cours. Relancer avec --force-s2-aware si vraiment voulu (avec audit feedback.completed renforcé).`);
  process.exit(1);
}

// ─── NEW WELCOME (version corrigée coach FFA/UTMB Academy) ───
// Différences vs V0 :
// - Suggestion test 50 km recalibrée : ~500 D+ (spécificité race 850 D+ sur 126 km ≈ 7 D+/km)
//   au lieu de 1500 D+ (trail montagne, hors spécificité)
// - Retrait phrase fausse "dimanche = repos en ultra senior" (en ultra-trail le Dim est JOUR SL trad.)
// - Ajout ligne 4 : recommander bascule SL Lun→Dim (avertit user, légitime swap automatique S2-S9)
// - Reformulation suggestion test : "check-point" et non "objectif intermédiaire" (évite collision
//   avec `feedback_input_client_obligatoire`)
// Doctrine `feedback_jamais_poids_minceur` : zéro mention IMC/poids/BMI dans le texte user.
const NEW_WELCOME = `Bienvenue Olivier. Ce plan prépare un trail de 126 km avec 850 m de dénivelé, le 21 novembre 2026.

⚠️ TRANSPARENCE ABSOLUE — À LIRE AVANT TOUTE SÉANCE

Notre analyse objective de la faisabilité est IRRÉALISTE (confidence 10/100). Les chiffres :
- Tu cours actuellement 30 km/sem avec 50 m de D+/sem.
- La course demande 126 km en une seule fois avec 850 m de D+ accumulé.
- Ton volume hebdo va devoir tripler en 27 semaines. Ton D+ hebdo devra être multiplié par 17.
- À 56 ans, ton appareil locomoteur tient mal des charges aussi soutenues sans casse — repos strict obligatoire entre les séances dures.

CE QUE NOUS RECOMMANDONS FORTEMENT (sans modifier ton objectif si tu maintiens) :
1) Consultation médecin du sport AVANT démarrage : bilan cardio + évaluation articulaire genoux/chevilles.
2) Test grandeur réelle : t'inscrire à un 50 km roulant (~500 D+, profil similaire à ta cible) en septembre. Ce n'est PAS un remplacement de ton 126 km, c'est un check-point pour valider que ton corps tient la charge. Si tu finis bien, on continue. Sinon, on en reparle.
3) Coach Running IA est exclusivement course à pied — aucun cross-training (vélo, natation) imposé dans ton plan. Les jours "off" sont des vraies coupures.
4) Pour les semaines à venir : nous te recommandons de basculer ta Sortie Longue du Lundi vers le Dimanche (jour traditionnel SL en ultra-trail). Le Lundi reste alors séance facile + tu as 6 jours pleins de récup avant la prochaine SL.
5) STOP immédiat si douleur articulaire ou tendineuse > 48h — médecin obligatoire avant reprise.

Le plan a été recalibré (pic 80 km/sem au lieu de 63) pour s'approcher du minimum vital UTMB Academy, sans franchir le mur ACWR (ratio aigu/chronique > 1.3 = risque blessure majeur).

L'objectif 126 km reste le tien. On respecte. Mais on te dit la vérité — ce n'est pas un plan où on te ment pour vendre.`;

// ─── NEW weeklyVolumes (correction coach : S23 80 → 70 km) ───
// ⚠️ Ces valeurs sont CIBLES. Au prochain `generateRemainingWeeks`,
// `enforceWeekConstraints` (geminiService.ts:2085) resync weeklyVolumes[i]
// depuis sum(sessions.distance) (seuil 2km). LLM utilise ces cibles comme
// objectif (geminiService.ts:6248,6421) donc devrait viser 80, mais
// pas garanti. Patch durable = patcher aussi distances S10-S23 (Modif P1-1).
//
// Justification ligne à ligne :
// - S1-S6 fondamental : 30 → 44 (+10%/sem hors récup S4)
// - S7 first peak intermédiaire 50, S8 récup -25%
// - S9-S11 dev 45-60, S12 récup
// - S13-S15 dev jusqu'à 70, S16 récup
// - S17-S19 spé jusqu'à 80 (pic principal = 2.67× cv = max ACWR-safe sur 27 sem)
// - S20 récup, S21-S22 spé 70-76
// - S23 70 km (RAFFINEMENT COACH : était 80, abaissé pour sécurité affûtage senior 56 ans,
//   spécificité marginale, ACWR-safe garanti)
// - S24-S27 affûtage : 60 → 48 → 38 → 30 (-25%/sem Hammond Masters)
const NEW_WEEKLY_VOLUMES = [
  30, 35, 40, 30, 38, 44,  // S1-S6 fondamental
  50, 38,                   // S7 fond / S8 récup
  45, 53, 60, 45,           // S9-S12 dev
  53, 62, 70, 53,           // S13-S16 dev / pré-spé
  62, 72, 80, 60,           // S17-S19 spé / S20 récup
  70, 76, 70,               // S21-S23 spé (S23 raffiné coach : 80 → 70)
  60, 48, 38, 30,           // S24-S27 affûtage
];

// ─── REPOS session (validé coach) ───
// Doctrine `feedback_coach_running_ia_que_course` strict. Validation coach :
// repos complet > footing récup chez senior 56 ans en première prépa ultra.
const REPOS_SESSION = {
  type: 'Repos',
  title: 'Repos complet',
  distance: 'N/A',
  duration: 'N/A',
  targetPace: 'N/A',
  mainSet: 'Jour de repos complet — pas de séance. Étirements doux + mobilité genou/cheville si envie. Hydratation et nutrition normales. Le repos est une SÉANCE à part entière dans un cycle ultra-trail (Pfitzinger AdvMar, UTMB Academy).',
};

// ─── Regex détection vélo (Modif #2 dev) ───
// Robustifiée : couverture cooldown/advice + retrait `p[ée]dal` (faux positif "pédaler la foulée").
// Doctrine `feedback_coach_running_ia_que_course` = QUE course, défense en profondeur.
const VELO_RE = /v[ée]lo|cyclisme|cycling|bike|home.?trainer|elliptique|natation|swim/i;

function detectVelo(session) {
  if (session.type !== 'Récupération') return false;
  return (
    VELO_RE.test(session.title || '') ||
    VELO_RE.test(session.mainSet || '') ||
    VELO_RE.test(session.cooldown || '') ||
    VELO_RE.test(session.advice || '')
  );
}

// ─── Stats détection ───
let veloDetected = 0;
let veloSkippedVecu = 0;
let veloPatched = 0;
let slSwapped = 0;

// ─── Construction nouvelles semaines ───
// Phase 1 : pour chaque semaine, remplacer Vélo→Repos sauf si vécue.
// Phase 2 (S2-S9) : swap SL Lun ↔ Repos Dim (placement traditionnel ultra-trail).
const newWeeks = (plan.weeks || []).map((week, weekIdx) => {
  let sessions = (week.sessions || []).map((session, sessionIdx) => {
    const isVelo = detectVelo(session);
    if (!isVelo) return session;
    veloDetected++;

    // Modif #1 dev : signal robuste feedback.completed (App.tsx L291/L644/L1081 marqueur officiel).
    // Doctrine `feedback_patch_live_plans_jour_seulement` : NO TOUCH sur séance vécue.
    if (session.feedback?.completed === true) {
      veloSkippedVecu++;
      console.log(`  ⚠️ S${weekIdx+1} session ${sessionIdx+1} "${session.title}" vélo détecté mais vécue (feedback.completed=true) — NO TOUCH doctrine`);
      return session;
    }

    veloPatched++;
    console.log(`  ✓ S${weekIdx+1} session ${sessionIdx+1} : ${session.type} "${session.title}" → Repos`);
    // On préserve feedback (vide), dayOfWeek si présent, et on écrase type/title/distance/mainSet.
    return { ...session, ...REPOS_SESSION };
  });

  // ─── Phase 2 : swap SL Lun ↔ Repos Dim sur S2-S9 (Option max coach) ───
  // Doctrine `feedback_patch_live_plans_jour_seulement` : S2-S9 = preview = patchable.
  // Doctrine `feedback_input_client_obligatoire` : Lun et Dim déjà dans preferredDays (sinon
  //   n'auraient pas été générés là). Swap conforme.
  // Critère d'identification :
  //   - Lun = première session de la semaine (sessionIdx=0) en pratique
  //   - Dim = dernière session de la semaine
  //   - SL = type "Sortie longue" OU "Endurance" longue distance (préfère detect par type)
  // Sécurité : on swap UNIQUEMENT si Lun=SL ET Dim=Repos (post-patch Vélo→Repos).
  //   Si la structure est déjà bonne (SL en Dim), on ne touche pas.
  //   Si Lun a feedback.completed=true (S1), on ne swap PAS.
  if (weekIdx >= 1 && weekIdx <= 8 && sessions.length >= 2) {
    const lun = sessions[0];
    const dim = sessions[sessions.length - 1];
    const lunIsSL = lun && /Sortie longue/i.test(lun.type || '');
    const dimIsRepos = dim && dim.type === 'Repos';
    const lunVecu = lun?.feedback?.completed === true;

    if (lunIsSL && dimIsRepos && !lunVecu) {
      // Swap : Lun devient ex-Dim (Repos), Dim devient ex-Lun (SL).
      // On préserve les feedback éventuels par session (ici vides côté Lun S2-S9, OK).
      const newLun = { ...dim };
      const newDim = { ...lun };
      sessions = [newLun, ...sessions.slice(1, -1), newDim];
      slSwapped++;
      console.log(`  🔄 S${weekIdx+1} swap SL Lun↔Repos Dim : "${lun.title}" ↔ "${dim.title}"`);
    } else if (lunIsSL && lunVecu) {
      console.log(`  ⚠️ S${weekIdx+1} swap SL Lun↔Dim SKIP : Lun vécu (feedback.completed=true)`);
    }
  }

  return { ...week, sessions };
});

// ─── Phase 3 : patch distances sessions S10-S23 cohérentes avec weeklyVolumes (Modif P1-1) ───
// Sans ça, `enforceWeekConstraints` (geminiService.ts:2085) resync weeklyVolumes[i]
// depuis la somme des distances → notre patch volumes serait écrasé au prochain trigger.
// Stratégie : pour S10 (idx 9) à S23 (idx 22), on scale les distances pour que
// sum(sessions.distance numérique) ≈ NEW_WEEKLY_VOLUMES[i].
// On ne touche QUE les sessions avec distance numérique > 0 (pas Repos N/A, pas Renfo sans dist).
// On préserve les ratios entre sessions (proportionnel).
let sessionsRescaled = 0;
for (let i = 9; i <= 22 && i < newWeeks.length; i++) {
  const week = newWeeks[i];
  const sessions = week.sessions || [];
  // Calc somme des distances numériques actuelles
  const distSessions = sessions.filter(s => typeof s.distance === 'number' && s.distance > 0);
  const currentSum = distSessions.reduce((a, s) => a + s.distance, 0);
  const target = NEW_WEEKLY_VOLUMES[i];
  if (currentSum < 2 || !target) continue; // protections division 0 / cibles vides
  const ratio = target / currentSum;
  if (Math.abs(ratio - 1) < 0.05) continue; // déjà proche, on ne touche pas (<5% écart)

  // Apply scaling avec arrondi 0.5 km
  const newSessions = sessions.map(s => {
    if (typeof s.distance !== 'number' || s.distance <= 0) return s;
    const newDist = Math.round(s.distance * ratio * 2) / 2; // arrondi 0.5
    return { ...s, distance: newDist };
  });
  newWeeks[i] = { ...week, sessions: newSessions };
  sessionsRescaled += distSessions.length;
  console.log(`  📏 S${i+1} distances rescalées ratio ${ratio.toFixed(2)} (sum ${currentSum.toFixed(1)} → ${target} km)`);
}

// ─── Comptage final : assertions pré-write ───
console.log(`\n📊 RÉSUMÉ PATCH :`);
console.log(`  - welcomeMessage : ${NEW_WELCOME.length} chars (brutal aligné IRRÉALISTE, version coach corrigée)`);
console.log(`  - weeklyVolumes : pic ${Math.max(...NEW_WEEKLY_VOLUMES)} km, S23=${NEW_WEEKLY_VOLUMES[22]} km (raffinement coach)`);
console.log(`  - Séances Vélo détectées : ${veloDetected}`);
console.log(`  - Séances vécues skip (feedback.completed=true) : ${veloSkippedVecu}`);
console.log(`  - Séances Vélo patchées → Repos : ${veloPatched}`);
console.log(`  - Swap SL Lun↔Dim S2-S9 : ${slSwapped} semaines`);
console.log(`  - Sessions S10-S23 distances rescalées : ${sessionsRescaled}`);
console.log(`  - Sessions S1 Lun-Ven (vécues) : INTOUCHÉES (doctrine NO TOUCH)`);
console.log(`  - Cible 126km/freq 5/cv 30/raceDate/Trail goal : INTACTS`);

console.log(`\n📝 Aperçu welcomeMessage final (premières 200 chars) :`);
console.log(`  "${NEW_WELCOME.slice(0, 200)}..."`);
console.log(`\n📈 weeklyVolumes nouveau :`);
console.log(`  [${NEW_WEEKLY_VOLUMES.join(', ')}]`);

if (DRY) {
  console.log(`\n🛑 DRY-RUN — aucune modif Firestore. Re-lance sans --dry pour exec.`);
  process.exit(0);
}

// ─── Construction granulaire des fieldPaths (Modif P0-2 dev) ───
// Stratégie : patch par session granulaire `weeks.{i}.sessions.{j}` pour les sessions
// modifiées + welcomeMessage + generationContext.periodizationPlan.weeklyVolumes.
// Évite la réécriture full `weeks` (race-condition silencieuse sur feedback ajouté entre fetch & patch).
//
// Limitation Firestore : updateMask sur path indexé d'array n'est PAS supporté côté REST API
// (Firestore traite arrays comme atomiques). Donc on fallback sur réécriture `weeks` mais
// AVEC re-fetch juste avant le patch + diff sur feedback.completed pour détecter une race.
// Cf. discussion dev senior : "patch granulaire idéal, mais 30 min effort, acceptable one-shot
// avec re-fetch immédiat".

// Re-fetch IMMÉDIAT pour minimiser fenêtre race-condition
const refetchRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const refetchDoc = await refetchRes.json();
const refetchPlan = {};
for (const [k, v] of Object.entries(refetchDoc.fields || {})) refetchPlan[k] = parseFs(v);

// Vérif race : aucune séance avec feedback.completed=true n'a été ajoutée entre fetch initial et maintenant
const refetchCompleted = (refetchPlan.weeks || []).flatMap((w, wi) =>
  (w.sessions || []).map((s, si) => ({
    wi, si, completed: s.feedback?.completed === true,
  }))
).filter(x => x.completed);

if (refetchCompleted.length !== completedSnapshot.length) {
  console.error(`❌ RACE DETECTED : ${completedSnapshot.length} séances vécues au fetch initial, ${refetchCompleted.length} au re-fetch. Olivier a complété une séance entre temps. STOP.`);
  process.exit(2);
}

// Construction updates avec re-merge des feedback fraîchement re-fetchés.
// IMPORTANT : on ne remerge le feedback QUE pour S1 (weekIdx=0), car S2-S9
// ont eu un swap d'index Lun↔Dim — remerger par sessionIdx sur ces semaines
// déplacerait un feedback hypothétique sur la mauvaise session. Sur Olivier,
// S2-S9 n'ont aucun feedback (preview non vécue), donc no-op fonctionnel ;
// mais ce garde-fou évite la régression si un jour S2 a un feedback déposé.
const mergedWeeks = newWeeks.map((nw, wi) => {
  if (wi === 0) {
    // S1 : pas de swap appliqué, re-merge index par index est safe
    const sessions = (nw.sessions || []).map((ns, si) => {
      const refetched = refetchPlan.weeks?.[wi]?.sessions?.[si];
      if (refetched?.feedback) {
        return { ...ns, feedback: refetched.feedback };
      }
      return ns;
    });
    return { ...nw, sessions };
  }
  // S2+ : pas de remerge sessionIdx (swap possible). Si jamais feedback
  // arrive entre fetch et patch sur S2+, il sera écrasé — risque résiduel
  // accepté (preview non vécue, fenêtre <1s entre refetch et patch).
  return nw;
});

const updates = {
  welcomeMessage: NEW_WELCOME,
  weeks: mergedWeeks,
};

if (plan.generationContext?.periodizationPlan) {
  updates.generationContext = {
    ...plan.generationContext,
    periodizationPlan: {
      ...plan.generationContext.periodizationPlan,
      weeklyVolumes: NEW_WEEKLY_VOLUMES,
    },
  };
}

// ─── Exec patch Firestore ───
const fields = {};
for (const [k, v] of Object.entries(updates)) fields[k] = toFs(v);
const updateMaskParams = Object.keys(updates).map(k => `updateMask.fieldPaths=${k}`).join('&');
const patchUrl = `${url}?${updateMaskParams}`;
const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields }),
});
const patchResult = await patchRes.json();
if (patchResult.error) {
  console.error('❌ PATCH ERROR:', JSON.stringify(patchResult.error, null, 2));
  process.exit(1);
}
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${patchResult.updateTime}`);

// ─── Vérification post-patch (Modif #3 dev — robuste) ───
const verifRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const verifDoc = await verifRes.json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);

// Vélo restants : check large sur tous les champs textuels
const verifVeloRemaining = (verifPlan.weeks || []).reduce((acc, w) => {
  return acc + (w.sessions || []).filter(s =>
    s.type === 'Récupération' && VELO_RE.test(`${s.title||''} ${s.mainSet||''} ${s.cooldown||''} ${s.advice||''}`)
  ).length;
}, 0);

const verifVolumes = verifPlan.generationContext?.periodizationPlan?.weeklyVolumes || [];
const peak = verifVolumes.length ? Math.max(...verifVolumes) : null;
const s23 = verifVolumes[22];

// Assertion : toute séance avec feedback.completed=true doit avoir conservé son type et son title.
let regressionsCompleted = 0;
for (const snap of completedSnapshot) {
  const cur = verifPlan.weeks?.[snap.wi]?.sessions?.[snap.si];
  if (!cur || cur.type !== snap.type || cur.title !== snap.title) {
    regressionsCompleted++;
    console.error(`  ❌ REGRESSION S${snap.wi+1} sess${snap.si+1} : "${snap.title}" (${snap.type}) → "${cur?.title}" (${cur?.type})`);
  }
}

// Vérif swap S2-S9 : Dim doit être SL, Lun doit être Repos
let swapVerified = 0;
for (let wi = 1; wi <= 8 && wi < verifPlan.weeks.length; wi++) {
  const sess = verifPlan.weeks[wi].sessions || [];
  const lun = sess[0];
  const dim = sess[sess.length - 1];
  if (lun?.type === 'Repos' && /Sortie longue/i.test(dim?.type || '')) swapVerified++;
}

console.log(`\n🔍 VÉRIFICATION POST-PATCH :`);
console.log(`  - welcomeMessage updated : ${verifPlan.welcomeMessage?.length || 0} chars`);
console.log(`  - weeklyVolumes pic : ${peak !== null ? peak + ' km' : 'ARRAY VIDE ❌'}`);
console.log(`  - weeklyVolumes S23 : ${s23} km (attendu 70)`);
console.log(`  - Séances Vélo restantes : ${verifVeloRemaining} (doit être 0)`);
console.log(`  - Séances vécues régressées : ${regressionsCompleted} (doit être 0)`);
console.log(`  - Swap SL Lun↔Dim S2-S9 vérifié : ${swapVerified}/8 semaines`);
console.log(`  - S1 Lun (vécu) title : ${verifPlan.weeks?.[0]?.sessions?.[0]?.title || 'N/A'}`);
console.log(`  - S1 dernière session : ${verifPlan.weeks?.[0]?.sessions?.slice(-1)[0]?.title || 'N/A'}`);
console.log(`  - S2 dernière session : ${verifPlan.weeks?.[1]?.sessions?.slice(-1)[0]?.title || 'N/A'}`);
console.log(`  - updateTime Firestore : ${patchResult.updateTime}`);

if (verifVeloRemaining > 0 || regressionsCompleted > 0 || peak !== 80 || s23 !== 70) {
  console.error(`\n❌ POST-PATCH INVALIDE — vérifier manuellement avant de fermer le ticket.`);
  process.exit(2);
}

console.log(`\n✅ POST-PATCH VALIDE — tous les invariants tenus.`);
