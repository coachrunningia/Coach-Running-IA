/**
 * F-17 — Battery stress tests VMA (15+ cas réels et extrêmes)
 *
 * Couvre :
 * - VMA identique (idempotence)
 * - VMA ±5 / ±10 / ±20 / ±23 (cas réels Robine, Lucas)
 * - VMA ±30 / +50 / +70 (extrêmes, warning user)
 * - VMA -30 (blessure, baisse forte)
 * - VMA 0, négatif, NaN (invalides, doivent pas crasher)
 * - VMA élite 22 (sortie range)
 * - VMA absurde 50 (impossible)
 * - VMA super basse 4 (paces > 12 min/km, format à vérifier)
 * - Idempotence chaîne (rollback A→B→A)
 * - Plan avec/sans targetTime (gel allures course)
 */

import { describe, it, expect } from 'vitest';
import {
  buildPaceSwapMap,
  recalibrateText,
  recalibrateSession,
} from '../paceRecalibrationService';
import type { Session, TrainingPaces } from '../../types';

// Helper : calcule paces depuis VMA (formules calculateAllPaces, geminiService.ts:236)
function paces(vma: number): Partial<TrainingPaces> {
  if (!isFinite(vma) || vma <= 0) {
    return {} as Partial<TrainingPaces>;
  }
  const toPace = (kmh: number): string => {
    if (!isFinite(kmh) || kmh <= 0) return '0:00';
    const sec = 3600 / kmh;
    let min = Math.floor(sec / 60);
    let s = Math.round(sec % 60);
    if (s >= 60) { min += 1; s = 0; }
    return `${min}:${String(s).padStart(2, '0')}`;
  };
  return {
    vmaPace: toPace(vma),
    seuilPace: toPace(vma * 0.87),
    eaPace: toPace(vma * 0.77),
    efPace: toPace(vma * 0.67),
    recoveryPace: toPace(vma * 0.60),
    allureSpecifique5k: toPace(vma * 0.95),
    allureSpecifique10k: toPace(vma * 0.90),
    allureSpecifiqueSemi: toPace(vma * 0.85),
    allureSpecifiqueMarathon: toPace(vma * 0.80),
  };
}

const mkSession = (over: Partial<Session> = {}): Session => ({
  day: 'Mardi',
  title: 'Footing',
  type: 'Jogging',
  duration: '60 min',
  distance: '8 km',
  targetRPE: 4,
  elevationGain: 0,
  mainSet: 'Footing 60 min',
  coachAdvice: '',
  ...over,
} as Session);

// ──────────────────────────────────────────────
// CAS 1-6 : variations standard (±5%, ±10%, ±20%, +30%)
// ──────────────────────────────────────────────

