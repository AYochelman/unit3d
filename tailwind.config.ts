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
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#0A0A0B",
          900: "#111114",
          800: "#1C1C1F",
          700: "#2A2A2E",
          600: "#3A3A3F",
          500: "#48484C",
          400: "#8E8E93",
          300: "#C7C7CC",
          200: "#E5E5EA",
          100: "#F2F2F4",
          50: "#FAFAFA",
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
