// Local-date math and display formatting. Dates are YYYY-MM-DD strings read as local calendar days, so DST never shifts them.
import type { ISODate } from './types';

const MS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const shortDateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31). */
export function isISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = parts(value);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Local midnight of the given calendar date. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d);
}

/** Calendar date of `date` in local time. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds calendar days; a negative count goes backwards. */
export function addDays(iso: ISODate, days: number): ISODate {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). DST-safe. */
export function daysBetween(from: ISODate, to: ISODate): number {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

/** "1 task", "2 tasks". Pass `pluralForm` for irregular words. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "Fri, Oct 30" */
export function formatShortDate(iso: ISODate): string {
  return shortDateFormat.format(parseISODate(iso));
}

/** Plain-language timing for a due date: "Due today", "Due in 3 days", "Overdue by 2 days". */
export function formatRelativeDue(dueDate: ISODate, now: Date): string {
  const diff = daysBetween(toISODate(now), dueDate);
  if (diff < 0) return `Overdue by ${plural(-diff, 'day')}`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

/** "15 min", "2 hr", "1 hr 30 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/**
 * Template timing relative to the start date: "5 days before start", "Day 1 (start date)", "Day 3".
 * Day 1 is the start date, matching the new hire's "Day N" header.
 */
export function formatOffset(offsetDays: number): string {
  if (offsetDays < 0) return `${plural(-offsetDays, 'day')} before start`;
  if (offsetDays === 0) return 'Day 1 (start date)';
  return `Day ${offsetDays + 1}`;
}
