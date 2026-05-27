/**
 * Sprint Fix P0a distance route (2026-05-20) — Tests anti-régression
 *
 * BUG : audit 4 plans 2026-05-20 — `plan.distance` halluciné par LLM pour les
 * plans route. Cas observés :
 *   - Margaux (Semi 2h20, Inter VMA 10.9, freq 3)   → "16 km" au lieu de Semi
 *   - Bertrand (Semi Finisher, Conf VMA 9.5, freq 3) → "14 km"
 *   - floggyz (10K Expert)                           → "36 km"
 *
 * FIX : `applyDistanceOverride()` (geminiService.ts, juste après JSON.parse
 * dans `generatePreviewPlan`) — écrasement déterministe basé sur input user.
 *
 * Doctrine : [[feedback_input_client_obligatoire]] — input user = source de vérité.
 *
 * Lancer : npx vitest run src/services/__tests__/plan-distance-override.test.ts
 */

import { describe, it, expect } from 'vitest';
import { applyDistanceOverride } from '../geminiService';

describe('applyDistanceOverride — écrasement déterministe plan.distance', () => {
  it('1. Semi-Marathon : LLM halluciné "16 km" → écrasé en "21.1 km (Semi-Marathon)"', () => {
    const plan: any = { distance: '16 km' }; // bug Margaux
    applyDistanceOverride(plan, { subGoal: 'Semi-Marathon' });
    expect(plan.distance).toBe('21.1 km (Semi-Marathon)');
  });

  it('2. Semi-marathon (m minuscule) : variante legacy supportée', () => {
    const plan: any = { distance: '14 km' }; // bug Bertrand
    applyDistanceOverride(plan, { subGoal: 'Semi-marathon' });
    expect(plan.distance).toBe('21.1 km (Semi-Marathon)');
  });

  it('3. Marathon : LLM halluciné → écrasé en "42.2 km (Marathon)"', () => {
    const plan: any = { distance: '40 km' };
    applyDistanceOverride(plan, { subGoal: 'Marathon' });
    expect(plan.distance).toBe('42.2 km (Marathon)');
  });

  it('4. 10 km : LLM halluciné "36 km" → écrasé en "10 km" (idempotent)', () => {
    const plan: any = { distance: '36 km' }; // bug floggyz
    applyDistanceOverride(plan, { subGoal: '10 km' });
    expect(plan.distance).toBe('10 km');
  });

  it('5. 5 km : écrasement normalisé', () => {
    const plan: any = { distance: '3 km' };
    applyDistanceOverride(plan, { subGoal: '5 km' });
    expect(plan.distance).toBe('5 km');
  });

  it('6. Trail : préserve le comportement existant {distance}km D+{elevation}m', () => {
    const plan: any = { distance: 'wrong' };
    applyDistanceOverride(plan, {
      goal: 'Trail',
      trailDetails: { distance: 42, elevation: 2000 },
    });
    expect(plan.distance).toBe('42km D+2000m');
  });

  it('7. Trail prioritaire sur subGoal : goal Trail force le libellé trail', () => {
    // Sécurité : si data.goal='Trail' + data.subGoal='Marathon' (cas edge),
    // on garde la priorité Trail (cf. préservation comportement).
    const plan: any = { distance: '' };
    applyDistanceOverride(plan, {
      goal: 'Trail',
      subGoal: 'Marathon',
      trailDetails: { distance: 21, elevation: 800 },
    });
    expect(plan.distance).toBe('21km D+800m');
  });

  it('8. subGoal undefined : pas de crash, distance LLM préservée', () => {
    const plan: any = { distance: '5 km' };
    applyDistanceOverride(plan, {}); // Maintien/PertePoids sans subGoal
    expect(plan.distance).toBe('5 km'); // inchangé
  });

  it('9. subGoal "Hyrox" SANS goal=Hyrox : pas d\'écrasement (cas legacy)', () => {
    const plan: any = { distance: '8 km Hyrox' };
    applyDistanceOverride(plan, { subGoal: 'Hyrox' });
    expect(plan.distance).toBe('8 km Hyrox'); // inchangé, mapping non touché
  });

  it('9-bis. goal=Hyrox (F-5 audit 26/05) : écrase l\'hallucination "20 km" en "8 km (Hyrox course)"', () => {
    // Bug F-5 audit 5 plans 26/05/2026 : Plan david.desperques (1779747632587)
    // avait `goal=Hyrox` mais `distance="20 km"` → feasibility calculait sur 20 km/1h
    // = VMA 23.5 km/h irréaliste. La partie "course pure" d'un Hyrox vaut TOUJOURS 8 km
    // (8×1km coupés par 8 stations). Cf. project_coach_running_ia_hyrox_scope.
    const plan: any = { distance: '20 km' }; // bug david.desperques
    applyDistanceOverride(plan, { goal: 'Hyrox' });
    expect(plan.distance).toBe('8 km (Hyrox course)');
  });

  it('10. Variante "5km" (sans espace) supportée', () => {
    const plan: any = { distance: '6 km' };
    applyDistanceOverride(plan, { subGoal: '5km' });
    expect(plan.distance).toBe('5 km');
  });

  it('11. Variante "10km" (sans espace) supportée', () => {
    const plan: any = { distance: '12 km' };
    applyDistanceOverride(plan, { subGoal: '10km' });
    expect(plan.distance).toBe('10 km');
  });

  it('12. Trail sans trailDetails complet : fallback subGoal si fourni', () => {
    // Edge : data.goal='Trail' mais data.trailDetails manquant — on tombe
    // dans le subGoal mapping. Ne devrait pas arriver en prod mais robuste.
    const plan: any = { distance: 'wrong' };
    applyDistanceOverride(plan, {
      goal: 'Trail',
      subGoal: 'Marathon', // edge
      trailDetails: undefined,
    });
    // Pas de trailDetails → tombe sur subGoal mapping
    expect(plan.distance).toBe('42.2 km (Marathon)');
  });
});
