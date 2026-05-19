// Tests STANDALONE des 2 patches AVANT toute modification de prod
// Reproduit les helpers en JS pur, lance batteries de tests unitaires
// Si tous OK → on peut envisager d'appliquer le patch au vrai code

// ════════════════════════════════════════════════════════════════════
// HELPERS COPIÉS depuis geminiService.ts (pour reproduire le comportement)
// ════════════════════════════════════════════════════════════════════

function timeToSeconds(timeStr, distanceKm) {
  if (!timeStr) return 0;
  const m = timeStr.match(/(\d+)h\s*(\d+)?|(\d+)\s*min/);
  if (!m) return 0;
  let h, mins;
  if (m[1] !== undefined) { h = parseInt(m[1]); mins = parseInt(m[2] || '0'); }
  else { h = 0; mins = parseInt(m[3]); }
  return h * 3600 + mins * 60;
}

function secondsToPace(secPerKm) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

function paceToSeconds(paceStr) {
  const [m, s] = paceStr.split(':').map(x => parseInt(x));
  return m * 60 + (s || 0);
}

// ════════════════════════════════════════════════════════════════════
// VERSION ACTUELLE (avec le bug : condition asymétrique)
// ════════════════════════════════════════════════════════════════════
function applyTargetTimeOverride_CURRENT(paces, data) {
  if (!data.targetTime || !data.subGoal) return paces;
  const map = {
    '5 km': { dist: 5, paceKey: 'allureSpecifique5k' },
    '10 km': { dist: 10, paceKey: 'allureSpecifique10k' },
    'Semi-Marathon': { dist: 21.1, paceKey: 'allureSpecifiqueSemi' },
    'Marathon': { dist: 42.195, paceKey: 'allureSpecifiqueMarathon' },
  };
  const info = map[data.subGoal];
  if (!info) return paces;
  const targetSec = timeToSeconds(data.targetTime, info.dist);
  if (targetSec === 0) return paces;
  const targetPaceSec = targetSec / info.dist;
  const currentPaceSec = paceToSeconds(paces[info.paceKey]);
  // BUG ACTUEL : override SEULEMENT si cible plus LENTE
  if (targetPaceSec > currentPaceSec) {
    paces[info.paceKey] = secondsToPace(targetPaceSec);
  }
  return paces;
}

// ════════════════════════════════════════════════════════════════════
// VERSION PATCHÉE (doctrine produit + safeguard 98% VMA)
// ════════════════════════════════════════════════════════════════════
function applyTargetTimeOverride_PATCHED(paces, data, vma) {
  if (!data.targetTime || !data.subGoal) return paces;
  const map = {
    '5 km': { dist: 5, paceKey: 'allureSpecifique5k' },
    '10 km': { dist: 10, paceKey: 'allureSpecifique10k' },
    'Semi-Marathon': { dist: 21.1, paceKey: 'allureSpecifiqueSemi' },
    'Marathon': { dist: 42.195, paceKey: 'allureSpecifiqueMarathon' },
  };
  const info = map[data.subGoal];
  if (!info) return paces;
  const targetSec = timeToSeconds(data.targetTime, info.dist);
  if (targetSec === 0) return paces;
  const targetPaceSec = targetSec / info.dist;

  // SAFEGUARD : si cible > 98% VMA → infaisable, on garde potentiel actuel
  // (le signal d'irréalisme est porté par score+welcome, pas par l'allure)
  const vmaPaceSec = 3600 / vma; // secondes/km à VMA pure
  const targetVmaRatio = vmaPaceSec / targetPaceSec; // ex: 4:57 / 5:41 = 87%
  if (targetVmaRatio > 0.98) {
    // Cible demande > 98% VMA en compé → physiologiquement infaisable
    console.log(`[Safeguard] Cible ${data.targetTime} = ${(targetVmaRatio*100).toFixed(0)}% VMA, infaisable. Garde allure potentiel.`);
    return paces;
  }

  // SINON : on applique la cible (doctrine produit)
  paces[info.paceKey] = secondsToPace(targetPaceSec);
  return paces;
}

