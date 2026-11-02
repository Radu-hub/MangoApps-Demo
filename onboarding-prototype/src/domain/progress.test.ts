import { describe, expect, it } from 'vitest';
import { NOW, person, task } from './fixtures';
import {
  getCurrentPhase,
  getDone,
  getFocusList,
  getFollowUps,
  getNextOpenDate,
  getPeopleOverview,
  getProgress,
  getTaskHighlight,
  getTimelineLabel,
  getUpcoming,
  groupTasksByPerson,
  isNewAssignment,
  isOverdue,
} from './progress';

describe('isOverdue', () => {
  it('treats “due today” as not overdue, even late in the day', () => {
    const t = task({ dueDate: '2026-10-28' });
    expect(isOverdue(t, new Date(2026, 9, 28, 0, 0))).toBe(false);
    expect(isOverdue(t, new Date(2026, 9, 28, 23, 59, 59))).toBe(false);
  });

  it('becomes overdue right after the end of the due date', () => {
    const t = task({ dueDate: '2026-10-28' });
    expect(isOverdue(t, new Date(2026, 9, 29, 0, 0, 1))).toBe(true);
  });

  it('never marks a completed task overdue', () => {
    expect(isOverdue(task({ dueDate: '2026-10-01', status: 'done' }), NOW)).toBe(false);
  });
});

describe('getCurrentPhase', () => {
  const at = (offset: number) => getCurrentPhase(person({ startDate: '2026-10-28' }), new Date(2026, 9, 28 + offset, 9));
  it('follows days relative to the start date', () => {
    expect(at(-5)).toBe('before_day_1');
    expect(at(-1)).toBe('before_day_1');
    expect(at(0)).toBe('week_1');
    expect(at(6)).toBe('week_1');
    expect(at(7)).toBe('first_30_days');
    expect(at(29)).toBe('first_30_days');
    expect(at(30)).toBe('first_30_days');
    expect(at(31)).toBe('post_onboarding');
  });

  it('treats a person without a start date as past onboarding', () => {
    expect(getCurrentPhase(person({ startDate: undefined }), NOW)).toBe('post_onboarding');
  });
});

describe('getFocusList', () => {
  const overdueRecommended = task({ title: 'overdue rec', dueDate: '2026-10-20', priority: 'recommended' });
  const overdueRequired = task({ title: 'overdue req', dueDate: '2026-10-25' });
  const requiredLater = task({ title: 'req later', dueDate: '2026-11-10' });
  const requiredSoon = task({ title: 'req soon', dueDate: '2026-10-30' });
  const recommendedToday = task({ title: 'rec today', dueDate: '2026-10-28', priority: 'recommended' });
  const done = task({ title: 'done', dueDate: '2026-10-01', status: 'done' });
  const all = [recommendedToday, requiredLater, done, overdueRecommended, requiredSoon, overdueRequired];

  it('orders overdue first, then required before recommended, then earliest due', () => {
    expect(getFocusList(all, NOW, 10).map((t) => t.title)).toEqual([
      'overdue req',
      'overdue rec',
      'req soon',
      'req later',
      'rec today',
    ]);
  });

  it('limits to 3 by default and respects a custom limit', () => {
    expect(getFocusList(all, NOW)).toHaveLength(3);
    expect(getFocusList(all, NOW, 1).map((t) => t.title)).toEqual(['overdue req']);
  });

  it('excludes completed tasks', () => {
    expect(getFocusList(all, NOW, 10).some((t) => t.status === 'done')).toBe(false);
  });

  it('leaves out tasks whose phase has not opened and are more than 7 days out when a start date is given', () => {
    const startDate = '2026-11-02';
    const preStart = task({ title: 'pre', phase: 'before_day_1', dueDate: '2026-10-30' });
    const week1 = task({ title: 'w1', phase: 'week_1', dueDate: '2026-11-06' });
    const week1Soon = task({ title: 'w1 soon', phase: 'week_1', dueDate: '2026-11-04' });
    expect(getFocusList([preStart, week1], NOW, 3, { startDate }).map((t) => t.title)).toEqual(['pre']);
    // Within 7 days of its due date a task opens even before its phase starts.
    expect(getFocusList([preStart, week1Soon], NOW, 3, { startDate }).map((t) => t.title)).toEqual(['pre', 'w1 soon']);
    expect(getFocusList([preStart, week1], NOW).map((t) => t.title)).toEqual(['pre', 'w1']);
  });
});

