// Trace pas-à-pas du calcul feasibility pour mxjulien02
// VMA 10.807, Semi 2h00, Intermédiaire, 19 sem, 39 ans, BMI 26.87, vol 25, freq 4

// Inputs réels du plan 1779147815002
const vma = 10.807321333637123;
const targetMinutes = 120; // 2h00
const distanceKm = 21.1;
const planWeeks = 19;
const currentVolume = 25;
const age = 39;
const weight = 90;
const height = 183;
const beginner = false;
const intermediate = true;
const isMarathon = false;
const isSemi = true;
const isTrail = false;
const hasInjury = false;
const hasChrono = true; // 5K et 10K renseignés
const vmaFromTarget = false;
const frequency = 4;

// Étape 1: temps théorique
function getVmaFactor(d) {
  if (d <= 5) return 0.95;
  if (d <= 10) return 0.90;
  if (d <= 21.1) return 0.85;
  if (d <= 42.195) return 0.80;
  if (d <= 80) return 0.70;
  return 0.65;
}
const factor = getVmaFactor(distanceKm);
const speedKmh = vma * factor; // 10.807 * 0.85 = 9.186 km/h
const theoMinutes = (distanceKm / speedKmh) * 60;
console.log(`[1] VMA factor pour Semi : ${factor} (= 85% VMA)`);
console.log(`[1] Vitesse théorique : ${speedKmh.toFixed(3)} km/h`);
console.log(`[1] Temps théorique : ${theoMinutes.toFixed(2)} min = ${Math.floor(theoMinutes/60)}h${Math.round(theoMinutes%60)}min`);

// Étape 2: gapPercent
const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;
console.log(`\n[2] gapPercent = (${theoMinutes.toFixed(2)} - ${targetMinutes}) / ${theoMinutes.toFixed(2)} * 100 = ${gapPercent.toFixed(2)}%`);
console.log(`    → cible PLUS RAPIDE que théorique de ${gapPercent.toFixed(2)}%`);

// Étape 3: VMA requise pour 2h00
const requiredSpeed = distanceKm / (targetMinutes / 60); // km/h pour Semi en 2h00
const vmaNeeded = requiredSpeed / factor;
const vmaRatioPercent = Math.round((vmaNeeded / vma) * 100);
console.log(`\n[3] Vitesse requise pour 2h00 : ${requiredSpeed.toFixed(3)} km/h`);
console.log(`    VMA requise (vitesse / 0.85) : ${vmaNeeded.toFixed(3)} km/h`);
console.log(`    Ratio VMA needed / VMA actuelle : ${vmaRatioPercent}% (seuil IRRÉALISTE = 130%)`);
console.log(`    >= 130% ? ${vmaRatioPercent >= 130 ? 'OUI → IRRÉALISTE direct' : 'NON → branche par gapPercent'}`);

// Étape 4: % VMA tenu pour atteindre l'objectif
// Si l'utilisateur tient 2h00 = 10.55 km/h, c'est combien de % de sa VMA actuelle ?
const pctVmaTenu = (requiredSpeed / vma) * 100;
console.log(`\n[4] % VMA tenu pour atteindre la cible : ${pctVmaTenu.toFixed(2)}%`);
console.log(`    → Référentiel Pfitzinger : >95% VMA sur 21km = impossible hors élite (seuil lactique 88-92% VMA)`);

// Étape 5: branche statut
console.log(`\n[5] Branches statut (gapPercent = ${gapPercent.toFixed(2)}%) :`);
let score, status;
if (gapPercent <= -5) {
  score = 95;
  status = 'EXCELLENT';
  console.log(`    → gap <= -5% → EXCELLENT, score = 95`);
} else if (gapPercent <= 5) {
  score = Math.round(100 - (Math.abs(gapPercent) * 3));
  score = Math.max(85, Math.min(100, score));
  status = 'EXCELLENT';
  console.log(`    → gap <= 5% → EXCELLENT, score = ${score}`);
} else if (gapPercent <= 15) {
  score = Math.round(84 - ((gapPercent - 5) * 1.4));
  score = Math.max(70, Math.min(84, score));
  status = 'BON';
  console.log(`    → gap <= 15% → BON, score = ${score}`);
} else if (gapPercent <= 25) {
  score = Math.round(69 - ((gapPercent - 15) * 1.4));
  score = Math.max(55, Math.min(69, score));
  status = 'AMBITIEUX';
  console.log(`    → gap <= 25% → AMBITIEUX, score = ${score}`);
} else {
  score = Math.round(54 - ((gapPercent - 25) * 0.8));
  score = Math.max(10, Math.min(54, score));
  status = 'RISQUÉ';
  console.log(`    → gap > 25% → RISQUÉ, score = ${score}`);
}

