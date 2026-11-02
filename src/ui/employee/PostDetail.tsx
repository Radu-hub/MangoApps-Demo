import { useEffect } from "react";
import { isRecipient } from "../../domain/audience";
import { isOverdue } from "../../domain/dates";
import { findReceipt } from "../../domain/receipts";
import { useApp } from "../../state/AppStateContext";
import { PostContent } from "../PostContent";
import { LINK } from "../styles";
import { AckButton } from "./AckButton";

/** A single post. Opening it records the view, unless the viewer isn't a recipient. */
export function PostDetail({ announcementId, onBack }: { announcementId: string; onBack: () => void }) {
  const { state, viewer, actions } = useApp();
  const announcement = state.announcements.find((a) => a.id === announcementId);
  const visible = announcement !== undefined && isRecipient(viewer, announcement);

  useEffect(() => {
    if (visible) actions.markSeen(announcementId);
  }, [visible, announcementId, actions]);

  if (!announcement || !visible) {
    return (
      <div className="p-4">
        <BackButton onBack={onBack} />
        <p className="text-muted">This update isn't available.</p>
      </div>
    );
  }

  const receipt = findReceipt(state.receipts, announcement.id, viewer.id);
  const overdue = isOverdue(announcement, receipt, new Date());
  const author = state.employees.find((e) => e.id === announcement.authorId);

  return (
    <article className="p-4">
      <BackButton onBack={onBack} />
      <PostContent
        announcement={announcement}
        stores={state.stores}
        authorName={author?.name ?? "Unknown"}
        acknowledged={Boolean(receipt?.acknowledgedAt)}
        overdue={overdue}
      >
        {announcement.priority === "required" && (
          <AckButton acknowledgedAt={receipt?.acknowledgedAt} onAcknowledge={() => actions.acknowledge(announcement.id)} />
        )}
      </PostContent>
    </article>
  );
}

/** Returns to the feed. */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className={`mb-3 text-sm ${LINK}`}>
      ← Back
    </button>
  );
}
