import { DEMO_VIEWER_IDS } from "../data/seed";
import { useApp } from "../state/AppStateContext";
import { ROLE_LABELS } from "./format";
import { BUTTON_SECONDARY, INPUT } from "./styles";
import { useToast } from "./Toast";

/** The demo controls: the "Viewing as" menu stands in for login, and the reset button restores the seed. */
export function TopBar() {
  const { state, viewer, actions } = useApp();
  const toast = useToast();
  const viewers = DEMO_VIEWER_IDS.flatMap((id) => state.employees.filter((e) => e.id === id));

  return (
    <header className="sticky top-0 z-30 bg-action text-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="text-lg font-bold text-white">Summit Updates</span>
        <label className="ml-auto flex items-center gap-2 text-sm text-white">
          Viewing as
          <select className={`px-2 py-1 text-sm ${INPUT}`} value={viewer.id} onChange={(e) => actions.setViewer(e.target.value)}>
            {viewers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({ROLE_LABELS[e.role]})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`px-2 py-1 text-sm ${BUTTON_SECONDARY}`}
          onClick={() => {
            actions.reset();
            toast("Demo data reset");
          }}
        >
          Reset demo data
        </button>
      </div>
    </header>
  );
}
