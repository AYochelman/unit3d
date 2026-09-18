#!/usr/bin/env node
/**
 * Put the collector script inside the page that hands it to the owner.
 *
 *   npm run embed:collector
 *
 * collect-models.html exists so he never has to open a .js file — double
 * clicking one makes Windows run it through Windows Script Host, which is not
 * a browser and says only "Syntax error, line 30". The page holds a copy of
 * the script and a button that copies it to the clipboard.
 *
 * A copy drifts. This regenerates it from scripts/collect-collections-in-browser.js,
 * so the button always hands out the script that is actually in the repository.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c } from "./lib/makerworld.mjs";

const SRC = path.join(ROOT, "scripts", "collect-collections-in-browser.js");
const PAGE = path.join(ROOT, "collect-models.html");
// The whole assignment, including a JS string with escapes in it.
const LINE = /const SNIPPET = (?:"(?:\\.|[^"\\])*");/;

const js = fs.readFileSync(SRC, "utf8");
const html = fs.readFileSync(PAGE, "utf8");
if (!LINE.test(html)) {
  console.error(c.r("\n  לא מצאתי את שורת SNIPPET ב-collect-models.html\n"));
  process.exit(1);
}
const next = html.replace(LINE, `const SNIPPET = ${JSON.stringify(js)};`);
if (next === html) {
  console.log(c.d("\n  הדף כבר מעודכן.\n"));
} else {
  fs.writeFileSync(PAGE, next, "utf8");
  console.log(c.g(`\n  collect-models.html עודכן מהמקור (${js.length} תווים)\n`));
}
