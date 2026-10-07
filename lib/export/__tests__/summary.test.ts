import { describe, expect, it } from 'vitest';
import { summarize } from '../summary';
import { SAMPLE, expense } from './fixtures';

describe('summarize', () => {
  it('totals, date span and per-category breakdown in canonical order', () => {
    expect(summarize(SAMPLE)).toEqual({
      count: 4,
      total: 129.75,
      firstDate: '2026-09-02',
      lastDate: '2026-10-03',
      byCategory: [
        { category: 'Food', count: 2, total: 19.75 },
        { category: 'Transportation', count: 1, total: 30 },
        { category: 'Bills', count: 1, total: 80 },
      ],
    });
  });

  it('rounds away floating point drift', () => {
    expect(summarize([expense('2026-01-01', 'Food', 0.1), expense('2026-01-02', 'Food', 0.2)]).total).toBe(0.3);
  });

  it('handles no rows', () => {
    expect(summarize([])).toEqual({ count: 0, total: 0, firstDate: null, lastDate: null, byCategory: [] });
  });
});
