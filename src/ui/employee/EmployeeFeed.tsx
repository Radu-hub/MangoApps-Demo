import { getFeedForEmployee } from "../../domain/feed";
import { useApp } from "../../state/AppStateContext";
import { SectionHeader } from "../SectionHeader";
import { FOCUS_RING, LIST } from "../styles";
import { FeedItem } from "./FeedItem";

interface Props {
  onOpen: (id: string) => void;
  /** Present only when there are texts to show on the lock screen. */
  onShowLockScreen?: () => void;
}

/** The employee's home screen: "Needs your attention" pinned on top, everything else below. */
export function EmployeeFeed({ onOpen, onShowLockScreen }: Props) {
  const { state, viewer } = useApp();
  const { needsAttention, everythingElse } = getFeedForEmployee(viewer, state.announcements, state.receipts, new Date());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Hi, {viewer.name.split(" ")[0]}</h1>
        {onShowLockScreen && (
          <button
            type="button"
            onClick={onShowLockScreen}
            className={`rounded text-sm text-muted underline underline-offset-2 hover:text-ink ${FOCUS_RING}`}
          >
            Show texts
          </button>
        )}
      </div>

      {needsAttention.length === 0 ? (
        <p className="rounded border border-line bg-page p-4 text-center font-semibold text-ink">You're all caught up.</p>
      ) : (
        <section>
          <SectionHeader first>
            Needs your attention{" "}
            <span className="ml-1 inline-flex rounded-sm border border-accent-edge bg-accent-tint px-1.5 align-middle text-sm font-bold text-accent-ink">
              <span className="sr-only">(</span>
              {needsAttention.length}
              <span className="sr-only">)</span>
            </span>
          </SectionHeader>
          <ul className={LIST}>
            {needsAttention.map((entry) => (
              <FeedItem key={entry.announcement.id} entry={entry} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      )}

      {everythingElse.length > 0 && (
        <section>
          <SectionHeader>Updates</SectionHeader>
          <ul className={LIST}>
            {everythingElse.map((entry) => (
              <FeedItem key={entry.announcement.id} entry={entry} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
