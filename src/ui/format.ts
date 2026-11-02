import { formatDay } from "../domain/dates";
import type { Audience, Department, Role, Store } from "../domain/types";

// Display names for the domain's enum values.
export const DEPARTMENT_LABELS: Record<Department, string> = {
  sales_floor: "Sales floor",
  stockroom: "Stockroom",
  management: "Management",
};

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Employee",
  store_manager: "Store manager",
  ops: "Operations",
};

/** "Fri, Oct 30, 4:40 PM" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDay(date)}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/** When a text arrived, as a phone shows it: "now", "12m ago", "4:40 PM" earlier today, otherwise "Thu, Oct 22". */
export function formatSentAt(iso: string, now: Date): string {
  const sent = new Date(iso);
  const minutes = Math.floor((now.getTime() - sent.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (sent.toDateString() === now.toDateString()) {
    return sent.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return formatDay(sent);
}

export { formatDay, formatShortDate as formatDueDate } from "../domain/dates";

/** "1 person", "4 people" */
export function peopleCount(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

/** "Store 3 – Bellevue Square" → "Store 3" */
export function shortStoreName(store: Store): string {
  return store.name.split(" – ")[0] ?? store.name;
}

/** "All stores", or the short names of the targeted stores: "Store 1, Store 3". */
export function storesLabel(storeIds: Audience["storeIds"], stores: Store[]): string {
  if (storeIds === "all") return "All stores";
  return stores
    .filter((s) => storeIds.includes(s.id))
    .map(shortStoreName)
    .join(", ");
}

/** "All departments", or the targeted departments: "Sales floor, Stockroom". */
export function departmentsLabel(departments: Audience["departments"]): string {
  if (departments === "all") return "All departments";
  return departments.map((d) => DEPARTMENT_LABELS[d]).join(", ");
}
