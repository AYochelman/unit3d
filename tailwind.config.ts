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
      // Added for the mobile pass, and used only by classes written after it.
      // Tailwind's own scale starts at 640px, which is a tablet: there was no
      // way to say "a roomy phone but not a narrow one" without inventing this
      // one. Nothing that existed before uses `xs:`, so no desktop rule moves.
      screens: { xs: "400px" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#04110B",
          900: "#06150e",
          800: "#0D2117",
          700: "#16402A",
          600: "#1D5236",
          // 500 and 400 are the muted text greys, and on a dark page a muted
          // grey has to be LIGHTER, not darker. #48484C gave 2.17:1 on the page
          // background — unreadable, and it was set as the text colour in 185
          // places. #8FA598 is 6.4:1 on ink-800 cards, which clears WCAG AA. 400 moved
          // with it so the two tones still read as two tones.
          500: "#8FA598",
          400: "#A8B8AE",
          300: "#C9D6CE",
          200: "#E2EBE5",
          100: "#EEF4F0",
          50: "#F7FAF8",
        },
        flame: {
          DEFAULT: "#089a47",
          600: "#067138",
          700: "#055A2D",
          300: "#5FE39A",
          soft: "#E8F6EE",
        },
        brand: {
          DEFAULT: "#089a47",
          600: "#067138",
          700: "#055A2D",
          300: "#5FE39A",
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
        glow: "0 0 0 1px rgba(8,154,71,0.3), 0 6px 18px rgba(8,154,71,0.14)",
      },
      // Assistant (4.10): Hebrew reads best at its natural spacing, so the
      // tightening steps are neutral. Uppercase mono labels keep their
      // tracking-wide/widest, which this does not touch.
      letterSpacing: {
        tight: "0em",
        tighter: "0em",
        tightest: "0em",
      },
      // Assistant tops out at 800, and the studio voice is calmer than the old
      // 900 headlines: the heaviest weight anywhere is 700. 600 and 700 are
      // real weights of the variable font, never synthesised.
      fontWeight: {
        extrabold: "700",
        black: "700",
      },
      lineHeight: {
        // Headings: room for Hebrew ascenders and nikud-free descenders
        // without two lines touching.
        heading: "1.15",
      },
      fontSize: {
        // Running text and product descriptions.
        body: ["1.0625rem", { lineHeight: "1.6" }],
        // Tailwind's display sizes carry line-height 1, and a size class set at
        // a breakpoint (md:text-5xl) overrides any leading-* written beside it
        // without that breakpoint — see CLAUDE.md. Giving the sizes themselves
        // the heading line height keeps two-line Hebrew headlines from touching.
        "5xl": ["3rem", { lineHeight: "1.15" }],
        "6xl": ["3.75rem", { lineHeight: "1.15" }],
        "7xl": ["4.5rem", { lineHeight: "1.15" }],
        "8xl": ["6rem", { lineHeight: "1.15" }],
        "9xl": ["8rem", { lineHeight: "1.15" }],
      },
      // QClay + Island direction (4.10): bigger corners on cards. Buttons are pills,
      // set in components/ui/Btn.tsx.
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "2rem",
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
        marquee: "marquee 60s linear infinite",
        fillgrow: "fillgrow 2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
