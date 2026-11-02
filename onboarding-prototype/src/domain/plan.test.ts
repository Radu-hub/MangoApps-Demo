import { describe, expect, it } from 'vitest';
import { NOW, TEMPLATES, person, task } from './fixtures';
import { DEPARTMENTS } from './labels';
import {
  OVERDUE_AFTER_EDIT_WARNING,
  completeTask,
  createCustomTask,
  defaultCustomTaskDueDate,
  draftFromTask,
  taskChangesFromDraft,
  editTask,
  generatePlan, hasDepartmentTemplates, removeTask, undoComplete } from './plan';
import { getProgress, isOverdue } from './progress';

describe('generatePlan', () => {
  it('combines company-wide and the department’s templates for every department', () => {
    const companyWide = TEMPLATES.filter((t) => t.department === 'all').length;
    for (const department of DEPARTMENTS) {
      const plan = generatePlan(person({ department }), TEMPLATES, 'p-hr', NOW);
      const own = TEMPLATES.filter((t) => t.department === department).length;
      expect(plan).toHaveLength(companyWide + own);
      for (const t of plan) {
        const source = TEMPLATES.find((tpl) => tpl.id === t.templateId);
        expect(source?.department === 'all' || source?.department === department).toBe(true);
      }
    }
  });

  it('includes engineering tasks for an engineer and nothing from sales', () => {
    const ids = generatePlan(person(), TEMPLATES, 'p-hr', NOW).map((t) => t.templateId);
    expect(ids).toContain('eng-access');
    expect(ids).toContain('eng-pr');
    expect(ids).not.toContain('sales-crm');
  });

  it('gives a department with no specific templates the company-wide tasks only', () => {
    expect(hasDepartmentTemplates(TEMPLATES, 'people_ops')).toBe(false);
    const plan = generatePlan(person({ department: 'people_ops' }), TEMPLATES, 'p-hr', NOW);
    expect(plan.map((t) => t.templateId).sort()).toEqual(['all-benefits', 'all-id', 'all-offer']);
  });

  it('calculates due dates before and after the start date', () => {
    const plan = generatePlan(person({ startDate: '2026-11-02' }), TEMPLATES, 'p-hr', NOW);
    const due = Object.fromEntries(plan.map((t) => [t.templateId, t.dueDate]));
    expect(due['all-offer']).toBe('2026-10-26'); // -7
    expect(due['eng-access']).toBe('2026-10-30'); // -3, across the month boundary
    expect(due['all-id']).toBe('2026-11-02'); // start date
    expect(due['eng-pr']).toBe('2026-11-16'); // +14
    expect(due['all-benefits']).toBe('2026-12-02'); // +30
  });

  it('sorts by due date and marks every task as an incomplete template task', () => {
    const plan = generatePlan(person(), TEMPLATES, 'p-hr', NOW);
    expect(plan.map((t) => t.dueDate)).toEqual([...plan.map((t) => t.dueDate)].sort());
    for (const t of plan) {
      expect(t).toMatchObject({ status: 'todo', source: 'template', addedById: 'p-hr', personId: 'p-1' });
      expect(t.addedAt).toBe(NOW.toISOString());
    }
  });

  it('returns no tasks without a start date', () => {
    expect(generatePlan(person({ startDate: undefined }), TEMPLATES, 'p-hr', NOW)).toEqual([]);
  });
});

