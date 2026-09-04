#!/usr/bin/env node
/**
 * Downloads IDF unit insignia from Wikimedia Commons into public/emblems/.
 *
 *   node scripts/fetch-emblems.mjs            # download everything missing
 *   node scripts/fetch-emblems.mjs --force    # re-download files that exist
 *   node scripts/fetch-emblems.mjs --list     # print the plan, download nothing
 *   node scripts/fetch-emblems.mjs golani     # only slugs containing "golani"
 *
 * Needs internet access, no npm install (Node 18+ built-in fetch).
 *
 * The catalog looks for public/emblems/<slug>.png (see components/EmblemImage.tsx);
 * a missing file falls back to a generated SVG emblem, so a partial run is safe.
 *
 * LICENSING: every file here is from Wikimedia Commons under CC BY-SA or public
 * domain. CC BY-SA requires crediting the author and naming the licence wherever
 * the image is shown. This script writes public/emblems/CREDITS.md with the
 * per-file attribution it fetched — keep it, and surface it on the site
 * (the catalog links to it from the emblem tooltip).
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "emblems");
const DATA = path.join(ROOT, "scripts", "emblems.json");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Unit3D-emblem-fetcher/1.0 (https://unit3d.example.com; contact via site)";
const SIZE = 512;

const args = process.argv.slice(2);
const force = args.includes("--force");
const listOnly = args.includes("--list");
const filter = args.find((a) => !a.startsWith("--"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return await res.json();
      if (res.status === 429) await sleep(2000 * (attempt + 1));
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error("API request failed after 3 attempts");
}

/** Resolve a Commons file title to a PNG thumbnail URL + attribution. */
async function resolve(title) {
  const data = await api({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(SIZE),
  });
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (html) => (html ? String(html).replace(/<[^>]*>/g, "").trim() : "");
  return {
    // thumburl is a rendered PNG even for SVG sources
    url: info.thumburl || info.url,
    descUrl: info.descriptionurl,
    author: strip(meta.Artist?.value) || "unknown",
    license: strip(meta.LicenseShortName?.value) || "see file page",
  };
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`suspiciously small (${buf.length} bytes)`);
  await writeFile(dest, buf);
  return buf.length;
}

async function main() {
  const entries = JSON.parse(await readFile(DATA, "utf8")).filter((e) => e.file);
  const todo = filter ? entries.filter((e) => e.slug.includes(filter)) : entries;

  console.log(`\nUnit 3D — emblem fetcher`);
  console.log(`${todo.length} units with a candidate file (of ${entries.length} mapped)\n`);

  const STATUS = { verified: "אומת ", unverified: "לא נבדק" };
  if (listOnly) {
    for (const e of todo) {
      console.log(`  ${e.slug.padEnd(30)} ${(STATUS[e.status] || e.status).padEnd(8)} ${e.file}`);
    }
    const v = todo.filter((e) => e.status === "verified").length;
    console.log(`\n  ${v} verified by an independent check, ${todo.length - v} found but not double-checked.`);
    console.log(`  A wrong file name simply fails with MISSING and is skipped — nothing breaks.`);
    console.log(`\n(--list: nothing downloaded)\n`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const credits = [];
  let ok = 0, skipped = 0, failed = 0;

  for (const e of todo) {
    const dest = path.join(OUT_DIR, `${e.slug}.png`);
    if (!force && existsSync(dest)) {
      console.log(`  skip    ${e.slug} (already exists)`);
      skipped++;
      continue;
    }
    try {
      const info = await resolve(e.file);
      if (!info) {
        console.log(`  MISSING ${e.slug} — no such file on Commons: ${e.file}`);
        failed++;
        continue;
      }
      const bytes = await download(info.url, dest);
      const tag = e.status === "verified" ? "" : "  (לא אומת — כדאי לוודא ויזואלית)";
      console.log(`  ok      ${e.slug.padEnd(30)} ${(bytes / 1024).toFixed(0)}KB  ${info.license}${tag}`);
      credits.push({ slug: e.slug, name: e.name, file: e.file, ...info });
      ok++;
      await sleep(300); // be polite to the API
    } catch (err) {
      console.log(`  FAIL    ${e.slug} — ${err.message}`);
      failed++;
    }
  }

  if (credits.length) {
    const existing = existsSync(path.join(OUT_DIR, "CREDITS.md"))
      ? await readFile(path.join(OUT_DIR, "CREDITS.md"), "utf8")
      : "";
    const header = `# קרדיטים לסמלי יחידות\n\nהתמונות הורדו מ-Wikimedia Commons. רישיונות CC BY-SA מחייבים ייחוס ליוצר ואזכור הרישיון.\n\n| קובץ | יחידה | מקור | יוצר | רישיון |\n|---|---|---|---|---|\n`;
    const rows = credits
      .map((c) => `| ${c.slug}.png | ${c.name} | [${c.file}](${c.descUrl}) | ${c.author} | ${c.license} |`)
      .join("\n");
    await writeFile(path.join(OUT_DIR, "CREDITS.md"), existing.includes("| קובץ |") ? existing + "\n" + rows : header + rows + "\n");
    console.log(`\n  credits written to public/emblems/CREDITS.md`);
  }

  console.log(`\ndone: ${ok} downloaded, ${skipped} skipped, ${failed} failed`);
  if (ok) {
    console.log(`\nהסמלים נשמרו ב-public/emblems/. הפעל מחדש את השרת (npm run dev) ופתח /catalog.`);
    console.log(`סמלים שסומנו "לא אומת" — שווה מבט מהיר שהתמונה באמת של היחידה הנכונה.`);
  }
  if (failed) console.log(`\nכשלונות הם בדרך כלל שם קובץ שהשתנה בקומונס. חפש ידנית והחלף ב-scripts/emblems.json.`);
  console.log("");
}

main().catch((e) => {
  console.error("\nfatal:", e.message, "\n");
  process.exit(1);
});
