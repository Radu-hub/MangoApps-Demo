import { getRecipients } from "./audience";
import { isOverdue } from "./dates";
import { findReceipt } from "./receipts";
import type { Announcement, Employee, Receipt } from "./types";

/** How a post's recipients split by status: the counts drive progress text, the groups list the names. */
export interface AckStats {
  total: number;
  acknowledged: number;
  /** Opened but not confirmed. */
  seenOnly: number;
  notSeen: number;
  /** acknowledged + seenOnly. Used for FYI posts ("X of Y opened"). */
  opened: number;
  groups: {
    acknowledged: Employee[];
    seenOnly: Employee[];
    notSeen: Employee[];
  };
}

/** Groups the announcement's current recipients. Receipts from people outside the audience are ignored. */
export function getAckStats(announcement: Announcement, employees: Employee[], receipts: Receipt[]): AckStats {
  const groups: AckStats["groups"] = { acknowledged: [], seenOnly: [], notSeen: [] };
  for (const employee of getRecipients(employees, announcement)) {
    const receipt = findReceipt(receipts, announcement.id, employee.id);
    if (receipt?.acknowledgedAt) groups.acknowledged.push(employee);
    else if (receipt?.seenAt) groups.seenOnly.push(employee);
    else groups.notSeen.push(employee);
  }
  return {
    total: groups.acknowledged.length + groups.seenOnly.length + groups.notSeen.length,
    acknowledged: groups.acknowledged.length,
    seenOnly: groups.seenOnly.length,
    notSeen: groups.notSeen.length,
    opened: groups.acknowledged.length + groups.seenOnly.length,
    groups,
  };
}

/** The post is past its due date and someone still hasn't acknowledged it. Drives the manager's red styling. */
export function hasOverdueRecipients(announcement: Announcement, stats: AckStats, now: Date): boolean {
  return isOverdue(announcement, undefined, now) && stats.acknowledged < stats.total;
}
