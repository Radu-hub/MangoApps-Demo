import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App";
import { buildSeed } from "../../data/seed";
import type { TextMessage } from "../../domain/notifications";
import type { Announcement, Store } from "../../domain/types";
import { AppStateProvider } from "../../state/AppStateContext";
import { AckButton } from "../employee/AckButton";
import { LockScreen } from "../employee/LockScreen";
import { PostPreview } from "../manager/PostPreview";
import { ReminderModal } from "../manager/ReminderModal";
import { ProgressBar } from "../ProgressBar";

// These render to HTML in Node, so they check what each screen shows. Effects and clicks don't run here.
const noop = () => {};
const stores: Store[] = [{ id: "s3", name: "Store 3 – Bellevue Square" }];
const required: Announcement = {
  id: "p",
  title: "Fitting room limit",
  body: "Up to 4 items.",
  authorId: "e-rachel",
  createdAt: new Date().toISOString(),
  priority: "required",
  audience: { storeIds: ["s3"], departments: "all" },
};

/** The whole app as it opens for one of the demo people, starting from fresh seed data. */
function renderAppAs(viewerId: string): string {
  const saved = JSON.stringify({ ...buildSeed(new Date()), viewerId });
  vi.stubGlobal("window", { localStorage: { getItem: () => saved, setItem: noop, removeItem: noop } });
  return renderToStaticMarkup(
    <AppStateProvider>
      <App />
    </AppStateProvider>,
  );
}

describe("App", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens a store manager on Manage, with who is overdue", () => {
    const html = renderAppAs("e-rachel");
    expect(html).toContain("Your announcements");
    expect(html).toContain("4 people are overdue on 1 post");
    expect(html).toContain("Alex Rivera");
    expect(html).toContain("New register cash-count steps");
  });

  it("shows operations their company-wide posts", () => {
    const html = renderAppAs("e-michael");
    expect(html).toContain("Forklift recertification due");
    expect(html).not.toContain("Team potluck Saturday");
  });

  it("opens Alex on his feed, because he has no unread texts but still owes confirmations", () => {
    const html = renderAppAs("e-alex");
    expect(html).toContain("Hi, Alex");
    expect(html).toContain("Needs your attention");
    expect(html).not.toContain("Open Summit Updates");
  });

  it("opens Jordan on his lock screen with only the wet-floor text", () => {
    const html = renderAppAs("e-jordan");
    expect(html).toContain("Open Summit Updates");
    expect(html).toContain("Updated wet-floor cleanup procedure");
    expect(html).not.toContain("Team potluck Saturday");
  });
});

describe("AckButton", () => {
  it("asks for the confirmation", () => {
    expect(renderToStaticMarkup(<AckButton onAcknowledge={noop} />)).toContain("I have read and understood this");
  });

  it("shows when the person confirmed instead of the button", () => {
    const html = renderToStaticMarkup(<AckButton onAcknowledge={noop} acknowledgedAt={new Date(2026, 9, 30, 9).toISOString()} />);
    expect(html).toContain("You confirmed this on Fri, Oct 30");
    expect(html).not.toContain("<button");
  });
});

describe("LockScreen", () => {
  it("shows every text it's given", () => {
    const message = (id: string, text: string): TextMessage => ({
      id,
      text,
      announcement: required,
      sentAt: new Date().toISOString(),
      kind: "posted",
    });
    const html = renderToStaticMarkup(
      <LockScreen messages={[message("1", "First text"), message("2", "Second text")]} onOpenPost={noop} onOpenApp={noop} />,
    );
    expect(html).toContain("First text");
    expect(html).toContain("Second text");
    expect(html).toContain("now");
  });
});

describe("PostPreview", () => {
  const preview = (announcement: Announcement, reach: number) =>
    renderToStaticMarkup(
      <PostPreview announcement={announcement} stores={stores} authorName="Rachel Kim" reach={reach} onEdit={noop} onConfirm={noop} />,
    );

  it("shows the text a required post sends and who gets it", () => {
    const html = preview(required, 5);
    expect(html).toContain("Text message to 5 people");
    expect(html).toContain("Summit: Action required – Fitting room limit. Tap to read.");
    expect(html).toContain("I have read and understood this");
  });

  it("says an FYI post sends no text and asks for nothing", () => {
    const html = preview({ ...required, priority: "fyi" }, 5);
    expect(html).toContain("send a text message");
    expect(html).not.toContain("I have read and understood this");
  });
});

describe("ReminderModal", () => {
  it("lists the targets and previews the text", () => {
    const person = { id: "e", name: "Chloe Anderson", role: "employee", storeId: "s3", department: "sales_floor", phone: "(206) 555-0120" } as const;
    const html = renderToStaticMarkup(<ReminderModal announcement={required} targets={[person]} onCancel={noop} onSend={noop} />);
    expect(html).toContain("Remind 1 person");
    expect(html).toContain("Chloe Anderson");
    expect(html).toContain("Please read and confirm");
  });
});

describe("ProgressBar", () => {
  it("reports the rounded percentage", () => {
    expect(renderToStaticMarkup(<ProgressBar value={1} total={3} />)).toContain('aria-valuenow="33"');
  });

  it("reads as 0% with no recipients", () => {
    expect(renderToStaticMarkup(<ProgressBar value={0} total={0} />)).toContain('aria-valuenow="0"');
  });
});
