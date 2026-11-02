// Read-side rules: overdue, focus list, grouping, progress and the people overview. Pure, with `now` always passed in.
import { addDays, daysBetween, plural, toISODate } from './dates';
import { PHASES } from './labels';
import { derivePhaseFromOffset, phaseStartOffset } from './phase';
import { canView } from './permissions';
import type { CurrentPhase, ISODate, Person, Phase, PlanTask, Progress, ProgressStatus } from './types';

/** How many tasks a new hire sees up front. */
export const FOCUS_LIMIT = 3;
const NEW_ASSIGNMENT_WINDOW_DAYS = 7;
/** A task opens this many days before it's due, even if its phase hasn't started. */
const OPEN_BEFORE_DUE_DAYS = 7;

/** Days from the person's start date to today (negative before they start), or null. */
export function getDayOffset(person: Person, now: Date): number | null {
  return person.startDate ? daysBetween(person.startDate, toISODate(now)) : null;
}

/** Same boundaries as derivePhaseFromOffset; after day offset 30 the person is post_onboarding. */
export function getCurrentPhase(person: Person, now: Date): CurrentPhase {
  const offset = getDayOffset(person, now);
  if (offset === null) return 'post_onboarding';
  const phase = derivePhaseFromOffset(offset);
  return phase === 'ongoing' ? 'post_onboarding' : phase;
}

/** Not done and past the end of its due date in local time. "Due today" is not overdue. */
export function isOverdue(task: PlanTask, now: Date): boolean {
  return task.status !== 'done' && task.dueDate < toISODate(now);
}

