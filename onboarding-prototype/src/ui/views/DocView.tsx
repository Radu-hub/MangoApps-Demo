// Modal showing a company document.
import type { Doc } from '../../domain/types';
import { Modal } from '../components/Modal';

/** Read-only view of a static company doc. */
export function DocView({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const blocks = doc.body.split(/\n\s*\n/);
  return (
    <Modal title={doc.title} onClose={onClose}>
      <p className="mb-3 text-sm text-ink-muted">Read-only copy of the BrightPath company document.</p>
      <div className="flex flex-col gap-3">
        {blocks.map((block, i) => {
          const lines = block.split('\n');
          const heading = lines[0]?.startsWith('## ') ? lines.shift()!.slice(3) : null;
          const bullets = lines.length > 0 && lines.every((l) => l.startsWith('- '));
          return (
            <div key={i}>
              {heading && <h3 className="mb-1 font-bold text-ink">{heading}</h3>}
              {bullets ? (
                <ul className="list-disc pl-5">
                  {lines.map((l, j) => (
                    <li key={j}>{l.slice(2)}</li>
                  ))}
                </ul>
              ) : (
                lines.length > 0 && <p>{lines.join(' ')}</p>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
