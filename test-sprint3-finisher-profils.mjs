// Test Sprint 3 buildFinisherFeasibility — 12 profils Finisher avant/après
// ============================================================================
// Romane (verbatim) : "limportant avec ce test cest quon ne fasse pas trop de
// modif et juste quon affine car le modele fonctionnait plutot bien honnetement
// sauf erreur."
// On vérifie : les 3 caps "max BON" (senior+10K, BMI>=27, VMA optimiste) ne
// downgradent PAS les profils qui marchaient bien.
//
// Méthode : inline 100% identique des deux versions de buildFinisherFeasibility
// (avant `f32db31` et après) + helpers. Lecture seule du repo. Aucune dépendance.

// ───────────────────────────────────────────────────────────────────────────
// Helpers communs (identiques avant/après Sprint 3)
// ───────────────────────────────────────────────────────────────────────────

const MEDICAL_RED_FLAGS_RE = /fracture|tendinite|arthros|protrusion|hernie|prothèse|prothese|chirurgie|opération|operation|déchirure|dechirure|rupture/i;

function hasMedicalRedFlag(injuryDescription) {
  if (!injuryDescription) return false;
  return MEDICAL_RED_FLAGS_RE.test(injuryDescription);
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

function isBeginner(level) {
  return level.toLowerCase().includes('débutant') || level.toLowerCase().includes('debutant');
}
function isIntermediate(level) {
  return level.toLowerCase().includes('intermédiaire') || level.toLowerCase().includes('intermediaire');
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function resolveStatus(score) {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'BON';
  if (score >= 55) return 'AMBITIEUX';
  if (score > 10) return 'RISQUÉ';
  return 'IRRÉALISTE';
}

// calculateWeekTargetElevation — stub minimal (suffit car on n'utilise PAS
// trailElevation dans les 12 profils, les valeurs trail testées n'ont pas de D+)
function calculateWeekTargetElevation(_w, _tot, _race, _level, _curr, _phase) {
  // Pour nos profils Finisher route + trail sans D+ déclaré : renvoyer 0
  // (le bloc qui l'appelle est gardé par `if (isTrail && params.trailElevation)`)
  return 0;
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
  let modulations = 0;
  if (bmi !== null && bmi >= 30) modulations += 4;
  if (age !== undefined && age >= 50) modulations += 2;
  if (hasInjury) modulations += 4;
  modulations = Math.min(modulations, 8);
  return minWeeks + modulations;
}

const R2_GATES_ENABLED = true; // default ON (cf. VITE_R2_GATES_ENABLED !== 'false')

function applyR2Gates(ctx) {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons = [];
  let scorePenalty = 0;
  let irrealisticCap;

  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const r1Multiplier = ctx.distanceKm < 20 ? 5
      : ctx.distanceKm < 50 ? 4
      : ctx.distanceKm < 100 ? 3.5
      : 3;
    const r1Min = r1Multiplier * ctx.raceDplus;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m`);
    }
    if (ctx.currentElev > 0) {
      const ratioDplus = ctx.raceDplus / ctx.currentElev;
      if (ratioDplus > 40) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Ratio D+ ${ratioDplus.toFixed(0)}× > 40`);
      } else if (ratioDplus > 25) {
        scorePenalty += 25;
        reasons.push(`Ratio D+ ${ratioDplus.toFixed(0)}× > 25`);
      } else if (ratioDplus > 15) {
        scorePenalty += 10;
        reasons.push(`Ratio D+ ${ratioDplus.toFixed(0)}× > 15`);
      }
    } else if (ctx.raceDplus >= 500) {
      scorePenalty += 15;
      reasons.push(`D+ hebdo non déclaré pour ${ctx.raceDplus}m race`);
    }
    if (ctx.currentVolume > 0) {
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const isCourt = ctx.distanceKm < 30;
      const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
      const seuils = isCourt ? { irr: 0.50, amb: 0.65 } : isMoyen ? { irr: 0.40, amb: 0.50 } : { irr: 0.30, amb: 0.40 };
      if (ratioVol < seuils.irr) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Vol ${ctx.currentVolume}km/sem trop bas (ratio ${ratioVol.toFixed(2)})`);
      } else if (ratioVol < seuils.amb) {
        scorePenalty += 20;
        reasons.push(`Vol ${ctx.currentVolume}km/sem juste (ratio ${ratioVol.toFixed(2)})`);
      }
    }
  }

  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sautPct > 0.50 || sautAbs > 15) {
      irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
      reasons.push(`Saut S0→S1 violent : ${ctx.currentVolume}→${ctx.s1Volume}km`);
    } else if (sautPct > 0.30) {
      scorePenalty += 10;
      reasons.push(`Saut S0→S1 limite : ${ctx.currentVolume}→${ctx.s1Volume}km`);
    }
  }

  if (ctx.level.includes('Expert') && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push(`Expert non validé + vol ${ctx.currentVolume}`);
  }

  return { irrealisticCap, scorePenalty, reasons };
}

// ───────────────────────────────────────────────────────────────────────────
// checkPbVmaOptimism + parsePbToSeconds (post Sprint 3 uniquement)
// ───────────────────────────────────────────────────────────────────────────

function parsePbToSeconds(time, distanceKm) {
  if (!time) return 0;
  const t = time.trim().toLowerCase();
  if (/\d+\s*km/i.test(t)) return 0;

  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const mins = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    const asHours = hours * 3600 + mins * 60;
    const maxPlausibleSec =
      distanceKm <= 5 ? 90 * 60 :
      distanceKm <= 10 ? 150 * 60 :
      distanceKm <= 21.5 ? 4 * 3600 :
      distanceKm <= 43 ? 8 * 3600 :
      Math.max(30, distanceKm * 0.5) * 3600;
    if (asHours > maxPlausibleSec) return hours * 60 + mins;
    return asHours;
  }

  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;

  const parts = t.split(':').map(Number);
  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && parts.every(n => !isNaN(n))) {
    if (distanceKm >= 21) return parts[0] * 3600 + parts[1] * 60;
    if (distanceKm >= 5 && parts[0] <= 3) return parts[0] * 3600 + parts[1] * 60;
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function checkPbVmaOptimism(vma, recentRaceTimes) {
  if (!recentRaceTimes || !vma || vma <= 0) return null;
  const pbs = [
    { dist: 5,      label: '5K',       time: recentRaceTimes.distance5km,         threshold: 0.95 },
    { dist: 10,     label: '10K',      time: recentRaceTimes.distance10km,        threshold: 0.90 },
    { dist: 21.1,   label: 'Semi',     time: recentRaceTimes.distanceHalfMarathon,threshold: 0.85 },
    { dist: 42.195, label: 'Marathon', time: recentRaceTimes.distanceMarathon,    threshold: 0.80 },
  ];
  let worst = null;
  for (const pb of pbs) {
    if (!pb.time) continue;
    const sec = parsePbToSeconds(pb.time, pb.dist);
    if (sec <= 0) continue;
    const speedKmh = pb.dist / (sec / 3600);
    if (speedKmh <= 0) continue;
    const pctVmaOnPb = speedKmh / vma;
    const isOptimistic = pctVmaOnPb > pb.threshold;
    if (!worst || pctVmaOnPb > worst.pctVmaOnPb) {
      worst = { isOptimistic, pctVmaOnPb, threshold: pb.threshold,
        pbDistance: pb.dist, pbPaceMinPerKm: (sec / 60) / pb.dist,
        source: `${pb.label} en ${pb.time}` };
    }
  }
  return worst;
}

// ───────────────────────────────────────────────────────────────────────────
// buildFinisherFeasibility — VERSION AVANT Sprint 3 (commit f32db31^)
// ───────────────────────────────────────────────────────────────────────────

function buildFinisherFeasibility_BEFORE(params, distanceKm, beginner, isTrail, isMarathon, isSemi) {
  const { vma, planWeeks, currentVolume, hasInjury, level } = params;
  let score = 80;
  let status = 'BON';
  const reasons = [];
  const trailElev = params.trailElevation || 0;
  const trailRatio = trailElev > 0 && params.trailDistance ? Math.round(trailElev / params.trailDistance) : 0;
  const currentElev = params.currentWeeklyElevation || 0;
  const intermediate = isIntermediate(level);

  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) {
    score = clamp(15, 10, 20);
    reasons.push({ type: 'risk', text: `ultra-trail ${distanceKm}km débutant` });
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) {
    score = clamp(30, 25, 35);
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 30) {
    score = Math.min(score, 55);
  } else if (beginner && isTrail && distanceKm !== null && distanceKm >= 15) {
    score = Math.min(score, 65);
    if (params.trailElevation && params.trailElevation >= 500) score -= 5;
    if (params.trailElevation && params.trailElevation >= 1000) score -= 5;
  } else if (beginner && isTrail) {
    score -= 15;
  }

  if (intermediate && isTrail && distanceKm !== null && distanceKm >= 100) score = Math.min(score, 50);
  else if (intermediate && isTrail && distanceKm !== null && distanceKm >= 60) score = Math.min(score, 60);

  if (beginner && isMarathon && planWeeks < 12) score = Math.min(score, 40);
  if (isSemi && planWeeks < 8) { score -= 15; reasons.push({ type: 'warn', text: 'semi <8 sem' }); }
  if (isMarathon && planWeeks < 12) { score -= 20; reasons.push({ type: 'risk', text: 'marathon <12 sem' }); }

  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 100 && planWeeks < 20) { score -= 40; if (planWeeks < 16) score -= 20; }
    else if (distanceKm >= 60 && planWeeks < 20) { score -= 25; if (planWeeks < 12) score -= 15; }
    else if (distanceKm >= 42 && planWeeks < 16) { score -= 20; if (planWeeks < 10) score -= 15; }
    else if (distanceKm >= 30 && planWeeks < 12) { score -= 15; if (planWeeks < 8) score -= 10; }
    else if (distanceKm >= 15 && planWeeks < 8) score -= 10;
  }

  if (isTrail && trailElev > 0 && currentElev > 0) {
    const dPlusRatio = trailElev / currentElev;
    if (dPlusRatio >= 3) score -= 20;
    else if (dPlusRatio >= 2) score -= 10;
  } else if (isTrail && trailElev >= 2000 && currentElev === 0) score -= 15;

  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) { score -= 20; reasons.push({ type: 'risk', text: `volume insuffisant marathon` }); }
    else if (isSemi && currentVolume < 20) { score -= 15; reasons.push({ type: 'warn', text: `volume juste semi` }); }
  }

  if (isTrail && distanceKm !== null && distanceKm > 42 && (currentVolume ?? 0) < 40) {
    score -= 20;
    reasons.push({ type: 'risk', text: 'volume insuffisant trail long' });
  }

  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if ((currentVolume ?? 0) < 50) { score -= 15; reasons.push({ type: 'risk', text: 'volume bas ultra' }); }
    if (params.frequency && params.frequency < 5) { score -= 15; reasons.push({ type: 'risk', text: 'fréquence faible ultra' }); }
    if (!params.hasChrono) { score -= 10; reasons.push({ type: 'warn', text: 'VMA estimée ultra' }); }
  }

  if (isTrail && distanceKm !== null && distanceKm >= 15 && distanceKm <= 42) {
    if ((currentVolume ?? 0) === 0) { score -= 15; reasons.push({ type: 'risk', text: 'aucun vol déclaré' }); }
    else if ((currentVolume ?? 0) < 20) { score -= 10; reasons.push({ type: 'warn', text: 'volume juste' }); }
  }

  if (isTrail && params.trailElevation && params.trailDistance) {
    const ratio = params.trailElevation / params.trailDistance;
    if (ratio > 80 && beginner) score -= 15;
    else if (ratio > 100) score -= 10;
    if (params.trailDistance >= 100 && planWeeks < 16) score -= 20;
    else if (params.trailDistance >= 80 && planWeeks < 14) score -= 15;
    if (currentElev > 0 && params.trailElevation > 0) {
      if (currentElev < params.trailElevation * 0.15) score -= 20;
      else if (currentElev < params.trailElevation * 0.25) score -= 10;
    } else if (currentElev === 0 && params.trailElevation > 0) {
      if (params.trailElevation >= 1500) score -= 20;
      else if (params.trailElevation >= 500) score -= 12;
      else score -= 5;
    }
  }

  if (hasInjury) { score -= 10; reasons.push({ type: 'warn', text: 'blessure' }); }
  if (hasMedicalRedFlag(params.injuryDescription)) score = Math.min(score, 25);

  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) { score -= 25; reasons.push({ type: 'risk', text: 'BMI 35+' }); }
    else if (bmi >= 30) { score -= 15; reasons.push({ type: 'warn', text: 'BMI 30+' }); }
    else if (bmi >= 25 && (isMarathon || (isTrail && distanceKm !== null && distanceKm >= 30))) {
      score -= 5;
      reasons.push({ type: 'warn', text: 'BMI 25+ marathon/trail long' });
    }
  }

  if (!params.hasChrono) { score -= 10; reasons.push({ type: 'warn', text: 'VMA estimée' }); }

  const hasVolumeWarn = reasons.some(r => (r.type === 'warn' || r.type === 'risk') && r.text.includes('vol'));
  if (currentVolume !== undefined && currentVolume > 0 && distanceKm !== null && !hasVolumeWarn) {
    if (currentVolume >= distanceKm * 0.50) { score += 15; reasons.push({ type: 'good', text: `vol ${currentVolume} excellent` }); }
    else if (currentVolume >= distanceKm * 0.30) { score += 8; reasons.push({ type: 'good', text: `vol ${currentVolume} bon` }); }
  }

  if (!beginner && planWeeks >= 16 && (currentVolume ?? 0) >= 40) {
    score += 5;
    reasons.push({ type: 'good', text: 'prep longue + vol' });
  }

  // Garde-fou débutant + vol 0
  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0
      ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) score = Math.min(score, 15);
    else if (planWeeks < minRequired * 1.2) score = Math.min(score, 30);
  }

  // R2 Gates
  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, undefined);
    }
  }
  const isMarathonFin = (distanceKm ?? 0) >= 42;
  const isSemiFin = (distanceKm ?? 0) >= 21 && (distanceKm ?? 0) < 42;
  const peakVolEstimateFin = distanceKm
    ? (isMarathonFin ? 60 : isSemiFin ? 45 : isTrail && distanceKm >= 60 ? 70
      : isTrail && distanceKm >= 30 ? 55 : 35)
    : 35;
  const s1VolEstimateFin = currentVolume && currentVolume > 0
    ? Math.round(currentVolume * 1.10)
    : Math.round(peakVolEstimateFin * 0.30);
  const r2 = applyR2Gates({
    isTrail, distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimateFin,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || '',
    hasChrono: params.hasChrono,
  });
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) score = Math.min(score, r2.irrealisticCap);

  score = clamp(score, 10, 100);
  status = resolveStatus(score);
  return { score, status, reasons };
}

// ───────────────────────────────────────────────────────────────────────────
// buildFinisherFeasibility — VERSION APRÈS Sprint 3 (commit f32db31)
// = identique BEFORE + bloc 3 caps "max BON" inséré APRÈS R2, AVANT clamp
// ───────────────────────────────────────────────────────────────────────────

function buildFinisherFeasibility_AFTER(params, distanceKm, beginner, isTrail, isMarathon, isSemi) {
  // 1. Reproduit logique BEFORE jusqu'à juste avant clamp ----------------------
  const { vma, planWeeks, currentVolume, hasInjury, level } = params;
  let score = 80;
  const reasons = [];
  const trailElev = params.trailElevation || 0;
  const currentElev = params.currentWeeklyElevation || 0;
  const intermediate = isIntermediate(level);

  if (beginner && isTrail && distanceKm !== null && distanceKm >= 60) score = clamp(15, 10, 20);
  else if (beginner && isTrail && distanceKm !== null && distanceKm >= 42) score = clamp(30, 25, 35);
  else if (beginner && isTrail && distanceKm !== null && distanceKm >= 30) score = Math.min(score, 55);
  else if (beginner && isTrail && distanceKm !== null && distanceKm >= 15) {
    score = Math.min(score, 65);
    if (params.trailElevation && params.trailElevation >= 500) score -= 5;
    if (params.trailElevation && params.trailElevation >= 1000) score -= 5;
  } else if (beginner && isTrail) score -= 15;

  if (intermediate && isTrail && distanceKm !== null && distanceKm >= 100) score = Math.min(score, 50);
  else if (intermediate && isTrail && distanceKm !== null && distanceKm >= 60) score = Math.min(score, 60);

  if (beginner && isMarathon && planWeeks < 12) score = Math.min(score, 40);
  if (isSemi && planWeeks < 8) { score -= 15; reasons.push({ type: 'warn', text: 'semi <8 sem' }); }
  if (isMarathon && planWeeks < 12) { score -= 20; reasons.push({ type: 'risk', text: 'marathon <12 sem' }); }

  if (isTrail && distanceKm !== null) {
    if (distanceKm >= 100 && planWeeks < 20) { score -= 40; if (planWeeks < 16) score -= 20; }
    else if (distanceKm >= 60 && planWeeks < 20) { score -= 25; if (planWeeks < 12) score -= 15; }
    else if (distanceKm >= 42 && planWeeks < 16) { score -= 20; if (planWeeks < 10) score -= 15; }
    else if (distanceKm >= 30 && planWeeks < 12) { score -= 15; if (planWeeks < 8) score -= 10; }
    else if (distanceKm >= 15 && planWeeks < 8) score -= 10;
  }

  if (isTrail && trailElev > 0 && currentElev > 0) {
    const dPlusRatio = trailElev / currentElev;
    if (dPlusRatio >= 3) score -= 20;
    else if (dPlusRatio >= 2) score -= 10;
  } else if (isTrail && trailElev >= 2000 && currentElev === 0) score -= 15;

  if (currentVolume !== undefined && currentVolume > 0) {
    if (isMarathon && currentVolume < 30) { score -= 20; reasons.push({ type: 'risk', text: 'volume insuffisant marathon' }); }
    else if (isSemi && currentVolume < 20) { score -= 15; reasons.push({ type: 'warn', text: 'volume juste semi' }); }
  }

  if (isTrail && distanceKm !== null && distanceKm > 42 && (currentVolume ?? 0) < 40) {
    score -= 20;
    reasons.push({ type: 'risk', text: 'volume insuffisant trail long' });
  }

  if (isTrail && distanceKm !== null && distanceKm >= 100) {
    if ((currentVolume ?? 0) < 50) { score -= 15; reasons.push({ type: 'risk', text: 'volume bas ultra' }); }
    if (params.frequency && params.frequency < 5) { score -= 15; reasons.push({ type: 'risk', text: 'fréquence faible ultra' }); }
    if (!params.hasChrono) { score -= 10; reasons.push({ type: 'warn', text: 'VMA estimée ultra' }); }
  }

  if (isTrail && distanceKm !== null && distanceKm >= 15 && distanceKm <= 42) {
    if ((currentVolume ?? 0) === 0) { score -= 15; reasons.push({ type: 'risk', text: 'aucun vol déclaré' }); }
    else if ((currentVolume ?? 0) < 20) { score -= 10; reasons.push({ type: 'warn', text: 'volume juste' }); }
  }

  if (isTrail && params.trailElevation && params.trailDistance) {
    const ratio = params.trailElevation / params.trailDistance;
    if (ratio > 80 && beginner) score -= 15;
    else if (ratio > 100) score -= 10;
    if (params.trailDistance >= 100 && planWeeks < 16) score -= 20;
    else if (params.trailDistance >= 80 && planWeeks < 14) score -= 15;
    if (currentElev > 0 && params.trailElevation > 0) {
      if (currentElev < params.trailElevation * 0.15) score -= 20;
      else if (currentElev < params.trailElevation * 0.25) score -= 10;
    } else if (currentElev === 0 && params.trailElevation > 0) {
      if (params.trailElevation >= 1500) score -= 20;
      else if (params.trailElevation >= 500) score -= 12;
      else score -= 5;
    }
  }

  if (hasInjury) { score -= 10; reasons.push({ type: 'warn', text: 'blessure' }); }
  if (hasMedicalRedFlag(params.injuryDescription)) score = Math.min(score, 25);

  if (params.weight && params.height && params.height > 0) {
    const bmi = params.weight / ((params.height / 100) ** 2);
    if (bmi >= 35) { score -= 25; reasons.push({ type: 'risk', text: 'BMI 35+' }); }
    else if (bmi >= 30) { score -= 15; reasons.push({ type: 'warn', text: 'BMI 30+' }); }
    else if (bmi >= 25 && (isMarathon || (isTrail && distanceKm !== null && distanceKm >= 30))) {
      score -= 5;
      reasons.push({ type: 'warn', text: 'BMI 25+ marathon/trail long' });
    }
  }

  if (!params.hasChrono) { score -= 10; reasons.push({ type: 'warn', text: 'VMA estimée' }); }

  const hasVolumeWarn = reasons.some(r => (r.type === 'warn' || r.type === 'risk') && r.text.includes('vol'));
  if (currentVolume !== undefined && currentVolume > 0 && distanceKm !== null && !hasVolumeWarn) {
    if (currentVolume >= distanceKm * 0.50) { score += 15; reasons.push({ type: 'good', text: `vol ${currentVolume} excellent` }); }
    else if (currentVolume >= distanceKm * 0.30) { score += 8; reasons.push({ type: 'good', text: `vol ${currentVolume} bon` }); }
  }
  if (!beginner && planWeeks >= 16 && (currentVolume ?? 0) >= 40) { score += 5; reasons.push({ type: 'good', text: 'prep longue + vol' }); }

  if (beginner && (currentVolume ?? 0) === 0) {
    const bmiBeg = params.weight && params.height && params.height > 0
      ? params.weight / ((params.height / 100) ** 2) : null;
    const minRequired = getMinimumWeeksForBeginnerVolZero(distanceKm, isTrail, bmiBeg, params.age, hasInjury);
    if (planWeeks < minRequired) score = Math.min(score, 15);
    else if (planWeeks < minRequired * 1.2) score = Math.min(score, 30);
  }

  let totalDplusCycleR2 = 0;
  if (isTrail && params.trailElevation) {
    for (let i = 1; i <= planWeeks; i++) {
      totalDplusCycleR2 += calculateWeekTargetElevation(i, planWeeks, params.trailElevation, params.level, params.currentWeeklyElevation, undefined);
    }
  }
  const isMarathonFin = (distanceKm ?? 0) >= 42;
  const isSemiFin = (distanceKm ?? 0) >= 21 && (distanceKm ?? 0) < 42;
  const peakVolEstimateFin = distanceKm
    ? (isMarathonFin ? 60 : isSemiFin ? 45 : isTrail && distanceKm >= 60 ? 70
      : isTrail && distanceKm >= 30 ? 55 : 35)
    : 35;
  const s1VolEstimateFin = currentVolume && currentVolume > 0
    ? Math.round(currentVolume * 1.10)
    : Math.round(peakVolEstimateFin * 0.30);
  const r2 = applyR2Gates({
    isTrail, distanceKm,
    raceDplus: params.trailElevation ?? 0,
    planWeeks,
    currentVolume: currentVolume ?? 0,
    currentElev: params.currentWeeklyElevation ?? 0,
    s1Volume: s1VolEstimateFin,
    totalDplusCycle: totalDplusCycleR2,
    level: params.level || '',
    hasChrono: params.hasChrono,
  });
  score -= r2.scorePenalty;
  if (r2.irrealisticCap !== undefined) score = Math.min(score, r2.irrealisticCap);

  // 2. Bloc Sprint 3 - 3 caps "max BON" --------------------------------------
  const capsTriggered = [];
  const scoreBeforeCaps = score;
  const isSenior = params.age !== undefined && params.age >= 55;
  const isMidLongDistance = distanceKm !== null && distanceKm >= 10;
  if (isSenior && isMidLongDistance) {
    if (score > 84) {
      score = 84;
      capsTriggered.push(`senior10K+(${params.age} ans, ${distanceKm}km)`);
      reasons.push({ type: 'warn', text: `cap senior ${params.age}` });
    }
  }
  if (params.weight && params.height && params.height > 0) {
    const bmiFin = params.weight / ((params.height / 100) ** 2);
    if (bmiFin >= 27 && score > 84) {
      score = 84;
      capsTriggered.push(`BMI27(${bmiFin.toFixed(1)})`);
    }
  }
  const pbCheck = checkPbVmaOptimism(vma, params.recentRaceTimes);
  if (pbCheck && pbCheck.isOptimistic && score > 84) {
    score = 84;
    capsTriggered.push(`VMAoptimiste(${(pbCheck.pctVmaOnPb*100).toFixed(0)}% vs ${(pbCheck.threshold*100).toFixed(0)}%)`);
  }

  score = clamp(score, 10, 100);
  const status = resolveStatus(score);
  return { score, status, reasons, capsTriggered, scoreBeforeCaps, pbCheck };
}

// ───────────────────────────────────────────────────────────────────────────
// Helper de lancement (calculateFeasibility avec targetTime=Finisher route
// vers buildFinisherFeasibility)
// ───────────────────────────────────────────────────────────────────────────

function runFeasibility(version, params) {
  const distanceKm = getDistanceKm(params.distance);
  const isTrail = params.goal.toLowerCase().includes('trail');
  const beginner = isBeginner(params.level);
  const isMarathon = !isTrail && distanceKm !== null && distanceKm >= 42;
  const isSemi = !isTrail && distanceKm !== null && distanceKm >= 21 && distanceKm < 42;
  const fn = version === 'before' ? buildFinisherFeasibility_BEFORE : buildFinisherFeasibility_AFTER;
  return fn(params, distanceKm, beginner, isTrail, isMarathon, isSemi);
}

// ───────────────────────────────────────────────────────────────────────────
// 12 PROFILS DE TEST
// ───────────────────────────────────────────────────────────────────────────

const profils = [
  {
    n: 1,
    nom: 'Steph-fanny case (référence bug)',
    expectedBefore: 'EXCELLENT >= 85',
    expectedAfter:  'BON <= 84 (cap senior+10K et/ou VMAoptimiste)',
    p: {
      sex: 'F', age: 60, weight: 60, height: 160,
      level: 'Intermédiaire (Régulier)', distance: '10 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 8, currentVolume: 20, planWeeks: 12,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance5km: '46:00' },
    },
  },
  {
    n: 2,
    nom: 'Jeune débutant 5K',
    expectedBefore: 'BON/EXCELLENT',
    expectedAfter:  'inchangé (pas senior, pas 10K+, pas BMI haut)',
    p: {
      sex: 'F', age: 28, weight: 60, height: 165,
      level: 'Débutant (0-1 an)', distance: '5 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 9, currentVolume: 10, planWeeks: 12,
      hasChrono: false, hasInjury: false,
    },
  },
  {
    n: 3,
    nom: 'Adulte 40 ans 10K Finisher PB cohérent VMA',
    expectedBefore: 'BON/EXCELLENT',
    expectedAfter:  'inchangé (40 ans, BMI 24, PB 10K 50min sur VMA 13 = 92% < 90%, légèrement optimiste)',
    p: {
      // VMA 13 km/h → tenable 10K à 90% = 11.7 km/h = 51:18 → PB 50min est 92% donc légèrement optimiste
      // Pour qu'il soit NON optimiste : VMA >= 13.4 km/h. On met VMA 14 pour avoir cohérence
      sex: 'H', age: 40, weight: 75, height: 178,
      level: 'Intermédiaire (Régulier)', distance: '10 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 14, currentVolume: 30, planWeeks: 10,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance10km: '50:00' }, // 12 km/h = 86% VMA → pas optimiste
    },
  },
  {
    n: 4,
    nom: 'Senior 55 ans Marathon Finisher',
    expectedBefore: 'BON/EXCELLENT',
    expectedAfter:  'BON <= 84 (cap senior + Marathon)',
    p: {
      sex: 'H', age: 55, weight: 78, height: 178,
      level: 'Intermédiaire (Régulier)', distance: 'Marathon',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 11, currentVolume: 40, planWeeks: 18,
      hasChrono: true, hasInjury: false,
    },
  },
  {
    n: 5,
    nom: 'Senior 60 Trail 30K Finisher',
    expectedBefore: 'BON',
    expectedAfter:  'BON <= 84 (cap senior + 30K)',
    p: {
      sex: 'F', age: 60, weight: 60, height: 162,
      level: 'Confirmé (Compétition)', distance: 'Trail 30km',
      goal: 'Trail', targetTime: 'Finisher',
      vma: 13, currentVolume: 50, planWeeks: 16,
      trailDistance: 30, trailElevation: 0,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance10km: '1:00:00' },
    },
  },
  {
    n: 6,
    nom: 'BMI 28 jeune 35 ans Marathon Finisher',
    expectedBefore: 'BON (BMI 25-30 + marathon = -5)',
    expectedAfter:  'BON <= 84 (cap BMI 27+)',
    p: {
      sex: 'H', age: 35, weight: 90, height: 179,
      level: 'Débutant (0-1 an)', distance: 'Marathon',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 10, currentVolume: 25, planWeeks: 18,
      hasChrono: false, hasInjury: false,
    },
  },
  {
    n: 7,
    nom: 'Senior 65 ans 5K Finisher',
    expectedBefore: 'BON/EXCELLENT',
    expectedAfter:  'inchangé (5K < 10K seuil senior, pas optimiste)',
    p: {
      sex: 'F', age: 65, weight: 58, height: 160,
      level: 'Intermédiaire (Régulier)', distance: '5 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 9, currentVolume: 15, planWeeks: 10,
      hasChrono: false, hasInjury: false,
    },
  },
  {
    n: 8,
    nom: 'Confirmé 50 ans VMA 16 PB 10K 42min (cohérent)',
    expectedBefore: 'EXCELLENT',
    expectedAfter:  'inchangé (50 ans < 55, PB 42min = 14.28 km/h = 89% VMA 16, juste sous seuil 90%)',
    p: {
      // 10K 42min = 14.28 km/h. Pour ≤ 90% VMA → VMA ≥ 15.87. On met VMA 16 = 89.3%
      sex: 'H', age: 50, weight: 70, height: 178,
      level: 'Confirmé (Compétition)', distance: '10 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 16, currentVolume: 50, planWeeks: 10,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance10km: '42:00' },
    },
  },
  {
    n: 9,
    nom: 'VMA modérément optimiste (91% sur 5K)',
    expectedBefore: 'EXCELLENT',
    expectedAfter:  'inchangé si 91% < seuil 95%, sinon BON',
    p: {
      sex: 'F', age: 45, weight: 60, height: 165,
      level: 'Débutant (0-1 an)', distance: '10 km',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 11, currentVolume: 20, planWeeks: 12,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance5km: '26:00' },
    },
  },
  {
    n: 10,
    nom: 'VMA TRES optimiste (5K 22min sur VMA 11)',
    expectedBefore: 'EXCELLENT',
    expectedAfter:  'BON <= 84 (VMA optimiste si 5K pace = ~99% VMA)',
    p: {
      sex: 'F', age: 50, weight: 60, height: 165,
      level: 'Intermédiaire (Régulier)', distance: 'Semi',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 11, currentVolume: 35, planWeeks: 12,
      hasChrono: true, hasInjury: false,
      recentRaceTimes: { distance5km: '22:00' },
    },
  },
  {
    n: 11,
    nom: 'Expert 45 ans Marathon Finisher VMA 17',
    expectedBefore: 'EXCELLENT',
    expectedAfter:  'inchangé (45 ans, BMI 21, pas senior, pas BMI 27+)',
    p: {
      sex: 'H', age: 45, weight: 68, height: 178,
      level: 'Expert (Performance)', distance: 'Marathon',
      goal: 'Finisher', targetTime: 'Finisher',
      vma: 17, currentVolume: 70, planWeeks: 18,
      hasChrono: true, hasInjury: false,
    },
  },
  {
    n: 12,
    nom: 'Ultra 100K Finisher 50 ans',
    expectedBefore: 'BON',
    expectedAfter:  'inchangé (50 ans = pas senior pour seuil)',
    p: {
      sex: 'H', age: 50, weight: 70, height: 175,
      level: 'Expert (Performance)', distance: 'Trail 100km',
      goal: 'Trail', targetTime: 'Finisher',
      vma: 14, currentVolume: 80, planWeeks: 24,
      trailDistance: 100, trailElevation: 0,
      frequency: 6,
      hasChrono: true, hasInjury: false,
    },
  },
];

// ───────────────────────────────────────────────────────────────────────────
// RUN
// ───────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(80));
console.log('TEST SPRINT 3 — 12 PROFILS FINISHER AVANT/APRÈS (commit f32db31)');
console.log('═'.repeat(80));

let conforme = 0, differentOk = 0, regression = 0;
const resultsLog = [];

for (const profil of profils) {
  const before = runFeasibility('before', profil.p);
  const after = runFeasibility('after', profil.p);
  const delta = after.score - before.score;
  const statusChanged = before.status !== after.status;

  const bmi = profil.p.weight && profil.p.height
    ? (profil.p.weight / ((profil.p.height / 100) ** 2)).toFixed(1)
    : 'n/a';

  console.log(`\n─── Profil #${profil.n} : ${profil.nom} ───`);
  console.log(`  Inputs: ${profil.p.sex} ${profil.p.age}ans BMI=${bmi} ${profil.p.level}`);
  console.log(`          ${profil.p.distance} | VMA=${profil.p.vma} vol=${profil.p.currentVolume}km/sem ${profil.p.planWeeks}sem hasChrono=${profil.p.hasChrono}`);
  if (profil.p.recentRaceTimes) {
    console.log(`          PB: ${JSON.stringify(profil.p.recentRaceTimes)}`);
  }
  console.log(`  BEFORE: score=${before.score}  status=${before.status}`);
  console.log(`  AFTER : score=${after.score}  status=${after.status}  scorePreCaps=${after.scoreBeforeCaps}`);
  console.log(`  Caps déclenchés: ${after.capsTriggered.length ? after.capsTriggered.join(' | ') : 'aucun'}`);
  if (after.pbCheck) {
    console.log(`  pbCheck: ${after.pbCheck.source} -> ${(after.pbCheck.pctVmaOnPb*100).toFixed(1)}% VMA (seuil ${(after.pbCheck.threshold*100).toFixed(0)}%) optimiste=${after.pbCheck.isOptimistic}`);
  }
  console.log(`  Δ score: ${delta > 0 ? '+' : ''}${delta}  Δ status: ${statusChanged ? `${before.status} -> ${after.status}` : 'inchangé'}`);
  console.log(`  Attendu BEFORE: ${profil.expectedBefore}`);
  console.log(`  Attendu AFTER : ${profil.expectedAfter}`);

  // Catégorisation
  // ✅ Conforme  : profils qu'on voulait downgrader ET qui le sont, OU profils qu'on voulait préserver ET qui le sont
  // ⚠️ Différent OK : profil downgrade légitime (cap déclenché à dessein)
  // ❌ Régression : profil "qui marchait bien" downgrade indésirable
  let categorie = '';
  switch (profil.n) {
    case 1: // doit downgrader
      categorie = (after.status === 'BON' && after.score <= 84 && delta < 0) ? '✅ Conforme (downgrade attendu)' : '❌ Régression (pas de downgrade)';
      break;
    case 2: // ne doit pas changer
      categorie = (delta === 0) ? '✅ Conforme (inchangé)' : '❌ Régression';
      break;
    case 3: // ne doit pas changer
      categorie = (delta === 0) ? '✅ Conforme (inchangé)' : (delta < 0 && after.capsTriggered.length ? '⚠️ Différent (cap senior n/a, à investiguer)' : '❌ Régression');
      break;
    case 4: // doit downgrader (cap senior+marathon)
      categorie = (after.score <= 84 && after.capsTriggered.some(c => c.includes('senior'))) ? '✅ Conforme (downgrade senior+marathon)' : '❌ Pas de downgrade attendu';
      break;
    case 5: // doit downgrader (senior+30K)
      categorie = (after.score <= 84 && after.capsTriggered.some(c => c.includes('senior'))) ? '✅ Conforme (downgrade senior+30K)' : '❌ Pas de downgrade';
      break;
    case 6: // doit downgrader (BMI 27+)
      categorie = (after.score <= 84 && after.capsTriggered.some(c => c.includes('BMI'))) ? '✅ Conforme (cap BMI)' : (after.score <= 84 ? '⚠️ Différent OK (score déjà bas)' : '❌ Pas de cap BMI');
      break;
    case 7: // ne doit pas changer (5K < seuil 10K)
      categorie = (delta === 0) ? '✅ Conforme (5K hors scope cap senior)' : '❌ Régression';
      break;
    case 8: // ne doit pas changer (PB compétitif, pas optimiste, 50 ans < 55)
      categorie = (delta === 0) ? '✅ Conforme (PB 42min réaliste)' : '❌ Régression';
      break;
    case 9: // borderline
      categorie = (delta === 0) ? '✅ Conforme (91% < seuil 95%)' : (after.capsTriggered.some(c => c.includes('VMA')) ? '⚠️ Différent OK (cap VMA)' : '❌ Régression');
      break;
    case 10: // doit downgrader (VMA très optimiste)
      categorie = (after.score <= 84 && after.capsTriggered.some(c => c.includes('VMA'))) ? '✅ Conforme (cap VMA optimiste)' : '❌ Pas de cap VMA';
      break;
    case 11: // ne doit pas changer
      categorie = (delta === 0) ? '✅ Conforme (Expert sain, hors caps)' : '❌ Régression';
      break;
    case 12: // ne doit pas changer
      categorie = (delta === 0) ? '✅ Conforme (50 ans < seuil 55)' : '❌ Régression';
      break;
  }
  console.log(`  VERDICT: ${categorie}`);

  if (categorie.startsWith('✅')) conforme++;
  else if (categorie.startsWith('⚠️')) differentOk++;
  else regression++;

  resultsLog.push({ profil, before, after, delta, categorie, bmi });
}

