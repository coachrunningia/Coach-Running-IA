// Simulation locale du calcul periodization pour les 2 profils

function simul({label, level, vma, sessionsPerWeek, currentVolume, isFinisher, age, weight, height, totalWeeks=22, subGoal='Semi-Marathon'}) {
  console.log('\n=== '+label+' ===');
  console.log('Inputs:', {level, vma, sessionsPerWeek, currentVolume, isFinisher, age, weight, height});
  const isSemi = true;
  let maxVolume;
  if (level==='deb') maxVolume = 35;
  else if (level==='inter') maxVolume = 55;
  else if (level==='conf') maxVolume = 60;
  else maxVolume = 70;
  console.log('  baseMax (Semi level) =', maxVolume);

  // Session factor
  const runningSess = Math.max(1, sessionsPerWeek - 1);
  const sf = {1:0.70,2:0.85,3:1.00,4:1.10,5:1.20}[Math.min(runningSess,5)] || 1.00;
  maxVolume = Math.round(maxVolume * sf);
  console.log('  after sessionFactor x'+sf+' =', maxVolume);

  const baseMaxVolume = maxVolume;
  let totalReduction = 1.0;
  if (isFinisher) totalReduction *= 0.75;
  if (age && age < 18) totalReduction *= 0.70;
  else if (age && age >= 55) totalReduction *= 0.85;
  const bmi = weight && height ? weight/((height/100)**2) : 0;
  if (bmi >= 35) totalReduction *= 0.65;
  else if (bmi >= 30) totalReduction *= 0.80;
  else if (weight > 85 && bmi < 30) totalReduction *= weight >= 100 ? 0.85 : 0.90;
  totalReduction = Math.max(totalReduction, 0.60);
  console.log('  totalReduction =', totalReduction.toFixed(2), 'bmi=', bmi.toFixed(1));
  if (totalReduction < 1.0) maxVolume = Math.round(maxVolume * totalReduction);
  console.log('  after reductions =', maxVolume);

  // VMA-duration cap
  // SL durations Semi: deb 90, inter 105, conf 115, expert 120
  const slMaxDurMap = {deb:90, inter:105, conf:115, expert:120};
  const slMaxDur = slMaxDurMap[level];
  const nonSlMaxDur = Math.round(slMaxDur*0.75);
  const efSpeed = vma * 0.75;
  const realisticFactor = 0.70;
  const runningSessions = runningSess;
  const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeed;
  const otherMaxKm = ((runningSessions-1) * nonSlMaxDur * realisticFactor / 60) * efSpeed;
  const vmaBasedMax = Math.round(slMaxKm + otherMaxKm);
  console.log(`  VMA cap: slMaxDur=${slMaxDur}, nonSlMax=${nonSlMaxDur}, efSpeed=${efSpeed.toFixed(2)}, slKm=${slMaxKm.toFixed(1)}, otherKm=${otherMaxKm.toFixed(1)}, vmaBased=${vmaBasedMax}`);
  let safeVmaCap = vmaBasedMax;
  if (vmaBasedMax < maxVolume) {
    if (currentVolume > 0 && currentVolume > vmaBasedMax) {
      const gen = vma * 0.85;
      const maxAch = runningSessions===1 ? Math.round((slMaxDur/60)*gen) : Math.round((slMaxDur/60)*gen + ((runningSessions-1)*nonSlMaxDur/60)*gen);
      safeVmaCap = Math.max(vmaBasedMax, Math.min(currentVolume, maxAch));
    }
    if (safeVmaCap < maxVolume) {
      console.log('  VMA cap APPLIED:', maxVolume, '→', safeVmaCap);
      maxVolume = safeVmaCap;
    }
  } else {
    console.log('  VMA cap NOT applied (vma cap', vmaBasedMax, '≥ max', maxVolume,')');
  }

  // currentVolume floor
  if (currentVolume > 0 && maxVolume < currentVolume) {
    console.log('  maxVolume <', currentVolume, '→ raise to', currentVolume);
    maxVolume = currentVolume;
  }
  if (currentVolume > 0 && maxVolume <= currentVolume*1.05) {
    const progressionTarget = Math.round(currentVolume*1.18);
    const safeTarget = Math.min(progressionTarget, Math.round(baseMaxVolume*1.10));
    if (safeTarget > maxVolume) {
      console.log('  progression min: max', maxVolume, '→', safeTarget);
      maxVolume = safeTarget;
    }
  }

  // Mode marche-course (Débutant only + currentVol low + hasSpecificTimeTarget)
  const minViableVolume = 32; // semi
  const isLowVolMC = level==='deb' && currentVolume>0 && currentVolume < minViableVolume*0.30 && !isFinisher;
  let effectiveVmaCap = maxVolume;
  if (isLowVolMC) {
    const slMaxDurMC = 165;
    const otherDurMC = Math.round(slMaxDurMC*0.75);
    const efMC = 5.8;
    const factMC = 0.80;
    const runMC = runningSess;
    const slMC = (slMaxDurMC*factMC/60)*efMC;
    const otherMC = ((runMC-1)*otherDurMC*factMC/60)*efMC;
    const vmaCapMC = Math.round(slMC + otherMC);
    console.log('  marche-course mode: cap', effectiveVmaCap, '→', vmaCapMC);
    if (vmaCapMC > effectiveVmaCap) effectiveVmaCap = vmaCapMC;
  }
  // minViable + minPeak
  if (maxVolume < minViableVolume) {
    const safeMin = Math.min(minViableVolume, effectiveVmaCap);
    if (safeMin > maxVolume) {
      console.log('  minViable raise:', maxVolume, '→', safeMin);
      maxVolume = safeMin;
    }
  }
  const rawMinPeak = Math.round(21.1*1.5);
  const absCap = 70; // Semi expert
  const minPeak = Math.min(rawMinPeak, absCap, effectiveVmaCap);
  if (maxVolume < minPeak) {
    console.log('  minPeak raise:', maxVolume, '→', minPeak);
    maxVolume = minPeak;
  }
  console.log('  FINAL maxVolume =', maxVolume);
  return maxVolume;
}

simul({label:'Morgane', level:'deb', vma:11, sessionsPerWeek:3, currentVolume:7, isFinisher:true, age:20, weight:63, height:170});
simul({label:'Louleroy', level:'conf', vma:9.66, sessionsPerWeek:4, currentVolume:10, isFinisher:false, age:23, weight:88, height:170});

// Sanity check: pic réel observé
console.log('\n=== Pic observé Morgane: max(weeklyVolumes)=14 ===');
console.log('=== Pic observé Louleroy: max(weeklyVolumes)=18 ===');
