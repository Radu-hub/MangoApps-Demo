// Demo data: people, templates, docs, plans and one reminder. Deterministic for a given `now`, with all dates relative to it.
import { addDays, parseISODate, toISODate } from '../domain/dates';
import { derivePhaseFromOffset } from '../domain/phase';
import { completeTask, generatePlan } from '../domain/plan';
import type { AppState, Doc, Person, PlanTask, ReminderLog, TaskTemplate } from '../domain/types';

/** Stable ids for the demo people, used by the viewer switcher default and by tests. */
export const SEED_IDS = {
  sarah: 'p-sarah',
  david: 'p-david',
  lena: 'p-lena',
  emily: 'p-emily',
  marcus: 'p-marcus',
  priya: 'p-priya',
  tom: 'p-tom',
} as const;

/** Static company documents shown inside the app. */
const DOCS: Doc[] = [
  {
    id: 'doc-handbook',
    title: 'Employee handbook (excerpt)',
    body: `## Working at BrightPath
We build software for teams who need their tools to just work. We try to work the same way: say what you're doing, finish what you start, and ask early when you're stuck.

## Hours and flexibility
Core collaboration hours are 10:00–15:00 in your team's home time zone. Outside those hours, plan your day the way that works for you. Let your manager know if you'll be out during core hours.

## Time off
- 20 days of paid time off per year, accrued monthly
- 10 company holidays, published each December
- Sick time is separate from PTO and doesn't need a doctor's note for the first three days

## Expenses
Keep receipts for anything over $25. Submit expenses within 30 days through the finance portal. Your manager approves anything up to $500; larger purchases need a quick note to Finance first.

## Questions
Anything not covered here goes to people@brightpath.example. We answer within one business day.`,
  },
  {
    id: 'doc-security',
    title: 'IT security policy',
    body: `## Why this matters
We hold customer data. One reused password or a phishing click can put that data at risk, so these rules aren't optional.

## The basics
- Use the company password manager for every work account
- Turn on two-factor authentication everywhere it's offered
- Lock your screen whenever you step away
- Install OS and browser updates within 7 days of release

## Phishing
If an email asks you to sign in, pay, or share data and you weren't expecting it, don't click. Forward it to security@brightpath.example. Reporting something that turns out to be fine is always the right call.

## Devices
Company laptops are encrypted and managed by IT. Don't store customer data on personal devices. Report a lost or stolen device to IT within one hour.

## Annual training
Everyone completes security awareness training in their first week and renews it every 12 months.`,
  },
  {
    id: 'doc-benefits',
    title: 'Benefits overview',
    body: `## Enrollment window
You have 30 days from your start date to enroll. If you miss the window, the next chance is open enrollment in November, unless you have a qualifying life event.

## What's offered
- Medical: two plans (PPO and HSA-eligible), with BrightPath covering 90% of employee premiums
- Dental and vision: covered at 100% for employees
- 401(k): 4% match, vested immediately
- Life and disability insurance: provided automatically at no cost

## Dependents
You can add a spouse, domestic partner, or children during enrollment. Have their dates of birth handy.

## Need help choosing?
Book 20 minutes with People Ops. We'll walk through the plans with you. No question is too basic.`,
  },
  {
    id: 'doc-architecture',
    title: 'Architecture overview',
    body: `## The short version
BrightPath runs as a handful of services behind one API gateway. Most product work happens in the web app and the core API.

## Main pieces
- Web app: React and TypeScript, deployed several times a day
- Core API: handles accounts, billing and permissions
- Jobs: background workers for imports, exports and email
- Data: one primary Postgres database with read replicas

## How changes ship
Every change goes through a pull request with one approving review. CI runs tests and type checks. Merges to main deploy to staging automatically, and to production after a short soak.

## On-call
Each team keeps a weekly on-call rotation. New engineers shadow one shift in their first month before joining the rotation.

## Where to start
Read the README in the main repository, then pick up an issue labeled "good first PR" with your onboarding buddy.`,
  },
];

