#!/usr/bin/env node
/**
 * Download every remote photo the shop shows, into the shop.
 *
 *   npm run fetch:images          # download what is missing
 *   npm run fetch:images -- --all # re-download everything
 *
 * The catalogue points at the designers' own CDNs (MakerWorld, Printables,
 * Cults3D, MyMiniFactory). Hotlinking them means the shop breaks whenever one
 * of those hosts rate-limits, moves a path, or goes down — and it leaks our
 * visitors to them. This walks lib/ for image URLs, saves each one under
 * public/img/catalog/, and writes lib/localImages.generated.ts so the site
 * serves its own copies. Anything it cannot fetch keeps the original URL, so a
 * failed download degrades to today's behaviour instead of a broken page.
 *
 * The name of each file is a hash of its URL: stable across runs, safe on
 * every filesystem, and immune to two designers using the same filename.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "img", "catalog");
const MANIFEST = path.join(ROOT, "lib", "localImages.generated.ts");
const SCAN_DIRS = [path.join(ROOT, "lib")];

const ALL = process.argv.includes("--all");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CONCURRENCY = 6;
const TIMEOUT_MS = 30_000;

const IMAGE_URL = /https:\/\/[^"'` )]+?\.(?:jpe?g|png|webp|gif)(?:\?[^"'` )]*)?/gi;

function collectUrls() {
  const urls = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|json)$/.test(e.name) && e.name !== "localImages.generated.ts") {
        for (const m of fs.readFileSync(p, "utf8").matchAll(IMAGE_URL)) urls.add(m[0]);
      }
    }
  };
  for (const d of SCAN_DIRS) if (fs.existsSync(d)) walk(d);
  return [...urls].sort();
}

/** Stable, collision-free stem for a URL — query string and all. */
const stemFor = (url) => crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);

const EXT_BY_TYPE = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif" };

/**
 * The extension has to come from what the server actually sent, not from the
 * URL. MakerWorld's photo links end in `.png` but carry
 * `?x-oss-process=…/format,webp`, so the bytes are WebP — saving those as .png
 * would have the site serve a file whose Content-Type is a lie.
 */
const extFor = (contentType, url) =>
  EXT_BY_TYPE[(contentType || "").split(";")[0].trim().toLowerCase()] ??
  (url.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i)?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");

/** The file already on disk for this URL, whatever extension it landed with. */
function existingFile(stem) {
  for (const ext of ["webp", "jpg", "png", "gif"]) {
    if (fs.existsSync(path.join(OUT_DIR, `${stem}.${ext}`))) return `${stem}.${ext}`;
  }
  return null;
}

/** Resolves to the filename written, or throws with a reason. */
async function download(url, stem) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, accept: "image/*,*/*" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // A 200 that hands back an error page is worse than a miss: it would sit
    // in the folder looking like the photo.
    if (buf.length < 1024) throw new Error(`too small (${buf.length}b)`);
    const file = `${stem}.${extFor(res.headers.get("content-type"), url)}`;
    fs.writeFileSync(path.join(OUT_DIR, file), buf);
    return file;
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "timeout" : e.message);
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const urls = collectUrls();
  const jobs = urls.map((url) => ({ url, stem: stemFor(url), file: existingFile(stemFor(url)) }));

  const todo = jobs.filter((j) => ALL || !j.file);
  console.log(`  ${urls.length} תמונות בקטלוג · ${todo.length} להורדה`);

  const failed = [];
  let done = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const j = queue.shift();
        try {
          j.file = await download(j.url, j.stem);
        } catch (e) {
          failed.push({ ...j, err: e.message });
        }
        done++;
        if (done % 20 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
      }
    }),
  );

  // Only URLs whose file is actually on disk go in the manifest; the rest keep
  // pointing at the original so the page still shows something.
  const have = jobs.filter((j) => j.file);
  const body = have.map((j) => `  ${JSON.stringify(j.url)}: "img/catalog/${j.file}",`).join("\n");
  fs.writeFileSync(
    MANIFEST,
    `// Auto-generated by scripts/fetch-images.mjs — DO NOT EDIT BY HAND.\n` +
      `//\n// Remote photo URL → the copy of it stored in public/. Run\n` +
      `// \`npm run fetch:images\` after adding models.\n// Images: ${have.length}\n\n` +
      `export const LOCAL_IMAGES: Record<string, string> = {\n${body}\n};\n`,
    "utf8",
  );

  // Sweep files no model points at any more, so the folder tracks the shop.
  const keep = new Set(have.map((j) => j.file));
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!keep.has(f)) { fs.unlinkSync(path.join(OUT_DIR, f)); console.log(`  הוסר: ${f}`); }
  }

  console.log(`  נשמרו ${have.length} תמונות ב-public/img/catalog`);
  if (failed.length) {
    console.log(`  ${failed.length} נכשלו (נשארות מהמקור):`);
    for (const f of failed.slice(0, 10)) console.log(`   · ${f.err} — ${f.url.slice(0, 90)}`);
  }
}

main();
