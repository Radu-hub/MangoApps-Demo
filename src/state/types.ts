import type { Announcement, Employee, Receipt, ReminderLog, Store } from "../domain/types";

/** Bump when the stored shape changes; saved data from another version is replaced by the seed. */
export const STATE_VERSION = 1;

/** Everything the app stores. `viewerId` is the person picked in the "Viewing as" menu. */
export interface AppState {
  version: typeof STATE_VERSION;
  viewerId: string;
  stores: Store[];
  employees: Employee[];
  announcements: Announcement[];
  receipts: Receipt[];
  reminders: ReminderLog[];
}
