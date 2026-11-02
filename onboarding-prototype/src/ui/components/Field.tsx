// Shared UI component: form field with label, hint and error.
import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

/** Label, control, hint and inline error. The control should set aria-describedby={`${id}-msg`}. */
export function Field({ id, label, error, hint, optional, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-msg`} className={`text-sm ${error ? 'font-semibold text-red-text' : 'text-ink-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
