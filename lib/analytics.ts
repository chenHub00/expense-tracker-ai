import { CATEGORIES, type Category, type Expense } from './types';
import { LOCALE, monthKey } from './utils';

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTotal {
  key: string;
  label: string;
  total: number;
  isCurrent: boolean;
}

export interface SpendingSummary {
  total: number;
  count: number;
  monthTotal: number;
  monthCount: number;
  previousMonthTotal: number;
  /** Percentage change versus last month, or null when last month had no spending. */
  monthChange: number | null;
  dailyAverage: number;
  /** Top category this month, falling back to all-time when this month is empty. */
  topCategory: CategoryTotal | null;
  topCategoryScope: 'month' | 'all';
}

const sum = (expenses: Expense[]) => expenses.reduce((acc, e) => acc + e.amount, 0);

export function getCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const total = sum(expenses);
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    const categoryTotal = sum(items);
    return {
      category,
      total: categoryTotal,
      count: items.length,
      percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
    };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

export function getMonthExpenses(expenses: Expense[], date: Date): Expense[] {
  const key = monthKey(date);
  return expenses.filter((e) => e.date.startsWith(key));
}

export function getSummary(expenses: Expense[], now: Date = new Date()): SpendingSummary {
  const thisMonth = getMonthExpenses(expenses, now);
  const previousMonth = getMonthExpenses(expenses, new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const monthTotal = sum(thisMonth);
  const previousMonthTotal = sum(previousMonth);
  const monthTop = getCategoryTotals(thisMonth)[0] ?? null;

  return {
    total: sum(expenses),
    count: expenses.length,
    monthTotal,
    monthCount: thisMonth.length,
    previousMonthTotal,
    monthChange:
      previousMonthTotal > 0 ? ((monthTotal - previousMonthTotal) / previousMonthTotal) * 100 : null,
    dailyAverage: monthTotal / now.getDate(),
    topCategory: monthTop ?? getCategoryTotals(expenses)[0] ?? null,
    topCategoryScope: monthTop ? 'month' : 'all',
  };
}

export function getMonthlyTotals(expenses: Expense[], months = 6, now: Date = new Date()): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(date);
    result.push({
      key,
      label: date.toLocaleDateString(LOCALE, { month: 'short' }),
      total: sum(expenses.filter((e) => e.date.startsWith(key))),
      isCurrent: i === 0,
    });
  }
  return result;
}
