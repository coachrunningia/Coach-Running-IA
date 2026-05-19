/**
 * Tests buildDisciplineBlock — routing par subGoal.
 */

import { describe, it, expect } from 'vitest';
import { buildDisciplineBlock } from '../doctrine/buildDisciplineBlock';

const paces = {
  efPace: '5:40',
  seuilPace: '4:42',
  vmaPace: '4:17',
  allureSpecifique5k: '4:25',
  allureSpecifique10k: '4:35',
  allureSpecifiqueSemi: '4:50',
  allureSpecifiqueMarathon: '5:10',
};

describe('buildDisciplineBlock — routing par subGoal', () => {
  it('Marathon → injecte bloc Marathon (8 patterns)', () => {
    const block = buildDisciplineBlock('Marathon', { level: 'Confirmé' }, paces);
    expect(block).toMatch(/BIBLIOTHÈQUE COACH MARATHON/);
    expect(block).toMatch(/MP-LR/);
  });

  it('Semi-marathon → injecte bloc Semi (PAS Marathon)', () => {
    const block = buildDisciplineBlock('Semi-marathon', { level: 'Confirmé' }, paces);
    expect(block).toMatch(/SEMI-MARATHON/);
    expect(block).toMatch(/HMP-LR/);
    // Pas de MP-LR (canonique marathon only)
    expect(block).not.toMatch(/BIBLIOTHÈQUE COACH MARATHON \(/);
  });

  it('10 km → injecte bloc 10K', () => {
    const block = buildDisciplineBlock('10 km', { level: 'Confirmé' }, paces);
    expect(block).toMatch(/BIBLIOTHÈQUE COACH 10K/);
    expect(block).toMatch(/VO2-LONG-10K|LT-CRUISE-10K/);
  });

  it('5 km → injecte bloc 5K', () => {
    const block = buildDisciplineBlock('5 km', { level: 'Confirmé' }, paces);
    expect(block).toMatch(/BIBLIOTHÈQUE COACH 5K/);
    expect(block).toMatch(/VO2-COURT|VMA-COURTE-5K/);
  });

  it('Trail → no-op (vide, géré ailleurs)', () => {
    const block = buildDisciplineBlock('Trail', { level: 'Confirmé' }, paces);
    expect(block).toBe('');
  });

  it('Hyrox → no-op (vide, géré ailleurs)', () => {
    const block = buildDisciplineBlock('Hyrox', { level: 'Confirmé' }, paces);
    expect(block).toBe('');
  });

  it('Perte de poids → no-op (vide)', () => {
    const block = buildDisciplineBlock('Perte de poids', { level: 'Débutant' }, paces);
    expect(block).toBe('');
  });

  it('undefined → no-op', () => {
    const block = buildDisciplineBlock(undefined, {}, paces);
    expect(block).toBe('');
  });
});
