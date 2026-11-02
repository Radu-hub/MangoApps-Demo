import { describe, expect, it } from 'vitest';
import { NOW, TEMPLATES, person, template } from './fixtures';
import { generatePlan } from './plan';
import {
  archiveTemplate,
  countPlansFromTemplate,
  createTemplate,
  draftFromTemplate,
  emptyTemplateDraft,
  restoreTemplate,
  templateDepartmentOptions,
  updateTemplate,
} from './templates';
import type { TemplateDraft } from './validation';

const LATER = new Date(2026, 9, 29, 9, 0);

const draft: TemplateDraft = {
  ...emptyTemplateDraft('engineering'),
  title: 'Enable GitHub two-factor authentication',
  dueOffsetDays: '-2',
  estimatedMinutes: '10',
};

describe('createTemplate', () => {
  it('adds an active template with a derived phase and editor info, without mutating the input', () => {
    const next = createTemplate(TEMPLATES, draft, { id: 'tpl-2fa', editorId: 'david' }, NOW);
    expect(next).not.toBe(TEMPLATES);
    expect(next).toHaveLength(TEMPLATES.length + 1);
    expect(next[next.length - 1]).toMatchObject({
      id: 'tpl-2fa',
      department: 'engineering',
      dueOffsetDays: -2,
      phase: 'before_day_1',
      estimatedMinutes: 10,
      archived: false,
      updatedAt: NOW.toISOString(),
      updatedById: 'david',
    });
  });

  it('is included in plans generated afterwards', () => {
    const next = createTemplate(TEMPLATES, draft, { id: 'tpl-2fa', editorId: 'david' }, NOW);
    const plan = generatePlan(person(), next, 'hr', NOW);
    expect(plan.find((t) => t.templateId === 'tpl-2fa')?.dueDate).toBe('2026-10-31');
  });
});

describe('updateTemplate', () => {
  it('re-derives the phase and stamps the editor', () => {
    const next = updateTemplate(TEMPLATES, 'eng-pr', { ...draftFromTemplate(TEMPLATES[4]!), dueOffsetDays: '3' }, 'david', LATER);
    expect(next.find((t) => t.id === 'eng-pr')).toMatchObject({
      dueOffsetDays: 3,
      phase: 'week_1',
      updatedAt: LATER.toISOString(),
      updatedById: 'david',
    });
    expect(TEMPLATES.find((t) => t.id === 'eng-pr')?.dueOffsetDays).toBe(14);
  });

  it('leaves existing plans unchanged; only new plans see the edit', () => {
    const existing = generatePlan(person({ id: 'emily' }), TEMPLATES, 'hr', NOW);
    const snapshot = structuredClone(existing);
    const edited = updateTemplate(
      TEMPLATES,
      'eng-pr',
      { ...draftFromTemplate(TEMPLATES[4]!), title: 'Ship your first PR (renamed)' },
      'david',
      LATER,
    );
    expect(existing).toEqual(snapshot);
    const fresh = generatePlan(person({ id: 'jordan' }), edited, 'hr', LATER);
    expect(fresh.find((t) => t.templateId === 'eng-pr')?.title).toBe('Ship your first PR (renamed)');
    expect(existing.find((t) => t.templateId === 'eng-pr')?.title).toBe('eng-pr');
  });
});

describe('archiveTemplate / restoreTemplate', () => {
  it('excludes archived templates from new plans and brings them back on restore', () => {
    const archived = archiveTemplate(TEMPLATES, 'eng-pr', 'hr', NOW);
    expect(archived.find((t) => t.id === 'eng-pr')).toMatchObject({ archived: true, updatedById: 'hr' });
    expect(archived).toHaveLength(TEMPLATES.length);
    expect(generatePlan(person(), archived, 'hr', NOW).some((t) => t.templateId === 'eng-pr')).toBe(false);

    const restored = restoreTemplate(archived, 'eng-pr', 'hr', LATER);
    expect(restored.find((t) => t.id === 'eng-pr')?.archived).toBe(false);
    expect(generatePlan(person(), restored, 'hr', NOW).some((t) => t.templateId === 'eng-pr')).toBe(true);
  });

  it('keeps archived templates out of hasDepartmentTemplates-style checks via generatePlan', () => {
    const onlyArchived = [template({ id: 'x', department: 'sales', archived: true })];
    expect(generatePlan(person({ department: 'sales' }), onlyArchived, 'hr', NOW)).toEqual([]);
  });
});

describe('countPlansFromTemplate', () => {
  it('counts distinct people whose plan has a task from the template', () => {
    const tasks = [
      ...generatePlan(person({ id: 'a' }), TEMPLATES, 'hr', NOW),
      ...generatePlan(person({ id: 'b' }), TEMPLATES, 'hr', NOW),
      ...generatePlan(person({ id: 'c', department: 'sales' }), TEMPLATES, 'hr', NOW),
    ];
    expect(countPlansFromTemplate('eng-pr', tasks)).toBe(2);
    expect(countPlansFromTemplate('all-offer', tasks)).toBe(3);
    expect(countPlansFromTemplate('nope', tasks)).toBe(0);
  });
});

describe('templateDepartmentOptions', () => {
  it('keeps display order and only what the viewer may create', () => {
    expect(templateDepartmentOptions(() => true)).toEqual(['all', 'engineering', 'sales', 'operations', 'people_ops']);
    expect(templateDepartmentOptions((d) => d === 'sales')).toEqual(['sales']);
  });
});
