"use client";
import { create } from "zustand";

/**
 * Design directions the owner can try on the REAL site, in his own browser only.
 *
 * Nothing here changes what a visitor sees. A preview is a value in memory
 * (no localStorage — project rule), set from /admin → "תצוגת עיצוב", and it
 * lasts until he turns it off or reloads the page. While it is on,
 * components/DesignPreview.tsx re-colours the site's own stylesheet in place:
 * every rule that uses one of the site's colours is copied with the new colour
 * under html[data-design="…"], so the actual pages, products and layout are
 * what he looks at — not a mock-up of them.
 *
 * What a preview can change: colours, the body face, heading weight and corner
 * radii. What it cannot: layout, copy, or a single word set in another face —
 * those need real component work if a direction is chosen.
 */

export type DesignId = "qclay-a" | "qclay-b" | "qclay-c" | "island-a" | "island-b" | "island-c";

export type DesignTheme = {
  id: DesignId;
  brief: "QClay" | "Island";
  label: string;
  note: string;
  /** Page background and text, for html/body. */
  bg: string;
  fg: string;
  /** The site's colour (hex, lowercase) → the direction's colour. */
  map: Record<string, string>;
  font: string;
  headingWeight: number;
  headingTracking: string;
  /** Radii for the site's rounded-lg / xl / 2xl / 3xl, and for buttons. */
  radius: { lg: string; xl: string; xxl: string; xxxl: string; button: string };
  swatch: string[];
};

// The site's palette as tailwind.config.ts defines it. `flame` and `brand`
// share these values, so one entry covers both.
const INK = ["#0a0a0b", "#111114", "#1c1c1f", "#2a2a2e", "#3a3a3f", "#85858b", "#a5a5aa", "#c7c7cc", "#e5e5ea", "#f2f2f4", "#fafafa"] as const;
const BODY_FG = "#f5f5f7";
const FLAME = { base: "#089a47", d600: "#067138", d700: "#055a2d", l300: "#3fb872", soft: "#e8f6ee" };

const inkMap = (to: readonly string[]) => Object.fromEntries(INK.map((c, i) => [c, to[i]]));
const flameMap = (base: string, d600: string, d700: string, l300: string, soft: string) => ({
  [FLAME.base]: base, [FLAME.d600]: d600, [FLAME.d700]: d700, [FLAME.l300]: l300, [FLAME.soft]: soft,
  // The hero's glow is a lighter green written inline; it follows the accent.
  "#11b859": l300,
});

const PILL = { lg: "9999px", xl: "9999px", xxl: "40px", xxxl: "50px", button: "9999px" };
const CALM = { lg: "8px", xl: "8px", xxl: "16px", xxxl: "20px", button: "8px" };

