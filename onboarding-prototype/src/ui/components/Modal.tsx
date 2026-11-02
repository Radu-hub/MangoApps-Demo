// Shared UI component: modal dialog.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Accessible dialog: takes focus on open, closes on Escape or backdrop click, returns focus on close. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Read the latest onClose without re-running the mount effect, which would steal focus back.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-overlay sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full flex-col rounded-t border border-border bg-surface focus:outline-none sm:max-w-lg sm:rounded"
      >
        <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-divider px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
