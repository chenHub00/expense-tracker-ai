import type { Category, Expense } from './types';
import { generateId, toISODate } from './utils';

const TEMPLATES: Array<{ category: Category; descriptions: string[]; min: number; max: number }> = [
  {
    category: 'Food',
    descriptions: ['Groceries', 'Lunch with team', 'Coffee', 'Dinner out', 'Bakery', 'Takeout pizza'],
    min: 4,
    max: 95,
  },
  {
    category: 'Transportation',
    descriptions: ['Gas', 'Metro card top-up', 'Taxi ride', 'Parking', 'Train ticket'],
    min: 3,
    max: 70,
  },
  {
    category: 'Entertainment',
    descriptions: ['Movie tickets', 'Streaming subscription', 'Concert', 'Board game', 'Bowling night'],
    min: 9,
    max: 120,
  },
  {
    category: 'Shopping',
    descriptions: ['New shoes', 'Books', 'Headphones', 'Clothing', 'Home decor'],
    min: 15,
    max: 180,
  },
  {
    category: 'Bills',
    descriptions: ['Electricity bill', 'Internet', 'Phone plan', 'Water bill', 'Gym membership'],
    min: 25,
    max: 160,
  },
  {
    category: 'Other',
    descriptions: ['Gift for friend', 'Haircut', 'Charity donation', 'Pharmacy'],
    min: 8,
    max: 80,
  },
];

/** Deterministic PRNG so the demo data has the same shape on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generates realistic demo expenses spread over the last six months. */
export function generateSampleExpenses(now: Date = new Date()): Expense[] {
  const random = mulberry32(42);
  const timestamp = now.toISOString();
  const expenses: Expense[] = [];

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(random() * 180);
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const template = TEMPLATES[Math.floor(random() * TEMPLATES.length)];
    const description = template.descriptions[Math.floor(random() * template.descriptions.length)];
    const amount = Math.round((template.min + random() * (template.max - template.min)) * 100) / 100;

    expenses.push({
      id: generateId(),
      date: toISODate(date),
      amount,
      category: template.category,
      description,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  return expenses;
}
