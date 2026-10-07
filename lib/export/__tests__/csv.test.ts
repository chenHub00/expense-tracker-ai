import { describe, expect, it } from 'vitest';
import { escapeCsvCell, expensesToCSV, toCsv } from '../../csv';
import { expense } from './fixtures';

describe('escapeCsvCell', () => {
  it.each([
    ['plain', 'plain'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@cmd', "'@cmd"],
  ])('%j → %j', (input, output) => {
    expect(escapeCsvCell(input)).toBe(output);
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });
});

describe('expensesToCSV (Expenses page quick export)', () => {
  it('keeps its own column order', () => {
    expect(expensesToCSV([expense('2026-10-01', 'Food', 3, 'Tea')])).toBe('Date,Category,Description,Amount\r\n2026-10-01,Food,Tea,3.00');
  });
});
