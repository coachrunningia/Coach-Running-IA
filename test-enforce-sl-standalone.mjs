// Tests standalone enforceSLDay : version actuelle vs patchée
// Cas critique : 3 séances/sem avec Mardi sélectionné + LLM pose 2 séances étiquetées "Sortie Longue"

// ════════════════════════════════════════════════════════════════════
// VERSION ACTUELLE (avec bug : trouve UNE seule SL via .find)
// ════════════════════════════════════════════════════════════════════
function enforceSLDay_CURRENT(week, preferredLongRunDay) {
  if (!week?.sessions || !Array.isArray(week.sessions)) return false;
  const sl = week.sessions.find(s =>
    s.type === 'Sortie Longue' ||
    /sortie\s*longue|long\s*run/i.test(s.title || '')
  );
  if (!sl || sl.day === preferredLongRunDay) return false;
  const occupant = week.sessions.find(s => s.day === preferredLongRunDay && s !== sl);
  if (occupant) occupant.day = sl.day;
  sl.day = preferredLongRunDay;
  return true;
}

// ════════════════════════════════════════════════════════════════════
// VERSION PATCHÉE : dédup AVANT enforce
// 1. Trouve TOUTES les séances étiquetées "Sortie Longue"
// 2. Garde la plus longue comme SL "officielle"
// 3. Retype les autres en "Jogging" (ou Footing selon phase)
// 4. Place la SL officielle sur preferredLongRunDay
// ════════════════════════════════════════════════════════════════════
function parseDurationMin(durStr) {
  if (!durStr) return 0;
  const m = String(durStr).match(/(\d+)h\s*(\d+)?|(\d+)\s*min/);
  if (!m) return 0;
  if (m[1]) return parseInt(m[1]) * 60 + parseInt(m[2] || '0');
  return parseInt(m[3]);
}

function parseDistKm(distStr) {
  if (!distStr) return 0;
  const m = String(distStr).match(/(\d+(?:\.\d+)?)\s*km/i);
  return m ? parseFloat(m[1]) : 0;
}

