/**
 * Sprint E Phase 2 — Bug 6 : Anti-hallucination spots géographiques.
 *
 * Source :
 *   - Patch zone : buildLocationPromptBlock + 2 sites prompt LLM
 *     (preview L4501 + remaining L5546).
 *   - Doctrine [[feedback_securite_avant_conversion]] : transparence > illusion
 *     de précision.
 *
 * Avant : prompt demandait des lieux RÉELS nommément, donnant 2-3 exemples
 * ("Bois de Vincennes", "Parc de la Tête d'Or"). Le LLM extrapolait à des
 * villes mal couvertes → noms inventés, parcs mal localisés. Désormais :
 * descriptions GÉNÉRIQUES de terrain (parc urbain, berges, sentier vallonné)
 * avec INTERDICTION ABSOLUE de nommer un spot précis.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase2-bug6-spots-geo.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildLocationPromptBlock } from '../geminiService';

describe('Bug 6 — buildLocationPromptBlock (preview variant)', () => {
  it('ville = Vannes → prompt contient INTERDICTION ABSOLUE', () => {
    const block = buildLocationPromptBlock('Vannes', 'preview');
    expect(block).toContain('INTERDICTION ABSOLUE de nommer un spot précis');
  });

  it('ville = Paris → idem (INTERDICTION ABSOLUE)', () => {
    const block = buildLocationPromptBlock('Paris', 'preview');
    expect(block).toContain('INTERDICTION ABSOLUE de nommer un spot précis');
  });

  it('ville présente → mentionne descriptions génériques de terrain', () => {
    const block = buildLocationPromptBlock('Lyon', 'preview');
    expect(block).toMatch(/parc urbain|piste|berges|sentier|forêt|chemin/i);
  });

  it('ville présente → AUCUN nom propre de spot dans le prompt généré', () => {
    const block = buildLocationPromptBlock('Paris', 'preview');
    // On vérifie que les anciens exemples nominatifs ont disparu.
    expect(block).not.toContain('Bois de Vincennes');
    expect(block).not.toContain('Parc Montsouris');
    expect(block).not.toContain('Jardin du Luxembourg');
    expect(block).not.toContain('Tête d');
    expect(block).not.toContain('Berges du Rhône');
  });

  it('ville absente (undefined) → string vide (no-op)', () => {
    expect(buildLocationPromptBlock(undefined, 'preview')).toBe('');
  });

  it('ville absente (chaîne vide) → string vide (no-op)', () => {
    expect(buildLocationPromptBlock('', 'preview')).toBe('');
  });
});

describe('Bug 6 — buildLocationPromptBlock (remaining variant)', () => {
  it('ville = Vannes → prompt remaining contient INTERDICTION ABSOLUE', () => {
    const block = buildLocationPromptBlock('Vannes', 'remaining');
    expect(block).toContain('INTERDICTION ABSOLUE de nommer un spot précis');
  });

  it('remaining variant garde la consigne D+ / variation entre semaines', () => {
    const block = buildLocationPromptBlock('Marseille', 'remaining');
    expect(block).toMatch(/dénivelé/i);
    expect(block).toMatch(/Varier/i);
  });

  it('ville absente → no-op aussi en remaining', () => {
    expect(buildLocationPromptBlock(undefined, 'remaining')).toBe('');
  });
});
