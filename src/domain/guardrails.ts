import type { Announcement } from "./types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Required posts in a week before the author is warned that staff may start tuning them out. */
const REQUIRED_POST_WARNING_THRESHOLD = 2;

/** Required posts by this author created in the rolling 7 days before `now` (exactly 7 days ago is excluded). */
export function countRecentRequiredPosts(authorId: string, announcements: Announcement[], now: Date): number {
  const since = now.getTime() - WEEK_MS;
  return announcements.filter((a) => {
    const created = new Date(a.createdAt).getTime();
    return a.authorId === authorId && a.priority === "required" && created > since && created <= now.getTime();
  }).length;
}

/**
 * Non-blocking nudge shown when an author picks "Action required" after already sending
 * 2+ required posts this week. Undefined when no warning applies.
 */
export function getRequiredPostWarning(authorId: string, announcements: Announcement[], now: Date): string | undefined {
  const n = countRecentRequiredPosts(authorId, announcements, now);
  if (n < REQUIRED_POST_WARNING_THRESHOLD) return undefined;
  return `You've sent ${n} required updates this week. Too many can make employees tune them out.`;
}
