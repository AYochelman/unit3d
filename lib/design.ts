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

/** Silhouette of a product's printable face. One definition for the canvas,
 *  the live preview and the exported SVG so all three agree. */
export type FaceKind = "rect" | "roundrect" | "round" | "phone" | "tall" | "bone" | "heart" | "fish" | "paw";

/**
 * Where text may sit on a face, as fractions of the face box.
 *
 * The centre of the bounding box is not the centre of the SHAPE: on a paw it
 * falls between the pad and the toes, on a fish it lands in the tail. Each
 * silhouette names its own printable panel so the engraving stays on material.
 */
export type TextBox = { cx: number; cy: number; w: number; h: number };

const TEXT_BOX: Record<FaceKind, TextBox> = {
  rect: { cx: 0.5, cy: 0.5, w: 0.86, h: 0.6 },
  roundrect: { cx: 0.5, cy: 0.5, w: 0.82, h: 0.58 },
  round: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.55 },
  phone: { cx: 0.5, cy: 0.55, w: 0.8, h: 0.5 },
  tall: { cx: 0.5, cy: 0.5, w: 0.78, h: 0.5 },
  // the bar between the lobes
  bone: { cx: 0.5, cy: 0.5, w: 0.6, h: 0.3 },
  // the wide upper half, above the point
  heart: { cx: 0.5, cy: 0.45, w: 0.62, h: 0.34 },
  // the body, not the tail
  fish: { cx: 0.34, cy: 0.5, w: 0.46, h: 0.44 },
  // the pad, below the toes
  paw: { cx: 0.5, cy: 0.73, w: 0.58, h: 0.38 },
};

export const faceTextBox = (kind: FaceKind): TextBox => TEXT_BOX[kind];

