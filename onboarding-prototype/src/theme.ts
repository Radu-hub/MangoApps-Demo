// Every color the app uses. Tailwind's default palette is replaced by this object,
// so classes like `bg-brand` or `text-ink-muted` are the only colors available.
export const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  white: '#FFFFFF',

  brand: { DEFAULT: '#1E3A5F', dark: '#152A45' },

  page: '#F3F1EC',
  surface: '#FFFFFF',
  divider: '#E2DFD8',
  border: '#D6D3CC',
  rule: '#A8A29E',

  ink: { DEFAULT: '#1F2937', muted: '#57534E' },

  required: { bg: '#FFFBEB', bar: '#B45309' },
  overdue: { bg: '#FEF2F2', bar: '#B91C1C' },

  amber: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  red: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  neutral: { bg: '#F5F5F4', text: '#44403C', border: '#D6D3CC' },
  green: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },

  overlay: 'rgba(31, 41, 55, 0.5)',
};

/** System font stack; no web fonts are loaded. */
export const fontFamily = {
  sans: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
};

// Base is 15px; nothing is larger than 24px.
export const fontSize: Record<string, [string, string]> = {
  xs: ['12px', '16px'],
  sm: ['13px', '18px'],
  base: ['15px', '22px'],
  lg: ['18px', '26px'],
  xl: ['20px', '28px'],
  '2xl': ['24px', '32px'],
};
