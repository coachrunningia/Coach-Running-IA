// Trouve où "poids" apparaît
import fs from 'fs';
const p1 = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan1.json','utf8'));
const p2 = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan2.json','utf8'));

function findInObj(obj, term, path='') {
  if (obj === null || obj === undefined) return [];
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes(term)) return [{path, value: obj.slice(0,300)}];
    return [];
  }
  if (typeof obj !== 'object') return [];
  let results = [];
  if (Array.isArray(obj)) {
    obj.forEach((v,i) => { results = results.concat(findInObj(v, term, `${path}[${i}]`)); });
  } else {
    for (const k of Object.keys(obj)) {
      results = results.concat(findInObj(obj[k], term, path?`${path}.${k}`:k));
    }
  }
  return results;
}

console.log('=== PLAN 1: occurrences "poids" ===');
for (const r of findInObj(p1, 'poids')) console.log(r.path, '|', r.value);
console.log('\n=== PLAN 2: occurrences "poids" ===');
for (const r of findInObj(p2, 'poids')) console.log(r.path, '|', r.value);
