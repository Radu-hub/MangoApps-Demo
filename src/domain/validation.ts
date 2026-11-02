import { canPostTo, getRecipients } from "./audience";
import { endOfLocalDay } from "./dates";
import type { Draft, DraftErrors, Employee } from "./types";

/** Checks a draft for the compose form and the reducer. Returns one message per invalid field; empty means valid. */
export function validateDraft(draft: Draft, employees: Employee[], author: Employee, now: Date): DraftErrors {
  const errors: DraftErrors = {};

  if (!draft.title.trim()) errors.title = "Add a title.";
  if (!draft.body.trim()) errors.body = "Add a message.";

  if (draft.dueDate) {
    const end = endOfLocalDay(draft.dueDate);
    if (draft.priority === "fyi") errors.dueDate = "Only Action required posts can have a due date.";
    else if (!end) errors.dueDate = "Enter a valid date.";
    else if (end.getTime() < now.getTime()) errors.dueDate = "Due date can't be in the past.";
  }

  if (!canPostTo(author, draft.audience)) {
    errors.audience =
      author.role === "store_manager" ? "You can only post to your own store." : "You can't post announcements.";
  } else if (getRecipients(employees, { ...draft, authorId: author.id }).length === 0) {
    errors.audience = "This audience doesn't include anyone.";
  }

  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
