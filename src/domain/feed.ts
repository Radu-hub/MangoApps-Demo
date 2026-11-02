import { isRecipient } from "./audience";
import { isOverdue } from "./dates";
import { findReceipt } from "./receipts";
import type { Announcement, Employee, Receipt } from "./types";

/** A post in an employee's feed, with their receipt and whether they're overdue on it. */
export interface FeedEntry {
  announcement: Announcement;
  receipt: Receipt | undefined;
  overdue: boolean;
}

export interface Feed {
  /** Required posts not yet acknowledged: overdue first, then by due date, then newest. */
  needsAttention: FeedEntry[];
  /** FYI posts and acknowledged required posts, newest first. */
  everythingElse: FeedEntry[];
}

const newestFirst = (a: FeedEntry, b: FeedEntry) =>
  b.announcement.createdAt.localeCompare(a.announcement.createdAt);

/** Overdue first, then the earliest due date; posts with no due date come last, newest first. */
function attentionOrder(a: FeedEntry, b: FeedEntry): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  const da = a.announcement.dueDate;
  const db = b.announcement.dueDate;
  if (da && db && da !== db) return da.localeCompare(db);
  if (da && !db) return -1;
  if (!da && db) return 1;
  return newestFirst(a, b);
}

/** Splits the posts an employee receives into what still needs them and everything else. */
export function getFeedForEmployee(
  employee: Employee,
  announcements: Announcement[],
  receipts: Receipt[],
  now: Date,
): Feed {
  const entries: FeedEntry[] = announcements
    .filter((a) => isRecipient(employee, a))
    .map((announcement) => {
      const receipt = findReceipt(receipts, announcement.id, employee.id);
      return { announcement, receipt, overdue: isOverdue(announcement, receipt, now) };
    });

  const needsAttention = entries.filter(
    (e) => e.announcement.priority === "required" && !e.receipt?.acknowledgedAt,
  );
  const everythingElse = entries.filter((e) => !needsAttention.includes(e));

  return {
    needsAttention: needsAttention.sort(attentionOrder),
    everythingElse: everythingElse.sort(newestFirst),
  };
}
