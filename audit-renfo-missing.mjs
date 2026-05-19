/**
 * AUDIT BATCH — Détection des plans avec séance Renforcement MANQUANTE en S1
 *
 * Contexte :
 *  - Doctrine : freq X = (X-1) course + 1 renfo (cf. memory project_coach_running_ia_frequence)
 *  - Prompt geminiService.ts L3714 instruit Gemini : "OBLIGATOIRE : 1 séance Renforcement / sem"
 *  - MAIS aucune fonction enforceWeekConstraints / enforceFullPlanConstraints ne FORCE l'ajout
 *    d'un renfo si Gemini l'oublie — elles ne font que SKIP les sessions Renforcement.
 *  - Cas concret : georgeslor1@gmail.com (plan 1779089493075, freq=5) → S1 sans aucun renfo.
 *
 * Mission : auditer les plans createdAt >= 2026-05-15 (2 jours baseline + 1 jour post deploy J3 du 17/05)
 * et calculer le taux de renfo manquant pour mesurer si c'est une régression J3 ou un bug ancien.
 *
 * LECTURE SEULE — aucune écriture Firestore.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };

const CUTOFF_BASELINE = '2026-05-15T00:00:00Z';
const CUTOFF_DEPLOY_J3 = '2026-05-17T00:00:00Z';
const TODAY = '2026-05-18';

// ─── helpers Firestore REST → JS ───
function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(f) { if (!f) return {}; const o = {}; for (const [k, v] of Object.entries(f)) o[k] = pv(v); return o; }

// ─── Récupération plans via runQuery avec filtre createdAt ───
console.log(`Lecture plans Firestore (createdAt >= ${CUTOFF_BASELINE})...`);

async function queryPlans() {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'plans' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'createdAt' },
          op: 'GREATER_THAN_OR_EQUAL',
          value: { stringValue: CUTOFF_BASELINE }
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }]
    }
  };
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await res.json();
  return j.filter(x => x.document).map(x => ({ id: x.document.name.split('/').pop(), ...pf(x.document.fields) }));
}

// Fallback : si createdAt n'est PAS stocké comme stringValue (peut être timestampValue),
// on retente avec timestampValue puis on fait une liste complète si besoin
async function queryPlansFallback() {
  console.log('  → fallback : list all plans + filter en mémoire');
  const all = [];
  let pageToken = null;
  while (true) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: H });
    const j = await res.json();
    (j.documents || []).forEach(d => all.push({ id: d.name.split('/').pop(), ...pf(d.fields) }));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return all.filter(p => {
    const c = String(p.createdAt || '');
    return c >= CUTOFF_BASELINE;
  });
}

let plans = [];
try {
  plans = await queryPlans();
  console.log(`  ${plans.length} plans (via runQuery)`);
  if (plans.length === 0) {
    plans = await queryPlansFallback();
    console.log(`  ${plans.length} plans (via fallback)`);
  }
} catch (e) {
  console.log(`  Erreur runQuery: ${e.message} → fallback`);
  plans = await queryPlansFallback();
}

// ─── Récupération users pour mapper UID → email ───
console.log(`Lecture users...`);
const userIds = [...new Set(plans.map(p => p.userId).filter(Boolean))];
const userMap = {};
for (const uid of userIds) {
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers: H });
    if (r.status === 200) {
      const u = pf((await r.json()).fields);
      userMap[uid] = u.email || u.userEmail || null;
    }
  } catch { /* skip */ }
}

// Si l'email n'est pas dans Firestore users, fallback via Identity Toolkit (batch)
const missingEmailUids = userIds.filter(uid => !userMap[uid]);
if (missingEmailUids.length > 0) {
  console.log(`  ${missingEmailUids.length} users sans email Firestore → Identity Toolkit`);
  for (let i = 0; i < missingEmailUids.length; i += 100) {
    const chunk = missingEmailUids.slice(i, i + 100);
    try {
      const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
        { method: 'POST', headers: H, body: JSON.stringify({ localId: chunk }) });
      const j = await r.json();
      (j.users || []).forEach(u => { if (u.localId && u.email) userMap[u.localId] = u.email; });
    } catch { /* skip */ }
  }
}

