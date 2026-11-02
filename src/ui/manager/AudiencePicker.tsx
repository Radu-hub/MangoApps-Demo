import { canPostTo } from "../../domain/audience";
import { DEPARTMENTS, type Audience, type Department, type Employee, type Store } from "../../domain/types";
import { DEPARTMENT_LABELS } from "../format";
import { FOCUS_RING } from "../styles";

interface Props {
  author: Employee;
  stores: Store[];
  value: Audience;
  onChange: (audience: Audience) => void;
}

/** Adds the item if it's missing, otherwise removes it. */
function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Store and department checkboxes. Choosing "All" disables the individual options, which show as ticked. */
export function AudiencePicker({ author, stores, value, onChange }: Props) {
  // Only offer what canPostTo allows, so a store manager sees just their own store.
  const allowedStores = stores.filter((s) => canPostTo(author, { storeIds: [s.id], departments: "all" }));
  const canPickAllStores = canPostTo(author, { storeIds: "all", departments: "all" });
  const selectedStores = value.storeIds === "all" ? [] : value.storeIds;
  const selectedDepts = value.departments === "all" ? [] : value.departments;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Stores</legend>
        {canPickAllStores && (
          <Check
            label="All stores"
            checked={value.storeIds === "all"}
            onChange={(on) => onChange({ ...value, storeIds: on ? "all" : [] })}
          />
        )}
        {allowedStores.map((s) => (
          <Check
            key={s.id}
            label={s.name}
            disabled={value.storeIds === "all"}
            checked={value.storeIds === "all" || selectedStores.includes(s.id)}
            onChange={() => onChange({ ...value, storeIds: toggle(selectedStores, s.id) })}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Departments</legend>
        <Check
          label="All departments"
          checked={value.departments === "all"}
          onChange={(on) => onChange({ ...value, departments: on ? "all" : [] })}
        />
        {DEPARTMENTS.map((d: Department) => (
          <Check
            key={d}
            label={DEPARTMENT_LABELS[d]}
            disabled={value.departments === "all"}
            checked={value.departments === "all" || selectedDepts.includes(d)}
            onChange={() => onChange({ ...value, departments: toggle(selectedDepts, d) })}
          />
        ))}
      </fieldset>
    </div>
  );
}

/** A labelled checkbox. */
function Check(props: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 py-0.5 text-sm ${props.disabled ? "text-muted" : "text-ink"}`}>
      <input
        type="checkbox"
        className={`accent-action ${FOCUS_RING}`}
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}
