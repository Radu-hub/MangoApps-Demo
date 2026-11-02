/** Visible focus ring used by every interactive element. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/** Focus ring for controls sitting on the navy top bar. */
export const focusRingOnBrand =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand';

/** Shared styling for text inputs and selects. */
export const inputClasses = `block w-full min-h-11 sm:min-h-10 rounded border border-ink-muted bg-white px-3 py-2 text-base text-ink ${focusRing}`;
