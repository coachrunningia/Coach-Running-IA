/**
 * Sprint E Phase 2 — Bug 15 : Injuries blacklist côtes (P0 sécurité).
 *
 * Sources :
 *   - /Users/romanemarino/Coach-Running-IA/SPRINT-E-BUG15-INJURIES-SPEC.md
 *
 * Cas Laurence (1779563548769) :
 *   Tendinite ischio active déclarée → S1 contenait 3 footings vallonné/côtes
 *   = aggravation excentrique directe. Le LLM lit `injuries.description` mais
 *   l'interprète mal. Triple intervention :
 *     1. Helpers `isHillBanned` / `isHardSurfaceBanned`
 *     2. Injection prompt LLM CONTRE-INDICATION (renforcement préventif)
 *     3. Filet post-LLM `enforceInjuryBlacklist` (retype Footing EF plat sur S1-S4)
 *
 * Doctrines : feedback_securite_avant_conversion, feedback_compromis_messages_preventifs,
 *             feedback_chaque_ligne_justifiee.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase2-bug15-injuries.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isHillBanned,
  isHardSurfaceBanned,
  enforceInjuryBlacklist,
} from '../geminiService';

describe('Bug 15 — isHillBanned', () => {
  it('détecte tendinite ischio (cas Laurence)', () => {
    expect(isHillBanned('Tendinite ischio')).toBe(true);
    expect(isHillBanned('tendinite ischio active')).toBe(true);
    expect(isHillBanned('tendon ischiojambier')).toBe(true);
    expect(isHillBanned('proximal hamstring')).toBe(true);
  });

  it('détecte tendinite achille', () => {
    expect(isHillBanned('Tendinite achille')).toBe(true);
    expect(isHillBanned("tendon d'achille gauche")).toBe(true);
    expect(isHillBanned('tendinopathie achilléenne')).toBe(true);
  });

  it('détecte TFL / ITBS', () => {
    expect(isHillBanned('TFL')).toBe(true);
    expect(isHillBanned('bandelette ilio-tibiale')).toBe(true);
    expect(isHillBanned('ITBS')).toBe(true);
    expect(isHillBanned("syndrome de l'essuie-glace")).toBe(true);
  });

  it('détecte fasciite plantaire', () => {
    expect(isHillBanned('Fasciite plantaire')).toBe(true);
    expect(isHillBanned('aponévrosite plantaire')).toBe(true);
  });

  it('PAS de faux positif sur description générique', () => {
    // "douleur genou général" n'est pas un pattern tendineux côtes-incompatible
    expect(isHillBanned('Douleur genou général')).toBe(false);
    expect(isHillBanned('mal au dos')).toBe(false);
    expect(isHillBanned('entorse cheville récente')).toBe(false);
  });

  it('retourne false si description undefined ou vide', () => {
    expect(isHillBanned(undefined)).toBe(false);
    expect(isHillBanned('')).toBe(false);
  });
});

describe('Bug 15 — isHardSurfaceBanned', () => {
  it('détecte périostite et stress fracture', () => {
    expect(isHardSurfaceBanned('périostite tibiale')).toBe(true);
    expect(isHardSurfaceBanned('periostite')).toBe(true);
    expect(isHardSurfaceBanned('fracture de fatigue')).toBe(true);
    expect(isHardSurfaceBanned('stress fracture')).toBe(true);
  });

  it('détecte mention tibia', () => {
    expect(isHardSurfaceBanned('douleur tibia')).toBe(true);
  });

  it('retourne false sans description', () => {
    expect(isHardSurfaceBanned(undefined)).toBe(false);
    expect(isHardSurfaceBanned('')).toBe(false);
  });
});

describe('Bug 15 — enforceInjuryBlacklist (profil Laurence)', () => {
  // Helper pour construire une week de test ciblée
  const buildWeek = (sessions: any[], weekNumber = 1) => ({
    weekNumber,
    phase: 'fondamental',
    sessions,
  });

  it('retype 3 footings vallonnés en "Footing EF plat" (cas Laurence S1)', () => {
    const week = buildWeek([
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné, côtes en marche',
        mainSet: '45 min en EF, côtes en marche, vallonné' },
      { day: 'Jeudi', type: 'Jogging', title: 'Footing vallonné',
        mainSet: '50 min en EF avec dénivelé' },
      { day: 'Samedi', type: 'Sortie Longue', title: 'SL vallonnée',
        mainSet: '1h15 vallonnée, côtes en marche' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio active', weekIdx: 0 });
    expect(week.sessions[0].title).toBe('Footing EF plat');
    expect(week.sessions[1].title).toBe('Footing EF plat');
    expect(week.sessions[2].title).toBe('Footing EF plat');
    week.sessions.forEach(s => {
      expect(s.mainSet).toMatch(/STRICTEMENT plat/i);
      expect(s.mainSet).toMatch(/aucune c[ôo]te/i);
      expect(s.mainSet).not.toMatch(/c[ôo]tes?\s+en\s+marche/i);
      expect(s.mainSet).not.toMatch(/vallonn[ée]/i);
    });
  });

  it('NE TOUCHE PAS le Renforcement (jamais retyper)', () => {
    const week = buildWeek([
      { day: 'Lundi', type: 'Renforcement', title: 'Renfo bas du corps',
        mainSet: 'Squats vallonné progression côtes' },
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné',
        mainSet: 'EF 45 min vallonné' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 0 });
    // Renfo intact
    expect(week.sessions[0].type).toBe('Renforcement');
    expect(week.sessions[0].title).toBe('Renfo bas du corps');
    // Footing retypé
    expect(week.sessions[1].title).toBe('Footing EF plat');
  });

  it('NE TOUCHE PAS le Repos', () => {
    const week = buildWeek([
      { day: 'Lundi', type: 'Repos', title: 'Repos complet', mainSet: 'Jour de repos' },
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné', mainSet: 'EF 45 min vallonné' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite achille', weekIdx: 0 });
    expect(week.sessions[0].type).toBe('Repos');
    expect(week.sessions[0].title).toBe('Repos complet');
    expect(week.sessions[1].title).toBe('Footing EF plat');
  });

  it('no-op si profil sans blessure', () => {
    const week = buildWeek([
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné', mainSet: 'EF 45 min vallonné' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: undefined, weekIdx: 0 });
    expect(week.sessions[0].title).toBe('Footing vallonné');
    expect(week.sessions[0].mainSet).toBe('EF 45 min vallonné');
  });

  it('no-op si blessure non concernée (douleur genou général)', () => {
    const week = buildWeek([
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné', mainSet: 'EF 45 min vallonné' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: 'douleur genou général', weekIdx: 0 });
    expect(week.sessions[0].title).toBe('Footing vallonné');
  });

  it('no-op en semaine 5+ (libre après consolidation)', () => {
    const week = buildWeek([
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné', mainSet: 'EF 45 min vallonné' },
    ], 5);
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 4 });
    expect(week.sessions[0].title).toBe('Footing vallonné');
  });

  it('idempotent : 2 appels n\'ajoutent pas 2× le suffixe sécurité', () => {
    const week = buildWeek([
      { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné', mainSet: 'EF 45 min vallonné' },
    ]);
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 0 });
    const after1 = week.sessions[0].mainSet;
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 0 });
    const after2 = week.sessions[0].mainSet;
    expect(after1).toBe(after2);
    // Une seule occurrence du marker
    const matches = after2.match(/STRICTEMENT plat/gi);
    expect(matches?.length).toBe(1);
  });
});
