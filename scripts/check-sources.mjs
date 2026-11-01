#!/usr/bin/env node
/**
 * Which models on the shelf no longer exist on MakerWorld.
 *
 * A designer can take a model down; the shop keeps its own photos and figures,
 * so the product page goes on looking fine while "לדף המקור" leads to a 404 —
 * and the license it is sold under came from a page that is gone. This only
 * reports: whether such a model stays on sale is the owner's decision.
 *
 *   npm run check:sources              every live model
 *   npm run check:sources -- 1107929   just these
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, API, sleep, getJson, closeBrowser } from "./lib/makerworld.mjs";

const src = fs.readFileSync(path.join(ROOT, "lib", "imported.generated.ts"), "utf8");
const json = src.slice(src.indexOf("= [") + 2, src.lastIndexOf("];") + 1);
const models = JSON.parse(json).filter((m) => m.status === "live");
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
const todo = only.length ? models.filter((m) => only.includes(m.id.replace(/^mw-/, ""))) : models;

console.log(`${todo.length} models to check`);
const gone = [];
const silent = [];
for (const [i, m] of todo.entries()) {
  const id = m.id.replace(/^mw-/, "");
  let verdict = "";
  for (let t = 1; t <= 3 && !verdict; t++) {
    const res = await getJson(API(id)).catch(() => null);
    // A model taken down answers 200 with an empty record (id 0).
    if (res?.ok && res.body && Number(res.body.id) === 0) verdict = "gone";
    else if (res?.ok && res.body?.id) verdict = "ok";
    else if (res?.status === 404) verdict = "gone";
    else await sleep(1500 * t);
  }
  if (verdict === "gone") { gone.push(m); console.log(`  GONE ${m.id} | ${m.name}`); }
  if (!verdict) silent.push(m);
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${todo.length} · ${gone.length} gone`);
  await sleep(350 + Math.random() * 300);
}
await closeBrowser();

console.log(`\n${todo.length} checked · ${gone.length} no longer on MakerWorld · ${silent.length} did not answer`);
for (const m of gone) console.log(`::notice title=gone::${m.id} | ${m.name} | ${m.shelf}`);
if (silent.length) console.log(`::notice title=no answer::${silent.map((m) => m.id).join(", ")}`);
fs.writeFileSync(path.join(ROOT, "data", "gone-models.json"), JSON.stringify({
  checked: new Date().toISOString(),
  gone: gone.map((m) => ({ id: m.id, name: m.name, shelf: m.shelf })),
  noAnswer: silent.map((m) => m.id),
}, null, 2) + "\n");
