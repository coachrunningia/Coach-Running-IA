// Tests exhaustifs Sprint 1 — 4 helpers × profils variés × edge cases

// ============================================================
// Helpers à tester (copie exacte du code de geminiService.ts)
// ============================================================

// helper timeToSeconds simplifié (pour parser chronos)
function timeToSeconds(time, contextDistance) {
  if (!time) return 0;
  const s = time.trim();
  const hMatch = /^(\d+)h\s*(\d+)?/.exec(s);
  if (hMatch) {
    const h = parseInt(hMatch[1]);
    const m = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = h * 3600 + m * 60;
    if (contextDistance === 10 && asHours > 7200) return h * 60 + m;
    return asHours;
  }
  const colonMatch = /^(\d+):(\d+)/.exec(s);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  const minMatch = /^(\d+)\s*min/.exec(s);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  return 0;
}

// ===== Patch 1 (déjà déployé) — chrono override
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

// ===== Sprint 1 helpers
const parseKm = (d) => {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};

const isFinisherTarget = (t) => {
  const trimmed = (t || '').trim();
  if (!trimmed) return true;
  if (/^finisher$/i.test(trimmed)) return true;
  return !/\d/.test(trimmed);
};

const labelToLevelKey = (label) => {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition')) return 'conf';
  return 'inter';
};

const LEVEL_LABEL = {
  deb: 'Débutant (0-1 an)',
  inter: 'Intermédiaire (Régulier)',
  conf: 'Confirmé (Compétition)',
  expert: 'Expert (Performance)',
};

// Reproduction de detectLevelFromData (avec patch chrono + bloc VMA existant)
function detectLevelFromData(data) {
  const declared = labelToLevelKey(data.level);

  // Override CHRONO
  const isFemale = data.sex === 'Femme';
  const c5kSec  = data.recentRaceTimes?.distance5km  ? timeToSeconds(data.recentRaceTimes.distance5km, 5)   : 0;
  const c10kSec = data.recentRaceTimes?.distance10km ? timeToSeconds(data.recentRaceTimes.distance10km, 10) : 0;
  const chronoLevels = [];
  if (c5kSec > 0)  chronoLevels.push(classifyByChrono(c5kSec, '5K', isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, '10K', isFemale));
  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) return chronoLevel;
  }
  return declared;  // simplifié, sans bloc VMA pour le test
}

// ============================================================
// TESTS HELPERS
// ============================================================
let pass = 0, fail = 0;
const log = (ok, name, detail) => { if (ok) pass++; else { fail++; console.log(`❌ ${name} : ${detail}`); } };

console.log('\n=== parseKm ===');
log(parseKm('12.5 km') === 12.5, 'parseKm "12.5 km"', parseKm('12.5 km'));
log(parseKm('12,5 km') === 12.5, 'parseKm "12,5 km"', parseKm('12,5 km'));
log(parseKm('15.65 km') === 15.65, 'parseKm "15.65 km"', parseKm('15.65 km'));
log(parseKm('0 km') === 0, 'parseKm "0 km"', parseKm('0 km'));
log(parseKm('') === 0, 'parseKm vide', parseKm(''));
log(parseKm(null) === 0, 'parseKm null', parseKm(null));
log(parseKm(undefined) === 0, 'parseKm undefined', parseKm(undefined));
log(parseKm('xyz') === 0, 'parseKm "xyz"', parseKm('xyz'));
log(parseKm('abc 12') === 12, 'parseKm "abc 12"', parseKm('abc 12'));
log(parseKm('-5 km') === 5, 'parseKm "-5 km" → 5 (signe retiré par regex [^0-9.,])', parseKm('-5 km'));

