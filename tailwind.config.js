/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: '#00FF00',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        accent: 'var(--accent-bg)',
      },
      fontFamily: {
        display: ["Anton", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
