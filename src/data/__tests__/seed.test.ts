import { describe, expect, it } from "vitest";
import { getFeedForEmployee } from "../../domain/feed";
import { getTextMessages } from "../../domain/notifications";
import { getAckStats } from "../../domain/stats";
import { buildSeed, DEMO_VIEWER_IDS } from "../seed";

const NOW = new Date(2026, 9, 25, 12);
const seed = buildSeed(NOW);
const byId = (id: string) => seed.employees.find((e) => e.id === id)!;

describe("seed data", () => {
  it("is deterministic for a given now", () => {
    expect(buildSeed(NOW)).toEqual(seed);
  });

  it("has 5 stores, about 40 employees and unique ids", () => {
    expect(seed.stores).toHaveLength(5);
    expect(seed.employees.length).toBeGreaterThanOrEqual(38);
    expect(new Set(seed.employees.map((e) => e.id)).size).toBe(seed.employees.length);
  });

  it("includes the demo characters with the right roles", () => {
    DEMO_VIEWER_IDS.forEach((id) => expect(byId(id)).toBeDefined());
    expect(byId("e-michael").role).toBe("ops");
    expect(byId("e-rachel")).toMatchObject({ role: "store_manager", storeId: "s3" });
    expect(byId("e-alex")).toMatchObject({ role: "employee", storeId: "s3", department: "sales_floor" });
    expect(byId("e-jordan")).toMatchObject({ role: "employee", storeId: "s1", department: "stockroom" });
  });

  it("gives Alex unconfirmed required posts, including an overdue one, but no unread texts", () => {
    const alex = byId("e-alex");
    const feed = getFeedForEmployee(alex, seed.announcements, seed.receipts, NOW);
    expect(feed.needsAttention.length).toBeGreaterThanOrEqual(1);
    expect(feed.needsAttention.some((e) => e.overdue)).toBe(true);
    expect(getTextMessages(alex, seed.announcements, seed.receipts, seed.reminders, NOW)).toEqual([]);
  });

  it("starts Jordan with one text, for the all-staff post he hasn't opened", () => {
    const texts = getTextMessages(byId("e-jordan"), seed.announcements, seed.receipts, seed.reminders, NOW);
    expect(texts.map((t) => t.announcement.id)).toEqual(["a-wet-floor"]);
  });

  it("leaves other Store 3 staff overdue on Rachel's cash-count post for the follow-up strip", () => {
    const post = seed.announcements.find((a) => a.id === "a-cash-count")!;
    const stats = getAckStats(post, seed.employees, seed.receipts);
    expect(stats.acknowledged).toBeLessThan(stats.total);
  });

  it("has a realistic mix of receipt states on the all-staff post", () => {
    const stats = getAckStats(seed.announcements[0]!, seed.employees, seed.receipts);
    expect(stats.acknowledged).toBeGreaterThan(0);
    expect(stats.seenOnly).toBeGreaterThan(0);
    expect(stats.notSeen).toBeGreaterThan(0);
  });

  it("has a management-only required post from Michael that store managers partly acknowledged", () => {
    const post = seed.announcements.find((a) => a.audience.departments !== "all" && a.audience.departments.includes("management"));
    expect(post).toMatchObject({ authorId: "e-michael", priority: "required", audience: { storeIds: "all", departments: ["management"] } });
    const stats = getAckStats(post!, seed.employees, seed.receipts);
    expect(stats.total).toBe(5); // the five store managers; Michael is the author
    expect(stats.groups.acknowledged.every((e) => e.role === "store_manager")).toBe(true);
    expect(stats.acknowledged).toBeGreaterThan(0);
    expect(stats.groups.notSeen.map((e) => e.id)).toContain("e-rachel");
  });

  it("gives Rachel her own outstanding required posts as a recipient", () => {
    const feed = getFeedForEmployee(byId("e-rachel"), seed.announcements, seed.receipts, NOW);
    expect(feed.needsAttention.map((e) => e.announcement.id)).toContain("a-shrink-audit");
    // She never sees her own posts as obligations.
    expect(feed.needsAttention.every((e) => e.announcement.authorId !== "e-rachel")).toBe(true);
  });

  it("never acknowledges FYI posts", () => {
    const fyiIds = new Set(seed.announcements.filter((a) => a.priority === "fyi").map((a) => a.id));
    expect(seed.receipts.some((r) => fyiIds.has(r.announcementId) && r.acknowledgedAt)).toBe(false);
  });
});
