import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const getStr = f => f?.stringValue;
const getNum = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getArr = f => f?.arrayValue?.values || [];
const getMap = f => f?.mapValue?.fields || {};
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

const PLANS = [
  { id: '1778574019379', name: 'Pierre Dewitte',  expected: { score: 40, status: 'RISQUÉ', alertKeywords: ['cardio','test d\'effort','marche-course'] } },
  { id: '1778446762158', name: 'Agathe',          expected: { score: 55, status: 'AMBITIEUX', alertKeywords: ['genou','Hyrox','course uniquement'] } },
  { id: '1778430589776', name: 'Soumaya',         expected: { score: 55, status: 'AMBITIEUX', alertKeywords: ['1h05','ambitieux','débutant'] } },
  { id: '1778702412108', name: 'Adrien',          expected: { score: 38, status: 'RISQUÉ', alertKeywords: ['Tendinopathie','Stanish','kiné','3/10'], peakVol: 60 } },
  { id: '1778852278323', name: 'Hippolyte',       expected: { score: 35, status: 'RISQUÉ', alertKeywords: ['marathon','7 semaines'] } },
  { id: '1778695294712', name: 'Karine',          expected: { score: 30, status: 'RISQUÉ', alertKeywords: ['Ultra','D+','back-to-back'] } },
  { id: '1778771945613', name: 'Lukas',           expected: { score: 60, status: 'AMBITIEUX', alertKeywords: ['ambitieux','récup','périostite'] } },
  { id: '1778673418021', name: 'Bruno',           expected: { score: 55, status: 'AMBITIEUX', alertKeywords: ['Expert','Intermédiaire','43 ans'] } },
  { id: '1778496831328', name: 'Sylvie',          expected: { score: 73, status: 'BON', alertKeywords: ['900 m','D+','quadriceps'] } },
  { id: '1778436722110', name: 'Christophe npsi', expected: { score: 65, status: 'AMBITIEUX', alertKeywords: ['Dénivelé','2500','quadriceps'] } },
  { id: '1778867644661', name: 'Nanarebelle',     expected: { score: 80, status: 'BON', paces: { ef: '9:30', seuil: '7:10', recovery: '10:00' }, alertKeywords: ['médecin','certificat'] } },
  { id: '1778867137508', name: 'Sacha',           expected: { score: 75, status: 'AMBITIEUX', paces: { ef: '4:55', seuil: '4:00', recovery: '5:30' }, alertKeywords: ['1h25','ambitieux','1h27'] } },
];

// Forbidden in user-facing texts
const FORBIDDEN_PATTERNS = [
  { name: 'IMC',           regex: /\bIMC\b/i },
  { name: 'poids/minceur', regex: /\b(poids|minceur|corpulence|kilos|surpoids)\b/i },
  { name: 'cross-training',regex: /\b(vélo|natation|cyclisme|biking|swimming|cross.?training)\b/i },
  { name: 'nutrition chiffrée', regex: /\b(\d+\s*g\s*(de\s)?glucides|\d+\s*ml\/h|\d+\s*kcal)\b/i },
];

let report = `# Audit post-patch — 12 plans\n\nDate vérif : ${new Date().toISOString()}\n\n`;

for (const p of PLANS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r.ok) { report += `\n## ❌ ${p.name} HTTP ${r.status}\n`; continue; }
  const j = await r.json();
  const f = j.fields;

  const score = getNum(f.confidenceScore);
  const status = getStr(getMap(f.feasibility).status);
  const welcome = getStr(f.welcomeMessage) || '';
  const paces = getMap(f.paces);
  const efPace = getStr(paces.efPace);
  const seuilPace = getStr(paces.seuilPace);
  const recoveryPace = getStr(paces.recoveryPace);
  const vmaPace = getStr(paces.vmaPace);

  const peri = getMap(getMap(f.generationContext).periodizationPlan);
  const peakVol = getNum(peri.peakVolumeKm);
  const wv = getArr(peri.weeklyVolumes).map(getNum);
  const actualPeak = wv.length ? Math.max(...wv) : peakVol;

  const e = p.expected;
  const scoreOK = score === e.score;
  const statusOK = status === e.status;
  const alertOK = e.alertKeywords.every(k => welcome.toLowerCase().includes(k.toLowerCase()));
  const pacesOK = !e.paces || (efPace === e.paces.ef && seuilPace === e.paces.seuil && recoveryPace === e.paces.recovery);
  const peakOK = !e.peakVol || actualPeak === e.peakVol;

  // Check welcome for forbidden patterns
  const welcomeForbidden = FORBIDDEN_PATTERNS.filter(fp => fp.regex.test(welcome));

  report += `\n## ${p.name} — \`${p.id}\`\n\n`;
  report += `- Score : ${score} ${scoreOK ? '✅' : `❌ attendu ${e.score}`}\n`;
  report += `- Status : ${status} ${statusOK ? '✅' : `❌ attendu ${e.status}`}\n`;
  report += `- Alerte mots-clés (${e.alertKeywords.join(', ')}) : ${alertOK ? '✅' : `❌ manquant : ${e.alertKeywords.filter(k => !welcome.toLowerCase().includes(k.toLowerCase())).join(', ')}`}\n`;
  if (e.paces) report += `- Paces : EF=${efPace} (attendu ${e.paces.ef}) · seuil=${seuilPace} (attendu ${e.paces.seuil}) · récup=${recoveryPace} (attendu ${e.paces.recovery}) ${pacesOK ? '✅' : '❌'}\n`;
  if (e.peakVol) report += `- Peak volume : ${actualPeak} km/sem (attendu ${e.peakVol}) ${peakOK ? '✅' : '❌'}\n`;
  report += `- weeklyVolumes : ${JSON.stringify(wv)}\n`;
  if (welcomeForbidden.length) report += `- 🚨 FORBIDDEN dans welcome : ${welcomeForbidden.map(x => x.name).join(', ')}\n`;
  else report += `- Aucun terme interdit dans welcome ✅\n`;
  report += `- Welcome longueur : ${welcome.length} chars\n`;
  report += `- Welcome début :\n`;
  report += `\`\`\`\n${welcome.substring(0, 1200)}${welcome.length > 1200 ? '\n[... ' + (welcome.length - 1200) + ' chars supplémentaires]' : ''}\n\`\`\`\n`;

  // For Nanarebelle and Sacha : check sessions S1
  if (p.id === '1778867644661' || p.id === '1778867137508') {
    const weeks = getArr(f.weeks);
    if (weeks.length > 0) {
      const sessions = getArr(getMap(weeks[0]).sessions);
      report += `\n### Sessions S1\n\n`;
      for (const s of sessions) {
        const sm = getMap(s);
        const day = getStr(sm.day);
        const title = getStr(sm.title);
        const dur = getStr(sm.duration);
        const dist = getStr(sm.distance);
        const tp = getStr(sm.targetPace);
        const main = getStr(sm.mainSet) || '';
        report += `**${day}** · ${title} · ${dur} · ${dist || '-'} · pace ${tp || '-'}\n`;
        if (main) report += `   Main: ${main.substring(0, 300)}${main.length > 300 ? '...' : ''}\n`;
      }
    }
  }
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-post-patch.md', report);
console.log(`Report écrit: /Users/romanemarino/Coach-Running-IA/audit-post-patch.md (${report.length} chars)`);