function enforceSLDay_PATCHED(week, preferredLongRunDay, logPrefix = '') {
  if (!week?.sessions || !Array.isArray(week.sessions)) return false;

  // 1. Trouver TOUTES les séances étiquetées SL
  const allSL = week.sessions.filter(s =>
    s.type === 'Sortie Longue' ||
    /sortie\s*longue|long\s*run/i.test(s.title || '')
  );

  if (allSL.length === 0) return false;

  // 2. Si > 1 SL : dédup. Garde la plus longue (distance, sinon durée).
  let officialSL;
  if (allSL.length > 1) {
    officialSL = [...allSL].sort((a, b) => {
      const da = parseDistKm(a.distance);
      const db = parseDistKm(b.distance);
      if (db !== da) return db - da; // plus longue d'abord
      return parseDurationMin(b.duration) - parseDurationMin(a.duration);
    })[0];
    // Retype les autres en Jogging
    for (const other of allSL) {
      if (other === officialSL) continue;
      console.log(`${logPrefix}Dédup SL: "${other.title || other.type}" (${other.distance || '?'}) retypé Jogging`);
      other.type = 'Jogging';
      other.title = other.title?.replace(/Sortie\s*Longue|Long\s*Run/gi, 'Footing').trim() || 'Footing';
      other._dedupedFromSL = true;
    }
  } else {
    officialSL = allSL[0];
  }

  // 3. Si déjà sur le bon jour : rien à faire
  if (officialSL.day === preferredLongRunDay) return true;

  // 4. Swap avec occupant
  const occupant = week.sessions.find(s => s.day === preferredLongRunDay && s !== officialSL);
  if (occupant) {
    console.log(`${logPrefix}Swap SL: "${officialSL.day}" ↔ "${occupant.day}" (${occupant.title || occupant.type})`);
    occupant.day = officialSL.day;
  }
  officialSL.day = preferredLongRunDay;
  console.log(`${logPrefix}SL forcée sur ${preferredLongRunDay}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════
// FIXTURES
// ════════════════════════════════════════════════════════════════════
const FIXTURES = [
  {
    name: 'F01 — Cas Clément : 3 séances/sem, 2 étiquetées SL (Mardi 12.2km + Dim 7.5km), pref=Dimanche',
    week: { weekNumber: 1, sessions: [
      { day: 'Mardi', type: 'Sortie Longue', title: 'Footing vallonné, côtes en marche', duration: '1h 30 min', distance: '12.2 km' },
      { day: 'Jeudi', type: 'Renforcement', title: 'Renfo S1', duration: '30 min', distance: '0 km' },
      { day: 'Dimanche', type: 'Sortie Longue', title: 'Première Longue en EF', duration: '55 min', distance: '7.5 km' },
    ]},
    preferredDay: 'Dimanche',
    expectedAfterPatch: {
      slCount: 1,
      slDay: 'Dimanche',
      slDistance: 12.2, // la plus longue, MAIS doit migrer sur Dimanche
    }
  },
  {
    name: 'F02 — Cas normal : 1 SL Dimanche bien placée, pref=Dimanche',
    week: { weekNumber: 1, sessions: [
      { day: 'Mardi', type: 'Jogging', title: 'EF', duration: '45 min', distance: '6 km' },
      { day: 'Jeudi', type: 'Fractionné', title: '5x1000', duration: '60 min', distance: '8 km' },
      { day: 'Dimanche', type: 'Sortie Longue', title: 'SL EF', duration: '1h30', distance: '15 km' },
    ]},
    preferredDay: 'Dimanche',
    expectedAfterPatch: { slCount: 1, slDay: 'Dimanche', slDistance: 15 },
  },
  {
    name: 'F03 — SL placée Samedi alors que pref=Dimanche : swap avec session Dimanche',
    week: { weekNumber: 1, sessions: [
      { day: 'Mardi', type: 'Jogging', title: 'EF', duration: '45 min', distance: '6 km' },
      { day: 'Jeudi', type: 'Fractionné', title: '5x1000', duration: '60 min', distance: '8 km' },
      { day: 'Samedi', type: 'Sortie Longue', title: 'SL EF', duration: '1h30', distance: '15 km' },
      { day: 'Dimanche', type: 'Jogging', title: 'Récup', duration: '40 min', distance: '5 km' },
    ]},
    preferredDay: 'Dimanche',
    expectedAfterPatch: { slCount: 1, slDay: 'Dimanche', slDistance: 15 },
  },
  {
    name: 'F04 — Aucune SL (semaine récup) : ne touche à rien',
    week: { weekNumber: 4, sessions: [
      { day: 'Mardi', type: 'Jogging', title: 'EF', duration: '30 min', distance: '4 km' },
      { day: 'Jeudi', type: 'Renforcement', title: 'Renfo', duration: '30 min', distance: '0 km' },
      { day: 'Dimanche', type: 'Jogging', title: 'EF', duration: '40 min', distance: '5 km' },
    ]},
    preferredDay: 'Dimanche',
    expectedAfterPatch: { slCount: 0, slDay: null, slDistance: 0 },
  },
  {
    name: 'F05 — 3 séances avec SL Mardi mais titre "Sortie Longue Mid-week" (cas pro WE indispo) — DOIT être SWAP vers Mercredi si pref=Mercredi',
    week: { weekNumber: 1, sessions: [
      { day: 'Mardi', type: 'Sortie Longue', title: 'SL EF', duration: '1h30', distance: '15 km' },
      { day: 'Jeudi', type: 'Fractionné', title: 'VMA', duration: '60 min', distance: '8 km' },
      { day: 'Samedi', type: 'Jogging', title: 'EF', duration: '45 min', distance: '6 km' },
    ]},
    preferredDay: 'Mercredi',
    expectedAfterPatch: { slCount: 1, slDay: 'Mercredi', slDistance: 15 },
  },
  {
    name: 'F06 — 3 SL étiquetées dans la même semaine (cas extrême) : dédup à 1',
    week: { weekNumber: 1, sessions: [
      { day: 'Mardi', type: 'Sortie Longue', title: 'SL côtes', duration: '1h', distance: '10 km' },
      { day: 'Jeudi', type: 'Jogging', title: 'Long Run progressif', duration: '50 min', distance: '7 km' },
      { day: 'Samedi', type: 'Renforcement', title: 'Renfo', duration: '30 min', distance: '0 km' },
      { day: 'Dimanche', type: 'Sortie Longue', title: 'SL EF', duration: '2h', distance: '18 km' },
    ]},
    preferredDay: 'Dimanche',
    expectedAfterPatch: { slCount: 1, slDay: 'Dimanche', slDistance: 18 },
  },
];

// ════════════════════════════════════════════════════════════════════
// LANCE
// ════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TESTS enforceSLDay : CURRENT vs PATCHED');
console.log('═══════════════════════════════════════════════════════════════\n');

const countSL = sessions => sessions.filter(s => s.type === 'Sortie Longue').length;
const findSL = sessions => sessions.find(s => s.type === 'Sortie Longue');

let passCurrent = 0, passPatched = 0;

for (const f of FIXTURES) {
  // Test CURRENT
  const cur = JSON.parse(JSON.stringify(f.week));
  enforceSLDay_CURRENT(cur, f.preferredDay);
  const curCount = countSL(cur.sessions);
  const curSL = findSL(cur.sessions);
  const curOK = curCount === f.expectedAfterPatch.slCount &&
                (curCount === 0 || curSL?.day === f.expectedAfterPatch.slDay);

  // Test PATCHED
  const pat = JSON.parse(JSON.stringify(f.week));
  enforceSLDay_PATCHED(pat, f.preferredDay, `[F] `);
  const patCount = countSL(pat.sessions);
  const patSL = findSL(pat.sessions);
  const patDist = patSL ? parseDistKm(patSL.distance) : 0;
  const patOK = patCount === f.expectedAfterPatch.slCount &&
                (patCount === 0 || (patSL?.day === f.expectedAfterPatch.slDay && patDist === f.expectedAfterPatch.slDistance));

  console.log(`📋 ${f.name}`);
  console.log(`   ${curOK ? '✅' : '❌'} CURRENT  : slCount=${curCount} slDay=${curSL?.day || 'n/a'}`);
  console.log(`   ${patOK ? '✅' : '❌'} PATCHED  : slCount=${patCount} slDay=${patSL?.day || 'n/a'} slDistance=${patDist}km`);
  console.log(`   attendu  : slCount=${f.expectedAfterPatch.slCount} slDay=${f.expectedAfterPatch.slDay || 'n/a'} slDist=${f.expectedAfterPatch.slDistance}km`);
  console.log('');

  if (curOK) passCurrent++;
  if (patOK) passPatched++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Version CURRENT : ${passCurrent}/${FIXTURES.length} (échec attendu sur F01 et F06)`);
console.log(`  Version PATCHED : ${passPatched}/${FIXTURES.length}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(passPatched === FIXTURES.length ? '\n✅ Patch enforceSLDay PASSE tous les tests' : '\n❌ Patch enforceSLDay ÉCHOUE');

process.exit(passPatched === FIXTURES.length ? 0 : 1);