describe('getUpcoming', () => {
  it('groups remaining incomplete tasks by phase, excluding the focus list', () => {
    const tasks = [
      task({ title: 'a', phase: 'before_day_1', dueDate: '2026-10-29' }),
      task({ title: 'b', phase: 'before_day_1', dueDate: '2026-10-30' }),
      task({ title: 'c', phase: 'week_1', dueDate: '2026-10-31' }),
      task({ title: 'd', phase: 'first_30_days', dueDate: '2026-11-20' }),
      task({ title: 'e', phase: 'week_1', dueDate: '2026-11-01' }),
      task({ title: 'done', phase: 'week_1', status: 'done' }),
    ];
    const groups = getUpcoming(tasks, NOW);
    expect(groups.map((g) => [g.phase, g.tasks.map((t) => t.title)])).toEqual([
      ['week_1', ['e']],
      ['first_30_days', ['d']],
    ]);
  });

  it('includes an Ongoing group for tasks past the first 30 days', () => {
    const tasks = [task({ title: 'a' }), task({ title: 'renewal', phase: 'ongoing', dueDate: '2026-12-20' })];
    const groups = getUpcoming(tasks, NOW, { focusIds: [tasks[0]!.id] });
    expect(groups.map((g) => g.phase)).toEqual(['ongoing']);
  });

  it('uses explicit focus ids when given', () => {
    const a = task({ title: 'a' });
    const b = task({ title: 'b' });
    expect(getUpcoming([a, b], NOW, { focusIds: [a.id] })[0]?.tasks).toEqual([b]);
  });
});

describe('getNextOpenDate', () => {
  it('returns when the next phase opens', () => {
    const startDate = '2026-11-02';
    const week1 = task({ phase: 'week_1', dueDate: '2026-11-12' });
    const later = task({ phase: 'first_30_days', dueDate: '2026-11-20' });
    expect(getNextOpenDate([week1, later], NOW, startDate)).toBe('2026-11-02');
    expect(getNextOpenDate([later], NOW, startDate)).toBe('2026-11-09');
    expect(getNextOpenDate([later], NOW)).toBeNull();
  });
});

describe('getProgress', () => {
  it('reports not started, on track, behind and complete', () => {
    expect(getProgress([task({ dueDate: '2026-11-01' })], NOW).status).toBe('not_started');
    expect(getProgress([task({ status: 'done' }), task({ dueDate: '2026-11-01' })], NOW).status).toBe('on_track');
    expect(getProgress([task({ status: 'done' }), task({ dueDate: '2026-10-27' })], NOW).status).toBe('behind');
    expect(getProgress([task({ status: 'done' })], NOW).status).toBe('complete');
    expect(getProgress([], NOW).status).toBe('not_started');
  });

  it('counts done, required and overdue tasks', () => {
    const tasks = [
      task({ status: 'done' }),
      task({ priority: 'recommended', status: 'done' }),
      task({ dueDate: '2026-10-20' }),
      task({ priority: 'recommended', dueDate: '2026-11-20' }),
    ];
    expect(getProgress(tasks, NOW)).toEqual({
      done: 2,
      total: 4,
      requiredDone: 1,
      requiredTotal: 2,
      overdueCount: 1,
      status: 'behind',
    });
  });
});

describe('getTaskHighlight', () => {
  it('highlights overdue over required, and nothing once done', () => {
    expect(getTaskHighlight(task({ dueDate: '2026-10-01' }), NOW)).toBe('overdue');
    expect(getTaskHighlight(task({ dueDate: '2026-11-01' }), NOW)).toBe('required');
    expect(getTaskHighlight(task({ dueDate: '2026-11-01', priority: 'recommended' }), NOW)).toBe('none');
    expect(getTaskHighlight(task({ dueDate: '2026-10-01', status: 'done' }), NOW)).toBe('none');
  });
});

describe('manager scoping', () => {
  const hr = person({ id: 'hr', role: 'hr_admin', managerId: undefined, startDate: undefined });
  const david = person({ id: 'david', role: 'manager', managerId: undefined, startDate: undefined });
  const lena = person({ id: 'lena', role: 'manager', managerId: undefined, startDate: undefined });
  const emily = person({ id: 'emily', name: 'Emily', managerId: 'david' });
  const marcus = person({ id: 'marcus', name: 'Marcus', managerId: 'lena' });
  const priya = person({ id: 'priya', name: 'Priya', managerId: 'lena' });
  const people = [hr, david, lena, emily, marcus, priya];
  const byPerson = groupTasksByPerson([
    task({ personId: 'emily', dueDate: '2026-10-27' }),
    task({ personId: 'marcus', dueDate: '2026-10-26' }),
    task({ personId: 'marcus', dueDate: '2026-10-20' }),
    task({ personId: 'priya', dueDate: '2026-10-10' }),
  ]);

  it('shows a manager only their own reports’ follow-ups, most overdue first', () => {
    expect(getFollowUps(people, byPerson, lena, NOW).map((f) => f.person.id)).toEqual(['marcus', 'priya']);
    expect(getFollowUps(people, byPerson, david, NOW).map((f) => f.person.id)).toEqual(['emily']);
  });

  it('shows HR every follow-up, sorted by overdue count then days overdue', () => {
    const followUps = getFollowUps(people, byPerson, hr, NOW);
    expect(followUps.map((f) => f.person.id)).toEqual(['marcus', 'priya', 'emily']);
    expect(followUps[0]?.maxDaysOverdue).toBe(8);
  });

  it('lists only visible new hires in the people overview, behind first', () => {
    const extra = { ...byPerson, emily: [task({ personId: 'emily', status: 'done' })] };
    expect(getPeopleOverview(people, extra, david, NOW).map((s) => s.person.id)).toEqual(['emily']);
    expect(getPeopleOverview(people, extra, hr, NOW).map((s) => [s.person.id, s.progress.status])).toEqual([
      ['marcus', 'behind'],
      ['priya', 'behind'],
      ['emily', 'complete'],
    ]);
  });
});

