import * as THREE from "three";
import ClipperLib from "clipper-lib";
import type { Font } from "opentype.js";
import { buildKeychain, visualOrder } from "./keychain-geometry";

/**
 * Keychain styles, each rebuilt from scratch around whatever text is typed —
 * so the text is always editable, in every style. Each one follows a real file
 * the owner sent as a reference, as closely as a live build allows: the same
 * kind of letter, the same layers and proportions, the same default colours —
 * Olivia (heavy script on a black outline), Slay (thin script line, one
 * colour), Name (heavy sans on a wide light outline), Chevrolet (italic set
 * into a dark bar on a light rim) — plus the first plate.
 *
 * All in millimetres. Two colour slots: 1 = the text, 2 = the base.
 */

export type StyleId = "plate" | "outline" | "script" | "bold" | "bar";
export type FontId = "heebo" | "rubik" | "lobster" | "sacramento" | "amatic" | "arimo" | "kanitItalic";

/** Every font a style can ask for, by file in public/fonts. */
export const FONT_FILES: Record<FontId, string> = {
  heebo: "heebo-800", rubik: "rubik-900", lobster: "lobster", sacramento: "sacramento",
  amatic: "amatic-700", arimo: "arimo-700", kanitItalic: "kanit-700i",
};

export const STYLES: { id: StyleId; label: string; hint: string; colours: 1 | 2; ink: string; base: string }[] = [
  { id: "plate", label: "סטייל 1", hint: "לוחית עם הכיתוב מורם", colours: 2, ink: "#6a2bb5", base: "#1d1f1e" },
  { id: "outline", label: "סטייל 2", hint: "כתב יד עבה על מתאר שחור, טבעת קטנה בצד", colours: 2, ink: "#e8915a", base: "#1d1f1e" },
  { id: "script", label: "סטייל 3", hint: "כתב יד בקו אחיד, צבע אחד", colours: 1, ink: "#e2557c", base: "#e2557c" },
  { id: "bold", label: "סטייל 4", hint: "אותיות עבות על מתאר לבן רחב", colours: 2, ink: "#1d1f1e", base: "#f1f1ee" },
  { id: "bar", label: "סטייל 5", hint: "כתב נטוי בתוך פס כהה עם שוליים בהירים", colours: 2, ink: "#f1f1ee", base: "#1d1f1e" },
];

/**
 * Which font a style uses — the reference file's own kind of letter. Lobster
 * and Sacramento have no Hebrew, so Hebrew gets the nearest Hebrew face:
 * Rubik for the heavy script, Amatic (a hand-drawn line) for the thin one.
 */
export const fontFor = (style: StyleId, text: string): FontId => {
  const heb = /[\u0590-\u05FF]/.test(text);
  if (style === "outline") return heb ? "rubik" : "lobster";
  if (style === "script") return heb ? "amatic" : "sacramento";
  if (style === "bold") return "arimo";
  // Kanit's sharp italic is the closest to the Chevrolet letters; it has no
  // Hebrew, so Hebrew gets Arimo, leaned by the same skew.
  if (style === "bar") return heb ? "arimo" : "kanitItalic";
  return "heebo";
};

type Poly = { X: number; Y: number }[];
const K = 1000; // clipper works in integers: micrometres

/** The text as filled polygons in mm, overlapping glyphs merged (script fonts overlap). */
function textPolys(font: Font, text: string, size: number, tracking = 0): Poly[] {
  const path = font.getPath(visualOrder(text), 0, 0, size, tracking ? { tracking } : undefined);
  const polys: Poly[] = [];
  let cur: Poly = [];
  let x0 = 0, y0 = 0;
  const push = (x: number, y: number) => cur.push({ X: Math.round(x * K), Y: Math.round(-y * K) });
  for (const c of path.commands) {
    if (c.type === "M") { if (cur.length > 2) polys.push(cur); cur = []; push(c.x, c.y); x0 = c.x; y0 = c.y; }
    else if (c.type === "L") { push(c.x, c.y); x0 = c.x; y0 = c.y; }
    else if (c.type === "Q") {
      for (let t = 1; t <= 8; t++) {
        const u = t / 8, a = (1 - u) ** 2, b = 2 * (1 - u) * u, d = u * u;
        push(a * x0 + b * c.x1 + d * c.x, a * y0 + b * c.y1 + d * c.y);
      }
      x0 = c.x; y0 = c.y;
    } else if (c.type === "C") {
      for (let t = 1; t <= 10; t++) {
        const u = t / 10, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, e = 3 * (1 - u) * u * u, d = u ** 3;
        push(a * x0 + b * c.x1 + e * c.x2 + d * c.x, a * y0 + b * c.y1 + e * c.y2 + d * c.y);
      }
      x0 = c.x; y0 = c.y;
    } else if (c.type === "Z") { if (cur.length > 2) polys.push(cur); cur = []; }
  }
  if (cur.length > 2) polys.push(cur);
  return union(polys);
}

