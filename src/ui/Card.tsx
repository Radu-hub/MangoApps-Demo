import type { ReactNode } from "react";
import { PANEL } from "./styles";

/** The single bordered panel used for a post or the compose form. */
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${PANEL} ${className}`}>{children}</div>;
}
