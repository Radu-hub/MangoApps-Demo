import { describe, expect, it } from 'vitest';
import { NOW } from '../domain/fixtures';
import { derivePhaseFromOffset } from '../domain/phase';
import { getCurrentPhase, getFocusList, getProgress, groupTasksByPerson } from '../domain/progress';
import { SEED_IDS, buildSeed } from './seed';

describe('seed data', () => {
  const state = buildSeed(NOW);
  const byPerson = groupTasksByPerson(state.tasks);
  const personById = (id: string) => state.people.find((p) => p.id === id)!;
  const progress = (id: string) => getProgress(byPerson[id] ?? [], NOW);

  it('is deterministic for a given now', () => {
    expect(buildSeed(NOW)).toEqual(state);
  });

  it('has about 20 templates, unique ids and valid doc links', () => {
    expect(state.templates.length).toBeGreaterThanOrEqual(18);
    expect(new Set(state.templates.map((t) => t.id)).size).toBe(state.templates.length);
    expect(new Set(state.tasks.map((t) => t.id)).size).toBe(state.tasks.length);
    const docIds = new Set(state.docs.map((d) => d.id));
    for (const t of state.templates) if (t.docId) expect(docIds.has(t.docId)).toBe(true);
  });

  it('starts every template active, with its phase derived from the offset', () => {
    for (const t of state.templates) {
      expect(t.archived).toBe(false);
      expect(t.phase).toBe(derivePhaseFromOffset(t.dueOffsetDays));
      expect(t.dueOffsetDays).toBeGreaterThanOrEqual(-30);
      expect(t.dueOffsetDays).toBeLessThanOrEqual(30);
    }
  });

  it('has one engineering template updated by David two weeks ago', () => {
    const updated = state.templates.filter((t) => t.updatedAt);
    expect(updated.map((t) => [t.id, t.department, t.updatedById])).toEqual([['eng-local-env', 'engineering', SEED_IDS.david]]);
    expect(new Date(updated[0]!.updatedAt!).getTime()).toBeLessThan(NOW.getTime());
  });

  it('Emily starts in 5 days with 1 of 4 pre-start tasks done', () => {
    const emily = personById(SEED_IDS.emily);
    expect(getCurrentPhase(emily, NOW)).toBe('before_day_1');
    const preStart = (byPerson[SEED_IDS.emily] ?? []).filter((t) => t.phase === 'before_day_1');
    expect(preStart).toHaveLength(4);
    expect(preStart.filter((t) => t.status === 'done')).toHaveLength(1);
    expect(getFocusList(byPerson[SEED_IDS.emily] ?? [], NOW, 3, { startDate: emily.startDate })).toHaveLength(3);
  });

  it('Marcus is behind with exactly 2 overdue tasks', () => {
    expect(progress(SEED_IDS.marcus)).toMatchObject({ status: 'behind', overdueCount: 2 });
    expect(progress(SEED_IDS.marcus).done).toBeGreaterThan(3);
  });

  it('Priya is nearly complete and on track', () => {
    const p = progress(SEED_IDS.priya);
    expect(p.status).toBe('on_track');
    expect(p.total - p.done).toBe(1);
  });

  it('Tom finished onboarding long ago', () => {
    expect(getCurrentPhase(personById(SEED_IDS.tom), NOW)).toBe('post_onboarding');
    expect(progress(SEED_IDS.tom).status).toBe('complete');
  });

  it('has one reminder logged for Marcus about his overdue tasks', () => {
    expect(state.reminders).toHaveLength(1);
    expect(state.reminders[0]).toMatchObject({ personId: SEED_IDS.marcus });
    expect(state.reminders[0]?.taskIds).toHaveLength(2);
  });

  it('never completes a task in the future', () => {
    for (const t of state.tasks) {
      if (t.completedAt) expect(new Date(t.completedAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });
});
