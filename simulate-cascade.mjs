/**
 * Simulate calculatePeriodizationPlan cascade for each profile.
 * Faithful reimplementation of geminiService.ts (lines 1076-2810).
 */
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./10-cascade-v2.json', 'utf8'));

// === CONSTANTS (from geminiService.ts) ===
const MAX_WEEKLY_VOLUME = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  'TrailSteep':{ deb: 25, inter: 35, conf: 45, expert: 55 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 25, inter: 40, conf: 50, expert: 60 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};
const MAX_SL_DURATION = {
  '5K':        { deb: 60, inter: 75, conf: 80, expert: 90 },
  '10K':       { deb: 75, inter: 90, conf: 100, expert: 110 },
  'Semi':      { deb: 90, inter: 110, conf: 120, expert: 130 },
  'Marathon':  { deb: 120, inter: 150, conf: 170, expert: 180 },
  'Hyrox':     { deb: 60, inter: 75, conf: 90, expert: 100 },
  'VK':        { deb: 75, inter: 90, conf: 105, expert: 120 },
  'TrailSteep':{ deb: 90, inter: 110, conf: 130, expert: 150 },
  'Trail<30':  { deb: 90, inter: 120, conf: 150, expert: 180 },
  'Trail30+':  { deb: 150, inter: 180, conf: 210, expert: 240 },
  'Trail60+':  { deb: 180, inter: 240, conf: 300, expert: 360 },
  'Trail100+': { deb: 180, inter: 300, conf: 360, expert: 480 },
  'PertePoids':{ deb: 60, inter: 75, conf: 90, expert: 105 },
  'Maintien':  { deb: 50, inter: 70, conf: 80, expert: 90 },
};
const CHRONO_LEVEL_THRESHOLDS = {
  '10K': { M: [50, 42, 36], F: [60, 50, 42] },
  '5K':  { M: [30, 25, 21], F: [35, 30, 25] },
};
const LEVEL_RANK = { deb: 0, inter: 1, conf: 2, expert: 3 };
const LEVEL_NAMES = ['deb', 'inter', 'conf', 'expert'];

function labelToLevelKey(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition')) return 'conf';
  return 'inter';
}

function timeToSeconds(timeStr, distance) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/);
  if (hm) { const h = parseInt(hm[1]); const m = hm[2] ? parseInt(hm[2]) : 0; return h * 3600 + m * 60; }
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) { if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60; return parseInt(ms[1])*60 + parseInt(ms[2]); }
  return 0;
}

function classifyByChrono(seconds, dist, isFemale) {
  const min = seconds / 60;
  const T = CHRONO_LEVEL_THRESHOLDS[dist][isFemale ? 'F' : 'M'];
  if (min > T[0]) return 'deb';
  if (min > T[1]) return 'inter';
  if (min > T[2]) return 'conf';
  return 'expert';
}

function detectLevelFromData(q, vma) {
  const declared = labelToLevelKey(q.level);
  const isFemale = q.sex === 'Femme';
  const c5kSec  = q.recentRaceTimes?.distance5km  ? timeToSeconds(q.recentRaceTimes.distance5km, 5)   : 0;
  const c10kSec = q.recentRaceTimes?.distance10km ? timeToSeconds(q.recentRaceTimes.distance10km, 10) : 0;
  const chronoLevels = [];
  if (c5kSec > 0)  chronoLevels.push(classifyByChrono(c5kSec, '5K', isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, '10K', isFemale));
  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      return { level: chronoLevel, reason: `chrono override (5k=${q.recentRaceTimes?.distance5km||'-'}, 10k=${q.recentRaceTimes?.distance10km||'-'})` };
    }
  }
  // VMA override
  const usedVma = vma || q.vma || q.estimatedVMA;
  if (usedVma && usedVma > 0) {
    let vmaLevel;
    if (isFemale) {
      if (usedVma < 9.5) vmaLevel = 'deb';
      else if (usedVma < 12.5) vmaLevel = 'inter';
      else if (usedVma < 15) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    } else {
      if (usedVma < 11) vmaLevel = 'deb';
      else if (usedVma < 14) vmaLevel = 'inter';
      else if (usedVma < 17) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    }
    const gap = LEVEL_RANK[declared] - LEVEL_RANK[vmaLevel];
    if (gap >= 1) {
      const hardDropThreshold = isFemale ? 10.5 : 12;
      const maxDrop = usedVma < hardDropThreshold ? 2 : 1;
      const adjustedLevel = LEVEL_NAMES[Math.max(LEVEL_RANK[declared] - maxDrop, LEVEL_RANK[vmaLevel])];
      return { level: adjustedLevel, reason: `VMA override: declared=${declared} VMA=${usedVma} (${isFemale?'F':'M'}) implies "${vmaLevel}" gap=${gap} drop=${maxDrop} → ${adjustedLevel}` };
    }
  }
  return { level: declared, reason: 'declared kept' };
}

