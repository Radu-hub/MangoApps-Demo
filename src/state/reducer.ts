import { isRecipient } from "../domain/audience";
import { acknowledge, markSeen } from "../domain/receipts";
import type { Announcement, ReminderLog } from "../domain/types";
import { hasErrors, validateDraft } from "../domain/validation";
import type { AppState } from "./types";

// Actions carry ids and timestamps so the reducer stays pure.
export type Action =
  | { type: "SET_VIEWER"; employeeId: string }
  | { type: "POST"; announcement: Announcement }
  | { type: "MARK_SEEN"; announcementId: string; employeeId: string; at: string }
  | { type: "ACKNOWLEDGE"; announcementId: string; employeeId: string; at: string }
  | { type: "SEND_REMINDER"; log: ReminderLog }
  | { type: "REPLACE"; state: AppState };

/**
 * All state changes. Invalid actions return the same state, which backs up the checks in the UI and lets the
 * provider skip needless saves.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_VIEWER":
      if (!state.employees.some((e) => e.id === action.employeeId)) return state;
      return { ...state, viewerId: action.employeeId };

    case "POST": {
      const author = state.employees.find((e) => e.id === action.announcement.authorId);
      if (!author) return state;
      const errors = validateDraft(action.announcement, state.employees, author, new Date(action.announcement.createdAt));
      if (hasErrors(errors)) return state;
      return { ...state, announcements: [...state.announcements, action.announcement] };
    }

    case "MARK_SEEN": {
      if (!isRecipientOf(state, action.announcementId, action.employeeId)) return state;
      const receipts = markSeen(state.receipts, action.announcementId, action.employeeId, new Date(action.at));
      return receipts === state.receipts ? state : { ...state, receipts };
    }

    case "ACKNOWLEDGE": {
      const announcement = state.announcements.find((a) => a.id === action.announcementId);
      if (announcement?.priority !== "required") return state;
      if (!isRecipientOf(state, action.announcementId, action.employeeId)) return state;
      const receipts = acknowledge(state.receipts, action.announcementId, action.employeeId, new Date(action.at));
      return receipts === state.receipts ? state : { ...state, receipts };
    }

    case "SEND_REMINDER":
      if (action.log.employeeIds.length === 0) return state;
      return { ...state, reminders: [...state.reminders, action.log] };

    case "REPLACE":
      return action.state;
  }
}

/** Receipts can only be recorded for a post's recipients (never its author or anyone outside the audience). */
function isRecipientOf(state: AppState, announcementId: string, employeeId: string): boolean {
  const announcement = state.announcements.find((a) => a.id === announcementId);
  const employee = state.employees.find((e) => e.id === employeeId);
  return announcement !== undefined && employee !== undefined && isRecipient(employee, announcement);
}
