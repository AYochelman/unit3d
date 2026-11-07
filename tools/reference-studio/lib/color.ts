/** Small colour helpers shared by the palette extractor, the probe and tokens. */

export function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function parseCssColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent" || value === "none") return null;
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const num = (s: string, max: number) => (s.endsWith("%") ? (parseFloat(s) / 100) * max : parseFloat(s));
    const r = num(parts[0] ?? "0", 255);
    const g = num(parts[1] ?? "0", 255);
    const b = num(parts[2] ?? "0", 255);
    const a = parts[3] === undefined ? 1 : num(parts[3], 1);
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return null;
}

export function relativeLuminance(hex: string): number {
  const c = parseCssColor(hex);
  if (!c) return 0;
  const chan = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/**
 * Rough, honest naming for a swatch.
 *
 * The point is to be useful in a brief, so a warm near-white is called a warm
 * near-white rather than "pale orange" - technically its hue, and useless to
 * anyone reading it. Near-neutrals keep their cast as a qualifier instead.
 */
export function describeColor(hex: string): string {
  const c = parseCssColor(hex);
  if (!c) return "colour";
  const { r, g, b } = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  const l = (max + min) / 2 / 255;

  let hue = 0;
  if (spread > 0) {
    if (max === r) hue = ((g - b) / spread) % 6;
    else if (max === g) hue = (b - r) / spread + 2;
    else hue = (r - g) / spread + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const names: [number, string][] = [
    [15, "red"], [45, "orange"], [65, "yellow"], [160, "green"],
    [200, "teal"], [250, "blue"], [290, "violet"], [330, "magenta"], [360, "red"],
  ];
  const hueName = spread > 0 ? names.find(([limit]) => hue < limit)?.[1] ?? "red" : "";
  // Warm and cool read better than a hue name on something that is basically
  // white, grey or black.
  const cast = spread < 6 ? "" : hue < 90 || hue > 330 ? "warm " : hue >= 160 && hue <= 290 ? "cool " : `${hueName}-cast `;

  if (l > 0.9 && spread < 40) return `${cast}near-white`;
  if (l < 0.14 && spread < 40) return `${cast}near-black`;
  // Judge neutrality by the raw channel spread rather than a normalised
  // saturation: a light beige has a high "saturation" by the usual formula
  // while being, to any reader, a neutral with a warm cast.
  if (spread < 26) {
    if (l > 0.66) return `${cast}light neutral`;
    if (l > 0.36) return `${cast}mid neutral`;
    return `${cast}dark neutral`;
  }
  // Earth tones turn up constantly in design references and "orange" is a poor
  // description of them.
  const saturation = spread / (255 - Math.abs(max + min - 255) || 1);
  if (hue >= 15 && hue < 65 && saturation < 0.55) {
    return l > 0.7 ? "sand" : l > 0.45 ? "tan" : "brown";
  }
  const tone = l > 0.72 ? "pale " : l < 0.3 ? "deep " : "";
  return `${tone}${hueName}`;
}
