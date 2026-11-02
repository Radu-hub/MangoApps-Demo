import { describe, expect, it } from 'vitest';
import { NOW } from '../domain/fixtures';
import { STORAGE_KEY, loadState, resetToSeed, saveState, type StorageLike } from './repository';
import { buildSeed } from './seed';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('repository', () => {
  const seed = buildSeed(NOW);

  it('falls back to the seed when storage is missing, empty, corrupt or another version', () => {
    expect(loadState(NOW, null)).toEqual(seed);
    expect(loadState(NOW, memoryStorage())).toEqual(seed);
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual(seed);
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...seed, version: 2 }) }))).toEqual(seed);
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, people: 'x' }) }))).toEqual(seed);
  });

  it('never throws when storage access throws', () => {
    expect(loadState(NOW, throwing)).toEqual(seed);
    expect(saveState(seed, throwing)).toBe(false);
    expect(resetToSeed(NOW, throwing)).toEqual(seed);
  });

  it('round-trips saved state under the versioned key', () => {
    const storage = memoryStorage();
    const changed = { ...seed, reminders: [] };
    expect(saveState(changed, storage)).toBe(true);
    expect(Object.keys(storage.data)).toEqual(['brightpath-onboarding:v1']);
    expect(loadState(NOW, storage)).toEqual(changed);
  });

  it('marks templates saved before archiving existed as active', () => {
    const old = { ...seed, templates: seed.templates.map(({ archived: _archived, ...t }) => t) };
    const loaded = loadState(NOW, memoryStorage({ [STORAGE_KEY]: JSON.stringify(old) }));
    expect(loaded.templates.every((t) => t.archived === false)).toBe(true);
  });

  it('resetToSeed overwrites saved changes', () => {
    const storage = memoryStorage();
    saveState({ ...seed, tasks: [] }, storage);
    expect(resetToSeed(NOW, storage)).toEqual(seed);
    expect(loadState(NOW, storage)).toEqual(seed);
  });

  it('falls back to the seed when no browser storage is available', () => {
    expect(loadState(NOW)).toEqual(buildSeed(NOW));
    expect(saveState(buildSeed(NOW))).toBe(false);
  });
});
