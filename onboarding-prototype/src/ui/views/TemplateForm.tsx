// Staff form: create or edit a template.
import { useState, type FormEvent } from 'react';
import { formatOffset } from '../../domain/dates';
import { DEPARTMENT_LABELS, PHASE_LABELS } from '../../domain/labels';
import { templateEditNotice } from '../../domain/messages';
import { canCreateTemplate } from '../../domain/permissions';
import { TEMPLATE_OFFSET_MAX, TEMPLATE_OFFSET_MIN, derivePhaseFromOffset } from '../../domain/phase';
import { DEFAULT_ESTIMATED_MINUTES } from '../../domain/plan';
import {
  countPlansFromTemplate,
  draftFromTemplate,
  emptyTemplateDraft,
  templateDepartmentOptions,
} from '../../domain/templates';
import type { Department, TaskTemplate } from '../../domain/types';
import { validateTemplate, type TemplateDraft, type TemplateField } from '../../domain/validation';
import { makeId, useAppState } from '../../state/AppStateContext';
import { Field } from '../components/Field';
import { FormModal } from '../components/FormModal';
import { Notice } from '../components/Panel';
import { inputClasses } from '../components/styles';
import { useToast } from '../components/Toast';

interface TemplateFormProps {
  /** The template being edited; omit to create one. */
  template?: TaskTemplate;
  defaultDepartment: Department | 'all' | '';
  onClose: () => void;
}

/** Create or edit a template. The department list is limited by permissions. */
export function TemplateForm({ template, defaultDepartment, onClose }: TemplateFormProps) {
  const { state, viewer, dispatch } = useAppState();
  const toast = useToast();
  const [initial] = useState<TemplateDraft>(() => (template ? draftFromTemplate(template) : emptyTemplateDraft(defaultDepartment)));
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState<Set<TemplateField>>(new Set());

  const departments = templateDepartmentOptions((d) => canCreateTemplate(viewer, d));
  const validation = validateTemplate(draft, state.templates, template?.id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const canSave = validation.ok && (!template || dirty);
  const errorFor = (field: TemplateField) => (touched.has(field) ? validation.errors[field] : undefined);
  const describedBy = (field: TemplateField) => (errorFor(field) ? `tpl-${field}-msg` : undefined);
  const touch = (field: TemplateField) => setTouched((t) => new Set(t).add(field));
  const set = <K extends TemplateField>(key: K, value: TemplateDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    touch(key);
  };

  const offset = /^-?\d+$/.test(draft.dueOffsetDays.trim()) ? Number(draft.dueOffsetDays) : null;
  const timing =
    offset !== null && !validation.errors.dueOffsetDays
      ? `${formatOffset(offset)} · Phase: ${PHASE_LABELS[derivePhaseFromOffset(offset)]}`
      : `A whole number from ${TEMPLATE_OFFSET_MIN} to ${TEMPLATE_OFFSET_MAX}. Negative means before the start date.`;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const now = new Date();
    if (template) {
      dispatch({ type: 'update_template', templateId: template.id, draft, editorId: viewer.id, now });
      toast(`Saved “${draft.title.trim()}”. Changes apply to new hires from now on.`);
    } else {
      dispatch({ type: 'create_template', id: makeId('tpl'), draft, editorId: viewer.id, now });
      toast(`Created “${draft.title.trim()}”. It will be added to new plans.`);
    }
    onClose();
  }

  return (
    <FormModal
      title={template ? 'Edit template' : 'New template'}
      formId="template-form"
      saveLabel={template ? 'Save changes' : 'Create template'}
      canSave={canSave}
      disabledHint={validation.ok ? 'No changes yet.' : 'Fill in the required fields to save.'}
      dirty={dirty}
      onCancel={onClose}
      notice={
        template && (
          <Notice tone="neutral" className="text-sm">
            {templateEditNotice(countPlansFromTemplate(template.id, state.tasks))}
          </Notice>
        )
      }
    >
      <form id="template-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field id="tpl-title" label="Title" error={errorFor('title')}>
          <input
            id="tpl-title"
            className={inputClasses}
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            onBlur={() => touch('title')}
            aria-invalid={Boolean(errorFor('title'))}
            aria-describedby={describedBy('title')}
          />
        </Field>
        <Field id="tpl-description" label="Description" optional>
          <textarea
            id="tpl-description"
            rows={3}
            className={inputClasses}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="tpl-department"
            label="Department"
            error={errorFor('department')}
            hint={departments.length === 1 ? 'You can manage templates for your own department.' : undefined}
          >
            <select
              id="tpl-department"
              className={inputClasses}
              value={draft.department}
              onChange={(e) => set('department', e.target.value as TemplateDraft['department'])}
              onBlur={() => touch('department')}
              aria-invalid={Boolean(errorFor('department'))}
              aria-describedby="tpl-department-msg"
            >
              {departments.length > 1 && <option value="">Choose a department</option>}
              {departments.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="tpl-offset" label="Due, in days from start" error={errorFor('dueOffsetDays')} hint={timing}>
            <input
              id="tpl-offset"
              type="number"
              min={TEMPLATE_OFFSET_MIN}
              max={TEMPLATE_OFFSET_MAX}
              step={1}
              className={inputClasses}
              value={draft.dueOffsetDays}
              onChange={(e) => set('dueOffsetDays', e.target.value)}
              onBlur={() => touch('dueOffsetDays')}
              aria-invalid={Boolean(errorFor('dueOffsetDays'))}
              aria-describedby="tpl-offset-msg"
            />
          </Field>
          <Field id="tpl-priority" label="Priority">
            <select
              id="tpl-priority"
              className={inputClasses}
              value={draft.priority}
              onChange={(e) => set('priority', e.target.value as TemplateDraft['priority'])}
            >
              <option value="required">Required</option>
              <option value="recommended">Recommended</option>
            </select>
          </Field>
          <Field
            id="tpl-minutes"
            label="Estimated minutes"
            optional
            error={errorFor('estimatedMinutes')}
            hint={`Defaults to ${DEFAULT_ESTIMATED_MINUTES}.`}
          >
            <input
              id="tpl-minutes"
              inputMode="numeric"
              className={inputClasses}
              value={draft.estimatedMinutes}
              onChange={(e) => set('estimatedMinutes', e.target.value)}
              onBlur={() => touch('estimatedMinutes')}
              aria-invalid={Boolean(errorFor('estimatedMinutes'))}
              aria-describedby="tpl-minutes-msg"
            />
          </Field>
        </div>
        <Field id="tpl-doc" label="Related document" optional>
          <select id="tpl-doc" className={inputClasses} value={draft.docId} onChange={(e) => set('docId', e.target.value)}>
            <option value="">None</option>
            {state.docs.map((d) => (
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
