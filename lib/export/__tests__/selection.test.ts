import { describe, expect, it } from 'vitest';
import { countByCategory, isRangeInvalid, selectExpenses, toggleCategory } from '../selection';
import { ALL, SAMPLE } from './fixtures';

describe('selectExpenses', () => {
  it('returns everything newest first by default', () => {
    expect(selectExpenses(SAMPLE, ALL).map((e) => e.date)).toEqual(['2026-10-03', '2026-10-01', '2026-09-15', '2026-09-02']);
  });

  it('applies inclusive date bounds', () => {
    const rows = selectExpenses(SAMPLE, { ...ALL, from: '2026-09-15', to: '2026-10-01' });
    expect(rows.map((e) => e.date)).toEqual(['2026-10-01', '2026-09-15']);
  });

  it('filters by category', () => {
    expect(selectExpenses(SAMPLE, { ...ALL, categories: ['Food'] })).toHaveLength(2);
    expect(selectExpenses(SAMPLE, { ...ALL, categories: [] })).toHaveLength(0);
  });

  it('selects nothing for an inverted range', () => {
    expect(selectExpenses(SAMPLE, { ...ALL, from: '2026-10-05', to: '2026-09-01' })).toEqual([]);
  });

  it('does not reorder the input', () => {
    const input = [...SAMPLE];
    selectExpenses(input, ALL);
    expect(input).toEqual(SAMPLE);
  });
});

describe('isRangeInvalid', () => {
  it('only flags a start after the end', () => {
    expect(isRangeInvalid({ from: '2026-10-02', to: '2026-10-01' })).toBe(true);
    expect(isRangeInvalid({ from: '2026-10-01', to: '2026-10-01' })).toBe(false);
    expect(isRangeInvalid({ from: '2026-10-01', to: '' })).toBe(false);
  });
});

describe('countByCategory', () => {
  it('counts within the date range regardless of category choice', () => {
    const counts = countByCategory(SAMPLE, { from: '2026-10-01', to: '' });
    expect(counts).toMatchObject({ Food: 1, Transportation: 1, Bills: 0, Other: 0 });
  });
});

describe('toggleCategory', () => {
  it('adds in canonical order and removes', () => {
    expect(toggleCategory(['Bills'], 'Food')).toEqual(['Food', 'Bills']);
    expect(toggleCategory(['Food', 'Bills'], 'Food')).toEqual(['Bills']);
  });
});
