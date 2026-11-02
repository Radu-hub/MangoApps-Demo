// Task details shared by the new hire and staff screens.
import { formatDuration, formatRelativeDue, formatShortDate, toISODate } from '../../domain/dates';
import { PHASE_LABELS, PRIORITY_LABELS } from '../../domain/labels';
import { getEditedText } from '../../domain/messages';
import { EDIT_REFUSAL_TEXT } from '../../domain/plan';
import type { Doc, Person, PlanTask } from '../../domain/types';
import { Button } from '../components/Button';
import { TaskChips } from '../components/TaskRow';

interface TaskDetailsProps {
  task: PlanTask;
  now: Date;
  docs: Doc[];
  people: Person[];
  onOpenDoc: (doc: Doc) => void;
  /** Explain to plan editors that a completed task can't be changed. */
  showReadOnlyNote?: boolean;
}

/** Description, due date, timing and related doc for one task. Shared by the new hire and staff views. */
export function TaskDetails({ task, now, docs, people, onOpenDoc, showReadOnlyNote }: TaskDetailsProps) {
  const edited = getEditedText(task, people);
  const doc = task.docId ? docs.find((d) => d.id === task.docId) : undefined;
  const addedBy = people.find((p) => p.id === task.addedById);
  const rows: [string, string][] = [
    [
      'Due',
      task.status === 'done'
        ? formatShortDate(task.dueDate)
        : `${formatShortDate(task.dueDate)} (${formatRelativeDue(task.dueDate, now)})`,
    ],
    ['Estimated time', formatDuration(task.estimatedMinutes)],
    ['Phase', PHASE_LABELS[task.phase]],
    ['Priority', PRIORITY_LABELS[task.priority]],
  ];
  if (task.status === 'done' && task.completedAt) {
    rows.push(['Completed', formatShortDate(toISODate(new Date(task.completedAt)))]);
  }
  if (task.source === 'custom' && addedBy) rows.push(['Added by', addedBy.name]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <TaskChips task={task} now={now} />
      </div>
      {showReadOnlyNote && task.status === 'done' && (
        <p className="rounded border border-border bg-neutral-bg p-3 text-sm text-neutral-text">
          {EDIT_REFUSAL_TEXT.completed}
        </p>
      )}
      {task.description && <p>{task.description}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold text-ink">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {edited && <p className="text-sm text-ink-muted">{edited}</p>}
      {doc && (
        <div>
          <p className="text-sm font-semibold">Related document</p>
          <Button variant="link" onClick={() => onOpenDoc(doc)}>
            Read: {doc.title}
          </Button>
        </div>
      )}
    </div>
  );
}
