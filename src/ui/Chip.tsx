import type { ReactNode } from "react";

// Tinted status labels with dark text; neutral labels carry audience metadata.
const TONES = {
  neutral: "border-line bg-white text-muted",
  accent: "border-accent-edge bg-accent-tint font-bold uppercase tracking-wide text-accent-ink",
  danger: "border-danger-edge bg-danger-tint font-bold uppercase tracking-wide text-danger-ink",
} as const;

/** A small inline label. */
export function Chip({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs ${TONES[tone]}`}>{children}</span>;
}
