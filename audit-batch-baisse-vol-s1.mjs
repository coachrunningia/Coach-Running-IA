/**
 * AUDIT BATCH — Baisse volume S1 (bug systémique × 0.85)
 *
 * Date : 2026-05-18
 *
 * Root cause (avant fix) : src/services/geminiService.ts:2655
 *   currentVolumeFloor = Math.round(currentVolume * 0.85)
 *   → S1 toujours à -15 % du volume actuel user.
 *
 * Mission :
 *   1. Refetch tous les plans Firestore (collection `plans`).
 *   2. Pour chaque plan avec fullPlanGenerated=true OU isPreview=true :
 *      - Calcule volume S1 (periodizationPlan.weeklyVolumes[0] ou somme weeks[0])
 *      - Compare au currentWeeklyVolume input user
 *      - Classe par sévérité
 *   3. Croise avec raceDate (course passée vs future) + isPremium pour décider
 *      régénération / patch live / ignore.
 *   4. Produit AUDIT-BATCH-BAISSE-VOL-S1.md + audit-batch-baisse-vol-s1.json.
 *
 * LECTURE SEULE — aucune modification Firestore.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync, statSync } from 'fs';

const PROJECT = 'coach-running-ia';
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const TODAY = '2026-05-18';

// ─── Auth ───
let TOKEN;
try {
  TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
} catch (e) {
  console.error('Impersonation failed, fallback to ADC');
  TOKEN = execSync('gcloud auth application-default print-access-token', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
}
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };

// ─── Helpers Firestore ───
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
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

const kmFrom = (d) => { if (!d) return 0; const v = parseFloat(String(d).replace(',', '.').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };

// ─── 1. Fetch all plans (paginé) ───
async function fetchAllPlans() {
  // Cache disque si dump < 30 min
  const cache = 'all-plans-batch-audit.json';
  if (existsSync(cache)) {
    const ageMin = (Date.now() - statSync(cache).mtimeMs) / 60_000;
    if (ageMin < 30) {
      const arr = JSON.parse(readFileSync(cache, 'utf8'));
      console.log(`📦 Cache utilisé (${ageMin.toFixed(0)} min) : ${arr.length} plans`);
      return arr;
    }
  }
  const all = [];
  let lastCreatedAt = null;
  let page = 0;
  while (true) {
    const sq = {
      from: [{ collectionId: 'plans' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300,
    };
    if (lastCreatedAt) {
      sq.where = { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } };
    }
    const q = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: sq }),
    });
    const data = await q.json();
    if (!Array.isArray(data)) { console.error('Erreur API:', JSON.stringify(data).slice(0, 500)); break; }
    const docs = data.filter(r => r.document);
    if (docs.length === 0) break;
    for (const r of docs) {
      all.push({ id: r.document.name.split('/').pop(), _createTime: r.document.createTime, ...pf(r.document.fields) });
    }
    page++;
    lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
    console.log(`  Page ${page}: +${docs.length} (total ${all.length})`);
    if (!lastCreatedAt || docs.length < 300) break;
    if (page >= 30) break;
  }
  writeFileSync(cache, JSON.stringify(all));
  return all;
}

// ─── 2. Fetch user docs (pour isPremium) ───
async function fetchUsers(uids) {
  const userCache = 'users-batch-audit.json';
  let cache = {};
  if (existsSync(userCache)) {
    const ageMin = (Date.now() - statSync(userCache).mtimeMs) / 60_000;
    if (ageMin < 30) cache = JSON.parse(readFileSync(userCache, 'utf8'));
  }
  const missing = uids.filter(u => !(u in cache));
  console.log(`👤 Users à fetcher : ${missing.length} / ${uids.length} (${Object.keys(cache).length} en cache)`);
  let i = 0;
  // batchGet — 100 ids max par appel
  while (i < missing.length) {
    const batch = missing.slice(i, i + 100);
    const docs = batch.map(uid => `projects/${PROJECT}/databases/(default)/documents/users/${uid}`);
    const q = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:batchGet`, {
      method: 'POST', headers: H, body: JSON.stringify({ documents: docs }),
    });
    const data = await q.json();
    if (!Array.isArray(data)) { console.error('Erreur user batch:', JSON.stringify(data).slice(0, 300)); break; }
    for (const r of data) {
      if (r.found) {
        const uid = r.found.name.split('/').pop();
        cache[uid] = pf(r.found.fields);
      } else if (r.missing) {
        const uid = r.missing.split('/').pop();
        cache[uid] = null;
      }
    }
    i += 100;
    if (i % 500 === 0) console.log(`  Users fetched: ${i}/${missing.length}`);
  }
  writeFileSync(userCache, JSON.stringify(cache));
  return cache;
}

// ─── 3. Calcul S1 + sévérité par plan ───
function analyzePlan(p, users) {
  const ctx = p.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const pp = ctx.periodizationPlan || {};
  const wv = pp.weeklyVolumes || [];

  const uid = p.userId;
  const user = users[uid] || {};

  // Volume S1 : priorité weeklyVolumes[0], sinon somme distances sessions weeks[0]
  let volS1 = wv[0] || 0;
  let volSource = 'weeklyVolumes[0]';
  if (!volS1) {
    const sess = (p.weeks?.[0]?.sessions) || [];
    volS1 = sess.reduce((s, x) => /renfo|mobilit|cross/i.test(x.type || '') ? s : s + kmFrom(x.distance), 0);
    volSource = 'sum(weeks[0].sessions)';
  }

  const curVol = snap.currentWeeklyVolume ?? ctx.currentVolume ?? snap.currentVolume ?? null;
  const ratio = (curVol && curVol > 0 && volS1) ? volS1 / curVol : null;

  let severity = 'skip';
  if (ratio !== null) {
    if (ratio >= 0.95) severity = 'ok';
    else if (ratio >= 0.85) severity = 'leger';
    else severity = 'grave';
  }
  if (!curVol || curVol === 0) severity = 'skip';
  if (!volS1) severity = 'no_s1';

  // Race date status (null raceDate = considéré comme "future" car plan peut être
  // un programme libre type "Forme"/"PoidsForme" sans course fixée → on régénère
  // par défaut car le user va continuer à l'utiliser)
  const raceDate = p.raceDate || snap.raceDate || null;
  const raceFuture = raceDate ? raceDate > TODAY : true;
  const raceMissing = !raceDate;

  // Premium status (réel d'après schéma Firestore users/) :
  //   - user.isPremium = true            (abonnement actif Stripe synchronisé)
  //   - user.stripeSubscriptionStatus    = 'active' (canonique Stripe)
  //   - user.hasPurchasedPlan = true     (achat one-shot)
  const isPremium = !!(
    user?.isPremium === true ||
    user?.stripeSubscriptionStatus === 'active' ||
    user?.hasPurchasedPlan === true
  );

  const goal = p.goal || snap.goal || '';
  const subGoal = p.subGoal || snap.subGoal || snap.fitnessSubGoal || '';
  const level = p.level || snap.level || '';
  const frequency = p.sessionsPerWeek || snap.frequency || null;
  const targetTime = p.targetTime || snap.targetTime || null;

  // Email
  const email = p.userEmail || snap.email || user?.email || null;

  // Décision auto
  let decision = 'ignore';
  let reason = '';
  if (severity === 'skip' || severity === 'no_s1' || severity === 'ok') {
    decision = 'ignore';
    reason = severity === 'ok' ? 'ratio OK' : (severity === 'skip' ? 'pas de curVol référence' : 'pas de volume S1');
  } else if (!isPremium) {
    decision = 'ignore';
    reason = 'pas premium';
  } else if (raceDate && !raceFuture) {
    decision = 'ignore';
    reason = 'course passée';
  } else if (p.fullPlanGenerated === true) {
    decision = 'regenerate';
    reason = 'plan complet premium actif';
  } else if (p.isPreview === true) {
    decision = 'patch_live';
    reason = 'preview only';
  } else {
    decision = 'ignore';
    reason = 'ni full ni preview';
  }

  return {
    planId: p.id,
    uid,
    email,
    firstName: user?.firstName || null,
    planName: p.name || null,
    createdAt: p.createdAt || null,
    raceDate,
    raceFuture,
    raceMissing,
    isPremium,
    isPreview: p.isPreview === true,
    fullPlanGenerated: p.fullPlanGenerated === true,
    frequency,
    goal,
    subGoal,
    level,
    targetTime,
    currentWeeklyVolume: curVol,
    volS1,
    volSource,
    ratio,
    severity,
    decision,
    reason,
  };
}

// ─── 4. Normalise level/goal ───
function normLevel(lvl) {
  if (!lvl) return 'Inconnu';
  const s = String(lvl).toLowerCase();
  if (s.includes('déb') || s.includes('deb') || s.includes('begin')) return 'Débutant';
  if (s.includes('inter') || s.includes('régulier') || s.includes('regulier')) return 'Intermédiaire';
  if (s.includes('conf') || s.includes('comp')) return 'Confirmé';
  if (s.includes('exp') || s.includes('perf')) return 'Expert';
  return 'Autre';
}
function normGoal(goal, subGoal) {
  const g = String(goal || '').toLowerCase();
  const s = String(subGoal || '').toLowerCase();
  const both = g + ' ' + s;
  if (both.includes('marathon') && !both.includes('semi')) return 'Marathon';
  if (both.includes('semi')) return 'Semi';
  if (both.includes('10')) return '10km';
  if (both.includes('5')) return '5km';
  if (both.includes('trail')) return 'Trail';
  if (both.includes('hyrox')) return 'Hyrox';
  if (both.includes('forme') || both.includes('fitness') || both.includes('plaisir')) return 'Forme';
  if (both.includes('perte') || both.includes('poids')) return 'PoidsForme';
  if (both.includes('vma')) return 'VMA';
  return 'Autre';
}

// ─── MAIN ───
console.log('═'.repeat(100));
console.log(`  AUDIT BATCH — Baisse volume S1 (× 0.85)  •  ${new Date().toISOString()}`);
console.log('═'.repeat(100));

console.log('\n▶ Étape 1/3 : Fetch all plans Firestore');
const allPlans = await fetchAllPlans();
console.log(`📦 Total : ${allPlans.length} plans`);

// Filtre : fullPlanGenerated=true OU isPreview=true
const candidates = allPlans.filter(p => p.fullPlanGenerated === true || p.isPreview === true);
console.log(`🎯 Candidats audit (fullPlan OR preview) : ${candidates.length}`);

console.log('\n▶ Étape 2/3 : Fetch users (isPremium)');
const uids = [...new Set(candidates.map(p => p.userId).filter(Boolean))];
const users = await fetchUsers(uids);

console.log('\n▶ Étape 3/3 : Analyse');
const rows = candidates.map(p => analyzePlan(p, users));

// ─── Stats globales ───
const total = rows.length;
const bySev = { ok: 0, leger: 0, grave: 0, skip: 0, no_s1: 0 };
for (const r of rows) bySev[r.severity]++;

const pct = (n) => total ? `${(n / total * 100).toFixed(1)}%` : '0%';

console.log('\n📊 Synthèse sévérité :');
console.log(`  🟢 OK (ratio ≥ 0.95)        : ${bySev.ok}  (${pct(bySev.ok)})`);
console.log(`  🟡 Léger (0.85 ≤ r < 0.95)  : ${bySev.leger}  (${pct(bySev.leger)})`);
console.log(`  🔴 Grave (r < 0.85)         : ${bySev.grave}  (${pct(bySev.grave)})`);
console.log(`  ⚪ Skip (no curVol)         : ${bySev.skip}  (${pct(bySev.skip)})`);
console.log(`  ⚫ No S1                    : ${bySev.no_s1}  (${pct(bySev.no_s1)})`);

// ─── Distribution typologie ───
const typo = {}; // typo[level][goal] = { total, leger, grave }
for (const r of rows) {
  if (r.severity === 'skip' || r.severity === 'no_s1') continue;
  const lvl = normLevel(r.level);
  const goal = normGoal(r.goal, r.subGoal);
  typo[lvl] ||= {};
  typo[lvl][goal] ||= { total: 0, ok: 0, leger: 0, grave: 0 };
  typo[lvl][goal].total++;
  typo[lvl][goal][r.severity]++;
}

// ─── Décisions ───
const toRegen = rows.filter(r => r.decision === 'regenerate');
const toPatch = rows.filter(r => r.decision === 'patch_live');
const ignored = rows.filter(r => r.decision === 'ignore');

console.log(`\n🎯 Décisions :`);
console.log(`  À RÉGÉNÉRER (premium + course future + full + ratio < 0.95) : ${toRegen.length}`);
console.log(`  À PATCHER LIVE (premium + course future + preview only)      : ${toPatch.length}`);
console.log(`  À IGNORER                                                     : ${ignored.length}`);

// ─── Tri pour top 30 / 20 ───
toRegen.sort((a, b) => (a.ratio || 1) - (b.ratio || 1)); // pires en haut
toPatch.sort((a, b) => (a.ratio || 1) - (b.ratio || 1));

// ─── Génération markdown ───
const md = [];
md.push(`# Audit batch — baisse volume S1`);
md.push(`Date : ${TODAY}  •  Généré : ${new Date().toISOString()}`);
md.push(``);
md.push(`> **Bug** : \`src/services/geminiService.ts:2655\` faisait \`currentVolumeFloor = currentVolume × 0.85\` →`);
md.push(`> S1 systématiquement à -15 % du volume actuel user. Fix appliqué (passage à 100 %) ; cet audit identifie les plans déjà générés impactés.`);
md.push(``);
md.push(`## Synthèse`);
md.push(``);
md.push(`- Total plans audités (fullPlanGenerated OR isPreview) : **${total}**`);
md.push(`- 🟢 OK (ratio ≥ 0.95)         : **${bySev.ok}** (${pct(bySev.ok)})`);
md.push(`- 🟡 Léger (0.85 ≤ r < 0.95)   : **${bySev.leger}** (${pct(bySev.leger)})`);
md.push(`- 🔴 Grave (r < 0.85)          : **${bySev.grave}** (${pct(bySev.grave)})`);
md.push(`- ⚪ Skip (currentVol = 0/null) : **${bySev.skip}** (${pct(bySev.skip)})`);
md.push(`- ⚫ Pas de volume S1 calculable : **${bySev.no_s1}** (${pct(bySev.no_s1)})`);
md.push(``);

// Stats par flag plan
const fullCount = rows.filter(r => r.fullPlanGenerated).length;
const prevCount = rows.filter(r => r.isPreview && !r.fullPlanGenerated).length;
md.push(`### Décomposition par type de plan`);
md.push(``);
md.push(`| Type                            | Total | OK | Léger | Grave |`);
md.push(`|---------------------------------|------:|---:|------:|------:|`);
const full = rows.filter(r => r.fullPlanGenerated);
const prev = rows.filter(r => r.isPreview && !r.fullPlanGenerated);
md.push(`| fullPlanGenerated = true        | ${full.length} | ${full.filter(r => r.severity === 'ok').length} | ${full.filter(r => r.severity === 'leger').length} | ${full.filter(r => r.severity === 'grave').length} |`);
md.push(`| isPreview = true (preview only) | ${prev.length} | ${prev.filter(r => r.severity === 'ok').length} | ${prev.filter(r => r.severity === 'leger').length} | ${prev.filter(r => r.severity === 'grave').length} |`);
md.push(``);

// Distribution typologie
md.push(`## Distribution par typologie (plans avec curVol > 0)`);
md.push(``);
const goalOrder = ['5km', '10km', 'Semi', 'Marathon', 'Trail', 'Hyrox', 'Forme', 'PoidsForme', 'VMA', 'Autre'];
const levelOrder = ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert', 'Autre', 'Inconnu'];

md.push(`### Total impactés (Léger + Grave)`);
md.push(``);
md.push(`| Niveau \\ Goal     | ${goalOrder.join(' | ')} | Total |`);
md.push(`|-------------------|${goalOrder.map(() => '----:').join('|')}|-----:|`);
for (const lvl of levelOrder) {
  if (!typo[lvl]) continue;
  const cells = goalOrder.map(g => {
    const t = typo[lvl][g];
    if (!t) return '·';
    const impacted = t.leger + t.grave;
    return impacted ? `${impacted}/${t.total}` : `0/${t.total}`;
  });
  const tot = goalOrder.reduce((s, g) => s + (typo[lvl][g]?.total || 0), 0);
  const totImpacted = goalOrder.reduce((s, g) => s + ((typo[lvl][g]?.leger || 0) + (typo[lvl][g]?.grave || 0)), 0);
  md.push(`| ${lvl.padEnd(17)} | ${cells.join(' | ')} | ${totImpacted}/${tot} |`);
}
md.push(``);

md.push(`### Grave uniquement (ratio < 0.85)`);
md.push(``);
md.push(`| Niveau \\ Goal     | ${goalOrder.join(' | ')} | Total |`);
md.push(`|-------------------|${goalOrder.map(() => '----:').join('|')}|-----:|`);
for (const lvl of levelOrder) {
  if (!typo[lvl]) continue;
  const cells = goalOrder.map(g => {
    const t = typo[lvl][g];
    if (!t) return '·';
    return t.grave ? String(t.grave) : '0';
  });
  const totGrave = goalOrder.reduce((s, g) => s + (typo[lvl][g]?.grave || 0), 0);
  md.push(`| ${lvl.padEnd(17)} | ${cells.join(' | ')} | ${totGrave} |`);
}
md.push(``);

// ─── Top 30 régénérer ───
md.push(`## Plans Premium actifs à RÉGÉNÉRER (course future, full plan) — top 30 les pires`);
md.push(``);
md.push(`Total à régénérer : **${toRegen.length}**`);
md.push(``);
md.push(`| # | email | prénom | level | goal | freq | curVol | volS1 | ratio | raceDate | planId |`);
md.push(`|--:|-------|--------|-------|------|----:|------:|------:|------:|----------|--------|`);
toRegen.slice(0, 30).forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.email || '?'} | ${r.firstName || '?'} | ${normLevel(r.level)} | ${normGoal(r.goal, r.subGoal)} | ${r.frequency || '?'} | ${r.currentWeeklyVolume} | ${r.volS1} | ${(r.ratio * 100).toFixed(0)}% | ${r.raceDate || '?'} | \`${r.planId}\` |`);
});
md.push(``);

// ─── Top 20 patch live ───
md.push(`## Plans Premium actifs à PATCHER LIVE (preview only, course future) — top 20 les pires`);
md.push(``);
md.push(`Total à patcher live : **${toPatch.length}**`);
md.push(``);
md.push(`| # | email | prénom | level | goal | freq | curVol | volS1 | ratio | raceDate | planId |`);
md.push(`|--:|-------|--------|-------|------|----:|------:|------:|------:|----------|--------|`);
toPatch.slice(0, 20).forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.email || '?'} | ${r.firstName || '?'} | ${normLevel(r.level)} | ${normGoal(r.goal, r.subGoal)} | ${r.frequency || '?'} | ${r.currentWeeklyVolume} | ${r.volS1} | ${(r.ratio * 100).toFixed(0)}% | ${r.raceDate || '?'} | \`${r.planId}\` |`);
});
md.push(``);

// ─── Ignorés (raison de premier tri exclusive) ───
const ignReasons = {};
for (const r of ignored) ignReasons[r.reason] = (ignReasons[r.reason] || 0) + 1;
md.push(`## Plans passés ou non premium (info, pas d'action)`);
md.push(``);
md.push(`Total ignorés : **${ignored.length}**`);
md.push(``);
md.push(`### Raison de premier tri (mutuellement exclusive)`);
md.push(``);
md.push(`| Raison | Count |`);
md.push(`|--------|------:|`);
for (const [r, n] of Object.entries(ignReasons).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${r} | ${n} |`);
}
md.push(``);

// Vue cumulative non-exclusive sur les ignorés impactés (sev leger/grave)
const ignImpacted = ignored.filter(r => r.severity === 'leger' || r.severity === 'grave');
const ignImpNoPrem = ignImpacted.filter(r => !r.isPremium).length;
const ignImpRacePast = ignImpacted.filter(r => r.raceDate && !r.raceFuture).length;
const ignImpPremRacePast = ignImpacted.filter(r => r.isPremium && r.raceDate && !r.raceFuture).length;
md.push(`### Ignorés mais impactés par le bug (info)`);
md.push(``);
md.push(`Parmi les **${ignored.length}** ignorés, **${ignImpacted.length}** étaient quand même impactés (léger ou grave) :`);
md.push(``);
md.push(`- dont non-premium : **${ignImpNoPrem}**`);
md.push(`- dont course passée (toutes catégories) : **${ignImpRacePast}**`);
md.push(`- dont **premium + course passée** (perte client effective) : **${ignImpPremRacePast}**`);
md.push(``);

// ─── Recommandation finale ───
const ratioByLevel = {};
for (const r of rows) {
  if (r.severity === 'skip' || r.severity === 'no_s1' || !r.ratio) continue;
  const lvl = normLevel(r.level);
  ratioByLevel[lvl] ||= [];
  ratioByLevel[lvl].push(r.ratio);
}
const avgByLevel = Object.entries(ratioByLevel).map(([lvl, arr]) => ({
  lvl, n: arr.length, avg: arr.reduce((s, x) => s + x, 0) / arr.length,
})).sort((a, b) => a.avg - b.avg);

md.push(`## Ratio moyen S1/current par niveau`);
md.push(``);
md.push(`| Niveau | N | Ratio moyen |`);
md.push(`|--------|--:|------------:|`);
for (const x of avgByLevel) md.push(`| ${x.lvl} | ${x.n} | ${(x.avg * 100).toFixed(1)}% |`);
md.push(``);

md.push(`## Recommandation finale`);
md.push(``);
md.push(`**Action priorisée** :`);
md.push(``);
md.push(`1. **Code fix déjà appliqué** (\`geminiService.ts:2655\` floor S1 = 100 % current) → tous nouveaux plans OK.`);
md.push(`2. **Régénération ciblée** : ${toRegen.length} plans premium actifs (course > ${TODAY}) avec full plan généré.`);
md.push(`   - **Sous-prioriser** par sévérité (grave d'abord, ${toRegen.filter(r => r.severity === 'grave').length} plans) puis date course proche.`);
md.push(`   - Garder ratio cible ≥ 0.95.`);
md.push(`3. **Patch live** : ${toPatch.length} previews actifs — recalcul S1 à la prochaine ouverture app, pas besoin de régénérer immédiatement.`);
md.push(`4. **Aucune communication client direct** (doctrine [[feedback_jamais_contact_client]]) — Romane gère.`);
md.push(``);
md.push(`### Risque non régénération`);
md.push(`- Confirmé/Expert : ressenti "plan mou" (sous-charge S1 = -15 %) → désabonnement.`);
md.push(`- Débutant : illusion "je suis prêt" si plan démarre au volume actuel × 0.85 (faux confort).`);
md.push(``);

writeFileSync('AUDIT-BATCH-BAISSE-VOL-S1.md', md.join('\n'));
writeFileSync('audit-batch-baisse-vol-s1.json', JSON.stringify({
  meta: {
    generatedAt: new Date().toISOString(),
    today: TODAY,
    totalPlansFetched: allPlans.length,
    candidatesAudited: total,
  },
  synthese: { bySeverity: bySev, byDecision: { regenerate: toRegen.length, patch_live: toPatch.length, ignore: ignored.length } },
  typologie: typo,
  ratioByLevel: avgByLevel,
  toRegenerate: toRegen,
  toPatchLive: toPatch,
  ignored: ignored.map(r => ({ planId: r.planId, severity: r.severity, reason: r.reason, ratio: r.ratio })),
  allRows: rows,
}, null, 2));

console.log(`\n📝 AUDIT-BATCH-BAISSE-VOL-S1.md`);
console.log(`📝 audit-batch-baisse-vol-s1.json`);
console.log(`\n✅ DONE`);