describe('isNewAssignment and the timeline label', () => {
  const tom = person({ id: 'tom', startDate: '2025-08-28' });
  const old = task({ personId: 'tom', status: 'done' });

  it('flags a recent custom task added by someone else after the start date', () => {
    const renewal = task({ personId: 'tom', source: 'custom', addedAt: NOW.toISOString(), dueDate: '2026-11-06' });
    expect(isNewAssignment(renewal, tom, NOW)).toBe(true);
    expect(isNewAssignment({ ...renewal, status: 'done' }, tom, NOW)).toBe(false);
    expect(isNewAssignment({ ...renewal, addedAt: '2026-10-01T09:00:00.000Z' }, tom, NOW)).toBe(false);
    expect(isNewAssignment({ ...renewal, source: 'template' }, tom, NOW)).toBe(false);
  });

  it('does not flag custom tasks added while the plan was created before day 1', () => {
    const emily = person({ startDate: '2026-11-02' });
    expect(isNewAssignment(task({ source: 'custom', addedAt: NOW.toISOString() }), emily, NOW)).toBe(false);
  });

  it('describes where the person is in onboarding', () => {
    expect(getTimelineLabel(person({ startDate: '2026-11-02' }), [task()], NOW)).toBe('5 days until your first day');
    expect(getTimelineLabel(person({ startDate: '2026-10-29' }), [task()], NOW)).toBe('Your first day is tomorrow');
    expect(getTimelineLabel(person({ startDate: '2026-10-28' }), [task()], NOW)).toBe('Today is your first day');
    expect(getTimelineLabel(person({ startDate: '2026-10-20' }), [task()], NOW)).toBe('Day 9');
    expect(getTimelineLabel(tom, [old], NOW)).toBe('Onboarding complete');
    expect(getTimelineLabel(tom, [old, task({ personId: 'tom' })], NOW)).toBe('1 new task assigned');
  });

  it('uses third-person wording for staff before and on day 1', () => {
    const staff = { audience: 'staff' } as const;
    expect(getTimelineLabel(person({ startDate: '2026-11-02' }), [task()], NOW, staff)).toBe('5 days until day 1');
    expect(getTimelineLabel(person({ startDate: '2026-10-29' }), [task()], NOW, staff)).toBe('Day 1 is tomorrow');
    expect(getTimelineLabel(person({ startDate: '2026-10-28' }), [task()], NOW, staff)).toBe('Day 1 is today');
    expect(getTimelineLabel(person({ startDate: '2026-10-20' }), [task()], NOW, staff)).toBe('Day 9');
    expect(getTimelineLabel(tom, [old], NOW, staff)).toBe('Onboarding complete');
  });
});

describe('list ordering', () => {
  const hr = person({ id: 'p-hr', role: 'hr_admin' });

  it('lists completed tasks most recent first', () => {
    const older = task({ id: 'older', status: 'done', completedAt: '2026-10-01T10:00:00.000Z' });
    const newer = task({ id: 'newer', status: 'done', completedAt: '2026-10-20T10:00:00.000Z' });
    expect(getDone([older, task({ id: 'open' }), newer]).map((t) => t.id)).toEqual(['newer', 'older']);
  });

  it('sorts follow-ups by overdue count, then lateness, then name', () => {
    const people = [person({ id: 'b', name: 'Bea' }), person({ id: 'a', name: 'Al' }), person({ id: 'c', name: 'Cy' }), person({ id: 'd', name: 'Di' })];
    const late = (personId: string, dueDate: string, id: string) => task({ id, personId, dueDate });
    const tasks = {
      a: [late('a', '2026-10-25', 'a1')],
      b: [late('b', '2026-10-25', 'b1')],
      c: [late('c', '2026-10-20', 'c1')],
      d: [late('d', '2026-10-27', 'd1'), late('d', '2026-10-27', 'd2')],
    };
    expect(getFollowUps(people, tasks, hr, NOW).map((f) => f.person.name)).toEqual(['Di', 'Cy', 'Al', 'Bea']);
  });

  it('puts people who are behind first in the overview and hides staff', () => {
    const people = [hr, person({ id: 'ok', name: 'On Track' }), person({ id: 'late', name: 'Late' })];
    const tasks = { ok: [task({ id: 'o', personId: 'ok' })], late: [task({ id: 'l', personId: 'late', dueDate: '2026-10-20' })] };
    expect(getPeopleOverview(people, tasks, hr, NOW).map((p) => p.person.name)).toEqual(['Late', 'On Track']);
  });
});
