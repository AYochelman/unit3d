#!/usr/bin/env node
/**
 * Every product still titled in English gets a Hebrew name. Runs daily
 * (.github/workflows/translate-names.yml) and by hand: `npm run translate:names`.
 *
 * Models arrive from MakerWorld with their designer's title, and a newly
 * approved one used to sit on a Hebrew shelf in English until someone wrote a
 * name for it. This finds every product whose shown name has no Hebrew in it,
 * translates it, and writes lib/he-names.auto.generated.ts — the lowest layer
 * of heName(): a name in lib/he-names.ts or one typed in /admin → "שמות"
 * always wins, so a bad translation is fixed there and never comes back.
 *
 * Engine: Claude when ANTHROPIC_API_KEY is set (names in the shop's own style,
 * brands and model numbers kept as they are), otherwise Google Translate's
 * public endpoint — plainer, but it needs no key, so the run never does nothing.
 *
 *   --dry   print what would be translated, write nothing
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "he-names.auto.generated.ts");
const DRY = process.argv.includes("--dry");
const HEB = /[֐-׿]/;

const require = createRequire(import.meta.url);
const jiti = require("jiti")(path.join(ROOT, "scripts", "x.js"), { alias: { "@": ROOT } });
const { PRODUCTS } = jiti(path.join(ROOT, "lib", "products.ts"));
const { FIDGETS } = jiti(path.join(ROOT, "lib", "data.ts"));
const { HE_NAMES } = jiti(path.join(ROOT, "lib", "he-names.ts"));
const { HE_NAMES_AUTO } = jiti(path.join(ROOT, "lib", "he-names.auto.generated.ts"));

// What a shopper sees right now; an English one is either new or untranslated.
const seen = new Map();
for (const p of [...PRODUCTS, ...FIDGETS]) if (!seen.has(p.id)) seen.set(p.id, p);
const todo = [...seen.values()].filter((p) => !HEB.test(p.name)).map((p) => ({ id: p.id, en: p.name.trim() }));

// A manual run with TEST_TITLE translates that one title and writes nothing —
// proof the engine answers, on a day when every name is already Hebrew.
if (process.env.TEST_TITLE) {
  todo.length = 0;
  todo.push({ id: "test", en: process.env.TEST_TITLE });
}

console.log(`${seen.size} products · ${todo.length} still in English`);
if (!todo.length) process.exit(0);
if (DRY) { for (const t of todo) console.log(`  ${t.id} | ${t.en}`); process.exit(0); }

const clean = (s) => String(s ?? "").replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").slice(0, 70);

async function withClaude(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const examples = Object.entries(HE_NAMES).slice(-40).map(([, he]) => he).join("\n");
  const prompt = `You name products for an Israeli 3D-printing shop. Translate each English (or other-language) model title into a short, natural Hebrew product name a shopper would understand.

Rules:
- Hebrew, at most ~45 characters. Drop filler like "print in place", "3D model", "remix", "STL", version numbers, emojis.
- Keep brand names, product models and franchise names in their usual form (PS5, iPhone 16, AirPods, Lego, Bambu; famous characters in common Hebrew spelling, e.g. פיקאצ'ו, באטמן).
- If useful, add a short detail after " · " like the existing names.
- Never invent a feature that is not in the title.

Existing names in the shop, for style:
${examples}

Answer ONLY with JSON: {"<id>": "<hebrew name>", ...}

Titles:
${items.map((t) => `${t.id}: ${t.en}`).join("\n")}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) { console.log(`::warning::Claude ${res.status} ${(await res.text()).slice(0, 200)} — falling back to Google`); return null; }
  const text = (await res.json()).content?.map((c) => c.text ?? "").join("") ?? "";
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try { return JSON.parse(json); } catch { console.log("::warning::Claude answer was not JSON — falling back to Google"); return null; }
}

async function withGoogle(en) {
  const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=iw&dt=t&q=${encodeURIComponent(en)}`;
  const res = await fetch(u);
  if (!res.ok) throw new Error(`google ${res.status}`);
  const j = await res.json();
  return (j?.[0] ?? []).map((x) => x?.[0] ?? "").join("");
}

const got = {};
for (let i = 0; i < todo.length; i += 40) {
  const batch = todo.slice(i, i + 40);
  const ai = await withClaude(batch);
  for (const t of batch) {
    let he = clean(ai?.[t.id]);
    if (!HEB.test(he)) {
      try { he = clean(await withGoogle(t.en)); } catch (e) { console.log(`  ${t.id}: ${e.message}`); continue; }
    }
    if (HEB.test(he)) got[t.id] = he;
  }
  console.log(`::notice::engine: ${ai ? "Claude" : "Google Translate"}`);
}

if (process.env.TEST_TITLE) {
  console.log(`::notice::test: ${process.env.TEST_TITLE} → ${got.test ?? "(no translation)"}`);
  process.exit(0);
}

const merged = { ...HE_NAMES_AUTO, ...got };
for (const [id, he] of Object.entries(got)) console.log(`::notice::${id} | ${seen.get(id)?.name} → ${he}`);
const body = Object.keys(merged).sort().map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(merged[id])},`).join("\n");
const head = fs.readFileSync(OUT, "utf8").split("export const")[0];
fs.writeFileSync(OUT, `${head}export const HE_NAMES_AUTO: Record<string, string> = {\n${body}${body ? "\n" : ""}};\n`);
console.log(`::notice::translated ${Object.keys(got).length} of ${todo.length} product names`);
