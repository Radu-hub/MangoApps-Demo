import type { Config } from 'tailwindcss';
import { colors, fontFamily, fontSize } from './src/theme';

// Colors, radii and type sizes are replaced (not extended) so Tailwind's default
// palette, shadows and large type sizes are not available to the app.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors,
    fontFamily,
    fontSize,
    borderRadius: { none: '0', sm: '2px', DEFAULT: '4px' },
    boxShadow: { none: 'none' },
    extend: {
      borderColor: { DEFAULT: colors.border },
    },
  },
  plugins: [],
} satisfies Config;
