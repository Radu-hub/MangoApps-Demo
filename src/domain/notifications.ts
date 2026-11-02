import { isRecipient } from "./audience";
import { formatShortDate } from "./dates";
import { findReceipt } from "./receipts";
import { buildReminderText, reminderLink } from "./reminders";
import type { Announcement, Employee, Receipt, ReminderLog } from "./types";

/** The one text message an Action required post sends. FYI posts send nothing. */
export function buildNotificationText(announcement: Pick<Announcement, "title" | "dueDate">): string {
  const due = announcement.dueDate ? `, due ${formatShortDate(announcement.dueDate)}` : "";
  return `Summit: Action required – ${announcement.title}${due}. Tap to read.`;
}

export interface TextMessage {
  id: string;
  announcement: Announcement;
  /** ISO timestamp: the post's createdAt for the first text, the log's sentAt for a reminder. */
  sentAt: string;
  kind: "posted" | "reminder";
  text: string;
}

/**
 * The unread texts on an employee's lock screen: one when each required post went out, plus one per
 * reminder that included them, newest first. A text counts as read once the employee has opened its post
 * after it arrived, so a reminder sent after they opened it shows again. Acknowledged posts send nothing more.
 */
export function getTextMessages(
  employee: Employee,
  announcements: Announcement[],
  receipts: Receipt[],
  reminders: ReminderLog[],
  now: Date,
): TextMessage[] {
  const messages: TextMessage[] = [];
  for (const a of announcements) {
    if (a.priority !== "required" || !isRecipient(employee, a)) continue;
    const receipt = findReceipt(receipts, a.id, employee.id);
    if (receipt?.acknowledgedAt) continue;
    // Seed receipts only have seenAt, so fall back to it when there's no later open on record.
    const lastOpened = receipt?.lastOpenedAt ?? receipt?.seenAt;
    const unread = (sentAt: string) => !lastOpened || lastOpened < sentAt;

    if (unread(a.createdAt)) {
      messages.push({ id: `post-${a.id}`, announcement: a, sentAt: a.createdAt, kind: "posted", text: buildNotificationText(a) });
    }
    for (const log of reminders) {
      if (log.announcementId !== a.id || !log.employeeIds.includes(employee.id) || !unread(log.sentAt)) continue;
      messages.push({
        id: `reminder-${log.id}`,
        announcement: a,
        sentAt: log.sentAt,
        kind: "reminder",
        text: buildReminderText(a, reminderLink(a)),
      });
    }
  }

  return messages
    .filter((m) => new Date(m.sentAt).getTime() <= now.getTime())
    .sort((x, y) => y.sentAt.localeCompare(x.sentAt));
}
