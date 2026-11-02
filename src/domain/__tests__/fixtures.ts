import type { Announcement, Employee } from "../types";

// All times are local, so tests behave the same in any timezone.
export const NOW = new Date(2026, 9, 25, 12, 0, 0); // Sun Oct 25 2026, noon local

export function emp(overrides: Partial<Employee> & Pick<Employee, "id">): Employee {
  return {
    name: overrides.id,
    role: "employee",
    storeId: "s1",
    department: "sales_floor",
    phone: "555-0100",
    ...overrides,
  };
}

export function ann(overrides: Partial<Announcement> & Pick<Announcement, "id">): Announcement {
  return {
    title: "Title",
    body: "Body",
    authorId: "ops",
    createdAt: new Date(2026, 9, 20, 9).toISOString(),
    priority: "fyi",
    audience: { storeIds: "all", departments: "all" },
    ...overrides,
  };
}

export const ops = emp({ id: "ops", role: "ops", storeId: "s1", department: "management" });
export const mgr3 = emp({ id: "mgr3", role: "store_manager", storeId: "s3", department: "management" });
export const alex = emp({ id: "alex", storeId: "s3", department: "sales_floor" });
export const jordan = emp({ id: "jordan", storeId: "s1", department: "stockroom" });
export const sam = emp({ id: "sam", storeId: "s3", department: "stockroom" });

export const everyone = [ops, mgr3, alex, jordan, sam];
