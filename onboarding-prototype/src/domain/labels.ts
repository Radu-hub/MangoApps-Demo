// Display labels and ordering for the domain enums.
import type { Department, Phase, Priority, ProgressStatus, Role } from './types';

/** Departments in display order. */
export const DEPARTMENTS: Department[] = ['engineering', 'sales', 'operations', 'people_ops'];
/** Phases in chronological order. */
export const PHASES: Phase[] = ['before_day_1', 'week_1', 'first_30_days', 'ongoing'];

/** Display names, including the "all" pseudo-department of company-wide templates. */
export const DEPARTMENT_LABELS: Record<Department | 'all', string> = {
  all: 'Company-wide',
  engineering: 'Engineering',
  sales: 'Sales',
  operations: 'Operations',
  people_ops: 'People Ops',
};

/** Display names for phases. */
export const PHASE_LABELS: Record<Phase, string> = {
  before_day_1: 'Before day 1',
  week_1: 'Week 1',
  first_30_days: 'First 30 days',
  ongoing: 'Ongoing',
};

/** Display names for roles. */
export const ROLE_LABELS: Record<Role, string> = {
  hr_admin: 'HR',
  manager: 'Manager',
  new_hire: 'New hire',
};

/** Display names for priorities. */
export const PRIORITY_LABELS: Record<Priority, string> = {
  required: 'Required',
  recommended: 'Recommended',
};

/** Display names for progress statuses. */
export const STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'Not started',
  on_track: 'On track',
  behind: 'Behind',
  complete: 'Complete',
};

/** First word of a full name, for friendly copy like "Hi Emily". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
