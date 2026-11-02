import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { loadState, resetToSeed, saveState } from "../data/repository";
import { createReminderLog } from "../domain/reminders";
import type { Announcement, Draft, Employee } from "../domain/types";
import { reducer } from "./reducer";
import type { AppState } from "./types";

/** What components can do to the state. Actions fill in the viewer, new ids and the current time for them. */
interface AppActions {
  setViewer(employeeId: string): void;
  /** Returns the new announcement's id. */
  post(draft: Draft): string;
  markSeen(announcementId: string): void;
  acknowledge(announcementId: string): void;
  sendReminder(announcementId: string, employeeIds: string[]): void;
  reset(): void;
}

interface AppContextValue {
  state: AppState;
  viewer: Employee;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

/** Loads the saved state once, then saves it after every change. */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(new Date()));

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Seed data always contains the demo viewers, so this only fails on hand-edited storage.
  const viewer = state.employees.find((e) => e.id === state.viewerId) ?? state.employees[0]!;

  const actions = useMemo<AppActions>(
    () => ({
      setViewer: (employeeId) => dispatch({ type: "SET_VIEWER", employeeId }),
      post: (draft) => {
        const announcement: Announcement = {
          ...draft,
          id: newId("a"),
          authorId: viewer.id,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: "POST", announcement });
        return announcement.id;
      },
      markSeen: (announcementId) =>
        dispatch({ type: "MARK_SEEN", announcementId, employeeId: viewer.id, at: new Date().toISOString() }),
      acknowledge: (announcementId) =>
        dispatch({ type: "ACKNOWLEDGE", announcementId, employeeId: viewer.id, at: new Date().toISOString() }),
      sendReminder: (announcementId, employeeIds) =>
        dispatch({ type: "SEND_REMINDER", log: createReminderLog(newId("r"), announcementId, employeeIds, new Date()) }),
      // Keep whoever is currently selected so the demo doesn't jump to another person.
      reset: () => dispatch({ type: "REPLACE", state: { ...resetToSeed(new Date()), viewerId: viewer.id } }),
    }),
    [viewer.id],
  );

  return <AppContext.Provider value={{ state, viewer, actions }}>{children}</AppContext.Provider>;
}

/** The current state, the selected person and the actions. */
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppStateProvider");
  return value;
}
