/**
 * What the page needs to know about the styles without building one: their
 * names and colours, and which font each draws with. Kept apart from ./styles
 * so importing it doesn't pull three.js and clipper into the page — those load
 * only with the viewer, and the viewer can start fetching its one font before
 * they arrive.
 */

export type StyleId = "plate" | "outline" | "script" | "bold" | "bar";
export type FontId = "heebo" | "rubik" | "lobster" | "sacramento" | "amatic" | "arimo" | "kanitItalic";

/** Every font a style can ask for, by file in public/fonts. */
export const FONT_FILES: Record<FontId, string> = {
  heebo: "heebo-800", rubik: "rubik-900", lobster: "lobster", sacramento: "sacramento",
  amatic: "amatic-700", arimo: "arimo-700", kanitItalic: "kanit-700i",
};

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

/** The text a style draws for what was typed (an empty field shows a placeholder). */
export const shownText = (raw: string) => raw.trim() || "שם";


export const STYLES: { id: StyleId; label: string; hint: string; colours: 1 | 2; ink: string; base: string }[] = [
  { id: "plate", label: "סטייל 1", hint: "לוחית עם הכיתוב מורם", colours: 2, ink: "#6a2bb5", base: "#1d1f1e" },
  { id: "outline", label: "סטייל 2", hint: "כתב יד עבה על מתאר שחור, טבעת קטנה בצד", colours: 2, ink: "#e8915a", base: "#1d1f1e" },
  { id: "script", label: "סטייל 3", hint: "כתב יד בקו אחיד, צבע אחד", colours: 1, ink: "#e2557c", base: "#e2557c" },
  { id: "bold", label: "סטייל 4", hint: "אותיות עבות על מתאר לבן רחב", colours: 2, ink: "#1d1f1e", base: "#f1f1ee" },
  { id: "bar", label: "סטייל 5", hint: "כתב נטוי בתוך פס כהה עם שוליים בהירים", colours: 2, ink: "#f1f1ee", base: "#1d1f1e" },
];

/**
 * The stocked filament closest to a style's colour. The styles carry the
 * reference file's exact colours; the shop has the spools it has, so each
 * style opens on the nearest one rather than on whatever happened to match.
 */
export function nearestFilament<T extends { id: string; hex: string }>(hex: string, list: T[]): T | undefined {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best: T | undefined, d = Infinity;
  for (const f of list) {
    if (!/^#[0-9a-f]{6}$/i.test(f.hex)) continue;
    const [r2, g2, b2] = rgb(f.hex);
    // Weighted for the eye: green counts most, blue least.
    const e = 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
    if (e < d) { d = e; best = f; }
  }
  return best;
}
