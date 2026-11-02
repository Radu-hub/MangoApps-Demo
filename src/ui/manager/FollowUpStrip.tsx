import { getFollowUps } from "../../domain/followUps";
import type { Announcement } from "../../domain/types";
import { useApp } from "../../state/AppStateContext";
import { formatDueDate } from "../format";
import { FOCUS_RING } from "../styles";
import { PersonLink } from "./PersonPanel";
import { RemindButton } from "./RemindButton";

/** Overdue summary across the manager's own posts. Renders nothing when nobody is overdue. */
export function FollowUpStrip({ announcements, onOpen }: { announcements: Announcement[]; onOpen: (id: string) => void }) {
  const { state } = useApp();
  const { totalOverduePeople, posts } = getFollowUps(announcements, state.employees, state.receipts, new Date());
  if (posts.length === 0) return null;

  return (
    <section className="mb-5 rounded border border-danger-edge border-l-4 border-l-danger bg-danger-wash p-4">
      <h2 className="font-bold text-danger-ink">
        {totalOverduePeople} {totalOverduePeople === 1 ? "person is" : "people are"} overdue on {posts.length}{" "}
        {posts.length === 1 ? "post" : "posts"}
      </h2>
      <ul className="mt-2 divide-y divide-danger-edge">
        {posts.map(({ announcement, overdue }) => (
          <li key={announcement.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onOpen(announcement.id)} className={`rounded text-left font-semibold text-ink hover:underline ${FOCUS_RING}`}>
                {announcement.title}
              </button>
              <div className="text-sm font-semibold text-danger-ink">
                {overdue.length} overdue · was due {announcement.dueDate && formatDueDate(announcement.dueDate)}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-ink">
                {overdue.map((e) => (
                  <PersonLink key={e.id} employee={e} className="font-normal" />
                ))}
              </div>
            </div>
            <RemindButton announcement={announcement} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
