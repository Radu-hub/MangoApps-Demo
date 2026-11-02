// Template rules. Changes only affect plans generated later; existing plans are snapshots and are never touched.
import { DEPARTMENTS } from './labels';
import { derivePhaseFromOffset } from './phase';
import { parseMinutes } from './plan';
import type { Department, PlanTask, TaskTemplate } from './types';
import type { TemplateDraft } from './validation';

type TemplateFields = Omit<TaskTemplate, 'id' | 'archived' | 'updatedAt' | 'updatedById'>;

/** Template fields from a validated draft; the phase is always derived from the offset. */
function fieldsFromDraft(draft: TemplateDraft): TemplateFields {
  const dueOffsetDays = Number.parseInt(draft.dueOffsetDays, 10);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    department: (draft.department || 'all') as Department | 'all',
    dueOffsetDays,
    phase: derivePhaseFromOffset(dueOffsetDays),
    priority: draft.priority,
    estimatedMinutes: parseMinutes(draft.estimatedMinutes),
    ...(draft.docId ? { docId: draft.docId } : {}),
  };
}

/** Blank form values for a new template. */
export function emptyTemplateDraft(department: Department | 'all' | ''): TemplateDraft {
  return { title: '', description: '', department, dueOffsetDays: '', priority: 'required', estimatedMinutes: '', docId: '' };
}

/** Form values for editing an existing template. */
export function draftFromTemplate(template: TaskTemplate): TemplateDraft {
  return {
    title: template.title,
    description: template.description,
    department: template.department,
    dueOffsetDays: String(template.dueOffsetDays),
    priority: template.priority,
    estimatedMinutes: String(template.estimatedMinutes),
    docId: template.docId ?? '',
  };
}

/** Adds a template from a validated draft, deriving its phase. */
export function createTemplate(
  templates: TaskTemplate[],
  draft: TemplateDraft,
  ids: { id: string; editorId: string },
  now: Date,
): TaskTemplate[] {
  const template: TaskTemplate = {
    id: ids.id,
    ...fieldsFromDraft(draft),
    archived: false,
    updatedAt: now.toISOString(),
    updatedById: ids.editorId,
  };
  return [...templates, template];
}

/** Replaces a template's fields. Existing plans are snapshots and are not touched. */
export function updateTemplate(
  templates: TaskTemplate[],
  templateId: string,
  draft: TemplateDraft,
  editorId: string,
  now: Date,
): TaskTemplate[] {
  return templates.map((t) =>
    t.id === templateId
      ? { id: t.id, ...fieldsFromDraft(draft), archived: t.archived, updatedAt: now.toISOString(), updatedById: editorId }
      : t,
  );
}

function setArchived(templates: TaskTemplate[], templateId: string, archived: boolean, editorId: string, now: Date) {
  return templates.map((t) =>
    t.id === templateId ? { ...t, archived, updatedAt: now.toISOString(), updatedById: editorId } : t,
  );
}

/** Archived templates are skipped by generatePlan. Nothing is ever hard-deleted. */
export function archiveTemplate(templates: TaskTemplate[], templateId: string, editorId: string, now: Date): TaskTemplate[] {
  return setArchived(templates, templateId, true, editorId, now);
}

/** Makes an archived template active again, so new plans include it. */
export function restoreTemplate(templates: TaskTemplate[], templateId: string, editorId: string, now: Date): TaskTemplate[] {
  return setArchived(templates, templateId, false, editorId, now);
}

/** Number of people whose plan includes a task generated from this template. */
export function countPlansFromTemplate(templateId: string, tasks: PlanTask[]): number {
  return new Set(tasks.filter((t) => t.templateId === templateId).map((t) => t.personId)).size;
}

/** Departments a viewer may pick in the template form, in display order. */
export function templateDepartmentOptions(canCreate: (d: Department | 'all') => boolean): (Department | 'all')[] {
  return (['all', ...DEPARTMENTS] as (Department | 'all')[]).filter(canCreate);
}
