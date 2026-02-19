import { describe, it, expect } from 'vitest';
import { calculateExamScore, calculateTopicBreakdown } from '../examScoring';

describe('calculateExamScore', () => {
  it('returns 0 score and fail for 0 correct out of 50', () => {
    const result = calculateExamScore(0, 50);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('returns 100 score and pass for perfect score', () => {
    const result = calculateExamScore(50, 50);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('returns pass at exactly 70%', () => {
    const result = calculateExamScore(35, 50);
    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);
  });

  it('returns fail at 69% (34/50 = 68)', () => {
    const result = calculateExamScore(34, 50);
    expect(result.score).toBe(68);
    expect(result.passed).toBe(false);
  });

  it('handles full exam mode: 105/150 = 70 (pass)', () => {
    const result = calculateExamScore(105, 150);
    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);
  });

  it('handles full exam mode: 104/150 = 69 (fail)', () => {
    const result = calculateExamScore(104, 150);
    expect(result.score).toBe(69);
    expect(result.passed).toBe(false);
  });

  it('rounds correctly: 69.5% rounds to 70 (pass)', () => {
    // 139 / 200 = 0.695, rounds to 70
    const result = calculateExamScore(139, 200);
    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);
  });

  it('rounds correctly: 69.4% rounds to 69 (fail)', () => {
    // 347 / 500 = 0.694, rounds to 69
    const result = calculateExamScore(347, 500);
    expect(result.score).toBe(69);
    expect(result.passed).toBe(false);
  });

  it('handles 0 total questions without dividing by zero', () => {
    const result = calculateExamScore(0, 0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('handles 1 correct out of 1 (100%)', () => {
    const result = calculateExamScore(1, 1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('handles 0 correct out of 1 (0%)', () => {
    const result = calculateExamScore(0, 1);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});

describe('calculateTopicBreakdown', () => {
  it('returns empty array for empty stats', () => {
    const result = calculateTopicBreakdown({});
    expect(result).toEqual([]);
  });

  it('calculates percentage for a single topic', () => {
    const result = calculateTopicBreakdown({
      'Contracts': { correct: 8, total: 10 },
    });
    expect(result).toEqual([
      { topic: 'Contracts', correct: 8, total: 10, percentage: 80 },
    ]);
  });

  it('sorts by percentage ascending (weakest topics first)', () => {
    const result = calculateTopicBreakdown({
      'Topic A': { correct: 9, total: 10 },  // 90%
      'Topic B': { correct: 3, total: 10 },  // 30%
      'Topic C': { correct: 7, total: 10 },  // 70%
    });
    expect(result[0].topic).toBe('Topic B');
    expect(result[1].topic).toBe('Topic C');
    expect(result[2].topic).toBe('Topic A');
  });

  it('rounds percentages correctly', () => {
    const result = calculateTopicBreakdown({
      'Rounding': { correct: 1, total: 3 },  // 33.33... -> 33
    });
    expect(result[0].percentage).toBe(33);
  });

  it('handles 0 total without dividing by zero', () => {
    const result = calculateTopicBreakdown({
      'Empty': { correct: 0, total: 0 },
    });
    expect(result[0].percentage).toBe(0);
  });

  it('handles 100% topic', () => {
    const result = calculateTopicBreakdown({
      'Perfect': { correct: 15, total: 15 },
    });
    expect(result[0].percentage).toBe(100);
  });

  it('handles 0% topic', () => {
    const result = calculateTopicBreakdown({
      'Zero': { correct: 0, total: 10 },
    });
    expect(result[0].percentage).toBe(0);
  });
});
