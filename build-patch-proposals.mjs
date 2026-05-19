import { readFileSync, writeFileSync } from 'fs';

const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', 'utf-8'));

// Final list of critical plans (deduped) — emails (partial match OK)
const CRITICAL_EMAILS = [
  // TOP 15 critiques de l'audit
  'azerdeedvd@yopmail.com',
  'mouhammadslimani2605@gmail.com',
  'j.tissot@lilo.org',
  'didier.damiens@gmail.com',
  'pierre.dewitte@free.fr',                   // = P1 Pierre
  'jennibalme1062@gmail.com',
  'estenoza.tom@gmail.com',
  'lenaduk@hotmail.fr',
  'lameymichel@yahoo.fr',
  'lamey.michel@gmail.com',
  'liefhwekfhwekfh@mail.com',
  'soumaya.bacar@live.fr',                    // = P1 Soumaya
  'emiliendylanh@gmail.com',
  'oli833lena@gmail.com',
  'jade.leveque347@gmail.com',
  // Mentions secondaires
  'lisa-dutarde',
  'bastisa59174',
  'frige60',
  'durant.gab',
  'laurine-du-66',
  'cesarini',
  'agp-latour',
  'gauthier.raph',
  // P1 plans (déjà identifiés)
  'agathepignier@hotmail.fr',                 // Agathe
  'adrien_marcourt@hotmail.fr',               // Adrien
  'hippolyte.tavan@gmail.com',                // Hippolyte
  'thuries.karine@gmail.com',                 // Karine
  'lukasgaborel@gmail.com',                   // Lukas
  'bruno.grange13@gmail.com',                 // Bruno (à vérifier)
  'sylvie',                                   // Sylvie (à confirmer)
  'christophe.npsi@gmail.com',                // Christophe npsi
];

// Match plans
const matched = [];
const seen = new Set();
for (const emailPattern of CRITICAL_EMAILS) {
  const candidates = plans.filter(p => p.userEmail?.toLowerCase().includes(emailPattern.toLowerCase()));
  for (const p of candidates) {
    if (!seen.has(p.id)) { matched.push({ pattern: emailPattern, plan: p }); seen.add(p.id); }
  }
}
console.log(`Matched ${matched.length} unique plans:`);
matched.forEach(m => console.log(`  - ${m.plan.userEmail} (id=${m.plan.id}, goal=${m.plan.goal}/${m.plan.distance}, peak=${m.plan.periodization.actualPeak})`));
console.log(`\nUNMATCHED patterns:`);
for (const pat of CRITICAL_EMAILS) {
  if (!matched.some(m => m.pattern === pat)) console.log(`  - ${pat}`);
}
