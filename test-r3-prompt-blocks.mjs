// ============================================================================
// Test R3 — Vérifier que buildDplusPromptBlock produit le bon prompt
// pour chaque typologie. Reproduction fidèle de la fonction.
// ============================================================================
const R3_PROMPT_DPLUS_ENABLED = true;

function buildDplusPromptBlock(opts) {
  if (!R3_PROMPT_DPLUS_ENABLED) return '';
  if (!opts.weeklyElevationTarget || opts.weeklyElevationTarget.length === 0) return '';
  const dplusPerKm = opts.raceDistanceKm > 0 ? Math.round(opts.raceDplus / opts.raceDistanceKm) : 0;
  if (opts.raceDplus < 500) return '';
  let block = '';
  if (opts.context === "preview") {
    const t = opts.weeklyElevationTarget[opts.weekIdx];
    const sl = Math.round(t * 0.58);
    const vc = Math.round(t * 0.37);
    const fo = t - sl - vc;
    block += `\n🏔️ D+ CIBLE SEMAINE 1 : ${t}m (course = ${dplusPerKm} m/km)\n`;
    block += `Répartition (renseigner \`elevationGain\` chiffré par séance) :\n`;
    block += `- Sortie Longue : ${sl}m\n`;
    block += `- Séance vallonnée ou fractionné en côte : ${vc}m\n`;
    block += `- Footings : ${fo}m\n`;
    block += `- Piste / seuil / VMA : 0m (séances plates)\n`;
  } else {
    block += `\n🏔️ D+ CIBLE PAR SEMAINE (renseigner \`elevationGain\` chiffré par séance) :\n`;
    const labels = opts.weeklyElevationTarget.map((d,i)=>{
      const isRecov = opts.recoveryWeeks.includes(i+1);
      const isAffut = i >= opts.totalWeeks - 2;
      const lbl = isRecov ? ' (récup)' : isAffut ? ' (affût)' : '';
      return `S${i+1}:${d}m${lbl}`;
    });
    block += labels.join(' | ') + '\n';
    block += `Répartition par semaine : SL ~58% | vallonnée/côte ~37% | footings ~5% | piste/seuil/VMA 0m.\n`;
  }
  return block;
}

// Simulation calculateWeekTargetElevation pour avoir weeklyElevationTarget
function calcWeekDplus(wn, total, race, level, cur) {
  if (!race) return 0;
  const l = (level||'').toLowerCase();
  const isDeb = l.includes('débutant')||l.includes('debutant');
  const isInter = l.includes('intermédiaire')||l.includes('intermediaire');
  const isConf = l.includes('confirmé')||l.includes('confirme')||l.includes('compétition');
  const maxW = isDeb ? Math.min(race,800) : isInter ? Math.min(race,1500) : isConf ? Math.min(race,2500) : Math.min(race,3500);
  const defStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
  const maxStart = Math.min(1500, Math.round(maxW*0.60));
  const minStart = Math.round(race*0.15);
  const raw = cur && cur>0 ? Math.min(cur,maxStart) : Math.min(defStart,maxStart);
  const start = Math.max(raw, Math.min(minStart, maxStart));
  const prog = Math.min(1, (wn-1)/Math.max(1,total-1));
  return Math.round(start + (maxW - start) * prog);
}

function genWeeklyEl(weeks, race, level, currentElev) {
  return Array.from({length: weeks}, (_, i) => calcWeekDplus(i+1, weeks, race, level, currentElev));
}

// 6 profils du coach + ajouts du dev
const tests = [
  { n: 'A. Trail standard 20km/200D+ (très plat, devrait SKIP R3)',
    weeks: 12, race: 200, dist: 20, level: 'Intermédiaire (Régulier)', cur: 50,
    expectSkip: true },
  { n: 'B. Trail standard 30km/1500D+ (R3 actif preview + remaining)',
    weeks: 12, race: 1500, dist: 30, level: 'Intermédiaire (Régulier)', cur: 200,
    expectSkip: false },
  { n: 'C. Trail performant 45km/2500D+ (R3 actif)',
    weeks: 16, race: 2500, dist: 45, level: 'Confirmé (Compétition)', cur: 800,
    expectSkip: false },
  { n: 'D. Ultra 75km/3500D+ (R3 actif, branche ultra70)',
    weeks: 20, race: 3500, dist: 75, level: 'Confirmé (Compétition)', cur: 1200,
    expectSkip: false },
  { n: 'E. Ultra 100km/5000D+ (R3 actif, branche ultra100 — récemment fixée)',
    weeks: 24, race: 5000, dist: 100, level: 'Expert (Performance)', cur: 1500,
    expectSkip: false },
  { n: 'F. UTMB 170km/10000D+ (R3 actif, ultra long)',
    weeks: 30, race: 10000, dist: 170, level: 'Expert (Performance)', cur: 2500,
    expectSkip: false },
];

console.log('═'.repeat(120));
console.log('  TEST R3 — Génération bloc D+ par profil');
console.log('═'.repeat(120));

for (const t of tests) {
  const wet = genWeeklyEl(t.weeks, t.race, t.level, t.cur);
  const recovWeeks = [4, 8, 12, 16, 20, 24].filter(w => w <= t.weeks - 2);
  console.log(`\n\n──── ${t.n} ────`);
  console.log(`Inputs: ${t.weeks}sem | race ${t.dist}km/${t.race}D+ | ${t.level} | vol ${t.cur}m D+/sem`);
  console.log(`weeklyElevationTarget calculé : [${wet.join(', ')}]`);
  console.log(`\n--- PREVIEW (S1) ---`);
  const preview = buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: wet, recoveryWeeks: recovWeeks, totalWeeks: t.weeks, raceDplus: t.race, raceDistanceKm: t.dist, context: 'preview' });
  if (preview === '') {
    console.log('(skip — trail très plat ou config sans D+)');
    if (!t.expectSkip) console.log('❌ FAIL: attendu R3 actif');
    else console.log('✅ Skip attendu OK');
  } else {
    if (t.expectSkip) console.log('❌ FAIL: attendu skip');
    else console.log(preview);
  }
  console.log(`--- REMAINING ---`);
  const remaining = buildDplusPromptBlock({ weekIdx: 0, weeklyElevationTarget: wet, recoveryWeeks: recovWeeks, totalWeeks: t.weeks, raceDplus: t.race, raceDistanceKm: t.dist, context: 'remaining' });
  if (remaining === '') console.log('(skip)');
  else console.log(remaining);
}

console.log('\n' + '═'.repeat(120));
