import type { Config } from 'tailwindcss'

// =====================================================================
// Design System — bound by:
//   1. docs/plan.md §Design System (Taste Skill Combo)
//   2. .claude/skills/minimalist-ui/SKILL.md  (visual rules)
//   3. .claude/skills/design-taste-frontend/SKILL.md  (engineering rules)
//
// Conflict resolution: design-taste-frontend wins on technical,
//                      minimalist-ui wins on visual.
//
// HARD CONSTRAINTS encoded below:
//   - No `rounded-xl` / `rounded-2xl` (max border-radius is 12px)
//   - No `shadow-md/lg/xl` (only `subtle` and `lift`, both <0.05 opacity)
//   - No Inter font (Be Vietnam Pro for VN diacritics, Geist Mono for digits)
//   - Heritage palette (warm beige + deep brown) — no pure black/white
// =====================================================================

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          '"Geist"',
          '-apple-system',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      colors: {
        // Warm paper canvas — gia phả heritage feel
        paper: {
          50: '#FDFCF9',
          100: '#FAF8F3', // primary canvas
          200: '#F4F1E8',
          300: '#E8E2D2',
          400: '#D4CBB3',
          DEFAULT: '#FAF8F3',
        },
        // Deep brown ink — never pure black
        ink: {
          50: '#807368',
          100: '#5C4F45',  // muted body / secondary
          200: '#3F3327',
          300: '#2A1F14',  // primary text
          400: '#1A1209',
          DEFAULT: '#2A1F14',
        },
        // Single muted accent — sand/ochre, <80% saturation
        sand: {
          50: '#F5EFE3',
          100: '#E8D9B8',
          200: '#C9A872',
          300: '#A67C3D',  // primary accent
          400: '#7A5928',
          DEFAULT: '#A67C3D',
        },
        // Semantic muted pastels (per minimalist-ui §4)
        muted: {
          red: '#FDEBEC',
          green: '#EDF3EC',
          blue: '#E1F3FE',
          yellow: '#FBF3DB',
        },
        // Border tinted to background hue, ultra low opacity
        line: 'rgba(42, 31, 20, 0.08)',
      },
      borderColor: {
        DEFAULT: 'rgba(42, 31, 20, 0.08)',
      },
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        // Intentionally no `xl`/`2xl` — banned by minimalist-ui §5
      },
      boxShadow: {
        none: 'none',
        subtle: '0 1px 0 rgba(42, 31, 20, 0.04)',
        lift: '0 2px 8px rgba(42, 31, 20, 0.04)',
        // Intentionally no `md`/`lg`/`xl` — banned
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
      },
      fontSize: {
        // Editorial display sizes (controlled hierarchy via weight, not just scale)
        'display-1': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-2': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
