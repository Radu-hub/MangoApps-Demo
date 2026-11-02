// Staff screen: templates.
import { useState } from 'react';
import { formatDuration, formatOffset } from '../../domain/dates';
import { DEPARTMENT_LABELS, PHASES, PHASE_LABELS, PRIORITY_LABELS } from '../../domain/labels';
import { getUpdatedText } from '../../domain/messages';
import { canCreateTemplate, canEditTemplate, getVisibleTemplateDepartments } from '../../domain/permissions';
import type { Department, TaskTemplate } from '../../domain/types';
import { useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { List, ListRow } from '../components/ListRow';
import { Modal } from '../components/Modal';
import { SectionHeader } from '../components/SectionHeader';
import { focusRing } from '../components/styles';
import { useToast } from '../components/Toast';
import { TemplateForm } from './TemplateForm';

type FormState = { template?: TaskTemplate; department: Department | 'all' | '' } | null;

/** Templates grouped by department then phase. Editable where the viewer owns the department. */
export function TemplatesList() {
  const { state, viewer, dispatch } = useAppState();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(null);
  const [archiving, setArchiving] = useState<TaskTemplate | null>(null);
  const [openArchived, setOpenArchived] = useState<Set<string>>(new Set());

  const departments = getVisibleTemplateDepartments(viewer);
  const canCreateAny = departments.some((d) => canCreateTemplate(viewer, d));
  const isHr = viewer.role === 'hr_admin';

  const row = (t: TaskTemplate) => {
    const editable = canEditTemplate(viewer, t);
    const updated = getUpdatedText(t, state.people);
    const doc = t.docId ? state.docs.find((d) => d.id === t.docId) : undefined;
    return (
      <ListRow key={t.id}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{t.title}</span>
              <Chip tone={t.priority === 'required' ? 'amber' : 'neutral'}>{PRIORITY_LABELS[t.priority]}</Chip>
              {t.archived && <Chip tone="neutral">Archived</Chip>}
            </div>
            <p className="text-sm text-ink-muted">
              {formatOffset(t.dueOffsetDays)} · {formatDuration(t.estimatedMinutes)}
              {doc && ` · Doc: ${doc.title}`}
            </p>
            {updated && <p className="text-sm text-ink-muted">{updated}</p>}
          </div>
          {editable && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {t.archived ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'restore_template', templateId: t.id, editorId: viewer.id, now: new Date() });
                    toast(`Restored “${t.title}”. It will be added to new plans.`);
                  }}
                >
                  Restore
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setForm({ template: t, department: t.department })}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setArchiving(t)}>
                    Archive
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </ListRow>
    );
  };

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Templates</h1>
          <p className="text-ink-muted">
            New plans combine company-wide tasks with the hire’s department tasks. Changes apply to new hires only;
            existing plans are never changed.
          </p>
        </div>
        {canCreateAny && (
          <Button onClick={() => setForm({ department: isHr ? '' : viewer.department })}>New template</Button>
        )}
      </div>

      {departments.map((department) => {
        const all = state.templates.filter((t) => t.department === department);
        const active = all.filter((t) => !t.archived);
        const archived = all.filter((t) => t.archived);
        const archivedOpen = openArchived.has(department);
        const archivedId = `archived-${department}`;
        return (
          <section key={department}>
            <SectionHeader
              title={DEPARTMENT_LABELS[department]}
              count={active.length}
              action={
                !canCreateTemplate(viewer, department) ? (
                  <span className="text-sm text-ink-muted">Read-only · managed by HR</span>
                ) : undefined
              }
            />
            {active.length === 0 ? (
              <p className="mb-4 text-ink-muted">
                No {department === 'all' ? 'company-wide' : 'department-specific'} templates.
                {department !== 'all' && ' New hires here get company-wide tasks only.'}
              </p>
            ) : (
              PHASES.map((phase) => {
                const inPhase = active.filter((t) => t.phase === phase).sort((a, b) => a.dueOffsetDays - b.dueOffsetDays);
                if (inPhase.length === 0) return null;
                return (
                  <div key={phase} className="mb-4">
                    <h3 className="mb-1 text-sm font-semibold">
                      {PHASE_LABELS[phase]} · {inPhase.length}
                    </h3>
                    <List label={`${DEPARTMENT_LABELS[department]}, ${PHASE_LABELS[phase]}`}>{inPhase.map(row)}</List>
                  </div>
                );
              })
            )}
            {archived.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1 text-sm font-semibold">
                  <button
                    type="button"
                    aria-expanded={archivedOpen}
                    aria-controls={archivedId}
                    onClick={() =>
                      setOpenArchived((s) => {
                        const next = new Set(s);
                        if (next.has(department)) next.delete(department);
                        else next.add(department);
                        return next;
                      })
                    }
                    className={`flex min-h-11 items-center gap-2 rounded sm:min-h-0 ${focusRing}`}
                  >
                    Archived ({archived.length})
                    <span className="font-normal text-ink-muted underline underline-offset-2">
                      {archivedOpen ? 'Hide' : 'Show'}
                    </span>
                  </button>
                </h3>
                <div id={archivedId} hidden={!archivedOpen}>
                  <List label={`${DEPARTMENT_LABELS[department]}, archived`}>{archived.map(row)}</List>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {form && (
        <TemplateForm
          key={form.template?.id ?? 'new'}
          template={form.template}
          defaultDepartment={form.department}
          onClose={() => setForm(null)}
        />
      )}

      {archiving && (
        <Modal
          title="Archive template?"
          onClose={() => setArchiving(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setArchiving(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'archive_template', templateId: archiving.id, editorId: viewer.id, now: new Date() });
                  toast(`Archived “${archiving.title}”. You can restore it from the Archived section.`);
                  setArchiving(null);
                }}
              >
                Archive
              </Button>
            </>
          }
        >
          <p>Archive '{archiving.title}'? It won't be added to new plans. Existing plans keep it.</p>
        </Modal>
      )}
    </div>
  );
}