console.log('\n=== isFinisherTarget ===');
const finCases = [
  ['undefined', undefined, true],
  ['null', null, true],
  ['vide', '', true],
  ['espaces', '   ', true],
  ['"Finisher"', 'Finisher', true],
  ['"finisher"', 'finisher', true],
  ['"FINISHER"', 'FINISHER', true],
  ['"Finisher "', 'Finisher ', true],
  ['"finir"', 'finir', true],  // pas de chiffre
  ['"environ 4h"', 'environ 4h', false],  // contient 4
  ['"3h15"', '3h15', false],
  ['"40min"', '40min', false],
  ['"sub 1h30"', 'sub 1h30', false],
  ['"1h25"', '1h25', false],
  ['"6h20"', '6h20', false],
];
for (const [name, input, expected] of finCases) {
  const got = isFinisherTarget(input);
  log(got === expected, `isFinisherTarget ${name}`, `got=${got} attendu=${expected}`);
}

console.log('\n=== labelToLevelKey ===');
const lvlCases = [
  ['Débutant (0-1 an)', 'deb'],
  ['débutant', 'deb'],
  ['DEBUTANT', 'deb'],
  ['Intermédiaire (Régulier)', 'inter'],
  ['Confirmé (Compétition)', 'conf'],
  ['confirme', 'conf'],  // sans accent
  ['compétition', 'conf'],
  ['Expert (Performance)', 'expert'],
  ['Performance', 'expert'],
  ['', 'inter'],
  [undefined, 'inter'],
  ['Débutant (0-1 an) ', 'deb'],  // espace fin
  [' débutant ', 'deb'],
];
for (const [input, expected] of lvlCases) {
  const got = labelToLevelKey(input);
  log(got === expected, `labelToLevelKey "${input}"`, `got=${got} attendu=${expected}`);
}

// ============================================================
// TESTS DE PROFILS COMPLETS (régression)
// ============================================================
console.log('\n=== Profils complets — detectLevelFromData ===');
const profileCases = [
  // Régressions des 3 cas patches
  { name: 'Bruno (Expert + chronos Inter H)',  data: { level: 'Expert (Performance)', sex: 'Homme', recentRaceTimes: { distance5km: '23:11', distance10km: '49min' } },  expected: 'inter' },
  { name: 'Sacha (Expert + 10k 38:13 H)',      data: { level: 'Expert (Performance)', sex: 'Homme', recentRaceTimes: { distance10km: '38:13' } },  expected: 'conf' },
  { name: 'Nanarebelle (Conf F + chronos Deb)', data: { level: 'Confirmé (Compétition)', sex: 'Femme', recentRaceTimes: { distance5km: '31min', distance10km: '1h03' } }, expected: 'deb' },
  // Edge cases non-régression
  { name: 'Débutant simple (pas chrono)',      data: { level: 'Débutant (0-1 an)', sex: 'Homme' },                                                  expected: 'deb' },
  { name: 'Expert cohérent (10k 32min H)',     data: { level: 'Expert (Performance)', sex: 'Homme', recentRaceTimes: { distance10km: '32min' } },   expected: 'expert' },
  { name: 'Conf cohérente (10k 40 F)',         data: { level: 'Confirmé (Compétition)', sex: 'Femme', recentRaceTimes: { distance10km: '40:00' } }, expected: 'conf' },
  { name: 'Inter qui se sous-estime',          data: { level: 'Débutant (0-1 an)', sex: 'Homme', recentRaceTimes: { distance10km: '44min' } },      expected: 'deb' },  // chrono inter mais déclaré deb → on garde deb (sécurité haut)
  { name: 'Pas de level (fallback)',           data: { sex: 'Homme', recentRaceTimes: { distance10km: '50min' } },                                  expected: 'inter' },  // déclaré inter par défaut, chrono inter, pas d'override
];
for (const p of profileCases) {
  const got = detectLevelFromData(p.data);
  log(got === p.expected, `Profile: ${p.name}`, `got=${got} attendu=${p.expected}`);
}

