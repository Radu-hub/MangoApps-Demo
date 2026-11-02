// Staff screen: one person's plan.
import { useState } from 'react';
import { formatShortDate, plural, toISODate } from '../../domain/dates';
import { DEPARTMENT_LABELS, PHASE_LABELS, STATUS_LABELS, firstName } from '../../domain/labels';
import { getReminderHistory } from '../../domain/messages';
import { canEditPlan, canView } from '../../domain/permissions';
import {
  EDIT_REFUSAL_TEXT,
  OVERDUE_AFTER_EDIT_WARNING,
  REMOVE_REFUSAL_TEXT,
  createCustomTask,
  defaultCustomTaskDueDate,
  editTask,
  removeTask,
  taskChangesFromDraft,
} from '../../domain/plan';
import { getOverdueTasks, getProgress, getTimelineLabel, groupByPhase, isNewAssignment } from '../../domain/progress';
import type { Doc, PlanTask } from '../../domain/types';
import { makeId, useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Chip, STATUS_TONES } from '../components/Chip';
import { List, ListRow } from '../components/ListRow';
import { Modal } from '../components/Modal';
import { Notice, Panel } from '../components/Panel';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { TaskRow } from '../components/TaskRow';
import { useToast } from '../components/Toast';
import { DocView } from './DocView';
import { startText } from './PeopleList';
import { ReminderModal } from './ReminderModal';
import { TaskDetails } from './TaskDetails';
import { TaskForm } from './TaskForm';

