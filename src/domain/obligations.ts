import { endOfLocalDay } from "./dates";
import { getFeedForEmployee, type FeedEntry } from "./feed";
import type { Announcement, Employee, Receipt } from "./types";

export interface AckHistoryEntry {
  announcement: Announcement;
  acknowledgedAt: string;
  /** Acknowledged after the end of the due date. */
  late: boolean;
}

export interface EmployeeObligations {
  /** Unacknowledged required posts: overdue first, then by due date, then newest (same order as the feed). */
  outstanding: FeedEntry[];
  /** Acknowledged required posts, most recent acknowledgement first. */
  history: AckHistoryEntry[];
}

/** What one person still owes and has already confirmed, for the manager's per-person panel. */
export function getEmployeeObligations(
  employee: Employee,
  announcements: Announcement[],
  receipts: Receipt[],
  now: Date,
): EmployeeObligations {
  const feed = getFeedForEmployee(employee, announcements, receipts, now);
  const history = feed.everythingElse
    .filter((e) => e.announcement.priority === "required" && e.receipt?.acknowledgedAt)
    .map(({ announcement, receipt }): AckHistoryEntry => {
      const acknowledgedAt = receipt!.acknowledgedAt!;
      const end = announcement.dueDate ? endOfLocalDay(announcement.dueDate) : undefined;
      return { announcement, acknowledgedAt, late: end !== undefined && new Date(acknowledgedAt) > end };
    })
    .sort((a, b) => b.acknowledgedAt.localeCompare(a.acknowledgedAt));
  return { outstanding: feed.needsAttention, history };
}