export const DESIGNS: DesignTheme[] = [
  {
    id: "qclay-a", brief: "QClay", label: "א · שחור מונוכרום",
    note: "שחור מלא, לבנדר במקום הירוק, כפתורי גלולה ופינות של 40-50px.",
    bg: "#000000", fg: "#ffffff",
    map: {
      ...inkMap(["#000000", "#0b0b0d", "#121212", "#282643", "#36344f", "#8f8da8", "#b3b1c7", "#c7bfcf", "#e6e1f2", "#f2edf4", "#ffffff"]),
      [BODY_FG]: "#ffffff",
      ...flameMap("#6b5fd3", "#5548b8", "#45399b", "#dad2f4", "#f2edf4"),
    },
    font: '"Rubik", "Heebo", system-ui, sans-serif', headingWeight: 800, headingTracking: "-0.03em",
    radius: PILL, swatch: ["#000000", "#dad2f4", "#6b5fd3", "#ffffff"],
  },
  {
    id: "qclay-b", brief: "QClay", label: "ב · גלריה בהירה",
    note: "רקע בהיר, טקסט שחור, כרטיסים בגווני פסטל וכפתורים שחורים עגולים.",
    bg: "#f7f4f4", fg: "#000000",
    map: {
      ...inkMap(["#f7f4f4", "#ffffff", "#f2edf4", "#dad2f4", "#c7bfcf", "#5d5b7e", "#3d3b58", "#282643", "#121212", "#000000", "#000000"]),
      [BODY_FG]: "#000000",
      ...flameMap("#000000", "#282643", "#121212", "#71709f", "#f2edf4"),
    },
    font: '"Rubik", "Heebo", system-ui, sans-serif', headingWeight: 700, headingTracking: "-0.02em",
    radius: { ...PILL, xxl: "60px", xxxl: "60px" }, swatch: ["#f7f4f4", "#dad2f4", "#effbf9", "#000000"],
  },
  {
    id: "qclay-c", brief: "QClay", label: "ג · היברידי עם הירוק",
    note: "הרקע הכהה והירוק נשארים; מ-QClay נלקחים כפתורי הגלולה, הפינות הגדולות והכותרות הכבדות.",
    bg: "#0b0d0c", fg: "#f2f5f3",
    map: {
      ...inkMap(["#0b0d0c", "#121614", "#1a201d", "#26302b", "#34413a", "#7f8f86", "#a9b5ae", "#c9d3cd", "#e3e9e5", "#f2f5f3", "#fafcfb"]),
      [BODY_FG]: "#f2f5f3",
    },
    font: '"Rubik", "Heebo", system-ui, sans-serif', headingWeight: 800, headingTracking: "-0.025em",
    radius: PILL, swatch: ["#0b0d0c", "#089a47", "#1a201d", "#f2f5f3"],
  },
  {
    id: "island-a", brief: "Island", label: "א · טורקיז עמוק",
    note: "רקע טורקיז כהה, מנטה לכפתורים ולהדגשות, טקסט במשקל אחד ופינות מתונות.",
    bg: "#0a332c", fg: "#ffffff",
    map: {
      ...inkMap(["#0a332c", "#0d3b33", "#124a40", "#1b5a4e", "#2a6b5e", "#9fbdb5", "#bcd3cd", "#d9e7e3", "#eef5f3", "#f6faf9", "#ffffff"]),
      [BODY_FG]: "#ffffff",
      ...flameMap("#138a5e", "#0f7550", "#0b5f41", "#50e8a8", "#dff8ee"),
    },
    font: '"Heebo", system-ui, sans-serif', headingWeight: 500, headingTracking: "-0.02em",
    radius: CALM, swatch: ["#0a332c", "#50e8a8", "#124a40", "#ffffff"],
  },
  {
    id: "island-b", brief: "Island", label: "ב · נייר חם",
    note: "רקע בגוון נייר, טורקיז כצבע טקסט וכפתורים, כרטיסים בגוון חם.",
    bg: "#fcf9f7", fg: "#343434",
    map: {
      ...inkMap(["#fcf9f7", "#f0edea", "#e6e2dd", "#d6d1ca", "#bdb6ad", "#6d6a65", "#4d4b47", "#343434", "#1f2a27", "#0a332c", "#0a332c"]),
      [BODY_FG]: "#343434",
      ...flameMap("#0a332c", "#082923", "#061f1a", "#1f8a6a", "#e3efe9"),
    },
    font: '"Heebo", system-ui, sans-serif', headingWeight: 500, headingTracking: "-0.02em",
    radius: { ...CALM, xxxl: "20px" }, swatch: ["#fcf9f7", "#f0edea", "#0a332c", "#50e8a8"],
  },
  {
    id: "island-c", brief: "Island", label: "ג · היברידי עם הירוק",
    note: "הירוק של המותג על רקע ירוק-כהה, טקסט רגוע במשקל 500 ופינות של 8-20px.",
    bg: "#071a11", fg: "#eef4f0",
    map: {
      ...inkMap(["#071a11", "#0a2117", "#0c2619", "#16402a", "#1d5236", "#8fa598", "#a8b8ae", "#c9d6ce", "#e2ebe5", "#eef4f0", "#f7faf8"]),
      [BODY_FG]: "#eef4f0",
      ...flameMap("#089a47", "#067138", "#055a2d", "#5fe39a", "#e3f6ea"),
    },
    font: '"Heebo", system-ui, sans-serif', headingWeight: 500, headingTracking: "-0.02em",
    radius: CALM, swatch: ["#071a11", "#089a47", "#5fe39a", "#eef4f0"],
  },
];

export const DESIGN_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d])) as Record<DesignId, DesignTheme>;

type PreviewState = { design: DesignId | null; setDesign: (d: DesignId | null) => void };
export const useDesignPreview = create<PreviewState>((set) => ({
  design: null,
  setDesign: (design) => set({ design }),
}));

const toRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");

/**
 * Every colour rule of the site's stylesheet, recoloured for one direction.
 *
 * Tailwind writes a colour two ways: `rgb(10 10 11/var(--tw-bg-opacity,1))`
 * and `#0a0a0b66` (opacity modifiers). Both are matched; the alpha is kept.
 * Each matching rule is copied under html[data-design] with its selector list
 * wrapped in :is(), which out-ranks the original without editing it.
 */
