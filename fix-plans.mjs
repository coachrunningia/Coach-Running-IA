/**
 * Fix existing plans in Firestore based on audit findings.
 * Each plan gets specific corrections without touching the overall structure.
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
const refreshToken = config.tokens?.refresh_token;
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function getToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi' }),
  });
  return (await res.json()).access_token;
}

async function getDoc(token, id) {
  const res = await fetch(`${BASE}/plans/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return await res.json();
}

async function patchDoc(token, id, fields) {
  const updateMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`${BASE}/plans/${id}?${updateMask}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Patch failed: ${JSON.stringify(data.error)}`);
  return data;
}

// Parse Firestore values
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

// Convert JS value to Firestore value
function toFV(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFV) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFV(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Calculate correct paces from VMA
function calculatePaces(vma) {
  const efKmh = vma * 0.67;
  const eaKmh = vma * 0.77;
  const seuilKmh = vma * 0.87;
  const toMinKm = (kmh) => {
    const pace = 60 / kmh;
    const min = Math.floor(pace);
    const sec = Math.round((pace - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };
  return {
    efPace: toMinKm(efKmh),
    eaPace: toMinKm(eaKmh),
    seuilPace: toMinKm(seuilKmh),
    vmaPace: toMinKm(vma),
    recoveryPace: toMinKm(vma * 0.60),
  };
}

async function main() {
  const token = await getToken();
  console.log('Token OK\n');

  // ══════════════════════════════════════════════════════════════
  // PLAN 10: Trail 14km — Fix allures EF (5:47 → 7:47) + fix jours dupliqués
  // ══════════════════════════════════════════════════════════════
  console.log('═══ PLAN 10 (1777662230470): Trail 14km — Fix allures + jours ═══');
  const doc10 = await getDoc(token, '1777662230470');
  const plan10 = pf(doc10.fields);
  const correctPaces = calculatePaces(11.5); // VMA réelle = 11.5
  console.log(`  Nouvelles allures: EF=${correctPaces.efPace}, EA=${correctPaces.eaPace}, Seuil=${correctPaces.seuilPace}`);

  const weeks10 = plan10.weeks || [];
  const DAYS_3 = ['Mardi', 'Vendredi', 'Dimanche'];
  let fixCount = 0;

  for (const week of weeks10) {
    const sessions = week.sessions || [];
    // Fix jours dupliqués
    const usedDays = new Set();
    for (const s of sessions) {
      if (usedDays.has(s.day)) {
        const available = DAYS_3.filter(d => !usedDays.has(d));
        if (available.length > 0) {
          console.log(`  S${week.weekNumber}: ${s.title} — jour ${s.day} → ${available[0]}`);
          s.day = available[0];
          fixCount++;
        }
      }
      usedDays.add(s.day);
    }
    // Fix allures dans chaque séance
    for (const s of sessions) {
      if (s.targetPace && s.type !== 'Renforcement') {
        if (s.intensity === 'Facile' || s.type === 'Sortie Longue' || s.type === 'Jogging') {
          if (s.targetPace !== correctPaces.efPace) {
            s.targetPace = correctPaces.efPace;
            fixCount++;
          }
        }
      }
    }
  }

  // Rebuild weeks as Firestore value and patch
  const weeksField = toFV(weeks10);
  const pacesField = toFV(correctPaces);
  const vmaField = toFV(11.5);
  await patchDoc(token, '1777662230470', { weeks: weeksField, paces: pacesField, vma: vmaField });
  console.log(`  ✅ ${fixCount} corrections appliquées\n`);

  // ══════════════════════════════════════════════════════════════
  // PLAN 1: Trail 13km — Fix squats sautés S2 pour IMC 31.2
  // ══════════════════════════════════════════════════════════════
  console.log('═══ PLAN 1 (1778094004207): Trail 13km — Fix renfo squats sautés ═══');
  const doc1 = await getDoc(token, '1778094004207');
  const plan1 = pf(doc1.fields);
  const weeks1 = plan1.weeks || [];
  let renfoFixes = 0;

  for (const week of weeks1) {
    for (const s of week.sessions || []) {
      if (s.type === 'Renforcement' && s.mainSet) {
        const original = s.mainSet;
        // Remplacer squats sautés par squats poids de corps
        s.mainSet = s.mainSet
          .replace(/squats?\s*saut[ée]s?/gi, 'Squats poids de corps')
          .replace(/fentes?\s*saut[ée]s?\s*(altern[ée]es?)?/gi, 'Fentes avant');
        if (s.mainSet !== original) {
          renfoFixes++;
          console.log(`  S${week.weekNumber}: squats/fentes sautés → remplacés`);
        }
      }
    }
  }

  if (renfoFixes > 0) {
    await patchDoc(token, '1778094004207', { weeks: toFV(weeks1) });
    console.log(`  ✅ ${renfoFixes} exercices corrigés\n`);
  } else {
    console.log(`  ℹ️  Aucun exercice à corriger\n`);
  }

  // ══════════════════════════════════════════════════════════════
  // PLAN 2: Ultra 118km — Renforcer le warning
  // ══════════════════════════════════════════════════════════════
  console.log('═══ PLAN 2 (1778085118200): Ultra 118km — Renforcer warning ═══');
  const newWelcome2 = `⚠️ ATTENTION — PRÉPARATION TRÈS RISQUÉE

11 semaines pour un ultra-trail de 118km avec 8200m D+ est INSUFFISANT. Les experts recommandent un minimum de 20-24 semaines pour cette distance. Ce plan est fourni à titre indicatif mais ne garantit pas une préparation sûre. Nous vous recommandons FORTEMENT de :
1. Repousser la date de course pour avoir au moins 20 semaines de préparation
2. Consulter un médecin du sport avant de démarrer
3. Avoir déjà terminé un ultra de 80km+ récemment

Si vous maintenez cette date, écoutez votre corps à chaque séance et n'hésitez pas à adapter ou annuler si des douleurs apparaissent.`;

  await patchDoc(token, '1778085118200', {
    welcomeMessage: toFV(newWelcome2),
    confidenceScore: toFV(20),
  });
  console.log('  ✅ Warning renforcé + confidence score → 20\n');

  // ══════════════════════════════════════════════════════════════
  // PLAN 5: Semi 30 sem — Ajouter warning durée dans welcomeMessage
  // ══════════════════════════════════════════════════════════════
  console.log('═══ PLAN 5 (1778016978925): Semi 30 sem — Warning durée ═══');
  const doc5 = await getDoc(token, '1778016978925');
  const plan5 = pf(doc5.fields);
  const currentMsg5 = plan5.welcomeMessage || '';
  if (!currentMsg5.includes('30 semaines')) {
    const warningPrefix = `⚠️ NOTE IMPORTANTE : 30 semaines de préparation pour un semi-marathon est très long. La plupart des coureurs se préparent en 12-16 semaines. Un plan trop long peut entraîner de la lassitude. Si tu te sens prêt, rapproche ta date de début pour un plan de 14-16 semaines.\n\n`;
    await patchDoc(token, '1778016978925', { welcomeMessage: toFV(warningPrefix + currentMsg5) });
    console.log('  ✅ Warning ajouté\n');
  } else {
    console.log('  ℹ️  Warning déjà présent\n');
  }

  // ══════════════════════════════════════════════════════════════
  // PLAN 7: Marathon 3h55, 45 ans — Fix jours consécutifs
  // ══════════════════════════════════════════════════════════════
  console.log('═══ PLAN 7 (1777900210405): Marathon 3h55 — Info récupération 45+ ═══');
  const doc7 = await getDoc(token, '1777900210405');
  const plan7 = pf(doc7.fields);
  const currentMsg7 = plan7.welcomeMessage || '';
  if (!currentMsg7.includes('48h minimum')) {
    const recovNote = `\n\n💡 À 45 ans, accorde-toi 48h minimum entre deux séances intenses. Les jours de repos sont aussi importants que les jours d'entraînement.`;
    await patchDoc(token, '1777900210405', { welcomeMessage: toFV(currentMsg7 + recovNote) });
    console.log('  ✅ Note récupération ajoutée\n');
  } else {
    console.log('  ℹ️  Déjà présent\n');
  }

  console.log('═══ CORRECTIONS TERMINÉES ═══');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
