/**
 * Test Sprint 2 (commit 7d49f37 vs commit 0435796) sur 15 profils variés.
 *
 * Objectif : vérifier que le patch Sprint 2 (seuils %VMA tenu + sync mainSet
 * + validator mainset_duration_mismatch)
 *   - reclasse bien mxjulien02 en IRRÉALISTE
 *   - ne dégrade aucun "bon" profil (EXCELLENT/BON)
 *   - les sessions risky (Fractionné/Tempo/Renforcement/Trail) ne sont jamais
 *     modifiées par applySessionScale
 *   - le validator détecte les vrais bugs sans faux positifs
 *
 * Méthode : reproduction LECTURE SEULE des fonctions calculateFeasibility
 * AVANT (sans Fix C) et APRÈS (avec Fix C). Les autres helpers sont identiques
 * dans les 2 versions. Cf. `git diff 0435796 7d49f37 src/services/feasibilityService.ts`
 * = uniquement 2 hunks (ajout bloc seuils + ajout cap après pénalités).
 */

// ============================================================================
// SECTION 1 — HELPERS COMMUNS (identiques avant/après Sprint 2)
// ============================================================================

const MEDICAL_RED_FLAGS_RE = /douleur osseuse|fracture|fissure|œdème osseux|stress fracture|ostéonécrose|hernie discale|sciatique aigu/i;
function hasMedicalRedFlag(injuryDescription) {
  if (!injuryDescription) return false;
  return MEDICAL_RED_FLAGS_RE.test(injuryDescription);
}

function parseTargetTime(target) {
  if (!target) return null;
  const cleaned = target.trim().toLowerCase().replace(/^sub[- ]?/, '').replace(/\s+/g, '');
  const minOnlyMatch = cleaned.match(/^(\d{1,3})min$/);
  if (minOnlyMatch) return parseInt(minOnlyMatch[1], 10);
  const hMinMatch = cleaned.match(/^(\d{1,2})h(\d{0,2})(min)?$/);
  if (hMinMatch) {
    const hours = parseInt(hMinMatch[1], 10);
    const mins = hMinMatch[2] ? parseInt(hMinMatch[2], 10) : 0;
    return hours * 60 + mins;
  }
  const hmsMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    return parseInt(hmsMatch[1], 10) * 60 + parseInt(hmsMatch[2], 10) + parseInt(hmsMatch[3], 10) / 60;
  }
  const msMatch = cleaned.match(/^(\d{1,3}):(\d{2})$/);
  if (msMatch) return parseInt(msMatch[1], 10) + parseInt(msMatch[2], 10) / 60;
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