export function facePath(kind: FaceKind, w: number, h: number): string {
  // Pet-tag silhouettes. Drawn from the face box so they scale with the size
  // the customer picks, the same way the rounded rectangle does.
  if (kind === "bone") {
    // A classic dog bone: a bar across the middle with two lobes at each end.
    // Built as a bar plus four circles in one path - a union always reads as a
    // bone, where a single outline drifts into a blob at some proportions.
    const r = h * 0.26;
    const cy1 = r, cy2 = h - r;
    const cx1 = r, cx2 = w - r;
    const circle = (cx: number, cy: number) =>
      `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${r * 2} 0 a${r} ${r} 0 1 1 ${-r * 2} 0 Z`;
    return [
      `M${cx1} ${h * 0.34} H${cx2} V${h * 0.66} H${cx1} Z`,
      circle(cx1, cy1),
      circle(cx1, cy2),
      circle(cx2, cy1),
      circle(cx2, cy2),
    ].join(" ");
  }
  if (kind === "heart") {
    const cx = w / 2;
    return `M${cx} ${h * 0.97} C${w * 0.02} ${h * 0.66} ${w * 0.06} ${h * 0.04} ${cx} ${h * 0.28} C${w * 0.94} ${h * 0.04} ${w * 0.98} ${h * 0.66} ${cx} ${h * 0.97} Z`;
  }
  if (kind === "fish") {
    // Body as two arcs, tail as a notched triangle joined to it.
    const bw = w * 0.7, cy = h / 2;
    return [
      `M${w * 0.02} ${cy}`,
      `C${bw * 0.18} ${h * 0.04} ${bw * 0.72} ${h * 0.04} ${bw} ${cy}`,
      `L${w} ${h * 0.1}`,
      `L${w * 0.88} ${cy}`,
      `L${w} ${h * 0.9}`,
      `L${bw} ${cy}`,
      `C${bw * 0.72} ${h * 0.96} ${bw * 0.18} ${h * 0.96} ${w * 0.02} ${cy}`,
      "Z",
    ].join(" ");
  }
  if (kind === "paw") {
    // One pad and four toes. Sizes are relative to the width so the toes stay
    // in proportion on a wide tag as well as a square one.
    const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
      `M${cx - rx} ${cy} a${rx} ${ry} 0 1 1 ${rx * 2} 0 a${rx} ${ry} 0 1 1 ${-rx * 2} 0 Z`;
    const tx = w * 0.115, ty = h * 0.17;
    return [
      // pad
      `M${w * 0.5} ${h * 0.99} C${w * 0.16} ${h * 0.99} ${w * 0.13} ${h * 0.46} ${w * 0.5} ${h * 0.46} C${w * 0.87} ${h * 0.46} ${w * 0.84} ${h * 0.99} ${w * 0.5} ${h * 0.99} Z`,
      ellipse(w * 0.15, h * 0.29, tx, ty),
      ellipse(w * 0.38, h * 0.19, tx, ty),
      ellipse(w * 0.62, h * 0.19, tx, ty),
      ellipse(w * 0.85, h * 0.29, tx, ty),
    ].join(" ");
  }
  if (kind === "round") {
    return `M${w / 2} 0 A${w / 2} ${h / 2} 0 1 0 ${w / 2} ${h} A${w / 2} ${h / 2} 0 1 0 ${w / 2} 0 Z`;
  }
  const r = kind === "rect" ? Math.min(w, h) * 0.06 : Math.min(w, h) * 0.16;
  return `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 0 ${h - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
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

/**
 * Standalone SVG (mm units) — this is what travels with the order.
 * `direction="rtl"` matches the canvas: without it an <img> renders the SVG as
 * an isolated LTR document and mixed Hebrew/Latin text comes out reordered.
 * The artwork is clipped to the product face so the export equals what was seen.
 */
export function designToSvg(d: Design, background?: string, facePath?: string): string {
  const clip = facePath
    ? `<clipPath id="face"><path d="${facePath}"/></clipPath>`
    : `<clipPath id="face"><rect width="${d.w}" height="${d.h}"/></clipPath>`;
  const bg = background
    ? facePath
      ? `<path d="${facePath}" fill="${background}"/>`
      : `<rect width="${d.w}" height="${d.h}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.w}mm" height="${d.h}mm" viewBox="0 0 ${d.w} ${d.h}" direction="rtl"><defs>${clip}</defs>${bg}<g clip-path="url(#face)">${d.elements.map(elementSvg).join("")}</g></svg>`;
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
  const colors = designColors(d);
  lines.push(`צבעים בעיצוב: ${colors.size}${colors.size > 1 ? " (הדפסת AMS)" : ""}`);
  return lines;
}

/** Every distinct printed colour: fills AND shape outlines (each is a filament). */
export function designColors(d: Design): Set<string> {
  const set = new Set<string>();
  for (const e of d.elements) {
    set.add(e.fill.toLowerCase());
    if (e.kind === "shape" && e.stroke) set.add(e.stroke.toLowerCase());
  }
  return set;
}

export function designColorCount(d: Design): number {
  return designColors(d).size;
}

export type DesignPricePart = { label: string; amount: number };

/**
 * What one element in the design is costing, and why.
 *
 * The design surcharge is a one-off and the colour surcharge is per FILAMENT,
 * not per element — so "how much does this circle cost" only has an answer if
 * you decide who carries each charge. The rule here is first-come: the first
 * element carries the design fee, and a colour is charged to the first element
 * that introduces it. Summed over every element it comes to exactly the same
 * total the price box shows, and selecting an item explains its own line.
 */
export function designElementPrice(
  d: Design,
  id: string,
  fee: { design: number; extraColor: number },
): { parts: DesignPricePart[]; total: number } | null {
  const i = d.elements.findIndex((e) => e.id === id);
  if (i < 0) return null;

  const seen = new Set<string>();
  for (const e of d.elements.slice(0, i)) {
    seen.add(e.fill.toLowerCase());
    if (e.kind === "shape" && e.stroke) seen.add(e.stroke.toLowerCase());
  }
  const el = d.elements[i];
  const mine: string[] = [];
  const add = (c?: string | null) => {
    if (!c) return;
    const k = c.toLowerCase();
    if (!seen.has(k) && !mine.includes(k)) mine.push(k);
  };
  add(el.fill);
  if (el.kind === "shape") add(el.stroke);

  const parts: DesignPricePart[] = [];
  if (i === 0) parts.push({ label: "פתיחת עיצוב חופשי · פעם אחת", amount: fee.design });
  // The design's first colour is the print itself; every one after it is another spool.
  const billable = Math.max(0, mine.length - (seen.size === 0 ? 1 : 0));
  if (billable > 0) {
    parts.push({ label: billable > 1 ? `${billable} צבעים נוספים ב-AMS` : "צבע נוסף ב-AMS", amount: billable * fee.extraColor });
  }
  return { parts, total: parts.reduce((s, p) => s + p.amount, 0) };
}
