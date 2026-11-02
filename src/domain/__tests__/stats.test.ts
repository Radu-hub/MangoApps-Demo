import { describe, expect, it } from "vitest";
import { getAckStats, hasOverdueRecipients } from "../stats";
import type { Receipt } from "../types";
import { alex, ann, everyone, mgr3, NOW, sam } from "./fixtures";

const store3 = ann({ id: "a", priority: "required", audience: { storeIds: ["s3"], departments: "all" } });

describe("getAckStats", () => {
  it("splits recipients into acknowledged, seen only and not seen", () => {
    const receipts: Receipt[] = [
      { announcementId: "a", employeeId: "mgr3", seenAt: "x", acknowledgedAt: "x" },
      { announcementId: "a", employeeId: "alex", seenAt: "x" },
    ];
    const stats = getAckStats(store3, everyone, receipts);
    expect(stats).toMatchObject({ total: 3, acknowledged: 1, seenOnly: 1, notSeen: 1, opened: 2 });
    expect(stats.groups.acknowledged).toEqual([mgr3]);
    expect(stats.groups.seenOnly).toEqual([alex]);
    expect(stats.groups.notSeen).toEqual([sam]);
  });

  it("handles 100% acknowledged", () => {
    const receipts: Receipt[] = [mgr3, alex, sam].map((e) => ({
      announcementId: "a",
      employeeId: e.id,
      seenAt: "x",
      acknowledgedAt: "x",
    }));
    const stats = getAckStats(store3, everyone, receipts);
    expect(stats).toMatchObject({ total: 3, acknowledged: 3, seenOnly: 0, notSeen: 0 });
  });

  it("handles zero recipients", () => {
    const nobody = ann({ id: "a", audience: { storeIds: ["s9"], departments: "all" } });
    expect(getAckStats(nobody, everyone, [])).toMatchObject({ total: 0, acknowledged: 0, seenOnly: 0, notSeen: 0 });
  });

  it("excludes the author from the counts even when they are in the audience", () => {
    const own = ann({ id: "a", authorId: "mgr3", priority: "required", audience: { storeIds: ["s3"], departments: "all" } });
    const receipts: Receipt[] = [{ announcementId: "a", employeeId: "mgr3", seenAt: "x", acknowledgedAt: "x" }];
    const stats = getAckStats(own, everyone, receipts);
    expect(stats).toMatchObject({ total: 2, acknowledged: 0, notSeen: 2 });
    expect([...stats.groups.acknowledged, ...stats.groups.seenOnly, ...stats.groups.notSeen]).not.toContain(mgr3);
  });

  it("ignores receipts from people outside the audience and for other posts", () => {
    const receipts: Receipt[] = [
      { announcementId: "a", employeeId: "jordan", seenAt: "x", acknowledgedAt: "x" },
      { announcementId: "other", employeeId: "alex", seenAt: "x", acknowledgedAt: "x" },
    ];
    expect(getAckStats(store3, everyone, receipts)).toMatchObject({ total: 3, acknowledged: 0, notSeen: 3 });
  });
});

describe("hasOverdueRecipients", () => {
  const post = ann({ id: "p", priority: "required", dueDate: "2026-10-20", audience: { storeIds: ["s1"], departments: ["stockroom"] } });
  const stats = (receipts: Receipt[]) => getAckStats(post, everyone, receipts);
  const acked: Receipt = { announcementId: "p", employeeId: "jordan", seenAt: "x", acknowledgedAt: "x" };

  it("is true past the due date while someone hasn't acknowledged", () => {
    expect(hasOverdueRecipients(post, stats([]), NOW)).toBe(true);
  });

  it("is false once everyone has acknowledged", () => {
    expect(hasOverdueRecipients(post, stats([acked]), NOW)).toBe(false);
  });

  it("is false before the due date passes and for posts with no due date", () => {
    expect(hasOverdueRecipients({ ...post, dueDate: "2026-10-25" }, stats([]), NOW)).toBe(false);
    expect(hasOverdueRecipients({ ...post, dueDate: undefined }, stats([]), NOW)).toBe(false);
  });
});
