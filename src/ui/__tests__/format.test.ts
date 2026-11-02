import { describe, expect, it } from "vitest";
import { departmentsLabel, formatDateTime, formatDay, formatSentAt, peopleCount, shortStoreName, storesLabel } from "../format";

const STORES = [
  { id: "s1", name: "Store 1 – Downtown" },
  { id: "s3", name: "Store 3 – Bellevue Square" },
];

describe("peopleCount", () => {
  it("uses the singular only for one", () => {
    expect(peopleCount(0)).toBe("0 people");
    expect(peopleCount(1)).toBe("1 person");
    expect(peopleCount(4)).toBe("4 people");
  });
});

describe("date formats", () => {
  const friday = new Date(2026, 9, 30, 16, 40);

  it("formats a day", () => {
    expect(formatDay(friday)).toBe("Fri, Oct 30");
  });

  it("formats a day and time", () => {
    // Node may use a narrow no-break space before PM, so normalize whitespace.
    expect(formatDateTime(friday.toISOString()).replace(/\s/g, " ")).toBe("Fri, Oct 30, 4:40 PM");
  });
});

describe("formatSentAt", () => {
  const now = new Date(2026, 9, 25, 12, 0);
  const sent = (date: Date) => formatSentAt(date.toISOString(), now).replace(/\s/g, " ");

  it('says "now" within the first minute', () => {
    expect(sent(now)).toBe("now");
    expect(sent(new Date(2026, 9, 25, 11, 59, 30))).toBe("now");
  });

  it("counts minutes during the first hour", () => {
    expect(sent(new Date(2026, 9, 25, 11, 48))).toBe("12m ago");
    expect(sent(new Date(2026, 9, 25, 11, 1))).toBe("59m ago");
  });

  it("shows the time for earlier today", () => {
    expect(sent(new Date(2026, 9, 25, 9, 5))).toBe("9:05 AM");
  });

  it("shows the day for anything older", () => {
    expect(sent(new Date(2026, 9, 22, 9, 5))).toBe("Thu, Oct 22");
  });
});

describe("audience labels", () => {
  it("shortens store names", () => {
    expect(shortStoreName(STORES[1]!)).toBe("Store 3");
    expect(shortStoreName({ id: "x", name: "Warehouse" })).toBe("Warehouse");
  });

  it("labels stores", () => {
    expect(storesLabel("all", STORES)).toBe("All stores");
    expect(storesLabel(["s1", "s3"], STORES)).toBe("Store 1, Store 3");
  });

  it("labels departments", () => {
    expect(departmentsLabel("all")).toBe("All departments");
    expect(departmentsLabel(["sales_floor", "stockroom"])).toBe("Sales floor, Stockroom");
  });
});
