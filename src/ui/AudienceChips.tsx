import type { Announcement, Store } from "../domain/types";
import { Chip } from "./Chip";
import { departmentsLabel, storesLabel } from "./format";

/** The priority, store and department labels shown on every post. */
export function AudienceChips({
  announcement,
  stores,
  overdue = false,
  acknowledged = false,
}: {
  announcement: Announcement;
  stores: Store[];
  /** Switches the "Action required" label from accent to danger. */
  overdue?: boolean;
  /** Once acknowledged the label keeps its text but drops the highlight. */
  acknowledged?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {announcement.priority === "required" ? (
        <Chip tone={acknowledged ? "neutral" : overdue ? "danger" : "accent"}>Action required</Chip>
      ) : (
        <Chip>FYI</Chip>
      )}
      <Chip>{storesLabel(announcement.audience.storeIds, stores)}</Chip>
      <Chip>{departmentsLabel(announcement.audience.departments)}</Chip>
    </div>
  );
}
