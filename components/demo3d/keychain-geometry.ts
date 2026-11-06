import * as THREE from "three";
import type { Font } from "opentype.js";

/**
 * A keychain as real geometry, in millimetres: a rounded plate with a ring
 * hole, and the customer's text raised on top of it. This is the shape that
 * gets printed, built in the browser from the same font the site uses — so
 * the 3D view shows the actual object, not a picture of one.
 */

export type KeychainSpec = {
  text: string;
  width: number;   // mm
  height: number;  // mm
  plate: number;   // plate thickness, mm
  raise: number;   // text height above the plate, mm
};

const HEB = /[֐-׿]/;

/**
 * Visual order for a single line. The font lays glyphs left to right, so a
 * Hebrew run has to be handed over reversed — while numbers and Latin words
 * inside it keep their own order (BiDi, simplified to what a name fits).
 */
export function visualOrder(text: string): string {
  if (!HEB.test(text)) return text;
  // Runs of left-to-right material (Latin, digits, and the dots or dashes
  // inside them, as in "3D" or "050-1234567") keep their order; everything
  // else is right-to-left. The line itself is right-to-left, so the runs are
  // laid out in reverse.
  const runs = text.match(/[A-Za-z0-9](?:[A-Za-z0-9.\-/:]*[A-Za-z0-9])?|[^A-Za-z0-9]+/g) ?? [text];
  const mirror = (c: string) => (c === "(" ? ")" : c === ")" ? "(" : c);
  return runs
    .map((r) => (/^[A-Za-z0-9]/.test(r) ? r : [...r].reverse().map(mirror).join("")))
    .reverse()
    .join("");
}

/** opentype path → three shapes (y flipped: fonts grow down, the scene grows up). */
function pathToShapes(font: Font, text: string, size: number): THREE.Shape[] {
  const path = font.getPath(text, 0, 0, size);
  const sp = new THREE.ShapePath();
  for (const c of path.commands) {
    if (c.type === "M") sp.moveTo(c.x, -c.y);
    else if (c.type === "L") sp.lineTo(c.x, -c.y);
    else if (c.type === "Q") sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === "C") sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  // TrueType outlines are clockwise; after the flip they are counter-clockwise.
  return sp.toShapes(false);
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function buildKeychain(font: Font, spec: KeychainSpec) {
  const { width: w, height: h, plate, raise } = spec;
  const holeR = 2.6;
  const holeX = w / 2 - holeR - 3.2;

  const outline = roundedRect(w, h, Math.min(6, h / 2.4));
  const hole = new THREE.Path();
  hole.absarc(holeX, 0, holeR, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const plateGeo = new THREE.ExtrudeGeometry(outline, {
    depth: plate, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 3, curveSegments: 24,
  });

  // The text area: the plate minus a margin and minus the ring hole.
  // Centred on the plate, not on what is left of it beside the hole: the same
  // clearance on both sides reads as centred, the other way as pushed aside.
  const clear = holeR * 2 + 4.4;
  const areaW = w - 2 * clear;
  const areaH = h * 0.56;
  const areaCx = 0;

  let textGeo: THREE.ExtrudeGeometry | null = null;
  const shown = visualOrder(spec.text.trim());
  if (shown) {
    const shapes = pathToShapes(font, shown, 10);
    if (shapes.length) {
      const g = new THREE.ExtrudeGeometry(shapes, {
        depth: raise, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1, curveSegments: 6,
      });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      const tw = b.max.x - b.min.x, th = b.max.y - b.min.y;
      const k = Math.min(areaW / tw, areaH / th);
      g.translate(-(b.min.x + tw / 2), -(b.min.y + th / 2), 0);
      g.scale(k, k, 1);
      g.translate(areaCx, 0, plate + 0.5);
      textGeo = g;
    }
  }
  return { plateGeo, textGeo };
}
