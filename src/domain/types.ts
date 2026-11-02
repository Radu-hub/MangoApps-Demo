// The domain model. Everything here is plain JSON-safe data, so it can be saved to storage as is.

export type Department = "sales_floor" | "stockroom" | "management";
export type Role = "employee" | "store_manager" | "ops";
export type Priority = "fyi" | "required";

export const DEPARTMENTS: readonly Department[] = ["sales_floor", "stockroom", "management"];

export interface Store {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  storeId: string;
  department: Department;
  /** Fake number, used only for the reminder preview. */
  phone: string;
}

/** Who a post targets: the stores and departments must both match. "all" also covers people added later. */
export interface Audience {
  storeIds: string[] | "all";
  departments: Department[] | "all";
}

/** A post from a manager. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  /** ISO timestamp. */
  createdAt: string;
  priority: Priority;
  /** Local calendar date, "YYYY-MM-DD". Only allowed when priority is "required". */
  dueDate?: string;
  audience: Audience;
}

/** What one employee has done with one post. No receipt means they haven't opened it. */
export interface Receipt {
  announcementId: string;
  employeeId: string;
  /** First time the employee opened the post. This is what managers see as "opened". */
  seenAt?: string;
  /** Most recent open, used to tell whether a later reminder text has been read. */
  lastOpenedAt?: string;
  /** When the employee confirmed. Only required posts can have this. */
  acknowledgedAt?: string;
}

/** A reminder a manager sent, and the people it went to. */
export interface ReminderLog {
  id: string;
  announcementId: string;
  sentAt: string;
  employeeIds: string[];
}

/** What a manager fills in before posting. */
export interface Draft {
  title: string;
  body: string;
  priority: Priority;
  dueDate?: string;
  audience: Audience;
}

/** Validation messages for the compose form, keyed by field. */
export type DraftField = "title" | "body" | "dueDate" | "audience";
export type DraftErrors = Partial<Record<DraftField, string>>;
