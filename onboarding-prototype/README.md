# BrightPath Onboarding (prototype)

One place where a new hire sees what to do next, and where HR and managers see who is behind.

> Departments get their own plans, and each new hire only sees the next few things that matter.

## What this is

The customer in this scenario, BrightPath Technologies, is a roughly 150-person tech company that hires several people
a month. Its onboarding is scattered across welcome emails, shared docs, spreadsheets and HR messages, so new hires miss steps and managers can't
tell what's done.

This prototype puts it all in one app for three kinds of users:

- **New hires** get a welcome text, then see only their next 3 tasks, with everything else collapsed.
- **Managers** see their own team's progress and manage their department's task templates.
- **HR** sees everyone, adds new hires, generates plans from templates and sends reminders about overdue tasks.

It runs entirely in the browser. There is no backend or login, and nothing is really emailed or texted. Data is saved in
the browser's `localStorage`, and the **Viewing as** menu in the top bar switches between people.

## Set it up

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5174. The port is fixed, so if something else is using it, the server stops with an error
instead of picking another port.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app at http://localhost:5174 |
| `npm test` | Runs the test suite once |
| `npm run build` | Type-checks in strict mode and builds to `dist/` |
| `npm run preview` | Serves the production build |

## Try it

The demo data is ready to use, with every date relative to the day it was created. **Reset demo data** in the top bar
restores it and brings the dates back to today.

1. As **Sarah (HR)**: choose **Add new hire**, enter an engineer starting in about 2 weeks, choose **Generate plan**,
   adjust the tasks, then **Confirm and create plan**.
2. As **the new hire**: open the welcome text and **Complete** a task. It shows Done / Undo for 5 seconds, then the next
   task moves up.
3. As **David (manager)**: see the new hire on your team, but not Marcus, who reports to Lena. On **Templates**, you can
   edit Engineering's templates, while company-wide ones are read-only.
4. As **Sarah**: choose **Remind** next to Marcus in the overdue list to preview and log a reminder.

## Tests

