// Diff AVANT vs APRES pour les 20 prompts et compile un rapport
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVANT_DIR = resolve(__dirname, 'prompts-AVANT');
const APRES_DIR = resolve(__dirname, 'prompts-APRES');
const DIFF_DIR = resolve(__dirname, 'diff');
mkdirSync(DIFF_DIR, { recursive: true });

const files = readdirSync(AVANT_DIR).filter(f => f.endsWith('.txt')).sort();

const summary = [];

for (const f of files) {
  const aPath = resolve(AVANT_DIR, f);
  const bPath = resolve(APRES_DIR, f);
  const a = readFileSync(aPath, 'utf8');
  const b = readFileSync(bPath, 'utf8');
  const aL = a.split('\n').length;
  const bL = b.split('\n').length;
  const aBytes = a.length;
  const bBytes = b.length;

  // Diff brut
  let diff;
  try {
    diff = execSync(`diff -u "${aPath}" "${bPath}"`, { encoding: 'utf8' });
  } catch (e) {
    diff = e.stdout || '';
  }
  const diffPath = resolve(DIFF_DIR, f.replace('.txt', '.diff'));
  writeFileSync(diffPath, diff || '(no diff)');

  // Compter les +/- lignes
  const plus = (diff.match(/^\+(?!\+\+)/gm) || []).length;
  const minus = (diff.match(/^-(?!--)/gm) || []).length;

  summary.push({
    file: f,
    aLines: aL,
    bLines: bL,
    deltaLines: bL - aL,
    aBytes,
    bBytes,
    deltaBytes: bBytes - aBytes,
    plusBlocks: plus,
    minusBlocks: minus,
  });
}

// Imprimer tableau
console.log('\n=== DIFF SUMMARY ===\n');
console.log('File'.padEnd(60), 'AVANT'.padStart(7), 'APRES'.padStart(7), 'ΔL'.padStart(6), 'ΔBytes'.padStart(8));
for (const s of summary) {
  console.log(s.file.padEnd(60), String(s.aLines).padStart(7), String(s.bLines).padStart(7),
    String(s.deltaLines).padStart(6), String(s.deltaBytes).padStart(8));
}

const totalDelta = summary.reduce((a, s) => a + s.deltaLines, 0);
const totalBytes = summary.reduce((a, s) => a + s.deltaBytes, 0);
console.log('\nTOTAL Δ lignes :', totalDelta, '| Δ bytes :', totalBytes);

writeFileSync(resolve(DIFF_DIR, '_SUMMARY.json'), JSON.stringify(summary, null, 2));
console.log('\nWritten :', resolve(DIFF_DIR, '_SUMMARY.json'));