// Étape 6: facteurs aggravants
console.log(`\n[6] Facteurs aggravants :`);
// Intermédiaire + sub-1h20 semi → non (cible 2h00)
console.log(`    intermediate && isSemi && targetMinutes < 80 ? non (targetMinutes=120)`);
// VMA basse + ambitieux
if (vma < 12 && gapPercent > 5) {
  const lowVmaPenalty = Math.round((12 - vma) * (gapPercent - 5) * 0.5);
  console.log(`    VMA < 12 && gap > 5% → pénalité = round((12 - ${vma.toFixed(3)}) * (${gapPercent.toFixed(2)} - 5) * 0.5) = ${lowVmaPenalty}`);
  score -= lowVmaPenalty;
  console.log(`    → score après pénalité VMA basse = ${score}`);
}
// planWeeks 19 >= 8 → pas de pénalité Semi
console.log(`    isSemi && planWeeks < 8 ? non (planWeeks=19)`);
// currentVolume 25 >= 20 → pas de pénalité semi vol
console.log(`    isSemi && currentVolume < 20 ? non (currentVolume=25)`);

// hasChrono = true → pas de cap "no chrono"
console.log(`    hasChrono = true → pas de cap noChronoCap`);

// vmaFromTarget = false → pas de cap circulaire
console.log(`    vmaFromTarget = false → pas de cap`);

// hasInjury = false
// medical red flag = false

// BMI 26.87
const bmi = weight / ((height/100)**2);
console.log(`    BMI = ${bmi.toFixed(2)}`);
let bmiPenalty = 0;
if (bmi >= 35) bmiPenalty = isMarathon ? 30 : 25;
else if (bmi >= 30) bmiPenalty = isMarathon ? 20 : 15;
else if (bmi >= 27) bmiPenalty = isMarathon ? 10 : isSemi ? 7 : 3;
else if (bmi >= 25) bmiPenalty = isMarathon ? 5 : isSemi ? 3 : 0;
console.log(`    BMI penalty (Semi) : -${bmiPenalty} (BMI 26.87 → 25 <= BMI < 27 → penalty Semi=3)`);
score -= bmiPenalty;
console.log(`    → score après BMI = ${score}`);

// Cumul facteurs : pas senior (39 < 45), pas beginner → 0
console.log(`    Cumul facteurs : non (age<45, !beginner)`);

// R2 gates : pas trail, S1 estim
const s1VolEstimate = Math.round(currentVolume * 1.10); // 27.5 → 28
const sautAbs = s1VolEstimate - currentVolume;
const sautPct = (s1VolEstimate / currentVolume) - 1;
console.log(`    R2 saut S0→S1 : ${currentVolume} → ${s1VolEstimate} (saut +${sautAbs}km, ${(sautPct*100).toFixed(0)}%)`);
console.log(`    sautPct > 0.50 ? non | sautPct > 0.30 ? non → pas de pénalité R2`);

// Clamp final
const finalScore = Math.max(10, Math.min(100, score));
console.log(`\n[7] Score final clampé : ${finalScore}`);

function resolveStatus(s) {
  if (s >= 85) return 'EXCELLENT';
  if (s >= 70) return 'BON';
  if (s >= 55) return 'AMBITIEUX';
  if (s > 10) return 'RISQUÉ';
  return 'IRRÉALISTE';
}
const finalStatus = resolveStatus(finalScore);
console.log(`[7] Statut résolu : ${finalStatus}`);

console.log(`\n=== ATTENDU ALGO : score ${finalScore}, status ${finalStatus}`);
console.log(`=== JSON RÉEL : score 65, status AMBITIEUX`);
