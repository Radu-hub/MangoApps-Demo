// Staff shell: tabs and navigation between screens.
import { useState } from 'react';
import { canAddNewHire, canViewTemplates } from '../../domain/permissions';
import type { Person } from '../../domain/types';
import { focusRing } from '../components/styles';
import { AddNewHire } from './AddNewHire';
import { PeopleList } from './PeopleList';
import { PersonDetail } from './PersonDetail';
import { TemplatesList } from './TemplatesList';

type View = { kind: 'people' } | { kind: 'person'; personId: string } | { kind: 'templates' } | { kind: 'add_hire' };

/** HR and manager screens. Everything shown is scoped by canView. */
export function StaffApp({ viewer }: { viewer: Person }) {
  const [view, setView] = useState<View>({ kind: 'people' });
  const go = (next: View) => {
    setView(next);
    window.scrollTo(0, 0);
  };
  const tabs: { label: string; kind: 'people' | 'templates'; show: boolean }[] = [
    { label: 'People', kind: 'people', show: true },
    { label: 'Templates', kind: 'templates', show: canViewTemplates(viewer) },
  ];
  const activeTab = view.kind === 'templates' ? 'templates' : 'people';

  return (
    <div>
      <nav aria-label="Sections" className="mb-4 flex gap-1 border-b border-rule">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.kind}
              type="button"
              aria-current={activeTab === t.kind ? 'page' : undefined}
              onClick={() => go({ kind: t.kind })}
              className={`-mb-px min-h-11 rounded-t border px-4 font-semibold sm:min-h-9 ${focusRing} ${
                activeTab === t.kind ? 'border-brand bg-brand text-white' : 'border-transparent text-ink hover:bg-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
      </nav>
      {view.kind === 'people' && (
        <PeopleList onOpenPerson={(id) => go({ kind: 'person', personId: id })} onAddHire={() => go({ kind: 'add_hire' })} />
      )}
      {view.kind === 'person' && <PersonDetail personId={view.personId} onBack={() => go({ kind: 'people' })} />}
      {view.kind === 'templates' && canViewTemplates(viewer) && <TemplatesList />}
      {view.kind === 'add_hire' && canAddNewHire(viewer) && (
        <AddNewHire onCancel={() => go({ kind: 'people' })} onCreated={(id) => go({ kind: 'person', personId: id })} />
      )}
    </div>
  );
}
