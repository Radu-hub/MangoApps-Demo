// Shared UI component: section header.
import type { ReactNode } from 'react';
import { focusRing } from './styles';

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: ReactNode;
  /** Makes the title a disclosure button controlling the element with `controls`. */
  collapsible?: { open: boolean; onToggle: () => void; controls: string };
  id?: string;
}

/** Section title with an optional count, action or show/hide toggle. */
export function SectionHeader({ title, count, action, collapsible, id }: SectionHeaderProps) {
  const label = count === undefined ? title : `${title} (${count})`;
  return (
    <div className="mb-2 mt-6 flex items-end justify-between gap-3 border-b border-rule pb-1">
      <h2 id={id} className="text-lg font-bold text-ink">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={collapsible.open}
            aria-controls={collapsible.controls}
            onClick={collapsible.onToggle}
            className={`flex min-h-11 items-center gap-2 rounded text-left sm:min-h-0 ${focusRing}`}
          >
            <span>{label}</span>
            <span className="text-sm font-normal text-ink-muted underline underline-offset-2">
              {collapsible.open ? 'Hide' : 'Show'}
            </span>
          </button>
        ) : (
          label
        )}
      </h2>
      {action}
    </div>
  );
}
