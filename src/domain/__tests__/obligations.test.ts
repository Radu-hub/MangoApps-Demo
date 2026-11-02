import { describe, expect, it } from "vitest";
import { getEmployeeObligations } from "../obligations";
import type { Receipt } from "../types";
import { alex, ann, jordan, NOW } from "./fixtures";

const iso = (day: number, hour = 9) => new Date(2026, 9, day, hour).toISOString();
const ack = (announcementId: string, at: string): Receipt => ({
  announcementId,
  employeeId: "alex",
  seenAt: at,
  acknowledgedAt: at,
});

describe("getEmployeeObligations", () => {
  const overdue = ann({ id: "overdue", priority: "required", dueDate: "2026-10-20" });
  const soon = ann({ id: "soon", priority: "required", dueDate: "2026-10-27" });
  const noDue = ann({ id: "noDue", priority: "required" });
  const fyi = ann({ id: "fyi" });

  it("lists outstanding required posts with overdue first", () => {
    const result = getEmployeeObligations(alex, [noDue, soon, overdue, fyi], [], NOW);
    expect(result.outstanding.map((e) => e.announcement.id)).toEqual(["overdue", "soon", "noDue"]);
    expect(result.outstanding[0]?.overdue).toBe(true);
    expect(result.history).toEqual([]);
  });

  it("moves acknowledged posts to history, newest acknowledgement first, and ignores FYI", () => {
    const receipts = [ack("soon", iso(22)), ack("noDue", iso(24))];
    const result = getEmployeeObligations(alex, [noDue, soon, overdue, fyi], receipts, NOW);
    expect(result.outstanding.map((e) => e.announcement.id)).toEqual(["overdue"]);
    expect(result.history.map((h) => h.announcement.id)).toEqual(["noDue", "soon"]);
  });

  it("flags acknowledgements made after the due date as late", () => {
    const receipts = [ack("overdue", iso(21)), ack("soon", iso(27, 23))];
    const result = getEmployeeObligations(alex, [overdue, soon], receipts, NOW);
    expect(result.history.find((h) => h.announcement.id === "overdue")?.late).toBe(true);
    expect(result.history.find((h) => h.announcement.id === "soon")?.late).toBe(false); // on the due date
  });

  it("does not count a seen-only post as acknowledged", () => {
    const receipts: Receipt[] = [{ announcementId: "soon", employeeId: "alex", seenAt: iso(24) }];
    const result = getEmployeeObligations(alex, [soon], receipts, NOW);
    expect(result.outstanding).toHaveLength(1);
    expect(result.history).toEqual([]);
  });

  it("only includes posts in the employee's audience", () => {
    const store3 = ann({ id: "s3", priority: "required", audience: { storeIds: ["s3"], departments: "all" } });
    expect(getEmployeeObligations(jordan, [store3], [], NOW)).toEqual({ outstanding: [], history: [] });
  });
});
