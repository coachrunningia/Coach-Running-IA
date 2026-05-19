import { execSync } from 'child_process';
import fs from 'fs';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const project = 'coach-running-ia';
const list = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/plans-list-2.json', 'utf-8'));

const full = list.filter(p => p.fullPlanGenerated === true);
const targets = full.slice(0, 20);
console.log("Cibles audit batch 2:", targets.length);

let ok = 0, fail = 0;
for (const p of targets) {
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/plans/${p.id}`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await r.json();
  if (!data.fields) { console.log("FAIL", p.id); fail++; continue; }
  fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/halluci-audit/plans/${p.id}.json`, JSON.stringify(data, null, 2));
  ok++;
}
console.log("Téléchargés:", ok, "Echec:", fail);