/** Swaps the site's colours for a direction's in any CSS text; null when nothing matched. */
export function makeRecolor(theme: DesignTheme): (text: string) => string | null {
  const map = theme.map;
  const fromRgb = new Map(Object.entries(map).map(([from, to]) => [toRgb(from), toRgb(to)]));
  const hexRe = new RegExp(`#(${Object.keys(map).map((k) => k.slice(1)).join("|")})([0-9a-f]{2})?\\b`, "gi");
  // The CSSOM hands colours back as rgb(10, 10, 11), rgba(10, 10, 11, 0.4)
  // or rgb(10 10 11 / var(--tw-bg-opacity, 1)); only the triple is swapped.
  const rgbRe = /(rgba?\(\s*)(\d+)([,\s]+)(\d+)([,\s]+)(\d+)/g;
  return (text) => {
    let hit = false;
    const out = text
      .replace(hexRe, (_m, h: string, a?: string) => { hit = true; return map[`#${h.toLowerCase()}`] + (a ?? ""); })
      .replace(rgbRe, (m, open: string, r: string, s1: string, g: string, s2: string, b: string) => {
        const to = fromRgb.get(`${r} ${g} ${b}`);
        if (!to) return m;
        hit = true;
        const [nr, ng, nb] = to.split(" ");
        return `${open}${nr}${s1}${ng}${s2}${nb}`;
      });
    return hit ? out : null;
  };
}

/**
 * Colours written straight on an element (a style="" gradient, an SVG fill)
 * never pass through the stylesheet, so they are swapped on the element
 * itself. The original is kept in data-dp-* and put back by restoreInline().
 */
const INLINE_ATTRS = ["style", "fill", "stroke", "stop-color"] as const;
export function recolorInline(theme: DesignTheme, root: ParentNode = document.body): void {
  const recolor = makeRecolor(theme);
  const sel = INLINE_ATTRS.map((a) => `[${a}]`).join(",");
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(sel))) {
    if (el.closest("[data-design-bar]")) continue;
    for (const a of INLINE_ATTRS) {
      const keep = `data-dp-${a}`;
      const orig = el.getAttribute(keep) ?? el.getAttribute(a);
      if (orig == null) continue;
      const next = recolor(orig);
      if (next == null) continue;
      if (!el.hasAttribute(keep)) el.setAttribute(keep, orig);
      el.setAttribute(a, next);
    }
  }
}
export function restoreInline(root: ParentNode = document.body): void {
  for (const a of INLINE_ATTRS) {
    for (const el of Array.from(root.querySelectorAll(`[data-dp-${a}]`))) {
      el.setAttribute(a, el.getAttribute(`data-dp-${a}`) ?? "");
      el.removeAttribute(`data-dp-${a}`);
    }
  }
}

export function buildPreviewCss(theme: DesignTheme): string {
  const map = theme.map;
  const scope = `html[data-design="${theme.id}"]`;
  const recolor = makeRecolor(theme);

  const walk = (rules: CSSRuleList): string => {
    let css = "";
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const sel = rule.selectorText;
        // Pseudo-elements cannot sit inside :is(); html/body get their own rule below.
        if (/::|(^|[\s,>+~])(html|body)\b|:root/.test(sel)) continue;
        const body = recolor(rule.style.cssText);
        if (body) css += `${scope} :is(${sel}){${body}}\n`;
      } else if (rule instanceof CSSMediaRule) {
        const inner = walk(rule.cssRules);
        if (inner) css += `@media ${rule.conditionText}{${inner}}\n`;
      } else if (rule instanceof CSSSupportsRule) {
        const inner = walk(rule.cssRules);
        if (inner) css += `@supports ${rule.conditionText}{${inner}}\n`;
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        css += walk((rule as CSSGroupingRule).cssRules);   // @layer blocks
      }
    }
    return css;
  };

  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.ownerNode instanceof HTMLStyleElement && sheet.ownerNode.id === "design-preview") continue;
    try { css += walk(sheet.cssRules); } catch { /* a cross-origin sheet cannot be read; nothing of ours lives there */ }
  }

  const r = theme.radius;
  css += `
${scope}, ${scope} body { background: ${theme.bg} !important; color: ${theme.fg} !important; }
${scope} { --font-sans: ${theme.font}; }
${scope} body { font-family: ${theme.font}; }
${scope} :is(h1, h2, h3) { font-weight: ${theme.headingWeight} !important; letter-spacing: ${theme.headingTracking}; }
${scope} .rounded-lg { border-radius: ${r.lg}; }
${scope} .rounded-xl { border-radius: ${r.xl}; }
${scope} .rounded-2xl { border-radius: ${r.xxl}; }
${scope} .rounded-3xl { border-radius: ${r.xxxl}; }
${scope} :is(a, button):is(.rounded-lg, .rounded-xl, .rounded-2xl, .rounded-md) { border-radius: ${r.button}; }
${scope} ::selection { background: ${map[FLAME.base] ?? FLAME.base}; color: #fff; }
`;
  return css;
}

/** Used by the swatches in the admin tab: a readable label colour for a hex. */
export const inkOn = (h: string): string => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#000000" : "#ffffff";
};