// ─── Analyse de chaque plan ───
console.log(`\nAnalyse de ${plans.length} plans...`);

const results = [];
for (const p of plans) {
  const ctx = p.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const freq = p.sessionsPerWeek || snap.frequency || null;
  const goal = p.goal || snap.goal || null;
  const subGoal = p.subGoal || snap.subGoal || null;
  const weeks = p.weeks || [];

  const w1 = weeks[0] || { sessions: [] };
  const s1Sessions = w1.sessions || [];
  const s1Types = s1Sessions.map(s => s.type || '');
  const hasRenfoS1 = s1Types.some(t => t === 'Renforcement');

  // Doctrine : renfo obligatoire dès freq >= 2 (cf L2249 : runningSess = max(1, freq-1))
  // Mais le seuil "critique" demandé : freq >= 3
  const renfoMissingButRequired = !hasRenfoS1 && freq && freq >= 3;
  const renfoMissingAnyFreq = !hasRenfoS1 && freq && freq >= 2;

  // Compter semaines sans renfo (full plan uniquement)
  let weeksWithoutRenfo = 0;
  const weeksWithoutRenfoList = [];
  if (p.fullPlanGenerated && weeks.length > 1) {
    for (let i = 0; i < weeks.length; i++) {
      const ws = (weeks[i].sessions || []);
      const hasRenfo = ws.some(s => s.type === 'Renforcement');
      if (!hasRenfo) {
        weeksWithoutRenfo++;
        weeksWithoutRenfoList.push(i + 1);
      }
    }
  }

  results.push({
    planId: p.id,
    userId: p.userId || null,
    email: userMap[p.userId] || null,
    createdAt: p.createdAt || null,
    createdAtDay: String(p.createdAt || '').substring(0, 10),
    isPreview: p.isPreview === true,
    fullPlanGenerated: p.fullPlanGenerated === true,
    frequency: freq,
    goal,
    subGoal,
    weeksCount: weeks.length,
    s1SessionsCount: s1Sessions.length,
    s1Types,
    hasRenfoS1,
    renfoMissingButRequired,
    renfoMissingAnyFreq,
    weeksWithoutRenfo,
    weeksWithoutRenfoList,
  });
}

// ─── Synthèse ───
const total = results.length;
const missingS1 = results.filter(r => r.renfoMissingButRequired).length;
const missingAnyFreq = results.filter(r => r.renfoMissingAnyFreq).length;

// Par jour
const byDay = {};
for (const r of results) {
  const d = r.createdAtDay;
  if (!byDay[d]) byDay[d] = { total: 0, missing: 0, missingAny: 0 };
  byDay[d].total++;
  if (r.renfoMissingButRequired) byDay[d].missing++;
  if (r.renfoMissingAnyFreq) byDay[d].missingAny++;
}

// Par frequency
const byFreq = {};
for (const r of results) {
  const f = r.frequency || 'unknown';
  if (!byFreq[f]) byFreq[f] = { total: 0, missing: 0 };
  byFreq[f].total++;
  if (!r.hasRenfoS1) byFreq[f].missing++;
}

// Baseline (avant J3 deploy 17/05) vs post J3
const baseline = results.filter(r => r.createdAt < CUTOFF_DEPLOY_J3);
const postJ3 = results.filter(r => r.createdAt >= CUTOFF_DEPLOY_J3);
const baselineMissing = baseline.filter(r => r.renfoMissingButRequired).length;
const postJ3Missing = postJ3.filter(r => r.renfoMissingButRequired).length;
const baselinePct = baseline.length > 0 ? (baselineMissing / baseline.length * 100) : 0;
const postJ3Pct = postJ3.length > 0 ? (postJ3Missing / postJ3.length * 100) : 0;