/** Tasks that are not done and past their due date. */
export function getOverdueTasks(tasks: PlanTask[], now: Date): PlanTask[] {
  return tasks.filter((t) => isOverdue(t, now)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Which accent a task row gets. */
export type TaskHighlight = 'overdue' | 'required' | 'none';

/** Overdue beats required; completed tasks lose all highlighting. */
export function getTaskHighlight(task: PlanTask, now: Date): TaskHighlight {
  if (task.status === 'done') return 'none';
  if (isOverdue(task, now)) return 'overdue';
  return task.priority === 'required' ? 'required' : 'none';
}

/** The date a phase's tasks open for the new hire; null means already open from the start. */
function phaseOpensOn(phase: Phase, startDate: ISODate): ISODate | null {
  const offset = phaseStartOffset(phase);
  return offset === null ? null : addDays(startDate, offset);
}

/**
 * Whether a task can be worked on yet. Without a start date everything is open.
 * Otherwise a task opens when its phase starts, or 7 days before it's due, whichever is first.
 */
function taskOpensOn(task: PlanTask, startDate: ISODate): ISODate | null {
  const phaseOpens = phaseOpensOn(task.phase, startDate);
  if (phaseOpens === null) return null;
  const windowOpens = addDays(task.dueDate, -OPEN_BEFORE_DUE_DAYS);
  return windowOpens < phaseOpens ? windowOpens : phaseOpens;
}

/** Whether a task may appear in the focus list: its phase has started, or it is due soon. */
function isTaskOpen(task: PlanTask, now: Date, startDate?: ISODate): boolean {
  if (!startDate) return true;
  const opens = taskOpensOn(task, startDate);
  return opens === null || opens <= toISODate(now);
}

function compareByDue(a: PlanTask, b: PlanTask): number {
  return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
}

function focusComparator(now: Date) {
  return (a: PlanTask, b: PlanTask): number => {
    const overdue = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
    if (overdue !== 0) return overdue;
    const priority = Number(b.priority === 'required') - Number(a.priority === 'required');
    if (priority !== 0) return priority;
    return compareByDue(a, b);
  };
}

/** Options for getFocusList. */
export interface FocusOptions {
  /** When given, tasks whose phase hasn't opened yet are left out of the focus list. */
  startDate?: ISODate;
}

/**
 * Emily's list: incomplete tasks, overdue first, then required before recommended,
 * then earliest due date. At most `limit` tasks.
 */
export function getFocusList(
  tasks: PlanTask[],
  now: Date,
  limit = FOCUS_LIMIT,
  options: FocusOptions = {},
): PlanTask[] {
  return tasks
    .filter((t) => t.status !== 'done' && isTaskOpen(t, now, options.startDate))
    .sort(focusComparator(now))
    .slice(0, limit);
}

/** Tasks that share a phase. */
export interface PhaseGroup {
  phase: Phase;
  tasks: PlanTask[];
}

/** Non-empty phase groups in phase order, each sorted by due date. */
export function groupByPhase(tasks: PlanTask[]): PhaseGroup[] {
  return PHASES.map((phase) => ({
    phase,
    tasks: tasks.filter((t) => t.phase === phase).sort(compareByDue),
  })).filter((g) => g.tasks.length > 0);
}

/** Options for getUpcoming. */
export interface UpcomingOptions extends FocusOptions {
  /** Ids currently shown in the focus list. Defaults to getFocusList's result. */
  focusIds?: string[];
}

/** Remaining incomplete tasks not in the focus list, grouped by phase. */
export function getUpcoming(tasks: PlanTask[], now: Date, options: UpcomingOptions = {}): PhaseGroup[] {
  const focusIds = new Set(
    options.focusIds ?? getFocusList(tasks, now, FOCUS_LIMIT, options).map((t) => t.id),
  );
  return groupByPhase(tasks.filter((t) => t.status !== 'done' && !focusIds.has(t.id)));
}

/** Completed tasks, most recently completed first. */
export function getDone(tasks: PlanTask[]): PlanTask[] {
  return tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

/** The earliest date a not-yet-open incomplete task becomes open, or null. */
export function getNextOpenDate(tasks: PlanTask[], now: Date, startDate?: ISODate): ISODate | null {
  if (!startDate) return null;
  const dates = tasks
    .filter((t) => t.status !== 'done' && !isTaskOpen(t, now, startDate))
    .map((t) => taskOpensOn(t, startDate))
    .filter((d): d is ISODate => d !== null)
    .sort();
  return dates[0] ?? null;
}

/** "behind" = any overdue; "complete" = every task done (so a new task reopens it). */
export function getProgress(tasks: PlanTask[], now: Date): Progress {
  const done = tasks.filter((t) => t.status === 'done').length;
  const required = tasks.filter((t) => t.priority === 'required');
  const requiredDone = required.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => isOverdue(t, now)).length;
  let status: ProgressStatus;
  if (tasks.length > 0 && done === tasks.length) status = 'complete';
  else if (overdueCount > 0) status = 'behind';
  else if (done === 0) status = 'not_started';
  else status = 'on_track';
  return { done, total: tasks.length, requiredDone, requiredTotal: required.length, overdueCount, status };
}

/**
 * A task someone else added after the person started, within the last week, still open.
 * Used for the "New task assigned" notice (e.g. a renewal assigned after onboarding).
 */
export function isNewAssignment(task: PlanTask, person: Person, now: Date): boolean {
  if (task.status === 'done' || task.source !== 'custom' || task.addedById === person.id) return false;
  const addedOn = toISODate(new Date(task.addedAt));
  if (person.startDate && addedOn < person.startDate) return false;
  return daysBetween(addedOn, toISODate(now)) <= NEW_ASSIGNMENT_WINDOW_DAYS;
}

/**
 * Where the person is in onboarding: "5 days until your first day", "Day 9", "Onboarding complete".
 * The default speaks to the new hire; `audience: 'staff'` uses third-person wording ("5 days until day 1").
 */
export function getTimelineLabel(
  person: Person,
  tasks: PlanTask[],
  now: Date,
  { audience = 'new_hire' }: { audience?: 'new_hire' | 'staff' } = {},
): string {
  const offset = getDayOffset(person, now);
  const staff = audience === 'staff';
  if (offset !== null && offset < 0) {
    if (offset === -1) return staff ? 'Day 1 is tomorrow' : 'Your first day is tomorrow';
    return staff ? `${-offset} days until day 1` : `${-offset} days until your first day`;
  }
  if (getProgress(tasks, now).status === 'complete') return 'Onboarding complete';
  if (offset === 0) return staff ? 'Day 1 is today' : 'Today is your first day';
  if (offset === null || getCurrentPhase(person, now) === 'post_onboarding') {
    const open = tasks.filter((t) => t.status !== 'done').length;
    return `${plural(open, 'new task')} assigned`;
  }
  return `Day ${offset + 1}`;
}

/** Indexes tasks by person id. */
export function groupTasksByPerson(tasks: PlanTask[]): Record<string, PlanTask[]> {
  const byPerson: Record<string, PlanTask[]> = {};
  for (const task of tasks) (byPerson[task.personId] ??= []).push(task);
  return byPerson;
}

/** A person HR or a manager should chase, with their overdue tasks. */
export interface FollowUp {
  person: Person;
  overdueTasks: PlanTask[];
  /** Days the oldest overdue task is past due. */
  maxDaysOverdue: number;
}

/** People the viewer can see who have overdue tasks, most overdue first. */
export function getFollowUps(
  people: Person[],
  tasksByPerson: Record<string, PlanTask[]>,
  viewer: Person,
  now: Date,
): FollowUp[] {
  const today = toISODate(now);
  return people
    .filter((p) => canView(viewer, p))
    .map((person) => {
      const overdueTasks = getOverdueTasks(tasksByPerson[person.id] ?? [], now);
      const oldest = overdueTasks[0];
      return { person, overdueTasks, maxDaysOverdue: oldest ? daysBetween(oldest.dueDate, today) : 0 };
    })
    .filter((f) => f.overdueTasks.length > 0)
    .sort(
      (a, b) =>
        b.overdueTasks.length - a.overdueTasks.length ||
        b.maxDaysOverdue - a.maxDaysOverdue ||
        a.person.name.localeCompare(b.person.name),
    );
}

/** One row of the people list. */
export interface PersonSummary {
  person: Person;
  progress: Progress;
}

const STATUS_SORT: Record<ProgressStatus, number> = { behind: 0, not_started: 1, on_track: 2, complete: 3 };

/** New hires the viewer can see, "behind" first, then not started, on track, complete. */
export function getPeopleOverview(
  people: Person[],
  tasksByPerson: Record<string, PlanTask[]>,
  viewer: Person,
  now: Date,
): PersonSummary[] {
  return people
    .filter((p) => p.role === 'new_hire' && canView(viewer, p))
    .map((person) => ({ person, progress: getProgress(tasksByPerson[person.id] ?? [], now) }))
    .sort(
      (a, b) =>
        STATUS_SORT[a.progress.status] - STATUS_SORT[b.progress.status] ||
        b.progress.overdueCount - a.progress.overdueCount ||
        (b.person.startDate ?? '').localeCompare(a.person.startDate ?? '') ||
        a.person.name.localeCompare(b.person.name),
    );
}
