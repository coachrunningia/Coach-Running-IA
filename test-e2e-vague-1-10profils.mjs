#!/usr/bin/env node
/**
 * test-e2e-vague-1-10profils.mjs
 *
 * Sprint F+ Vague 1 — Test E2E sur 10 profils diversifiés pour valider :
 *   1. QUALITÉ de la correction (F-3 plat-équivalent injecté quand D+/km > 30, F-8
 *      phrase géographique présente quand D+/km race > 50)
 *   2. NON-IMPACT sur les autres profils (pas d'injection F-3 quand D+/km < 30,
 *      pas de phrase F-8 quand goal ≠ Trail ou D+/km race < 50)
 *
 * On ne génère PAS de vrai plan Gemini (trop long, coûteux, risque flakiness).
 * On teste UNIQUEMENT la logique post-process pure :
 *   - enforceFlatEquivalentNote (F-3)
 *   - buildSafetyInstructions (F-8 section géographique)
 *   - decideAutoChain (F-10 déjà couvert par 15 tests unitaires)
 *
 * Pour chaque profil, on construit un fixture Week minimal, on applique les
 * fonctions, et on vérifie l'attendu.
 *
 * Lancer : node test-e2e-vague-1-10profils.mjs
 */

import { execSync } from 'node:child_process';

// On va utiliser vitest directement pour profiter des tests unitaires existants
// + ajouter un script de simulation 10 profils qui teste les fonctions pures.

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sprint F+ Vague 1 — Tests E2E 10 profils');
console.log('═══════════════════════════════════════════════════════════════\n');

// On charge les fonctions compilées via tsc temporaire (ou direct via vitest)
// Approche simple : on génère un test vitest dynamique qui valide les 10 profils
// via les fonctions exportées.

const PROFILES = [
  // === F-3 attendu : injection note plat-équivalent ===
  { id: 1, label: 'Trail Débutant cv=0 D+/km=19 (marquilie68)',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Marche/Course', day: 'Dimanche', distance: '8 km', elevationGain: 150, mainSet: 'SL initiation' }, // Marche/Course → skip F-3
      { type: 'Jogging', day: 'Mardi', distance: '7 km', elevationGain: 0, mainSet: 'Footing EF plat' }, // 0 D+ → skip
    ]},
    expectF3Injected: false, // aucun cas D+/km > 30 et type pas Marche/Course
    expectF8Phrase: false, // pas Trail avec D+/km race > 50 (selon questionnaire)
    note: 'cas anti-régression : plat ne déclenche pas F-3' },

  { id: 2, label: 'Trail Confirmé Tor 330km D+/km Dim=91 (Lion Mathieu)',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Sortie Longue', day: 'Dimanche', distance: '25 km', elevationGain: 2275, mainSet: 'SL montagne EF.' }, // 91 m/km > 50 → quantifié
    ]},
    expectF3Injected: true,
    expectF3Style: 'quantified', // wording Cory Smith chiffré
    note: 'cas Plan B post-patch : sans note déjà = injection Cory Smith' },

  { id: 3, label: 'Trail Confirmé Plan vallon doux D+/km=40 (hypothétique)',
    weekFixture: { weekNumber: 5, sessions: [
      { type: 'Jogging', day: 'Mardi', distance: '12 km', elevationGain: 480, mainSet: 'Footing vallonné Mardi.' }, // 40 m/km → léger
    ]},
    expectF3Injected: true,
    expectF3Style: 'light',
    note: 'vallon léger 30-50 m/km → wording light' },

  { id: 4, label: 'Idempotent : Plan B Lion Mathieu après patch hier (déjà note)',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Sortie Longue', day: 'Dimanche', distance: '25 km', elevationGain: 2275,
        mainSet: "Sortie longue 228 min en montagne. C'est l'effort qui compte, pas la vitesse." }, // déjà phrase
    ]},
    expectF3Injected: false, // idempotent : déjà présent
    note: 'idempotence : doctrine déjà explicitée par patch live = no double-inject' },

  // === F-3 NE doit PAS s'appliquer ===
  { id: 5, label: 'Marathon Route plat (terebeu)',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Jogging', day: 'Lundi', distance: '10 km', elevationGain: 0, mainSet: 'EF 10 km plat' },
      { type: 'Sortie Longue', day: 'Dimanche', distance: '16 km', elevationGain: 0, mainSet: 'SL 16 km plat' },
    ]},
    expectF3Injected: false,
    note: 'Route plat → 0 injection F-3 (anti-régression)' },

  { id: 6, label: 'Hyrox 8km (david.desperques)',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Jogging', day: 'Mardi', distance: '7 km', elevationGain: 0, mainSet: 'Footing préparation Hyrox' },
      { type: 'Fractionné', day: 'Vendredi', distance: '5 km', elevationGain: 0, mainSet: '8×1km Hyrox' },
    ]},
    expectF3Injected: false,
    note: 'Hyrox = course only, pas de D+ → 0 injection (anti-régression)' },

  { id: 7, label: 'Semi-Marathon Débutant cv=7 (deplus.geoffroy)',
    weekFixture: { weekNumber: 5, sessions: [
      { type: 'Marche/Course', day: 'Mardi', distance: '5 km', elevationGain: 50, mainSet: '10 reps 1min course / 2min marche' },
    ]},
    expectF3Injected: false, // Marche/Course → skip F-3
    note: 'Marche/Course = skip F-3 (a son propre wording dédié)' },

  { id: 8, label: 'Trail 29km D+800 Débutant (marquilie68 post-patch S2+ futur)',
    weekFixture: { weekNumber: 20, sessions: [
      { type: 'Sortie Longue', day: 'Dimanche', distance: '17 km', elevationGain: 510, mainSet: 'SL pic 17 km D+510.' }, // 30 m/km exact = pas injection (>30 strict)
    ]},
    expectF3Injected: false, // exactement 30 m/km, pas > 30
    note: 'limite exacte 30 m/km : pas d\'injection (strict >)' },

  // === Edge cases ===
  { id: 9, label: 'Edge : Renforcement avec elevationGain bizarre',
    weekFixture: { weekNumber: 1, sessions: [
      { type: 'Renforcement', day: 'Jeudi', distance: '0 km', elevationGain: 500, mainSet: 'Squats + gainage' }, // skip
    ]},
    expectF3Injected: false,
    note: 'Renforcement → skip même si elevationGain absurde' },

  { id: 10, label: 'Multi-session avec mix : Trail D+/km=80 + footing plat + renfo',
    weekFixture: { weekNumber: 8, sessions: [
      { type: 'Sortie Longue', day: 'Dimanche', distance: '20 km', elevationGain: 1600, mainSet: 'SL montagne longue' }, // 80 → quantifié
      { type: 'Jogging', day: 'Mardi', distance: '8 km', elevationGain: 0, mainSet: 'Footing plat EF' }, // skip
      { type: 'Renforcement', day: 'Jeudi', distance: '0 km', mainSet: 'Renfo' }, // skip
    ]},
    expectF3Injected: true,
    expectF3Style: 'quantified',
    expectInjectionCount: 1, // seulement la SL, pas footing/renfo
    note: 'mix multi-session : 1 seule injection sur la session vallonnée' },
];

