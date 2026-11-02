// The app state reducer.
import { completeTask, editTask, removeTask, undoComplete, type TaskChanges } from '../domain/plan';
import { archiveTemplate, createTemplate, restoreTemplate, updateTemplate } from '../domain/templates';
import type { AppState, Person, PlanTask, ReminderLog } from '../domain/types';
import type { TemplateDraft } from '../domain/validation';

/** Everything that can change app state. */
export type Action =
  | { type: 'complete_task'; taskId: string; now: Date }
  | { type: 'undo_complete'; taskId: string }
  | { type: 'add_task'; task: PlanTask }
  | { type: 'remove_task'; taskId: string }
  | { type: 'edit_task'; taskId: string; changes: TaskChanges; editorId: string; now: Date }
  | { type: 'create_template'; id: string; draft: TemplateDraft; editorId: string; now: Date }
  | { type: 'update_template'; templateId: string; draft: TemplateDraft; editorId: string; now: Date }
  | { type: 'archive_template'; templateId: string; editorId: string; now: Date }
  | { type: 'restore_template'; templateId: string; editorId: string; now: Date }
  | { type: 'send_reminder'; log: ReminderLog }
  | { type: 'add_new_hire'; person: Person; tasks: PlanTask[] }
  | { type: 'replace_state'; state: AppState };

/** Pure state transitions. Every rule lives in the domain functions it calls. */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'complete_task':
      return { ...state, tasks: completeTask(state.tasks, action.taskId, action.now) };
    case 'undo_complete':
      return { ...state, tasks: undoComplete(state.tasks, action.taskId) };
    case 'add_task':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'remove_task': {
      const result = removeTask(state.tasks, action.taskId);
      return result.ok ? { ...state, tasks: result.tasks } : state;
    }
    case 'edit_task': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      const person = state.people.find((p) => p.id === task?.personId);
      if (!person) return state;
      const result = editTask(state.tasks, action.taskId, action.changes, action.editorId, person, action.now);
      return result.ok ? { ...state, tasks: result.tasks } : state;
    }
    case 'create_template':
      return {
        ...state,
        templates: createTemplate(state.templates, action.draft, { id: action.id, editorId: action.editorId }, action.now),
      };
    case 'update_template':
      return {
        ...state,
        templates: updateTemplate(state.templates, action.templateId, action.draft, action.editorId, action.now),
      };
    case 'archive_template':
      return { ...state, templates: archiveTemplate(state.templates, action.templateId, action.editorId, action.now) };
    case 'restore_template':
      return { ...state, templates: restoreTemplate(state.templates, action.templateId, action.editorId, action.now) };
    case 'send_reminder':
      return { ...state, reminders: [...state.reminders, action.log] };
    case 'add_new_hire':
      return { ...state, people: [...state.people, action.person], tasks: [...state.tasks, ...action.tasks] };
    case 'replace_state':
      return action.state;
  }
}