// Liste plans impactés (freq >=3 sans renfo S1)
const impacted = results
  .filter(r => r.renfoMissingButRequired)
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

// Verdict
let verdict = 'RAS';
let pattern = '';
let action = '';
if (postJ3.length >= 5) {
  if (postJ3Pct > 20 && postJ3Pct > baselinePct + 10) {
    verdict = 'RÉGRESSION CRITIQUE J3';
    action = 'patch immédiat (garde-fou enforceWeekConstraints qui INJECTE renfo si manquant) + régénération des plans impactés';
  } else if (postJ3Pct > 20) {
    verdict = 'BUG ANCIEN (taux élevé constant)';
    action = 'patch sans régénération urgente (problème antérieur au J3)';
  } else if (postJ3Pct > 5) {
    verdict = 'BUG SPORADIQUE';
    action = 'patch préventif recommandé';
  } else {
    verdict = 'RAS';
    action = 'cas isolé (georgeslor1), pas de pattern systémique';
  }
} else {
  // Très peu de plans post J3 → on regarde global
  const totalPct = total > 0 ? (missingS1 / total * 100) : 0;
  if (totalPct > 20) { verdict = 'BUG SIGNIFICATIF'; action = 'patch recommandé'; }
  else if (totalPct > 5) { verdict = 'BUG SPORADIQUE'; action = 'patch préventif'; }
}

// Pattern : quelle frequency est la plus impactée
const freqRates = Object.entries(byFreq)
  .map(([f, v]) => ({ freq: f, total: v.total, missing: v.missing, pct: v.total > 0 ? (v.missing / v.total * 100) : 0 }))
  .sort((a, b) => b.pct - a.pct);
if (freqRates.length > 0 && freqRates[0].pct > 10) {
  pattern = `freq=${freqRates[0].freq} la plus impactée (${freqRates[0].missing}/${freqRates[0].total} = ${freqRates[0].pct.toFixed(0)}%)`;
}

// ─── Output JSON brut ───
const jsonOut = {
  meta: {
    runDate: new Date().toISOString(),
    today: TODAY,
    cutoffBaseline: CUTOFF_BASELINE,
    cutoffDeployJ3: CUTOFF_DEPLOY_J3,
    totalPlansAudited: total,
  },
  synthese: {
    total,
    missingS1RequiredFreq3plus: missingS1,
    missingS1AnyFreq: missingAnyFreq,
    pctMissingS1Required: total > 0 ? (missingS1 / total * 100) : 0,
    baseline: { period: `${CUTOFF_BASELINE} → ${CUTOFF_DEPLOY_J3}`, total: baseline.length, missing: baselineMissing, pct: baselinePct },
    postJ3: { period: `${CUTOFF_DEPLOY_J3} → now`, total: postJ3.length, missing: postJ3Missing, pct: postJ3Pct },
  },
  byDay,
  byFrequency: byFreq,
  freqRates,
  impacted: impacted.slice(0, 200),
  verdict,
  pattern,
  action,
  allResults: results,
};

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-renfo-missing.json', JSON.stringify(jsonOut, null, 2));
console.log(`\nJSON: /Users/romanemarino/Coach-Running-IA/audit-renfo-missing.json`);

