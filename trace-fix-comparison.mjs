// Comparaison de cas existants AVANT/APRÈS un fix possible
// Fix proposé : ajouter cap "pctVmaTenu > seuil distance"

function getVmaFactor(d) {
  if (d <= 5) return 0.95;
  if (d <= 10) return 0.90;
  if (d <= 21.1) return 0.85;
  if (d <= 42.195) return 0.80;
  if (d <= 80) return 0.70;
  return 0.65;
}

// Seuils %VMA "max physiologique" pour chaque distance
// Pfitzinger/Daniels : sur Semi, élite tient ~88%, intermédiaire ~83-85%
// >5% au-dessus du factor théorique = très ambitieux ; >10% au-dessus = irréaliste
function pctVmaThresholds(d) {
  const baseFactor = getVmaFactor(d);
  return {
    ambitieux: baseFactor + 0.05,    // ex Semi : 0.85+0.05 = 0.90 → AMBITIEUX si >90%VMA tenu
    irrealiste: baseFactor + 0.10,   // ex Semi : 0.85+0.10 = 0.95 → IRRÉALISTE si >95%VMA tenu
  };
}

function simulate(name, params) {
  const { vma, targetMinutes, distanceKm } = params;
  const factor = getVmaFactor(distanceKm);
  const requiredSpeed = distanceKm / (targetMinutes / 60);
  const pctVmaTenu = requiredSpeed / vma;
  const thresholds = pctVmaThresholds(distanceKm);
  const theoMinutes = (distanceKm / (vma * factor)) * 60;
  const gapPercent = ((theoMinutes - targetMinutes) / theoMinutes) * 100;

  console.log(`\n=== ${name} ===`);
  console.log(`  VMA ${vma} | dist ${distanceKm}km | cible ${targetMinutes}min`);
  console.log(`  Factor théorique ${factor*100}% | Temps théorique ${theoMinutes.toFixed(1)}min`);
  console.log(`  gapPercent = ${gapPercent.toFixed(1)}%`);
  console.log(`  %VMA tenu pour cible = ${(pctVmaTenu*100).toFixed(1)}%`);
  console.log(`  Seuils AMBITIEUX ${(thresholds.ambitieux*100).toFixed(0)}% | IRRÉALISTE ${(thresholds.irrealiste*100).toFixed(0)}%`);

  let triggerFix = '';
  if (pctVmaTenu > thresholds.irrealiste) {
    triggerFix = `IRRÉALISTE (>${(thresholds.irrealiste*100).toFixed(0)}% VMA tenu sur ${distanceKm}km)`;
  } else if (pctVmaTenu > thresholds.ambitieux) {
    triggerFix = `AMBITIEUX strict (>${(thresholds.ambitieux*100).toFixed(0)}% VMA tenu)`;
  } else {
    triggerFix = 'PASS (pas de downgrade)';
  }
  console.log(`  → Fix : ${triggerFix}`);
  return { pctVmaTenu, gapPercent, triggerFix };
}

// Cas 1 : mxjulien02 — Semi 2h00 VMA 10.8
simulate('mxjulien02 Semi 2h00 VMA 10.807', {
  vma: 10.807, targetMinutes: 120, distanceKm: 21.1
});

// Cas 2 : Coureur 5K 18min objectif 10K 38min (BON normalement)
// 18min sur 5K = 16.67 km/h → VMA 17.54
// 10K 38min = 15.79 km/h
simulate('5K 18min → 10K 38min', {
  vma: 17.54, targetMinutes: 38, distanceKm: 10
});

// Cas 3 : Marathon 3h00 VMA 14 (ambitieux mais doable Intermédiaire/Confirmé)
// 3h00 = 180min. 42.195km en 180min = 14.07 km/h → 100% VMA. Impossible.
// Reformulons : Confirmé VMA 16 visant 3h00.
// 42.195/180*60 = 14.07 km/h. 14.07/16 = 88% VMA tenu. Factor Marathon 80% donc >88% = irréaliste.
simulate('Marathon 3h00 VMA 16 (confirmé)', {
  vma: 16, targetMinutes: 180, distanceKm: 42.195
});

simulate('Marathon 3h00 VMA 17 (élite club)', {
  vma: 17, targetMinutes: 180, distanceKm: 42.195
});

simulate('Marathon 3h30 VMA 16', {
  vma: 16, targetMinutes: 210, distanceKm: 42.195
});

// Cas 4 : Débutant 10K Finisher (pas de targetTime, on n'arrive même pas ici)
// Cas 5 : Semi 1h45 VMA 13 (Intermédiaire+ raisonnable)
// 21.1/105*60 = 12.06 km/h. 12.06/13 = 92.7% VMA. Factor 85%. → >90% donc AMBITIEUX strict
simulate('Semi 1h45 VMA 13', {
  vma: 13, targetMinutes: 105, distanceKm: 21.1
});

simulate('Semi 1h30 VMA 16', {
  vma: 16, targetMinutes: 90, distanceKm: 21.1
});

// 10K 45min VMA 12
simulate('10K 45min VMA 12', {
  vma: 12, targetMinutes: 45, distanceKm: 10
});

// 10K 45min VMA 10
simulate('10K 45min VMA 10 (limite)', {
  vma: 10, targetMinutes: 45, distanceKm: 10
});
