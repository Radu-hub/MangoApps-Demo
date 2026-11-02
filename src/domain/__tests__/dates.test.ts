import { describe, expect, it } from "vitest";
import { describeDueDate, endOfLocalDay, isOverdue, parseLocalDate, toLocalDateString } from "../dates";
import { ann } from "./fixtures";

describe("date helpers", () => {
  it("round-trips local dates", () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(parseLocalDate("2026-01-05")?.getTime()).toBe(new Date(2026, 0, 5).getTime());
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseLocalDate("")).toBeUndefined();
    expect(parseLocalDate("2026-13-01")).toBeUndefined();
    expect(parseLocalDate("2026-02-30")).toBeUndefined();
    expect(parseLocalDate("10/25/2026")).toBeUndefined();
  });

  it("computes the end of the local day", () => {
    expect(endOfLocalDay("2026-10-25")?.getTime()).toBe(new Date(2026, 9, 25, 23, 59, 59, 999).getTime());
  });
});

describe("isOverdue", () => {
  const due = ann({ id: "a", priority: "required", dueDate: "2026-10-25" });

  it("is not overdue at any point on the due date itself", () => {
    expect(isOverdue(due, undefined, new Date(2026, 9, 25, 0, 0))).toBe(false);
    expect(isOverdue(due, undefined, new Date(2026, 9, 25, 23, 59, 59, 999))).toBe(false);
  });

  it("is overdue one millisecond after the due date ends", () => {
    expect(isOverdue(due, undefined, new Date(2026, 9, 26, 0, 0, 0, 0))).toBe(true);
  });

  it("is never overdue once acknowledged", () => {
    const receipt = { announcementId: "a", employeeId: "x", seenAt: "s", acknowledgedAt: "t" };
    expect(isOverdue(due, receipt, new Date(2026, 10, 30))).toBe(false);
  });

  it("still counts as overdue when only seen", () => {
    const receipt = { announcementId: "a", employeeId: "x", seenAt: "s" };
    expect(isOverdue(due, receipt, new Date(2026, 9, 27))).toBe(true);
  });

  it("is never overdue without a due date or for FYI posts", () => {
    const later = new Date(2030, 0, 1);
    expect(isOverdue(ann({ id: "a", priority: "required" }), undefined, later)).toBe(false);
    expect(isOverdue(ann({ id: "a", priority: "fyi", dueDate: "2026-10-25" }), undefined, later)).toBe(false);
  });

  describe("describeDueDate", () => {
    const now = new Date(2026, 9, 25, 12); // Sun, Oct 25

    it("names future dates", () => {
      expect(describeDueDate("2026-10-30", now)).toBe("Due Fri, Oct 30");
      expect(describeDueDate("2026-10-26", now)).toBe("Due Mon, Oct 26");
    });

    it("says today for the due date itself, even late in the day", () => {
      expect(describeDueDate("2026-10-25", now)).toBe("Due today");
      expect(describeDueDate("2026-10-25", new Date(2026, 9, 25, 23, 59))).toBe("Due today");
    });

    it("counts days overdue, singular and plural", () => {
      expect(describeDueDate("2026-10-24", now)).toBe("Overdue by 1 day");
      expect(describeDueDate("2026-10-23", now)).toBe("Overdue by 2 days");
    });

    it("counts calendar days across a DST change", () => {
      expect(describeDueDate("2026-10-30", new Date(2026, 10, 3, 9))).toBe("Overdue by 4 days");
    });

    it("leaves malformed values readable", () => {
      expect(describeDueDate("soon", now)).toBe("Due soon");
    });
  });
});
