import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EA',
        ink: '#14120F',
        night: '#0F1411',
        nightRaised: '#18201B',
        acid: '#C8F135',
        tangerine: '#FF6B3D',
        lilac: '#BDB0FF',
        forest: '#12372A',
        success: '#2FBF71',
        danger: '#E5484D',
        border: 'rgba(20, 18, 15, 0.14)',
        'border-dark': 'rgba(245, 242, 234, 0.14)',
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
      },
      boxShadow: {
        'offset': '3px 3px 0px 0px #14120F',
        'offset-lime': '3px 3px 0px 0px #C8F135',
        'offset-sm': '2px 2px 0px 0px #14120F',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'slide-up': 'slideUp 0.15s ease-out',
        'slide-down': 'slideDown 0.15s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'press': 'press 0.12s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'caret': 'caret 1s ease-in-out infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        press: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(2px)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        caret: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
      },
    },
  },
  plugins: [],
};

export default config;
