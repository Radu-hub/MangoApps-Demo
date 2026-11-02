// User-facing message copy: welcome text, reminders and "edited by" notes.
import { formatRelativeDue, formatShortDate, plural, toISODate } from './dates';
import { firstName } from './labels';
import { getDayOffset, getOverdueTasks, getProgress, isNewAssignment } from './progress';
import type { ISODateTime, Person, PlanTask, ReminderLog, TaskTemplate } from './types';

/** The mock welcome text a new hire taps to open their plan. */
export function buildWelcomeText(person: Person, tasks: PlanTask[], focus: PlanTask[], now: Date): string {
  const name = firstName(person.name);
  const offset = getDayOffset(person, now);
  const overdue = getOverdueTasks(tasks, now).length;
  const assigned = tasks.filter((t) => isNewAssignment(t, person, now));

  if (assigned.length > 0 && assigned[0]) {
    return `BrightPath: Hi ${name}, you have a new task: ${assigned[0].title}. Tap to view.`;
  }
  if (getProgress(tasks, now).status === 'complete') {
    return `BrightPath: Hi ${name}, your onboarding is complete. Tap to view your plan.`;
  }
  if (offset !== null && offset < 0) {
    return `BrightPath: Welcome, ${name}! ${plural(focus.length, 'quick thing')} before your first day. Tap to start.`;
  }
  if (overdue > 0) {
    return `BrightPath: Hi ${name}, ${plural(overdue, 'task')} ${overdue === 1 ? 'needs' : 'need'} your attention. Tap to see what’s next.`;
  }
  return `BrightPath: Hi ${name}, here’s what to focus on next. Tap to open your plan.`;
}

/** The text and email a reminder would send. */
export interface ReminderPreview {
  phone: string;
  email: string;
  sms: string;
  subject: string;
  body: string;
}

/** What a reminder about overdue tasks would say. Only overdue tasks are included. */
export function buildReminderPreview(
  person: Person,
  tasks: PlanTask[],
  sender: Person,
  now: Date,
): ReminderPreview {
  const overdue = getOverdueTasks(tasks, now);
  const name = firstName(person.name);
  const count = plural(overdue.length, 'overdue onboarding task');
  const lines = overdue.map(
    (t) => `- ${t.title} (due ${formatShortDate(t.dueDate)}, ${formatRelativeDue(t.dueDate, now).toLowerCase()})`,
  );
  return {
    phone: person.phone,
    email: person.email,
    sms: `BrightPath: Hi ${name}, you have ${count}: ${overdue.map((t) => t.title).join('; ')}. Tap to open your plan.`,
    subject: `Reminder: ${count}`,
    body: [
      `Hi ${name},`,
      `A quick reminder that ${overdue.length === 1 ? 'this onboarding task is' : 'these onboarding tasks are'} past due:`,
      lines.join('\n'),
      'Open your onboarding plan to finish them. If something is blocking you, reply to this email and we’ll sort it out.',
      `Thanks,\n${sender.name}\n${sender.jobTitle}`,
    ].join('\n\n'),
  };
}

/** Logs a reminder for the person's overdue tasks, or returns null when nothing is overdue. */
export function createReminderLog(
  id: string,
  person: Person,
  tasks: PlanTask[],
  sender: Person,
  now: Date,
): ReminderLog | null {
  const overdue = getOverdueTasks(tasks, now);
  if (overdue.length === 0) return null;
  return { id, personId: person.id, sentById: sender.id, sentAt: now.toISOString(), taskIds: overdue.map((t) => t.id) };
}

/** A person's reminders, newest first. */
export function getReminderHistory(reminders: ReminderLog[], personId: string): ReminderLog[] {
  return reminders.filter((r) => r.personId === personId).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/**
 * Warning for a plan that would start out "behind": some due dates (startDate + offset)
 * are already past. The rule stays as specified; HR is just told before confirming.
 */
export function getBehindAtStartWarning(tasks: PlanTask[], now: Date): string | null {
  const overdue = getOverdueTasks(tasks, now);
  if (overdue.length === 0) return null;
  const names = overdue.map((t) => `“${t.title}”`).join(', ');
  return `This plan will start out Behind: ${plural(overdue.length, 'task is', 'tasks are')} already past due (${names}). Remove ${overdue.length === 1 ? 'it' : 'them'}, or let ${overdue.length === 1 ? 'it' : 'them'} show as overdue.`;
}

function changedByText(verb: string, at: ISODateTime | undefined, byId: string | undefined, people: Person[]): string | null {
  if (!at) return null;
  const name = people.find((p) => p.id === byId)?.name ?? 'someone';
  return `${verb} by ${name} · ${formatShortDate(toISODate(new Date(at)))}`;
}

/** "Edited by David Okafor · Wed, Oct 28", or null for a task that was never edited. */
export function getEditedText(task: Pick<PlanTask, 'editedAt' | 'editedById'>, people: Person[]): string | null {
  return changedByText('Edited', task.editedAt, task.editedById, people);
}

/** "Updated by David Okafor · Wed, Oct 14", or null for a template never changed. */
export function getUpdatedText(template: Pick<TaskTemplate, 'updatedAt' | 'updatedById'>, people: Person[]): string | null {
  return changedByText('Updated', template.updatedAt, template.updatedById, people);
}

/** The notice above Save when editing a template. */
export function templateEditNotice(affectedPeople: number): string {
  const first = 'Changes apply to new hires from now on.';
  if (affectedPeople === 0) return first;
  const who = affectedPeople === 1 ? '1 person already has' : `${affectedPeople} people already have`;
  return `${first} ${who} this task and won’t be affected.`;
}
