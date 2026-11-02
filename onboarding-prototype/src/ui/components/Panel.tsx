// Shared UI components: panel and notice boxes.
import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

/** A single bordered panel, used for forms and detail views. */
export function Panel({ children, className = '', label }: PanelProps) {
  return (
    <section aria-label={label} className={`rounded border border-border bg-surface p-4 ${className}`}>
      {children}
    </section>
  );
}

type NoticeTone = 'amber' | 'red' | 'neutral';

const noticeClasses: Record<NoticeTone, string> = {
  amber: 'border-amber-border bg-amber-bg text-amber-text',
  red: 'border-red-border bg-overdue-bg text-red-text',
  neutral: 'border-border bg-neutral-bg text-neutral-text',
};

/** A tinted inline message (warnings, notes, follow-ups). */
export function Notice({ tone, children, className = '' }: { tone: NoticeTone; children: ReactNode; className?: string }) {
  return <div className={`rounded border p-3 ${noticeClasses[tone]} ${className}`}>{children}</div>;
}
