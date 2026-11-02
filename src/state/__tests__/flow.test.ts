import { describe, expect, it } from "vitest";
import { buildSeed } from "../../data/seed";
import { getFeedForEmployee } from "../../domain/feed";
import { getTextMessages } from "../../domain/notifications";
import { getReminderTargets } from "../../domain/reminders";
import { getAckStats } from "../../domain/stats";
import type { Announcement, Employee } from "../../domain/types";
import { reducer, type Action } from "../reducer";
import type { AppState } from "../types";

// The main loop run through the reducer, the way the UI drives it: post, text, open, confirm, track, remind.
describe("announcement flow", () => {
  const NOW = new Date(2026, 9, 25, 12);
  const minutesLater = (n: number) => new Date(NOW.getTime() + n * 60_000);
  const seed = buildSeed(NOW);
  const person = (id: string): Employee => seed.employees.find((e) => e.id === id)!;
  const alex = person("e-alex");
  const chloe = person("e-chloe-anderson");
  const jordan = person("e-jordan");

  const fittingRooms: Announcement = {
    id: "a-new",
    title: "Fitting room limit",
    body: "Up to 4 items.",
    authorId: "e-rachel",
    createdAt: minutesLater(1).toISOString(),
    priority: "required",
    audience: { storeIds: ["s3"], departments: ["sales_floor"] },
  };

  const run = (actions: Action[]): AppState => actions.reduce(reducer, seed);
  const posted: Action = { type: "POST", announcement: fittingRooms };
  const opened: Action = { type: "MARK_SEEN", announcementId: "a-new", employeeId: "e-alex", at: minutesLater(2).toISOString() };
  const confirmed: Action = { type: "ACKNOWLEDGE", announcementId: "a-new", employeeId: "e-alex", at: minutesLater(3).toISOString() };

  const textsFor = (state: AppState, employee: Employee, at: Date) =>
    getTextMessages(employee, state.announcements, state.receipts, state.reminders, at);

  it("texts only the audience when a required post goes out", () => {
    const state = run([posted]);
    const at = minutesLater(2);
    expect(textsFor(state, alex, at).map((m) => m.announcement.id)).toEqual(["a-new"]);
    expect(textsFor(state, jordan, at).map((m) => m.announcement.id)).not.toContain("a-new");
    expect(getAckStats(fittingRooms, state.employees, state.receipts).total).toBe(5);
  });

  it("clears the text when it's opened but keeps the post on the employee's list until confirmed", () => {
    const at = minutesLater(4);
    const state = run([posted, opened]);
    expect(textsFor(state, alex, at)).toEqual([]);
    const needs = getFeedForEmployee(alex, state.announcements, state.receipts, at).needsAttention;
    expect(needs.map((e) => e.announcement.id)).toContain("a-new");
    expect(getAckStats(fittingRooms, state.employees, state.receipts).seenOnly).toBe(1);
  });

  it("counts the confirmation and moves the post off the employee's list", () => {
    const at = minutesLater(4);
    const state = run([posted, opened, confirmed]);
    expect(getFeedForEmployee(alex, state.announcements, state.receipts, at).needsAttention.map((e) => e.announcement.id)).not.toContain("a-new");
    expect(getAckStats(fittingRooms, state.employees, state.receipts).acknowledged).toBe(1);
  });

  it("reminds only the people who haven't confirmed, and opening the post clears that reminder", () => {
    const afterConfirm = run([posted, opened, confirmed]);
    const targets = getReminderTargets(fittingRooms, afterConfirm.employees, afterConfirm.receipts).map((e) => e.id);
    expect(targets).toHaveLength(4);
    expect(targets).not.toContain("e-alex");

    const sentAt = minutesLater(5).toISOString();
    const reminded = reducer(afterConfirm, {
      type: "SEND_REMINDER",
      log: { id: "r1", announcementId: "a-new", sentAt, employeeIds: targets },
    });
    const at = minutesLater(6);
    const chloeTexts = textsFor(reminded, chloe, at).filter((m) => m.announcement.id === "a-new");
    expect(chloeTexts.map((m) => m.kind)).toEqual(["reminder", "posted"]);
    expect(textsFor(reminded, alex, at)).toEqual([]);

    const chloeOpened = reducer(reminded, {
      type: "MARK_SEEN",
      announcementId: "a-new",
      employeeId: chloe.id,
      at: at.toISOString(),
    });
    expect(textsFor(chloeOpened, chloe, at).filter((m) => m.announcement.id === "a-new")).toEqual([]);
  });
});
