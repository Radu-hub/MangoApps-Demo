import { describe, expect, it } from "vitest";
import { buildReminderText, createReminderLog, getReminderTargets } from "../reminders";
import type { Receipt } from "../types";
import { alex, ann, everyone, NOW, sam } from "./fixtures";

const store3 = ann({
  id: "a",
  title: "Wet floors",
  priority: "required",
  dueDate: "2026-10-28",
  audience: { storeIds: ["s3"], departments: "all" },
});

describe("getReminderTargets", () => {
  it("targets only recipients who have not acknowledged (seen-only and not seen)", () => {
    const receipts: Receipt[] = [
      { announcementId: "a", employeeId: "mgr3", seenAt: "x", acknowledgedAt: "x" },
      { announcementId: "a", employeeId: "alex", seenAt: "x" },
    ];
    expect(getReminderTargets(store3, everyone, receipts)).toEqual([alex, sam]);
  });

  it("returns nobody when everyone has acknowledged", () => {
    const receipts: Receipt[] = ["mgr3", "alex", "sam"].map((id) => ({
      announcementId: "a",
      employeeId: id,
      acknowledgedAt: "x",
    }));
    expect(getReminderTargets(store3, everyone, receipts)).toEqual([]);
  });

  it("never targets anyone for FYI posts", () => {
    expect(getReminderTargets({ ...store3, priority: "fyi", dueDate: undefined }, everyone, [])).toEqual([]);
  });
});

describe("buildReminderText", () => {
  it("includes the title, due date and link", () => {
    const text = buildReminderText(store3, "https://x.test/a");
    expect(text).toContain('"Wet floors"');
    expect(text).toContain("Oct 28");
    expect(text).toContain("https://x.test/a");
  });
});

describe("createReminderLog", () => {
  it("copies the ids and stamps the time", () => {
    const ids = ["alex"];
    const log = createReminderLog("r1", "a", ids, NOW);
    expect(log).toEqual({ id: "r1", announcementId: "a", employeeIds: ["alex"], sentAt: NOW.toISOString() });
    expect(log.employeeIds).not.toBe(ids);
  });
});
