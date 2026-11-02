import { buildNotificationText } from "../../domain/notifications";
import type { Announcement, Store } from "../../domain/types";
import { AckButton } from "../employee/AckButton";
import { peopleCount } from "../format";
import { Modal } from "../Modal";
import { PostContent } from "../PostContent";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "../styles";

interface Props {
  announcement: Announcement;
  stores: Store[];
  authorName: string;
  reach: number;
  onEdit: () => void;
  onConfirm: () => void;
}

/** Shows the draft exactly as employees will see it, plus the one text message a required post sends. */
export function PostPreview({ announcement, stores, authorName, reach, onEdit, onConfirm }: Props) {
  const required = announcement.priority === "required";
  return (
    <Modal title="Preview" onClose={onEdit}>
      <p className="mb-2 text-sm text-muted">What employees will see</p>
      <div className="max-h-80 overflow-y-auto rounded border border-line p-4">
        <PostContent announcement={announcement} stores={stores} authorName={authorName} acknowledged={false} overdue={false}>
          {required && <AckButton onAcknowledge={() => {}} disabled />}
        </PostContent>
      </div>

      <p className="mt-4 mb-2 text-sm text-muted">
        {required ? `Text message to ${peopleCount(reach)}` : "Text message"}
      </p>
      {required ? (
        <div className="rounded border border-line bg-page p-3 text-sm text-ink">{buildNotificationText(announcement)}</div>
      ) : (
        <p className="text-sm text-muted">FYI posts don't send a text message. They appear in the feed only.</p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onEdit} className={`px-4 py-2 text-sm ${BUTTON_SECONDARY}`}>
          Edit
        </button>
        <button type="button" onClick={onConfirm} className={`px-4 py-2 text-sm ${BUTTON_PRIMARY}`}>
          Confirm &amp; post
        </button>
      </div>
    </Modal>
  );
}
