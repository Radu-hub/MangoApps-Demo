import { createContext, useContext, useState, type ReactNode } from "react";
import { canSeeAnnouncement } from "../../domain/audience";
import { describeDueDate } from "../../domain/dates";
import { getEmployeeObligations } from "../../domain/obligations";
import type { Employee } from "../../domain/types";
import { useApp } from "../../state/AppStateContext";
import { Chip } from "../Chip";
import { DEPARTMENT_LABELS, formatDateTime, ROLE_LABELS } from "../format";
import { Modal } from "../Modal";
import { SectionHeader } from "../SectionHeader";
import { BUTTON_SECONDARY, dueTone, FOCUS_RING, LIST, rowTint } from "../styles";

/** Opens the panel for an employee. The default no-op means a PersonLink outside the provider does nothing. */
const OpenPersonContext = createContext<(employeeId: string) => void>(() => {});

/** Lets any manager view open the per-employee panel via <PersonLink>. */
export function PersonPanelProvider({ children }: { children: ReactNode }) {
  const [personId, setPersonId] = useState<string | null>(null);
  return (
    <OpenPersonContext.Provider value={setPersonId}>
      {children}
      {personId && <PersonPanel employeeId={personId} onClose={() => setPersonId(null)} />}
    </OpenPersonContext.Provider>
  );
}

/** A person's name that opens their panel. */
export function PersonLink({ employee, className = "" }: { employee: Employee; className?: string }) {
  const open = useContext(OpenPersonContext);
  return (
    <button type="button" onClick={() => open(employee.id)} className={`rounded font-semibold text-ink underline-offset-2 hover:underline ${FOCUS_RING} ${className}`}>
      {employee.name}
    </button>
  );
}

/** One person's outstanding posts and acknowledgement history. */
function PersonPanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { state, viewer } = useApp();
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return null;

  const store = state.stores.find((s) => s.id === employee.storeId);
  // Only posts the viewing manager may see themselves (authored or received), never others' private audiences.
  const visible = state.announcements.filter((a) => canSeeAnnouncement(viewer, a));
  const { outstanding, history } = getEmployeeObligations(employee, visible, state.receipts, new Date());

  return (
    <Modal title={employee.name} onClose={onClose}>
      <p className="-mt-2 mb-4 text-sm text-muted">
        {ROLE_LABELS[employee.role]} · {store?.name ?? employee.storeId} · {DEPARTMENT_LABELS[employee.department]} ·{" "}
        {employee.phone}
      </p>

      <SectionHeader first>Outstanding ({outstanding.length})</SectionHeader>
      {outstanding.length === 0 ? (
        <p className="text-sm text-muted">Nothing outstanding.</p>
      ) : (
        <ul className={`text-sm text-ink ${LIST}`}>
          {outstanding.map(({ announcement, receipt, overdue }) => (
            <li
              key={announcement.id}
              className={`flex flex-wrap items-center gap-2 px-3 py-2 ${rowTint(overdue ? "overdue" : "pending")}`}
            >
              <span className="flex-1 font-semibold">{announcement.title}</span>
              {overdue && <Chip tone="danger">Overdue</Chip>}
              <span className="text-muted">
                {receipt?.seenAt ? "Opened" : "Not opened"}
                {announcement.dueDate && (
                  <>
                    {" · "}
                    <span className={dueTone(overdue ? "overdue" : "pending")}>
                      {describeDueDate(announcement.dueDate, new Date())}
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader>Acknowledged ({history.length})</SectionHeader>
      {history.length === 0 ? (
        <p className="text-sm text-muted">No acknowledgements yet.</p>
      ) : (
        <ul className={`max-h-48 overflow-y-auto text-sm text-ink ${LIST}`}>
          {history.map(({ announcement, acknowledgedAt, late }) => (
            <li key={announcement.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="flex-1 font-semibold">{announcement.title}</span>
              {late && <Chip>Late</Chip>}
              <span className="text-muted">{formatDateTime(acknowledgedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose} className={`px-4 py-2 text-sm ${BUTTON_SECONDARY}`}>
          Close
        </button>
      </div>
    </Modal>
  );
}
