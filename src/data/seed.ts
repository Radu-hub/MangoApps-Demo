import { getRecipients } from "../domain/audience";
import { addDays, toLocalDateString } from "../domain/dates";
import type { Announcement, Department, Employee, Receipt, Role, Store } from "../domain/types";
import { STATE_VERSION, type AppState } from "../state/types";

const STORES: Store[] = [
  { id: "s1", name: "Store 1 – Downtown" },
  { id: "s2", name: "Store 2 – Northgate" },
  { id: "s3", name: "Store 3 – Bellevue Square" },
  { id: "s4", name: "Store 4 – Tacoma Mall" },
  { id: "s5", name: "Store 5 – Everett" },
];

/** People shown in the "Viewing as" switcher. */
export const DEMO_VIEWER_IDS = ["e-michael", "e-rachel", "e-alex", "e-jordan"] as const;

/** A compact employee row. `id` is set for the demo people the code refers to; others get one from their name. */
type Row = [name: string, role: Role, storeId: string, department: Department, id?: string];

const ROWS: Row[] = [
  ["Michael Torres", "ops", "s1", "management", "e-michael"],
  // Store 1 – Downtown
  ["Priya Patel", "store_manager", "s1", "management"],
  ["Marcus Johnson", "employee", "s1", "sales_floor"],
  ["Emily Chen", "employee", "s1", "sales_floor"],
  ["Sofia Garcia", "employee", "s1", "sales_floor"],
  ["Daniel Brooks", "employee", "s1", "sales_floor"],
  ["Hannah Wright", "employee", "s1", "sales_floor"],
  ["Jordan Lee", "employee", "s1", "stockroom", "e-jordan"],
  ["Tyler Nguyen", "employee", "s1", "stockroom"],
  // Store 2 – Northgate
  ["David Okafor", "store_manager", "s2", "management"],
  ["Olivia Martinez", "employee", "s2", "sales_floor"],
  ["Ethan Park", "employee", "s2", "sales_floor"],
  ["Grace Liu", "employee", "s2", "sales_floor"],
  ["Noah Williams", "employee", "s2", "sales_floor"],
  ["Ava Thompson", "employee", "s2", "sales_floor"],
  ["Lucas Brown", "employee", "s2", "stockroom"],
  ["Mia Davis", "employee", "s2", "stockroom"],
  // Store 3 – Bellevue Square
  ["Rachel Kim", "store_manager", "s3", "management", "e-rachel"],
  ["Alex Rivera", "employee", "s3", "sales_floor", "e-alex"],
  ["Chloe Anderson", "employee", "s3", "sales_floor"],
  ["Ryan Shah", "employee", "s3", "sales_floor"],
  ["Isabella Moore", "employee", "s3", "sales_floor"],
  ["Samuel Wilson", "employee", "s3", "sales_floor"],
  ["Benjamin Clark", "employee", "s3", "stockroom"],
  ["Zoe Hall", "employee", "s3", "stockroom"],
  // Store 4 – Tacoma Mall
  ["Carlos Mendez", "store_manager", "s4", "management"],
  ["Lily Young", "employee", "s4", "sales_floor"],
  ["Nathan King", "employee", "s4", "sales_floor"],
  ["Ella Scott", "employee", "s4", "sales_floor"],
  ["Owen Adams", "employee", "s4", "sales_floor"],
  ["Aria Baker", "employee", "s4", "sales_floor"],
  ["Jack Turner", "employee", "s4", "stockroom"],
  ["Layla Hill", "employee", "s4", "stockroom"],
  // Store 5 – Everett
  ["Fatima Hassan", "store_manager", "s5", "management"],
  ["Henry Green", "employee", "s5", "sales_floor"],
  ["Nora Evans", "employee", "s5", "sales_floor"],
  ["Leo Campbell", "employee", "s5", "sales_floor"],
  ["Ruby Mitchell", "employee", "s5", "sales_floor"],
  ["Caleb Roberts", "employee", "s5", "sales_floor"],
  ["Maya Carter", "employee", "s5", "stockroom"],
  ["Isaac Phillips", "employee", "s5", "stockroom"],
];

/** "Priya Patel" → "e-priya-patel" */
const slug = (name: string) => "e-" + name.toLowerCase().replace(/[^a-z]+/g, "-");

// Phone numbers use the 555 range reserved for fiction.
const EMPLOYEES: Employee[] = ROWS.map(([name, role, storeId, department, id], i) => ({
  id: id ?? slug(name),
  name,
  role,
  storeId,
  department,
  phone: `(206) 555-${String(100 + i).padStart(4, "0")}`,
}));

const HOUR = 60 * 60 * 1000;

