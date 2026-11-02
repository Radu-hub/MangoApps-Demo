# Summit Updates: build notes

Detail behind the [README](README.md): the full feature list, a longer walkthrough, how the code is organized and the decisions made while building.

## Features

**Employee (phone-width)**

- **Text-message entry point.** Arriving as an employee starts on a mock lock screen showing every text
  they've received for required posts they haven't confirmed yet, newest on top: one per post when it went
  out (*"Summit: Action required – <title>, due <date>. Tap to read."*) plus one per reminder that included
  them. Each text opens its own post. A text counts as read once the employee opens its post, so only unread
  texts show; a reminder sent later shows again. With no unread texts, the app goes straight to the feed.
  "Show texts" in the feed brings the lock screen back.
- **Feed.** "Needs your attention (N)" is pinned on top (overdue first and in red, then by due date), with
  everything else below. Each post shows its priority, store and department chips.
- **One-tap acknowledge** at the end of required posts, with a timestamped confirmed state. Opening a post
  marks it seen.

**Manager (store manager or ops)**

Managers are recipients too. Their screen has two tabs:

- **My updates**: the employee feed, detail and one-tap acknowledge components reused unchanged, showing
  only posts where the manager is a recipient. A red badge shows the number of unacknowledged required
  posts. (No lock screen here, since managers are already in the app.)
- **Manage**: everything below.

- **Follow-up strip** at the top of the dashboard: the total number of overdue people and each affected
  post, with the overdue names and a *Remind* button. Hidden when nobody is overdue.
- **Compose** with audience pickers limited by role, a live "Will reach N people" count and inline
  validation.
- **Frequency guardrail.** Selecting *Action required* after the author already sent 2+ required posts in
  the last 7 days shows a non-blocking warning: *"You've sent N required updates this week. Too many can
  make employees tune them out."*
- **Preview before posting.** *Post* opens a preview of the post exactly as employees will see it, plus the
  text message that recipients of a required post will get. Buttons: *Edit* / *Confirm & post*.
- **Tracking.** The list shows "X of Y acknowledged" (or "opened" for FYI). The detail view groups people
  into Acknowledged / Opened, not confirmed / Not opened, flags overdue people and has *Remind N people*.
  It previews the text, logs a ReminderLog and only targets people who haven't acknowledged.
- **Per-employee panel.** Click any person's name (tracking groups, follow-up strip) to see their
  outstanding required posts (overdue first) and their acknowledgement history (late ones flagged).

## Full walkthrough

1. As **Rachel**, choose *New announcement*, select *Action required*, uncheck *All departments* and pick
   *Sales floor*. It shows "Will reach 5 people". Post it.
2. Switch to **Alex**. He'd already opened his other posts, so the new post's text (marked "now") is the only
   one on his lock screen. Tap it and tap *I have read and understood this*.
3. Switch to **Jordan**. The post isn't there (different store and department).
4. Switch back to **Rachel**, open the post: 1 of 5 acknowledged. *Remind 4 people* previews the text
   message, then logs the reminder.
5. As **Rachel**, remind the 4 overdue people on *New register cash-count steps*, then switch to **Alex**: he'd
   opened that post before, but the reminder is a new unread text, so it's back on his lock screen.
6. As **Rachel**, open **My updates**: the badge shows 1 for Michael's management-only shrink audit.
   Acknowledge it, then as **Michael** open that post under **Manage** to see it counted.
7. As **Michael**, the red follow-up strip lists the overdue forklift recertification. Click a name to open
   that person's panel. Start a new *Action required* post to see the frequency warning, then *Post* to
   see the preview.

## Project layout

```
src/
  domain/      Pure TypeScript: types and business rules. No React, no storage. Fully unit-tested.
  data/        seed.ts (deterministic demo data) and repository.ts (localStorage, never throws)
  state/       Pure reducer + React context that persists on every change
  ui/          Small React components. They call domain functions and never reimplement rules.
```

Domain functions take `now: Date` as a parameter wherever time matters, so tests are deterministic.

## Tests

`npm test` runs everything in Node with Vitest:

- **Domain, data and state:** unit tests next to each module, in `__tests__` folders.
- **Main flow:** `src/state/__tests__/flow.test.ts` runs post, text, open, confirm and remind through the reducer.
- **Screens:** `src/ui/__tests__/render.test.tsx` renders the app for each demo person, plus individual components,
  to HTML with `react-dom/server`. It checks what's shown, but not clicks, so those were checked by hand in a browser.

## Data model (`src/domain/types.ts`)