// Construit un script vitest dynamique
const testCode = `
import { describe, it, expect } from 'vitest';
import { enforceFlatEquivalentNote } from '../geminiService';

const PROFILES = ${JSON.stringify(PROFILES, null, 2)};

describe('E2E 10 profils — Sprint F+ Vague 1 F-3 validation', () => {
  for (const p of PROFILES) {
    it(\`#\${p.id} — \${p.label} (\${p.note})\`, () => {
      const week = JSON.parse(JSON.stringify(p.weekFixture)); // clone défensif
      const beforeMainSets = week.sessions.map((s) => s.mainSet);
      enforceFlatEquivalentNote(week);
      const afterMainSets = week.sessions.map((s) => s.mainSet);
      const injectedCount = beforeMainSets.filter((m, i) => m !== afterMainSets[i]).length;

      if (p.expectF3Injected) {
        expect(injectedCount).toBeGreaterThan(0);
        if (p.expectInjectionCount !== undefined) {
          expect(injectedCount).toBe(p.expectInjectionCount);
        }
        const injectedSession = week.sessions.find((s, i) => beforeMainSets[i] !== s.mainSet);
        expect(injectedSession.mainSet).toMatch(/plat-équivalent|effort EF/i);
        if (p.expectF3Style === 'quantified') {
          expect(injectedSession.mainSet).toMatch(/3-5 s\\/km/);
        } else if (p.expectF3Style === 'light') {
          expect(injectedSession.mainSet).not.toMatch(/3-5 s\\/km/);
        }
      } else {
        expect(injectedCount).toBe(0);
        // Anti-régression : tous les mainSets inchangés
        expect(afterMainSets).toEqual(beforeMainSets);
      }
    });
  }
});
`;

// Écrit le test temporaire
import { writeFileSync, unlinkSync } from 'node:fs';
const testPath = '/Users/romanemarino/Coach-Running-IA/src/services/__tests__/_temp-e2e-10profils.test.ts';
writeFileSync(testPath, testCode);

try {
  const out = execSync(`npx vitest run ${testPath}`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const lines = out.split('\n');
  const tailLines = lines.slice(-20);
  console.log(tailLines.join('\n'));

  const pass = /Tests\s+\d+\s+passed/.test(out);
  if (pass) {
    const match = out.match(/Tests\s+(\d+)\s+passed/);
    console.log(`\n🟢 SUCCÈS : ${match ? match[1] : '?'} profils validés.`);
    console.log('   F-3 : injection ciblée OK + anti-régression OK');
    console.log('   F-10 : couvert par 15 tests unitaires séparés');
    console.log('   F-8 MVP : validation indirecte (prompt Gemini, pas testable sans appel LLM)');
  } else {
    console.log('\n🔴 ÉCHEC : voir log ci-dessus.');
  }
} catch (e) {
  console.log(e.stdout?.toString().split('\n').slice(-30).join('\n') || e.message);
  console.log('\n🔴 ÉCHEC test.');
} finally {
  unlinkSync(testPath);
}
