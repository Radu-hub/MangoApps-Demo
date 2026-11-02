import type { Announcement, Receipt } from "./types";

/** Matches the "YYYY-MM-DD" format used for due dates. */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses "YYYY-MM-DD" as local midnight. Returns undefined for malformed or impossible dates. */
export function parseLocalDate(value: string): Date | undefined {
  const match = DATE_RE.exec(value);
  if (!match) return undefined;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  return date;
}

/** The last millisecond of the given local calendar date. */
export function endOfLocalDay(value: string): Date | undefined {
  const date = parseLocalDate(value);
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
}

/** A Date as a local "YYYY-MM-DD" string, the inverse of parseLocalDate. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Fri, Oct 30": the one date format used across the app. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "2026-10-28" → "Wed, Oct 28". Malformed values are returned unchanged. */
export function formatShortDate(value: string): string {
  const date = parseLocalDate(value);
  return date ? formatDay(date) : value;
}

/**
 * Plain-language timing for a due date: "Due Fri, Oct 30", "Due today", "Overdue by 2 days".
 * Overdue starts the day after the due date, matching isOverdue.
 */
export function describeDueDate(value: string, now: Date): string {
  const due = parseLocalDate(value);
  if (!due) return `Due ${value}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Round so a DST shift inside the range doesn't skew the day count.
  const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Due today";
  if (days > 0) return `Due ${formatShortDate(value)}`;
  return `Overdue by ${-days} ${days === -1 ? "day" : "days"}`;
}

/** A copy of `date` moved by whole calendar days, so DST shifts don't change the time of day. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** A required post past the end of its due date (local time) that this employee has not acknowledged. */
export function isOverdue(announcement: Announcement, receipt: Receipt | undefined, now: Date): boolean {
  if (announcement.priority !== "required" || !announcement.dueDate) return false;
  if (receipt?.acknowledgedAt) return false;
  const end = endOfLocalDay(announcement.dueDate);
  return end !== undefined && now.getTime() > end.getTime();
}
