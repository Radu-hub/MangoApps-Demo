import { buildReminderText, reminderLink } from "../../domain/reminders";
import type { Announcement, Employee } from "../../domain/types";
import { peopleCount } from "../format";
import { Modal } from "../Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, LIST } from "../styles";

interface Props {
  announcement: Announcement;
  targets: Employee[];
  onCancel: () => void;
  onSend: () => void;
}

/** Previews the reminder text and who gets it before the manager sends it. */
export function ReminderModal({ announcement, targets, onCancel, onSend }: Props) {
  return (
    <Modal title={`Remind ${peopleCount(targets.length)}`} onClose={onCancel}>
      <p className="mb-2 text-sm text-muted">Text message preview</p>
      <div className="mb-4 rounded border border-line bg-page p-3 text-sm text-ink">{buildReminderText(announcement, reminderLink(announcement))}</div>

      <p className="mb-1 text-sm text-muted">Sent only to people who haven't acknowledged:</p>
      <ul className={`mb-4 max-h-40 overflow-y-auto text-sm ${LIST}`}>
        {targets.map((t) => (
          <li key={t.id} className="flex justify-between px-3 py-1.5">
            <span>{t.name}</span>
            <span className="text-muted">{t.phone}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`px-4 py-2 text-sm ${BUTTON_SECONDARY}`}>
          Cancel
        </button>
        <button type="button" onClick={onSend} className={`px-4 py-2 text-sm ${BUTTON_PRIMARY}`}>
          Send reminder
        </button>
      </div>
    </Modal>
  );
}
