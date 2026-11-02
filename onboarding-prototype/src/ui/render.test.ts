// Smoke tests: render real screens with the seed data to catch crashes and wiring mistakes.
// Clicks and browser behavior aren't covered here, since the suite runs in Node with no browser.
import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { SEED_IDS, buildSeed } from '../data/seed';
import { AppStateProvider } from '../state/AppStateContext';
import { ToastProvider } from './components/Toast';
import { AddNewHire } from './views/AddNewHire';
import { NewHireApp } from './views/NewHireHome';
import { PersonDetail } from './views/PersonDetail';
import { TemplatesList } from './views/TemplatesList';

const noop = () => {};
const render = (view: ReactNode) =>
  renderToString(createElement(AppStateProvider, null, createElement(ToastProvider, null, view)));
const seedPerson = (id: string) => buildSeed(new Date()).people.find((p) => p.id === id)!;

describe('screens render with seed data', () => {
  it('opens on the HR people list', () => {
    const html = render(createElement(App));
    expect(html).toContain('All new hires');
    expect(html).toContain('Marcus Johnson');
    expect(html).toContain('Reset demo data');
  });

  it('shows a new hire their welcome text first', () => {
    const html = render(createElement(NewHireApp, { person: seedPerson(SEED_IDS.emily) }));
    expect(html).toContain('Open my onboarding plan');
    expect(html).toContain('Emily');
  });

  it('shows a person’s plan to HR', () => {
    const html = render(createElement(PersonDetail, { personId: SEED_IDS.marcus, onBack: noop }));
    expect(html).toContain('Reminder history');
    expect(html).toContain('Send reminder');
  });

  it('refuses to show someone unknown', () => {
    expect(render(createElement(PersonDetail, { personId: 'nobody', onBack: noop }))).toContain('have access');
  });

  it('shows the templates list', () => {
    const html = render(createElement(TemplatesList));
    expect(html).toContain('New template');
    expect(html).toContain('Company-wide');
  });

  it('shows the add-hire form', () => {
    expect(render(createElement(AddNewHire, { onCancel: noop, onCreated: noop }))).toContain('Generate plan');
  });
});
