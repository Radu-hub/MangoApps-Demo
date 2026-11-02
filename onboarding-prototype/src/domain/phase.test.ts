import { describe, expect, it } from 'vitest';
import { person } from './fixtures';
import { derivePhaseForTask, derivePhaseFromOffset } from './phase';

describe('derivePhaseFromOffset', () => {
  it('splits at -1/0, 6/7 and 30/31', () => {
    expect(derivePhaseFromOffset(-30)).toBe('before_day_1');
    expect(derivePhaseFromOffset(-1)).toBe('before_day_1');
    expect(derivePhaseFromOffset(0)).toBe('week_1');
    expect(derivePhaseFromOffset(6)).toBe('week_1');
    expect(derivePhaseFromOffset(7)).toBe('first_30_days');
    expect(derivePhaseFromOffset(30)).toBe('first_30_days');
    expect(derivePhaseFromOffset(31)).toBe('ongoing');
  });
});

describe('derivePhaseForTask', () => {
  const hire = person({ startDate: '2026-11-02' });
  it('uses the due date relative to the start date, with the same boundaries', () => {
    expect(derivePhaseForTask(hire, '2026-11-01')).toBe('before_day_1');
    expect(derivePhaseForTask(hire, '2026-11-02')).toBe('week_1');
    expect(derivePhaseForTask(hire, '2026-11-08')).toBe('week_1');
    expect(derivePhaseForTask(hire, '2026-11-09')).toBe('first_30_days');
    expect(derivePhaseForTask(hire, '2026-12-02')).toBe('first_30_days');
    expect(derivePhaseForTask(hire, '2026-12-03')).toBe('ongoing');
  });

  it('treats a person without a start date as ongoing', () => {
    expect(derivePhaseForTask(person({ startDate: undefined }), '2026-11-02')).toBe('ongoing');
  });
});
