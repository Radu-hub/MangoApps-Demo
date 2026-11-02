import type { ReactNode } from "react";
import type { Announcement, Store } from "../domain/types";
import { AudienceChips } from "./AudienceChips";
import { formatDateTime, formatDueDate } from "./format";

interface Props {
  announcement: Announcement;
  stores: Store[];
  authorName: string;
  acknowledged: boolean;
  overdue: boolean;
  /** Rendered after the body, e.g. the acknowledge button. */
  children?: ReactNode;
}

/** A post as the employee sees it. Shared by the employee detail view and the manager's preview. */
export function PostContent({ announcement, stores, authorName, acknowledged, overdue, children }: Props) {
  return (
    <>
      <AudienceChips announcement={announcement} stores={stores} overdue={overdue} acknowledged={acknowledged} />
      <h1 className="mt-2 text-xl font-semibold text-ink">{announcement.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {authorName} · {formatDateTime(announcement.createdAt)}
      </p>
      {announcement.dueDate && !acknowledged && (
        <p className={`mt-2 text-sm ${overdue ? "font-semibold text-danger" : "text-ink"}`}>
          {overdue ? "Overdue · was due " : "Please confirm by "}
          {formatDueDate(announcement.dueDate)}
        </p>
      )}
      <div className="mt-4 whitespace-pre-line leading-relaxed text-ink">{announcement.body}</div>
      {children}
    </>
  );
}
