import { describe, expect, it } from 'vitest';
import { firstName } from './labels';

describe('firstName', () => {
  it('returns the first word of a name, ignoring extra spaces', () => {
    expect(firstName('Emily Park')).toBe('Emily');
    expect(firstName('  Mary  Jane Watson ')).toBe('Mary');
    expect(firstName('Cher')).toBe('Cher');
  });
});