function formatTime(minutes) {
  if (minutes >= 60) {
    const totalMin = Math.round(minutes);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  const totalSec = Math.round(minutes * 60);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getDistanceKm(distance) {
  const d = distance.trim().toLowerCase();
  if (d === '5 km' || d === '5km') return 5;
  if (d === '10 km' || d === '10km') return 10;
  if (d.includes('semi') || d.includes('half')) return 21.1;
  if (d === 'marathon' || d === '42 km' || d === '42km') return 42.195;
  const trailMatch = d.match(/(\d+)\s*km/);
  if (trailMatch) return parseInt(trailMatch[1], 10);
  return null;
}

function getVmaFactor(distanceKm) {
  if (distanceKm <= 5) return 0.95;
  if (distanceKm <= 10) return 0.90;
  if (distanceKm <= 21.1) return 0.85;
  if (distanceKm <= 42.195) return 0.80;
  if (distanceKm <= 80) return 0.70;
  return 0.65;
}

function getEquivalentFlatDistance(distanceKm, elevationM) {
  if (!elevationM || elevationM <= 0) return distanceKm;
  return distanceKm + elevationM / 100;
}

function theoreticalTimeMinutes(vma, distanceKm) {
  const factor = getVmaFactor(distanceKm);
  return (distanceKm / (vma * factor)) * 60;
}

function isBeginner(level) {
  return level.toLowerCase().includes('débutant') || level.toLowerCase().includes('debutant');
}

function isIntermediate(level) {
  return level.toLowerCase().includes('intermédiaire') || level.toLowerCase().includes('intermediaire');
}

function requiredVmaForTarget(targetMinutes, distanceKm) {
  const factor = getVmaFactor(distanceKm);
  const requiredSpeed = distanceKm / (targetMinutes / 60);
  return requiredSpeed / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveStatus(score) {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'BON';
  if (score >= 55) return 'AMBITIEUX';
  if (score > 10) return 'RISQUÉ';
  return 'IRRÉALISTE';
}

function getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmi, age, hasInjury) {
  let minWeeks;
  if (distanceKm === null) minWeeks = 12;
  else if (isTrail) {
    if (distanceKm >= 60) minWeeks = 52;
    else if (distanceKm >= 30) minWeeks = 36;
    else if (distanceKm >= 15) minWeeks = 22;
    else minWeeks = 12;
  } else {
    if (distanceKm >= 42) minWeeks = 30;
    else if (distanceKm >= 21) minWeeks = 20;
    else if (distanceKm >= 10) minWeeks = 14;
    else minWeeks = 10;
  }
  let mod = 0;
  if (bmi !== null && bmi >= 30) mod += 4;
  if (age !== undefined && age >= 50) mod += 2;
  if (hasInjury) mod += 4;
  mod = Math.min(mod, 8);
  return minWeeks + mod;
}

// R2 gates simplifié (pas le focus du Sprint 2). On garde flag ON default.
function applyR2Gates(ctx) {
  const reasons = [];
  let scorePenalty = 0;
  let irrealisticCap;

  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const r1Multiplier = ctx.distanceKm < 20 ? 5 : ctx.distanceKm < 50 ? 4 : ctx.distanceKm < 100 ? 3.5 : 3;
    const r1Min = r1Multiplier * ctx.raceDplus;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m`);
    }
    if (ctx.currentElev > 0) {
      const ratioDplus = ctx.raceDplus / ctx.currentElev;
      if (ratioDplus > 40) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push('ratio D+ > 40'); }
      else if (ratioDplus > 25) { scorePenalty += 25; reasons.push('ratio D+ > 25'); }
      else if (ratioDplus > 15) { scorePenalty += 10; reasons.push('ratio D+ > 15'); }
    } else if (ctx.raceDplus >= 500) { scorePenalty += 15; reasons.push('D+ hebdo non déclaré'); }
    if (ctx.currentVolume > 0) {
      const isCourt = ctx.distanceKm < 30;
      const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const seuils = isCourt ? { irr: 0.50, amb: 0.65 } : isMoyen ? { irr: 0.40, amb: 0.50 } : { irr: 0.30, amb: 0.40 };
      if (ratioVol < seuils.irr) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push('vol trop faible'); }
      else if (ratioVol < seuils.amb) { scorePenalty += 20; reasons.push('vol juste'); }
    }
  }
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sautPct > 0.50 || sautAbs > 15) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push('saut S0→S1 violent'); }
    else if (sautPct > 0.30) { scorePenalty += 10; reasons.push('saut S0→S1 limite'); }
  }
  if (ctx.level.includes('Expert') && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push('Expert sans chrono');
  }
  return { irrealisticCap, scorePenalty, reasons };
}

// ============================================================================
// SECTION 2 — calculateFeasibility AVANT Sprint 2 (commit 0435796)
// ============================================================================
// Diff vs APRÈS : BLOC FIX C absent (pas de seuils %VMA tenu).
// Tout le reste = identique.

function calculateFeasibilityBefore(params) {
  const { vma, targetTime, distance, goal, level, planWeeks, currentVolume, hasInjury, hasChrono } = params;
  const distanceKm = getDistanceKm(distance);
  const isTrail = goal.toLowerCase().includes('trail');
  const beginner = isBeginner(level);
  const intermediate = isIntermediate(level);
  const isMarathon = !isTrail && distanceKm !== null && distanceKm >= 42;
  const isSemi = !isTrail && distanceKm !== null && distanceKm >= 21 && distanceKm < 42;

  const targetMinutes = parseTargetTime(targetTime ?? '');
  const hasTimeTarget = targetMinutes !== null && targetMinutes > 0;

  if (distanceKm === null || !hasTimeTarget) {
    return { score: -1, status: 'FINISHER_PATH', message: 'evaluated via buildFinisherFeasibility (not reproduced — paths identical avant/après)', pctVmaTenu: null, gapPercent: null, vmaRatioPercent: null };
  }

  const effectiveDistanceKm = isTrail ? getEquivalentFlatDistance(distanceKm, params.trailElevation) : distanceKm;
  const theoMinutes = theoreticalTimeMinutes(vma, effectiveDistanceKm);
  const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;

  const vmaNeededForTarget = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const vmaRatioPercent = Math.round((vmaNeededForTarget / vma) * 100);

  // % VMA tenu (info, pas utilisé pour le scoring AVANT)
  const requiredSpeedKmh = effectiveDistanceKm / (targetMinutes / 60);
  const pctVmaTenu = requiredSpeedKmh / vma;

  if (vmaRatioPercent >= 130) {
    return { score: 5, status: 'IRRÉALISTE', message: 'vmaRatio gate', pctVmaTenu, gapPercent, vmaRatioPercent };
  }

  let score, status;
  if (gapPercent <= -5) { score = 95; status = 'EXCELLENT'; }
  else if (gapPercent <= 5) { score = Math.round(100 - Math.abs(gapPercent) * 3); score = clamp(score, 85, 100); status = 'EXCELLENT'; }
  else if (gapPercent <= 15) { score = Math.round(84 - (gapPercent - 5) * 1.4); score = clamp(score, 70, 84); status = 'BON'; }
  else if (gapPercent <= 25) { score = Math.round(69 - (gapPercent - 15) * 1.4); score = clamp(score, 55, 69); status = 'AMBITIEUX'; }
  else { score = Math.round(54 - (gapPercent - 25) * 0.8); score = clamp(score, 10, 54); status = 'RISQUÉ'; }

  if (beginner && isMarathon && planWeeks < 12) { score = clamp(Math.min(score, 25), 15, 30); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 180) { score = clamp(Math.min(score, 15), 10, 20); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 210 && targetMinutes >= 180) { score = clamp(Math.min(score, 30), 20, 35); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 240 && targetMinutes >= 210) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (beginner && isSemi && targetMinutes < 90) { score = clamp(Math.min(score, 25), 15, 30); status = 'RISQUÉ'; }
  if (beginner && isSemi && targetMinutes < 105 && targetMinutes >= 90) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (intermediate && isMarathon && targetMinutes < 180) { score = Math.min(score, 45); if (score < 55) status = 'RISQUÉ'; }
  if (intermediate && isMarathon && targetMinutes < 195 && targetMinutes >= 180) { score = Math.min(score, 60); }
  if (vma < 12 && gapPercent > 5) { score -= Math.round((12 - vma) * (gapPercent - 5) * 0.5); }
  if (intermediate && isSemi && targetMinutes < 80) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (isSemi && planWeeks < 8) score -= 20;
  if (isMarathon && planWeeks < 12) score -= 20;
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) score -= 25;
    else if (distanceKm >= 60 && planWeeks < 14) score -= 20;
    else if (distanceKm >= 42 && planWeeks < 12) score -= 15;
    else if (distanceKm >= 30 && planWeeks < 8) score -= 10;
  }
  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) score -= 25;
    else if (isSemi && currentVolume < 20) score -= 20;
    else if (distanceKm <= 10 && currentVolume < 15) score -= 15;
  }
  if (!hasChrono && hasTimeTarget) {
    const absGap = Math.abs(Math.min(gapPercent, 0));
    const noChronoCap = gapPercent >= 0 ? 65 : Math.round(clamp(65 + (absGap - 5) * 2, 65, 85));
    score = Math.min(score, noChronoCap);
    status = resolveStatus(score);
  }
  if (params.vmaFromTarget && hasTimeTarget) { score = Math.min(score, 50); status = resolveStatus(score); }
  if (hasInjury) score -= 10;
  if (hasMedicalRedFlag(params.injuryDescription)) score = Math.min(score, 25);
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) score -= isMarathon ? 30 : 25;
    else if (bmi >= 30) score -= isMarathon ? 20 : 15;
    else if (bmi >= 27) score -= isMarathon ? 10 : isSemi ? 7 : 3;
    else if (bmi >= 25) score -= isMarathon ? 5 : isSemi ? 3 : 0;
  }
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    const isSeniorAge = params.age !== undefined && params.age >= 45;
    const isBmiHigh = bmi >= 30;
    if (isBmiHigh && isSeniorAge && beginner) score -= 25;
    else if (isBmiHigh && hasInjury) score -= 15;
    else if (isSeniorAge && beginner && hasInjury) score -= 15;
  }
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if (currentVolume !== undefined && currentVolume < 50) score -= 15;
    if (params.frequency && params.frequency < 5) score -= 15;
    if (!hasChrono) score -= 10;
  }
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0 ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) score = Math.min(score, 15);
    else if (planWeeks < minRequired * 1.2) score = Math.min(score, 30);
  }
  // R2 gates (simplifié, focus: trail elevation + saut volume)
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) totalDplusCycleR2 += estimateWeekTargetElevation(i, planWeeks, params.trailElevation, level, params.currentWeeklyElevation);
  }
  const peakVolEstimate = distanceKm ? (isMarathon ? 60 : isSemi ? 45 : isTrail && distanceKm >= 60 ? 70 : isTrail && distanceKm >= 30 ? 55 : 35) : 35;
  const s1VolEstimate = currentVolume && currentVolume > 0 ? Math.round(currentVolume * 1.10) : Math.round(peakVolEstimate * 0.30);
  const r2 = applyR2Gates({
    isTrail, distanceKm, raceDplus: params.trailElevation ?? 0, planWeeks,
    currentVolume: currentVolume ?? 0, currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimate, totalDplusCycle: totalDplusCycleR2, level: level || '', hasChrono,
  });
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) score = Math.min(score, r2.irrealisticCap);

  score = clamp(score, 10, 100);
  status = resolveStatus(score);

  return { score, status, message: '', pctVmaTenu, gapPercent, vmaRatioPercent };
}

// ============================================================================
// SECTION 3 — calculateFeasibility APRÈS Sprint 2 (commit 7d49f37)
// ============================================================================
// = AVANT + bloc Fix C (seuils + cap)

function calculateFeasibilityAfter(params) {
  const { vma, targetTime, distance, goal, level, planWeeks, currentVolume, hasInjury, hasChrono } = params;
  const distanceKm = getDistanceKm(distance);
  const isTrail = goal.toLowerCase().includes('trail');
  const beginner = isBeginner(level);
  const intermediate = isIntermediate(level);
  const isMarathon = !isTrail && distanceKm !== null && distanceKm >= 42;
  const isSemi = !isTrail && distanceKm !== null && distanceKm >= 21 && distanceKm < 42;

  const targetMinutes = parseTargetTime(targetTime ?? '');
  const hasTimeTarget = targetMinutes !== null && targetMinutes > 0;

  if (distanceKm === null || !hasTimeTarget) {
    return { score: -1, status: 'FINISHER_PATH', message: 'evaluated via buildFinisherFeasibility (not reproduced — paths identical avant/après)', pctVmaTenu: null, gapPercent: null, vmaRatioPercent: null };
  }

  const effectiveDistanceKm = isTrail ? getEquivalentFlatDistance(distanceKm, params.trailElevation) : distanceKm;
  const theoMinutes = theoreticalTimeMinutes(vma, effectiveDistanceKm);
  const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;

  const vmaNeededForTarget = requiredVmaForTarget(targetMinutes, effectiveDistanceKm);
  const vmaRatioPercent = Math.round((vmaNeededForTarget / vma) * 100);
  if (vmaRatioPercent >= 130) {
    return { score: 5, status: 'IRRÉALISTE', message: 'vmaRatio gate', pctVmaTenu: null, gapPercent, vmaRatioPercent };
  }

  // ─── Fix C — Seuils %VMA tenu sur distance ───
  const requiredSpeedKmh = effectiveDistanceKm / (targetMinutes / 60);
  const pctVmaTenu = requiredSpeedKmh / vma;
  const distanceThresholds = (() => {
    const d = effectiveDistanceKm;
    if (d <= 5.5)   return { ambitious: 0.93, unrealistic: 0.98, label: '5 km' };
    if (d <= 11)    return { ambitious: 0.90, unrealistic: 0.95, label: '10 km' };
    if (d <= 22)    return { ambitious: 0.88, unrealistic: 0.93, label: 'semi-marathon' };
    if (d <= 43)    return { ambitious: 0.83, unrealistic: 0.88, label: 'marathon' };
    return { ambitious: 0.78, unrealistic: 0.85, label: `${Math.round(d)} km` };
  })();

  if (pctVmaTenu > distanceThresholds.unrealistic) {
    return { score: 5, status: 'IRRÉALISTE', message: `pctVmaTenu ${(pctVmaTenu * 100).toFixed(1)}% > seuil ${(distanceThresholds.unrealistic * 100).toFixed(0)}% (${distanceThresholds.label})`, pctVmaTenu, gapPercent, vmaRatioPercent };
  }
  const vmaThresholdAmbitiousCap = pctVmaTenu > distanceThresholds.ambitious ? 60 : undefined;

  let score, status;
  if (gapPercent <= -5) { score = 95; status = 'EXCELLENT'; }
  else if (gapPercent <= 5) { score = Math.round(100 - Math.abs(gapPercent) * 3); score = clamp(score, 85, 100); status = 'EXCELLENT'; }
  else if (gapPercent <= 15) { score = Math.round(84 - (gapPercent - 5) * 1.4); score = clamp(score, 70, 84); status = 'BON'; }
  else if (gapPercent <= 25) { score = Math.round(69 - (gapPercent - 15) * 1.4); score = clamp(score, 55, 69); status = 'AMBITIEUX'; }
  else { score = Math.round(54 - (gapPercent - 25) * 0.8); score = clamp(score, 10, 54); status = 'RISQUÉ'; }

  if (beginner && isMarathon && planWeeks < 12) { score = clamp(Math.min(score, 25), 15, 30); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 180) { score = clamp(Math.min(score, 15), 10, 20); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 210 && targetMinutes >= 180) { score = clamp(Math.min(score, 30), 20, 35); status = 'RISQUÉ'; }
  if (beginner && isMarathon && targetMinutes < 240 && targetMinutes >= 210) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (beginner && isSemi && targetMinutes < 90) { score = clamp(Math.min(score, 25), 15, 30); status = 'RISQUÉ'; }
  if (beginner && isSemi && targetMinutes < 105 && targetMinutes >= 90) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (intermediate && isMarathon && targetMinutes < 180) { score = Math.min(score, 45); if (score < 55) status = 'RISQUÉ'; }
  if (intermediate && isMarathon && targetMinutes < 195 && targetMinutes >= 180) { score = Math.min(score, 60); }
  if (vma < 12 && gapPercent > 5) { score -= Math.round((12 - vma) * (gapPercent - 5) * 0.5); }
  if (intermediate && isSemi && targetMinutes < 80) { score = Math.min(score, 50); if (score < 55) status = 'RISQUÉ'; }
  if (isSemi && planWeeks < 8) score -= 20;
  if (isMarathon && planWeeks < 12) score -= 20;
  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 80 && planWeeks < 16) score -= 25;
    else if (distanceKm >= 60 && planWeeks < 14) score -= 20;
    else if (distanceKm >= 42 && planWeeks < 12) score -= 15;
    else if (distanceKm >= 30 && planWeeks < 8) score -= 10;
  }
  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) score -= 25;
    else if (isSemi && currentVolume < 20) score -= 20;
    else if (distanceKm <= 10 && currentVolume < 15) score -= 15;
  }
  if (!hasChrono && hasTimeTarget) {
    const absGap = Math.abs(Math.min(gapPercent, 0));
    const noChronoCap = gapPercent >= 0 ? 65 : Math.round(clamp(65 + (absGap - 5) * 2, 65, 85));
    score = Math.min(score, noChronoCap);
    status = resolveStatus(score);
  }
  if (params.vmaFromTarget && hasTimeTarget) { score = Math.min(score, 50); status = resolveStatus(score); }
  if (hasInjury) score -= 10;
  if (hasMedicalRedFlag(params.injuryDescription)) score = Math.min(score, 25);
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) score -= isMarathon ? 30 : 25;
    else if (bmi >= 30) score -= isMarathon ? 20 : 15;
    else if (bmi >= 27) score -= isMarathon ? 10 : isSemi ? 7 : 3;
    else if (bmi >= 25) score -= isMarathon ? 5 : isSemi ? 3 : 0;
  }
  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    const isSeniorAge = params.age !== undefined && params.age >= 45;
    const isBmiHigh = bmi >= 30;
    if (isBmiHigh && isSeniorAge && beginner) score -= 25;
    else if (isBmiHigh && hasInjury) score -= 15;
    else if (isSeniorAge && beginner && hasInjury) score -= 15;
  }
  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if (currentVolume !== undefined && currentVolume < 50) score -= 15;
    if (params.frequency && params.frequency < 5) score -= 15;
    if (!hasChrono) score -= 10;
  }
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0 ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) score = Math.min(score, 15);
    else if (planWeeks < minRequired * 1.2) score = Math.min(score, 30);
  }
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) totalDplusCycleR2 += estimateWeekTargetElevation(i, planWeeks, params.trailElevation, level, params.currentWeeklyElevation);
  }
  const peakVolEstimate = distanceKm ? (isMarathon ? 60 : isSemi ? 45 : isTrail && distanceKm >= 60 ? 70 : isTrail && distanceKm >= 30 ? 55 : 35) : 35;
  const s1VolEstimate = currentVolume && currentVolume > 0 ? Math.round(currentVolume * 1.10) : Math.round(peakVolEstimate * 0.30);
  const r2 = applyR2Gates({
    isTrail, distanceKm, raceDplus: params.trailElevation ?? 0, planWeeks,
    currentVolume: currentVolume ?? 0, currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimate, totalDplusCycle: totalDplusCycleR2, level: level || '', hasChrono,
  });
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) score = Math.min(score, r2.irrealisticCap);

  // Fix C — Cap AMBITIEUX appliqué APRÈS pénalités
  if (vmaThresholdAmbitiousCap !== undefined) score = Math.min(score, vmaThresholdAmbitiousCap);

  score = clamp(score, 10, 100);
  status = resolveStatus(score);

  return { score, status, message: '', pctVmaTenu, gapPercent, vmaRatioPercent };
}

// Estimation simplifiée pour total D+ cycle (R2 gate 1) — non-focus Sprint 2
function estimateWeekTargetElevation(weekNumber, totalWeeks, raceElevation, level, currentWeeklyElevation) {
  if (!raceElevation) return 0;
  const lvl = (level || '').toLowerCase();
  const isDeb = lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');
  const maxWeeklyElevation = isDeb ? Math.min(raceElevation, 800) : isInter ? Math.min(raceElevation, 1500) : isConf ? Math.min(raceElevation, 4500) : Math.min(raceElevation, 6500);
  const defaultStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
  const idealStart = currentWeeklyElevation && currentWeeklyElevation > 0 ? currentWeeklyElevation : defaultStart;
  const minStartElevation = Math.round(raceElevation * 0.15);
  const startElevation = Math.max(idealStart, Math.min(minStartElevation, Math.round(maxWeeklyElevation * 0.60)));
  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  return Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
}

// ============================================================================
// SECTION 4 — sessionScale (Fix D)
// ============================================================================
const MAINSET_SYNCABLE_TYPES = new Set(['Sortie Longue', 'Jogging', 'Footing']);
const MAINSET_RISKY_TYPES = new Set(['Fractionné', 'Fartlek', 'Côtes', 'Tempo', 'Trail', 'Renforcement', 'Marche-Course', 'Marche/Course', 'Hyrox', 'VMA', 'Intervalle', 'Seuil', 'Repos']);
const FRACTIONAL_PATTERN_RE = /\d+\s*[x×]\s*\d/i;

function isMainSetSyncable(sessionType, mainSet) {
  const t = sessionType || '';
  if (!MAINSET_SYNCABLE_TYPES.has(t)) return false;
  if (MAINSET_RISKY_TYPES.has(t)) return false;
  if (mainSet && FRACTIONAL_PATTERN_RE.test(mainSet)) return false;
  return true;
}

function parseDurationMin(d) {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
}

function parseKmVal(d) {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
}

function syncMainSetText(mainSet, newDurMin, newKm) {
  let updated = mainSet;
  if (newDurMin > 0) updated = updated.replace(/^(\s*)(\d+)\s*min\b/i, `$1${newDurMin} min`);
  if (newKm > 0 && !FRACTIONAL_PATTERN_RE.test(updated)) {
    updated = updated.replace(/(\d+(?:[.,]\d+)?)\s*km\b/, `${newKm} km`);
  }
  return updated;
}

function applySessionScale(session, newDur, newKm) {
  if (!session) return;
  const newDurMin = parseDurationMin(newDur);
  const newKmVal = parseKmVal(newKm);
  if (newDur) session.duration = newDur;
  if (newKm) session.distance = newKm;
  if (session.mainSet && isMainSetSyncable(session.type, session.mainSet)) {
    session.mainSet = syncMainSetText(session.mainSet, newDurMin, newKmVal);
  }
}

// ============================================================================
// SECTION 5 — Validator mainset_duration_mismatch
// ============================================================================
function checkMainsetDurationMismatch(session) {
  if (!session || !session.mainSet) return null;
  if (session.type && MAINSET_RISKY_TYPES.has(session.type)) return null;
  const title = session.title || '';
  const mainSet = session.mainSet;
  if (FRACTIONAL_PATTERN_RE.test(mainSet)) return null;
  if (/fractionn|tempo|seuil|vma|c[ôo]te|hyrox|renfo/i.test(title)) return null;

  const durMatch = mainSet.match(/^\s*(\d+)\s*min\b/i);
  const sessionMin = parseDurationMin(session.duration || '');
  if (durMatch && sessionMin > 0) {
    const mainSetMin = parseInt(durMatch[1], 10);
    if (mainSetMin > 0) {
      const drift = Math.abs(mainSetMin - sessionMin) / sessionMin;
      if (drift > 0.20) {
        return `mainSet ${mainSetMin}min ≠ duration ${sessionMin}min (écart ${(drift * 100).toFixed(0)}%)`;
      }
    }
  }
  const kmMatch = mainSet.match(/(\d+(?:[.,]\d+)?)\s*km\b/);
  const sessionKm = parseKmVal(session.distance || '');
  if (kmMatch && sessionKm > 0) {
    const mainSetKm = parseFloat(kmMatch[1].replace(',', '.'));
    if (mainSetKm > 0) {
      const drift = Math.abs(mainSetKm - sessionKm) / sessionKm;
      if (drift > 0.20) {
        return `mainSet ${mainSetKm}km ≠ distance ${sessionKm}km (écart ${(drift * 100).toFixed(0)}%)`;
      }
    }
  }
  return null;
}

// ============================================================================
// SECTION 6 — 15 PROFILS
// ============================================================================
const PROFILES = [
  {
    id: 1, label: 'Élite club 5K 18 min',
    expected: 'EXCELLENT inchangé',
    params: { vma: 19.5, targetTime: '18min', distance: '5 km', goal: 'Course sur route', level: 'Expert (Performance)', planWeeks: 12, currentVolume: 70, hasInjury: false, hasChrono: true, age: 28, weight: 65, height: 178, frequency: 6 },
  },
  {
    id: 2, label: 'Régulier 5K 22 min',
    expected: 'EXCELLENT inchangé',
    params: { vma: 16, targetTime: '22min', distance: '5 km', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 10, currentVolume: 35, hasInjury: false, hasChrono: true, age: 32, weight: 68, height: 175, frequency: 5 },
  },
  {
    id: 3, label: 'Régulier 5K 25 min ambitieux',
    expected: 'BON ou cap 60 (limite 92.3% ≈ seuil ambitious 93%)',
    params: { vma: 13, targetTime: '25min', distance: '5 km', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 12, currentVolume: 25, hasInjury: false, hasChrono: true, age: 35, weight: 70, height: 175, frequency: 4 },
  },
  {
    id: 4, label: 'Régulier 10K 50 min',
    expected: 'BON / EXCELLENT inchangé',
    params: { vma: 13, targetTime: '50min', distance: '10 km', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 12, currentVolume: 30, hasInjury: false, hasChrono: true, age: 35, weight: 72, height: 178, frequency: 4 },
  },
  {
    id: 5, label: 'Confirmé 10K 38 min',
    expected: 'AMBITIEUX cap 60 (90% VMA = seuil ambitious 10K)',
    params: { vma: 17.5, targetTime: '38min', distance: '10 km', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 12, currentVolume: 50, hasInjury: false, hasChrono: true, age: 30, weight: 65, height: 175, frequency: 5 },
  },
  {
    id: 6, label: 'mxjulien02 — Intermédiaire Semi 2h00 VMA 10.8',
    expected: 'IRRÉALISTE (fix Sprint 2)',
    params: { vma: 10.8, targetTime: '2h00', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 19, currentVolume: 25, hasInjury: false, hasChrono: true, age: 30, weight: 72, height: 175, frequency: 4 },
  },
  {
    id: 7, label: 'Confirmé Semi 1h30',
    expected: 'EXCELLENT / BON inchangé',
    params: { vma: 16, targetTime: '1h30', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 14, currentVolume: 50, hasInjury: false, hasChrono: true, age: 32, weight: 68, height: 178, frequency: 5 },
  },
  {
    id: 8, label: 'Intermédiaire Semi 1h45 VMA 13',
    expected: 'AMBITIEUX cap 60 (92.7% VMA > seuil 88%)',
    params: { vma: 13, targetTime: '1h45', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 14, currentVolume: 40, hasInjury: false, hasChrono: true, age: 35, weight: 70, height: 175, frequency: 4 },
  },
  {
    id: 9, label: 'Débutant Marathon Finisher VMA 11',
    expected: 'FINISHER_PATH (intouché)',
    params: { vma: 11, targetTime: 'Finisher', distance: 'Marathon', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 20, currentVolume: 30, hasInjury: false, hasChrono: false, age: 35, weight: 75, height: 180, frequency: 4 },
  },
  {
    id: 10, label: 'Pfitzinger Type A Marathon 3h00 VMA 17',
    expected: 'EXCELLENT (82.6% VMA, juste sous 83%)',
    params: { vma: 17, targetTime: '3h00', distance: 'Marathon', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 18, currentVolume: 70, hasInjury: false, hasChrono: true, age: 30, weight: 65, height: 175, frequency: 6 },
  },
  {
    id: 11, label: 'Marathon 3h00 VMA 16 ambitieux',
    expected: 'AMBITIEUX cap 60 (87.9% > 83%)',
    params: { vma: 16, targetTime: '3h00', distance: 'Marathon', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 18, currentVolume: 65, hasInjury: false, hasChrono: true, age: 32, weight: 68, height: 175, frequency: 5 },
  },
  {
    id: 12, label: 'Marathon 3h30 VMA 16 confort',
    expected: 'EXCELLENT inchangé (75.3% VMA)',
    params: { vma: 16, targetTime: '3h30', distance: 'Marathon', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 16, currentVolume: 55, hasInjury: false, hasChrono: true, age: 32, weight: 68, height: 175, frequency: 5 },
  },
  {
    id: 13, label: 'Trail 30km/1500D+ Confirmé Finisher',
    expected: 'FINISHER_PATH (intouché)',
    params: { vma: 15, targetTime: 'Finisher', distance: 'Trail 30 km', goal: 'Trail', level: 'Confirmé (Compétition)', planWeeks: 14, currentVolume: 45, hasInjury: false, hasChrono: false, trailElevation: 1500, trailDistance: 30, currentWeeklyElevation: 800, age: 35, weight: 70, height: 178, frequency: 5 },
  },
  {
    id: 14, label: 'Ultra 100km Expert Finisher',
    expected: 'FINISHER_PATH (intouché)',
    params: { vma: 14, targetTime: 'Finisher', distance: 'Trail 100 km', goal: 'Trail', level: 'Expert (Performance)', planWeeks: 26, currentVolume: 80, hasInjury: false, hasChrono: false, trailElevation: 5000, trailDistance: 100, currentWeeklyElevation: 1500, age: 38, weight: 65, height: 178, frequency: 6 },
  },
  {
    id: 15, label: 'steph-fanny — Intermédiaire 10K Finisher VMA 8 60 ans',
    expected: 'FINISHER_PATH (intouché par Sprint 2, bug séparé)',
    params: { vma: 8, targetTime: 'Finisher', distance: '10 km', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 21, currentVolume: 20, hasInjury: false, hasChrono: false, age: 60, weight: 65, height: 165, frequency: 3 },
  },
];

// ============================================================================
// SECTION 7 — TESTS Fix D (5 cas de session)
// ============================================================================
const SESSIONS_FIX_D = [
  {
    id: 'S1', label: 'Sortie Longue 1h30/8km → cap 1h00/5.3km',
    session: { type: 'Sortie Longue', title: 'SL régulière', duration: '1h30', distance: '8 km', mainSet: '8 km à 11:12/km' },
    cap: { newDur: '1h00', newKm: '5.3 km' },
    expected: 'mainSet sync → "5.3 km à 11:12/km"',
  },
  {
    id: 'S2', label: 'Footing 1h00/5.4km (pas de cap)',
    session: { type: 'Footing', title: 'EF', duration: '1h00', distance: '5.4 km', mainSet: '42 min en deux moitiés' },
    cap: { newDur: '1h00', newKm: '5.4 km' },
    expected: 'mainSet INCHANGÉ (idempotent ; pas de "X km" présent → rien à sync, "42 min" pas changé car newDurMin=60 ≠ 42 mais le pattern remplace ^\\d+ min → 60 min). En vrai, 42 sera remplacé par 60. À surveiller.',
  },
  {
    id: 'S3', label: 'Fractionné 45min/6.5km → cap 40min/5.5km',
    session: { type: 'Fractionné', title: 'VMA 6×800m', duration: '45 min', distance: '6.5 km', mainSet: '6 × 800 m à 4:00' },
    cap: { newDur: '40 min', newKm: '5.5 km' },
    expected: 'mainSet INCHANGÉ ✅ (blacklist)',
  },
  {
    id: 'S4', label: 'Renforcement 30min/0km (pas de cap)',
    session: { type: 'Renforcement', title: 'Renfo bas du corps', duration: '30 min', distance: '0 km', mainSet: 'Squats 3×9, Gainage 3×30s' },
    cap: { newDur: '30 min', newKm: '0 km' },
    expected: 'mainSet INCHANGÉ ✅ (blacklist)',
  },
  {
    id: 'S5', label: 'Trail montagne 2h/15km → cap 1h45/13km',
    session: { type: 'Trail', title: 'Côtes 5×200m D+', duration: '2h', distance: '15 km', mainSet: 'Côtes 5 × 200 m D+' },
    cap: { newDur: '1h45', newKm: '13 km' },
    expected: 'mainSet INCHANGÉ ✅ (blacklist trail + pattern frac)',
  },
];

// ============================================================================
// SECTION 8 — TESTS Validator (5 cas)
// ============================================================================
const VALIDATOR_CASES = [
  { id: 'V1', label: 'SL "8 km @11:12" + duration 1h00 (cas steph-fanny)', session: { type: 'Sortie Longue', title: 'SL', duration: '1h00', distance: '5.4 km', mainSet: '8 km à 11:12/km' }, expected: 'DETECTED (8 km ≠ 5.4 km)' },
  { id: 'V2', label: 'SL "5.3 km @11:12" + duration 1h00', session: { type: 'Sortie Longue', title: 'SL', duration: '1h00', distance: '5.3 km', mainSet: '5.3 km à 11:12/km' }, expected: 'NON-DETECTED (cohérent)' },
  { id: 'V3', label: 'Fractionné "6×800m" + 45min', session: { type: 'Fractionné', title: 'VMA', duration: '45 min', distance: '6.5 km', mainSet: '6 × 800 m à 4:00' }, expected: 'SKIP (type risky)' },
  { id: 'V4', label: 'Footing "42 min" + 1h00 (écart 30%)', session: { type: 'Footing', title: 'EF', duration: '1h00', distance: '5.4 km', mainSet: '42 min en deux moitiés' }, expected: 'DETECTED (42min vs 60min = 30% > 20%)' },
  { id: 'V5', label: 'Jogging "60 min EF" + 30 min', session: { type: 'Jogging', title: 'EF court', duration: '30 min', distance: '3 km', mainSet: '60 min EF allure conversation' }, expected: 'DETECTED (60min vs 30min = 100%)' },
];

// ============================================================================
// SECTION 9 — EXÉCUTION
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  TEST SPRINT 2 — 15 PROFILS AVANT/APRÈS — 19 mai 2026');
console.log('═══════════════════════════════════════════════════════════════════\n');

const results = [];

for (const profile of PROFILES) {
  const before = calculateFeasibilityBefore(profile.params);
  const after = calculateFeasibilityAfter(profile.params);

  const deltaScore = before.score >= 0 && after.score >= 0 ? after.score - before.score : null;

  const summary = {
    id: profile.id,
    label: profile.label,
    expected: profile.expected,
    before, after,
    deltaScore,
  };
  results.push(summary);

  console.log(`### Profil #${profile.id} — ${profile.label}`);
  console.log(`   Expected           : ${profile.expected}`);
  if (before.status === 'FINISHER_PATH') {
    console.log(`   AVANT (Sprint 2)   : FINISHER_PATH (buildFinisherFeasibility — non touché Sprint 2)`);
    console.log(`   APRÈS (Sprint 2)   : FINISHER_PATH (identique)`);
    console.log(`   Verdict            : ✅ Inchangé (path Finisher hors scope Fix C)`);
  } else {
    console.log(`   AVANT              : score ${before.score} / ${before.status} | gap ${before.gapPercent?.toFixed(1)}% | vmaRatio ${before.vmaRatioPercent}% | pctVmaTenu ${(before.pctVmaTenu*100).toFixed(1)}%`);
    console.log(`   APRÈS              : score ${after.score} / ${after.status} | pctVmaTenu ${(after.pctVmaTenu*100).toFixed(1)}%`);
    console.log(`   Δ score            : ${deltaScore >= 0 ? '+' : ''}${deltaScore}`);
  }
  console.log('');
}

// === Tests Fix D ===
console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  TESTS FIX D — sync mainSet (5 cas)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const fixDResults = [];
for (const tc of SESSIONS_FIX_D) {
  const before = JSON.parse(JSON.stringify(tc.session));
  const after = JSON.parse(JSON.stringify(tc.session));
  applySessionScale(after, tc.cap.newDur, tc.cap.newKm);
  const syncable = isMainSetSyncable(tc.session.type, tc.session.mainSet);
  const fractionalDetected = FRACTIONAL_PATTERN_RE.test(tc.session.mainSet);

  fixDResults.push({ id: tc.id, label: tc.label, before, after, syncable, fractionalDetected });
  console.log(`### ${tc.id} — ${tc.label}`);
  console.log(`   syncable?         : ${syncable} | fractional pattern? ${fractionalDetected}`);
  console.log(`   BEFORE             : duration=${before.duration} | distance=${before.distance} | mainSet="${before.mainSet}"`);
  console.log(`   AFTER  (cap)       : duration=${after.duration} | distance=${after.distance} | mainSet="${after.mainSet}"`);
  console.log(`   mainSet changed?   : ${before.mainSet !== after.mainSet}`);
  console.log(`   Expected           : ${tc.expected}`);
  console.log('');
}

// === Validator tests ===
console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  TESTS VALIDATOR — mainset_duration_mismatch (5 cas)');
console.log('═══════════════════════════════════════════════════════════════════\n');

const validatorResults = [];
for (const tc of VALIDATOR_CASES) {
  const mismatch = checkMainsetDurationMismatch(tc.session);
  validatorResults.push({ id: tc.id, label: tc.label, detected: !!mismatch, message: mismatch });
  console.log(`### ${tc.id} — ${tc.label}`);
  console.log(`   Detection         : ${mismatch ? '⚠️ ' + mismatch : '✅ pas de mismatch'}`);
  console.log(`   Expected          : ${tc.expected}`);
  console.log('');
}

// === Synthèse JSON ===
const synth = {
  date: new Date().toISOString(),
  profiles: results,
  fixD: fixDResults,
  validator: validatorResults,
};
console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  SYNTHÈSE JSON');
console.log('═══════════════════════════════════════════════════════════════════\n');
console.log(JSON.stringify(synth, null, 2));
