/**
 * Audit conversion-oriented des 5 plans du 12 mai 2026.
 * Focus : qu'est-ce qui pourrait expliquer le taux conversion 0% ?
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const may12 = all.filter(p => (p.createdAt || '').startsWith('2026-05-12')).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const paceSec = (p) => { const m = String(p||'').match(/(\d+):(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h\s*(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };
const vmaPct = (pace, vma) => { const ps = paceSec(pace); return ps && vma ? (3600/ps) / vma : null; };

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  AUDIT CONVERSION — 5 plans du 12 mai 2026 (0% conversion vs 8-18% habituel)  ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

for (const p of may12) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${p.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const doc = pf((await r.json()).fields);
  const qs = doc.generationContext?.questionnaireSnapshot || {};
  const s1 = doc.weeks?.[0];
  const time = new Date(doc.createdAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
  const ageAct = Math.floor((Date.now() - new Date(doc.createdAt)) / 60000);

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🆓 ${doc.name}`);
  console.log(`   ${doc.userEmail} | créé à ${time} (il y a ${ageAct} min)`);
  console.log(`   Profil: ${qs.level} | ${qs.sex||'?'} ${qs.age||'?'}ans | ${qs.weight||'?'}/${qs.height||'?'} IMC ${qs.weight && qs.height ? (qs.weight/((qs.height/100)**2)).toFixed(1) : '?'}`);
  console.log(`   VMA ${doc.vma?.toFixed(2)} | source: ${doc.vmaSource}`);
  console.log(`   Cible: ${doc.targetTime} | Durée: ${doc.durationWeeks} sem | Freq: ${doc.sessionsPerWeek}`);
  console.log(`   Ville: ${qs.city || '?'} | Records: ${JSON.stringify(qs.recentRaceTimes || {})}`);
  console.log(`   Blessures: ${JSON.stringify(qs.injuries)}`);
  console.log(`   Faisabilité: ${doc.feasibility?.status} (${doc.confidenceScore}/100)`);

  const aha = [], frictions = [];

  // Faisabilité affichée
  if (['IRREALISTE','IRRÉALISTE','DIFFICILE','AMBITIEUX'].includes(doc.feasibility?.status)) {
    frictions.push(`🟡 Faisabilité ${doc.feasibility?.status} (${doc.confidenceScore}/100) — peut décourager paiement`);
  } else if (doc.feasibility?.status === 'EXCELLENT' || doc.feasibility?.status === 'BON') {
    aha.push(`✅ Faisabilité ${doc.feasibility?.status}`);
  }

  // Welcome personnalisé
  const wm = doc.welcomeMessage || '';
  const firstName = qs.firstName || doc.firstName;
  const checks = {
    nom: firstName && wm.toLowerCase().includes((firstName || '').toLowerCase()),
    ville: qs.city && wm.toLowerCase().includes(qs.city.toLowerCase().trim()),
    records: qs.recentRaceTimes && Object.values(qs.recentRaceTimes).some(t => t && wm.includes(t)),
    vma: doc.vma && (wm.includes(doc.vma.toFixed(1)) || wm.includes(doc.vma.toFixed(0))),
  };
  const persoScore = Object.values(checks).filter(Boolean).length;
  if (persoScore >= 2) aha.push(`✅ Welcome personnalisé (${persoScore}/4: ${Object.entries(checks).filter(([_,v])=>v).map(([k])=>k).join(',')})`);
  else if (persoScore === 0) frictions.push(`🔴 Welcome 0/4 critères personnalisation (générique)`);
  else frictions.push(`🟡 Welcome peu personnalisé (${persoScore}/4)`);

  console.log(`   Welcome (${wm.length} car):`);
  console.log(`     "${wm.substring(0, 200)}${wm.length > 200 ? '...' : ''}"`);

  // S1 contenu
  if (s1) {
    const sess = (s1.sessions||[]);
    const courseSess = sess.filter(s => s.type !== 'Renforcement');
    const full = courseSess.filter(s => (s.warmup||'').length > 30 && (s.mainSet||'').length > 50 && (s.cooldown||'').length > 20 && (s.advice||'').length > 30);
    if (courseSess.length > 0 && full.length === courseSess.length) aha.push(`✅ S1 toutes complètes (W/U+main+C/D+advice)`);
    else if (full.length < courseSess.length) frictions.push(`🟡 ${courseSess.length - full.length}/${courseSess.length} séances S1 incomplètes`);

    // Ville dans locationSuggestion
    const cityLow = (qs.city || '').toLowerCase().trim();
    if (cityLow) {
      const withCity = courseSess.filter(s => (s.locationSuggestion||'').toLowerCase().includes(cityLow));
      if (withCity.length === courseSess.length) aha.push(`✅ Ville ${qs.city.trim()} dans 100% suggestions`);
      else if (withCity.length === 0) frictions.push(`🔴 Ville "${qs.city.trim()}" ABSENTE des locationSuggestion`);
    } else if (!qs.city) {
      frictions.push(`🟡 Aucune ville déclarée (questionnaire incomplet)`);
    }

    // Cohérence dist × pace = durée
    let coh = 0, total = 0;
    for (const s of courseSess) {
      const km = kmOf(s);
      const ps = paceSec(s.targetPace);
      const dm = durMin(s.duration);
      if (km && ps && dm) {
        total++;
        if (Math.abs(dm - (km*ps)/60) / ((km*ps)/60) < 0.15) coh++;
      }
    }
    if (total > 0 && coh === total) aha.push(`✅ Cohérence dist×pace=durée (${coh}/${total})`);
    else if (coh < total) frictions.push(`🟡 ${total - coh}/${total} séances incohérentes dist×pace`);

    // Détail séances S1
    console.log(`   Séances S1:`);
    for (const s of sess) {
      console.log(`     ${(s.day||'').padEnd(10)} | ${(s.type||'').padEnd(14)} | ${(s.distance||'').padEnd(8)} | ${(s.duration||'').padEnd(10)} | ${(s.targetPace||'-').padEnd(20)} | ${(s.title||'').substring(0,40)}`);
    }
  }

  // Faisabilité cible vs VMA (refus dur référentiel v2)
  if (doc.vma && doc.targetTime && doc.targetTime !== 'Finisher') {
    const tm = String(doc.targetTime).match(/(\d+)h?(\d*)/i);
    if (tm) {
      const h = parseInt(tm[1])||0, mn = tm[2] ? parseInt(tm[2]) : 0;
      const targetH = h + mn/60;
      const nameLow = (doc.name||'').toLowerCase();
      let dist = null;
      if (/marathon/.test(nameLow) && !/semi/.test(nameLow)) dist = 42.195;
      else if (/semi/.test(nameLow) || /21\s*km/.test(nameLow)) dist = 21.0975;
      else if (/10\s*km/.test(nameLow)) dist = 10;
      else if (/5\s*km/.test(nameLow)) dist = 5;
      if (dist && targetH > 0) {
        const pct = (dist/targetH) / doc.vma;
        let limit = 0.85;
        if (dist === 10) limit = 0.92;
        else if (dist === 21.0975) limit = 0.88;
        if (pct > limit) frictions.push(`🔴 Cible ${doc.targetTime} = ${(pct*100).toFixed(1)}%VMA > limite ${(limit*100).toFixed(0)}%`);
      }
    }
  }

  // Plan long (>24 sem)
  if (doc.durationWeeks > 24) {
    frictions.push(`🟡 Plan ${doc.durationWeeks} sem (>24 = risque abandon ~70%)`);
  }

  console.log(`\n   🟢 AHA (${aha.length}):`);
  aha.forEach(a => console.log(`     ${a}`));
  console.log(`   🔴 FRICTIONS (${frictions.length}):`);
  frictions.forEach(f => console.log(`     ${f}`));
}
