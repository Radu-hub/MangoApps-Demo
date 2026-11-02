// Shared UI component: progress bar.
import type { Progress } from '../../domain/types';

/** Share of tasks done, with an accessible label. */
export function ProgressBar({ progress, className = '' }: { progress: Progress; className?: string }) {
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Tasks done"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.done}
      className={`h-2 overflow-hidden rounded-sm border border-rule bg-page ${className}`}
    >
      <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
    </div>
  );
}
