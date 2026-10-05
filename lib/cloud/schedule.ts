import type { DestinationId } from './destinations';
import type { ExportFormat, TemplateId } from './reports';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Schedule {
  id: string;
  templateId: TemplateId;
  destinationId: DestinationId;
  format: ExportFormat;
  frequency: Frequency;
  /** 0 = Sunday … 6 = Saturday, used by weekly schedules. */
  weekday: number;
  /** 1–28, used by monthly schedules (capped so it exists in every month). */
  monthDay: number;
  /** HH:MM in local time. */
  time: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** First run strictly after `after` matching the schedule's rule. */
export function computeNextRun(s: Pick<Schedule, 'frequency' | 'weekday' | 'monthDay' | 'time'>, after: Date): Date {
  const [hours, minutes] = s.time.split(':').map(Number);
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes);

  if (s.frequency === 'daily') {
    if (candidate <= after) candidate.setDate(candidate.getDate() + 1);
  } else if (s.frequency === 'weekly') {
    let days = (s.weekday - candidate.getDay() + 7) % 7;
    if (days === 0 && candidate <= after) days = 7;
    candidate.setDate(candidate.getDate() + days);
  } else {
    candidate.setDate(s.monthDay);
    if (candidate <= after) candidate.setMonth(candidate.getMonth() + 1, s.monthDay);
  }
  return candidate;
}

export function describeSchedule(s: Pick<Schedule, 'frequency' | 'weekday' | 'monthDay' | 'time'>): string {
  const [h, m] = s.time.split(':').map(Number);
  const time = new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (s.frequency === 'daily') return `Every day at ${time}`;
  if (s.frequency === 'weekly') return `Every ${WEEKDAYS[s.weekday]} at ${time}`;
  const suffix = s.monthDay === 1 || s.monthDay === 21 ? 'st' : s.monthDay === 2 || s.monthDay === 22 ? 'nd' : s.monthDay === 3 || s.monthDay === 23 ? 'rd' : 'th';
  return `Monthly on the ${s.monthDay}${suffix} at ${time}`;
}
