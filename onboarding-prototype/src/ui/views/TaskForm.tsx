// Staff form: add or edit a plan task.
import { useState, type FormEvent } from 'react';
import { isISODate } from '../../domain/dates';
import { PHASE_LABELS } from '../../domain/labels';
import { derivePhaseForTask } from '../../domain/phase';
import { DEFAULT_ESTIMATED_MINUTES, draftFromTask } from '../../domain/plan';
import type { Doc, Person, PlanTask } from '../../domain/types';
import { validateCustomTask, type CustomTaskDraft, type CustomTaskField } from '../../domain/validation';
import { Field } from '../components/Field';
import { FormModal } from '../components/FormModal';
import { Notice } from '../components/Panel';
import { inputClasses } from '../components/styles';

interface TaskFormProps {
  /** The task being edited; omit to add a new task. */
  task?: PlanTask;
  person: Pick<Person, 'name' | 'startDate'>;
  existingTasks: PlanTask[];
  docs: Doc[];
  now: Date;
  defaultDueDate: string;
  onCancel: () => void;
  onSubmit: (draft: CustomTaskDraft) => void;
}

/** Add or edit a plan task. The phase is derived from the due date and shown read-only. */
export function TaskForm({ task, person, existingTasks, docs, now, defaultDueDate, onCancel, onSubmit }: TaskFormProps) {
  const [initial] = useState<CustomTaskDraft>(() =>
    task
      ? draftFromTask(task)
      : { title: '', description: '', dueDate: defaultDueDate, priority: 'required', estimatedMinutes: '', docId: '' },
  );
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState<Set<CustomTaskField>>(new Set());

  const validation = validateCustomTask(draft, existingTasks, { ignoreTaskId: task?.id, now });
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const canSave = validation.ok && (!task || dirty);
  const errorFor = (field: CustomTaskField) => (touched.has(field) ? validation.errors[field] : undefined);
  const describedBy = (field: CustomTaskField) => (errorFor(field) ? `task-${field}-msg` : undefined);
  const touch = (field: CustomTaskField) => setTouched((t) => new Set(t).add(field));
  const set = <K extends CustomTaskField>(key: K, value: CustomTaskDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    touch(key);
  };
  const phase = isISODate(draft.dueDate) ? PHASE_LABELS[derivePhaseForTask(person, draft.dueDate)] : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSave) onSubmit(draft);
  }

  return (
    <FormModal
      title={task ? 'Edit task' : `Add a task for ${person.name}`}
      formId="task-form"
      saveLabel={task ? 'Save changes' : 'Add task'}
      canSave={canSave}
      disabledHint={validation.ok ? 'No changes yet.' : 'Fill in the required fields to save.'}
      dirty={dirty}
      onCancel={onCancel}
    >
      <form id="task-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field id="task-title" label="Title" error={errorFor('title')}>
          <input
            id="task-title"
            className={inputClasses}
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            onBlur={() => touch('title')}
            aria-invalid={Boolean(errorFor('title'))}
            aria-describedby={describedBy('title')}
          />
        </Field>
        <Field id="task-description" label="Description" optional>
          <textarea
            id="task-description"
            rows={3}
            className={inputClasses}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="task-dueDate" label="Due date" error={errorFor('dueDate')}>
            <input
              id="task-dueDate"
              type="date"
              className={inputClasses}
              value={draft.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              onBlur={() => touch('dueDate')}
              aria-invalid={Boolean(errorFor('dueDate'))}
              aria-describedby={describedBy('dueDate')}
            />
          </Field>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-ink">Phase</p>
            <p className="flex min-h-11 items-center sm:min-h-10" aria-live="polite">
              {phase ?? '—'}
            </p>
            <p className="text-sm text-ink-muted">Set by the due date.</p>
          </div>
          <Field id="task-priority" label="Priority">
            <select
              id="task-priority"
              className={inputClasses}
              value={draft.priority}
              onChange={(e) => set('priority', e.target.value as CustomTaskDraft['priority'])}
            >
              <option value="required">Required</option>
              <option value="recommended">Recommended</option>
            </select>
          </Field>
          <Field
            id="task-estimatedMinutes"
            label="Estimated minutes"
            optional
            error={errorFor('estimatedMinutes')}
            hint={`Defaults to ${DEFAULT_ESTIMATED_MINUTES}.`}
          >
            <input
              id="task-estimatedMinutes"
              inputMode="numeric"
              className={inputClasses}
              value={draft.estimatedMinutes}
              onChange={(e) => set('estimatedMinutes', e.target.value)}
              onBlur={() => touch('estimatedMinutes')}
              aria-invalid={Boolean(errorFor('estimatedMinutes'))}
              aria-describedby="task-estimatedMinutes-msg"
            />
          </Field>
        </div>
        <Field id="task-doc" label="Related document" optional>
          <select id="task-doc" className={inputClasses} value={draft.docId} onChange={(e) => set('docId', e.target.value)}>
            <option value="">None</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
        {validation.warnings.map((w) => (
          <Notice key={w} tone="amber">
            {w} You can still save it.
          </Notice>
        ))}
      </form>
    </FormModal>
  );
}