console.log('\n' + '═'.repeat(80));
console.log('SYNTHÈSE');
console.log('═'.repeat(80));
console.log(`✅ Conforme attendu     : ${conforme}/12`);
console.log(`⚠️ Différent mais OK   : ${differentOk}/12`);
console.log(`❌ Régression / over-correction : ${regression}/12`);

if (regression > 0) {
  console.log('\n--- DÉTAIL RÉGRESSIONS ---');
  for (const r of resultsLog.filter(x => x.categorie.startsWith('❌'))) {
    console.log(`Profil #${r.profil.n} ${r.profil.nom}`);
    console.log(`  Δ score ${r.delta}, caps: ${r.after.capsTriggered.join('|') || 'aucun'}`);
  }
}

// Sortie machine-readable
console.log('\n' + '═'.repeat(80));
console.log('JSON');
console.log('═'.repeat(80));
console.log(JSON.stringify(resultsLog.map(r => ({
  n: r.profil.n, nom: r.profil.nom, bmi: r.bmi,
  before: { score: r.before.score, status: r.before.status },
  after:  { score: r.after.score,  status: r.after.status, capsTriggered: r.after.capsTriggered, scoreBeforeCaps: r.after.scoreBeforeCaps },
  delta: r.delta, categorie: r.categorie,
})), null, 2));
