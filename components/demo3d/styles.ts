import * as THREE from "three";
import ClipperLib from "clipper-lib";
import type { Font } from "opentype.js";
import { buildKeychain, visualOrder } from "./keychain-geometry";

/**
 * Keychain styles, each rebuilt from scratch around whatever text is typed —
 * so the text is always editable, in every style. Each one recreates a look
 * from a real file (the owner sent them as references): the text's own
 * outline as a coloured base (Olivia), joined script letters (Slay), a bold
 * name on a thick border (Name), a vertical name (the trio), a bar with a rim
 * (Chevrolet), and the first plate.
 *
 * All in millimetres. Two colour slots: 1 = the text, 2 = the base.
 */

export type StyleId = "plate" | "outline" | "script" | "bold" | "vertical" | "bar";
export type FontId = "heebo" | "rubik" | "pacifico";

export const STYLES: { id: StyleId; label: string; hint: string; colours: 1 | 2 }[] = [
  { id: "plate", label: "סטייל 1 · לוחית", hint: "לוחית עם הכיתוב מורם", colours: 2 },
  { id: "outline", label: "סטייל 2 · מתאר", hint: "כתב יד על מתאר בצבע שני", colours: 2 },
  { id: "script", label: "סטייל 3 · כתב יד", hint: "האותיות מחוברות, צבע אחד", colours: 1 },
  { id: "bold", label: "סטייל 4 · בולט", hint: "אותיות עבות על מסגרת עבה", colours: 2 },
  { id: "vertical", label: "סטייל 5 · אנכי", hint: "השם לאורך, הטבעת למטה", colours: 2 },
  { id: "bar", label: "סטייל 6 · פס עם מסגרת", hint: "פס מעוגל, שפה מורמת והכיתוב בפנים", colours: 2 },
];

/** Which font a style wants. Pacifico has no Hebrew, so Hebrew falls back to Rubik. */
export const fontFor = (style: StyleId, text: string): FontId => {
  const heb = /[֐-׿]/.test(text);
  if (style === "outline" || style === "script") return heb ? "rubik" : "pacifico";
  if (style === "bold" || style === "vertical") return "rubik";
  return "heebo";
};

type Poly = { X: number; Y: number }[];
const K = 1000; // clipper works in integers: micrometres

/** The text as filled polygons in mm, overlapping glyphs merged (script fonts overlap). */
function textPolys(font: Font, text: string, size: number): Poly[] {
  const path = font.getPath(visualOrder(text), 0, 0, size);
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

function offset(p: Poly[], mm: number): Poly[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * K);
  co.AddPaths(p, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
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

function roundedBar(x0: number, y0: number, x1: number, y1: number): Poly {
  const r = (y1 - y0) / 2, pts: Poly = [];
  for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; pts.push({ X: Math.round((x1 - r + Math.cos(a) * r) * K), Y: Math.round((y0 + r + Math.sin(a) * r) * K) }); }
  for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + (i / 24) * Math.PI; pts.push({ X: Math.round((x0 + r + Math.cos(a) * r) * K), Y: Math.round((y0 + r + Math.sin(a) * r) * K) }); }
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

function extrude(p: Poly[], z0: number, depth: number, bevel = 0.25) {
  const g = new THREE.ExtrudeGeometry(toShapes(p), {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4,
  });
  g.translate(0, 0, z0 + bevel);
  return g;
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
  let t = textPolys(font, text, 10);
  if (!t.length) return [];
  let b = bounds(t);
  const k = Math.min(16 / (b.y1 - b.y0), 70 / (b.x1 - b.x0));
  t = transform(t, (x, y) => [(x - (b.x0 + b.x1) / 2) * k, (y - (b.y0 + b.y1) / 2) * k]);
  if (style === "vertical") t = transform(t, (x, y) => [-y, x]); // reads bottom to top
  b = bounds(t);

  // The ring sits at the end the name starts from — left for Latin, right for
  // Hebrew — and at the bottom when the name stands up.
  const ring = (base: Poly[], pad: number) => {
    const cx = style === "vertical" ? (b.x0 + b.x1) / 2 : rtl ? b.x1 + pad + 2.5 : b.x0 - pad - 2.5;
    const cy = style === "vertical" ? b.y0 - pad - 2.5 : (b.y0 + b.y1) / 2;
    return difference(union(base, [circle(cx, cy, 4.6)]), [circle(cx, cy, 2.3)]);
  };

  if (style === "outline") {
    const base = ring(offset(t, 2.2), 1.4);
    return [{ geometry: extrude(base, 0, 2.4), slot: 2 }, { geometry: extrude(t, 2.4, 1.2, 0.15), slot: 1 }];
  }
  if (style === "script") {
    const base = ring(offset(t, 0.7), 0);
    return [{ geometry: extrude(base, 0, 2.8), slot: 1 }, { geometry: extrude(t, 2.8, 0.6, 0.12), slot: 1 }];
  }
  if (style === "bold" || style === "vertical") {
    const base = ring(offset(t, 3), 2.2);
    return [{ geometry: extrude(base, 0, 2), slot: 2 }, { geometry: extrude(t, 2, 2, 0.15), slot: 1 }];
  }
  // bar: a rounded bar around the text, a raised rim, the text level with the rim
  const pad = 3.2;
  const bar = [roundedBar(b.x0 - pad - 1.5, b.y0 - pad, b.x1 + pad + 1.5, b.y1 + pad)];
  const withTab = ring(bar, pad + 1.5);
  const rim = difference(bar, offset(bar, -1.3));
  return [
    { geometry: extrude(withTab, 0, 2), slot: 2 },
    { geometry: extrude(rim, 2, 1.2, 0.15), slot: 1 },
    { geometry: extrude(t, 2, 1.2, 0.15), slot: 1 },
  ];
}
