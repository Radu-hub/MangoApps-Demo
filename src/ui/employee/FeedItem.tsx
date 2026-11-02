import { describeDueDate } from "../../domain/dates";
import type { FeedEntry } from "../../domain/feed";
import { useApp } from "../../state/AppStateContext";
import { AudienceChips } from "../AudienceChips";
import { formatDateTime } from "../format";
import { dueTone, ROW_BUTTON, rowTint, type RowState } from "../styles";

/** One row in the feed list. Unacknowledged required rows are tinted; acknowledging clears it. */
export function FeedItem({ entry, onOpen }: { entry: FeedEntry; onOpen: (id: string) => void }) {
  const { state } = useApp();
  const { announcement, receipt, overdue } = entry;
  const unread = !receipt?.seenAt;
  const acknowledged = Boolean(receipt?.acknowledgedAt);
  const rowState: RowState =
    announcement.priority !== "required" || acknowledged ? "plain" : overdue ? "overdue" : "pending";

  return (
    <li>
      <button type="button" onClick={() => onOpen(announcement.id)} className={`p-3 ${ROW_BUTTON} ${rowTint(rowState, true)}`}>
        <div className="mb-1 flex items-start gap-2">
          {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded bg-action" role="img" aria-label="Unread" />}
          <span className="flex-1 font-semibold text-ink">{announcement.title}</span>
          {acknowledged && <span className="text-sm font-semibold text-ink">Confirmed</span>}
        </div>
        <AudienceChips announcement={announcement} stores={state.stores} overdue={overdue} acknowledged={acknowledged} />
        <div className="mt-2 flex gap-3 text-sm text-muted">
          <span>{formatDateTime(announcement.createdAt)}</span>
          {announcement.dueDate && !acknowledged && (
            <span className={dueTone(rowState)}>{describeDueDate(announcement.dueDate, new Date())}</span>
          )}
        </div>
      </button>
    </li>
  );
}
