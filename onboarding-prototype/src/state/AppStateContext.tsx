// React wiring for app state: useReducer, persistence, the current viewer and `now`.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { loadState, resetToSeed, saveState } from '../data/repository';
import { SEED_IDS } from '../data/seed';
import type { AppState, Person } from '../domain/types';
import { reducer, type Action } from './reducer';

interface AppStateValue {
  state: AppState;
  dispatch: (action: Action) => void;
  /** Current time, refreshed every minute. Passed into every domain function. */
  now: Date;
  viewer: Person;
  setViewerId: (id: string) => void;
  reset: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

/** Unique-enough id for records created in the browser. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Owns app state and the current viewer, and saves every change. */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(new Date()));
  const [now, setNow] = useState(() => new Date());
  const [viewerId, setViewerId] = useState<string>(SEED_IDS.sarah);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const reset = useCallback(() => {
    const fresh = new Date();
    setNow(fresh);
    dispatch({ type: 'replace_state', state: resetToSeed(fresh) });
  }, []);

  // Fall back to the HR admin if the selected person disappears (e.g. after a reset).
  const viewer = state.people.find((p) => p.id === viewerId) ?? state.people.find((p) => p.role === 'hr_admin') ?? state.people[0]!;

  const value = useMemo(
    () => ({ state, dispatch, now, viewer, setViewerId, reset }),
    [state, now, viewer, reset],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Access to shared state. Must be used inside AppStateProvider. */
export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
