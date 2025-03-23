// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          light: "#F9FAFB",
          dark: "var(--color-dark-primary)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          light: "var(--color-secondary-light)",
          dark: "var(--color-secondary-dark)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
          dark: "var(--color-accent-dark)",
        },
        highlight: {
          DEFAULT: "var(--color-highlight)",
          light: "var(--color-highlight-light)",
          dark: "var(--color-highlight-dark)",
        },
        darkTheme: {
          primary: "var(--color-dark-primary)",
          secondary: "var(--color-dark-secondary)",
          accent: "var(--color-dark-accent)",
          text: "var(--color-dark-text)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