describe('F-17 Battery — variations VMA standard', () => {
  it('1. VMA IDENTIQUE (10 → 10) → idempotence byte-equal', () => {
    const swap = buildPaceSwapMap(paces(10), paces(10));
    expect(swap.size).toBeGreaterThan(0);
    // Toutes les entrées swap pointent vers la même valeur (no-op effectif)
    for (const [k, v] of swap) expect(k).toBe(v);

    const session = mkSession({ targetPace: '8:57 min/km', mainSet: '60 min à 8:57 min/km' });
    const r = recalibrateSession(session, paces(10), paces(10));
    expect(r.targetPace).toBe(session.targetPace);
    expect(r.mainSet).toBe(session.mainSet);
  });

  it('2. VMA +5% (10 → 10.5) — petit ajustement', () => {
    const old10 = paces(10);   // efPace = 8:57
    const new105 = paces(10.5); // efPace = 8:32 (10.5*0.67 = 7.035 km/h → 8:32)
    const swap = buildPaceSwapMap(old10, new105);
    expect(swap.get('8:57')).toBe('8:32');
    expect(swap.get('6:00')).toBe('5:43'); // vmaPace 10.5 = 3600/10.5/60 = 5.71min = 5:43
  });

  it('3. VMA +10% (10 → 11) — limite tolérée', () => {
    const swap = buildPaceSwapMap(paces(10), paces(11));
    expect(swap.get('8:57')).toBeDefined();
    expect(swap.get('6:00')).toBe('5:27'); // vmaPace 11 km/h
  });

  it('4. VMA +20% (Robine 8.3 → 10) — cas réel', () => {
    const swap = buildPaceSwapMap(paces(8.3), paces(10));
    expect(swap.get('10:47')).toBe('8:57'); // efPace
    expect(swap.get('7:14')).toBe('6:00'); // vmaPace

    const session = mkSession({
      targetPace: '10:47 min/km',
      mainSet: 'EF 60 min à 10:47 min/km, finir à 9:23 min/km',
    });
    const r = recalibrateSession(session, paces(8.3), paces(10));
    expect(r.targetPace).toBe('8:57 min/km');
    expect(r.mainSet).toContain('8:57 min/km');
    expect(r.mainSet).toContain('7:48 min/km'); // 9:23 → eaPace nouvelle
  });

  it('5. VMA +23% (Lucas 10.9 → 13.4) — cas réel', () => {
    const swap = buildPaceSwapMap(paces(10.9), paces(13.4));
    // Avec tolérance ±1, 8:12 ou 8:13 → 6:40 ou 6:41
    expect(swap.has('8:13') || swap.has('8:12')).toBe(true);
  });

  it('6. VMA +30% (10 → 13) — warning rouge zone', () => {
    const swap = buildPaceSwapMap(paces(10), paces(13));
    expect(swap.size).toBe(9); // 9 paces toutes recalculées
    expect(swap.get('8:57')).toBe('6:53'); // EF 30% plus rapide
    expect(swap.get('10:00')).toBe('7:42'); // recovery
  });
});

// ──────────────────────────────────────────────
// CAS 7-9 : variations extrêmes (+50%, +70%, -30%)
// ──────────────────────────────────────────────

describe('F-17 Battery — variations extrêmes', () => {
  it('7. VMA +50% (10 → 15) — user sur-estime fortement', () => {
    const swap = buildPaceSwapMap(paces(10), paces(15));
    expect(swap.size).toBe(9);
    // Toutes les paces deviennent significativement plus rapides
    expect(swap.get('6:00')).toBe('4:00'); // vmaPace
    expect(swap.get('8:57')).toBe('5:58'); // efPace ratio 1.5
  });

  it('8. VMA +70% (10 → 17) — extrême absurde, doit pas crasher', () => {
    const swap = buildPaceSwapMap(paces(10), paces(17));
    expect(swap.size).toBe(9);
    expect(swap.get('6:00')).toBe('3:32'); // vmaPace pour 17 km/h (élite)
    // Le service NE doit PAS bloquer — c'est à l'UI de warning + opt-in
  });

  it('9. VMA -30% (10 → 7) — baisse forte post-blessure', () => {
    const swap = buildPaceSwapMap(paces(10), paces(7));
    expect(swap.size).toBe(9);
    expect(swap.get('8:57')).toBe('12:48'); // EF beaucoup plus lent
    expect(swap.get('6:00')).toBe('8:34'); // VMA dégradée
  });
});

// ──────────────────────────────────────────────
// CAS 10-13 : VMA invalides / impossibles
// ──────────────────────────────────────────────

