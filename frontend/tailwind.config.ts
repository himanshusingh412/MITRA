import type { Config } from 'tailwindcss';

/**
 * MITRA design tokens.
 * Palette is derived from the Government of India digital-services visual language:
 * a trustworthy indigo primary, saffron/green accents used sparingly for status,
 * and a very light neutral canvas that stays readable in bright outdoor sunlight.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy, taken from the logo's figure. Ramped rather than tinted so that
        // 500 (the interactive default) clears 4.5:1 on white and 300 clears it on navy —
        // the two pairings the interface actually uses.
        brand: {
          50: '#EEF0F8',
          100: '#DDE1F0',
          200: '#B9C0DE',
          300: '#8B95C4',
          400: '#5A64A0',
          500: '#252A5E',
          600: '#1D2250',
          700: '#171B41',
          800: '#121533',
          900: '#0C0E24',
        },
        // Golden amber, the logo's second figure. Reserved for accent, hover and highlight —
        // never for body text, where it fails contrast on both themes.
        gold: {
          50: '#FDF7EC',
          100: '#FAEDD3',
          200: '#F4D9A5',
          300: '#EDC377',
          400: '#E6B455',
          500: '#E0A63C',
          600: '#C08A2A',
          700: '#96691F',
          800: '#6B4A16',
          900: '#432E0D',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          soft: '#64748B',
        },
        canvas: {
          DEFAULT: '#F7F9FE',
          card: '#FFFFFF',
          sunken: '#EEF2FF',
        },
        status: {
          eligible: '#059669',
          eligibleBg: '#D1FAE5',
          maybe: '#B45309',
          maybeBg: '#FEF3C7',
          no: '#B91C1C',
          noBg: '#FEE2E2',
          info: '#1D4ED8',
          infoBg: '#DBEAFE',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)',
        lift: '0 2px 4px rgba(15,23,42,0.05), 0 18px 40px -18px rgba(37,42,94,0.32)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 12px 32px -16px rgba(15,23,42,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(0.97)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
        breathe: 'breathe 2.2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
