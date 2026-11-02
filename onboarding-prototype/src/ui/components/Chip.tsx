// Shared UI component: status chip.
import type { ReactNode } from 'react';
import type { ProgressStatus } from '../../domain/types';

/** Color family of a chip. */
export type ChipTone = 'amber' | 'red' | 'neutral' | 'green';

const toneClasses: Record<ChipTone, string> = {
  amber: 'border-amber-border bg-amber-bg text-amber-text',
  red: 'border-red-border bg-red-bg text-red-text',
  neutral: 'border-neutral-border bg-neutral-bg text-neutral-text',
  green: 'border-green-border bg-green-bg text-green-text',
};

/** A small tinted label. */
export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-px text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** Chip color for each progress status. */
export const STATUS_TONES: Record<ProgressStatus, ChipTone> = {
  behind: 'red',
  not_started: 'neutral',
  on_track: 'neutral',
  complete: 'green',
};
