// Staff modal: preview and log a reminder.
import { plural } from '../../domain/dates';
import { buildReminderPreview, createReminderLog } from '../../domain/messages';
import type { Person, PlanTask } from '../../domain/types';
import { makeId, useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

interface ReminderModalProps {
  person: Person;
  tasks: PlanTask[];
  onClose: () => void;
}

/** Preview of the text and email a reminder would send. Sending logs a ReminderLog. */
export function ReminderModal({ person, tasks, onClose }: ReminderModalProps) {
  const { viewer, now, dispatch } = useAppState();
  const toast = useToast();
  const preview = buildReminderPreview(person, tasks, viewer, now);
  const log = createReminderLog(makeId('r'), person, tasks, viewer, now);

  function send() {
    if (!log) return;
    dispatch({ type: 'send_reminder', log });
    toast(`Reminder sent to ${person.name} about ${plural(log.taskIds.length, 'overdue task')}.`);
    onClose();
  }

  return (
    <Modal
      title={`Remind ${person.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!log}>
            Send reminder
          </Button>
        </>
      }
    >
      {!log ? (
        <p>{person.name} has no overdue tasks, so there’s nothing to remind them about.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Prototype: nothing is actually sent. Sending adds an entry to the reminder history.
          </p>
          <section>
            <h3 className="text-sm font-bold">Text message to {preview.phone}</h3>
            <p className="mt-1 rounded border border-border bg-neutral-bg p-3">{preview.sms}</p>
          </section>
          <section>
            <h3 className="text-sm font-bold">Email to {preview.email}</h3>
            <div className="mt-1 rounded border border-border">
              <p className="border-b border-divider px-3 py-2 text-sm">
                <span className="font-semibold">Subject:</span> {preview.subject}
              </p>
              <p className="whitespace-pre-wrap px-3 py-2 text-sm">{preview.body}</p>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
