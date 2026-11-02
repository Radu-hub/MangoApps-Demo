import { getAckStats, hasOverdueRecipients } from "../../domain/stats";
import { useApp } from "../../state/AppStateContext";
import { AudienceChips } from "../AudienceChips";
import { formatDateTime, formatDueDate } from "../format";
import { ProgressBar } from "../ProgressBar";
import { BUTTON_PRIMARY, LIST, priorityBar, ROW_BUTTON } from "../styles";
import { FollowUpStrip } from "./FollowUpStrip";

/** The Manage home screen: the follow-up strip, then the manager's own posts with their progress, newest first. */
export function AnnouncementList({ onCompose, onOpen }: { onCompose: () => void; onOpen: (id: string) => void }) {
  const { state, viewer } = useApp();
  const mine = state.announcements
    .filter((a) => a.authorId === viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = new Date();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Your announcements</h1>
        <button type="button" onClick={onCompose} className={`px-4 py-2 text-sm ${BUTTON_PRIMARY}`}>
          New announcement
        </button>
      </div>

      <FollowUpStrip announcements={mine} onOpen={onOpen} />

      {mine.length === 0 ? (
        <p className="rounded border border-line bg-white p-8 text-center text-muted">
          You haven't posted anything yet. Use “New announcement” to reach your team.
        </p>
      ) : (
        <ul className={LIST}>
          {mine.map((a) => {
            const stats = getAckStats(a, state.employees, state.receipts);
            const required = a.priority === "required";
            const done = required ? stats.acknowledged : stats.opened;
            const overdue = hasOverdueRecipients(a, stats, now);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className={`p-4 hover:bg-page ${ROW_BUTTON} ${priorityBar(a.priority, overdue)}`}
                >
                  <div className="mb-1 font-semibold text-ink">{a.title}</div>
                  <AudienceChips announcement={a} stores={state.stores} overdue={overdue} />
                  <div className="mt-3 flex items-center justify-between text-sm text-ink">
                    <span>
                      {done} of {stats.total} {required ? "acknowledged" : "opened"}
                    </span>
                    <span className="text-sm text-muted">
                      {a.dueDate ? `Due ${formatDueDate(a.dueDate)} · ` : ""}
                      {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={done} total={stats.total} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
