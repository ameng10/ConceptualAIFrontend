/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        border: 'var(--border)',
        'glass-bg': 'var(--glass-bg)',
        'glass-border': 'var(--glass-border)',
        'input-bg': 'var(--input-bg)',
        'neon-teal': 'var(--neon-teal)',
        error: 'var(--error)',
      },
      borderRadius: {
        xl: 'calc(var(--radius) - 8px)',
        '2xl': 'calc(var(--radius) - 4px)',
        '3xl': 'var(--radius)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        caret: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
        floaty: 'floaty 4s ease-in-out infinite',
        caret: 'caret 1s step-end infinite',
      },
    },
  },
  plugins: [],
}
