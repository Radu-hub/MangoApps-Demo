import { describe, expect, it } from "vitest";
import { getFollowUps } from "../followUps";
import type { Receipt } from "../types";
import { alex, ann, everyone, NOW, sam } from "./fixtures";

const store3 = { storeIds: ["s3"], departments: "all" as const };

describe("getFollowUps", () => {
  it("is empty when nobody is overdue", () => {
    const notYetDue = ann({ id: "a", priority: "required", dueDate: "2026-10-30", audience: store3 });
    const fyi = ann({ id: "b", audience: store3 });
    expect(getFollowUps([notYetDue, fyi], everyone, [], NOW)).toEqual({ totalOverduePeople: 0, posts: [] });
  });

  it("is not overdue on the due date itself", () => {
    const dueToday = ann({ id: "a", priority: "required", dueDate: "2026-10-25", audience: store3 });
    expect(getFollowUps([dueToday], everyone, [], NOW).posts).toEqual([]);
  });

  it("lists overdue unacknowledged recipients, excluding those who acknowledged and the author", () => {
    const a = ann({ id: "a", authorId: "mgr3", priority: "required", dueDate: "2026-10-20", audience: store3 });
    const receipts: Receipt[] = [{ announcementId: "a", employeeId: "alex", seenAt: "x", acknowledgedAt: "x" }];
    const result = getFollowUps([a], everyone, receipts, NOW);
    expect(result.totalOverduePeople).toBe(1);
    expect(result.posts[0]?.overdue).toEqual([sam]);
  });

  it("counts each person once across posts and sorts by most overdue people", () => {
    const small = ann({
      id: "small",
      authorId: "ops",
      priority: "required",
      dueDate: "2026-10-18",
      audience: { storeIds: ["s3"], departments: ["sales_floor"] },
    });
    const big = ann({ id: "big", authorId: "ops", priority: "required", dueDate: "2026-10-22", audience: store3 });
    const result = getFollowUps([small, big], everyone, [], NOW);
    expect(result.posts.map((p) => p.announcement.id)).toEqual(["big", "small"]);
    expect(result.posts[1]?.overdue).toEqual([alex]);
    expect(result.totalOverduePeople).toBe(3); // mgr3, alex, sam
  });

  it("breaks ties by earliest due date", () => {
    const later = ann({ id: "later", priority: "required", dueDate: "2026-10-22", audience: store3 });
    const earlier = ann({ id: "earlier", priority: "required", dueDate: "2026-10-18", audience: store3 });
    expect(getFollowUps([later, earlier], everyone, [], NOW).posts.map((p) => p.announcement.id)).toEqual([
      "earlier",
      "later",
    ]);
  });
});
