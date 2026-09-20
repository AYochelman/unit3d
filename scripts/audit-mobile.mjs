#!/usr/bin/env node
/**
 * Measure the built site at phone and desktop widths.
 *
 *   STATIC_EXPORT=1 npm run build
 *   npx http-server out -p 8099          (or any static server)
 *   npm run audit:mobile
 *
 * Three questions, and all three were guessed at before this existed:
 *
 *   1. Does the page scroll sideways? Anything wider than the viewport is
 *      named, so the fix goes to the element rather than to `overflow-x`.
 *   2. How tall is the page? A phone homepage measured in screens is the
 *      number that decides whether anyone reaches the bottom of it.
 *   3. What is too small to tap? WCAG 2.5.8 asks for 24x24 CSS pixels; this
 *      lists everything under it, with its label, so the report is a to-do
 *      list and not a count.
 *
 * Desktop widths are measured in the same run and for the same reason: a
 * mobile change is only finished when the desktop numbers have not moved.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.AUDIT_URL || "http://localhost:8099";
const PATHS = (process.env.AUDIT_PATHS || "/,/trendy/,/fidgets/").split(",");
const PHONES = [320, 360, 375, 390, 414, 430];
const DESKTOPS = [1024, 1280, 1440, 1920];
/** WCAG 2.5.8 Target Size (Minimum), level AA. */
const MIN_TARGET = 24;

const measure = async (page, w) => {
  await page.setViewportSize({ width: w, height: w < 500 ? 780 : 900 });
  await page.waitForTimeout(350);
  return page.evaluate((min) => {
    const vw = document.documentElement.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      // Skip anything inside a container that clips on purpose — a marquee is
      // wider than the screen by design and never reaches the page scrollbar.
      if (b.width <= vw + 1 || b.height === 0) continue;
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") { clipped = true; break; }
      }
      if (!clipped) wide.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} = ${Math.round(b.width)}px`);
    }
    const small = [];
    for (const el of document.querySelectorAll("a,button,input,select,textarea,[role=button]")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.width < min || b.height < min) {
        small.push(`${Math.round(b.width)}x${Math.round(b.height)} · ${(el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 26)}`);
      }
    }
    return {
      scrollW: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > vw + 1,
      pageH: document.documentElement.scrollHeight,
      wide: wide.slice(0, 8),
      small,
    };
  }, MIN_TARGET);
};

/**
 * The Chromium on this machine, whichever one it is.
 *
 * Playwright looks for the exact build its own version pins, and a machine
 * that has a different one installed gets "Executable doesn't exist" with a
 * working browser sitting right there. PLAYWRIGHT_CHROMIUM names it; failing
 * that, the newest build under PLAYWRIGHT_BROWSERS_PATH.
 */
function chromePath() {
  const set = (process.env.PLAYWRIGHT_CHROMIUM || "").trim();
  if (set) return set;
  const root = (process.env.PLAYWRIGHT_BROWSERS_PATH || "").trim();
  if (!root || !fs.existsSync(root)) return undefined;
  const builds = fs.readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const b of builds) {
    const exe = path.join(root, b, "chrome-linux", "chrome");
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const run = async () => {
  const exe = chromePath();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  let bad = 0;

  for (const path of PATHS) {
    await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
    console.log(`\n\u001b[1m${path}\u001b[0m`);
    console.log("  width   height   screens  overflow  targets<24px");
    for (const w of [...PHONES, ...DESKTOPS]) {
      const r = await measure(page, w);
      const screens = (r.pageH / (w < 500 ? 780 : 900)).toFixed(1);
      const flag = r.overflow || r.small.length ? "\u001b[33m" : "\u001b[32m";
      console.log(
        `${flag}  ${String(w).padStart(5)}${String(r.pageH).padStart(9)}${String(screens).padStart(9)}` +
        `${(r.overflow ? "  YES" : "   no").padStart(10)}${String(r.small.length).padStart(14)}\u001b[0m`,
      );
      if (r.overflow) { bad++; r.wide.forEach((x) => console.log(`         \u001b[31m→ ${x}\u001b[0m`)); }
      if (w === 390 && r.small.length) r.small.slice(0, 12).forEach((x) => console.log(`         \u001b[90m· ${x}\u001b[0m`));
    }
  }

  await browser.close();
  // Sideways scroll is a fault; a small target is a finding to read.
  process.exitCode = bad ? 1 : 0;
};

run();
