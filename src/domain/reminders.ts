import { formatShortDate } from "./dates";
import { getAckStats } from "./stats";
import type { Announcement, Employee, Receipt, ReminderLog } from "./types";

/** Recipients who have not acknowledged. Only required posts can be reminded; FYI posts never ask anything. */
export function getReminderTargets(announcement: Announcement, employees: Employee[], receipts: Receipt[]): Employee[] {
  if (announcement.priority !== "required") return [];
  const { groups } = getAckStats(announcement, employees, receipts);
  return [...groups.seenOnly, ...groups.notSeen];
}

/** Placeholder deep link; there is no real SMS sending in the prototype. */
export function reminderLink(announcement: Pick<Announcement, "id">): string {
  return `https://updates.summit.example/a/${announcement.id}`;
}

/** The text a reminder sends. It differs from the first notification by asking outright and including a link. */
export function buildReminderText(announcement: Announcement, link: string): string {
  const dueText = announcement.dueDate ? ` by ${formatShortDate(announcement.dueDate)}` : "";
  return `Summit Updates: Please read and confirm "${announcement.title}"${dueText}. ${link}`;
}

/** The record of a sent reminder. The id and time are passed in so this stays pure. */
export function createReminderLog(
  id: string,
  announcementId: string,
  employeeIds: string[],
  now: Date,
): ReminderLog {
  return { id, announcementId, employeeIds: [...employeeIds], sentAt: now.toISOString() };
}