/** The starting posts. Times and due dates count from `now`, so "overdue" stays true whenever the demo runs. */
function buildAnnouncements(now: Date): Announcement[] {
  const ago = (hours: number) => new Date(now.getTime() - hours * HOUR).toISOString();
  const dueIn = (days: number) => toLocalDateString(addDays(now, days));
  return [
    {
      id: "a-wet-floor",
      title: "Updated wet-floor cleanup procedure",
      body:
        "Effective immediately, every spill must be coned within 2 minutes and logged in the store binder.\n\n" +
        "1. Place a wet-floor cone at the spill.\n2. Call the stockroom for the spill kit.\n" +
        "3. Log the time and location in the safety binder at the front desk.\n\n" +
        "Please read the full steps and confirm below.",
      authorId: "e-michael",
      createdAt: ago(20),
      priority: "required",
      dueDate: dueIn(3),
      audience: { storeIds: "all", departments: "all" },
    },
    {
      id: "a-returns",
      title: "Holiday return policy changes",
      body:
        "From Nov 1 through Jan 15, purchases can be returned for 60 days instead of 30. " +
        "Gift receipts get store credit only. The register prompts will update automatically.",
      authorId: "e-michael",
      createdAt: ago(52),
      priority: "required",
      dueDate: dueIn(6),
      audience: { storeIds: "all", departments: ["sales_floor"] },
    },
    {
      id: "a-forklift",
      title: "Forklift recertification due",
      body:
        "All stockroom staff must complete the 20-minute forklift refresher video and sign the log. " +
        "Anyone not recertified cannot operate the forklift after the due date.",
      authorId: "e-michael",
      createdAt: ago(10 * 24),
      priority: "required",
      dueDate: dueIn(-2),
      audience: { storeIds: "all", departments: ["stockroom"] },
    },
    {
      id: "a-shrink-audit",
      title: "Q4 shrink audit: manager sign-off",
      body:
        "Each store manager must review the attached shrink report for their store and confirm the " +
        "counts before the regional call. Flag any variance over 2% to Operations.",
      authorId: "e-michael",
      createdAt: ago(28),
      priority: "required",
      dueDate: dueIn(4),
      audience: { storeIds: "all", departments: ["management"] },
    },
    {
      id: "a-cash-count",
      title: "New register cash-count steps",
      body:
        "Starting this week, the closing cash count needs two people present and both initials on the slip. " +
        "Please read the attached steps and confirm.",
      authorId: "e-rachel",
      createdAt: ago(6 * 24),
      priority: "required",
      dueDate: dueIn(-1),
      audience: { storeIds: ["s3"], departments: "all" },
    },
    {
      id: "a-s3-hours",
      title: "Store 3 holiday hours",
      body: "Thanksgiving: closed. Black Friday: 6am–11pm. Dec 24: 8am–6pm. Dec 25: closed.",
      authorId: "e-rachel",
      createdAt: ago(30),
      priority: "fyi",
      audience: { storeIds: ["s3"], departments: "all" },
    },
    {
      id: "a-potluck",
      title: "Team potluck Saturday",
      body: "Break room, 2–4pm. Sign-up sheet is on the fridge. Bring a dish if you can, come either way!",
      authorId: "e-rachel",
      createdAt: ago(4),
      priority: "fyi",
      audience: { storeIds: ["s3"], departments: "all" },
    },
  ];
}

/** What a person has done with a post: confirmed it, only opened it, or not opened it. */
type Status = "ack" | "seen" | "none";

/** Explicit states for the demo characters; everyone else gets a deterministic mix. */
const OVERRIDES: Record<string, Record<string, Status>> = {
  // Alex has opened every required post but confirmed none, so he has no unread texts yet still owes three
  // confirmations (one overdue). Jordan hasn't opened the wet-floor post, so that text is still on his lock screen.
  "e-alex": { "a-wet-floor": "seen", "a-returns": "seen", "a-cash-count": "seen", "a-s3-hours": "seen", "a-potluck": "none" },
  "e-jordan": { "a-wet-floor": "none", "a-forklift": "ack" },
  // Store managers on the management-only post: 2 acknowledged, 1 opened, 2 not opened (including Rachel).
  "e-priya-patel": { "a-shrink-audit": "ack" },
  "e-david-okafor": { "a-shrink-audit": "ack" },
  "e-carlos-mendez": { "a-shrink-audit": "seen" },
  "e-fatima-hassan": { "a-shrink-audit": "none" },
  "e-rachel": { "a-shrink-audit": "none" },
};

/** One receipt per recipient who has opened a post. The bucket formula gives everyone else a realistic mix without randomness. */
function buildReceipts(announcements: Announcement[], employees: Employee[], now: Date): Receipt[] {
  const receipts: Receipt[] = [];
  announcements.forEach((a, ai) => {
    getRecipients(employees, a).forEach((e, ei) => {
      const bucket = (ei * 7 + ai * 3) % 10;
      const status: Status =
        OVERRIDES[e.id]?.[a.id] ?? (bucket < 5 ? "ack" : bucket < 8 ? "seen" : "none");
      if (status === "none") return;
      const created = new Date(a.createdAt).getTime();
      const seen = Math.min(created + (ei % 6 + 1) * HOUR * 0.5, now.getTime() - HOUR / 4);
      const receipt: Receipt = { announcementId: a.id, employeeId: e.id, seenAt: new Date(seen).toISOString() };
      if (status === "ack" && a.priority === "required") {
        receipt.acknowledgedAt = new Date(seen + 3 * 60 * 1000).toISOString();
      }
      receipts.push(receipt);
    });
  });
  return receipts;
}

/** Deterministic for a given `now`; dates are relative so the demo stays current. */
export function buildSeed(now: Date): AppState {
  const announcements = buildAnnouncements(now);
  return {
    version: STATE_VERSION,
    viewerId: "e-rachel",
    stores: STORES,
    employees: EMPLOYEES,
    announcements,
    receipts: buildReceipts(announcements, EMPLOYEES, now),
    reminders: [],
  };
}