// ─── Markdown ───
const md = [];
md.push(`# Audit batch renfo manquant`);
md.push(`Date: ${TODAY}`);
md.push(``);
md.push(`## Contexte`);
md.push(``);
md.push(`Bug remonté via georgeslor1@gmail.com (plan 1779089493075, freq=5) : S1 sans aucun renfo.`);
md.push(`Doctrine : freq X = (X-1) course + 1 renfo (renfo obligatoire dès freq=2 dans le code L2249 de geminiService.ts).`);
md.push(`Le prompt L3714 instruit Gemini "OBLIGATOIRE : 1 séance Renforcement par semaine", mais **aucune fonction enforce ne FORCE l'ajout si Gemini l'oublie**.`);
md.push(``);
md.push(`## Audit code — enforceWeekConstraints / enforceFullPlanConstraints`);
md.push(``);
md.push(`Inspection de \`src/services/geminiService.ts\` :`);
md.push(`- **enforceWeekConstraints (L1230)** : traite SL caps, proportion, durée, fractionné. Renforcement → \`if (s.type === 'Renforcement') return;\` (SKIP uniquement, **JAMAIS d'injection**).`);
md.push(`- **enforceFullPlanConstraints (L1820)** : traite affûtage cross-semaines, progression +15%, re-cap sessions. Renforcement → SKIP. **Aucune injection.**`);
md.push(`- **Conclusion code** : si Gemini omet le renfo, aucun garde-fou ne le rattrape côté serveur.`);
md.push(``);
md.push(`## Synthèse`);
md.push(``);
md.push(`- Total plans audités : **${total}**`);
md.push(`- Période : **2026-05-15 → ${TODAY}**`);
md.push(`- Plans avec renfo S1 MANQUANT (freq >=3) : **${missingS1} (${total > 0 ? (missingS1 / total * 100).toFixed(1) : 0}%)**`);
md.push(`- Plans avec renfo S1 MANQUANT (toutes freq >=2) : **${missingAnyFreq} (${total > 0 ? (missingAnyFreq / total * 100).toFixed(1) : 0}%)**`);
md.push(``);
md.push(`### Baseline (avant deploy J3 du 17/05) vs Post J3`);
md.push(``);
md.push(`| Période | Total plans | Sans renfo S1 (freq>=3) | % |`);
md.push(`|---|---|---|---|`);
md.push(`| Baseline (15-16 mai) | ${baseline.length} | ${baselineMissing} | ${baselinePct.toFixed(1)}% |`);
md.push(`| Post J3 (>=17 mai) | ${postJ3.length} | ${postJ3Missing} | ${postJ3Pct.toFixed(1)}% |`);
md.push(`| Δ post J3 vs baseline | | | ${(postJ3Pct - baselinePct).toFixed(1)} pp |`);
md.push(``);
md.push(`## Distribution par jour`);
md.push(``);
md.push(`| Date | Total | Sans renfo S1 (freq>=3) | Sans renfo S1 (any freq) | % |`);
md.push(`|---|---|---|---|---|`);
Object.entries(byDay).sort().forEach(([d, v]) => {
  md.push(`| ${d} | ${v.total} | ${v.missing} | ${v.missingAny} | ${v.total > 0 ? (v.missing / v.total * 100).toFixed(0) : 0}% |`);
});
md.push(``);
md.push(`## Distribution par frequency`);
md.push(``);
md.push(`| Freq | Total | Sans renfo S1 | % |`);
md.push(`|---|---|---|---|`);
freqRates.forEach(r => {
  md.push(`| ${r.freq} | ${r.total} | ${r.missing} | ${r.pct.toFixed(0)}% |`);
});
md.push(``);
md.push(`## Liste des plans impactés (freq >=3, S1 sans renfo) — top 50`);
md.push(``);
md.push(`| Email | Plan ID | Date | Freq | Goal | isPreview | fullPlan | S1 types |`);
md.push(`|---|---|---|---|---|---|---|---|`);
impacted.slice(0, 50).forEach(r => {
  md.push(`| ${r.email || '(no email)'} | ${r.planId} | ${(r.createdAt || '').substring(0, 19)} | ${r.frequency} | ${r.goal || '?'}${r.subGoal ? ' / ' + r.subGoal : ''} | ${r.isPreview ? 'oui' : 'non'} | ${r.fullPlanGenerated ? 'oui' : 'non'} | ${r.s1Types.join(', ')} |`);
});
md.push(``);

