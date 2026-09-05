import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Headings get their own face. One typeface doing everything is the
        // look of a template; a text face plus a display face is a brand.
        display: ["var(--font-frank)", "var(--font-sans)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // A warm charcoal, not a cold slate. The blue-grey neutral plus one
        // saturated accent is the default palette of generated sites; a few
        // degrees of warmth reads as a studio instead of a dashboard.
        ink: {
          950: "#100E0C",
          900: "#181613",
          800: "#23201C",
          700: "#312D28",
          600: "#433D36",
          500: "#5A534A",
          400: "#9A9188",
          300: "#CBC4BA",
          200: "#E7E2DA",
          100: "#F4F1EC",
          50: "#FBF9F6",
        },
        flame: {
          DEFAULT: "#089a47",
          600: "#067138",
          700: "#055A2D",
          300: "#3FB872",
          soft: "#E8F6EE",
        },
        brand: {
          DEFAULT: "#089a47",
          600: "#067138",
          700: "#055A2D",
          300: "#3FB872",
          soft: "#E8F6EE",
        },
        cyan2: {
          DEFAULT: "#00C2C7",
          600: "#00A4A8",
        },
        amber2: "#FBBF24",
        good: "#34D399",
        bad: "#F87171",
      },
      // Two radii, not six. Cards and panels are crisp; only chips are round.
      borderRadius: {
        md: "4px",
        lg: "5px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "10px",
      },
      boxShadow: {
        soft: "0 8px 32px rgba(0,0,0,0.12)",
        softer: "0 4px 16px rgba(0,0,0,0.08)",
        glow: "0 0 0 1px rgba(8,154,71,0.45), 0 8px 32px rgba(8,154,71,0.25)",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        livepulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".55", transform: "scale(.85)" },
        },
        slowspin: {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(360deg)" },
        },
        fadeup: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        fillgrow: {
          from: { width: "0%" },
        },
      },
      animation: {
        livepulse: "livepulse 1.6s ease-in-out infinite",
        slowspin: "slowspin 5s linear infinite",
        fadeup: "fadeup .6s cubic-bezier(0.4,0,0.2,1) both",
        marquee: "marquee 40s linear infinite",
        fillgrow: "fillgrow 2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
