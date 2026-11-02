// Test fixtures shared by the domain tests.
import type { Person, PlanTask, TaskTemplate } from './types';

/** Wed, Oct 28 2026, 10:00 local time. */
export const NOW = new Date(2026, 9, 28, 10, 0, 0);
/** NOW as an ISO date. */
export const TODAY = '2026-10-28';

/** A new hire; override any field. */
export function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p-1',
    name: 'Test Person',
    role: 'new_hire',
    department: 'engineering',
    jobTitle: 'Engineer',
    managerId: 'p-mgr',
    startDate: '2026-11-02',
    email: 'test@brightpath.example',
    phone: '(555) 010-0000',
    ...overrides,
  };
}

let taskCounter = 0;
/** An open plan task due today; override any field. */
export function task(overrides: Partial<PlanTask> = {}): PlanTask {
  taskCounter += 1;
  return {
    id: `t-${taskCounter}`,
    personId: 'p-1',
    title: `Task ${taskCounter}`,
    description: '',
    phase: 'week_1',
    dueDate: TODAY,
    priority: 'required',
    estimatedMinutes: 15,
    status: 'todo',
    addedById: 'p-hr',
    addedAt: '2026-10-01T09:00:00.000Z',
    source: 'template',
    ...overrides,
  };
}

/** An active template; only the id is required. */
export function template(overrides: Partial<TaskTemplate> & Pick<TaskTemplate, 'id'>): TaskTemplate {
  return {
    title: overrides.id,
    description: '',
    department: 'all',
    phase: 'week_1',
    dueOffsetDays: 0,
    priority: 'required',
    estimatedMinutes: 15,
    ...overrides,
    archived: overrides.archived ?? false,
  };
}

/** A small template set covering company-wide and department tasks. */
export const TEMPLATES: TaskTemplate[] = [
  template({ id: 'all-offer', phase: 'before_day_1', dueOffsetDays: -7 }),
  template({ id: 'all-id', phase: 'week_1', dueOffsetDays: 0 }),
  template({ id: 'all-benefits', phase: 'first_30_days', dueOffsetDays: 30 }),
  template({ id: 'eng-access', department: 'engineering', phase: 'before_day_1', dueOffsetDays: -3 }),
  template({ id: 'eng-pr', department: 'engineering', phase: 'first_30_days', dueOffsetDays: 14 }),
  template({ id: 'sales-crm', department: 'sales', dueOffsetDays: 1 }),
  template({ id: 'ops-ticket', department: 'operations', dueOffsetDays: 1 }),
  template({ id: 'ops-shadow', department: 'operations', dueOffsetDays: 4, priority: 'recommended' }),
];
