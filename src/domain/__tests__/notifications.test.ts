import { describe, expect, it } from "vitest";
import { buildNotificationText, getTextMessages } from "../notifications";
import { markSeen } from "../receipts";
import type { Receipt, ReminderLog } from "../types";
import { alex, ann, jordan, NOW, sam } from "./fixtures";

describe("buildNotificationText", () => {
  it("includes the title and the due date", () => {
    expect(buildNotificationText({ title: "Wet floors", dueDate: "2026-10-28" })).toBe(
      "Summit: Action required – Wet floors, due Wed, Oct 28. Tap to read.",
    );
  });

  it("omits the due clause when there is no due date", () => {
    expect(buildNotificationText({ title: "Wet floors" })).toBe("Summit: Action required – Wet floors. Tap to read.");
  });
});

describe("getTextMessages", () => {
  const at = (day: number, hour = 9, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
  const overdue = ann({ id: "overdue", title: "Old", priority: "required", dueDate: "2026-10-20", createdAt: at(15) });
  const fresh = ann({ id: "fresh", title: "New", priority: "required", createdAt: at(25, 11) });
  const fyi = ann({ id: "fyi", createdAt: at(24) });
  const ids = (ms: { id: string }[]) => ms.map((m) => m.id);

  it("sends one text per required post, newest first, so a new post is on top even when an older one is overdue", () => {
    const messages = getTextMessages(alex, [overdue, fresh, fyi], [], [], NOW);
    expect(ids(messages)).toEqual(["post-fresh", "post-overdue"]);
    expect(messages[0]?.text).toBe("Summit: Action required – New. Tap to read.");
    expect(messages[0]?.announcement.id).toBe("fresh");
  });

  it("adds a reminder text only for the people the reminder went to", () => {
    const log: ReminderLog = { id: "r1", announcementId: "overdue", sentAt: at(25, 11, 15), employeeIds: ["alex"] };
    const later: ReminderLog = { ...log, id: "r2", sentAt: at(25, 11, 45) };
    const alexTexts = getTextMessages(alex, [overdue, fresh], [], [log, later], NOW);
    expect(ids(alexTexts)).toEqual(["reminder-r2", "reminder-r1", "post-fresh", "post-overdue"]);
    expect(alexTexts[0]?.kind).toBe("reminder");
    expect(alexTexts[0]?.text).toContain('Please read and confirm "Old" by Tue, Oct 20');
    expect(alexTexts[0]?.text).toContain("https://updates.summit.example/a/overdue");
    expect(ids(getTextMessages(sam, [overdue], [], [log], NOW))).toEqual(["post-overdue"]);
  });

  it("clears a text once the post is opened after it arrived, and shows a reminder sent after that", () => {
    const opened: Receipt[] = [{ announcementId: "overdue", employeeId: "alex", seenAt: at(20) }];
    expect(getTextMessages(alex, [overdue], opened, [], NOW)).toEqual([]);
    const before: ReminderLog = { id: "r1", announcementId: "overdue", sentAt: at(18), employeeIds: ["alex"] };
    const after: ReminderLog = { id: "r2", announcementId: "overdue", sentAt: at(24), employeeIds: ["alex"] };
    expect(ids(getTextMessages(alex, [overdue], opened, [before, after], NOW))).toEqual(["reminder-r2"]);
  });

  it("clears a reminder when a post that was already open gets opened again", () => {
    const log: ReminderLog = { id: "r1", announcementId: "overdue", sentAt: at(24), employeeIds: ["alex"] };
    const firstOpen = markSeen([], "overdue", "alex", new Date(at(20)));
    expect(ids(getTextMessages(alex, [overdue], firstOpen, [log], NOW))).toEqual(["reminder-r1"]);
    const reopened = markSeen(firstOpen, "overdue", "alex", new Date(at(25)));
    expect(getTextMessages(alex, [overdue], reopened, [log], NOW)).toEqual([]);
  });

  it("drops every text for a post once it's acknowledged", () => {
    const log: ReminderLog = { id: "r1", announcementId: "overdue", sentAt: at(24), employeeIds: ["alex"] };
    const acked: Receipt[] = [{ announcementId: "overdue", employeeId: "alex", seenAt: at(16), acknowledgedAt: at(16, 10) }];
    expect(getTextMessages(alex, [overdue], acked, [log], NOW)).toEqual([]);
  });

  it("ignores posts outside the audience and the author's own posts", () => {
    const store3 = ann({ id: "s3", priority: "required", audience: { storeIds: ["s3"], departments: "all" } });
    expect(getTextMessages(jordan, [store3], [], [], NOW)).toEqual([]);
    expect(getTextMessages(alex, [{ ...store3, authorId: "alex" }], [], [], NOW)).toEqual([]);
  });

  it("ignores texts timestamped after now", () => {
    const future = ann({ id: "future", priority: "required", createdAt: at(26) });
    expect(getTextMessages(alex, [future], [], [], NOW)).toEqual([]);
  });
});
