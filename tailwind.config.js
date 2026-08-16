/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Manrope", "sans-serif"],
      },
      colors: {
        primary: "var(--color-accent)",
        "primary-light": "var(--color-primary-light)",
        "primary-dark": "var(--color-primary-dark)",
        secondary: "var(--color-success)",
        gold: "var(--color-accent)",
        "sj-bg": "var(--color-background)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-secondary": "var(--color-surface-secondary)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        border: "var(--color-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
      },
      borderRadius: {
        button: "var(--radius-md)",
        card: "var(--radius-lg)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-md)",
      },
    },
  },
  plugins: [],
};
