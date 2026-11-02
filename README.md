# Summit Updates

Summit Updates is a phone-first announcements tool for Summit Retail Group, a fictional chain of 5 stores with about 200 employees. Most of them work on the sales floor and don't have work email.

**This is a demo.** It's a clickable prototype, not a production app:

- **No real texts.** Text messages appear on a mock phone lock screen. Nothing is sent to anyone.
- **No logins.** You switch between people with the **Viewing as** menu in the top bar.
- **No server.** Data stays in your browser's `localStorage`, so it isn't shared between browsers or devices.
- **Made-up data.** All the people, stores and posts are fictional.

## What it does

Managers post updates to the stores and departments that need them, then see who has read them. Each post is one of two types:

- **FYI:** nothing is asked of the employee, and no text goes out.
- **Action required:** the employee gets a text, confirms with one tap and may have a due date.

**Managers can:**

- See the number of people each post will reach before posting, then preview the post and its text.
- See who has acknowledged a post, who has only opened it and who hasn't opened it.
- See who is overdue, by name, and send a reminder to only the people who haven't acknowledged.
- Get a warning when they send a lot of Action required posts in one week.

**Employees can:**

- Open a post directly from its text on the lock screen.
- See Action required posts pinned to the top of their feed, with overdue ones first.
- Confirm a post by tapping **I have read and understood this**.

## Set it up

You need [Node.js](https://nodejs.org) 20 or later, which includes npm.

1. In a terminal, go to the project folder and install the dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open http://localhost:5173. If that port is busy, the terminal shows the address to use instead.

To stop the app, press `Ctrl+C` in the terminal.

### Other commands

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm test`        | Runs the test suite                   |
| `npm run build`   | Type-checks and builds for production |
| `npm run preview` | Serves the production build locally   |

## Try it

Use **Viewing as** to switch between these people:

| Person         | Role          | Where                  |
| -------------- | ------------- | ---------------------- |
| Michael Torres | Operations    | Can post to all stores |
| Rachel Kim     | Store manager | Store 3                |
| Alex Rivera    | Employee      | Store 3, sales floor   |
| Jordan Lee     | Employee      | Store 1, stockroom     |

Here's a quick way to see the main flow:

1. **As Rachel,** open the **Manage** tab and click **Reset demo data**.
2. Click **New announcement** and choose **Action required**. Untick **All departments** and tick **Sales floor**, which shows "Will reach 5 people". Add a title and message, click **Post**, then click **Confirm & post**.
3. **Switch to Alex.** The new text is on his lock screen. Tap it, then tap **I have read and understood this**.
4. **Switch to Jordan.** He has no text for this post, because he works in a different store and department.
5. **Switch back to Rachel** and open the post. It shows that Alex has acknowledged and 4 people haven't opened it. Click **Remind 4 people** to send a reminder to just those four.

Your changes are kept when you refresh. **Reset demo data** restores the starting data, with dates relative to today.

## Assumptions

- Employees open the app from a text-message link on their own phone.
- Only two priority levels exist, and managers decide which one applies.
- Store managers post to their own store; ops can post to all stores.
- "Acknowledged" means the employee tapped confirm at the end of the post. It is not a comprehension check.
- Seen and acknowledged are tracked separately.
- Due dates apply only to required posts.

## Out of scope

Comments or replies, meetings, real SMS or email, login, multiple languages, editing or deleting posts, analytics across stores, push notifications and a native app.

## More detail

[NOTES.md](NOTES.md) has the full feature list, a longer walkthrough, the project layout, the data model and the decisions made while building.
