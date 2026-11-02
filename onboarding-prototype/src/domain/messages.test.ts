import { describe, expect, it } from 'vitest';
import { NOW, person, task } from './fixtures';
import {
  buildReminderPreview,
  buildWelcomeText,
  createReminderLog,
  getBehindAtStartWarning,
  getEditedText,
  getReminderHistory,
  getUpdatedText,
  templateEditNotice,
} from './messages';

const marcus = person({ id: 'marcus', name: 'Marcus Johnson', startDate: '2026-10-20' });
const sarah = person({ id: 'hr', name: 'Sarah Chen', role: 'hr_admin', jobTitle: 'HR Manager' });

describe('reminders', () => {
  const overdue = task({ personId: 'marcus', title: 'Read the handbook', dueDate: '2026-10-23' });
  const upcoming = task({ personId: 'marcus', title: 'Product certification', dueDate: '2026-11-10' });

  it('only mentions overdue tasks', () => {
    const preview = buildReminderPreview(marcus, [overdue, upcoming], sarah, NOW);
    expect(preview.sms).toContain('Read the handbook');
    expect(preview.sms).not.toContain('Product certification');
    expect(preview.subject).toBe('Reminder: 1 overdue onboarding task');
    expect(preview.body).toContain('overdue by 5 days');
    expect(preview.body).toContain('Sarah Chen');
  });

  it('logs the overdue task ids, or nothing when none are overdue', () => {
    expect(createReminderLog('r-1', marcus, [overdue, upcoming], sarah, NOW)).toEqual({
      id: 'r-1',
      personId: 'marcus',
      sentById: 'hr',
      sentAt: NOW.toISOString(),
      taskIds: [overdue.id],
    });
    expect(createReminderLog('r-2', marcus, [upcoming], sarah, NOW)).toBeNull();
  });

  it('lists a person’s reminders newest first', () => {
    const logs = [
      { id: 'a', personId: 'marcus', sentById: 'hr', sentAt: '2026-10-20T10:00:00.000Z', taskIds: [] },
      { id: 'b', personId: 'priya', sentById: 'hr', sentAt: '2026-10-21T10:00:00.000Z', taskIds: [] },
      { id: 'c', personId: 'marcus', sentById: 'hr', sentAt: '2026-10-26T10:00:00.000Z', taskIds: [] },
    ];
    expect(getReminderHistory(logs, 'marcus').map((r) => r.id)).toEqual(['c', 'a']);
  });
});

describe('buildWelcomeText', () => {
  it('counts the focus tasks before the first day', () => {
    const emily = person({ name: 'Emily Park', startDate: '2026-11-02' });
    const tasks = [task(), task(), task()];
    expect(buildWelcomeText(emily, tasks, tasks, NOW)).toBe(
      'BrightPath: Welcome, Emily! 3 quick things before your first day. Tap to start.',
    );
  });

  it('still welcomes a pre-start hire with an overdue task', () => {
    const jordan = person({ name: 'Jordan Lee', startDate: '2026-11-02' });
    const tasks = [task({ dueDate: '2026-10-26' }), task()];
    expect(buildWelcomeText(jordan, tasks, tasks, NOW)).toContain('Welcome, Jordan! 2 quick things');
  });

  it('nudges a started hire about overdue tasks', () => {
    const tasks = [task({ dueDate: '2026-10-26' })];
    expect(buildWelcomeText(marcus, tasks, tasks, NOW)).toBe(
      'BrightPath: Hi Marcus, 1 task needs your attention. Tap to see what’s next.',
    );
  });
});

describe('getBehindAtStartWarning', () => {
  it('warns when a new plan already has past-due tasks', () => {
    const offer = task({ title: 'Sign your offer letter', dueDate: '2026-10-26' });
    const warning = getBehindAtStartWarning([offer, task({ dueDate: '2026-10-30' })], NOW);
    expect(warning).toContain('start out Behind');
    expect(warning).toContain('1 task is already past due');
    expect(warning).toContain('Sign your offer letter');
  });

  it('says nothing when every due date is today or later', () => {
    expect(getBehindAtStartWarning([task({ dueDate: '2026-10-28' })], NOW)).toBeNull();
  });
});

describe('edit and update notes', () => {
  const people = [sarah];
  it('names the editor and date, or returns null when never edited', () => {
    expect(getEditedText(task({ editedAt: NOW.toISOString(), editedById: 'hr' }), people)).toBe(
      'Edited by Sarah Chen · Wed, Oct 28',
    );
    expect(getEditedText(task(), people)).toBeNull();
    expect(getUpdatedText({ updatedAt: NOW.toISOString(), updatedById: 'hr' }, people)).toBe(
      'Updated by Sarah Chen · Wed, Oct 28',
    );
  });

  it('explains that template edits only affect new hires', () => {
    expect(templateEditNotice(0)).toBe('Changes apply to new hires from now on.');
    expect(templateEditNotice(1)).toBe(
      'Changes apply to new hires from now on. 1 person already has this task and won’t be affected.',
    );
    expect(templateEditNotice(3)).toContain('3 people already have this task');
  });
});

describe('buildWelcomeText: other situations', () => {
  const started = person({ name: 'Tom Becker', startDate: '2026-10-20' });

  it('announces a newly assigned task first', () => {
    const added = task({ title: 'Renew training', source: 'custom', addedById: 'p-hr', addedAt: NOW.toISOString() });
    expect(buildWelcomeText(started, [added], [added], NOW)).toBe('BrightPath: Hi Tom, you have a new task: Renew training. Tap to view.');
  });

  it('says so when onboarding is complete', () => {
    const done = task({ status: 'done', completedAt: NOW.toISOString() });
    expect(buildWelcomeText(started, [done], [], NOW)).toContain('your onboarding is complete');
  });

  it('falls back to a plain nudge when nothing is overdue', () => {
    const open = task();
    expect(buildWelcomeText(started, [open], [open], NOW)).toContain('here’s what to focus on next');
  });
});
