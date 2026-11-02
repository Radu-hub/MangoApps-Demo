import type { TextMessage } from "../../domain/notifications";
import { formatDay, formatSentAt } from "../format";
import { FOCUS_RING } from "../styles";

interface Props {
  messages: TextMessage[];
  onOpenPost: (id: string) => void;
  onOpenApp: () => void;
}

/** Mock phone lock screen: one text per Action required post or reminder, newest on top. Each opens its own post. */
export function LockScreen({ messages, onOpenPost, onOpenApp }: Props) {
  const now = new Date();
  return (
    <div className="flex min-h-[640px] flex-col items-center bg-ink px-4 pt-16 pb-6 text-white">
      <div className="text-2xl font-semibold tabular-nums">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, "")}
      </div>
      <div className="mt-1 text-sm text-white">{formatDay(now)}</div>

      <ul className="mt-10 w-full space-y-2">
        {messages.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpenPost(m.announcement.id)}
              className={`w-full rounded border border-line bg-white p-3 text-left text-ink hover:bg-page ${FOCUS_RING}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold uppercase tracking-wide">Messages</span>
                <span className="ml-auto">{formatSentAt(m.sentAt, now)}</span>
              </div>
              <div className="text-sm font-semibold">Summit Retail</div>
              <p className="text-sm">{m.text}</p>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpenApp}
        className={`mt-auto pt-6 rounded text-sm text-white underline underline-offset-2 ${FOCUS_RING}`}
      >
        Open Summit Updates
      </button>
    </div>
  );
}
