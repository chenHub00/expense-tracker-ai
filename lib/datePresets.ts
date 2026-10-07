import { toISODate } from './utils';

/** A named date range; `range` is evaluated on use so "today" is always current. */
export type DatePreset = { label: string; range: () => { from: string; to: string } };

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
    },
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: toISODate(now) };
    },
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to: toISODate(now) };
    },
  },
];
