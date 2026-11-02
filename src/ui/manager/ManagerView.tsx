import { useEffect, useState, type ReactNode } from "react";
import { getFeedForEmployee } from "../../domain/feed";
import { useApp } from "../../state/AppStateContext";
import { EmployeeView } from "../employee/EmployeeView";
import { peopleCount } from "../format";
import { useToast } from "../Toast";
import { FOCUS_RING } from "../styles";
import { AnnouncementList } from "./AnnouncementList";
import { ComposeForm } from "./ComposeForm";
import { PersonPanelProvider } from "./PersonPanel";
import { TrackingDetail } from "./TrackingDetail";

/** Which screen of the Manage tab is showing. */
type Screen = { name: "list" } | { name: "compose" } | { name: "detail"; id: string };

type Tab = "updates" | "manage";

/** Managers are recipients too: "My updates" is their own feed, "Manage" is compose + tracking. */
export function ManagerView() {
  const { state, viewer } = useApp();
  const [tab, setTab] = useState<Tab>("manage");
  const outstanding = getFeedForEmployee(viewer, state.announcements, state.receipts, new Date()).needsAttention.length;

  return (
    <div>
      <div role="tablist" className="mb-5 flex border-b border-line">
        <TabButton selected={tab === "updates"} onSelect={() => setTab("updates")}>
          My updates
          {outstanding > 0 && (
            <span
              aria-label={`${outstanding} need your attention`}
              className="ml-2 rounded-sm border border-accent-edge bg-accent-tint px-1.5 py-0.5 text-xs font-bold text-accent-ink"
            >
              {outstanding}
            </span>
          )}
        </TabButton>
        <TabButton selected={tab === "manage"} onSelect={() => setTab("manage")}>
          Manage
        </TabButton>
      </div>

      {tab === "updates" ? (
        <EmployeeView withLockScreen={false} />
      ) : (
        <PersonPanelProvider>
          <ManagerScreens />
        </PersonPanelProvider>
      )}
    </div>
  );
}

/** One of the two tabs at the top of the manager view. */
function TabButton(props: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.selected}
      onClick={props.onSelect}
      className={`-mb-px flex flex-1 items-center justify-center border-b-2 px-3 py-2 text-base ${FOCUS_RING} ${
        props.selected ? "border-action font-semibold text-action" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {props.children}
    </button>
  );
}

/** Navigation inside the Manage tab: the list, the compose form and a post's tracking detail. */
function ManagerScreens() {
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  const toast = useToast();
  const toList = () => setScreen({ name: "list" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  switch (screen.name) {
    case "compose":
      return (
        <ComposeForm
          onCancel={toList}
          onPosted={(id, reach) => {
            toast(`Posted to ${peopleCount(reach)}`);
            setScreen({ name: "detail", id });
          }}
        />
      );
    case "detail":
      return <TrackingDetail announcementId={screen.id} onBack={toList} />;
    case "list":
      return (
        <AnnouncementList onCompose={() => setScreen({ name: "compose" })} onOpen={(id) => setScreen({ name: "detail", id })} />
      );
  }
}
