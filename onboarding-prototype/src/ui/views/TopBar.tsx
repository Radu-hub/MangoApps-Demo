// Top bar shown on every screen.
import { useState } from 'react';
import { ROLE_LABELS } from '../../domain/labels';
import { useAppState } from '../../state/AppStateContext';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { focusRingOnBrand } from '../components/styles';
import { useToast } from '../components/Toast';

/** App title, the "Viewing as" role switcher and Reset demo data. */
export function TopBar() {
  const { state, viewer, setViewerId, reset } = useAppState();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <span className="text-lg font-bold">BrightPath Onboarding</span>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="viewing-as" className="text-sm">
            Viewing as
          </label>
          <select
            id="viewing-as"
            value={viewer.id}
            onChange={(e) => setViewerId(e.target.value)}
            className={`min-h-11 rounded border border-white bg-white px-2 text-sm text-ink sm:min-h-8 ${focusRingOnBrand}`}
          >
            {state.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ROLE_LABELS[p.role]})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`min-h-11 rounded border border-white bg-white px-3 text-sm font-semibold text-ink hover:bg-neutral-bg sm:min-h-8 ${focusRingOnBrand}`}
          >
            Reset demo data
          </button>
        </div>
      </div>
      {confirming && (
        <Modal
          title="Reset demo data?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  reset();
                  setConfirming(false);
                  toast('Demo data restored.');
                }}
              >
                Reset demo data
              </Button>
            </>
          }
        >
          <p>This replaces every change (new hires, added or completed tasks, reminders) with the original demo data.</p>
        </Modal>
      )}
    </header>
  );
}
