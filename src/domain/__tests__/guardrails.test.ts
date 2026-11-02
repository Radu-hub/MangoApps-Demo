import { describe, expect, it } from "vitest";
import { countRecentRequiredPosts, getRequiredPostWarning } from "../guardrails";
import { ann, NOW } from "./fixtures";

const HOUR = 60 * 60 * 1000;
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR).toISOString();
const required = (id: string, hoursAgo: number, authorId = "mgr3") =>
  ann({ id, authorId, priority: "required", createdAt: ago(hoursAgo) });

describe("countRecentRequiredPosts", () => {
  it("counts only this author's required posts from the last 7 days", () => {
    const posts = [
      required("a", 1),
      required("b", 6 * 24),
      required("other-author", 2, "ops"),
      ann({ id: "fyi", authorId: "mgr3", createdAt: ago(3) }),
      required("old", 8 * 24),
    ];
    expect(countRecentRequiredPosts("mgr3", posts, NOW)).toBe(2);
  });

  it("excludes a post created exactly 7 days ago and includes one just inside the window", () => {
    expect(countRecentRequiredPosts("mgr3", [required("edge", 7 * 24)], NOW)).toBe(0);
    expect(countRecentRequiredPosts("mgr3", [required("inside", 7 * 24 - 0.001)], NOW)).toBe(1);
  });

  it("ignores posts dated in the future", () => {
    expect(countRecentRequiredPosts("mgr3", [required("future", -1)], NOW)).toBe(0);
  });
});

describe("getRequiredPostWarning", () => {
  it("returns nothing below the threshold", () => {
    expect(getRequiredPostWarning("mgr3", [], NOW)).toBeUndefined();
    expect(getRequiredPostWarning("mgr3", [required("a", 1)], NOW)).toBeUndefined();
  });

  it("warns at 2 or more with the count in the message", () => {
    expect(getRequiredPostWarning("mgr3", [required("a", 1), required("b", 2)], NOW)).toBe(
      "You've sent 2 required updates this week. Too many can make employees tune them out.",
    );
    expect(getRequiredPostWarning("mgr3", [required("a", 1), required("b", 2), required("c", 3)], NOW)).toMatch(
      /^You've sent 3 required/,
    );
  });
});