function union(a: Poly[], b: Poly[] = []): Poly[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const out: Poly[] = [];
  c.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out;
}

function difference(a: Poly[], b: Poly[]): Poly[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const out: Poly[] = [];
  c.Execute(ClipperLib.ClipType.ctDifference, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out;
}

function offset(p: Poly[], mm: number, sharp = false): Poly[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * K);
  co.AddPaths(p, sharp ? ClipperLib.JoinType.jtMiter : ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: Poly[] = [];
  co.Execute(out, mm * K);
  return out;
}

function circle(cx: number, cy: number, r: number): Poly {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return { X: Math.round((cx + Math.cos(a) * r) * K), Y: Math.round((cy + Math.sin(a) * r) * K) };
  });
}

function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number): Poly {
  const pts: Poly = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push({ X: Math.round((cx + Math.cos(a) * r) * K), Y: Math.round((cy + Math.sin(a) * r) * K) }); }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

function bounds(p: Poly[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of p) for (const q of poly) { x0 = Math.min(x0, q.X); x1 = Math.max(x1, q.X); y0 = Math.min(y0, q.Y); y1 = Math.max(y1, q.Y); }
  return { x0: x0 / K, y0: y0 / K, x1: x1 / K, y1: y1 / K };
}

function transform(p: Poly[], f: (x: number, y: number) => [number, number]): Poly[] {
  return p.map((poly) => poly.map((q) => { const [x, y] = f(q.X / K, q.Y / K); return { X: Math.round(x * K), Y: Math.round(y * K) }; }));
}

