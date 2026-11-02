import type { Announcement, Audience, Employee } from "./types";

/** True when the employee's store and department are both covered by the post's audience. */
export function isInAudience(employee: Employee, { audience }: Pick<Announcement, "audience">): boolean {
  const storeOk = audience.storeIds === "all" || audience.storeIds.includes(employee.storeId);
  const deptOk = audience.departments === "all" || audience.departments.includes(employee.department);
  return storeOk && deptOk;
}

/** Saved posts have an author; a draft being composed may not be attributed yet. */
type Targetable = Pick<Announcement, "audience"> & { authorId?: string };

/**
 * The one recipient rule: in the audience and not the author. Managers are recipients like anyone
 * else, but an author never needs to read or confirm their own post.
 */
export function isRecipient(employee: Employee, announcement: Targetable): boolean {
  return employee.id !== announcement.authorId && isInAudience(employee, announcement);
}

/** Everyone who receives the post, computed live from the current employee list. */
export function getRecipients(employees: Employee[], announcement: Targetable): Employee[] {
  return employees.filter((e) => isRecipient(e, announcement));
}

/** Whether a viewer may see a post at all: they wrote it or they are a recipient. */
export function canSeeAnnouncement(viewer: Employee, announcement: Announcement): boolean {
  return announcement.authorId === viewer.id || isRecipient(viewer, announcement);
}

/** Store managers may target only their own store; ops may target any store; employees cannot post. */
export function canPostTo(author: Employee, audience: Audience): boolean {
  switch (author.role) {
    case "ops":
      return true;
    case "store_manager":
      return audience.storeIds !== "all" && audience.storeIds.every((id) => id === author.storeId);
    case "employee":
      return false;
  }
}

/** Whether this person gets the manager screens at all. */
export function canPost(author: Employee): boolean {
  return author.role !== "employee";
}
