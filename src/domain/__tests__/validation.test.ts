import { describe, expect, it } from "vitest";
import type { Draft } from "../types";
import { hasErrors, validateDraft } from "../validation";
import { alex, everyone, mgr3, NOW, ops } from "./fixtures";

const valid: Draft = {
  title: "Hello",
  body: "Body text",
  priority: "required",
  dueDate: "2026-10-28",
  audience: { storeIds: ["s3"], departments: "all" },
};

describe("validateDraft", () => {
  it("accepts a valid draft", () => {
    expect(validateDraft(valid, everyone, mgr3, NOW)).toEqual({});
  });

  it("flags an empty or whitespace title and body", () => {
    const errors = validateDraft({ ...valid, title: "  ", body: "" }, everyone, mgr3, NOW);
    expect(errors.title).toBeDefined();
    expect(errors.body).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it("flags a due date in the past", () => {
    expect(validateDraft({ ...valid, dueDate: "2026-10-24" }, everyone, mgr3, NOW).dueDate).toMatch(/past/);
  });

  it("allows a due date of today", () => {
    expect(validateDraft({ ...valid, dueDate: "2026-10-25" }, everyone, mgr3, NOW).dueDate).toBeUndefined();
  });

  it("allows a required post with no due date", () => {
    expect(validateDraft({ ...valid, dueDate: undefined }, everyone, mgr3, NOW)).toEqual({});
  });

  it("flags a due date on an FYI post", () => {
    expect(validateDraft({ ...valid, priority: "fyi" }, everyone, mgr3, NOW).dueDate).toMatch(/Action required/);
  });

  it("flags a malformed due date", () => {
    expect(validateDraft({ ...valid, dueDate: "2026-02-30" }, everyone, mgr3, NOW).dueDate).toMatch(/valid/);
  });

  it("flags a store manager targeting another store", () => {
    const draft = { ...valid, audience: { storeIds: ["s1"], departments: "all" as const } };
    expect(validateDraft(draft, everyone, mgr3, NOW).audience).toMatch(/own store/);
  });

  it("flags a store manager targeting all stores", () => {
    const draft = { ...valid, audience: { storeIds: "all" as const, departments: "all" as const } };
    expect(validateDraft(draft, everyone, mgr3, NOW).audience).toMatch(/own store/);
  });

  it("lets ops target all stores", () => {
    const draft = { ...valid, audience: { storeIds: "all" as const, departments: "all" as const } };
    expect(validateDraft(draft, everyone, ops, NOW)).toEqual({});
  });

  it("flags an audience that matches zero people", () => {
    const draft = { ...valid, audience: { storeIds: ["s9"], departments: "all" as const } };
    expect(validateDraft(draft, everyone, ops, NOW).audience).toMatch(/doesn't include anyone/);
  });

  it("doesn't count the author as a recipient", () => {
    const draft = { ...valid, audience: { storeIds: ["s3"], departments: ["management" as const] } };
    expect(validateDraft(draft, everyone, mgr3, NOW).audience).toMatch(/doesn't include anyone/);
  });

  it("flags employees trying to post", () => {
    expect(validateDraft(valid, everyone, alex, NOW).audience).toBeDefined();
  });
});
