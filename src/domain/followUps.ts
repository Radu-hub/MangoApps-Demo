import { getRecipients } from "./audience";
import { isOverdue } from "./dates";
import { findReceipt } from "./receipts";
import type { Announcement, Employee, Receipt } from "./types";

export interface FollowUpPost {
  announcement: Announcement;
  overdue: Employee[];
}

export interface FollowUps {
  /** Distinct people overdue on at least one of the posts. */
  totalOverduePeople: number;
  /** Posts with at least one overdue recipient: most overdue people first, then earliest due date. */
  posts: FollowUpPost[];
}

/** Overdue follow-ups across the given posts (callers pass the posts a manager is responsible for). */
export function getFollowUps(
  announcements: Announcement[],
  employees: Employee[],
  receipts: Receipt[],
  now: Date,
): FollowUps {
  const posts: FollowUpPost[] = announcements
    .map((announcement) => ({
      announcement,
      overdue: getRecipients(employees, announcement).filter((e) =>
        isOverdue(announcement, findReceipt(receipts, announcement.id, e.id), now),
      ),
    }))
    .filter((p) => p.overdue.length > 0)
    .sort(
      (a, b) =>
        b.overdue.length - a.overdue.length ||
        (a.announcement.dueDate ?? "").localeCompare(b.announcement.dueDate ?? ""),
    );

  const people = new Set(posts.flatMap((p) => p.overdue.map((e) => e.id)));
  return { totalOverduePeople: people.size, posts };
}
