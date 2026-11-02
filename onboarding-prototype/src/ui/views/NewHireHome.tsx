// New hire screens.
import { useEffect, useRef, useState } from 'react';
import { formatShortDate, plural } from '../../domain/dates';
import { PHASE_LABELS, firstName } from '../../domain/labels';
import { buildWelcomeText } from '../../domain/messages';
import {
  FOCUS_LIMIT,
  getDone,
  getFocusList,
  getNextOpenDate,
  getProgress,
  getTimelineLabel,
  getUpcoming,
  isNewAssignment,
} from '../../domain/progress';
import type { Doc, Person, PlanTask } from '../../domain/types';
import { useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { List } from '../components/ListRow';
import { Notice, Panel } from '../components/Panel';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { focusRing } from '../components/styles';
import { TaskRow } from '../components/TaskRow';
import { useToast } from '../components/Toast';
import { DocView } from './DocView';
import { TaskDetails } from './TaskDetails';

const UNDO_WINDOW_MS = 5000;

type Screen = { kind: 'welcome' } | { kind: 'home' } | { kind: 'task'; taskId: string };

/** New hire experience: the welcome text, then their plan, then a single task. */
export function NewHireApp({ person }: { person: Person }) {
  const { state, now } = useAppState();
  const [screen, setScreen] = useState<Screen>({ kind: 'welcome' });
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);
  const tasks = state.tasks.filter((t) => t.personId === person.id);
  const task = screen.kind === 'task' ? tasks.find((t) => t.id === screen.taskId) : undefined;

  return (
    <div className="mx-auto w-full max-w-md">
      {screen.kind === 'welcome' && (
        <WelcomeMessage person={person} tasks={tasks} now={now} onOpen={() => setScreen({ kind: 'home' })} />
      )}
      {screen.kind === 'home' && (
        <NewHireHome person={person} tasks={tasks} onOpenTask={(id) => setScreen({ kind: 'task', taskId: id })} />
      )}
      {screen.kind === 'task' && (
        <TaskScreen
          task={task}
          onBack={() => setScreen({ kind: 'home' })}
          onOpenDoc={setOpenDoc}
        />
      )}
      {openDoc && <DocView doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  );
}

function WelcomeMessage({ person, tasks, now, onOpen }: { person: Person; tasks: PlanTask[]; now: Date; onOpen: () => void }) {
  const focus = getFocusList(tasks, now, FOCUS_LIMIT, { startDate: person.startDate });
  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-sm text-ink-muted">Preview: the welcome text {firstName(person.name)} receives</p>
      <div className="rounded border border-border bg-surface">
        <div className="border-b border-divider px-4 py-2 text-sm text-ink-muted">Messages · BrightPath · now</div>
        <button
          type="button"
          onClick={onOpen}
          className={`m-4 block rounded border border-rule bg-neutral-bg px-4 py-3 text-left hover:bg-page ${focusRing}`}
        >
          <span className="block">{buildWelcomeText(person, tasks, focus, now)}</span>
          <span className="mt-2 block text-sm font-semibold text-brand underline underline-offset-2">
            Open my onboarding plan
          </span>
        </button>
      </div>
    </div>
  );
}

