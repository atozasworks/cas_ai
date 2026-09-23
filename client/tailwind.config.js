/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/components/Admin/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        admin: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          muted: 'var(--bg-tertiary)',
          border: 'var(--border-color)',
          text: 'var(--text-primary)',
          sub: 'var(--text-secondary)',
          faint: 'var(--text-muted)',
        },
      },
      boxShadow: {
        admin: 'var(--shadow-card)',
      },
      fontFamily: {
        admin: 'var(--font-system)',
      },
    },
  },
  plugins: [],
};
