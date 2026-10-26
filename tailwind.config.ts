import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "global-loader": {
          "0%": { transform: "translateX(-100%)" },
          "60%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "global-loader": "global-loader 1.2s ease-in-out infinite",
      },
      colors: {
        dark: {
          bg:       "#0b0b0f",
          surface:  "#14141c",
          elevated: "#1d1d28",
          border:   "#2c2c3e",
          muted:    "#35354a",
        },
        // The public site (landing page, player profiles), after DESIGN.md's
        // "Mercury" system: one dark canvas, cards one step lighter, ivory
        // text, and a single accent. The accent is the brand green rather
        // than DESIGN.md's cobalt, so the site and the logo agree.
        // Dark-only by design, so these are plain values, not light/dark pairs.
        ink: {
          canvas: "#171721", // page background
          card:   "#1e1e2a", // cards: separation by value, never shadow
          raised: "#272735", // secondary buttons, inputs, hover
          line:   "#34344a", // hairline dividers inside cards
          text:   "#ededf3", // primary text; never pure white
          muted:  "#c3c3cc", // secondary text
          faint:  "#9a9aa8", // captions and axis labels (5.6:1 on card)
        },
        accent: {
          DEFAULT: "#7cac42", // the mark's green: 6.9:1 on canvas
          soft:    "#93be52", // accent text on cards
        },
        // Results, used only to encode data (bars, W/D/L). Muted so the
        // accent stays the one loud colour on the page.
        result: {
          win:  "#7cac42",
          draw: "#6c6c7c",
          loss: "#c0675b",
        },
        brand: {
          50:  "rgb(var(--brand-50)  / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
          950: "rgb(var(--brand-950) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        // next/font's variable Inter on public pages: the variable axis is
        // what makes DESIGN.md's in-between weights (480) real.
        public: ["var(--font-public)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "40px",
      },
    },
  },
  plugins: [],
};

export default config;
