import { describe, expect, it } from "vitest";
import { getFeedForEmployee } from "../feed";
import type { Receipt } from "../types";
import { alex, ann, jordan, NOW } from "./fixtures";

const created = (day: number) => new Date(2026, 9, day, 9).toISOString();

describe("getFeedForEmployee", () => {
  it("hides posts outside the employee's audience", () => {
    const store3 = ann({ id: "s3", audience: { storeIds: ["s3"], departments: "all" } });
    const feed = getFeedForEmployee(jordan, [store3], [], NOW);
    expect(feed.needsAttention).toEqual([]);
    expect(feed.everythingElse).toEqual([]);
  });

  it("puts unacknowledged required posts in needsAttention and FYI in everythingElse", () => {
    const req = ann({ id: "req", priority: "required" });
    const fyi = ann({ id: "fyi" });
    const feed = getFeedForEmployee(alex, [req, fyi], [], NOW);
    expect(feed.needsAttention.map((e) => e.announcement.id)).toEqual(["req"]);
    expect(feed.everythingElse.map((e) => e.announcement.id)).toEqual(["fyi"]);
  });

  it("moves acknowledged required posts to everythingElse", () => {
    const req = ann({ id: "req", priority: "required" });
    const receipts: Receipt[] = [{ announcementId: "req", employeeId: "alex", seenAt: "x", acknowledgedAt: "x" }];
    const feed = getFeedForEmployee(alex, [req], receipts, NOW);
    expect(feed.needsAttention).toEqual([]);
    expect(feed.everythingElse.map((e) => e.announcement.id)).toEqual(["req"]);
  });

  it("keeps seen-but-unacknowledged required posts in needsAttention", () => {
    const req = ann({ id: "req", priority: "required" });
    const receipts: Receipt[] = [{ announcementId: "req", employeeId: "alex", seenAt: "x" }];
    expect(getFeedForEmployee(alex, [req], receipts, NOW).needsAttention).toHaveLength(1);
  });

  it("orders needsAttention: overdue first, then by due date, then newest", () => {
    const posts = [
      ann({ id: "noDueOld", priority: "required", createdAt: created(10) }),
      ann({ id: "noDueNew", priority: "required", createdAt: created(20) }),
      ann({ id: "dueLater", priority: "required", dueDate: "2026-11-05", createdAt: created(24) }),
      ann({ id: "dueSoon", priority: "required", dueDate: "2026-10-27", createdAt: created(1) }),
      ann({ id: "overdue", priority: "required", dueDate: "2026-10-20", createdAt: created(2) }),
    ];
    const feed = getFeedForEmployee(alex, posts, [], NOW);
    expect(feed.needsAttention.map((e) => e.announcement.id)).toEqual([
      "overdue",
      "dueSoon",
      "dueLater",
      "noDueNew",
      "noDueOld",
    ]);
    expect(feed.needsAttention[0]?.overdue).toBe(true);
    expect(feed.needsAttention[1]?.overdue).toBe(false);
  });

  it("orders everythingElse newest first", () => {
    const posts = [ann({ id: "old", createdAt: created(1) }), ann({ id: "new", createdAt: created(24) })];
    expect(getFeedForEmployee(alex, posts, [], NOW).everythingElse.map((e) => e.announcement.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("leaves out the employee's own posts", () => {
    const own = ann({ id: "own", priority: "required", authorId: "alex" });
    expect(getFeedForEmployee(alex, [own], [], NOW).needsAttention).toEqual([]);
  });

  it("returns empty lists when there are no posts", () => {
    expect(getFeedForEmployee(alex, [], [], NOW)).toEqual({ needsAttention: [], everythingElse: [] });
  });
});
