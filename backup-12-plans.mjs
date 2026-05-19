import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-12-plans-2026-05-16';

mkdirSync(BACKUP_DIR, { recursive: true });

const PLANS = [
  { id: '1778574019379', name: 'pierre-dewitte' },
  { id: '1778446762158', name: 'agathe' },
  { id: '1778430589776', name: 'soumaya' },
  { id: '1778702412108', name: 'adrien' },
  { id: '1778852278323', name: 'hippolyte' },
  { id: '1778695294712', name: 'karine' },
  { id: '1778771945613', name: 'lukas' },
  { id: '1778673418021', name: 'bruno' },
  { id: '1778496831328', name: 'sylvie' },
  { id: '1778436722110', name: 'christophe-npsi' },
  { id: '1778867644661', name: 'nanarebelle' },
  { id: '1778867137508', name: 'sacha' },
];

for (const p of PLANS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r.ok) {
    console.log(`❌ ${p.name} (${p.id}) — HTTP ${r.status}`);
    continue;
  }
  const j = await r.json();
  const path = `${BACKUP_DIR}/${p.name}-${p.id}.json`;
  writeFileSync(path, JSON.stringify(j, null, 2));
  const fields = j.fields || {};
  const score = fields.confidenceScore?.integerValue;
  const status = fields.feasibility?.mapValue?.fields?.status?.stringValue;
  const goal = fields.goal?.stringValue;
  const dist = fields.distance?.stringValue;
  console.log(`✅ ${p.name.padEnd(18)} → ${path.split('/').pop()} | ${goal}/${dist} | ${status}/${score}`);
}
console.log(`\nBackup terminé: ${PLANS.length} plans dans ${BACKUP_DIR}`);
