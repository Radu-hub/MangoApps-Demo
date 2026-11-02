import { describe, expect, it } from "vitest";
import { buildSeed } from "../../data/seed";
import { findReceipt } from "../../domain/receipts";
import type { Announcement } from "../../domain/types";
import { reducer } from "../reducer";

const NOW = new Date(2026, 9, 25, 12);
const at = NOW.toISOString();
const seed = buildSeed(NOW);

const post = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: "a-new",
  title: "New",
  body: "Body",
  authorId: "e-rachel",
  createdAt: at,
  priority: "required",
  audience: { storeIds: ["s3"], departments: ["sales_floor"] },
  ...overrides,
});

describe("reducer", () => {
  it("adds a valid post", () => {
    const next = reducer(seed, { type: "POST", announcement: post() });
    expect(next.announcements.at(-1)?.id).toBe("a-new");
  });

  it("rejects a post that fails validation", () => {
    const next = reducer(seed, { type: "POST", announcement: post({ audience: { storeIds: ["s1"], departments: "all" } }) });
    expect(next).toBe(seed);
  });

  it("acknowledges required posts only", () => {
    const acked = reducer(seed, { type: "ACKNOWLEDGE", announcementId: "a-wet-floor", employeeId: "e-jordan", at });
    expect(findReceipt(acked.receipts, "a-wet-floor", "e-jordan")?.acknowledgedAt).toBe(at);
    const fyi = reducer(seed, { type: "ACKNOWLEDGE", announcementId: "a-potluck", employeeId: "e-alex", at });
    expect(fyi).toBe(seed);
  });

  it("returns the same state for a repeated mark seen", () => {
    const once = reducer(seed, { type: "MARK_SEEN", announcementId: "a-potluck", employeeId: "e-alex", at });
    expect(once).not.toBe(seed);
    expect(reducer(once, { type: "MARK_SEEN", announcementId: "a-potluck", employeeId: "e-alex", at })).toBe(once);
  });

  it("ignores receipts from people outside the audience or from the author", () => {
    // Jordan (Store 1 stockroom) is outside the Store 3 potluck post.
    expect(reducer(seed, { type: "MARK_SEEN", announcementId: "a-potluck", employeeId: "e-jordan", at })).toBe(seed);
    // Michael authored the wet-floor post, so he can't acknowledge it.
    expect(reducer(seed, { type: "ACKNOWLEDGE", announcementId: "a-wet-floor", employeeId: "e-michael", at })).toBe(seed);
  });

  it("logs reminders but ignores empty ones", () => {
    const log = { id: "r1", announcementId: "a-wet-floor", sentAt: at, employeeIds: ["e-alex"] };
    expect(reducer(seed, { type: "SEND_REMINDER", log }).reminders).toEqual([log]);
    expect(reducer(seed, { type: "SEND_REMINDER", log: { ...log, employeeIds: [] } })).toBe(seed);
  });

  it("rejects a post from an unknown author", () => {
    expect(reducer(seed, { type: "POST", announcement: post({ authorId: "nobody" }) })).toBe(seed);
  });

  it("ignores receipts for unknown posts and unknown people", () => {
    expect(reducer(seed, { type: "MARK_SEEN", announcementId: "nope", employeeId: "e-alex", at })).toBe(seed);
    expect(reducer(seed, { type: "ACKNOWLEDGE", announcementId: "a-wet-floor", employeeId: "nobody", at })).toBe(seed);
  });

  it("replaces the whole state", () => {
    const other = { ...seed, viewerId: "e-alex" };
    expect(reducer(seed, { type: "REPLACE", state: other })).toBe(other);
  });

  it("switches viewer only to known employees", () => {
    expect(reducer(seed, { type: "SET_VIEWER", employeeId: "e-alex" }).viewerId).toBe("e-alex");
    expect(reducer(seed, { type: "SET_VIEWER", employeeId: "nobody" })).toBe(seed);
  });
});
