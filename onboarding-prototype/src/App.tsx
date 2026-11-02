// App root.
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { ToastProvider } from './ui/components/Toast';
import { NewHireApp } from './ui/views/NewHireHome';
import { StaffApp } from './ui/views/StaffApp';
import { TopBar } from './ui/views/TopBar';

/** Top bar plus the view for the current viewer: the new hire experience or the staff screens. Keying by viewer resets navigation on every switch. */
function Shell() {
  const { viewer } = useAppState();
  return (
    <div className="min-h-screen bg-page text-ink">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-4">
        {viewer.role === 'new_hire' ? <NewHireApp key={viewer.id} person={viewer} /> : <StaffApp key={viewer.id} viewer={viewer} />}
      </main>
    </div>
  );
}

/** Root component: wires up shared state and toasts. */
export function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AppStateProvider>
  );
}
