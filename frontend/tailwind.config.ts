import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0b1220",
          900: "#132340",
          800: "#1a2d50",
          700: "#24395f",
          600: "#2f4a78",
          50: "#eef2f8",
        },
        // Green of the Sangguniang Bayan seal, used by the public portal.
        sb: {
          950: "#03261c",
          900: "#06392b",
          800: "#0a4f3c",
          700: "#0b6b50",
          600: "#11855f",
          100: "#d6eee3",
          50: "#edf7f2",
        },
        paper: "#f5f4ef",
        gold: {
          400: "#e3b04b",
          500: "#d29a2a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
