// Test mental du patch 1 sur les 3 cas observés
// Reproduction des fonctions clés inline

function timeToSeconds(time, contextDistance) {
  if (!time) return 0;
  const s = time.trim();
  const hMatch = /^(\d+)h\s*(\d+)?/.exec(s);
  if (hMatch) {
    const h = parseInt(hMatch[1]);
    const m = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = h * 3600 + m * 60;
    // Réinterprétation pour valeurs implausibles 10k
    if (contextDistance === 10 && asHours > 7200) return h * 60 + m;
    return asHours;
  }
  const colonMatch = /^(\d+):(\d+)/.exec(s);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  const minMatch = /^(\d+)\s*min/.exec(s);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  return 0;
}

const CHRONO_LEVEL_THRESHOLDS = {
  '10K': { M: [50, 42, 36], F: [60, 50, 42] },
  '5K':  { M: [30, 25, 21], F: [35, 30, 25] },
};
const LEVEL_RANK = { deb: 0, inter: 1, conf: 2, expert: 3 };
const LEVEL_NAMES = ['deb', 'inter', 'conf', 'expert'];

function classifyByChrono(seconds, dist, isFemale) {
  const min = seconds / 60;
  const T = CHRONO_LEVEL_THRESHOLDS[dist][isFemale ? 'F' : 'M'];
  if (min > T[0]) return 'deb';
  if (min > T[1]) return 'inter';
  if (min > T[2]) return 'conf';
  return 'expert';
}

function detectLevel(data) {
  const level = (data.level || '').toLowerCase();
  let declared;
  if (level.includes('débutant') || level.includes('debutant')) declared = 'deb';
  else if (level.includes('expert') || level.includes('performance')) declared = 'expert';
  else if (level.includes('confirmé') || level.includes('confirme') || level.includes('compétition')) declared = 'conf';
  else declared = 'inter';

  const isFemale = data.sex === 'Femme';
  const c5kSec  = data.recentRaceTimes?.distance5km  ? timeToSeconds(data.recentRaceTimes.distance5km, 5)   : 0;
  const c10kSec = data.recentRaceTimes?.distance10km ? timeToSeconds(data.recentRaceTimes.distance10km, 10) : 0;

  const chronoLevels = [];
  if (c5kSec > 0)  chronoLevels.push(classifyByChrono(c5kSec, '5K', isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, '10K', isFemale));

  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      return { result: chronoLevel, via: `chrono override (5k=${chronoLevels[0]||'-'}, 10k=${chronoLevels[1]||'-'})` };
    }
  }
  return { result: declared, via: 'no override' };
}

const CASES = [
  { name: 'Bruno',       data: { level: 'Expert (Performance)', sex: 'Homme', recentRaceTimes: { distance5km: '23:11', distance10km: '49min' } },                                   expected: 'inter' },
  { name: 'Sacha',       data: { level: 'Expert (Performance)', sex: 'Homme', recentRaceTimes: { distance10km: '38:13' } },                                                          expected: 'conf' },
  { name: 'Nanarebelle', data: { level: 'Confirmé (Compétition)', sex: 'Femme', recentRaceTimes: { distance5km: '31min', distance10km: '1h03' } },                                  expected: 'deb' },
  // Edge cases
  { name: 'Pas de chrono',                      data: { level: 'Confirmé', sex: 'Homme' },                                              expected: 'conf' },
  { name: 'Chrono mal parsé (vide)',            data: { level: 'Expert', sex: 'Homme', recentRaceTimes: { distance10km: 'xyz' } },      expected: 'expert' },
  { name: 'Debutant cohérent',                  data: { level: 'Débutant (0-1 an)', sex: 'Homme', recentRaceTimes: { distance10km: '60min' } },  expected: 'deb' },
  { name: 'Expert cohérent (rapide)',           data: { level: 'Expert', sex: 'Homme', recentRaceTimes: { distance10km: '32min' } },    expected: 'expert' },
  { name: 'Chrono > déclaré (pas d\'override)', data: { level: 'Débutant', sex: 'Homme', recentRaceTimes: { distance10km: '40min' } },  expected: 'deb' }, // declared deb, chrono = conf → no drop
  { name: '5k expert + 10k inter (MIN)',        data: { level: 'Expert', sex: 'Homme', recentRaceTimes: { distance5km: '20min', distance10km: '44min' } }, expected: 'inter' }, // MIN(expert, inter) = inter
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const r = detectLevel(c.data);
  const ok = r.result === c.expected;
  console.log(`${ok ? '✅' : '❌'} ${c.name.padEnd(38)} → ${r.result} (attendu ${c.expected}) [${r.via}]`);
  if (ok) pass++; else fail++;
}
console.log(`\n${pass}/${pass+fail} tests passent`);
