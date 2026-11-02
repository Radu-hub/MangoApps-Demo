import type { ReactNode } from "react";

/** A centered dialog that closes when the backdrop is clicked. Clicks inside the dialog don't reach the backdrop. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded border border-line bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-bold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