describe('F-17 Battery — VMA invalides (robustesse)', () => {
  it('10. VMA = 0 → swap vide, pas de crash', () => {
    const swap = buildPaceSwapMap(paces(0), paces(10));
    expect(swap.size).toBe(0); // paces(0) retourne objet vide
  });

  it('11. VMA négative (-5) → swap vide', () => {
    const swap = buildPaceSwapMap(paces(-5), paces(10));
    expect(swap.size).toBe(0);
  });

  it('12. VMA = NaN → swap vide', () => {
    const swap = buildPaceSwapMap(paces(NaN), paces(10));
    expect(swap.size).toBe(0);
  });

  it('13. VMA Infinity → swap vide', () => {
    const swap = buildPaceSwapMap(paces(Infinity), paces(10));
    expect(swap.size).toBe(0);
  });

  it('14. Session avec VMA invalide → inchangée', () => {
    const session = mkSession({ targetPace: '8:57', mainSet: '60 min à 8:57 min/km' });
    const r = recalibrateSession(session, paces(0), paces(10));
    expect(r.targetPace).toBe(session.targetPace);
    expect(r.mainSet).toBe(session.mainSet);
  });
});

// ──────────────────────────────────────────────
// CAS 15-17 : extrêmes physiologiques (élite + très basse)
// ──────────────────────────────────────────────

describe('F-17 Battery — extrêmes physiologiques', () => {
  it('15. VMA élite 22 km/h (Kipchoge-niveau) → paces valides format mm:ss', () => {
    const p = paces(22);
    expect(p.vmaPace).toBe('2:44'); // 3600/22 = 163.6 sec
    expect(p.efPace).toBe('4:04'); // 22 * 0.67
    expect(/^\d:\d{2}$/.test(p.vmaPace!)).toBe(true);
  });

  it('16. VMA absurde 50 km/h (impossible) → calculé mais swap fonctionne', () => {
    const p = paces(50);
    expect(p.vmaPace).toBe('1:12'); // 3600/50
    expect(p.efPace).toBe('1:47');
    // Ne crash pas, mais l'UI doit refuser un tel input
  });

  it('17. VMA très basse 4 km/h (très débutant) → paces > 12 min/km', () => {
    const p = paces(4);
    expect(p.vmaPace).toBe('15:00'); // 3600/4 = 900 sec = 15:00
    expect(p.efPace).toBe('22:23'); // 4 * 0.67 = 2.68 km/h
    // Format à 2 digits respecté (15:00 vs "15min")
    expect(/^\d{1,2}:\d{2}$/.test(p.efPace!)).toBe(true);
  });

  it('18. Swap VMA basse → haute (5 → 12) — débutant qui progresse beaucoup', () => {
    const swap = buildPaceSwapMap(paces(5), paces(12));
    expect(swap.size).toBe(9);
    // Toutes les paces deviennent BEAUCOUP plus rapides
    expect(swap.get('12:00')).toBeDefined(); // vmaPace 5 → 12
    expect(swap.get('17:55') || swap.get('17:56') || swap.get('17:54')).toBeDefined(); // efPace 5 km/h (tolérance ±1)
  });
});

// ──────────────────────────────────────────────
// CAS 19-22 : Idempotence et rollback
// ──────────────────────────────────────────────

describe('F-17 Battery — Idempotence et rollback', () => {
  it('19. Chaîne A→B→A : retour à l\'origine identique', () => {
    const session = mkSession({ targetPace: '8:57 min/km', mainSet: '60 min à 8:57 min/km' });
    const step1 = recalibrateSession(session, paces(8.3), paces(10)); // 8.3 → 10
    expect(step1.mainSet).toContain('8:57'); // becomes new efPace
    const step2 = recalibrateSession(step1, paces(10), paces(8.3)); // 10 → 8.3 (rollback)
    expect(step2.mainSet).toContain('10:47'); // revient à l'efPace VMA 8.3
  });

  it('20. Recalibrage 3 fois consécutives convergent', () => {
    let session = mkSession({ targetPace: '8:57 min/km', mainSet: '60 min à 8:57 min/km' });
    session = recalibrateSession(session, paces(8.3), paces(10));
    session = recalibrateSession(session, paces(10), paces(11));
    session = recalibrateSession(session, paces(11), paces(12));
    // Doit avoir efPace de VMA 12 = 7:28
    expect(session.mainSet).toContain('7:28');
  });

  it('21. Idempotence identité (même VMA) sur session complexe', () => {
    const session = mkSession({
      targetPace: '8:57 min/km',
      mainSet: '4×800 à 6:00 récup à 10:00 min/km, retour 8:57',
    });
    const r = recalibrateSession(session, paces(10), paces(10));
    expect(r.mainSet).toBe(session.mainSet); // byte-equal
  });
});

