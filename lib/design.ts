import type {
  Design,
  DesignElement,
  DesignFontId,
  DesignShapeElement,
  DesignShapeKind,
  DesignTextElement,
} from "./types";

// Canvas scale: the product face is measured in millimetres; the SVG works in
// the same units and is scaled by the viewer, so 1 unit == 1mm everywhere.

export const DESIGN_FONTS: { id: DesignFontId; name: string; css: string; sample: string }[] = [
  { id: "heebo",    name: "Heebo",            css: "var(--font-sans), sans-serif",     sample: "אבג ABC" },
  { id: "rubik",    name: "Rubik",            css: "var(--font-rubik), sans-serif",    sample: "אבג ABC" },
  { id: "assistant",name: "Assistant",        css: "var(--font-assistant), sans-serif",sample: "אבג ABC" },
  { id: "secular",  name: "Secular One",      css: "var(--font-secular), sans-serif",  sample: "אבג ABC" },
  { id: "frank",    name: "Frank Ruhl Libre", css: "var(--font-frank), serif",         sample: "אבג ABC" },
  { id: "suez",     name: "Suez One",         css: "var(--font-suez), serif",          sample: "אבג ABC" },
  { id: "karantina",name: "Karantina",        css: "var(--font-karantina), sans-serif",sample: "אבג ABC" },
  { id: "mono",     name: "JetBrains Mono",   css: "var(--font-mono), monospace",      sample: "0123 ABC" },
];

export const DESIGN_FONT_BY_ID = Object.fromEntries(DESIGN_FONTS.map((f) => [f.id, f])) as Record<DesignFontId, (typeof DESIGN_FONTS)[number]>;

export const DESIGN_SHAPES: { id: DesignShapeKind; label: string }[] = [
  { id: "rect", label: "מלבן" },
  { id: "roundrect", label: "מלבן מעוגל" },
  { id: "circle", label: "עיגול" },
  { id: "triangle", label: "משולש" },
  { id: "diamond", label: "מעוין" },
  { id: "hexagon", label: "משושה" },
  { id: "star", label: "כוכב" },
  { id: "heart", label: "לב" },
  { id: "arrow", label: "חץ" },
  { id: "line", label: "קו" },
];

/** Colours that print well: the filament shelf + a few neutrals. */
export const DESIGN_PALETTE = [
  "#f5f5f7", "#0a0a0b", "#089a47", "#FF6B1A", "#C2261C", "#1E40AF",
  "#00C2C7", "#3D5229", "#C9A227", "#A8A9AD", "#4C1D95", "#EC4899", "#7EE787",
];