`npm test` runs [Vitest](https://vitest.dev) in Node. The tests cover the business rules in `src/domain`, saving and
loading in `src/data`, every action in `src/state/reducer.ts`, and a smoke test that renders the main screens with the
demo data (`src/ui/render.test.ts`). Clicks and other browser behavior have no automated tests.

## Project structure

```
src/
  domain/        Types and pure functions (no React, no storage, `now` passed in), with tests next to them
    types.ts         Data model
    dates.ts         Local-date math and formatting ("Fri, Oct 30", "Overdue by 2 days")
    phase.ts         derivePhaseFromOffset, derivePhaseForTask (phase always comes from timing)
    plan.ts          generatePlan, createCustomTask, editTask, removeTask, completeTask, undoComplete
    templates.ts     createTemplate, updateTemplate, archiveTemplate, restoreTemplate, countPlansFromTemplate
    progress.ts      getCurrentPhase, isOverdue, getFocusList, getUpcoming, getProgress, getFollowUps, …
    permissions.ts   canView, canEditPlan, canCreateTemplate, canEditTemplate
    validation.ts    validateNewHire, validateCustomTask, validateTemplate
    messages.ts      Welcome text, reminder preview, reminder log
    labels.ts        Display labels for enums
  data/
    repository.ts    load/save/resetToSeed under "brightpath-onboarding:v1"; every access in try/catch
    seed.ts          Deterministic people, ~20 templates, 4 docs, plans and one reminder, relative to now
  state/
    reducer.ts       Pure state transitions that call domain functions
    AppStateContext.tsx  useReducer + save on change + current viewer + `now`
  ui/
    components/      Panel, Notice, SectionHeader, Chip, Button, List/ListRow, Modal, FormModal, Toast,
                     ProgressBar, Field, TaskRow
    views/           TopBar, NewHireHome, TaskDetails, DocView, StaffApp, PeopleList, PersonDetail,
                     TaskForm, ReminderModal, AddNewHire, TemplatesList, TemplateForm
  theme.ts         Every color as a named token; Tailwind's default palette is replaced, not extended
```

## Data model

| Type | Fields |
| --- | --- |
| `Person` | id, name, role (`hr_admin` \| `manager` \| `new_hire`), department, jobTitle, managerId?, startDate?, email, phone |
| `TaskTemplate` | id, title, description, department (or `all`), phase (derived), dueOffsetDays (-30..30), priority, estimatedMinutes, docId?, archived, updatedAt?, updatedById? |
| `PlanTask` | id, personId, templateId?, title, description, phase (derived), dueDate, priority, estimatedMinutes, docId?, status, completedAt?, addedById, addedAt, source (`template` \| `custom`), editedAt?, editedById? |
| `Doc` | id, title, body (plain text: blank-line blocks, `## ` headings, `- ` bullets) |
| `ReminderLog` | id, personId, sentById, sentAt, taskIds |
| `AppState` | version 1, people, templates, docs, tasks, reminders |

Departments: engineering, sales, operations, people_ops. Phases: before_day_1, week_1, first_30_days, ongoing.
Dates are `YYYY-MM-DD` strings read as local calendar dates; timestamps are ISO strings.

### Key rules

- **Plan generation**: active (not archived) company-wide plus department templates; `dueDate = startDate + dueOffsetDays`.
  A generated plan is a snapshot: template edits never change it.
- **Phase**: always derived from timing. Days from the start date: under 0 → before day 1, 0–6 → week 1,
  7–30 → first 30 days, over 30 → ongoing (plan tasks only; template offsets are limited to -30..30).
- **Editing tasks**: HR and the person's manager (`canEditPlan`) can edit incomplete tasks; the phase is re-derived
  and "Edited by <name> · <date>" is shown to staff and the new hire. Completed tasks are read-only.
- **Templates**: HR manages all templates; a manager manages their own department's and sees company-wide ones read-only.
- **Overdue**: not done and past the end of the due date in local time. "Due today" is not overdue.
- **Focus list** (max 3): overdue first, then required before recommended, then earliest due date.
  A task is eligible once its phase has started **or** it is due within 7 days, so a hire five days out sees
  pre-start tasks plus day-one items, not month-one work.
- **Progress status**: `complete` when every task is done; else `behind` if anything is overdue; else
  `not_started` if nothing is done; else `on_track`. Adding a task to a complete plan reopens it.
- **Removal**: only incomplete tasks, and never a person's last task.
- **Completion**: idempotent; completing twice keeps the first `completedAt`.
- **Scoping**: HR sees everyone; managers see their direct reports; a new hire sees only themselves.
  Only HR and the person's manager can edit a plan. Only HR can add hires. HR and managers can view templates
  (see **Templates** above for who can edit them).

## Assumptions

- New hires get a welcome text or email with a link; there's no login in the prototype.
- Plans come from company-wide plus department templates; HR and the hire's manager can adjust them per person.
- Only the next 3 tasks are shown up front; due-date urgency and priority decide the order.
- Managers see only their own reports; HR sees everyone.
- Company documents are static, so they're shown in the app.
- Completed tasks can't be removed, so the record stays intact.
- Anyone, including people past onboarding, can be assigned new tasks (renewals, new forms).
- Template changes apply to plans generated after the change. Existing plans are snapshots and are never modified.
- Managers own their department's templates; company-wide templates belong to HR.
- Templates are archived, never deleted. Archived templates leave new plans but can be restored.
- Phase is derived from dates, never chosen by hand, so it can't contradict the due date.

Decisions made while building:

- Day 1 is the start date ("Day 9" = 8 days after starting). Onboarding phases: days 0–6 week 1, days 7–29 first 30 days, then post-onboarding.
- "New task assigned" is derived, not stored: an incomplete custom task added by someone else, after the start date, within the last 7 days.
- The *Done / Undo* window freezes the focus list for 5 seconds so rows don't jump; completion is saved immediately.
- Seed plans are generated with `generatePlan` from the real templates, so the seed also exercises the domain logic.
  Saved state keeps absolute dates; after a few real days, *Reset demo data* brings the demo back to "today".
- Choosing a department in *Add new hire* suggests that department's manager.
- Reminders are only possible when a person has overdue tasks, and only include those tasks.
- Template helper text uses the same "Day N" as the new hire header: offset 0 is "Day 1 (start date)", offset 2 is "Day 3".
- Day 30 counts as "first 30 days" (it used to be post-onboarding) so the person's phase matches task phases.
- Task and template forms show errors once a field is touched, keep Save disabled while anything is invalid (or nothing
  changed when editing), ask "Discard changes?" when cancelling with edits, and confirm with a toast.
- Older saved data is upgraded on load (templates without `archived` become active), so it doesn't reset.
- Custom tasks saved before phases were derived keep their phase until someone edits them.
- Due dates follow `startDate + dueOffsetDays` even when that's already past (e.g. a hire added 5 days before
  starting gets a "sign offer" task due 2 days ago). The plan preview then shows a "Starts out behind" notice
  listing those tasks, and the confirmation toast says the plan starts out Behind.

## Out of scope

Pushing template changes to existing plans, version history or change logs beyond editedAt/updatedAt,
reordering templates by drag and drop, editing seed people, bulk edits, real email/SMS, logins, file uploads or e-signatures, embedding Google Docs or Sheets,
multiple languages, tasks assigned to managers or IT, calendar integration, analytics across hires.
