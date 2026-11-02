// HR screen: add a new hire and create their plan.
import { useRef, useState, type FormEvent } from 'react';
import { formatShortDate, plural } from '../../domain/dates';
import { DEPARTMENTS, DEPARTMENT_LABELS, PHASE_LABELS } from '../../domain/labels';
import { REMOVE_REFUSAL_TEXT, createCustomTask, generatePlan, hasDepartmentTemplates, removeTask } from '../../domain/plan';
import { getBehindAtStartWarning } from '../../domain/messages';
import { getOverdueTasks, groupByPhase } from '../../domain/progress';
import type { Department, Person, PlanTask } from '../../domain/types';
import { validateNewHire, type NewHireDraft } from '../../domain/validation';
import { makeId, useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { List } from '../components/ListRow';
import { Notice, Panel } from '../components/Panel';
import { SectionHeader } from '../components/SectionHeader';
import { inputClasses } from '../components/styles';
import { TaskRow } from '../components/TaskRow';
import { useToast } from '../components/Toast';
import { TaskForm } from './TaskForm';

const EMPTY_DRAFT: NewHireDraft = {
  name: '',
  jobTitle: '',
  department: '',
  managerId: '',
  startDate: '',
  email: '',
  phone: '',
};

interface AddNewHireProps {
  onCancel: () => void;
  onCreated: (personId: string) => void;
}

/** Two steps: enter the details, then review, adjust and confirm the generated plan. */
export function AddNewHire({ onCancel, onCreated }: AddNewHireProps) {
  const { state, viewer, now, dispatch } = useAppState();
  const toast = useToast();
  // Stays the same if the plan is regenerated, so tasks always point at this person.
  const personId = useRef(makeId('p')).current;
  const [draft, setDraft] = useState<NewHireDraft>(EMPTY_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const [plan, setPlan] = useState<PlanTask[] | null>(null);
  const [step, setStep] = useState<'details' | 'review'>('details');
  const [adding, setAdding] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const managers = state.people.filter((p) => p.role === 'manager' || p.role === 'hr_admin');
  const validation = validateNewHire(draft, now);
  const errors = submitted ? validation.errors : {};

  function set<K extends keyof NewHireDraft>(key: K, value: NewHireDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Suggest the department's manager when none is chosen yet.
      if (key === 'department' && !d.managerId) {
        const suggested = state.people.find((p) => p.role === 'manager' && p.department === value);
        if (suggested) next.managerId = suggested.id;
      }
      return next;
    });
  }

  function toPerson(): Person {
    return {
      id: personId,
      name: draft.name.trim(),
      role: 'new_hire',
      department: draft.department as Department,
      jobTitle: draft.jobTitle.trim(),
      managerId: draft.managerId,
      startDate: draft.startDate,
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    };
  }

  function generate(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    setPlan(generatePlan(toPerson(), state.templates, viewer.id, new Date()));
    setPlanNote(null);
    setStep('review');
    window.scrollTo(0, 0);
  }

  function remove(task: PlanTask) {
    if (!plan) return;
    const result = removeTask(plan, task.id);
    if (result.ok) {
      setPlan(result.tasks);
      setPlanNote(`Removed “${task.title}”.`);
    } else {
      setPlanNote(REMOVE_REFUSAL_TEXT[result.reason]);
    }
  }

  function confirm() {
    if (!plan) return;
    const person = toPerson();
    const overdue = getOverdueTasks(plan, new Date()).length;
    dispatch({ type: 'add_new_hire', person, tasks: plan });
    toast(
      overdue > 0
        ? `Plan created for ${person.name}. It starts out Behind with ${plural(overdue, 'overdue task')}.`
        : `Plan created for ${person.name} with ${plural(plan.length, 'task')}. A welcome text would go out now.`,
    );
    onCreated(person.id);
  }

  if (step === 'review' && plan) {
    const person = toPerson();
    const manager = managers.find((m) => m.id === person.managerId);
    const required = plan.filter((t) => t.priority === 'required').length;
    const behindWarning = getBehindAtStartWarning(plan, now);
    return (
      <div className="pb-24">
        <h1 className="text-xl font-bold">Review {person.name}’s plan</h1>
        <p className="text-ink-muted">Step 2 of 2 · Remove or add tasks, then confirm.</p>
        <Panel className="mt-4">
          <p className="font-semibold">
            {person.jobTitle} · {DEPARTMENT_LABELS[person.department]}
          </p>
          <p className="text-sm text-ink-muted">
            Starts {formatShortDate(person.startDate!)}
            {manager && ` · Reports to ${manager.name}`}
          </p>
          <p className="mt-2 text-sm">
            {plural(plan.length, 'task')} · {required} required · due dates are calculated from the start date.
          </p>
        </Panel>
        {!hasDepartmentTemplates(state.templates, person.department) && (
          <Notice tone="neutral" className="mt-4">
            {DEPARTMENT_LABELS[person.department]} has no department-specific templates yet, so this plan only has
            company-wide tasks. Add any team-specific tasks below.
          </Notice>
        )}
        {behindWarning && (
          <Notice tone="red" className="mt-4">
            <p className="font-bold">Starts out behind</p>
            <p className="text-sm">{behindWarning}</p>
          </Notice>
        )}
        {validation.warnings.map((w) => (
          <Notice key={w} tone="amber" className="mt-4">
            {w}
          </Notice>
        ))}
        <p className="sr-only" aria-live="polite">
          {planNote}
        </p>
        {planNote && <p className="mt-4 text-sm font-semibold">{planNote}</p>}

        {groupByPhase(plan).map((group) => (
          <div key={group.phase}>
            <SectionHeader title={PHASE_LABELS[group.phase]} count={group.tasks.length} />
            <List label={PHASE_LABELS[group.phase]}>
              {group.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  extraChips={t.source === 'custom' ? <Chip tone="neutral">Added</Chip> : undefined}
                  actions={
                    <Button variant="danger" size="sm" onClick={() => remove(t)} disabled={plan.length <= 1}>
                      Remove
                    </Button>
                  }
                />
              ))}
            </List>
          </div>
        ))}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-rule pt-4">
          <Button onClick={confirm}>Confirm and create plan</Button>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add task
          </Button>
          <Button variant="secondary" onClick={() => setStep('details')}>
            Back to details
          </Button>
        </div>

        {adding && (
          <TaskForm
            person={person}
            existingTasks={plan}
            docs={state.docs}
            now={now}
            defaultDueDate={person.startDate!}
            onCancel={() => setAdding(false)}
            onSubmit={(taskDraft) => {
              const task = createCustomTask(taskDraft, { id: makeId('task'), personId, addedById: viewer.id }, person, new Date());
              setPlan([...plan, task]);
              setPlanNote(`Added “${task.title}”.`);
              toast(`Added “${task.title}” to the plan preview.`);
              setAdding(false);
            }}
          />
        )}
      </div>
    );
  }

  const describedBy = (field: keyof NewHireDraft) => (errors[field] ? `hire-${field}-msg` : undefined);
  const textInput = (field: 'name' | 'jobTitle' | 'email' | 'phone', type = 'text') => (
    <input
      id={`hire-${field}`}
      type={type}
      className={inputClasses}
      value={draft[field]}
      onChange={(e) => set(field, e.target.value)}
      aria-invalid={Boolean(errors[field])}
      aria-describedby={describedBy(field)}
    />
  );

  return (
    <div className="pb-24">
      <h1 className="text-xl font-bold">Add a new hire</h1>
      <p className="text-ink-muted">Step 1 of 2 · We’ll generate a plan from company-wide and department templates.</p>
      <Panel className="mt-4 max-w-2xl">
        <form noValidate onSubmit={generate} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="hire-name" label="Full name" error={errors.name}>
              {textInput('name')}
            </Field>
            <Field id="hire-jobTitle" label="Job title" error={errors.jobTitle}>
              {textInput('jobTitle')}
            </Field>
            <Field id="hire-department" label="Department" error={errors.department}>
              <select
                id="hire-department"
                className={inputClasses}
                value={draft.department}
                onChange={(e) => set('department', e.target.value as Department | '')}
                aria-invalid={Boolean(errors.department)}
                aria-describedby={describedBy('department')}
              >
                <option value="">Choose a department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="hire-managerId" label="Manager" error={errors.managerId}>
              <select
                id="hire-managerId"
                className={inputClasses}
                value={draft.managerId}
                onChange={(e) => set('managerId', e.target.value)}
                aria-invalid={Boolean(errors.managerId)}
                aria-describedby={describedBy('managerId')}
              >
                <option value="">Choose a manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.jobTitle}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="hire-startDate" label="Start date" error={errors.startDate}>
              <input
                id="hire-startDate"
                type="date"
                className={inputClasses}
                value={draft.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={describedBy('startDate')}
              />
            </Field>
            <div className="hidden sm:block" />
            <Field id="hire-email" label="Personal email" optional error={errors.email} hint="Where the welcome email goes.">
              {textInput('email', 'email')}
            </Field>
            <Field id="hire-phone" label="Mobile phone" optional hint="Where the welcome text goes.">
              {textInput('phone', 'tel')}
            </Field>
          </div>
          {validation.warnings.map((w) => (
            <Notice key={w} tone="amber">
              {w}
            </Notice>
          ))}
          {plan && <p className="text-sm text-ink-muted">Generating again replaces the plan and discards your edits to it.</p>}
          <div className="flex flex-wrap gap-2 border-t border-divider pt-4">
            <Button type="submit">Generate plan</Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
