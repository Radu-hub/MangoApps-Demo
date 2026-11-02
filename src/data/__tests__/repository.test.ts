import { describe, expect, it } from "vitest";
import { loadState, resetToSeed, saveState, STORAGE_KEY, type StorageLike } from "../repository";
import { buildSeed } from "../seed";

const NOW = new Date(2026, 9, 25, 12);

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
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("quota");
  },
  removeItem: () => {
    throw new Error("denied");
  },
};

describe("repository", () => {
  it("falls back to the seed when stored state has no employees", () => {
    const empty = { ...buildSeed(NOW), employees: [] };
    const loaded = loadState(NOW, memoryStorage({ [STORAGE_KEY]: JSON.stringify(empty) }));
    expect(loaded.employees.length).toBeGreaterThan(0);
  });

  it("falls back to seed when storage is empty", () => {
    expect(loadState(NOW, memoryStorage())).toEqual(buildSeed(NOW));
  });

  it("falls back to seed when storage is missing", () => {
    expect(loadState(NOW, undefined)).toEqual(buildSeed(NOW));
  });

  it("falls back to seed when storage throws", () => {
    expect(loadState(NOW, throwing)).toEqual(buildSeed(NOW));
    expect(saveState(buildSeed(NOW), throwing)).toBe(false);
  });

  it("falls back to seed on corrupt JSON", () => {
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: "{not json" }))).toEqual(buildSeed(NOW));
  });

  it("falls back to seed on the wrong version or shape", () => {
    const wrongVersion = JSON.stringify({ ...buildSeed(NOW), version: 99 });
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: wrongVersion })).version).toBe(1);
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: '{"version":1}' }))).toEqual(buildSeed(NOW));
    expect(loadState(NOW, memoryStorage({ [STORAGE_KEY]: "null" }))).toEqual(buildSeed(NOW));
  });

  it("round-trips saved state", () => {
    const storage = memoryStorage();
    const state = { ...buildSeed(NOW), viewerId: "e-alex" };
    expect(saveState(state, storage)).toBe(true);
    expect(loadState(new Date(2030, 0, 1), storage)).toEqual(state);
  });

  it("resetToSeed overwrites saved state", () => {
    const storage = memoryStorage();
    saveState({ ...buildSeed(NOW), announcements: [] }, storage);
    const reset = resetToSeed(NOW, storage);
    expect(reset.announcements.length).toBeGreaterThan(0);
    expect(loadState(NOW, storage)).toEqual(reset);
  });
});