// ════════════════════════════════════════════════════════════════════
// FIXTURES — couvre tous les cas
// ════════════════════════════════════════════════════════════════════
const FIXTURES = [
  {
    name: 'F01 Clément (cible 5:41 < potentiel 5:49) — bug doit être fixé',
    data: { targetTime: '2h00', subGoal: 'Semi-Marathon' },
    vma: 12.12,
    pacesInit: { allureSpecifiqueSemi: '5:49' },
    expected: { current: '5:49', patched: '5:41' },
  },
  {
    name: 'F02 Marathon 4h00 user VMA 14.4 (cible 5:41 > potentiel 5:13) — cas safe original',
    data: { targetTime: '4h00', subGoal: 'Marathon' },
    vma: 14.4,
    pacesInit: { allureSpecifiqueMarathon: '5:13' },
    expected: { current: '5:41', patched: '5:41' }, // les 2 doivent override
  },
  {
    name: 'F03 Sans chrono (Finisher) — ne doit RIEN modifier',
    data: { targetTime: undefined, subGoal: 'Semi-Marathon' },
    vma: 12,
    pacesInit: { allureSpecifiqueSemi: '5:49' },
    expected: { current: '5:49', patched: '5:49' },
  },
  {
    name: 'F04 Sans subGoal (Hyrox, PdP, Maintien)',
    data: { targetTime: '1h00', subGoal: undefined },
    vma: 12,
    pacesInit: { allureSpecifiqueSemi: '5:49' },
    expected: { current: '5:49', patched: '5:49' },
  },
  {
    name: 'F05 Cible 10K 50min user VMA 12.5 (potentiel ~5:00) — cible 5:00 = sain',
    data: { targetTime: '50min', subGoal: '10 km' },
    vma: 12.5,
    pacesInit: { allureSpecifique10k: '5:24' }, // 90% VMA pace
    expected: { current: '5:24', patched: '5:00' }, // bug actuel : 5:00 < 5:24 donc condition fausse, reste 5:24
  },
  {
    name: 'F06 IRRÉALISTE — Cible 5K 16min user VMA 16 (cible = 100% VMA pure)',
    data: { targetTime: '16min', subGoal: '5 km' },
    vma: 16,
    pacesInit: { allureSpecifique5k: '3:45' }, // 95% VMA
    expected: { current: '3:45', patched: '3:45' }, // safeguard active : 3600/16 = 225s/km = 3:45 = 100% VMA → garde 3:45 actuel
  },
  {
    name: 'F07 Cible Semi 1h30 user VMA 16 (cible 4:16/km = ~88% VMA) — légitime',
    data: { targetTime: '1h30', subGoal: 'Semi-Marathon' },
    vma: 16,
    pacesInit: { allureSpecifiqueSemi: '4:31' }, // 83% VMA
    expected: { current: '4:31', patched: '4:16' }, // patched applique
  },
  {
    name: 'F08 Cible exactement = potentiel (rien à changer)',
    data: { targetTime: '4h00', subGoal: 'Marathon' },
    vma: 14.0, // 4h00 = 5:41/km, VMA 14 → potentiel marathon = 5:41 (84% VMA)
    pacesInit: { allureSpecifiqueMarathon: '5:41' },
    expected: { current: '5:41', patched: '5:41' },
  },
];

// ════════════════════════════════════════════════════════════════════
// LANCE LES TESTS
// ════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TESTS UNITAIRES applyTargetTimeOverride');
console.log('═══════════════════════════════════════════════════════════════\n');

let passCurrent = 0, failCurrent = 0;
let passPatched = 0, failPatched = 0;

for (const f of FIXTURES) {
  // Test version actuelle
  const pacesCur = { ...f.pacesInit };
  applyTargetTimeOverride_CURRENT(pacesCur, f.data);
  const paceKeyCur = Object.keys(f.pacesInit)[0];
  const gotCur = pacesCur[paceKeyCur];
  const okCur = gotCur === f.expected.current;

  // Test version patchée
  const pacesPatched = { ...f.pacesInit };
  applyTargetTimeOverride_PATCHED(pacesPatched, f.data, f.vma);
  const gotPatched = pacesPatched[paceKeyCur];
  const okPatched = gotPatched === f.expected.patched;

  console.log(`📋 ${f.name}`);
  console.log(`   VMA=${f.vma}, cible=${f.data.targetTime || '(aucun)'}`);
  console.log(`   ${okCur ? '✅' : '❌'} CURRENT  : attendu=${f.expected.current} | obtenu=${gotCur}`);
  console.log(`   ${okPatched ? '✅' : '❌'} PATCHED  : attendu=${f.expected.patched} | obtenu=${gotPatched}`);
  console.log('');

  if (okCur) passCurrent++; else failCurrent++;
  if (okPatched) passPatched++; else failPatched++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTATS`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Version CURRENT  : ${passCurrent}/${FIXTURES.length} (échouent = bugs connus)`);
console.log(`Version PATCHED  : ${passPatched}/${FIXTURES.length}`);
console.log('');
if (passPatched === FIXTURES.length) {
  console.log('✅ Le patch passe TOUS les tests sans régression');
} else {
  console.log('❌ Le patch a un problème — NE PAS APPLIQUER');
}

process.exit(passPatched === FIXTURES.length ? 0 : 1);