/** Template content; phase is derived from the offset and every template starts active. */
const TEMPLATE_DEFS: Omit<TaskTemplate, 'phase' | 'archived'>[] = [
  // Company-wide
  {
    id: 'all-offer',
    title: 'Sign your offer letter and policy acknowledgments',
    description: 'Review and sign your offer letter, plus the code of conduct and confidentiality acknowledgments, in the HR portal.',
    department: 'all',
    dueOffsetDays: -7,
    priority: 'required',
    estimatedMinutes: 15,
  },
  {
    id: 'all-i9-section1',
    title: 'Complete I-9 Section 1',
    description: 'Fill in Section 1 of Form I-9 (employment eligibility) in the HR portal. It takes about 10 minutes.',
    department: 'all',
    dueOffsetDays: -3,
    priority: 'required',
    estimatedMinutes: 10,
  },
  {
    id: 'all-direct-deposit',
    title: 'Set up direct deposit',
    description: 'Add your bank details in the payroll portal so your first paycheck arrives on time.',
    department: 'all',
    dueOffsetDays: -2,
    priority: 'required',
    estimatedMinutes: 10,
  },
  {
    id: 'all-i9-id',
    title: 'Bring your ID documents for I-9 verification',
    description: 'Bring original, unexpired documents from the I-9 acceptable documents list on your first day. People Ops will verify them in person.',
    department: 'all',
    dueOffsetDays: 0,
    priority: 'required',
    estimatedMinutes: 10,
  },
  {
    id: 'all-one-on-one',
    title: 'First 1:1 with your manager',
    description: 'Your manager will set this up. Come with questions about priorities for your first month.',
    department: 'all',
    dueOffsetDays: 2,
    priority: 'recommended',
    estimatedMinutes: 30,
  },
  {
    id: 'all-handbook',
    title: 'Read the employee handbook',
    description: 'Read the handbook excerpt covering hours, time off and expenses.',
    department: 'all',
    dueOffsetDays: 3,
    priority: 'required',
    estimatedMinutes: 30,
    docId: 'doc-handbook',
  },
  {
    id: 'all-security-training',
    title: 'Complete security awareness training',
    description: 'Complete the 45-minute security awareness course in the learning portal. Read the IT security policy first.',
    department: 'all',
    dueOffsetDays: 4,
    priority: 'required',
    estimatedMinutes: 45,
    docId: 'doc-security',
  },
  {
    id: 'all-welcome-lunch',
    title: 'Team welcome lunch',
    description: 'Your team will take you out for lunch during your first week. Your manager will send the invite.',
    department: 'all',
    dueOffsetDays: 4,
    priority: 'recommended',
    estimatedMinutes: 60,
  },
  {
    id: 'all-benefits',
    title: 'Enroll in benefits',
    description: 'Choose your medical, dental and vision plans and set your 401(k) contribution. The enrollment window closes 30 days after your start date.',
    department: 'all',
    dueOffsetDays: 30,
    priority: 'required',
    estimatedMinutes: 30,
    docId: 'doc-benefits',
  },
  // Engineering
  {
    id: 'eng-access',
    title: 'Request GitHub and dev environment access',
    description: 'Send your GitHub username to IT using the access request form so your accounts are ready on day one.',
    department: 'engineering',
    dueOffsetDays: -3,
    priority: 'required',
    estimatedMinutes: 10,
  },
  {
    id: 'eng-local-env',
    title: 'Set up your local dev environment',
    description: 'Follow the setup guide in the main repository README. Ask in #eng-help if a step fails.',
    department: 'engineering',
    dueOffsetDays: 2,
    priority: 'required',
    estimatedMinutes: 120,
  },
  {
    id: 'eng-architecture',
    title: 'Read the architecture overview',
    description: 'Get the big picture of how BrightPath’s services fit together before your first PR.',
    department: 'engineering',
    dueOffsetDays: 5,
    priority: 'recommended',
    estimatedMinutes: 45,
    docId: 'doc-architecture',
  },
  {
    id: 'eng-first-pr',
    title: 'Ship your first small PR',
    description: 'Pick an issue labeled “good first PR”, open a pull request, and get it merged with your buddy’s review.',
    department: 'engineering',
    dueOffsetDays: 14,
    priority: 'required',
    estimatedMinutes: 240,
  },
  {
    id: 'eng-on-call-shadow',
    title: 'Shadow an on-call shift',
    description: 'Join your team’s on-call engineer for one shift to see how incidents are handled.',
    department: 'engineering',
    dueOffsetDays: 21,
    priority: 'recommended',
    estimatedMinutes: 240,
  },
  // Sales
  {
    id: 'sales-crm',
    title: 'Set up your CRM account',
    description: 'Sign in to the CRM, connect your calendar and email, and confirm you can see your assigned territory.',
    department: 'sales',
    dueOffsetDays: 1,
    priority: 'required',
    estimatedMinutes: 20,
  },
  {
    id: 'sales-shadow-calls',
    title: 'Shadow 3 customer calls',
    description: 'Join three customer calls with a senior account executive. Take notes on how they handle objections.',
    department: 'sales',
    dueOffsetDays: 10,
    priority: 'required',
    estimatedMinutes: 180,
  },
  {
    id: 'sales-certification',
    title: 'Complete product certification',
    description: 'Pass the product certification in the learning portal before running demos on your own.',
    department: 'sales',
    dueOffsetDays: 21,
    priority: 'required',
    estimatedMinutes: 120,
  },
  // Operations
  {
    id: 'ops-ticketing',
    title: 'Get ticketing tool access',
    description: 'Confirm you can sign in to the support ticketing tool and see the shared queue.',
    department: 'operations',
    dueOffsetDays: 1,
    priority: 'required',
    estimatedMinutes: 15,
  },
  {
    id: 'ops-shadow-shift',
    title: 'Shadow a support shift',
    description: 'Sit with a support specialist for a full shift and watch how tickets are triaged and answered.',
    department: 'operations',
    dueOffsetDays: 4,
    priority: 'required',
    estimatedMinutes: 240,
  },
  {
    id: 'ops-escalation',
    title: 'Review the escalation process',
    description: 'Walk through when and how to escalate a ticket to engineering, with your manager or a senior specialist.',
    department: 'operations',
    dueOffsetDays: 10,
    priority: 'required',
    estimatedMinutes: 30,
  },
];

