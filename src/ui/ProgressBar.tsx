/** A horizontal bar showing value out of total. Zero recipients reads as 0%. */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-sm bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-action" style={{ width: `${pct}%` }} />
    </div>
  );
}