let seq = 0;
export const uid = () => `el-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function emptyDesign(w: number, h: number): Design {
  return { w, h, elements: [] };
}

export function newText(d: Design, partial: Partial<DesignTextElement> = {}): DesignTextElement {
  const size = Math.max(4, Math.round(Math.min(d.w, d.h) * 0.28));
  return {
    id: uid(),
    kind: "text",
    text: "טקסט",
    font: "heebo",
    size,
    bold: true,
    fill: "#f5f5f7",
    x: d.w / 2,
    y: d.h / 2,
    rotation: 0,
    ...partial,
  };
}

export function newShape(d: Design, shape: DesignShapeKind, partial: Partial<DesignShapeElement> = {}): DesignShapeElement {
  const s = Math.min(d.w, d.h) * 0.45;
  const isLine = shape === "line";
  return {
    id: uid(),
    kind: "shape",
    shape,
    fill: "#089a47",
    stroke: null,
    strokeWidth: 0,
    x: d.w / 2,
    y: d.h / 2,
    w: isLine ? d.w * 0.6 : s,
    h: isLine ? Math.max(1, d.h * 0.04) : s,
    rotation: 0,
    ...partial,
  };
}

/**
 * Path for a shape centred at (0,0) with the given width/height.
 * Everything is a path so rotation and export stay trivial.
 */
export function shapePath(kind: DesignShapeKind, w: number, h: number): string {
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  switch (kind) {
    case "rect":
      return `M${x0} ${y0} H${x1} V${y1} H${x0} Z`;
    case "roundrect": {
      const r = Math.min(w, h) * 0.2;
      return `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
    }
    case "circle": {
      const rx = w / 2, ry = h / 2;
      return `M${-rx} 0 A${rx} ${ry} 0 1 0 ${rx} 0 A${rx} ${ry} 0 1 0 ${-rx} 0 Z`;
    }
    case "triangle":
      return `M0 ${y0} L${x1} ${y1} L${x0} ${y1} Z`;
    case "diamond":
      return `M0 ${y0} L${x1} 0 L0 ${y1} L${x0} 0 Z`;
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${(w / 2) * Math.cos(a)} ${(h / 2) * Math.sin(a)}`;
      });
      return `M${pts.join(" L")} Z`;
    }
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? 1 : 0.45;
        pts.push(`${(w / 2) * rr * Math.cos(a)} ${(h / 2) * rr * Math.sin(a)}`);
      }
      return `M${pts.join(" L")} Z`;
    }
    case "heart": {
      const s = Math.min(w, h);
      const k = s / 100;
      // classic heart in a 100×100 box, centred
      return [
        `M0 ${40 * k}`,
        `C0 ${10 * k} ${-50 * k} ${10 * k} ${-50 * k} ${-10 * k}`,
        `C${-50 * k} ${-35 * k} ${-15 * k} ${-45 * k} 0 ${-25 * k}`,
        `C${15 * k} ${-45 * k} ${50 * k} ${-35 * k} ${50 * k} ${-10 * k}`,
        `C${50 * k} ${10 * k} 0 ${10 * k} 0 ${40 * k} Z`,
      ].join(" ");
    }
    case "arrow": {
      const head = w * 0.35, body = h * 0.45;
      return `M${x0} ${-body / 2} H${x1 - head} V${y0} L${x1} 0 L${x1 - head} ${y1} V${body / 2} H${x0} Z`;
    }
    case "line":
      return `M${x0} ${y0} H${x1} V${y1} H${x0} Z`;
    default:
      return `M${x0} ${y0} H${x1} V${y1} H${x0} Z`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Font-family fallback names for the standalone SVG export (no CSS vars there). */
const EXPORT_FONT: Record<DesignFontId, string> = {
  heebo: "Heebo, Arial, sans-serif",
  rubik: "Rubik, Arial, sans-serif",
  assistant: "Assistant, Arial, sans-serif",
  secular: "'Secular One', Arial, sans-serif",
  frank: "'Frank Ruhl Libre', Georgia, serif",
  suez: "'Suez One', Georgia, serif",
  karantina: "Karantina, Impact, sans-serif",
  mono: "'JetBrains Mono', Consolas, monospace",
};

function elementSvg(el: DesignElement): string {
  const t = `translate(${el.x} ${el.y}) rotate(${el.rotation})`;
  if (el.kind === "text") {
    return `<text transform="${t}" text-anchor="middle" dominant-baseline="central" font-family="${EXPORT_FONT[el.font]}" font-size="${el.size}" font-weight="${el.bold ? 700 : 400}" fill="${el.fill}">${esc(el.text)}</text>`;
  }
  const stroke = el.stroke ? ` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"` : "";
  return `<path transform="${t}" d="${shapePath(el.shape, el.w, el.h)}" fill="${el.fill}"${stroke}/>`;
}

/** Standalone SVG (mm units) — this is what travels with the order. */
export function designToSvg(d: Design, background?: string): string {
  const bg = background ? `<rect width="${d.w}" height="${d.h}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.w}mm" height="${d.h}mm" viewBox="0 0 ${d.w} ${d.h}">${bg}${d.elements.map(elementSvg).join("")}</svg>`;
}

/** Human-readable lines for the order summary. */
export function designSummary(d: Design): string[] {
  const texts = d.elements.filter((e): e is DesignTextElement => e.kind === "text");
  const shapes = d.elements.filter((e): e is DesignShapeElement => e.kind === "shape");
  const lines: string[] = [`עיצוב חופשי: ${d.elements.length} אלמנטים על ${d.w}×${d.h}mm`];
  for (const t of texts) {
    lines.push(`טקסט "${t.text}" · ${DESIGN_FONT_BY_ID[t.font].name} ${t.size}mm · ${t.fill}`);
  }
  if (shapes.length) {
    const counts = new Map<string, number>();
    for (const s of shapes) {
      const label = DESIGN_SHAPES.find((x) => x.id === s.shape)?.label ?? s.shape;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    lines.push(`צורות: ${[...counts].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(", ")}`);
  }
  const colors = new Set(d.elements.map((e) => e.fill.toLowerCase()));
  lines.push(`צבעים בעיצוב: ${colors.size}${colors.size > 1 ? " (הדפסת AMS)" : ""}`);
  return lines;
}

export function designColorCount(d: Design): number {
  return new Set(d.elements.map((e) => e.fill.toLowerCase())).size;
}
