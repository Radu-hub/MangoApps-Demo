import { describe, expect, it } from 'vitest';
import { NOW, task, template } from './fixtures';
import {
  OVERDUE_DUE_DATE_WARNING,
  PAST_START_WARNING,
  validateCustomTask,
  validateNewHire,
  validateTemplate,
  type CustomTaskDraft,
  type NewHireDraft,
  type TemplateDraft,
} from './validation';

const validHire: NewHireDraft = {
  name: 'Jordan Lee',
  jobTitle: 'Software Engineer',
  department: 'engineering',
  managerId: 'p-david',
  startDate: '2026-11-02',
  email: '',
  phone: '',
};

describe('validateNewHire', () => {
  it('accepts a complete draft', () => {
    expect(validateNewHire(validHire, NOW)).toEqual({ ok: true, errors: {}, warnings: [] });
  });

  it('requires name, job title, department, manager and start date', () => {
    const result = validateNewHire(
      { name: ' ', jobTitle: '', department: '', managerId: '', startDate: '', email: '', phone: '' },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['department', 'jobTitle', 'managerId', 'name', 'startDate']);
  });

  it('warns, but does not block, on a start date in the past', () => {
    const result = validateNewHire({ ...validHire, startDate: '2026-10-20' }, NOW);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([PAST_START_WARNING]);
  });

  it('does not warn when the start date is today', () => {
    expect(validateNewHire({ ...validHire, startDate: '2026-10-28' }, NOW).warnings).toEqual([]);
  });

  it('rejects an invalid date or email', () => {
    const result = validateNewHire({ ...validHire, startDate: '2026-02-30', email: 'nope' }, NOW);
    expect(result.errors.startDate).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });
});

const validTask: CustomTaskDraft = {
  title: 'Security training renewal',
  description: '',
  dueDate: '2026-11-06',
  priority: 'required',
  estimatedMinutes: '',
  docId: '',
};

describe('validateCustomTask', () => {
  it('accepts a title and due date', () => {
    expect(validateCustomTask(validTask, [])).toEqual({ ok: true, errors: {}, warnings: [] });
  });

  it('requires a title and due date', () => {
    const result = validateCustomTask({ ...validTask, title: '  ', dueDate: '' }, []);
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['dueDate', 'title']);
  });

  it('warns about a duplicate title in the same plan, ignoring case and spacing', () => {
    const result = validateCustomTask({ ...validTask, title: '  security  TRAINING renewal' }, [
      task({ title: 'Security training renewal' }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('rejects a non-numeric estimate', () => {
    expect(validateCustomTask({ ...validTask, estimatedMinutes: 'soon' }, []).errors.estimatedMinutes).toBeDefined();
    expect(validateCustomTask({ ...validTask, estimatedMinutes: '0' }, []).errors.estimatedMinutes).toBeDefined();
    expect(validateCustomTask({ ...validTask, estimatedMinutes: '45' }, []).ok).toBe(true);
  });
});

describe('validateCustomTask for edits', () => {
  it('does not count the task being edited as its own duplicate', () => {
    const existing = task({ title: 'Security training renewal' });
    expect(validateCustomTask(validTask, [existing], { ignoreTaskId: existing.id }).warnings).toEqual([]);
  });

  it('warns when the due date is in the past', () => {
    expect(validateCustomTask({ ...validTask, dueDate: '2026-10-27' }, [], { now: NOW }).warnings).toEqual([
      OVERDUE_DUE_DATE_WARNING,
    ]);
    expect(validateCustomTask({ ...validTask, dueDate: '2026-10-28' }, [], { now: NOW }).warnings).toEqual([]);
  });
});

const validTemplate: TemplateDraft = {
  title: 'Enable GitHub two-factor authentication',
  description: '',
  department: 'engineering',
  dueOffsetDays: '-2',
  priority: 'required',
  estimatedMinutes: '',
  docId: '',
};

describe('validateTemplate', () => {
  it('accepts a complete draft', () => {
    expect(validateTemplate(validTemplate)).toEqual({ ok: true, errors: {}, warnings: [] });
  });

  it('requires a title and department', () => {
    const result = validateTemplate({ ...validTemplate, title: ' ', department: '' });
    expect(Object.keys(result.errors).sort()).toEqual(['department', 'title']);
  });

  it('accepts offsets from -30 to 30 and rejects anything outside or non-integer', () => {
    expect(validateTemplate({ ...validTemplate, dueOffsetDays: '-30' }).ok).toBe(true);
    expect(validateTemplate({ ...validTemplate, dueOffsetDays: '30' }).ok).toBe(true);
    expect(validateTemplate({ ...validTemplate, dueOffsetDays: '0' }).ok).toBe(true);
    for (const bad of ['-31', '31', '2.5', '', 'soon']) {
      expect(validateTemplate({ ...validTemplate, dueOffsetDays: bad }).errors.dueOffsetDays).toBeDefined();
    }
  });

  it('warns about a duplicate title in the same department only', () => {
    const existing = [
      template({ id: 'a', title: 'Enable GitHub two-factor authentication', department: 'engineering' }),
      template({ id: 'b', title: 'Shadow calls', department: 'sales' }),
    ];
    expect(validateTemplate(validTemplate, existing).warnings).toHaveLength(1);
    expect(validateTemplate({ ...validTemplate, title: 'Shadow calls' }, existing).warnings).toEqual([]);
    expect(validateTemplate(validTemplate, existing, 'a').warnings).toEqual([]);
    expect(validateTemplate(validTemplate, [{ ...existing[0]!, archived: true }]).warnings).toEqual([]);
  });
});
