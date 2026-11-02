import { describe, expect, it } from "vitest";
import { canPostTo, canSeeAnnouncement, getRecipients, isInAudience, isRecipient } from "../audience";
import { alex, ann, everyone, jordan, mgr3, ops, sam } from "./fixtures";

describe("isInAudience", () => {
  it("includes everyone for an all/all audience", () => {
    const a = ann({ id: "a" });
    expect(everyone.every((e) => isInAudience(e, a))).toBe(true);
  });

  it("requires both store and department to match", () => {
    const a = ann({ id: "a", audience: { storeIds: ["s3"], departments: ["sales_floor"] } });
    expect(isInAudience(alex, a)).toBe(true);
    expect(isInAudience(sam, a)).toBe(false); // right store, wrong department
    expect(isInAudience(jordan, a)).toBe(false); // wrong store and department
  });

  it("supports all stores with specific departments", () => {
    const a = ann({ id: "a", audience: { storeIds: "all", departments: ["stockroom"] } });
    expect(isInAudience(jordan, a)).toBe(true);
    expect(isInAudience(sam, a)).toBe(true);
    expect(isInAudience(alex, a)).toBe(false);
  });

  it("supports specific stores with all departments", () => {
    const a = ann({ id: "a", audience: { storeIds: ["s3"], departments: "all" } });
    expect(getRecipients(everyone, a).map((e) => e.id)).toEqual(["mgr3", "alex", "sam"]);
  });
});

describe("getRecipients", () => {
  it("returns an empty list when the audience matches nobody", () => {
    const a = ann({ id: "a", audience: { storeIds: ["s9"], departments: "all" } });
    expect(getRecipients(everyone, a)).toEqual([]);
  });

  it("excludes the author even when they are in the audience", () => {
    const a = ann({ id: "a", authorId: "mgr3", audience: { storeIds: ["s3"], departments: "all" } });
    expect(isInAudience(mgr3, a)).toBe(true);
    expect(getRecipients(everyone, a).map((e) => e.id)).toEqual(["alex", "sam"]);
  });

  it("returns an empty list for empty selections", () => {
    expect(getRecipients(everyone, ann({ id: "a", audience: { storeIds: [], departments: "all" } }))).toEqual([]);
    expect(getRecipients(everyone, ann({ id: "a", audience: { storeIds: "all", departments: [] } }))).toEqual([]);
  });
});

describe("isRecipient", () => {
  it("treats managers in the audience as recipients", () => {
    const a = ann({ id: "a", authorId: "ops", audience: { storeIds: "all", departments: ["management"] } });
    expect(isRecipient(mgr3, a)).toBe(true);
    expect(isRecipient(alex, a)).toBe(false);
  });

  it("never treats the author as a recipient", () => {
    const a = ann({ id: "a", authorId: "ops", audience: { storeIds: "all", departments: ["management"] } });
    expect(isInAudience(ops, a)).toBe(true);
    expect(isRecipient(ops, a)).toBe(false);
  });
});

describe("canSeeAnnouncement", () => {
  const store3Sales = ann({ id: "a", authorId: "ops", audience: { storeIds: ["s3"], departments: ["sales_floor"] } });

  it("lets recipients and the author see a post", () => {
    expect(canSeeAnnouncement(alex, store3Sales)).toBe(true);
    expect(canSeeAnnouncement(ops, store3Sales)).toBe(true);
  });

  it("hides a post from a manager outside its audience", () => {
    expect(canSeeAnnouncement(mgr3, store3Sales)).toBe(false);
    expect(canSeeAnnouncement(jordan, store3Sales)).toBe(false);
  });
});

describe("canPostTo", () => {
  it("lets ops target any store, including all", () => {
    expect(canPostTo(ops, { storeIds: "all", departments: "all" })).toBe(true);
    expect(canPostTo(ops, { storeIds: ["s2", "s5"], departments: ["stockroom"] })).toBe(true);
  });

  it("lets a store manager target their own store", () => {
    expect(canPostTo(mgr3, { storeIds: ["s3"], departments: ["sales_floor"] })).toBe(true);
  });

  it("blocks a store manager targeting another store", () => {
    expect(canPostTo(mgr3, { storeIds: ["s1"], departments: "all" })).toBe(false);
    expect(canPostTo(mgr3, { storeIds: ["s3", "s1"], departments: "all" })).toBe(false);
    expect(canPostTo(mgr3, { storeIds: "all", departments: "all" })).toBe(false);
  });

  it("blocks regular employees", () => {
    expect(canPostTo(alex, { storeIds: ["s3"], departments: "all" })).toBe(false);
  });
});
