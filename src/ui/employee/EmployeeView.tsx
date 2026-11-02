import { useEffect, useState } from "react";
import { getTextMessages } from "../../domain/notifications";
import { useApp } from "../../state/AppStateContext";
import { EmployeeFeed } from "./EmployeeFeed";
import { LockScreen } from "./LockScreen";
import { PostDetail } from "./PostDetail";

type Mode = { name: "lock" } | { name: "feed" } | { name: "post"; id: string };

/**
 * Phone-width container; the employee experience is designed for a text-message link on a phone.
 * Managers reuse it as their "My updates" tab, without the lock-screen entry.
 */
export function EmployeeView({ withLockScreen = true }: { withLockScreen?: boolean }) {
  const { state, viewer } = useApp();
  const messages = withLockScreen
    ? getTextMessages(viewer, state.announcements, state.receipts, state.reminders, new Date())
    : [];
  const hasTexts = messages.length > 0;
  // Arriving as an employee starts from their texts; with nothing outstanding, go straight to the feed.
  const [mode, setMode] = useState<Mode>(() => (hasTexts ? { name: "lock" } : { name: "feed" }));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  const openPost = (id: string) => setMode({ name: "post", id });
  const toFeed = () => setMode({ name: "feed" });

  return (
    <div className="mx-auto min-h-[640px] max-w-sm overflow-hidden rounded border border-line bg-white">
      {mode.name === "lock" && hasTexts ? (
        <LockScreen messages={messages} onOpenPost={openPost} onOpenApp={toFeed} />
      ) : mode.name === "post" ? (
        <PostDetail announcementId={mode.id} onBack={toFeed} />
      ) : (
        <EmployeeFeed onOpen={openPost} onShowLockScreen={hasTexts ? () => setMode({ name: "lock" }) : undefined} />
      )}
    </div>
  );
}
