import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Canvas Tokens
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
        },
        card: 'rgb(var(--surface) / <alpha-value>)',
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border) / 0.5)',
        },

        // Text Tokens
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',

        // Legacy / Alias mappings for compatibility
        dark: 'rgb(var(--text-primary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',

        // Macro Color Tokens (Cyan, Purple, Emerald, Amber)
        macro: {
          calories: 'rgb(var(--macro-calories) / <alpha-value>)',
          protein: 'rgb(var(--macro-protein) / <alpha-value>)',
          carbs: 'rgb(var(--macro-carbs) / <alpha-value>)',
          fat: 'rgb(var(--macro-fat) / <alpha-value>)',
          warning: 'rgb(var(--warning) / <alpha-value>)',
        },

        // Primary Brand / Interactive
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          light: 'rgb(var(--primary-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--macro-calories) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          light: 'rgb(var(--primary-subtle) / 0.3)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--macro-protein) / <alpha-value>)',
          hover: 'rgb(var(--macro-protein) / 0.8)',
          light: 'rgb(var(--macro-protein) / 0.15)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          hover: '#ef4444',
          light: 'rgb(var(--warning-surface) / 0.3)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans Bengali"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        bengali: ['"Noto Sans Bengali"', 'sans-serif'],
        serif: [
          '"Noto Serif Bengali"',
          'Georgia',
          'Cambria',
          'serif',
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