function isFinisherTarget(t) {
  const trimmed = (t || '').trim();
  if (!trimmed) return true;
  if (/^finisher$/i.test(trimmed)) return true;
  return !/\d/.test(trimmed);
}

function simulate(profile) {
  const q = profile.questionnaireSnapshot || {};
  const vma = profile.vmaTop || profile.gc?.vma;
  const sessionsPerWeek = profile.sessionsPerWeek;
  const currentVolume = q.currentWeeklyVolume || 0;
  const totalWeeks = profile.durationWeeks;
  const subGoal = q.subGoal;
  const goal = q.goal || '';
  const trailDistance = q.trailDetails?.distance;
  const trailElevation = q.trailDetails?.elevation;
  const targetTime = q.targetTime;
  const age = q.age;
  const weight = q.weight;
  const height = q.height;
  const vmaSource = profile.vmaSourceTop || profile.gc?.vmaSource;

  const detect = detectLevelFromData(q, vma);
  const effectiveLevelKey = detect.level;
  const LEVEL_LABEL = { deb: 'Débutant (0-1 an)', inter: 'Intermédiaire (Régulier)', conf: 'Confirmé (Compétition)', expert: 'Expert (Performance)' };
  const level = LEVEL_LABEL[effectiveLevelKey];

  const trace = [];
  trace.push(`detectLevelFromData → ${effectiveLevelKey} (${detect.reason})`);

  // === calculatePeriodizationPlan ===
  let progressionRate = level === 'Débutant (0-1 an)' ? 0.08 :
                        level === 'Intermédiaire (Régulier)' ? 0.08 :
                        level === 'Confirmé (Compétition)' ? 0.10 : 0.12;
  trace.push(`progressionRate base = ${progressionRate*100}%`);

  const bmiForRate = (weight && height > 0) ? weight / ((height / 100) ** 2) : 0;
  trace.push(`BMI = ${bmiForRate.toFixed(1)}`);
  if (bmiForRate >= 35) {
    progressionRate = Math.min(progressionRate, 0.05);
    trace.push(`IMC≥35 → progressionRate clamped to ${progressionRate*100}%`);
  } else if (bmiForRate >= 30) {
    progressionRate = Math.min(progressionRate, 0.06);
    trace.push(`IMC≥30 → progressionRate clamped to ${progressionRate*100}%`);
  }

  const sub = (subGoal || '').toLowerCase();
  const isMarathon = sub.includes('marathon') && !sub.includes('semi');
  const isSemi = sub.includes('semi');
  const is10k = sub.includes('10');
  const isTrail = goal.includes('Trail');
  const isUltraLong = isTrail && (trailDistance || 0) >= 100;
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrail30Plus = isTrail && (trailDistance || 0) >= 30;
  const isPertePoids = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien') || goal.includes('Remise');
  const dPlusPerKm = (trailDistance && trailDistance > 0 && trailElevation) ? (trailElevation / trailDistance) : 0;
  const isVK = isTrail && (trailDistance || 0) <= 5 && dPlusPerKm >= 150;
  const isTrailSteep = !isVK && isTrail && (trailDistance || 0) <= 15 && dPlusPerKm >= 80;
  const isHyrox = goal.includes('Hyrox');

  let maxVolume;
  if (level === 'Débutant (0-1 an)') {
    if (isHyrox) maxVolume = 16;
    else if (isPertePoids) maxVolume = 20;
    else if (isMaintien) maxVolume = 25;
    else if (isVK) maxVolume = 20;
    else if (isTrailSteep) maxVolume = 25;
    else if (isMarathon) maxVolume = 45;
    else if (isUltraLong) maxVolume = 55;
    else if (isUltra) maxVolume = 45;
    else if (isTrail30Plus) maxVolume = 45;
    else if (isTrail) maxVolume = 35;
    else if (isSemi) maxVolume = 35;
    else if (is10k) maxVolume = 30;
    else maxVolume = 25;
  } else if (level === 'Expert (Performance)') {
    if (isHyrox) maxVolume = 38;
    else if (isPertePoids) maxVolume = 45;
    else if (isMaintien) maxVolume = 55;
    else if (isVK) maxVolume = 45;
    else if (isTrailSteep) maxVolume = 55;
    else if (isUltraLong) maxVolume = 120;
    else if (isUltra) maxVolume = 100;
    else if (isMarathon) maxVolume = 85;
    else if (isTrail30Plus) maxVolume = 80;
    else if (isTrail) maxVolume = 65;
    else if (isSemi) maxVolume = 70;
    else if (is10k) maxVolume = 65;
    else maxVolume = 60;
  } else if (level === 'Confirmé (Compétition)') {
    if (isHyrox) maxVolume = 30;
    else if (isPertePoids) maxVolume = 35;
    else if (isMaintien) maxVolume = 45;
    else if (isVK) maxVolume = 35;
    else if (isTrailSteep) maxVolume = 45;
    else if (isUltraLong) maxVolume = 95;
    else if (isUltra) maxVolume = 70;
    else if (isMarathon) maxVolume = 75;
    else if (isTrail30Plus) maxVolume = 70;
    else if (isTrail) maxVolume = 55;
    else if (isSemi) maxVolume = 60;
    else if (is10k) maxVolume = 55;
    else maxVolume = 46;
  } else {
    if (isHyrox) maxVolume = 23;
    else if (isPertePoids) maxVolume = 30;
    else if (isMaintien) maxVolume = 40;
    else if (isVK) maxVolume = 30;
    else if (isTrailSteep) maxVolume = 35;
    else if (isUltraLong) maxVolume = 75;
    else if (isUltra) maxVolume = 55;
    else if (isMarathon) maxVolume = 65;
    else if (isTrail30Plus) maxVolume = 60;
    else if (isTrail) maxVolume = 50;
    else if (isSemi) maxVolume = 55;
    else if (is10k) maxVolume = 50;
    else maxVolume = 40;
  }
  trace.push(`maxVolume base (table by level/goal) = ${maxVolume}km`);

  // Session factor
  if (sessionsPerWeek && sessionsPerWeek > 0) {
    const runningSess = Math.max(1, sessionsPerWeek - 1);
    const sessionFactors = { 1: 0.70, 2: 0.85, 3: 1.00, 4: 1.10, 5: 1.20 };
    const sessionFactor = sessionFactors[Math.min(runningSess, 5)] || 1.00;
    if (sessionFactor !== 1.00) {
      const before = maxVolume;
      maxVolume = Math.round(maxVolume * sessionFactor);
      trace.push(`Session factor ${sessionsPerWeek}sess → ${runningSess}run × ${sessionFactor} → ${before}→${maxVolume}km`);
    }
  }

  const baseMaxVolume = maxVolume;
  let totalReduction = 1.0;

  const isFinisher = isFinisherTarget(targetTime);
  if (isFinisher && !isPertePoids && !isMaintien) {
    totalReduction *= 0.75;
    trace.push(`Finisher → ×0.75`);
  }

  if (age && age > 0) {
    if (age < 18) { totalReduction *= 0.70; trace.push(`Ado ${age} → ×0.70`); }
    else if (age >= 55) { totalReduction *= 0.85; trace.push(`Senior ${age} → ×0.85`); }
  }

  const bmi = bmiForRate;
  if (bmi >= 35) { totalReduction *= 0.65; trace.push(`IMC ${bmi.toFixed(1)} ≥35 → ×0.65`); }
  else if (bmi >= 30) { totalReduction *= 0.80; trace.push(`IMC ${bmi.toFixed(1)} ≥30 → ×0.80`); }
  else if (weight && weight > 85 && bmi < 30) {
    const wf = weight >= 100 ? 0.85 : 0.90;
    totalReduction *= wf; trace.push(`Poids ${weight}kg (IMC<30) → ×${wf}`);
  }

  totalReduction = Math.max(totalReduction, 0.60);
  if (totalReduction < 1.0) {
    const originalMax = maxVolume;
    maxVolume = Math.round(maxVolume * totalReduction);
    trace.push(`Reduction combinée totalReduction=${totalReduction.toFixed(2)} → ${originalMax}→${maxVolume}km (base=${baseMaxVolume})`);
  }

  // VMA cap
  if (vma && vma > 0 && sessionsPerWeek && sessionsPerWeek > 0) {
    let objectiveKey = isVK ? 'VK' : isTrailSteep ? 'TrailSteep' :
      isUltraLong ? 'Trail100+' : isUltra ? 'Trail60+' : isTrail30Plus ? 'Trail30+' : isTrail ? 'Trail<30' :
      isMarathon ? 'Marathon' : isSemi ? 'Semi' : is10k ? '10K' : isPertePoids ? 'PertePoids' :
      isMaintien ? 'Maintien' : '5K';
    if (objectiveKey === 'PertePoids' || objectiveKey === 'Maintien') {
      const src = (vmaSource || '').toLowerCase();
      if (src.includes('marathon') && !src.includes('semi')) objectiveKey = 'Marathon';
      else if (src.includes('semi')) objectiveKey = 'Semi';
      else if (src.includes('10k') || src.includes('10 km')) objectiveKey = '10K';
    }
    const levelKey = labelToLevelKey(level);
    const slMaxDur = MAX_SL_DURATION[objectiveKey]?.[levelKey] || MAX_SL_DURATION[objectiveKey]?.inter || 90;
    const nonSlMaxDur = Math.round(slMaxDur * 0.75);
    const efSpeedKmH = vma * 0.75;
    const runningSessions = Math.max(1, sessionsPerWeek - 1);
    const realisticFactor = 0.70;
    const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;
    const otherMaxKm = ((runningSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;
    const vmaBasedMaxVolume = Math.round(slMaxKm + otherMaxKm);
    trace.push(`VMA-cap raw: VMA=${vma} EF=${efSpeedKmH.toFixed(1)} runSess=${runningSessions} SLmax=${slMaxDur}min nonSL=${nonSlMaxDur}min → vmaCap=${vmaBasedMaxVolume}km`);

    if (vmaBasedMaxVolume < maxVolume) {
      let safeVmaCap = vmaBasedMaxVolume;
      if (currentVolume > 0 && currentVolume > vmaBasedMaxVolume) {
        const generousEfSpeed = vma * 0.85;
        const maxAchievable = runningSessions === 1
          ? Math.round((slMaxDur / 60) * generousEfSpeed)
          : Math.round((slMaxDur / 60) * generousEfSpeed + ((runningSessions - 1) * nonSlMaxDur / 60) * generousEfSpeed);
        safeVmaCap = Math.max(vmaBasedMaxVolume, Math.min(currentVolume, maxAchievable));
        trace.push(`VMA safe cap: currentVol=${currentVolume}km, achievable@85%VMA=${maxAchievable}km → safeVmaCap=${safeVmaCap}km`);
      }
      if (safeVmaCap < maxVolume) {
        const before = maxVolume;
        maxVolume = safeVmaCap;
        trace.push(`VMA-cap APPLIED: ${before}→${maxVolume}km`);
      }
    }
  }

  // Floor current volume
  if (currentVolume > 0 && maxVolume < currentVolume) {
    trace.push(`maxVolume ${maxVolume} < currentVolume ${currentVolume} → raised`);
    maxVolume = currentVolume;
  }
  if (currentVolume > 0 && maxVolume <= currentVolume * 1.05) {
    const progressionTarget = Math.round(currentVolume * 1.18);
    const safeTarget = Math.min(progressionTarget, Math.round(baseMaxVolume * 1.10));
    if (safeTarget > maxVolume) {
      trace.push(`Progression min: ${maxVolume}→${safeTarget} (currentVol×1.18=${progressionTarget}, base×1.10=${Math.round(baseMaxVolume*1.10)})`);
      maxVolume = safeTarget;
    }
  }
  const vmaHardCap = maxVolume;

  // raceDistanceKm
  const raceDistanceKm = isTrail ? (trailDistance || 10) :
    isMarathon ? 42.2 : isSemi ? 21.1 : is10k ? 10 : 5;
  const minViableVolume = raceDistanceKm <= 5 ? 15 : raceDistanceKm <= 10 ? 22 :
    raceDistanceKm <= 21.1 ? 32 : raceDistanceKm <= 42.2 ? 38 : 40;

  // Mode marche-course
  let effectiveVmaCap = vmaHardCap;
  const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);
  const isLowVolForTimedLongRace = currentVolume > 0 &&
    currentVolume < minViableVolume * 0.30 &&
    raceDistanceKm >= 15 &&
    hasSpecificTimeTarget;
  if (isLowVolForTimedLongRace) {
    const slMaxDurMC = 165, otherMaxDurMC = Math.round(slMaxDurMC * 0.75);
    const efSpeedMC = 5.8, realisticFactorMC = 0.80;
    const runningSessionsMC = Math.max(1, (sessionsPerWeek ?? 3) - 1);
    const slMaxKmMC = (slMaxDurMC * realisticFactorMC / 60) * efSpeedMC;
    const otherMaxKmMC = ((runningSessionsMC - 1) * otherMaxDurMC * realisticFactorMC / 60) * efSpeedMC;
    const vmaCapMC = Math.round(slMaxKmMC + otherMaxKmMC);
    if (vmaCapMC > effectiveVmaCap) {
      effectiveVmaCap = vmaCapMC;
      trace.push(`Mode marche-course → effectiveVmaCap=${vmaCapMC}km`);
    }
  }

  if (maxVolume < minViableVolume) {
    const safeMin = Math.min(minViableVolume, effectiveVmaCap);
    if (safeMin > maxVolume) {
      trace.push(`maxVolume ${maxVolume} < minViable ${minViableVolume} → raised to ${safeMin}`);
      maxVolume = safeMin;
    }
  }

  const rawMinPeakVolume = Math.round(raceDistanceKm * 1.5);
  const objectiveKey = isVK ? 'VK' : isTrailSteep ? 'TrailSteep' :
    isUltraLong ? 'Trail100+' : isUltra ? 'Trail60+' : isTrail30Plus ? 'Trail30+' : isTrail ? 'Trail<30' :
    isMarathon ? 'Marathon' : isSemi ? 'Semi' : is10k ? '10K' : isPertePoids ? 'PertePoids' :
    isMaintien ? 'Maintien' : '5K';
  const absoluteCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert || 100;
  const minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap);
  if (maxVolume < minPeakVolume) {
    trace.push(`maxVolume ${maxVolume} < minPeak ${minPeakVolume} (raw=${rawMinPeakVolume} cap=${absoluteCap}) → raised`);
    maxVolume = minPeakVolume;
  }

  trace.push(`FINAL maxVolume = ${maxVolume}km`);

  // === Phases / progression ===
  let fondamentalWeeks, developpementWeeks, specifiqueWeeks, affutageWeeks;
  if (isMaintien || isPertePoids) {
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.45));
    developpementWeeks = Math.max(1, totalWeeks - fondamentalWeeks);
    specifiqueWeeks = 0; affutageWeeks = 0;
  } else if (totalWeeks <= 4) {
    fondamentalWeeks = 1; developpementWeeks = Math.max(1, totalWeeks - 3);
    specifiqueWeeks = 1; affutageWeeks = 1;
  } else if (totalWeeks <= 6) {
    fondamentalWeeks = Math.max(1, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(1, Math.floor(totalWeeks * 0.35));
    affutageWeeks = 1;
    specifiqueWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - affutageWeeks);
  } else {
    fondamentalWeeks = Math.max(2, Math.floor(totalWeeks * 0.30));
    developpementWeeks = Math.max(2, Math.floor(totalWeeks * 0.35));
    specifiqueWeeks = Math.max(2, Math.floor(totalWeeks * 0.25));
    affutageWeeks = Math.max(1, totalWeeks - fondamentalWeeks - developpementWeeks - specifiqueWeeks);
    if (totalWeeks <= 14 && affutageWeeks > 2) { const excess = affutageWeeks - 2; affutageWeeks = 2; specifiqueWeeks += excess; }
    const maxAffutageByDist = raceDistanceKm <= 10 ? 1 : raceDistanceKm <= 21.1 ? 2 : raceDistanceKm <= 42.2 ? 3 : 4;
    if (affutageWeeks > maxAffutageByDist) { const excess = affutageWeeks - maxAffutageByDist; affutageWeeks = maxAffutageByDist; specifiqueWeeks += excess; }
    const lvlKeyForTaper = labelToLevelKey(level);
    const isHighLevelTaper = lvlKeyForTaper === 'conf' || lvlKeyForTaper === 'expert';
    const needLongTaper = (isSemi || isMarathon) && isHighLevelTaper && maxVolume >= 50;
    if (needLongTaper && affutageWeeks < 3) {
      const wanted = 3 - affutageWeeks;
      const fromSpec = Math.min(wanted, Math.max(0, specifiqueWeeks - 2));
      const fromDev = Math.min(wanted - fromSpec, Math.max(0, developpementWeeks - 2));
      const actualGain = fromSpec + fromDev;
      if (actualGain > 0) { affutageWeeks += actualGain; specifiqueWeeks -= fromSpec; developpementWeeks -= fromDev; }
    }
  }

  const phases = [];
  for (let i = 0; i < totalWeeks; i++) {
    if (i < fondamentalWeeks) phases.push('fondamental');
    else if (i < fondamentalWeeks + developpementWeeks) phases.push('developpement');
    else if (i < fondamentalWeeks + developpementWeeks + specifiqueWeeks) phases.push('specifique');
    else phases.push('affutage');
  }

  const firstAffutageWeek = totalWeeks - affutageWeeks + 1;
  const recoveryWeeks = [];
  const recoveryInterval = level === 'Débutant (0-1 an)' ? 3 : 4;
  const firstRecoveryWeek = Math.max(recoveryInterval, 4);
  for (let i = firstRecoveryWeek; i <= totalWeeks - 2; i += recoveryInterval) {
    if (i >= firstAffutageWeek) continue;
    recoveryWeeks.push(i);
    phases[i - 1] = 'recuperation';
  }
  const lastRecov = recoveryWeeks.length > 0 ? recoveryWeeks[recoveryWeeks.length - 1] : 0;
  const weeksAfterLastRecov = totalWeeks - lastRecov;
  if (weeksAfterLastRecov > recoveryInterval && totalWeeks - 1 > lastRecov) {
    const extraRecov = lastRecov + recoveryInterval;
    const isRacePlan = !(isMaintien || isPertePoids);
    const minWeek = isRacePlan ? totalWeeks - affutageWeeks : totalWeeks;
    if (extraRecov <= minWeek && extraRecov <= totalWeeks - 1) {
      recoveryWeeks.push(extraRecov); phases[extraRecov - 1] = 'recuperation';
    }
  }

  // === Volumes ===
  const peakWeekIndex = totalWeeks - affutageWeeks - 1;
  let progressionWeeks = 0;
  for (let i = 0; i <= peakWeekIndex; i++) {
    if (!recoveryWeeks.includes(i + 1)) progressionWeeks++;
  }
  const idealStartVolume = maxVolume / Math.pow(1 + progressionRate, Math.max(1, progressionWeeks - 1));
  let minStartVolume = level === 'Débutant (0-1 an)' ? 8 :
                      level === 'Intermédiaire (Régulier)' ? 15 :
                      level === 'Confirmé (Compétition)' ? 20 : 25;
  if (bmiForRate >= 35 && minStartVolume > 5) minStartVolume = Math.max(5, Math.round(minStartVolume * 0.60));
  else if (bmiForRate >= 30 && minStartVolume > 6) minStartVolume = Math.max(6, Math.round(minStartVolume * 0.75));

  let startVolume = Math.max(idealStartVolume, minStartVolume);
  if (currentVolume > 0) {
    const currentVolumeFloor = currentVolume;
    startVolume = Math.max(startVolume, currentVolumeFloor);
    const volumeCap = Math.max(currentVolume, minStartVolume);
    startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
    startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90));
  } else {
    startVolume = Math.min(startVolume, maxVolume * 0.65);
  }

  let effectiveRate = progressionRate;
  if (progressionWeeks > 0 && startVolume > 0 && maxVolume > startVolume) {
    const targetPeakAt = Math.round(progressionWeeks * 0.70);
    const neededRate = Math.pow(maxVolume / startVolume, 1 / Math.max(1, targetPeakAt - 1)) - 1;
    if (neededRate < progressionRate && neededRate > 0.05) effectiveRate = neededRate;
  }

  let currentVol = startVolume;
  let weeksAtPeak = 0;
  const weeklyVolumes = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = i + 1;
    if (recoveryWeeks.includes(weekNum)) {
      const prevWeekVol = weeklyVolumes.length > 0 ? weeklyVolumes[weeklyVolumes.length - 1] : currentVol;
      const recoveryFactor = prevWeekVol >= 60 ? 0.80 : prevWeekVol >= 30 ? 0.78 : 0.80;
      weeklyVolumes.push(Math.round(prevWeekVol * recoveryFactor));
      weeksAtPeak = 0;
    } else if (phases[i] === 'affutage') {
      const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
      const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
      weeklyVolumes.push(Math.round(currentVol * reductionFactor));
    } else {
      const atPeak = currentVol >= maxVolume * 0.98;
      if (atPeak) {
        weeksAtPeak++;
        const ondulationFactor = weeksAtPeak % 2 === 0 ? 0.95 : 1.0;
        weeklyVolumes.push(Math.round(maxVolume * ondulationFactor));
      } else {
        weeklyVolumes.push(Math.round(currentVol));
      }
      currentVol = Math.min(currentVol * (1 + effectiveRate), maxVolume);
    }
  }

  // Post-rate fallback
  const actualPeak = Math.max(...weeklyVolumes);
  if (actualPeak < minPeakVolume * 0.85) {
    const neededRate = Math.pow(minPeakVolume / startVolume, 1 / Math.max(1, progressionWeeks - 1)) - 1;
    const adjustedRate = Math.min(neededRate, 0.20);
    if (adjustedRate > progressionRate) {
      let adjustedVol = startVolume;
      for (let i = 0; i < totalWeeks; i++) {
        const weekNum = i + 1;
        if (recoveryWeeks.includes(weekNum)) {
          const prevVol = i > 0 ? weeklyVolumes[i - 1] : adjustedVol;
          const recovFactor = prevVol >= 60 ? 0.80 : prevVol >= 30 ? 0.78 : 0.80;
          weeklyVolumes[i] = Math.round(prevVol * recovFactor);
        } else if (phases[i] === 'affutage') {
          const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
          const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
          weeklyVolumes[i] = Math.round(adjustedVol * reductionFactor);
        } else {
          weeklyVolumes[i] = Math.round(adjustedVol);
          adjustedVol = Math.min(adjustedVol * (1 + adjustedRate), maxVolume);
        }
      }
    }
  }

  // Smoothing
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < weeklyVolumes.length - 1; i++) {
      const curr = weeklyVolumes[i];
      const next = weeklyVolumes[i + 1];
      if (curr <= 5 || next <= 5) continue;
      const increase = (next - curr) / curr;
      if (increase < 0) continue;
      const isFromRecovery = recoveryWeeks.includes(i + 1) || phases[i] === 'recuperation';
      if (isFromRecovery) {
        const preRecovVol = i > 0 ? weeklyVolumes[i - 1] : curr;
        const maxPostRecov = Math.min(preRecovVol, Math.round(curr * 1.15));
        if (next > maxPostRecov) weeklyVolumes[i + 1] = maxPostRecov;
      } else if (increase > 0.15) {
        weeklyVolumes[i + 1] = Math.round(curr * 1.15);
      }
    }
  }

  const simulatedPeak = Math.max(...weeklyVolumes);
  return {
    effectiveLevel: effectiveLevelKey,
    progressionRate,
    effectiveRate,
    maxVolume,
    baseMaxVolume,
    startVolume: Math.round(startVolume),
    idealStartVolume: Math.round(idealStartVolume*10)/10,
    minStartVolume,
    minViableVolume,
    rawMinPeakVolume,
    minPeakVolume,
    vmaHardCap,
    effectiveVmaCap,
    objectiveKey,
    bmi: Math.round(bmiForRate*10)/10,
    weeklyVolumes,
    weeklyPhases: phases,
    recoveryWeeks,
    simulatedPeak,
    simulatedS1: weeklyVolumes[0],
    trace,
  };
}

