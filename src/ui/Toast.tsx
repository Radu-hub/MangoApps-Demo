import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/** The function that shows a toast. The default no-op keeps components usable without the provider. */
const ToastContext = createContext<(message: string) => void>(() => {});

/** Shows one message at a time at the bottom of the screen for 3 seconds. A new message replaces the old one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const show = useCallback((m: string) => setMessage(m), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-ink px-4 py-2 text-sm text-white"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** Returns the function that shows a toast. */
export const useToast = () => useContext(ToastContext);
