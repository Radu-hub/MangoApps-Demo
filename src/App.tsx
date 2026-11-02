import { canPost } from "./domain/audience";
import { useApp } from "./state/AppStateContext";
import { EmployeeView } from "./ui/employee/EmployeeView";
import { ManagerView } from "./ui/manager/ManagerView";
import { TopBar } from "./ui/TopBar";

/** The top bar, plus the manager or employee experience for the selected person. */
export function App() {
  const { viewer } = useApp();
  return (
    <div className="min-h-screen bg-page text-ink">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Keyed by viewer so switching people resets the local navigation state. */}
        {canPost(viewer) ? <ManagerView key={viewer.id} /> : <EmployeeView key={viewer.id} />}
      </main>
    </div>
  );
}
