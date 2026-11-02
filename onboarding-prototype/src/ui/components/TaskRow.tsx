// Shared UI component: task row.
import type { ReactNode } from 'react';
import { formatDuration, formatRelativeDue, formatShortDate, toISODate } from '../../domain/dates';
import { getEditedText } from '../../domain/messages';
import { getTaskHighlight } from '../../domain/progress';
import type { Person, PlanTask } from '../../domain/types';
import { Chip } from './Chip';
import { ListRow } from './ListRow';
import { focusRing } from './styles';

interface TaskRowProps {
  task: PlanTask;
  now: Date;
  onOpen?: () => void;
  actions?: ReactNode;
  /** Extra chips after the status chips, e.g. "New". */
  extraChips?: ReactNode;
  /** Used to show "Edited by <name> · <date>" on edited tasks. */
  people?: Person[];
}

/** Due text for a task: "Fri, Oct 30 · Due in 2 days" or "Done Tue, Oct 27". */
function taskTimingText(task: PlanTask, now: Date): string {
  if (task.status === 'done') {
    return task.completedAt ? `Done ${formatShortDate(toISODate(new Date(task.completedAt)))}` : 'Done';
  }
  return `${formatShortDate(task.dueDate)} · ${formatRelativeDue(task.dueDate, now)}`;
}

/** Priority, overdue and done chips for a task. */
export function TaskChips({ task, now }: { task: PlanTask; now: Date }) {
  const highlight = getTaskHighlight(task, now);
  if (task.status === 'done') return <Chip tone="neutral">Done</Chip>;
  return (
    <>
      {highlight === 'overdue' && <Chip tone="red">Overdue</Chip>}
      {task.priority === 'required' && <Chip tone="amber">Required</Chip>}
    </>
  );
}

/** One task in a list, with an optional open handler and action buttons. */
export function TaskRow({ task, now, onOpen, actions, extraChips, people }: TaskRowProps) {
  const edited = people ? getEditedText(task, people) : null;
  const title = <span className="font-semibold text-ink">{task.title}</span>;
  return (
    <ListRow highlight={getTaskHighlight(task, now)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {onOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className={`rounded text-left underline-offset-2 hover:underline ${focusRing}`}
              >
                {title}
              </button>
            ) : (
              title
            )}
            <TaskChips task={task} now={now} />
            {extraChips}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {taskTimingText(task, now)}
            {task.status !== 'done' && ` · ${formatDuration(task.estimatedMinutes)}`}
          </p>
          {edited && <p className="text-sm text-ink-muted">{edited}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </ListRow>
  );
}