| Entity         | Fields                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `Store`        | `id`, `name`                                                                                                   |
| `Department`   | `"sales_floor" \| "stockroom" \| "management"`                                                                 |
| `Employee`     | `id`, `name`, `role` (`employee` / `store_manager` / `ops`), `storeId`, `department`, `phone` (fake)           |
| `Announcement` | `id`, `title`, `body`, `authorId`, `createdAt` (ISO), `priority` (`fyi` / `required`), `dueDate?`, `audience` |
| `Audience`     | `storeIds: string[] \| "all"`, `departments: Department[] \| "all"`                                            |
| `Receipt`      | `announcementId`, `employeeId`, `seenAt?`, `lastOpenedAt?`, `acknowledgedAt?`                                                   |
| `ReminderLog`  | `id`, `announcementId`, `sentAt`, `employeeIds`                                                                |

Everything is persisted as one versioned object under the key `summit-updates:v1`. If storage is
missing, corrupt or on another version, the app falls back to the seed.

Key domain functions (all in `src/domain`, all unit-tested):

| Module             | Functions                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| `audience.ts`      | `isInAudience`, `isRecipient`, `getRecipients`, `canSeeAnnouncement`, `canPostTo` |
| `feed.ts`          | `getFeedForEmployee`                                                        |
| `stats.ts`         | `getAckStats`                                                               |
| `dates.ts`         | `isOverdue`, date helpers                                                   |
| `validation.ts`    | `validateDraft`                                                             |
| `receipts.ts`      | `markSeen`, `acknowledge`                                                   |
| `reminders.ts`     | `getReminderTargets`, `buildReminderText`, `reminderLink`, `createReminderLog` |
| `notifications.ts` | `buildNotificationText`, `getTextMessages`                                  |
| `followUps.ts`     | `getFollowUps`                                                              |
| `obligations.ts`   | `getEmployeeObligations`                                                    |
| `guardrails.ts`    | `countRecentRequiredPosts`, `getRequiredPostWarning`                        |

## Decisions made while building

- **Due dates are local calendar dates** (`"YYYY-MM-DD"`). A post becomes overdue after 23:59:59.999
  local time on that date, so it is not overdue at any point on the due date itself.
- **The author is never a recipient** of their own post, even when they're in the audience (for example,
  Rachel posting to all of Store 3). This applies to the compose count, the tracking stats and reminders.
- **Recipients are computed live** from the current employee list, with no snapshot taken at post time.
- **Reminders are only for Action required posts.** FYI posts never ask anything of anyone, so they show
  "X of Y opened" and have no reminder button.
- **Seed dates are relative to the current time** (`buildSeed(now)`), so "due in 3 days" and "overdue"
  stay true whenever the demo is run. The seed is deterministic for a given `now`.
- **A manager's list shows the posts they wrote.** Rachel doesn't see Michael's company-wide posts in her
  tracking list.
- **Opens are tracked twice.** `seenAt` keeps the first open, which is what managers see. `lastOpenedAt` moves
  forward, so opening a post again clears a reminder that arrived in between.
- `markSeen` / `acknowledge` return the *same* array when nothing changes (a no-op), which lets the reducer
  skip needless re-renders and saves.
- The reducer re-validates posts and ignores acknowledgements on FYI posts, as a second line of defense
  behind the UI.
- **The lock screen is the default entry** whenever you switch to an employee with something outstanding,
  since the brief assumes staff arrive from a text link.
- **Texts are derived, not stored.** `getTextMessages` rebuilds an employee's texts from the posts (sent at
  `createdAt`) and reminder logs (sent at `sentAt`), so what the manager previews is exactly what lands on
  the lock screen, newest first. A text is unread until the employee opens its post after it arrived, and
  acknowledged posts produce none.
- **Two different texts.** The first notification for a required post uses the lock-screen wording. Manual
  reminders keep their own wording ("Please read and confirm …") and a link.
- **The follow-up strip covers the manager's own posts**, matching the list below it. The *Remind* button
  reuses the normal reminder flow, so it targets everyone who hasn't acknowledged. On an overdue post
  that's the same set as the overdue people.
- **One recipient rule.** `isRecipient` = in the audience *and* not the author. `getRecipients`,
  `getAckStats`, the feed, follow-ups and reminders all go through it, and the reducer refuses to record
  receipts for non-recipients.
- **Managers only see posts they're allowed to see.** A post is visible to a manager only if they wrote it
  or are a recipient (`canSeeAnnouncement`). Tracking detail is author-only, and the per-employee panel
  lists only posts the viewing manager can see. So Rachel doesn't see Michael's sales-floor posts in Alex's
  panel, but she does see the posts she wrote and any all-staff posts she received.
- **"This week" means a rolling 7 × 24 hours** before now (a post exactly 7 days old no longer counts). The
  guardrail counts required posts by the same author across all audiences.
- **The preview is the gate.** *Post* is still disabled while validation errors exist; once valid, it opens
  the preview and only *Confirm & post* publishes.
- Tailwind v4 is wired through its Vite plugin (`@tailwindcss/vite`), so there's no PostCSS config.

