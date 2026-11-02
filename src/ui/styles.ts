import type { Priority } from "../domain/types";

// Shared class strings so surfaces, buttons and focus states stay consistent across views.
// Colors come from the Summit theme in index.css; every text pair meets WCAG AA (4.5:1).

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Focus ring drawn inside list rows so it isn't clipped by the list border. */
const ROW_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

/** The single bordered panel around a post or the compose form. */
export const PANEL = "rounded border border-line bg-white";

/** A bordered list with divided rows. */
export const LIST = "divide-y divide-divider rounded border border-line bg-white";

/** A clickable row inside a LIST; pair it with rowTint(…, true) for the background and hover. */
export const ROW_BUTTON = `block w-full text-left ${ROW_FOCUS}`;

export const BUTTON_PRIMARY = `rounded bg-action font-semibold text-white enabled:hover:bg-action-dark ${FOCUS_RING}`;

export const BUTTON_SECONDARY = `rounded border border-ink bg-white font-semibold text-ink hover:bg-page ${FOCUS_RING}`;

export const INPUT = `rounded border border-muted bg-white text-ink ${FOCUS_RING}`;

export const LINK = `rounded font-semibold text-action underline-offset-2 hover:underline ${FOCUS_RING}`;

/** How much a row asks for attention: an unacknowledged required post is "pending", past its due date "overdue". */
export type RowState = "plain" | "pending" | "overdue";

/** 4px left bar plus tinted background for rows that need attention. Plain rows keep a transparent bar so titles line up. */
export function rowTint(state: RowState, interactive = false): string {
  switch (state) {
    case "overdue":
      return `border-l-4 border-l-danger bg-danger-wash ${interactive ? "hover:bg-danger-tint" : ""}`;
    case "pending":
      return `border-l-4 border-l-accent bg-accent-wash ${interactive ? "hover:bg-accent-tint" : ""}`;
    case "plain":
      return `border-l-4 border-l-transparent ${interactive ? "hover:bg-page" : ""}`;
  }
}

/** Due-date text in the dark tone matching the row tint. */
export function dueTone(state: RowState): string {
  if (state === "overdue") return "font-semibold text-danger-ink";
  return state === "pending" ? "text-accent-ink" : "";
}

/** Solid 4px left bar: accent for required, danger once overdue. FYI keeps the space so titles line up. */
export function priorityBar(priority: Priority, overdue: boolean): string {
  if (priority === "fyi") return "border-l-4 border-l-transparent";
  return overdue ? "border-l-4 border-l-danger" : "border-l-4 border-l-accent";
}
