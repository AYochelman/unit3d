#!/usr/bin/env node
/**
 * Downloads IDF unit insignia from Wikimedia Commons into public/emblems/.
 *
 *   npm run emblems              # download everything missing
 *   npm run emblems -- --doctor  # diagnose only: Node, files, network
 *   npm run emblems -- --list    # print the plan, download nothing
 *   npm run emblems -- --force   # re-download files that already exist
 *   npm run emblems -- golani    # only slugs containing "golani"
 *
 * Needs internet access. No npm install (Node 18+ has fetch built in).
 *
 * The catalog looks for public/emblems/<slug>.png (see components/EmblemImage.tsx);
 * a missing file falls back to a generated SVG emblem, so a partial run is safe.
 *
 * LICENSING: every file is from Wikimedia Commons under CC BY-SA or public
 * domain. CC BY-SA requires crediting the author and naming the licence wherever
 * the image is shown, so this script writes public/emblems/CREDITS.md. Keep it.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "emblems");
const DATA = path.join(ROOT, "scripts", "emblems.json");
const HOST = "https://commons.wikimedia.org";
const API = `${HOST}/w/api.php`;
const UA = "Unit3D-emblem-fetcher/1.0 (https://unit3d.example.com)";
const SIZE = 512;
const TIMEOUT_MS = 20000;

const args = process.argv.slice(2);
const force = args.includes("--force");
const listOnly = args.includes("--list");
const doctorOnly = args.includes("--doctor");
const filter = args.find((a) => !a.startsWith("--"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(...a);

/** fetch with a timeout, so a blocked port fails in 20s instead of hanging. */
async function get(url, init = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────
function nodeMajor() {
  return Number(process.versions.node.split(".")[0]);
}

async function doctor() {
  say("\n── בדיקת סביבה ──\n");
  let fatal = false;

  const major = nodeMajor();
  if (major >= 18) {
    say(`  ✓ Node ${process.versions.node}`);
  } else {
    say(`  ✗ Node ${process.versions.node} — צריך 18 ומעלה (fetch מובנה).`);
    say(`      הורד גרסת LTS מ-https://nodejs.org והתקן, ואז נסה שוב.`);
    fatal = true;
  }

  if (existsSync(DATA)) {
    try {
      const n = JSON.parse(await readFile(DATA, "utf8")).filter((e) => e.file).length;
      say(`  ✓ קובץ הנתונים scripts/emblems.json (${n} סמלים למיפוי)`);
    } catch {
      say(`  ✗ scripts/emblems.json קיים אבל אינו JSON תקין.`);
      fatal = true;
    }
  } else {
    say(`  ✗ חסר scripts/emblems.json`);
    say(`      סימן שהתיקייה היא מגרסה ישנה של הפרויקט. פתח מחדש את ה-ZIP האחרון.`);
    fatal = true;
  }

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY;
  if (proxy) say(`  ! משתנה סביבה של פרוקסי מוגדר: ${proxy}`);

  // Reachability: the API first, then the plain file path (some networks block
  // /w/api.php but not the site itself).
  let apiOk = false;
  let fileOk = false;
  try {
    const r = await get(`${API}?action=query&format=json&meta=siteinfo`);
    apiOk = r.ok;
    say(apiOk ? `  ✓ ה-API של ויקימדיה נגיש` : `  ✗ ה-API של ויקימדיה החזיר ${r.status}`);
  } catch (e) {
    say(`  ✗ אין גישה ל-API של ויקימדיה (${e.name === "AbortError" ? "timeout" : e.message})`);
  }
  try {
    const r = await get(`${HOST}/wiki/Special:FilePath/Golani_tree_color.svg?width=64`, { redirect: "follow" });
    fileOk = r.ok;
    say(fileOk ? `  ✓ הורדת קבצים ישירה נגישה` : `  ✗ הורדה ישירה החזירה ${r.status}`);
  } catch (e) {
    say(`  ✗ אין גישה להורדת קבצים (${e.name === "AbortError" ? "timeout" : e.message})`);
  }

  if (!apiOk && !fileOk) {
    say(`\n  ✗ אין חיבור לוויקימדיה בכלל.`);
    say(`      אם אתה ברשת של מקום עבודה או מאחורי VPN/פיירוול, נסה מרשת אחרת`);
    say(`      (למשל hotspot מהטלפון). האתר commons.wikimedia.org צריך להיפתח בדפדפן.`);
    fatal = true;
  } else if (!apiOk && fileOk) {
    say(`\n  ! ה-API חסום אבל הורדה ישירה עובדת — הסקריפט יעבור אוטומטית למצב הזה`);
    say(`    (בלי שמות יוצרים בקובץ הקרדיטים; תצטרך להשלים אותם ידנית).`);
  }

  say(fatal ? `\n  יש בעיה שצריך לפתור לפני ההורדה.\n` : `\n  הכל תקין. הרץ: npm run emblems\n`);
  return { fatal, apiOk, fileOk };
}

// ─── Resolving a file to a downloadable PNG ──────────────────────────────────
/** Via the API: gives the thumbnail URL plus author and licence. */
async function resolveViaApi(title) {
  const url = `${API}?${new URLSearchParams({
    format: "json",
    origin: "*",
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(SIZE),
  })}`;
  const res = await get(url);
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return null; // genuinely no such file
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (h) => (h ? String(h).replace(/<[^>]*>/g, "").trim() : "");
  return {
    url: info.thumburl || info.url, // thumburl is a rendered PNG even for SVG sources
    descUrl: info.descriptionurl,
    author: strip(meta.Artist?.value) || "unknown",
    license: strip(meta.LicenseShortName?.value) || "see file page",
  };
}

/** Fallback when the API is blocked: Special:FilePath redirects to the image. */
function resolveViaFilePath(title) {
  const name = title.replace(/^File:/, "").replace(/ /g, "_");
  return {
    url: `${HOST}/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${SIZE}`,
    descUrl: `${HOST}/wiki/${encodeURIComponent(`File:${name}`)}`,
    author: "ראה עמוד הקובץ",
    license: "ראה עמוד הקובץ",
  };
}

async function download(url, dest) {
  const res = await get(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`הקובץ שהתקבל קטן מדי (${buf.length} bytes)`);
  await writeFile(dest, buf);
  return buf.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  say(`\nUnit 3D — הורדת סמלי יחידות`);

  if (doctorOnly) {
    await doctor();
    return;
  }

  if (!existsSync(DATA)) {
    say(`\n  ✗ חסר scripts/emblems.json — כנראה תיקייה מגרסה ישנה.\n`);
    await doctor();
    process.exitCode = 1;
    return;
  }

  const entries = JSON.parse(await readFile(DATA, "utf8")).filter((e) => e.file);
  const todo = filter ? entries.filter((e) => e.slug.includes(filter)) : entries;
  const STATUS = { verified: "אומת", unverified: "לא נבדק" };

  say(`${todo.length} סמלים למיפוי${filter ? ` (סינון: ${filter})` : ""}\n`);

  if (listOnly) {
    for (const e of todo) say(`  ${e.slug.padEnd(30)} ${(STATUS[e.status] || e.status).padEnd(9)} ${e.file}`);
    const v = todo.filter((e) => e.status === "verified").length;
    say(`\n  ${v} אומתו בבדיקה עצמאית, ${todo.length - v} נמצאו ולא נבדקו שנית.`);
    say(`  שם קובץ שגוי פשוט מדולג — שום דבר לא נשבר.\n`);
    return;
  }

  if (nodeMajor() < 18) {
    await doctor();
    process.exitCode = 1;
    return;
  }

  // Probe once so the whole run picks a working strategy instead of failing 41 times.
  let useApi = true;
  try {
    const r = await get(`${API}?action=query&format=json&meta=siteinfo`);
    useApi = r.ok;
  } catch {
    useApi = false;
  }
  if (!useApi) {
    say(`  ! ה-API של ויקימדיה אינו נגיש — עובר להורדה ישירה.\n`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const credits = [];
  let ok = 0, skipped = 0, failed = 0, streak = 0;

  for (const e of todo) {
    const dest = path.join(OUT_DIR, `${e.slug}.png`);
    if (!force && existsSync(dest)) {
      say(`  קיים    ${e.slug}`);
      skipped++;
      continue;
    }
    try {
      const info = useApi ? await resolveViaApi(e.file) : resolveViaFilePath(e.file);
      if (!info) {
        say(`  לא נמצא ${e.slug.padEnd(28)} אין קובץ כזה בקומונס: ${e.file}`);
        failed++;
        continue;
      }
      const bytes = await download(info.url, dest);
      streak = 0;
      const tag = e.status === "verified" ? "" : "  (לא אומת - שווה מבט)";
      say(`  הורד   ${e.slug.padEnd(28)} ${(bytes / 1024).toFixed(0)}KB  ${info.license}${tag}`);
      credits.push({ slug: e.slug, name: e.name, file: e.file, ...info });
      ok++;
      await sleep(300); // be polite to the API
    } catch (err) {
      say(`  נכשל   ${e.slug.padEnd(28)} ${err.message}`);
      failed++;
      streak++;
      // Three failures in a row is an environment problem, not 41 bad file
      // names — stop and diagnose instead of grinding through the whole list.
      if (streak >= 3) {
        say(`\n  ✗ שלוש כשלונות ברצף — עוצר כדי לא להמשיך לריק.\n`);
        await doctor();
        break;
      }
    }
  }

  if (credits.length) {
    const file = path.join(OUT_DIR, "CREDITS.md");
    const existing = existsSync(file) ? await readFile(file, "utf8") : "";
    const header =
      `# קרדיטים לסמלי יחידות\n\nהתמונות הורדו מ-Wikimedia Commons. רישיונות CC BY-SA מחייבים ייחוס ליוצר ואזכור הרישיון.\n\n` +
      `| קובץ | יחידה | מקור | יוצר | רישיון |\n|---|---|---|---|---|\n`;
    const rows = credits
      .map((c) => `| ${c.slug}.png | ${c.name} | [${c.file}](${c.descUrl}) | ${c.author} | ${c.license} |`)
      .join("\n");
    await writeFile(file, existing.includes("| קובץ |") ? `${existing}\n${rows}` : header + rows + "\n");
    say(`\n  קרדיטים נכתבו ל-public/emblems/CREDITS.md`);
  }

  say(`\nסיכום: ${ok} הורדו, ${skipped} כבר היו, ${failed} נכשלו`);
  if (ok) {
    say(`\nהסמלים נשמרו ב-public/emblems/. הפעל מחדש את השרת (npm run dev) ופתח /catalog.`);
    say(`סמלים שסומנו "לא אומת" — שווה מבט מהיר שהתמונה של היחידה הנכונה.`);
  }
  if (failed && streak < 3) {
    say(`\nכשלונות בודדים = שם קובץ שהשתנה בקומונס. חפש ידנית והחלף ב-scripts/emblems.json.`);
  }
  if (!ok && !skipped) {
    say(`\nלא ירד כלום. הרץ לאבחון:  npm run emblems -- --doctor`);
  }
  say("");
}

main().catch(async (e) => {
  console.error(`\nשגיאה: ${e.message}`);
  console.error(`לאבחון:  npm run emblems -- --doctor\n`);
  process.exit(1);
});
