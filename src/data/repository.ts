import { STATE_VERSION, type AppState } from "../state/types";
import { buildSeed } from "./seed";

/** The whole app state is saved as one JSON object under this key. */
export const STORAGE_KEY = "summit-updates:v1";

/** The parts of localStorage this module uses, so tests can pass an in-memory stand-in. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** window.localStorage, or undefined if it is missing or access throws (private mode, sandboxed iframe). */
function defaultStorage(): StorageLike | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** A shallow check that stored JSON has the expected shape and version before it's trusted. */
function isAppState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === STATE_VERSION &&
    typeof v.viewerId === "string" &&
    ["stores", "employees", "announcements", "receipts", "reminders"].every((k) => Array.isArray(v[k])) &&
    // The app always needs someone to view it as.
    (v.employees as unknown[]).length > 0
  );
}

/** Never throws. Falls back to seed data when storage is missing, empty, corrupt or on another version. */
export function loadState(now: Date, storage: StorageLike | undefined = defaultStorage()): AppState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return buildSeed(now);
}

/** Returns false if the write failed (quota, disabled storage). */
export function saveState(state: AppState, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Rebuilds the demo data from `now` and saves it. */
export function resetToSeed(now: Date, storage: StorageLike | undefined = defaultStorage()): AppState {
  const seed = buildSeed(now);
  saveState(seed, storage);
  return seed;
}
