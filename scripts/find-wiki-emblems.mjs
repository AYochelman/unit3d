#!/usr/bin/env node
/**
 * Second source for unit insignia: the Wikipedias themselves.
 *
 *   npm run emblems:wiki
 *
 * Commons ran dry for ~80 units (the paratroopers' battalions among them), but
 * Hebrew Wikipedia keeps many unit tags as LOCAL files on the article —
 * uploaded there, not to Commons — so the Commons inventory never saw them.
 * For every unit still showing its brigade's emblem this searches he.wikipedia
 * (then en.wikipedia), opens the best article, and collects the images on it
 * that look like a tag/symbol/logo, plus the article's lead image.
 *
 * It proposes; a person decides. Each candidate is downloaded as a thumbnail
 * to data/emblem-review/<slug>__<n>.png with its title, page and licence in
 * data/wiki-emblem-candidates.json. Nothing is wired into the shop here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "wiki-emblem-candidates.json");
const DIR = path.join(ROOT, "data", "emblem-review");
const UA = "unit3d-emblem-finder/1.1 (https://github.com/AYochelman/unit3d)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Units still without their own file: the generated parent map lists every
// battalion that falls back, and the emblems folder says which have one now.
const have = new Set(fs.readdirSync(path.join(ROOT, "public", "emblems")).map((f) => f.replace(/\.[^.]+$/, "")));
const parents = fs.readFileSync(path.join(ROOT, "lib", "emblemParent.generated.ts"), "utf8");
const todo = [...parents.matchAll(/"([^"]+)": "([^"]+)"/g)].map((m) => m[1]).filter((s) => !have.has(s));

// Names, numbers and nicknames from the hierarchy source (read as text: it is TS).
const tree = fs.readFileSync(path.join(ROOT, "lib", "units-hierarchy.ts"), "utf8");
function unit(slug) {
  const i = tree.indexOf(`slug: "${slug}"`);
  const block = tree.slice(i, tree.indexOf("}", i));
  const get = (k) => block.match(new RegExp(`${k}: "([^"]*)"`))?.[1];
  // The brigade it sits in, from the parent map ("brigade-<slug>").
  const ps = parents.match(new RegExp(`"${slug}": "brigade-([^"]+)"`))?.[1];
  const j = ps ? tree.indexOf(`slug: "${ps}"`) : -1;
  const brig = j >= 0 ? tree.slice(j, j + 300).match(/name: "([^"]*)"/)?.[1] : undefined;
  return { slug, name: get("name") ?? slug, number: get("number"), nickname: get("nickname"), brigade: brig };
}

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) return null;
    } catch {}
    await sleep(1500 * (a + 1));
  }
  return null;
}

const LOOKS_LIKE_TAG = /(תג|סמל|לוגו|סמליל|tag|symbol|emblem|insignia|logo|badge|patch|semel|סמ"ל)/i;
const NOT_A_TAG = /(flag of israel|commons-logo|wiki|edit-|question_book|ambox|padlock|\.ogg|map|מפה)/i;

async function candidatesFor(u) {
  const queries = [
    [u.name, u.nickname].filter(Boolean).join(" "),
    u.nickname ? `גדוד ${u.nickname}` : null,
    u.number && u.brigade ? `${u.name} ${u.brigade}` : null,
  ].filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const host of ["he.wikipedia.org", "en.wikipedia.org"]) {
    for (const q of host.startsWith("en") ? [`IDF ${u.number ?? ""} ${u.slug.split("-").slice(-1)[0]}`] : queries) {
      const s = await api(host, { action: "query", list: "search", srsearch: q, srlimit: "3" });
      await sleep(400);
      for (const hit of s?.query?.search ?? []) {
        if (seen.has(host + hit.title)) continue;
        seen.add(host + hit.title);
        const p = await api(host, { action: "query", titles: hit.title, prop: "pageimages|images", piprop: "name", imlimit: "50" });
        await sleep(400);
        const page = p?.query?.pages?.[0];
        if (!page) continue;
        const files = new Set();
        if (page.pageimage) files.add(`File:${page.pageimage}`);
        for (const im of page.images ?? []) if (LOOKS_LIKE_TAG.test(im.title) && !NOT_A_TAG.test(im.title)) files.add(im.title);
        for (const f of files) {
          if (out.some((c) => c.file === f)) continue;
          const info = await api(host, {
            action: "query", titles: f, prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "400",
          });
          await sleep(400);
          const ii = info?.query?.pages?.[0]?.imageinfo?.[0];
          if (!ii) continue;
          const meta = ii.extmetadata ?? {};
          out.push({
            file: f, page: `https://${host}/wiki/${encodeURIComponent(page.title)}`, pageTitle: page.title,
            lead: page.pageimage ? f === `File:${page.pageimage}` : false,
            thumb: ii.thumburl || ii.url, url: ii.url, width: ii.width, height: ii.height,
            license: meta.LicenseShortName?.value ?? "", nonFree: /fair|הוגן|non-free/i.test(JSON.stringify(meta)),
          });
        }
      }
      if (out.length >= 4) break;
    }
    if (out.length >= 2) break;
  }
  return out.slice(0, 5);
}

fs.mkdirSync(DIR, { recursive: true });
const result = [];
for (const slug of todo) {
  const u = unit(slug);
  const cands = await candidatesFor(u);
  for (const [i, c] of cands.entries()) {
    try {
      const r = await fetch(c.thumb, { headers: { "User-Agent": UA } });
      if (r.ok) {
        const name = `${slug}__${i}${path.extname(new URL(c.thumb).pathname).toLowerCase() || ".png"}`;
        fs.writeFileSync(path.join(DIR, name), Buffer.from(await r.arrayBuffer()));
        c.review = `data/emblem-review/${name}`;
      }
    } catch {}
    await sleep(300);
  }
  result.push({ ...u, candidates: cands });
  console.log(`${cands.length ? "✓" : "·"} ${slug.padEnd(32)} ${cands.map((c) => c.file).join(" | ")}`);
}
fs.writeFileSync(OUT, JSON.stringify({ searchedAt: new Date().toISOString(), units: result }, null, 2) + "\n");
console.log(`\n${result.filter((r) => r.candidates.length).length} of ${result.length} units have at least one candidate.`);
