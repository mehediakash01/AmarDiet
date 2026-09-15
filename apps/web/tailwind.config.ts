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
        background: '#F7F3E8',
        primary: {
          DEFAULT: '#1F4D3E',
          hover: '#16382D',
          light: '#E2ECE7',
        },
        accent: {
          DEFAULT: '#C98A2C',
          hover: '#A97221',
          light: '#F8F1E4',
        },
        secondary: {
          DEFAULT: '#5A3E85',
          hover: '#452D68',
          light: '#EFEBF5',
        },
        warning: {
          DEFAULT: '#B0472F',
          hover: '#8F3520',
          light: '#F8ECE9',
        },
        surface: '#FFFDF9',
        card: '#FFFDF9',
        border: '#DFD7C2',
        dark: '#1B1B18',
        muted: '#635F54',
      },
      fontFamily: {
        serif: [
          '"Noto Serif Bengali"',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'serif',
        ],
        sans: [
          '"Noto Sans Bengali"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
