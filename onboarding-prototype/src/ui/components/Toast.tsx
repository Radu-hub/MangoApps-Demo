// Shared UI component: toast messages.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { focusRing } from './styles';

const TOAST_MS = 5000;

const ToastContext = createContext<(message: string) => void>(() => {});

/** Returns a function that shows a short confirmation message. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

/** Renders the current toast and provides useToast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    timer.current = window.setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:justify-end">
        {message && (
          <div className="pointer-events-auto flex w-full max-w-sm items-start justify-between gap-3 rounded border border-ink bg-ink px-4 py-3 text-white">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className={`shrink-0 rounded text-sm font-semibold underline underline-offset-2 ${focusRing}`}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