/** Polygons (outer + holes, any order) → three shapes, via clipper's nesting tree. */
function toShapes(p: Poly[]): THREE.Shape[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(p, ClipperLib.PolyType.ptSubject, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const shapes: THREE.Shape[] = [];
  const v = (poly: Poly) => poly.map((q) => new THREE.Vector2(q.X / K, q.Y / K));
  type Node = { Contour: () => Poly; Childs: () => Node[] };
  const walk = (node: Node) => {
    const shape = new THREE.Shape(v(node.Contour()));
    for (const hole of node.Childs()) {
      shape.holes.push(new THREE.Path(v(hole.Contour())));
      for (const island of hole.Childs()) walk(island);
    }
    shapes.push(shape);
  };
  for (const n of (tree as unknown as Node).Childs()) walk(n);
  return shapes;
}

function extrude(p: Poly[], z0: number, depth: number, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(toShapes(p), {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4,
  });
  g.translate(0, 0, z0 + bevel);
  return g;
}

/**
 * One piece, always. A keychain that comes off the plate as three loose
 * letters is not a keychain: wherever the shape falls apart (letters that do
 * not quite touch, the dot of an i), the nearest points of neighbouring pieces
 * are joined by a stroke as thick as the letters.
 */
function joined(p: Poly[], width: number): Poly[] {
  let parts = union(p);
  for (let guard = 0; guard < 24; guard++) {
    const c = new ClipperLib.Clipper();
    c.AddPaths(parts, ClipperLib.PolyType.ptSubject, true);
    const tree = new ClipperLib.PolyTree();
    c.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    type Node = { Contour: () => Poly };
    const outers = ((tree as unknown as { Childs: () => Node[] }).Childs()).map((n) => n.Contour());
    if (outers.length < 2) return parts;
    // The closest pair of points between the first piece and any other.
    let best = { d: Infinity, a: outers[0][0], b: outers[1][0] };
    const step = (q: Poly) => Math.max(1, Math.floor(q.length / 120));
    for (let j = 1; j < outers.length; j++) {
      for (let i = 0; i < outers[0].length; i += step(outers[0])) {
        const a = outers[0][i];
        for (let m = 0; m < outers[j].length; m += step(outers[j])) {
          const bq = outers[j][m];
          const d = (a.X - bq.X) ** 2 + (a.Y - bq.Y) ** 2;
          if (d < best.d) best = { d, a, b: bq };
        }
      }
    }
    const co = new ClipperLib.ClipperOffset(2, 0.02 * K);
    co.AddPath([best.a, best.b], ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
    const stroke: Poly[] = [];
    co.Execute(stroke, (width / 2) * K);
    parts = union(parts, stroke);
  }
  return parts;
}

export type Built = { geometry: THREE.BufferGeometry; slot: 1 | 2 }[];

export function buildStyle(style: StyleId, fonts: Record<FontId, Font>, raw: string): Built {
  const text = raw.trim() || "שם";
  const font = fonts[fontFor(style, text)];
  const rtl = /[֐-׿]/.test(text);

  if (style === "plate") {
    const { plateGeo, textGeo } = buildKeychain(font, { text, width: 62, height: 24, plate: 3, raise: 1.4 });
    return [{ geometry: plateGeo, slot: 2 }, ...(textGeo ? [{ geometry: textGeo, slot: 1 as const }] : [])];
  }

  // The text, scaled to a keychain: about 16mm tall, at most 70mm long.
  // Amatic (the Hebrew hand line) is tall, narrow and widely spaced; set a
  // little tighter, its letters nearly touch and the joins stay short.
  const hebLine = style === "script" && Amatic(fontFor(style, text));
  let t = textPolys(font, text, 10, hebLine ? -25 : 0);
  if (!t.length) return [];
  let b = bounds(t);
  // Each reference file's own proportions: Olivia is 78mm with ~20mm letters,
  // Slay a tall loose script (38mm on a 50mm name), the Chevrolet bar slim.
  const tall = style === "script" ? (hebLine ? 20 : 34) : style === "bar" ? 9 : style === "outline" ? 21 : 16;
  const k = Math.min(tall / (b.y1 - b.y0), (style === "script" ? 60 : 72) / (b.x1 - b.x0));
  t = transform(t, (x, y) => [(x - (b.x0 + b.x1) / 2) * k, (y - (b.y0 + b.y1) / 2) * k]);
  if (style === "bar") t = transform(t, (x, y) => [x + y * (rtl ? -0.24 : 0.08), y]);
  // ...and widened, so a Hebrew name is not a row of tall posts.
  if (hebLine) t = transform(t, (x, y) => [x * 1.35, y]);
  b = bounds(t);

  // A small tab with a hole, at the end the name starts from: left for Latin,
  // right for Hebrew, centred on the height — as in the reference files.
  const tab = (base: Poly[], reach: number, r = 4.2, hole = 2) => {
    const bb = bounds(base);
    const cx = rtl ? bb.x1 + r - reach : bb.x0 - r + reach;
    const cy = (bb.y0 + bb.y1) / 2;
    return difference(union(base, [circle(cx, cy, r)]), [circle(cx, cy, hole)]);
  };

  // Walls are straight, as printed: no rounded edges, which is what made the
  // first version look soft next to the files.
  if (style === "outline") {
    // Olivia: Lobster on a black outline about 2.8mm wide, letters slightly raised.
    const base = tab(joined(offset(t, 2.8), 2.4), 1.6, 4, 1.9);
    return [{ geometry: extrude(base, 0, 2.2), slot: 2 }, { geometry: extrude(t, 2.2, 1), slot: 1 }];
  }
  if (style === "script") {
    // Slay: one even line, as if drawn with a round pen, every letter joined
    // into a single piece; one colour, no tab (it hangs from its own loops).
    const pen = Amatic(fontFor(style, text)) ? 0.55 : 0.8;
    const line = joined(offset(t, pen), pen * 2 + 0.6);
    return [{ geometry: extrude(line, 0, 3.4), slot: 1 }];
  }
  if (style === "bold") {
    // Name: heavy sans letters on a wide light outline, tab inside the outline.
    const base = tab(joined(offset(t, 3.4), 3), 2.6, 4.6, 2.2);
    return [{ geometry: extrude(base, 0, 2), slot: 2 }, { geometry: extrude(t, 2, 2), slot: 1 }];
  }
  // bar (Chevrolet): sharp italic letters in the light colour, set flush into a
  // dark bar, and the bar on a light rim with the tab — square-cut throughout.
  const padX = 2.6, padY = 1.9;
  const inner = [roundedRect(b.x0 - padX, b.y0 - padY, b.x1 + padX, b.y1 + padY, 1.6)];
  const rim = tab(offset(inner, 1.4, true), 1.2, 4, 1.9);
  return [
    { geometry: extrude(rim, 0, 2), slot: 1 },
    { geometry: extrude(difference(inner, t), 2, 1.1), slot: 2 },
    { geometry: extrude(t, 2, 1.1), slot: 1 },
  ];
}

const Amatic = (f: FontId) => f === "amatic";
