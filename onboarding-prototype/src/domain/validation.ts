// Form validation. Pure functions returning field errors and non-blocking warnings.
import { isISODate, toISODate } from './dates';
import { TEMPLATE_OFFSET_MAX, TEMPLATE_OFFSET_MIN } from './phase';
import type { Department, PlanTask, Priority, TaskTemplate, ValidationResult } from './types';

/** Raw values from the Add new hire form. */
export interface NewHireDraft {
  name: string;
  jobTitle: string;
  department: Department | '';
  managerId: string;
  startDate: string;
  email: string;
  phone: string;
}

/** A field of the Add new hire form. */
export type NewHireField = keyof NewHireDraft;

/** Shown for a past start date. Allowed, but the plan starts with overdue tasks. */
export const PAST_START_WARNING = 'This start date is in the past. Tasks before today will show as overdue.';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Name, job title, department, manager and start date are required. A past start date is only a warning. */
export function validateNewHire(draft: NewHireDraft, now: Date): ValidationResult<NewHireField> {
  const errors: Partial<Record<NewHireField, string>> = {};
  const warnings: string[] = [];

  if (!draft.name.trim()) errors.name = 'Enter the new hire’s name.';
  if (!draft.jobTitle.trim()) errors.jobTitle = 'Enter a job title.';
  if (!draft.department) errors.department = 'Choose a department.';
  if (!draft.managerId) errors.managerId = 'Choose a manager.';
  if (!draft.startDate) errors.startDate = 'Choose a start date.';
  else if (!isISODate(draft.startDate)) errors.startDate = 'Enter a valid date.';
  else if (draft.startDate < toISODate(now)) warnings.push(PAST_START_WARNING);
  if (draft.email.trim() && !EMAIL_PATTERN.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}

/** Form values for adding or editing a plan task. Phase is derived from dueDate. */
export interface CustomTaskDraft {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  /** Form value; empty means the default estimate. */
  estimatedMinutes: string;
  /** Empty means no related doc. */
  docId: string;
}

/** A field of the task form. */
export type CustomTaskField = keyof CustomTaskDraft;

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Options for validateCustomTask. */
export interface CustomTaskValidationOptions {
  /** The task being edited, so it doesn't count as its own duplicate. */
  ignoreTaskId?: string;
  /** When given, a due date before today adds an "overdue" warning. */
  now?: Date;
}

/** Shown when a task is given a past due date. Allowed, but worth flagging. */
export const OVERDUE_DUE_DATE_WARNING = 'This due date is in the past. This task will show as overdue.';

/** Title and due date are required. A duplicate title or a past due date is a warning, not an error. */
export function validateCustomTask(
  draft: CustomTaskDraft,
  existingTasks: PlanTask[],
  options: CustomTaskValidationOptions = {},
): ValidationResult<CustomTaskField> {
  const errors: Partial<Record<CustomTaskField, string>> = {};
  const warnings: string[] = [];

  if (!draft.title.trim()) errors.title = 'Enter a task title.';
  if (!draft.dueDate) errors.dueDate = 'Choose a due date.';
  else if (!isISODate(draft.dueDate)) errors.dueDate = 'Enter a valid date.';

  const minutesError = validateMinutes(draft.estimatedMinutes);
  if (minutesError) errors.estimatedMinutes = minutesError;

  const title = normalizeTitle(draft.title);
  if (title && existingTasks.some((t) => t.id !== options.ignoreTaskId && normalizeTitle(t.title) === title)) {
    warnings.push(`This plan already has a task called “${draft.title.trim()}”.`);
  }
  if (options.now && !errors.dueDate && draft.dueDate < toISODate(options.now)) {
    warnings.push(OVERDUE_DUE_DATE_WARNING);
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}

function validateMinutes(value: string): string | undefined {
  const minutes = value.trim();
  if (minutes && !/^\d+$/.test(minutes)) return 'Enter whole minutes, like 30.';
  if (minutes && Number(minutes) <= 0) return 'Enter a number above 0.';
  return undefined;
}

/** Form values for creating or editing a template. Phase is derived from dueOffsetDays. */
export interface TemplateDraft {
  title: string;
  description: string;
  department: Department | 'all' | '';
  /** Form value; must be a whole number from -30 to 30. */
  dueOffsetDays: string;
  priority: Priority;
  /** Form value; empty means the default estimate. */
  estimatedMinutes: string;
  /** Empty means no related doc. */
  docId: string;
}

/** A field of the template form. */
export type TemplateField = keyof TemplateDraft;

/**
 * Title and department are required; the offset is a whole number within -30..30.
 * A title already used by an active template in the same department is a warning.
 */
export function validateTemplate(
  draft: TemplateDraft,
  existingTemplates: TaskTemplate[] = [],
  editingTemplateId?: string,
): ValidationResult<TemplateField> {
  const errors: Partial<Record<TemplateField, string>> = {};
  const warnings: string[] = [];

  if (!draft.title.trim()) errors.title = 'Enter a template title.';
  if (!draft.department) errors.department = 'Choose a department.';

  const offset = draft.dueOffsetDays.trim();
  if (!offset) errors.dueOffsetDays = 'Enter the number of days.';
  else if (!/^-?\d+$/.test(offset)) errors.dueOffsetDays = 'Enter a whole number of days.';
  else if (Number(offset) < TEMPLATE_OFFSET_MIN || Number(offset) > TEMPLATE_OFFSET_MAX) {
    errors.dueOffsetDays = `Use a number from ${TEMPLATE_OFFSET_MIN} to ${TEMPLATE_OFFSET_MAX}.`;
  }

  const minutesError = validateMinutes(draft.estimatedMinutes);
  if (minutesError) errors.estimatedMinutes = minutesError;

  const title = normalizeTitle(draft.title);
  if (
    title &&
    draft.department &&
    existingTemplates.some(
      (t) => !t.archived && t.id !== editingTemplateId && t.department === draft.department && normalizeTitle(t.title) === title,
    )
  ) {
    warnings.push(`This department already has a template called “${draft.title.trim()}”.`);
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
