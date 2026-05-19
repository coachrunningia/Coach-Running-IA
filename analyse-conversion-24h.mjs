/**
 * Analyse CONVERSION-ORIENTED v2 — sécurité > conversion.
 *
 * Cadre :
 * - Faisabilité IRRÉALISTE = ✅ qualité (transparence). Le critère est : y a-t-il une DÉCHARGE EXPLICITE ?
 * - Vraies frictions conversion = ce qui fait douter de la QUALITÉ perçue (pas la transparence).
 *
 * Critères vrais :
 * A. Décharge explicite si IRRÉALISTE (volonté + responsabilité)
 * B. Welcome message engageant et personnalisé (utilise nom/ville/records)
 * C. S1 séances complètes (warmup + main + cooldown + advice détaillés)
 * D. Personnalisation ville dans locationSuggestion
 * E. Paces calculées visibles (preuve d'expertise)
 * F. Variété/diversité séances
 * G. Cohérence préférences (jours)
 * H. Cohérence interne (dist × pace = durée, pas de séances vides)
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => p.createdAt && new Date(p.createdAt) >= since).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  ANALYSE CONVERSION v2 — Sécurité PRIME, qualité perçue maximise paiement     ║`);
console.log(`║  ${plans.length} plans 24h — ${plans.filter(p => p.fullPlanGenerated===true).length} Premium / ${plans.filter(p => p.fullPlanGenerated!==true).length} Freemium                                  ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;

for (const p of plans) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${p.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const doc = pf((await r.json()).fields);
  const qs = doc.generationContext?.questionnaireSnapshot || {};
  const s1 = doc.weeks?.[0];
  const isFreemium = doc.fullPlanGenerated !== true;
  const status = doc.feasibility?.status;
  const isUnrealistic = ['IRREALISTE','IRRÉALISTE','DIFFICILE'].includes(status);

  const aha = [], frictions = [];

  // A. DÉCHARGE EXPLICITE si IRRÉALISTE (priorité absolue)
  if (isUnrealistic) {
    const wm = doc.welcomeMessage || '';
    const sw = doc.feasibility?.safetyWarning || '';
    const hasExplicitConsent = /reconnais|t[ée]moign|accepte|responsabilit[ée]|j'accept|sous mon contr[oô]le|engagement/i.test(wm + sw);
    if (hasExplicitConsent) aha.push(`✅ Décharge explicite présente (volonté + responsabilité)`);
    else frictions.push(`🔴 PLAN ${status} mais AUCUNE décharge explicite ("je reconnais les risques, je témoigne de ma volonté")`);
    aha.push(`✅ Faisabilité ${status} affichée — transparence honnête (positionnement marque)`);
  } else if (status === 'EXCELLENT' || status === 'BON') {
    aha.push(`✅ Faisabilité ${status} (${doc.confidenceScore}/100)`);
  }

  // B. Welcome personnalisé
  const wm = doc.welcomeMessage || '';
  const firstName = qs.firstName || doc.firstName;
  const usesName = firstName && wm.toLowerCase().includes(firstName.toLowerCase());
  const usesCity = qs.city && wm.toLowerCase().includes(qs.city.toLowerCase().trim());
  const usesRecords = qs.recentRaceTimes && Object.values(qs.recentRaceTimes).some(t => t && wm.includes(t));
  const usesVMA = doc.vma && (wm.includes(doc.vma.toFixed(1)) || wm.includes(doc.vma.toFixed(0)));
  const personalisationScore = [usesName, usesCity, usesRecords, usesVMA].filter(Boolean).length;
  if (personalisationScore >= 2) aha.push(`✅ Welcome personnalisé (${personalisationScore}/4 critères: ${[usesName&&'nom', usesCity&&'ville', usesRecords&&'records', usesVMA&&'VMA'].filter(Boolean).join(',')})`);
  else if (personalisationScore === 0) frictions.push(`🟡 Welcome générique (aucune mention nom/ville/records/VMA)`);
  if (wm.length < 200) frictions.push(`🟡 Welcome court (${wm.length} car) — manque de chaleur pour conversion`);

  // C. Séances S1 complètes
  if (s1) {
    const sess = (s1.sessions||[]).filter(s => s.type !== 'Renforcement');
    const fullSess = sess.filter(s => (s.warmup||'').length > 30 && (s.mainSet||'').length > 50 && (s.cooldown||'').length > 20 && (s.advice||'').length > 30).length;
    if (sess.length > 0 && fullSess === sess.length) aha.push(`✅ S1 toutes séances complètes (W/U + Main + C/D + Advice)`);
    else if (fullSess < sess.length) frictions.push(`🟡 ${sess.length - fullSess}/${sess.length} séances S1 incomplètes (manque détail)`);
  }

  // D. Ville dans locationSuggestion
  if (s1 && qs.city) {
    const cityClean = qs.city.toLowerCase().trim();
    const courseSess = (s1.sessions||[]).filter(s => s.type !== 'Renforcement');
    const withCity = courseSess.filter(s => (s.locationSuggestion||'').toLowerCase().includes(cityClean)).length;
    if (withCity === courseSess.length && withCity > 0) aha.push(`✅ Ville ${qs.city.trim()} dans 100% des suggestions`);
    else if (withCity > 0) aha.push(`✅ Ville ${qs.city.trim()} dans ${withCity}/${courseSess.length} suggestions`);
    else frictions.push(`🔴 Ville "${qs.city.trim()}" DÉCLARÉE mais ABSENTE des locationSuggestion (AHA moment raté)`);
  }

  // E. Paces calculées
  const paceCount = doc.paces ? Object.keys(doc.paces).length : 0;
  if (paceCount >= 7) aha.push(`✅ ${paceCount} allures personnalisées (preuve d'expertise)`);
  else if (paceCount < 3) frictions.push(`🟡 Seulement ${paceCount} allures calculées`);

  // F. Variété séances S1
  if (s1) {
    const types = new Set((s1.sessions||[]).map(s => s.type));
    if (types.size >= 3) aha.push(`✅ Variété S1: ${types.size} types différents`);
  }

  // G. Cohérence préférences jours
  const prefDays = qs.preferredDays || [];
  if (prefDays.length > 0 && s1) {
    const wrongDays = (s1.sessions||[]).filter(s => s.day && !prefDays.includes(s.day));
    if (wrongDays.length === 0) aha.push(`✅ Jours préférés respectés à 100% (${prefDays.join(',')})`);
    else frictions.push(`🟡 ${wrongDays.length} séances S1 sur jour non-préféré (déclaré: ${prefDays.join(',')})`);
  }

  // H. Cohérence interne dist × pace = durée
  if (s1) {
    const sess = (s1.sessions||[]).filter(s => s.type !== 'Renforcement');
    let coh = 0, total = 0;
    for (const s of sess) {
      const km = kmOf(s);
      const pm = String(s.targetPace).match(/(\d+):(\d+)/);
      if (!km || !pm) continue;
      total++;
      const ps = parseInt(pm[1])*60 + parseInt(pm[2]);
      const expMin = (km * ps) / 60;
      let realMin = 0;
      const dStr = String(s.duration||'');
      const h = dStr.match(/(\d+)\s*h\s*(\d*)/); if (h) { realMin += parseInt(h[1])*60; if (h[2]) realMin += parseInt(h[2]); }
      const m = dStr.match(/^(\d+)\s*min/); if (m) realMin = parseInt(m[1]);
      if (realMin > 0 && Math.abs(realMin - expMin) / expMin < 0.15) coh++;
    }
    if (total > 0 && coh === total) aha.push(`✅ S1 dist×pace=durée cohérent (${coh}/${total})`);
    else if (coh < total) frictions.push(`🟡 ${total - coh}/${total} séances S1 incohérentes dist×pace≠durée`);
  }

  // Affichage
  const icon = isFreemium ? '🆓' : '💎';
  console.log(`\n${icon} ${doc.name}`);
  console.log(`   ${doc.userEmail || '?'} | ${status} (${doc.confidenceScore}/100)`);
  if (aha.length) {
    console.log(`   AHA (${aha.length}):`);
    aha.forEach(a => console.log(`     ${a}`));
  }
  if (frictions.length) {
    console.log(`   FRICTIONS (${frictions.length}):`);
    frictions.forEach(f => console.log(`     ${f}`));
  }
  if (!frictions.length) console.log(`   ✅ Aucune friction conversion détectée`);
}

console.log(`\n\n══ RÉSUMÉ ACTIONS PROPOSÉES ══\n`);
console.log(`1. Décharge explicite si plan IRRÉALISTE — phrase type :`);
console.log(`   "⚠ Plan signalé NON ADAPTÉ — En continuant, tu reconnais avoir lu les risques et tu`);
console.log(`    témoignes de ta volonté de suivre ce plan sous ta propre responsabilité."`);
console.log(`2. Mention OBLIGATOIRE de la ville déclarée dans locationSuggestion (règle prompt + post-validation)`);
console.log(`3. Welcome message : nom + ville + records + VMA personnalisés (au moins 3/4 critères)`);