// ──────────────────────────────────────────────
// CAS 22-25 : Gel allures course (D1 — feedback_jamais_baisser_allure_cible)
// ──────────────────────────────────────────────

describe('F-17 Battery — Gel allures course objectif', () => {
  it('22. freeze=true → allure 10K objectif intacte', () => {
    const swap = buildPaceSwapMap(paces(8.3), paces(10), { freezeRaceSpecificPaces: true });
    expect(swap.size).toBe(5); // 5 training paces only
    expect(swap.has('8:02')).toBe(false); // allureSpecifique10k VMA 8.3 = 8:02 NON présente
  });

  it('23. Session avec allure 5K + EF → 5K gelée, EF recalibrée', () => {
    const session = mkSession({
      mainSet: 'Échauffement 10 min à 10:47 min/km, puis 3 km allure 5K à 7:37 min/km',
    });
    const r = recalibrateSession(session, paces(8.3), paces(10), { freezeRaceSpecificPaces: true });
    expect(r.mainSet).toContain('8:57 min/km'); // EF recalibrée
    expect(r.mainSet).toContain('7:37 min/km'); // 5K objectif GELÉE
  });

  it('24. freeze=false (Maintien en forme sans targetTime) → tout swap', () => {
    const swap = buildPaceSwapMap(paces(8.3), paces(10), { freezeRaceSpecificPaces: false });
    expect(swap.size).toBe(9); // 5 training + 4 spec courses
  });
});

// ──────────────────────────────────────────────
// CAS 25-28 : Cas tordus mainSet
// ──────────────────────────────────────────────

describe('F-17 v2 — forceUpdatePaceByRole (anti paces fossiles)', () => {
  it('29. Cas réel Romane.m2 : EF "5:30" + mainSet "5:52" → force vers EF 5:16 (VMA 17)', () => {
    // Reproduit le bug observé : Gemini avait écrit 5:30 (targetPace) et 5:52 (mainSet)
    // qui ne sont PAS dans calculateAllPaces(15.75 ni 16.3 ni 16.8). Force-update doit
    // les convertir vers efPace VMA 17 = 5:16.
    const session = mkSession({
      type: 'Sortie Longue',
      title: 'Sortie Longue Trail Doux',
      targetPace: '5:30 min/km',
      mainSet: '10 min EF (5:52 min/km) + 1h00 en EF (5:52 min/km) + 10 min EF (5:52 min/km)',
    });
    const newPaces = paces(17); // efPace = 5:16
    const oldPaces = paces(16.3); // efPace = 5:30 (proche)
    const r = recalibrateSession(session, oldPaces, newPaces);
    expect(r.targetPace).toContain('5:16'); // force update (5:30 dans tolérance ±20s de 5:16)
    expect(r.mainSet).not.toContain('5:52'); // 5:52 fossile (336s) dans tolérance de 5:16 (316s) ±20s = OK
    expect(r.mainSet).toContain('5:16 min/km');
  });

  it('30. Garde-fou : durée "Repos 4:30 entre tours" NON forcée (pas de context pace)', () => {
    const session = mkSession({
      type: 'Jogging',
      title: 'Footing EF',
      targetPace: '5:30 min/km',
      mainSet: 'Footing 45 min à 5:30 min/km, repos 4:30 entre éventuels arrêts.',
    });
    const newPaces = paces(17);
    const r = recalibrateSession(session, paces(16.3), newPaces);
    // 5:30 → 5:16 (avec context "à ... min/km") ✓
    expect(r.mainSet).toContain('5:16 min/km');
    // "Repos 4:30 entre" → 4:30 PAS de context "min/km" ni "à" → intact
    expect(r.mainSet).toContain('repos 4:30 entre');
  });

  it('31. Force update Récup : type "Récupération" → recoveryPace', () => {
    const session = mkSession({
      type: 'Récupération',
      title: 'Récupération active',
      targetPace: '5:50 min/km',
      mainSet: '30 min de récupération active à 5:55 min/km, très lent.',
    });
    const newPaces = paces(17); // recoveryPace = 5:53
    const r = recalibrateSession(session, paces(16.3), newPaces);
    // 5:55 (335s) dans tolérance ±20s de 5:53 (353s) ? |335-353|=18 → OUI swap
    expect(r.mainSet).toContain('5:53 min/km');
  });

  it('32. Fractionné NON force-updaté (multi-paces gérés par swap V1)', () => {
    const session = mkSession({
      type: 'Fractionné',
      title: 'VMA 6x800m',
      targetPace: '3:32 min/km',
      mainSet: '6×800m à 3:32 min/km, récup 2:00 à 5:30 min/km',
    });
    const newPaces = paces(17);
    const r = recalibrateSession(session, paces(17), newPaces); // identité pour swap V1
    // detectSessionPaceRole devrait retourner null (Fractionné) → pas de force update
    // Le swap V1 s'applique sur les paces exactes — ici identité car oldPaces=newPaces
    expect(r.mainSet).toBe(session.mainSet);
  });
});

