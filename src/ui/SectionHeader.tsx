import type { ReactNode } from "react";

/** Major section label with a full-width 1px rule. `first` drops the top gap when nothing sits above it. */
export function SectionHeader({ first = false, children }: { first?: boolean; children: ReactNode }) {
  return (
    <h2 className={`mb-2 border-b border-rule pb-1 text-lg font-bold text-ink ${first ? "" : "mt-6"}`}>{children}</h2>
  );
}
