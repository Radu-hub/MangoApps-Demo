import { describe, expect, it } from 'vitest';
import { buildSeed, SEED_IDS } from '../data/seed';
import { NOW, person, task } from '../domain/fixtures';
import { emptyTemplateDraft } from '../domain/templates';
import { reducer } from './reducer';

describe('reducer', () => {
  const seed = buildSeed(NOW);
  const emilyTodo = seed.tasks.find((t) => t.personId === SEED_IDS.emily && t.status === 'todo')!;
  const emilyDone = seed.tasks.find((t) => t.personId === SEED_IDS.emily && t.status === 'done')!;

  it('completes and undoes a task', () => {
    const done = reducer(seed, { type: 'complete_task', taskId: emilyTodo.id, now: NOW });
    expect(done.tasks.find((t) => t.id === emilyTodo.id)?.status).toBe('done');
    const undone = reducer(done, { type: 'undo_complete', taskId: emilyTodo.id });
    expect(undone.tasks.find((t) => t.id === emilyTodo.id)?.status).toBe('todo');
  });

  it('leaves state unchanged when a removal is refused', () => {
    expect(reducer(seed, { type: 'remove_task', taskId: emilyDone.id })).toBe(seed);
  });

  it('edits an incomplete task and refuses a completed one', () => {
    const edited = reducer(seed, { type: 'edit_task', taskId: emilyTodo.id, changes: { title: 'New title' }, editorId: SEED_IDS.david, now: NOW });
    expect(edited.tasks.find((t) => t.id === emilyTodo.id)).toMatchObject({ title: 'New title', editedById: SEED_IDS.david });
    expect(reducer(seed, { type: 'edit_task', taskId: emilyDone.id, changes: { title: 'x' }, editorId: SEED_IDS.david, now: NOW })).toBe(seed);
  });

  it('archives a template without touching existing plans', () => {
    const next = reducer(seed, { type: 'archive_template', templateId: 'eng-first-pr', editorId: SEED_IDS.sarah, now: NOW });
    expect(next.templates.find((t) => t.id === 'eng-first-pr')?.archived).toBe(true);
    expect(next.tasks).toBe(seed.tasks);
  });

  it('adds a new hire with their plan', () => {
    const hire = person({ id: 'p-new' });
    const next = reducer(seed, { type: 'add_new_hire', person: hire, tasks: [task({ personId: 'p-new' })] });
    expect(next.people).toHaveLength(seed.people.length + 1);
    expect(next.tasks.filter((t) => t.personId === 'p-new')).toHaveLength(1);
  });
});

describe('reducer: remaining actions', () => {
  const seed = buildSeed(NOW);
  const draft = { ...emptyTemplateDraft('engineering'), title: 'Enable 2FA', dueOffsetDays: '3' };

  it('adds a task', () => {
    const added = task({ id: 't-new', personId: SEED_IDS.emily });
    expect(reducer(seed, { type: 'add_task', task: added }).tasks).toContainEqual(added);
  });

  it('removes an incomplete task', () => {
    const open = seed.tasks.find((t) => t.personId === SEED_IDS.emily && t.status === 'todo')!;
    const next = reducer(seed, { type: 'remove_task', taskId: open.id });
    expect(next.tasks.some((t) => t.id === open.id)).toBe(false);
  });

  it('ignores an edit to an unknown task', () => {
    expect(reducer(seed, { type: 'edit_task', taskId: 'nope', changes: { title: 'x' }, editorId: SEED_IDS.sarah, now: NOW })).toBe(seed);
  });

  it('creates, updates and restores templates without touching existing plans', () => {
    const created = reducer(seed, { type: 'create_template', id: 'tpl-new', draft, editorId: SEED_IDS.david, now: NOW });
    expect(created.templates.find((t) => t.id === 'tpl-new')).toMatchObject({ title: 'Enable 2FA', phase: 'week_1', archived: false });

    const updated = reducer(created, { type: 'update_template', templateId: 'tpl-new', draft: { ...draft, title: 'Turn on 2FA' }, editorId: SEED_IDS.david, now: NOW });
    expect(updated.templates.find((t) => t.id === 'tpl-new')?.title).toBe('Turn on 2FA');

    const archived = reducer(updated, { type: 'archive_template', templateId: 'tpl-new', editorId: SEED_IDS.david, now: NOW });
    const restored = reducer(archived, { type: 'restore_template', templateId: 'tpl-new', editorId: SEED_IDS.david, now: NOW });
    expect(restored.templates.find((t) => t.id === 'tpl-new')?.archived).toBe(false);
    expect(restored.tasks).toBe(seed.tasks);
  });

  it('logs a reminder', () => {
    const log = { id: 'r-new', personId: SEED_IDS.marcus, sentById: SEED_IDS.sarah, sentAt: NOW.toISOString(), taskIds: ['t-1'] };
    expect(reducer(seed, { type: 'send_reminder', log }).reminders).toContainEqual(log);
  });

  it('replaces the whole state on reset', () => {
    const other = buildSeed(new Date(2027, 0, 4));
    expect(reducer(seed, { type: 'replace_state', state: other })).toBe(other);
  });
});
