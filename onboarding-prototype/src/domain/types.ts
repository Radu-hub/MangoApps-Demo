// The data model.
/** Company departments. Templates can also use "all" for company-wide tasks. */
export type Department = 'engineering' | 'sales' | 'operations' | 'people_ops';
/** What someone can do in the app. */
export type Role = 'hr_admin' | 'manager' | 'new_hire';
/** Derived from timing: < 0 days before_day_1, 0–6 week_1, 7–30 first_30_days, > 30 ongoing. */
export type Phase = 'before_day_1' | 'week_1' | 'first_30_days' | 'ongoing';
/** Where a person is in onboarding: a phase, or past the first 30 days. */
export type CurrentPhase = Exclude<Phase, 'ongoing'> | 'post_onboarding';
/** Required tasks rank above recommended ones in the focus list. */
export type Priority = 'required' | 'recommended';
/** Whether a plan task is finished. */
export type TaskStatus = 'todo' | 'done';

/** Calendar date "YYYY-MM-DD", always interpreted in local time. */
export type ISODate = string;
/** Full timestamp from Date.toISOString(). */
export type ISODateTime = string;

/** Anyone in the app: HR, a manager or a new hire. */
export interface Person {
  id: string;
  name: string;
  /** "new_hire" also covers employees who finished onboarding; they can still get tasks. */
  role: Role;
  department: Department;
  jobTitle: string;
  managerId?: string;
  startDate?: ISODate;
  email: string;
  phone: string;
}

/** A reusable task that new plans are generated from. */
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  department: Department | 'all';
  /** Always set from dueOffsetDays via derivePhaseFromOffset. */
  phase: Phase;
  /** Relative to the start date; negative = before. Limited to -30..30. */
  dueOffsetDays: number;
  priority: Priority;
  estimatedMinutes: number;
  docId?: string;
  /** Archived templates are skipped by generatePlan and can be restored. */
  archived: boolean;
  updatedAt?: ISODateTime;
  updatedById?: string;
}

/** One task in a person's plan. A snapshot: later template edits don't change it. */
export interface PlanTask {
  id: string;
  personId: string;
  templateId?: string;
  title: string;
  description: string;
  phase: Phase;
  dueDate: ISODate;
  priority: Priority;
  estimatedMinutes: number;
  docId?: string;
  status: TaskStatus;
  completedAt?: ISODateTime;
  addedById: string;
  addedAt: ISODateTime;
  source: 'template' | 'custom';
  editedAt?: ISODateTime;
  editedById?: string;
}

/** A company document. Body is plain text: blank-line blocks, `## ` headings, `- ` bullets. */
export interface Doc {
  id: string;
  title: string;
  /** Plain text. Blocks are separated by blank lines; "## " starts a heading, "- " a bullet. */
  body: string;
}

/** Record of a reminder that was "sent". The prototype sends nothing for real. */
export interface ReminderLog {
  id: string;
  personId: string;
  sentById: string;
  sentAt: ISODateTime;
  taskIds: string[];
}

/** Everything the app stores. */
export interface AppState {
  version: 1;
  people: Person[];
  templates: TaskTemplate[];
  docs: Doc[];
  tasks: PlanTask[];
  reminders: ReminderLog[];
}

/** Overall state of a plan. */
export type ProgressStatus = 'not_started' | 'on_track' | 'behind' | 'complete';

/** Counts and status for a plan, from getProgress. */
export interface Progress {
  done: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  overdueCount: number;
  status: ProgressStatus;
}

/** Field errors block saving; warnings do not. */
export interface ValidationResult<F extends string> {
  ok: boolean;
  errors: Partial<Record<F, string>>;
  warnings: string[];
}