describe('F-17 Battery — Cas tordus mainSet', () => {
  it('25. LIMITATION CONNUE — "allure VMA mm:ss" sans /km : pas matché par regex', () => {
    // RAS — pattern "allure VMA 4:00" (mot entre "allure" et la pace, pas de min/km après)
    // n'est PAS capturé par P1/P2/P3. Cas rare dans pratique Gemini (utilise toujours min/km).
    // Sprint G+1 : ajouter P4 "allure (VMA|seuil|EF|10K) mm:ss" si besoin.
    const swap = buildPaceSwapMap(paces(15), paces(18));
    expect(swap.has('4:00')).toBe(true); // vmaPace 15 = 4:00
    const text = 'Échauffement 4:08, allure VMA 4:00, retour 4:08 min/km';
    const result = recalibrateText(text, swap);
    // "4:08 min/km" doit être swappé (P1), mais "allure VMA 4:00" non.
    // 4:08 → 3:27 ? voyons : oldPaces(15).vmaPace = 4:00, donc 4:08 n'est pas dans swap MAIS
    // avec tolérance ±1 dans buildPaceSwapMap, 4:08 ne sera pas dans swap non plus.
    // → "4:08 min/km" intact (pas dans oldPaces). "4:00" pas matché par regex sans /km.
    expect(result).toBe(text); // tout intact — limitation documentée
  });

  it('26. mainSet vide ou null → no-op safe', () => {
    expect(recalibrateText('', buildPaceSwapMap(paces(10), paces(11)))).toBe('');
    expect(recalibrateText(null as any, buildPaceSwapMap(paces(10), paces(11)))).toBe('');
    expect(recalibrateText(undefined as any, buildPaceSwapMap(paces(10), paces(11)))).toBe('');
  });

  it('27. mainSet avec durées : "Repos 1:30 entre tours" intact', () => {
    const swap = buildPaceSwapMap(paces(10), paces(11));
    const text = '4×800 à 5:27, repos 1:30 entre tours, série de 3:00';
    const result = recalibrateText(text, swap);
    expect(result).toContain('1:30'); // durée non touchée
    expect(result).toContain('3:00'); // durée non touchée
  });

  it('28. mainSet Renfo (aucune pace) → no-op safe', () => {
    const session = mkSession({
      type: 'Renforcement',
      mainSet: 'Squats 3×10, Fentes 3×8, Repos 1:30',
      targetPace: undefined,
    });
    const r = recalibrateSession(session, paces(10), paces(12));
    expect(r.mainSet).toBe(session.mainSet);
  });
});
