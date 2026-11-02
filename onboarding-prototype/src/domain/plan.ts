// Plan rules: generating a plan from templates, then adding, editing, removing and completing its tasks. All functions are pure.
import { addDays, toISODate } from './dates';
import { PHASES } from './labels';
import { derivePhaseForTask } from './phase';
import type { Department, ISODate, Person, PlanTask, TaskTemplate } from './types';
import type { CustomTaskDraft } from './validation';

/** Used when a custom task leaves the estimate blank. */
export const DEFAULT_ESTIMATED_MINUTES = 15;

/** Active (not archived) templates that apply to a department: company-wide plus its own. */
function templatesForDepartment(templates: TaskTemplate[], department: Department): TaskTemplate[] {
  return templates.filter((t) => !t.archived && (t.department === 'all' || t.department === department));
}

/** False when a department has no active templates of its own, so the UI can explain why a plan looks short. */
export function hasDepartmentTemplates(templates: TaskTemplate[], department: Department): boolean {
  return templates.some((t) => !t.archived && t.department === department);
}

function compareTemplates(a: TaskTemplate, b: TaskTemplate): number {
  return (
    a.dueOffsetDays - b.dueOffsetDays ||
    PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) ||
    a.title.localeCompare(b.title)
  );
}

/**
 * Builds a plan from active company-wide templates plus the person's department templates.
 * dueDate = startDate + dueOffsetDays. Returns [] when the person has no start date.
 * The plan is a snapshot: later template edits never change it.
 */
export function generatePlan(
  person: Person,
  templates: TaskTemplate[],
  addedById: string,
  now: Date,
): PlanTask[] {
  const startDate = person.startDate;
  if (!startDate) return [];
  const addedAt = now.toISOString();
  return templatesForDepartment(templates, person.department)
    .sort(compareTemplates)
    .map((t) => ({
      id: `${person.id}--${t.id}`,
      personId: person.id,
      templateId: t.id,
      title: t.title,
      description: t.description,
      phase: t.phase,
      dueDate: addDays(startDate, t.dueOffsetDays),
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      ...(t.docId ? { docId: t.docId } : {}),
      status: 'todo' as const,
      addedById,
      addedAt,
      source: 'template' as const,
    }));
}

/** The fields of a task that can be edited. */
export type TaskChanges = Partial<
  Pick<PlanTask, 'title' | 'description' | 'dueDate' | 'priority' | 'estimatedMinutes' | 'docId'>
>;

/** Parses minutes from a form value; empty or invalid means the default estimate. */
export function parseMinutes(value: string): number {
  const minutes = Number.parseInt(value, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_ESTIMATED_MINUTES;
}

/** Task fields from a validated form draft. An empty docId means "no doc". */
export function taskChangesFromDraft(draft: CustomTaskDraft): Required<Omit<TaskChanges, 'docId'>> & { docId?: string } {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    dueDate: draft.dueDate,
    priority: draft.priority,
    estimatedMinutes: parseMinutes(draft.estimatedMinutes),
    docId: draft.docId || undefined,
  };
}

/** Form values for editing an existing task. */
export function draftFromTask(task: PlanTask): CustomTaskDraft {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    estimatedMinutes: String(task.estimatedMinutes),
    docId: task.docId ?? '',
  };
}

/** Turns a validated custom-task draft into a PlanTask, with phase derived from its due date. */
export function createCustomTask(
  draft: CustomTaskDraft,
  ids: { id: string; personId: string; addedById: string },
  person: Pick<Person, 'startDate'>,
  now: Date,
): PlanTask {
  const { docId, ...fields } = taskChangesFromDraft(draft);
  return {
    id: ids.id,
    personId: ids.personId,
    ...fields,
    phase: derivePhaseForTask(person, draft.dueDate),
    ...(docId ? { docId } : {}),
    status: 'todo',
    addedById: ids.addedById,
    addedAt: now.toISOString(),
    source: 'custom',
  };
}