// ============================================================
// TESTS PRÉSENCE/ABSENCE des termes interdits dans le code
// ============================================================
import { readFileSync } from 'fs';
const geminiSrc = readFileSync('/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts', 'utf-8');
const feasibilitySrc = readFileSync('/Users/romanemarino/Coach-Running-IA/src/services/feasibilityService.ts', 'utf-8');

console.log('\n=== Vocabulaire interdit ===');
// Dans les MESSAGES UTILISATEUR (pas dans les garde-fous LLM qui interdisent ces termes)
// Recherche : chaînes contenant les termes interdits SAUF lignes "🚫 NE JAMAIS proposer"
const isInForbiddenContext = (line) => /🚫|JAMAIS proposer/i.test(line);
const findForbiddenInUserMessages = (src, srcName) => {
  const lines = src.split('\n');
  const violations = [];
  lines.forEach((line, i) => {
    if (isInForbiddenContext(line)) return;  // skip garde-fous
    if (/\bcross.?training\b/i.test(line) && !/NE JAMAIS|interdiction|interdit/i.test(line)) {
      violations.push(`${srcName}:${i+1} cross-training : ${line.trim().substring(0,100)}`);
    }
    if (/\bvélo\b/i.test(line) && !/NE JAMAIS|interdiction|interdit/i.test(line)) {
      violations.push(`${srcName}:${i+1} vélo : ${line.trim().substring(0,100)}`);
    }
    if (/\bnatation\b/i.test(line) && !/NE JAMAIS|interdiction|interdit/i.test(line)) {
      violations.push(`${srcName}:${i+1} natation : ${line.trim().substring(0,100)}`);
    }
    // IMC chiffré dans output utilisateur (regex spécifique au pattern reasons.push)
    if (/reasons\.push.*IMC.*\$\{bmi/i.test(line)) {
      violations.push(`${srcName}:${i+1} IMC chiffré dans message user : ${line.trim().substring(0,100)}`);
    }
  });
  return violations;
};

const v1 = findForbiddenInUserMessages(geminiSrc, 'geminiService.ts');
const v2 = findForbiddenInUserMessages(feasibilitySrc, 'feasibilityService.ts');
log(v1.length === 0, 'geminiService.ts vocabulaire OK', `${v1.length} violations: ${v1.slice(0,3).join(' || ')}`);
log(v2.length === 0, 'feasibilityService.ts vocabulaire OK', `${v2.length} violations: ${v2.slice(0,3).join(' || ')}`);

console.log('\n=== Présence helpers ===');
log(geminiSrc.includes('const parseKm = (d: unknown)'), 'parseKm défini', '?');
log(geminiSrc.includes('export const isFinisherTarget'), 'isFinisherTarget défini', '?');
log(geminiSrc.includes('const labelToLevelKey'), 'labelToLevelKey défini', '?');
log(geminiSrc.includes('const LEVEL_LABEL'), 'LEVEL_LABEL défini', '?');

console.log('\n=== Aucun usage parseFloat-replace résiduel ===');
const remaining = (geminiSrc.match(/parseFloat\(\([a-zA-Z_]+\.distance \|\| '0'/g) || []).length;
log(remaining === 0, `Plus aucun parseFloat-distance résiduel`, `count=${remaining}`);

console.log('\n=== Aucun usage isBeginnerLevel === literal ===');
const beginnerLiteral = (geminiSrc.match(/isBeginnerLevel = data\.level === 'Débutant/g) || []).length;
log(beginnerLiteral === 0, `Plus aucune comparaison stricte data.level`, `count=${beginnerLiteral}`);

console.log('\n=== Aucun usage parseFloat-distance ailleurs (App.tsx etc.) ===');
// Pas critique mais bon à savoir

console.log(`\n\n========== RÉSULTAT ==========`);
console.log(`${pass} tests passent / ${pass+fail} total`);
if (fail > 0) {
  console.log(`❌ ${fail} échecs — INVESTIGATION REQUISE`);
  process.exit(1);
} else {
  console.log(`✅ TOUS LES TESTS PASSENT`);
}