/** Template definitions with the derived fields filled in. */
export const TEMPLATES: TaskTemplate[] = TEMPLATE_DEFS.map((t) => ({
  ...t,
  phase: derivePhaseFromOffset(t.dueOffsetDays),
  archived: false,
}));

function atTime(iso: string, hour: number): Date {
  const date = parseISODate(iso);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function monthsBefore(iso: string, months: number): string {
  const date = parseISODate(iso);
  date.setMonth(date.getMonth() - months);
  return toISODate(date);
}

/** Generates a plan the way HR would have two weeks before the start date, then marks tasks done. */
function seededPlan(person: Person, doneTemplateIds: string[], now: Date): PlanTask[] {
  const createdOn = atTime(addDays(person.startDate!, -14), 9);
  let tasks = generatePlan(person, TEMPLATES, SEED_IDS.sarah, createdOn);
  const latest = now.getTime() - 2 * 60 * 60 * 1000;
  for (const templateId of doneTemplateIds) {
    const task = tasks.find((t) => t.templateId === templateId);
    if (!task) throw new Error(`Seed: ${person.name} has no task from template ${templateId}`);
    const completedAt = new Date(Math.min(atTime(task.dueDate, 11).getTime(), latest));
    tasks = completeTask(tasks, task.id, completedAt);
  }
  return tasks;
}

/** Deterministic demo data. Every date is relative to `now` so the demo always looks current. */
export function buildSeed(now: Date): AppState {
  const today = toISODate(now);
  const people: Person[] = [
    {
      id: SEED_IDS.sarah,
      name: 'Sarah Chen',
      role: 'hr_admin',
      department: 'people_ops',
      jobTitle: 'HR Manager',
      email: 'sarah.chen@brightpath.example',
      phone: '(555) 010-2001',
    },
    {
      id: SEED_IDS.david,
      name: 'David Okafor',
      role: 'manager',
      department: 'engineering',
      jobTitle: 'Engineering Manager',
      email: 'david.okafor@brightpath.example',
      phone: '(555) 010-2002',
    },
    {
      id: SEED_IDS.lena,
      name: 'Lena Ruiz',
      role: 'manager',
      department: 'sales',
      jobTitle: 'Sales Manager',
      email: 'lena.ruiz@brightpath.example',
      phone: '(555) 010-2003',
    },
    {
      id: SEED_IDS.emily,
      name: 'Emily Park',
      role: 'new_hire',
      department: 'engineering',
      jobTitle: 'Software Engineer',
      managerId: SEED_IDS.david,
      startDate: addDays(today, 5),
      email: 'emily.park@brightpath.example',
      phone: '(555) 010-3001',
    },
    {
      id: SEED_IDS.marcus,
      name: 'Marcus Johnson',
      role: 'new_hire',
      department: 'sales',
      jobTitle: 'Account Executive',
      managerId: SEED_IDS.lena,
      startDate: addDays(today, -8),
      email: 'marcus.johnson@brightpath.example',
      phone: '(555) 010-3002',
    },
    {
      id: SEED_IDS.priya,
      name: 'Priya Nair',
      role: 'new_hire',
      department: 'operations',
      jobTitle: 'Support Specialist',
      managerId: SEED_IDS.lena,
      startDate: addDays(today, -24),
      email: 'priya.nair@brightpath.example',
      phone: '(555) 010-3003',
    },
    {
      id: SEED_IDS.tom,
      name: 'Tom Becker',
      role: 'new_hire',
      department: 'engineering',
      jobTitle: 'Senior Software Engineer',
      managerId: SEED_IDS.david,
      startDate: monthsBefore(today, 14),
      email: 'tom.becker@brightpath.example',
      phone: '(555) 010-3004',
    },
  ];
  const byId = Object.fromEntries(people.map((p) => [p.id, p])) as Record<string, Person>;

  const marcusTasks = seededPlan(
    byId[SEED_IDS.marcus]!,
    ['all-offer', 'all-i9-section1', 'all-direct-deposit', 'all-i9-id', 'sales-crm', 'all-one-on-one', 'all-welcome-lunch'],
    now,
  );
  const priyaTemplates = TEMPLATES.filter((t) => t.department === 'all' || t.department === 'operations')
    .map((t) => t.id)
    .filter((id) => id !== 'all-benefits');
  const tomTemplates = TEMPLATES.filter((t) => t.department === 'all' || t.department === 'engineering').map((t) => t.id);

  const tasks: PlanTask[] = [
    ...seededPlan(byId[SEED_IDS.emily]!, ['all-offer'], now),
    ...marcusTasks,
    ...seededPlan(byId[SEED_IDS.priya]!, priyaTemplates, now),
    ...seededPlan(byId[SEED_IDS.tom]!, tomTemplates, now),
  ];

  const remindedAbout = marcusTasks
    .filter((t) => t.templateId === 'all-handbook' || t.templateId === 'all-security-training')
    .map((t) => t.id);
  const reminders: ReminderLog[] = [
    {
      id: 'r-seed-marcus',
      personId: SEED_IDS.marcus,
      sentById: SEED_IDS.lena,
      sentAt: atTime(addDays(today, -2), 9).toISOString(),
      taskIds: remindedAbout,
    },
  ];

  // One engineering template was tweaked by David two weeks ago, so the Templates tab looks used.
  const templates = TEMPLATES.map((t) =>
    t.id === 'eng-local-env'
      ? { ...t, updatedAt: atTime(addDays(today, -14), 15).toISOString(), updatedById: SEED_IDS.david }
      : t,
  );

  return { version: 1, people, templates, docs: DOCS, tasks, reminders };
}
