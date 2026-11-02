// Persistence: the only code that touches localStorage. Every access is guarded, so blocked storage falls back to the seed.
import type { AppState } from '../domain/types';
import { buildSeed } from './seed';

/** localStorage key. The version suffix leaves room for a future format change. */
export const STORAGE_KEY = 'brightpath-onboarding:v1';

/** The part of the Storage API we use, so tests can pass an in-memory fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** window.localStorage, or null when it's missing or access throws (e.g. blocked in a private window). */
function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function arrayOf(value: unknown, keys: string[]): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item) && keys.every((k) => typeof item[k] === 'string'));
}

/** Shape check for stored state. Anything that fails falls back to the seed. */
function isAppState(value: unknown): value is AppState {
  return (
    isRecord(value) &&
    value.version === 1 &&
    arrayOf(value.people, ['id', 'name', 'role', 'department']) &&
    arrayOf(value.templates, ['id', 'title', 'phase']) &&
    arrayOf(value.docs, ['id', 'title', 'body']) &&
    arrayOf(value.tasks, ['id', 'personId', 'title', 'phase', 'dueDate', 'status']) &&
    arrayOf(value.reminders, ['id', 'personId', 'sentAt'])
  );
}

/** Fills in fields added after a state was saved, so older saves keep working. */
function normalize(state: AppState): AppState {
  return { ...state, templates: state.templates.map((t) => ({ ...t, archived: t.archived === true })) };
}

/** Loads saved state, falling back to fresh seed data when storage is missing, corrupt or on another version. */
export function loadState(now: Date, storage: StorageLike | null = browserStorage()): AppState {
  if (!storage) return buildSeed(now);
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed(now);
    const parsed: unknown = JSON.parse(raw);
    return isAppState(parsed) ? normalize(parsed) : buildSeed(now);
  } catch {
    return buildSeed(now);
  }
}

/** Returns false when the state couldn't be saved (no storage, quota exceeded, blocked). */
export function saveState(state: AppState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Replaces saved data with a fresh seed whose dates are relative to `now`. */
export function resetToSeed(now: Date, storage: StorageLike | null = browserStorage()): AppState {
  const seed = buildSeed(now);
  saveState(seed, storage);
  return seed;
}
