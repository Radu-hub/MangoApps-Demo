import { describe, expect, it } from "vitest";
import { acknowledge, findReceipt, markSeen } from "../receipts";
import type { Receipt } from "../types";

const T1 = new Date(2026, 9, 25, 9);
const T2 = new Date(2026, 9, 25, 10);

describe("markSeen", () => {
  it("creates a receipt with seenAt", () => {
    const next = markSeen([], "a", "e", T1);
    expect(next).toEqual([{ announcementId: "a", employeeId: "e", seenAt: T1.toISOString(), lastOpenedAt: T1.toISOString() }]);
  });

  it("keeps the first seenAt and moves lastOpenedAt forward on a later open", () => {
    const once = markSeen([], "a", "e", T1);
    const twice = markSeen(once, "a", "e", T2);
    expect(twice).toHaveLength(1);
    expect(findReceipt(twice, "a", "e")?.seenAt).toBe(T1.toISOString());
    expect(findReceipt(twice, "a", "e")?.lastOpenedAt).toBe(T2.toISOString());
  });

  it("returns the same array when the open is no newer than the last one", () => {
    const opened = markSeen([], "a", "e", T2);
    expect(markSeen(opened, "a", "e", T2)).toBe(opened);
    expect(markSeen(opened, "a", "e", T1)).toBe(opened);
  });

  it("does not mutate the input", () => {
    const input: Receipt[] = [];
    markSeen(input, "a", "e", T1);
    expect(input).toEqual([]);
  });

  it("keeps receipts for other posts and people separate", () => {
    let r = markSeen([], "a", "e1", T1);
    r = markSeen(r, "a", "e2", T1);
    r = markSeen(r, "b", "e1", T1);
    expect(r).toHaveLength(3);
  });
});

describe("acknowledge", () => {
  it("sets both seenAt and acknowledgedAt when the post was never opened", () => {
    const next = acknowledge([], "a", "e", T1);
    expect(findReceipt(next, "a", "e")).toEqual({
      announcementId: "a",
      employeeId: "e",
      seenAt: T1.toISOString(),
      acknowledgedAt: T1.toISOString(),
    });
  });

  it("preserves an earlier seenAt", () => {
    const seen = markSeen([], "a", "e", T1);
    const acked = acknowledge(seen, "a", "e", T2);
    expect(findReceipt(acked, "a", "e")).toMatchObject({ seenAt: T1.toISOString(), acknowledgedAt: T2.toISOString() });
    expect(acked).toHaveLength(1);
  });

  it("keeps the first timestamp on a double acknowledge", () => {
    const once = acknowledge([], "a", "e", T1);
    const twice = acknowledge(once, "a", "e", T2);
    expect(twice).toBe(once);
    expect(findReceipt(twice, "a", "e")?.acknowledgedAt).toBe(T1.toISOString());
  });

  it("markSeen after acknowledge changes nothing", () => {
    const acked = acknowledge([], "a", "e", T1);
    expect(markSeen(acked, "a", "e", T2)).toBe(acked);
  });
});
