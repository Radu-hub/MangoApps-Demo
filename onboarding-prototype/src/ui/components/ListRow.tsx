// Shared UI component: list and list rows.
import type { ReactNode } from 'react';
import type { TaskHighlight } from '../../domain/progress';

/** A bordered list with divided rows. */
export function List({ children, label, id }: { children: ReactNode; label?: string; id?: string }) {
  return (
    <ul id={id} aria-label={label} className="rounded border border-border bg-surface">
      {children}
    </ul>
  );
}

const highlightClasses: Record<TaskHighlight, string> = {
  none: 'border-l-transparent',
  required: 'border-l-required-bar bg-required-bg',
  overdue: 'border-l-overdue-bar bg-overdue-bg',
};

/** Row classes, exported for rows that render their own <li> (e.g. a full-row button). */
export function rowClasses(highlight: TaskHighlight = 'none'): string {
  return `border-l-4 border-t border-t-divider first:border-t-0 ${highlightClasses[highlight]}`;
}

interface ListRowProps {
  children: ReactNode;
  highlight?: TaskHighlight;
  className?: string;
}

/** One row of a List, with an optional accent for overdue or required items. */
export function ListRow({ children, highlight = 'none', className = '' }: ListRowProps) {
  return <li className={`${rowClasses(highlight)} px-3 py-3 ${className}`}>{children}</li>;
}
