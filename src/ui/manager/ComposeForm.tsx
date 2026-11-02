import { useState, type FormEvent, type ReactNode } from "react";
import { canPostTo, getRecipients } from "../../domain/audience";
import { toLocalDateString } from "../../domain/dates";
import { getRequiredPostWarning } from "../../domain/guardrails";
import type { Announcement, Audience, Draft, Priority } from "../../domain/types";
import { hasErrors, validateDraft } from "../../domain/validation";
import { useApp } from "../../state/AppStateContext";
import { AudiencePicker } from "./AudiencePicker";
import { PostPreview } from "./PostPreview";
import { BUTTON_PRIMARY, FOCUS_RING, INPUT, PANEL } from "../styles";

interface Props {
  onCancel: () => void;
  onPosted: (id: string, reach: number) => void;
}

/** The new-announcement form. Validation and the reach count update on every keystroke. */
export function ComposeForm({ onCancel, onPosted }: Props) {
  const { state, viewer, actions } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("fyi");
  const [dueDate, setDueDate] = useState("");
  const [audience, setAudience] = useState<Audience>(() => ({
    storeIds: canPostTo(viewer, { storeIds: "all", departments: "all" }) ? "all" : [viewer.storeId],
    departments: "all",
  }));
  const [touched, setTouched] = useState({ title: false, body: false });
  const [previewing, setPreviewing] = useState(false);

  const now = new Date();
  // The due date field is hidden for FYI, so a leftover value is dropped rather than flagged.
  const draft: Draft = {
    title,
    body,
    priority,
    audience,
    ...(priority === "required" && dueDate ? { dueDate } : {}),
  };
  const errors = validateDraft(draft, state.employees, viewer, now);
  const reach = getRecipients(state.employees, { ...draft, authorId: viewer.id }).length;
  // Non-blocking: shown only while "Action required" is selected, never disables Post.
  const frequencyWarning =
    priority === "required" ? getRequiredPostWarning(viewer.id, state.announcements, now) : undefined;

  // Post opens a preview first; only "Confirm & post" actually publishes.
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!hasErrors(errors)) setPreviewing(true);
  }

  function confirm() {
    if (hasErrors(errors)) return;
    onPosted(actions.post(draft), reach);
  }

  const previewAnnouncement: Announcement = { ...draft, id: "preview", authorId: viewer.id, createdAt: now.toISOString() };

  return (
    <form onSubmit={submit} className={`space-y-5 p-5 ${PANEL}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">New announcement</h1>
        <button type="button" onClick={onCancel} className={`rounded text-sm font-semibold text-ink underline underline-offset-2 ${FOCUS_RING}`}>
          Cancel
        </button>
      </div>

      <Field label="Title" htmlFor="post-title" error={touched.title ? errors.title : undefined}>
        <input
          id="post-title"
          className={`w-full px-3 py-2 ${INPUT}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
        />
      </Field>

      <Field label="Message" htmlFor="post-message" error={touched.body ? errors.body : undefined}>
        <textarea
          id="post-message"
          className={`min-h-32 w-full px-3 py-2 ${INPUT}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, body: true }))}
        />
      </Field>

      <Field label="Priority">
        <div className="grid grid-cols-2 gap-2">
          <PriorityOption
            selected={priority === "fyi"}
            onSelect={() => setPriority("fyi")}
            title="FYI"
            hint="No notification. Nothing asked of staff."
          />
          <PriorityOption
            selected={priority === "required"}
            onSelect={() => setPriority("required")}
            title="Action required"
            hint="One notification. Staff confirm with one tap."
          />
        </div>
      </Field>

      {frequencyWarning && (
        <p role="status" className="-mt-2 rounded border border-ink bg-page p-3 text-sm font-semibold text-ink">
          {frequencyWarning}
        </p>
      )}

      {priority === "required" && (
        <Field label="Due date (optional)" htmlFor="post-due-date" error={errors.dueDate}>
          <input
            id="post-due-date"
            type="date"
            className={`px-3 py-2 ${INPUT}`}
            min={toLocalDateString(now)}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      )}

      <Field label="Audience" error={errors.audience}>
        <AudiencePicker author={viewer} stores={state.stores} value={audience} onChange={setAudience} />
      </Field>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm text-ink">
          Will reach <strong>{reach}</strong> {reach === 1 ? "person" : "people"}
        </span>
        <button
          type="submit"
          disabled={hasErrors(errors)}
          className={`px-5 py-2 disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_PRIMARY}`}
        >
          Post
        </button>
      </div>
      {previewing && (
        <PostPreview
          announcement={previewAnnouncement}
          stores={state.stores}
          authorName={viewer.name}
          reach={reach}
          onEdit={() => setPreviewing(false)}
          onConfirm={confirm}
        />
      )}
    </form>
  );
}

/** A form section with a heading and an optional error. Pass `htmlFor` when the section holds a single input. */
function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  const labelClass = "mb-1 block text-sm font-semibold text-ink";
  return (
    <div>
      {htmlFor ? <label htmlFor={htmlFor} className={labelClass}>{label}</label> : <div className={labelClass}>{label}</div>}
      {children}
      {error && <p className="mt-1 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** One of the two priority choices, shown as a selectable card with a hint. */
function PriorityOption(props: { selected: boolean; onSelect: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onSelect}
      className={`rounded border p-3 text-left ${FOCUS_RING} ${
        props.selected ? "border-action bg-page ring-1 ring-action" : "border-muted bg-white"
      }`}
    >
      <div className="font-semibold text-ink">{props.title}</div>
      <div className="text-sm text-muted">{props.hint}</div>
    </button>
  );
}
