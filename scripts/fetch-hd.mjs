#!/usr/bin/env node
/**
 * HD photos for the home-page gallery ("ככה זה נראה כשזה יוצא מהמדפסת").
 *
 *   npm run fetch:hd          # download what is missing
 *   npm run fetch:hd -- --all # re-download everything
 *
 * The catalogue's own copies (public/img/catalog) stop at 900px, and the card
 * thumbnails at 400px: right for a product card, soft in a gallery that fills
 * the width of a laptop. This takes the top three models by downloads on each
 * shelf (the gallery shows the first sellable one; the other two cover a model
 * the shop holds back), downloads the designer's original, and stores it at
 * 1600px as WebP under public/img/hd/<id>.webp, listed in
 * lib/hdImages.generated.ts. A model with no HD copy shows the 900px one, so a
 * failed download costs sharpness, never a picture.
 *
 * Runs on GitHub (.github/workflows/hd-images.yml): the designers' CDNs are
 * reachable from there, not from every machine.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sharp = await import("sharp").then((m) => m.default).catch(() => null);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "lib", "imported.generated.ts");
const MOVES = path.join(ROOT, "lib", "shop-overrides.ts");
// The same two the shop refuses to sell (BLOCKED_HOLDS in lib/imported.ts).
// "brand" is not one of them: the leading pets model carries it and is sold.
const BLOCKED = ["weapon", "license-nc"];
const OUT_DIR = path.join(ROOT, "public", "img", "hd");
const MANIFEST = path.join(ROOT, "lib", "hdImages.generated.ts");
const ALL = process.argv.includes("--all");
const PER_SHELF = 3;
const WIDTH = 1600;
const QUALITY = 80;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** The array in imported.generated.ts is plain JSON after the `=`. */
function readCatalogue() {
  const text = fs.readFileSync(SRC, "utf8");
  const start = text.indexOf("= [", text.indexOf("IMPORTED_GENERATED")) + 2;
  const end = text.indexOf("\n];", start);
  return JSON.parse(text.slice(start, end + 2));
}

/**
 * Shelves the owner moved models to from /admin (lib/shop-overrides.ts).
 * Without them the leader of a shelf that exists only by such a move (the
 * business shelf's door stopper, moved from "home") was never fetched.
 */
function readMoves() {
  const text = fs.readFileSync(MOVES, "utf8");
  const at = text.indexOf("SHELF_MOVES");
  const start = text.indexOf("{", text.indexOf("=", at));
  const end = text.indexOf("\n};", start);
  return JSON.parse(text.slice(start, end + 2).replace(/,(\s*})$/, "$1"));
}

/** The designer's original: the first gallery image, or the cover without its resize. */
const originalOf = (m) => m.images?.[0] ?? (m.image ? m.image.split("?")[0] : null);

function pick(models, moves) {
  const byShelf = new Map();
  for (const m of models) {
    if (m.holds?.some((h) => BLOCKED.includes(h)) || !originalOf(m) || m.status === "removed") continue;
    // Counted on its own shelf and on every shelf it was moved to: a top
    // three too many costs one photo, a missing leader costs the HD.
    for (const shelf of new Set([m.shelf, ...(moves[m.id] ?? [])])) {
      const list = byShelf.get(shelf) ?? [];
      list.push(m);
      byShelf.set(shelf, list);
    }
  }
  const ids = new Map();
  for (const list of byShelf.values())
    for (const m of list.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, PER_SHELF)) ids.set(m.id, m);
  return [...ids.values()];
}

async function download(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, accept: "image/*,*/*" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4096) throw new Error(`too small (${buf.length}b)`);
    return buf;
  } finally {
    clearTimeout(t);
  }
}

const chosen = pick(readCatalogue(), readMoves());
fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
let fetched = 0;
let failed = 0;
for (const m of chosen) {
  const file = `${m.id}.webp`;
  const dest = path.join(OUT_DIR, file);
  if (fs.existsSync(dest) && !ALL) {
    manifest[m.id] = `img/hd/${file}`;
    continue;
  }
  try {
    const raw = await download(originalOf(m));
    const out = sharp
      ? await sharp(raw).rotate().resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
      : raw;
    fs.writeFileSync(dest, out);
    manifest[m.id] = `img/hd/${file}`;
    fetched += 1;
    console.log(`✓ ${m.id} ${m.shelf} ${Math.round(out.length / 1024)}KB`);
  } catch (e) {
    failed += 1;
    console.log(`✗ ${m.id} ${m.shelf}: ${e.message}`);
  }
}

// Off the list now (another model overtook it): its file goes, so the folder
// does not grow by three photos every time the rankings move.
const keep = new Set(Object.values(manifest).map((p) => path.basename(p)));
for (const f of fs.readdirSync(OUT_DIR)) if (!keep.has(f)) fs.unlinkSync(path.join(OUT_DIR, f));

const body = Object.keys(manifest)
  .sort()
  .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(manifest[id])},`)
  .join("\n");
fs.writeFileSync(
  MANIFEST,
  `// Auto-generated by scripts/fetch-hd.mjs — DO NOT EDIT BY HAND.\n//\n// Model id → 1600px photo under public/, for the home-page gallery.\n\nexport const HD_IMAGES: Record<string, string> = {\n${body}\n};\n`,
);
console.log(`HD photos: ${Object.keys(manifest).length} listed, ${fetched} downloaded, ${failed} failed`);
