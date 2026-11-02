import { formatDateTime } from "../format";
import { BUTTON_PRIMARY } from "../styles";

interface Props {
  acknowledgedAt?: string;
  onAcknowledge: () => void;
  /** Non-interactive, for the manager's preview. */
  disabled?: boolean;
}

/** The one-tap confirmation at the end of a required post. Once tapped, it shows when the person confirmed. */
export function AckButton({ acknowledgedAt, onAcknowledge, disabled = false }: Props) {
  if (acknowledgedAt) {
    return (
      <div className="mt-6 rounded border border-line bg-page p-3 text-center font-semibold text-ink">
        You confirmed this on {formatDateTime(acknowledgedAt)}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onAcknowledge}
      disabled={disabled}
      className={`mt-6 min-h-12 w-full px-4 py-3 text-base disabled:cursor-default ${BUTTON_PRIMARY}`}
    >
      I have read and understood this
    </button>
  );
}
