/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        "primary-dark": "var(--color-primary-dark)",
        secondary: "var(--color-success)",
      },
      borderRadius: {
        button: "14px",
        card: "16px",
      },
      boxShadow: {
        card: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        "card-hover": "0px 4px 16px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};