/** Why a task could not be removed. */
export type RemoveRefusal = 'not_found' | 'completed' | 'last_task';
/** Outcome of removeTask: the new list, or the reason it was refused. */
export type RemoveResult = { ok: true; tasks: PlanTask[] } | { ok: false; reason: RemoveRefusal };

/**
 * Removes an incomplete task. Completed tasks are history and can't be removed,
 * and a person's last remaining task can't be removed.
 */
export function removeTask(tasks: PlanTask[], taskId: string): RemoveResult {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: 'not_found' };
  if (task.status === 'done') return { ok: false, reason: 'completed' };
  const planSize = tasks.filter((t) => t.personId === task.personId).length;
  if (planSize <= 1) return { ok: false, reason: 'last_task' };
  return { ok: true, tasks: tasks.filter((t) => t.id !== taskId) };
}

/** User-facing text for each removal refusal. */
export const REMOVE_REFUSAL_TEXT: Record<RemoveRefusal, string> = {
  not_found: 'This task no longer exists.',
  completed: 'Completed tasks stay in the record and can’t be removed.',
  last_task: 'A plan needs at least one task.',
};

/** Returned by editTask when the saved due date is already past. */
export const OVERDUE_AFTER_EDIT_WARNING = 'This task will show as overdue.';

/** Why a task could not be edited. */
export type EditRefusal = 'not_found' | 'completed';
/** Outcome of editTask: the new list and any warnings, or the reason it was refused. */
export type EditResult = { ok: true; tasks: PlanTask[]; warnings: string[] } | { ok: false; reason: EditRefusal };

/** User-facing text for each edit refusal. */
export const EDIT_REFUSAL_TEXT: Record<EditRefusal, string> = {
  not_found: 'This task no longer exists.',
  completed: 'Completed tasks are read-only, so the record stays intact.',
};

/**
 * Edits an incomplete task. Completed tasks are read-only. The phase is re-derived from the
 * (possibly new) due date, and editedAt/editedById are set. Warns when the due date is in the past.
 */
export function editTask(
  tasks: PlanTask[],
  taskId: string,
  changes: TaskChanges,
  editorId: string,
  person: Pick<Person, 'startDate'>,
  now: Date,
): EditResult {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: 'not_found' };
  if (task.status === 'done') return { ok: false, reason: 'completed' };

  const edited: PlanTask = { ...task, editedAt: now.toISOString(), editedById: editorId };
  for (const [key, value] of Object.entries(changes) as [keyof TaskChanges, unknown][]) {
    if (key === 'docId') continue;
    if (value !== undefined) Object.assign(edited, { [key]: value });
  }
  if ('docId' in changes) {
    if (changes.docId) edited.docId = changes.docId;
    else delete edited.docId;
  }
  edited.phase = derivePhaseForTask(person, edited.dueDate);

  const warnings = edited.dueDate < toISODate(now) ? [OVERDUE_AFTER_EDIT_WARNING] : [];
  return { ok: true, tasks: tasks.map((t) => (t.id === taskId ? edited : t)), warnings };
}

/** Idempotent: completing an already-done task keeps its original completedAt. */
export function completeTask(tasks: PlanTask[], taskId: string, now: Date): PlanTask[] {
  return tasks.map((t) =>
    t.id === taskId && t.status !== 'done' ? { ...t, status: 'done', completedAt: now.toISOString() } : t,
  );
}

/** Idempotent: undoing an incomplete task changes nothing. */
export function undoComplete(tasks: PlanTask[], taskId: string): PlanTask[] {
  return tasks.map((t) => {
    if (t.id !== taskId || t.status !== 'done') return t;
    const { completedAt: _completedAt, ...rest } = t;
    return { ...rest, status: 'todo' };
  });
}

/** Default due date for a new custom task: a week from today. */
export function defaultCustomTaskDueDate(now: Date): ISODate {
  return addDays(toISODate(now), 7);
}