/** One person's plan, with add, edit, remove and remind actions for those allowed to use them. */
export function PersonDetail({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, viewer, now, dispatch } = useAppState();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [reminding, setReminding] = useState(false);
  const [removing, setRemoving] = useState<PlanTask | null>(null);
  const [openTask, setOpenTask] = useState<PlanTask | null>(null);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);

  const person = state.people.find((p) => p.id === personId);
  const back = (
    <Button variant="secondary" size="sm" onClick={onBack}>
      Back to people
    </Button>
  );
  if (!person || !canView(viewer, person)) {
    return (
      <div className="flex flex-col gap-4">
        <div>{back}</div>
        <Panel>You don’t have access to this person’s plan.</Panel>
      </div>
    );
  }

  const tasks = state.tasks.filter((t) => t.personId === person.id);
  const progress = getProgress(tasks, now);
  const overdue = getOverdueTasks(tasks, now);
  const editable = canEditPlan(viewer, person);
  const manager = state.people.find((p) => p.id === person.managerId);
  const history = getReminderHistory(state.reminders, person.id);
  const assigned = tasks.filter((t) => isNewAssignment(t, person, now));
  const nameOf = (id: string) => state.people.find((p) => p.id === id)?.name ?? 'Someone';

  return (
    <div className="pb-24">
      <div className="mb-4">{back}</div>
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{person.name}</h1>
            <p className="text-ink-muted">
              {person.jobTitle} · {DEPARTMENT_LABELS[person.department]}
              {manager && ` · Reports to ${manager.name}`}
            </p>
            <p className="text-sm text-ink-muted">
              {startText(person, now)} · {getTimelineLabel(person, tasks, now, { audience: 'staff' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone={STATUS_TONES[progress.status]}>{STATUS_LABELS[progress.status]}</Chip>
            {progress.overdueCount > 0 && <Chip tone="red">{progress.overdueCount} overdue</Chip>}
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-sm font-semibold">
            {progress.done} of {progress.total} done · {progress.requiredDone} of {progress.requiredTotal} required done
          </p>
          <ProgressBar progress={progress} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {editable && <Button onClick={() => setAdding(true)}>Add task</Button>}
          <Button variant="secondary" onClick={() => setReminding(true)} disabled={overdue.length === 0}>
            Send reminder
          </Button>
          {overdue.length === 0 && <span className="self-center text-sm text-ink-muted">No overdue tasks to remind about.</span>}
        </div>
        {!editable && (
          <p className="mt-2 text-sm text-ink-muted">Only HR and {firstName(person.name)}’s manager can change this plan.</p>
        )}
      </Panel>

      {assigned.length > 0 && (
        <Notice tone="amber" className="mt-4">
          <p className="font-bold">New task assigned</p>
          <p className="text-sm">
            {firstName(person.name)} sees {assigned.length === 1 ? 'this task' : 'these tasks'} at the top of their plan:{' '}
            {assigned.map((t) => t.title).join(', ')}.
          </p>
        </Notice>
      )}

      {groupByPhase(tasks).map((group) => (
        <div key={group.phase}>
          <SectionHeader
            title={PHASE_LABELS[group.phase]}
            count={group.tasks.length}
            action={
              <span className="text-sm text-ink-muted">
                {group.tasks.filter((t) => t.status === 'done').length} done
              </span>
            }
          />
          <List label={PHASE_LABELS[group.phase]}>
            {group.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                now={now}
                people={state.people}
                onOpen={() => setOpenTask(t)}
                extraChips={t.source === 'custom' ? <Chip tone="neutral">Added</Chip> : undefined}
                actions={
                  !editable ? undefined : t.status === 'done' ? (
                    <span className="self-center text-sm text-ink-muted">Read-only</span>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setRemoving(t)}>
                        Remove
                      </Button>
                    </>
                  )
                }
              />
            ))}
          </List>
        </div>
      ))}

      <SectionHeader title="Reminder history" count={history.length} />
      {history.length === 0 ? (
        <p className="text-ink-muted">No reminders sent yet.</p>
      ) : (
        <List label="Reminder history">
          {history.map((r) => (
            <ListRow key={r.id}>
              <p className="font-semibold">
                {formatShortDate(toISODate(new Date(r.sentAt)))} · sent by {nameOf(r.sentById)}
              </p>
              <p className="text-sm text-ink-muted">
                {plural(r.taskIds.length, 'task')}: {r.taskIds.map((id) => tasks.find((t) => t.id === id)?.title ?? 'Removed task').join(', ')}
              </p>
            </ListRow>
          ))}
        </List>
      )}

      {adding && (
        <TaskForm
          person={person}
          existingTasks={tasks}
          docs={state.docs}
          now={now}
          defaultDueDate={defaultCustomTaskDueDate(now)}
          onCancel={() => setAdding(false)}
          onSubmit={(draft) => {
            const task = createCustomTask(
              draft,
              { id: makeId('task'), personId: person.id, addedById: viewer.id },
              person,
              new Date(),
            );
            const reopened = progress.status === 'complete';
            dispatch({ type: 'add_task', task });
            setAdding(false);
            toast(
              reopened
                ? `Added “${task.title}”. ${firstName(person.name)}’s plan is open again.`
                : `Added “${task.title}” to ${firstName(person.name)}’s plan.`,
            );
          }}
        />
      )}

      {editing && (
        <TaskForm
          task={editing}
          person={person}
          existingTasks={tasks}
          docs={state.docs}
          now={now}
          defaultDueDate={editing.dueDate}
          onCancel={() => setEditing(null)}
          onSubmit={(draft) => {
            const editedAt = new Date();
            const changes = taskChangesFromDraft(draft);
            const result = editTask(state.tasks, editing.id, changes, viewer.id, person, editedAt);
            setEditing(null);
            if (!result.ok) {
              toast(EDIT_REFUSAL_TEXT[result.reason]);
              return;
            }
            dispatch({ type: 'edit_task', taskId: editing.id, changes, editorId: viewer.id, now: editedAt });
            const warning = result.warnings.includes(OVERDUE_AFTER_EDIT_WARNING) ? ` ${OVERDUE_AFTER_EDIT_WARNING}` : '';
            toast(`Saved changes to “${changes.title}”.${warning}`);
          }}
        />
      )}

      {removing && (
        <RemoveTaskModal
          task={removing}
          tasks={tasks}
          personName={person.name}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            dispatch({ type: 'remove_task', taskId: removing.id });
            toast(`Removed “${removing.title}”.`);
            setRemoving(null);
          }}
        />
      )}

      {reminding && <ReminderModal person={person} tasks={tasks} onClose={() => setReminding(false)} />}

      {openTask && (
        <Modal
          title={openTask.title}
          onClose={() => setOpenTask(null)}
          footer={
            editable && openTask.status !== 'done' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setOpenTask(null);
                  setEditing(openTask);
                }}
              >
                Edit task
              </Button>
            ) : undefined
          }
        >
          <TaskDetails
            task={state.tasks.find((t) => t.id === openTask.id) ?? openTask}
            now={now}
            docs={state.docs}
            people={state.people}
            showReadOnlyNote={editable}
            onOpenDoc={(doc) => {
              setOpenTask(null);
              setOpenDoc(doc);
            }}
          />
        </Modal>
      )}
      {openDoc && <DocView doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  );
}

interface RemoveTaskModalProps {
  task: PlanTask;
  tasks: PlanTask[];
  personName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function RemoveTaskModal({ task, tasks, personName, onCancel, onConfirm }: RemoveTaskModalProps) {
  const check = removeTask(tasks, task.id);
  return (
    <Modal
      title="Remove task?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {check.ok && (
            <Button variant="danger" onClick={onConfirm}>
              Remove task
            </Button>
          )}
        </>
      }
    >
      {check.ok ? (
        <p>
          Remove “{task.title}” from {firstName(personName)}’s plan? It will no longer appear in their list.
        </p>
      ) : (
        <p>{REMOVE_REFUSAL_TEXT[check.reason]}</p>
      )}
    </Modal>
  );
}