// Plans full impactés : aussi vérifier semaines 2-N
const fullPlansWithMissingWeeks = results
  .filter(r => r.fullPlanGenerated && r.weeksWithoutRenfo > 0 && r.frequency >= 3)
  .sort((a, b) => b.weeksWithoutRenfo - a.weeksWithoutRenfo);
if (fullPlansWithMissingWeeks.length > 0) {
  md.push(`## Plans FULL avec semaines sans renfo (multi-semaines)`);
  md.push(``);
  md.push(`| Email | Plan ID | Freq | Total sem | Sem sans renfo | Liste |`);
  md.push(`|---|---|---|---|---|---|`);
  fullPlansWithMissingWeeks.slice(0, 30).forEach(r => {
    md.push(`| ${r.email || '(no email)'} | ${r.planId} | ${r.frequency} | ${r.weeksCount} | ${r.weeksWithoutRenfo} | ${r.weeksWithoutRenfoList.join(', ')} |`);
  });
  md.push(``);
}

md.push(`## Verdict`);
md.push(``);
md.push(`- Régression J3 : **${verdict.includes('RÉGRESSION') ? 'OUI' : 'NON'}**`);
md.push(`- Diagnostic : ${verdict}`);
md.push(`- Pattern : ${pattern || '(aucun pattern net détecté)'}`);
md.push(`- Action recommandée : **${action}**`);
md.push(``);
md.push(`## Patch recommandé`);
md.push(``);
md.push(`Ajouter dans \`enforceWeekConstraints\` (geminiService.ts L1230) un bloc d'INJECTION :`);
md.push(``);
md.push('```ts');
md.push(`// --- Garde-fou : INJECTER 1 renfo par semaine si manquant ---`);
md.push(`// Doctrine : freq X = (X-1) course + 1 renfo (cf L3714 du prompt)`);
md.push(`// Sans ce garde-fou, si Gemini omet le renfo, aucune correction côté code.`);
md.push(`const hasRenfo = week.sessions.some((s: any) => s.type === 'Renforcement');`);
md.push(`const freq = questionnaireData?.frequency || 0;`);
md.push(`if (!hasRenfo && freq >= 2) {`);
md.push(`  // Construire séance renfo via buildRenfoMainSet (déjà importé L5)`);
md.push(`  // + insérer sur jour OFF ou remplacer footing le moins prioritaire`);
md.push(`  // (logique à définir avec Romane)`);
md.push(`}`);
md.push('```');
md.push(``);
md.push(`## Données brutes`);
md.push(``);
md.push(`Voir \`audit-renfo-missing.json\` pour la liste complète et les détails par plan.`);

writeFileSync('/Users/romanemarino/Coach-Running-IA/AUDIT-RENFO-MISSING.md', md.join('\n'));
console.log(`Markdown: /Users/romanemarino/Coach-Running-IA/AUDIT-RENFO-MISSING.md`);

// Synthèse console
console.log(`\n${'='.repeat(70)}`);
console.log(`SYNTHÈSE — Renfo S1 manquant`);
console.log(`${'='.repeat(70)}`);
console.log(`Total plans audités : ${total}`);
console.log(`Sans renfo S1 (freq>=3) : ${missingS1} (${total > 0 ? (missingS1 / total * 100).toFixed(1) : 0}%)`);
console.log(`Baseline (15-16 mai) : ${baselineMissing}/${baseline.length} = ${baselinePct.toFixed(1)}%`);
console.log(`Post J3 (>=17 mai)   : ${postJ3Missing}/${postJ3.length} = ${postJ3Pct.toFixed(1)}%`);
console.log(`Δ : ${(postJ3Pct - baselinePct).toFixed(1)} pp`);
console.log(`\nVerdict : ${verdict}`);
console.log(`Pattern : ${pattern || '(aucun)'}`);
console.log(`Action  : ${action}`);
