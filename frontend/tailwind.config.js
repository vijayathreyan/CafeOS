/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Material Design 3 — Google exact colour palette
        primary:    '#1A73E8',
        secondary:  '#34A853',
        warning:    '#FBBC04',
        error:      '#EA4335',
        surface:    '#FFFFFF',
        background: '#F8F9FA',
        border:     '#DADCE0',
        'text-primary':   '#202124',
        'text-secondary': '#5F6368',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        tamil: ['"Noto Sans Tamil"', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['12px', '16px'],
        'sm':   ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg':   ['18px', '28px'],
        'xl':   ['20px', '28px'],
        '2xl':  ['24px', '32px'],
      },
      borderRadius: {
        'card': '12px',
        'chip': '8px',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(60,64,67,0.3), 0 4px 8px rgba(60,64,67,0.15)',
        'card-sm': '0 1px 2px rgba(60,64,67,0.3)',
        'card-lg': '0 2px 6px rgba(60,64,67,0.3), 0 8px 16px rgba(60,64,67,0.15)',
      },
      minHeight: {
        'tap': '48px',
      },
      minWidth: {
        'tap': '48px',
      },
    },
  },
  plugins: [],
}
