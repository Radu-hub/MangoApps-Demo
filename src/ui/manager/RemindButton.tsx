import { useState } from "react";
import { getReminderTargets } from "../../domain/reminders";
import type { Announcement } from "../../domain/types";
import { useApp } from "../../state/AppStateContext";
import { peopleCount } from "../format";
import { useToast } from "../Toast";
import { BUTTON_PRIMARY } from "../styles";
import { ReminderModal } from "./ReminderModal";

/**
 * The reminder flow: button → SMS preview modal → ReminderLog + toast.
 * Targets everyone who hasn't acknowledged. Renders nothing when there is nobody to remind.
 */
export function RemindButton({ announcement, compact = false }: { announcement: Announcement; compact?: boolean }) {
  const { state, actions } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const targets = getReminderTargets(announcement, state.employees, state.receipts);

  if (targets.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BUTTON_PRIMARY} ${compact ? "px-3 py-1 text-sm" : "px-4 py-2 text-sm"}`}
      >
        {compact ? "Remind" : `Remind ${peopleCount(targets.length)}`}
      </button>
      {open && (
        <ReminderModal
          announcement={announcement}
          targets={targets}
          onCancel={() => setOpen(false)}
          onSend={() => {
            actions.sendReminder(announcement.id, targets.map((t) => t.id));
            setOpen(false);
            toast(`Reminder sent to ${peopleCount(targets.length)}`);
          }}
        />
      )}
    </>
  );
}
