import { isOverdue } from "../../domain/dates";
import { findReceipt } from "../../domain/receipts";
import { getAckStats, hasOverdueRecipients } from "../../domain/stats";
import type { Announcement, Employee, Receipt, Store } from "../../domain/types";
import { useApp } from "../../state/AppStateContext";
import { AudienceChips } from "../AudienceChips";
import { Chip } from "../Chip";
import { DEPARTMENT_LABELS, formatDateTime, formatDueDate, shortStoreName } from "../format";
import { ProgressBar } from "../ProgressBar";
import { Card } from "../Card";
import { SectionHeader } from "../SectionHeader";
import { LIST, LINK, priorityBar, rowTint } from "../styles";
import { PersonLink } from "./PersonPanel";
import { RemindButton } from "./RemindButton";

/** One post from its author's side: progress, reminder history and who is in each status group. */
export function TrackingDetail({ announcementId, onBack }: { announcementId: string; onBack: () => void }) {
  const { state, viewer } = useApp();
  // Tracking is only for the post's author; other managers can't browse it.
  const announcement = state.announcements.find((a) => a.id === announcementId && a.authorId === viewer.id);

  if (!announcement) {
    return (
      <div>
        <BackLink onBack={onBack} />
        <p>Announcement not found.</p>
      </div>
    );
  }

  const now = new Date();
  const required = announcement.priority === "required";
  const stats = getAckStats(announcement, state.employees, state.receipts);
  const logs = state.reminders.filter((r) => r.announcementId === announcement.id);
  const overdue = hasOverdueRecipients(announcement, stats, now);
  const groupProps = { announcement, now, receipts: state.receipts, stores: state.stores };

  return (
    <div className="space-y-6">
      <BackLink onBack={onBack} />
      <Card className={`p-5 ${priorityBar(announcement.priority, overdue)}`}>
        <AudienceChips announcement={announcement} stores={state.stores} overdue={overdue} />
        <h1 className="mt-2 text-xl font-bold text-ink">{announcement.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Posted {formatDateTime(announcement.createdAt)}
          {announcement.dueDate && ` · Due ${formatDueDate(announcement.dueDate)}`}
        </p>
        <p className="mt-3 whitespace-pre-line text-ink">{announcement.body}</p>

        <div className="mt-4 font-semibold text-ink">
          {required
            ? `${stats.acknowledged} of ${stats.total} acknowledged`
            : `${stats.opened} of ${stats.total} opened`}
        </div>
        <div className="mt-1">
          <ProgressBar value={required ? stats.acknowledged : stats.opened} total={stats.total} />
        </div>

        <div className="mt-4 empty:hidden">
          <RemindButton announcement={announcement} />
        </div>
        {logs.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm text-muted">
            {logs.map((log) => (
              <li key={log.id}>
                Reminder sent to {log.employeeIds.length} on {formatDateTime(log.sentAt)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {required && (
        <Group title="Acknowledged" people={stats.groups.acknowledged} {...groupProps} />
      )}
      <Group
        title={required ? "Opened, not confirmed" : "Opened"}
        people={required ? stats.groups.seenOnly : [...stats.groups.acknowledged, ...stats.groups.seenOnly]}
        {...groupProps}
      />
      <Group title="Not opened" people={stats.groups.notSeen} {...groupProps} />
    </div>
  );
}

/** Props for one status group. Everyone in `people` is listed with their store, department and latest timestamp. */
interface GroupProps {
  title: string;
  people: Employee[];
  announcement: Announcement;
  receipts: Receipt[];
  stores: Store[];
  now: Date;
}

function Group({ title, people, announcement, receipts, stores, now }: GroupProps) {
  return (
    <section>
      <SectionHeader first>
        {title} <span className="font-normal text-muted">({people.length})</span>
      </SectionHeader>
      {people.length === 0 ? (
        <p className="text-sm text-muted">Nobody</p>
      ) : (
        <ul className={LIST}>
          {people.map((p) => {
            const receipt = findReceipt(receipts, announcement.id, p.id);
            const store = stores.find((s) => s.id === p.storeId);
            const at = receipt?.acknowledgedAt ?? receipt?.seenAt;
            const overdue = isOverdue(announcement, receipt, now);
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${rowTint(overdue ? "overdue" : "plain")}`}>
                <PersonLink employee={p} />
                <span className="text-muted">
                  {store ? shortStoreName(store) : p.storeId} · {DEPARTMENT_LABELS[p.department]}
                </span>
                {overdue && <Chip tone="danger">Overdue</Chip>}
                {at && <span className="ml-auto text-muted">{formatDateTime(at)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Returns to the manager's list of posts. */
function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className={`text-sm ${LINK}`}>
      ← All announcements
    </button>
  );
}
