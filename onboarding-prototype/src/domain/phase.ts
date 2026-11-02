// Phase rules. A phase is always derived from timing, never chosen by hand, so it cannot contradict the due date.
import { daysBetween } from './dates';
import type { ISODate, Person, Phase } from './types';

/** Earliest allowed template due date, in days before the start date. */
export const TEMPLATE_OFFSET_MIN = -30;
/** Latest allowed template due date, in days after the start date. */
export const TEMPLATE_OFFSET_MAX = 30;

/** First day offset (relative to the start date) of each phase; null = open from the beginning. */
const PHASE_START_OFFSET: Record<Phase, number | null> = {
  before_day_1: null,
  week_1: 0,
  first_30_days: 7,
  ongoing: 31,
};

/** < 0 → before_day_1, 0–6 → week_1, 7–30 → first_30_days, > 30 → ongoing. */
export function derivePhaseFromOffset(offsetDays: number): Phase {
  if (offsetDays < 0) return 'before_day_1';
  if (offsetDays < 7) return 'week_1';
  if (offsetDays <= 30) return 'first_30_days';
  return 'ongoing';
}

/** Phase of a plan task from its due date relative to the person's start date. No start date → ongoing. */
export function derivePhaseForTask(person: Pick<Person, 'startDate'>, dueDate: ISODate): Phase {
  if (!person.startDate) return 'ongoing';
  return derivePhaseFromOffset(daysBetween(person.startDate, dueDate));
}

/** First day offset of a phase; null for "before day 1", which is open from the start. */
export function phaseStartOffset(phase: Phase): number | null {
  return PHASE_START_OFFSET[phase];
}