describe('removeTask', () => {
  it('removes an incomplete task', () => {
    const a = task();
    const b = task();
    const result = removeTask([a, b], a.id);
    expect(result).toEqual({ ok: true, tasks: [b] });
  });

  it('refuses to remove a completed task', () => {
    const a = task({ status: 'done', completedAt: NOW.toISOString() });
    expect(removeTask([a, task()], a.id)).toEqual({ ok: false, reason: 'completed' });
  });

  it('refuses to remove the last remaining task in a person’s plan', () => {
    const mine = task({ personId: 'p-1' });
    const someoneElses = task({ personId: 'p-2' });
    expect(removeTask([mine, someoneElses], mine.id)).toEqual({ ok: false, reason: 'last_task' });
  });

  it('reports a missing task', () => {
    expect(removeTask([task()], 'nope')).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('completeTask / undoComplete', () => {
  it('keeps the first completedAt when completing twice', () => {
    const a = task();
    const first = completeTask([a], a.id, NOW);
    const second = completeTask(first, a.id, new Date(2026, 9, 29));
    expect(second[0]).toMatchObject({ status: 'done', completedAt: NOW.toISOString() });
  });

  it('undo clears completion and is safe to repeat', () => {
    const a = task();
    const undone = undoComplete(completeTask([a], a.id, NOW), a.id);
    expect(undone[0]?.status).toBe('todo');
    expect(undone[0]?.completedAt).toBeUndefined();
    expect(undoComplete(undone, a.id)).toEqual(undone);
  });

  it('leaves other tasks untouched', () => {
    const a = task();
    const b = task();
    expect(completeTask([a, b], a.id, NOW)[1]).toBe(b);
  });
});

describe('reopening a completed onboarding', () => {
  it('goes from complete back to open when a new task is added', () => {
    const done = [task({ status: 'done' }), task({ status: 'done' })];
    expect(getProgress(done, NOW).status).toBe('complete');

    const renewal = createCustomTask(
      {
        title: 'Security training renewal',
        description: '',
        dueDate: '2026-11-06',
        priority: 'required',
        estimatedMinutes: '',
        docId: '',
      },
      { id: 'c-1', personId: 'p-1', addedById: 'p-hr' },
      person({ startDate: '2025-08-28' }),
      NOW,
    );
    expect(renewal.phase).toBe('ongoing');
    expect(renewal).toMatchObject({ source: 'custom', status: 'todo', estimatedMinutes: 15 });
    expect(renewal.docId).toBeUndefined();

    const progress = getProgress([...done, renewal], NOW);
    expect(progress.status).toBe('on_track');
    expect(progress).toMatchObject({ done: 2, total: 3 });
  });
});

describe('defaultCustomTaskDueDate', () => {
  it('is a week from today', () => {
    expect(defaultCustomTaskDueDate(NOW)).toBe('2026-11-04');
  });
});

describe('editTask', () => {
  const hire = person({ startDate: '2026-10-20' });
  const LATER = new Date(2026, 9, 28, 15, 0);

  it('refuses to edit a completed task', () => {
    const done = task({ status: 'done', completedAt: NOW.toISOString() });
    expect(editTask([done], done.id, { title: 'x' }, 'p-hr', hire, NOW)).toEqual({ ok: false, reason: 'completed' });
    expect(editTask([done], 'nope', { title: 'x' }, 'p-hr', hire, NOW)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('applies changes, re-derives the phase and stamps the editor', () => {
    const t = task({ phase: 'week_1', dueDate: '2026-10-22' });
    const result = editTask([t], t.id, { title: 'Renamed', dueDate: '2026-11-05' }, 'p-mgr', hire, LATER);
    if (!result.ok) throw new Error('expected ok');
    expect(result.tasks[0]).toMatchObject({
      title: 'Renamed',
      dueDate: '2026-11-05',
      phase: 'first_30_days',
      editedAt: LATER.toISOString(),
      editedById: 'p-mgr',
    });
    expect(result.warnings).toEqual([]);
    expect(t.title).not.toBe('Renamed');
  });

  it('clears overdue status when the due date moves out', () => {
    const late = task({ dueDate: '2026-10-23' });
    expect(isOverdue(late, NOW)).toBe(true);
    const result = editTask([late], late.id, { dueDate: '2026-10-30' }, 'p-hr', hire, NOW);
    if (!result.ok) throw new Error('expected ok');
    expect(isOverdue(result.tasks[0]!, NOW)).toBe(false);
    expect(getProgress(result.tasks, NOW).status).toBe('not_started');
  });

  it('creates overdue status and warns when the due date moves into the past', () => {
    const t = task({ dueDate: '2026-11-01' });
    const result = editTask([t], t.id, { dueDate: '2026-10-26' }, 'p-hr', hire, NOW);
    if (!result.ok) throw new Error('expected ok');
    expect(result.warnings).toEqual([OVERDUE_AFTER_EDIT_WARNING]);
    expect(isOverdue(result.tasks[0]!, NOW)).toBe(true);
    expect(getProgress(result.tasks, NOW).status).toBe('behind');
  });

  it('changes required counts when the priority changes', () => {
    const a = task({ priority: 'required', dueDate: '2026-11-01' });
    const b = task({ priority: 'required', dueDate: '2026-11-01', status: 'done' });
    expect(getProgress([a, b], NOW)).toMatchObject({ requiredDone: 1, requiredTotal: 2 });
    const result = editTask([a, b], a.id, { priority: 'recommended' }, 'p-hr', hire, NOW);
    if (!result.ok) throw new Error('expected ok');
    expect(getProgress(result.tasks, NOW)).toMatchObject({ requiredDone: 1, requiredTotal: 1, total: 2 });
  });

  it('can add and clear a related doc', () => {
    const t = task({ dueDate: '2026-11-01' });
    const withDoc = editTask([t], t.id, { docId: 'doc-1' }, 'p-hr', hire, NOW);
    if (!withDoc.ok) throw new Error('expected ok');
    expect(withDoc.tasks[0]?.docId).toBe('doc-1');
    const cleared = editTask(withDoc.tasks, t.id, { docId: undefined }, 'p-hr', hire, NOW);
    if (!cleared.ok) throw new Error('expected ok');
    expect(cleared.tasks[0]).not.toHaveProperty('docId');
  });
});

describe('draftFromTask', () => {
  it('turns a task into form values, and back without changes', () => {
    const original = task({ title: 'Read it', estimatedMinutes: 20, docId: 'doc-1' });
    const draft = draftFromTask(original);
    expect(draft).toMatchObject({ title: 'Read it', estimatedMinutes: '20', docId: 'doc-1' });
    expect(taskChangesFromDraft(draft)).toMatchObject({ title: 'Read it', estimatedMinutes: 20, docId: 'doc-1' });
  });

  it('uses an empty value when there is no doc', () => {
    expect(draftFromTask(task({ docId: undefined })).docId).toBe('');
  });
});
