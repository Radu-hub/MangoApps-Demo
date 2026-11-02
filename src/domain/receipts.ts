import type { Receipt } from "./types";

/** The receipt for one person on one post, if they have opened or confirmed it. */
export function findReceipt(receipts: Receipt[], announcementId: string, employeeId: string): Receipt | undefined {
  return receipts.find((r) => r.announcementId === announcementId && r.employeeId === employeeId);
}

/** Returns a new array with `next` replacing that person's receipt for the post, or added if they had none. */
function upsert(receipts: Receipt[], next: Receipt): Receipt[] {
  const index = receipts.findIndex(
    (r) => r.announcementId === next.announcementId && r.employeeId === next.employeeId,
  );
  if (index === -1) return [...receipts, next];
  return receipts.map((r, i) => (i === index ? next : r));
}

/**
 * Records that the employee opened the post. The first seenAt is kept for tracking, and lastOpenedAt moves
 * forward so a reminder that arrived in between counts as read. Returns the input array unchanged when there
 * is nothing to record: the post is already acknowledged, or this open is no newer than the last one.
 */
export function markSeen(receipts: Receipt[], announcementId: string, employeeId: string, now: Date): Receipt[] {
  const existing = findReceipt(receipts, announcementId, employeeId);
  const at = now.toISOString();
  if (existing?.acknowledgedAt || (existing?.lastOpenedAt && existing.lastOpenedAt >= at)) return receipts;
  return upsert(receipts, { ...existing, announcementId, employeeId, seenAt: existing?.seenAt ?? at, lastOpenedAt: at });
}

/**
 * Records the one-tap confirmation. Idempotent: the first acknowledgedAt wins.
 * Also sets seenAt if it is missing.
 */
export function acknowledge(receipts: Receipt[], announcementId: string, employeeId: string, now: Date): Receipt[] {
  const existing = findReceipt(receipts, announcementId, employeeId);
  if (existing?.acknowledgedAt) return receipts;
  const at = now.toISOString();
  return upsert(receipts, {
    ...existing,
    announcementId,
    employeeId,
    seenAt: existing?.seenAt ?? at,
    acknowledgedAt: at,
  });
}
