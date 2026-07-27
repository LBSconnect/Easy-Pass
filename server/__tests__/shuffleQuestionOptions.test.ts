import { describe, it, expect } from 'vitest';
import { shuffleQuestionOptions } from '../shuffleQuestionOptions';

describe('shuffleQuestionOptions', () => {
  it('reorders options using a deterministic rng and updates correctAnswer to match', () => {
    const optionsEn = ['A', 'B', 'C', 'D'];
    const optionsEs = ['Ay', 'Be', 'Ce', 'De'];

    // A constant rng of 0 always picks index 0 to swap with, producing a known permutation
    const rng = () => 0;

    const result = shuffleQuestionOptions(optionsEn, optionsEs, 0, rng);

    expect(result.optionsEn).toEqual(['B', 'C', 'D', 'A']);
    expect(result.optionsEs).toEqual(['Be', 'Ce', 'De', 'Ay']);
    expect(result.correctAnswer).toBe(3);
  });

  it('keeps English and Spanish options in the same relative order as each other', () => {
    const optionsEn = ['one', 'two', 'three', 'four'];
    const optionsEs = ['uno', 'dos', 'tres', 'cuatro'];

    for (let trial = 0; trial < 50; trial++) {
      const result = shuffleQuestionOptions(optionsEn, optionsEs, 2);
      for (let i = 0; i < optionsEn.length; i++) {
        const enIndex = optionsEn.indexOf(result.optionsEn[i]);
        expect(result.optionsEs[i]).toBe(optionsEs[enIndex]);
      }
    }
  });

  it('the correctAnswer index always points at the originally-correct option text', () => {
    const optionsEn = ['wrong1', 'wrong2', 'RIGHT', 'wrong3'];
    const optionsEs = ['mal1', 'mal2', 'CORRECTO', 'mal3'];

    for (let trial = 0; trial < 100; trial++) {
      const result = shuffleQuestionOptions(optionsEn, optionsEs, 2);
      expect(result.optionsEn[result.correctAnswer]).toBe('RIGHT');
      expect(result.optionsEs[result.correctAnswer]).toBe('CORRECTO');
    }
  });

  it('preserves the full set of options, just reordered', () => {
    const optionsEn = ['a', 'b', 'c', 'd'];
    const optionsEs = ['a-es', 'b-es', 'c-es', 'd-es'];

    const result = shuffleQuestionOptions(optionsEn, optionsEs, 1);

    expect([...result.optionsEn].sort()).toEqual([...optionsEn].sort());
    expect([...result.optionsEs].sort()).toEqual([...optionsEs].sort());
  });

  it('does not always land the correct answer in the same position over many runs', () => {
    const optionsEn = ['w1', 'w2', 'RIGHT', 'w3'];
    const optionsEs = ['m1', 'm2', 'CORRECTO', 'm3'];

    const positions = new Set<number>();
    for (let trial = 0; trial < 200; trial++) {
      const result = shuffleQuestionOptions(optionsEn, optionsEs, 2);
      positions.add(result.correctAnswer);
    }

    expect(positions.size).toBeGreaterThan(1);
  });
});
