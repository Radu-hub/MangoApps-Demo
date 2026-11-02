// Staff screen: people overview.
import { useState } from 'react';
import { formatShortDate, plural } from '../../domain/dates';
import { DEPARTMENT_LABELS, STATUS_LABELS } from '../../domain/labels';
import { canAddNewHire } from '../../domain/permissions';
import { getDayOffset, getFollowUps, getPeopleOverview, getTimelineLabel, groupTasksByPerson, type FollowUp } from '../../domain/progress';
import type { Person } from '../../domain/types';
import { useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Chip, STATUS_TONES } from '../components/Chip';
import { List, rowClasses } from '../components/ListRow';
import { Panel } from '../components/Panel';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { focusRing } from '../components/styles';
import { ReminderModal } from './ReminderModal';

interface PeopleListProps {
  onOpenPerson: (id: string) => void;
  onAddHire: () => void;
}

/** "Starts Mon, Nov 2" or "Started Tue, Oct 20". */
export function startText(person: Person, now: Date): string {
  const offset = getDayOffset(person, now);
  if (!person.startDate || offset === null) return 'No start date';
  return `${offset < 0 ? 'Starts' : 'Started'} ${formatShortDate(person.startDate)}`;
}

/** The staff home page: who has overdue tasks, then everyone the viewer can see. */
export function PeopleList({ onOpenPerson, onAddHire }: PeopleListProps) {
  const { state, viewer, now } = useAppState();
  const [reminding, setReminding] = useState<FollowUp | null>(null);
  const tasksByPerson = groupTasksByPerson(state.tasks);
  const overview = getPeopleOverview(state.people, tasksByPerson, viewer, now);
  const followUps = getFollowUps(state.people, tasksByPerson, viewer, now);
  const isHr = viewer.role === 'hr_admin';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{isHr ? 'All new hires' : 'Your team'}</h1>
          <p className="text-sm text-ink-muted">
            {isHr ? 'Everyone with an onboarding plan at BrightPath.' : 'New hires who report to you.'}
          </p>
        </div>
        {canAddNewHire(viewer) && <Button onClick={onAddHire}>Add new hire</Button>}
      </div>

      {followUps.length > 0 && (
        <section aria-labelledby="follow-ups" className="mt-4 rounded border border-red-border bg-overdue-bg">
          <h2 id="follow-ups" className="border-b border-red-border px-3 py-2 font-bold text-red-text">
            {followUps.length === 1 ? '1 person has' : `${followUps.length} people have`} overdue tasks
          </h2>
          <ul>
            {followUps.map((f) => (
              <li
                key={f.person.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-red-border px-3 py-2 first:border-t-0"
              >
                <span>
                  <span className="font-semibold">{f.person.name}</span>
                  <span className="text-ink-muted">
                    {' '}
                    · {plural(f.overdueTasks.length, 'overdue task')} · oldest {plural(f.maxDaysOverdue, 'day')} late
                  </span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => setReminding(f)}>
                  Remind
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SectionHeader title="People" count={overview.length} />
      {overview.length === 0 ? (
        <Panel>
          <p>{isHr ? 'No new hires yet.' : 'No new hires on your team right now.'}</p>
        </Panel>
      ) : (
        <List label="People">
          {overview.map(({ person, progress }) => (
            <li key={person.id} className={rowClasses()}>
              <button
                type="button"
                onClick={() => onOpenPerson(person.id)}
                className={`flex w-full flex-col gap-2 px-3 py-3 text-left hover:bg-page sm:flex-row sm:items-center sm:justify-between ${focusRing}`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink underline-offset-2">{person.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {person.jobTitle} · {DEPARTMENT_LABELS[person.department]}
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {startText(person, now)} · {getTimelineLabel(person, tasksByPerson[person.id] ?? [], now, { audience: 'staff' })}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col gap-1 sm:w-56 sm:items-end">
                  <span className="flex flex-wrap items-center gap-2">
                    <Chip tone={STATUS_TONES[progress.status]}>{STATUS_LABELS[progress.status]}</Chip>
                    {progress.overdueCount > 0 && <Chip tone="red">{progress.overdueCount} overdue</Chip>}
                    <span className="text-sm">
                      {progress.done} of {progress.total} done
                    </span>
                  </span>
                  <ProgressBar progress={progress} className="w-full sm:w-40" />
                </span>
              </button>
            </li>
          ))}
        </List>
      )}

      {reminding && (
        <ReminderModal
          person={reminding.person}
          tasks={tasksByPerson[reminding.person.id] ?? []}
          onClose={() => setReminding(null)}
        />
      )}
    </div>
  );
}
