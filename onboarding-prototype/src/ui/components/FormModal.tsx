// Shared UI component: modal form with disabled-save and discard-changes handling.
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface FormModalProps {
  title: string;
  /** id of the <form> inside `children`; the Save button submits it. */
  formId: string;
  saveLabel: string;
  canSave: boolean;
  /** Shown next to the disabled Save button, e.g. "Fill in the required fields to save." */
  disabledHint?: string;
  /** Unsaved edits; cancelling then asks "Discard changes?". */
  dirty: boolean;
  /** Shown above the Save button. */
  notice?: ReactNode;
  onCancel: () => void;
  children: ReactNode;
}

/** Modal form with Save disabled while invalid and a discard confirmation for unsaved edits. */
export function FormModal({ title, formId, saveLabel, canSave, disabledHint, dirty, notice, onCancel, children }: FormModalProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const requestClose = () => (dirty ? setConfirmingDiscard(true) : onCancel());

  return (
    <Modal
      title={confirmingDiscard ? 'Discard changes?' : title}
      onClose={confirmingDiscard ? () => setConfirmingDiscard(false) : requestClose}
      footer={
        confirmingDiscard ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmingDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onCancel}>
              Discard changes
            </Button>
          </>
        ) : (
          <>
            {notice && <div className="w-full">{notice}</div>}
            {!canSave && disabledHint && (
              <span className="mr-auto self-center text-sm text-ink-muted">{disabledHint}</span>
            )}
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={!canSave}>
              {saveLabel}
            </Button>
          </>
        )
      }
    >
      {confirmingDiscard && <p>Your changes haven’t been saved. If you leave now, they’ll be lost.</p>}
      {/* Kept mounted while confirming so the draft survives "Keep editing". */}
      <div hidden={confirmingDiscard}>{children}</div>
    </Modal>
  );
}