// === RUN ===
const result = {};
for (const [email, prof] of Object.entries(data)) {
  if (prof.error) { result[email] = { error: prof.error }; continue; }
  const sim = simulate(prof);
  result[email] = {
    inputs: {
      level: prof.questionnaireSnapshot?.level,
      sex: prof.questionnaireSnapshot?.sex,
      age: prof.questionnaireSnapshot?.age,
      weight: prof.questionnaireSnapshot?.weight,
      height: prof.questionnaireSnapshot?.height,
      goal: prof.questionnaireSnapshot?.goal,
      subGoal: prof.questionnaireSnapshot?.subGoal,
      targetTime: prof.questionnaireSnapshot?.targetTime,
      currentWeeklyVolume: prof.questionnaireSnapshot?.currentWeeklyVolume,
      frequency: prof.sessionsPerWeek,
      trailDetails: prof.questionnaireSnapshot?.trailDetails,
      recentRaceTimes: prof.questionnaireSnapshot?.recentRaceTimes,
      vma: prof.vmaTop,
      durationWeeks: prof.durationWeeks,
    },
    observed: {
      peakPlanned: prof.peakPlanned,
      S1: prof.weeklyVolumes?.[0],
      weeklyVolumes: prof.weeklyVolumes,
      weeklyPhases: prof.weeklyPhases,
      recoveryWeeks: prof.recoveryWeeks,
    },
    simulated: sim,
    divergence: {
      peak: prof.peakPlanned - sim.simulatedPeak,
      s1: (prof.weeklyVolumes?.[0] || 0) - sim.simulatedS1,
    },
  };
  console.log(`${email}: observed peak=${prof.peakPlanned} | simulated peak=${sim.simulatedPeak} | diff=${prof.peakPlanned - sim.simulatedPeak}`);
}
fs.writeFileSync('10-cascade-simulation.json', JSON.stringify(result, null, 2));
console.log('\n=> 10-cascade-simulation.json');
