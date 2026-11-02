import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatDuration,
  formatOffset,
  formatRelativeDue,
  formatShortDate,
  isISODate,
  toISODate,
} from './dates';
import { NOW } from './fixtures';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30');
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
  });

  it('counts whole days across a daylight-saving change', () => {
    // US DST ends Nov 1 2026.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-11-02', '2026-10-31')).toBe(-2);
  });

  it('formats dates in local time', () => {
    expect(toISODate(NOW)).toBe('2026-10-28');
    expect(toISODate(new Date(2026, 9, 28, 23, 59))).toBe('2026-10-28');
    expect(formatShortDate('2026-10-30')).toBe('Fri, Oct 30');
  });

  it('validates ISO dates', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('10/28/2026')).toBe(false);
  });

  it('describes due dates in plain language', () => {
    expect(formatRelativeDue('2026-10-28', NOW)).toBe('Due today');
    expect(formatRelativeDue('2026-10-29', NOW)).toBe('Due tomorrow');
    expect(formatRelativeDue('2026-11-02', NOW)).toBe('Due in 5 days');
    expect(formatRelativeDue('2026-10-27', NOW)).toBe('Overdue by 1 day');
    expect(formatRelativeDue('2026-10-26', NOW)).toBe('Overdue by 2 days');
  });

  it('formats durations and template offsets', () => {
    expect(formatDuration(15)).toBe('15 min');
    expect(formatDuration(120)).toBe('2 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatOffset(-5)).toBe('5 days before start');
    expect(formatOffset(-1)).toBe('1 day before start');
    expect(formatOffset(0)).toBe('Day 1 (start date)');
    expect(formatOffset(2)).toBe('Day 3');
  });
});