function TaskScreen({ task, onBack, onOpenDoc }: { task: PlanTask | undefined; onBack: () => void; onOpenDoc: (d: Doc) => void }) {
  const { state, now, dispatch } = useAppState();
  const toast = useToast();
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back to my plan
        </Button>
      </div>
      {!task ? (
        <Panel>This task is no longer in your plan.</Panel>
      ) : (
        <Panel>
          <h1 className="mb-3 text-xl font-bold">{task.title}</h1>
          <TaskDetails task={task} now={now} docs={state.docs} people={state.people} onOpenDoc={onOpenDoc} />
          <div className="mt-4 border-t border-divider pt-4">
            {task.status === 'done' ? (
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  dispatch({ type: 'undo_complete', taskId: task.id });
                  toast(`“${task.title}” marked as not done.`);
                }}
              >
                Mark as not done
              </Button>
            ) : (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  dispatch({ type: 'complete_task', taskId: task.id, now: new Date() });
                  toast(`Done: ${task.title}`);
                }}
              >
                Mark complete
              </Button>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

function NewHireHome({ person, tasks, onOpenTask }: { person: Person; tasks: PlanTask[]; onOpenTask: (id: string) => void }) {
  const { state, now, dispatch } = useAppState();
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  // While a just-completed task shows "Done / Undo", the focus list is frozen to these ids.
  const [frozenFocus, setFrozenFocus] = useState<string[] | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const progress = getProgress(tasks, now);
  const liveFocus = getFocusList(tasks, now, FOCUS_LIMIT, { startDate: person.startDate });
  const focus = frozenFocus
    ? frozenFocus.map((id) => tasks.find((t) => t.id === id)).filter((t): t is PlanTask => t !== undefined)
    : liveFocus;
  const upcoming = getUpcoming(tasks, now, { startDate: person.startDate, focusIds: focus.map((t) => t.id) });
  const upcomingCount = upcoming.reduce((n, g) => n + g.tasks.length, 0);
  const done = getDone(tasks).filter((t) => !focus.some((f) => f.id === t.id));
  const nextOpen = getNextOpenDate(tasks, now, person.startDate);
  const assigned = tasks.filter((t) => isNewAssignment(t, person, now));
  const assigner = (t: PlanTask) => state.people.find((p) => p.id === t.addedById)?.name ?? 'BrightPath';

  function restartUndoWindow() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFrozenFocus(null), UNDO_WINDOW_MS);
  }

  function complete(task: PlanTask) {
    setFrozenFocus((current) => current ?? focus.map((t) => t.id));
    dispatch({ type: 'complete_task', taskId: task.id, now: new Date() });
    setAnnouncement(`${task.title} marked done. Undo is available for a few seconds.`);
    restartUndoWindow();
  }

  function undo(task: PlanTask) {
    dispatch({ type: 'undo_complete', taskId: task.id });
    setAnnouncement(`${task.title} marked as not done.`);
    restartUndoWindow();
  }

  return (
    <div className="pb-24 pt-2">
      <h1 className="text-2xl font-bold">Hi {firstName(person.name)}</h1>
      <p className="text-ink-muted">{getTimelineLabel(person, tasks, now)}</p>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold">
            {progress.done} of {progress.total} done
          </span>
          {progress.overdueCount > 0 && <Chip tone="red">{plural(progress.overdueCount, 'overdue task')}</Chip>}
        </div>
        <ProgressBar progress={progress} />
      </div>

      {assigned.length > 0 && (
        <Notice tone="amber" className="mt-4">
          <p className="font-bold">New task assigned</p>
          {assigned.map((t) => (
            <p key={t.id} className="text-sm">
              {t.title} · due {formatShortDate(t.dueDate)} · added by {assigner(t)}
            </p>
          ))}
        </Notice>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {progress.status === 'complete' && !frozenFocus ? (
        <>
          <SectionHeader title="Onboarding complete" />
          <Panel>
            <p className="font-semibold">You’ve finished all {plural(progress.total, 'task')}.</p>
            <p className="text-ink-muted">Nothing else to do. New tasks from HR or your manager will show up here.</p>
          </Panel>
        </>
      ) : (
        <>
          <SectionHeader title="Focus on these first" count={focus.length} />
          {focus.length === 0 ? (
            <Panel>
              <p className="font-semibold">You’re all set for now.</p>
              {nextOpen && <p className="text-ink-muted">Next task opens {formatShortDate(nextOpen)}.</p>}
            </Panel>
          ) : (
            <List label="Focus on these first">
              {focus.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  people={state.people}
                  onOpen={() => onOpenTask(t.id)}
                  actions={
                    t.status === 'done' ? (
                      <Button variant="secondary" className="w-full sm:w-auto" onClick={() => undo(t)}>
                        Undo
                      </Button>
                    ) : (
                      <Button className="w-full sm:w-auto" onClick={() => complete(t)}>
                        Complete
                      </Button>
                    )
                  }
                />
              ))}
            </List>
          )}

          <SectionHeader
            title="Coming up"
            count={upcomingCount}
            collapsible={{ open: showUpcoming, onToggle: () => setShowUpcoming((v) => !v), controls: 'coming-up' }}
          />
          <div id="coming-up" hidden={!showUpcoming}>
            {upcomingCount === 0 ? (
              <p className="text-ink-muted">Nothing else is scheduled.</p>
            ) : (
              upcoming.map((group) => (
                <div key={group.phase} className="mb-4">
                  <h3 className="mb-1 text-sm font-semibold text-ink">
                    {PHASE_LABELS[group.phase]} · {plural(group.tasks.length, 'task')}
                  </h3>
                  <List label={PHASE_LABELS[group.phase]}>
                    {group.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} now={now} people={state.people} onOpen={() => onOpenTask(t.id)} />
                    ))}
                  </List>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <SectionHeader
        title="Done"
        count={done.length}
        collapsible={{ open: showDone, onToggle: () => setShowDone((v) => !v), controls: 'done-list' }}
      />
      <div id="done-list" hidden={!showDone}>
        {done.length === 0 ? (
          <p className="text-ink-muted">Nothing completed yet.</p>
        ) : (
          <List label="Done">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} now={now} people={state.people} onOpen={() => onOpenTask(t.id)} />
            ))}
          </List>
        )}
      </div>
    </div>
  );
}
