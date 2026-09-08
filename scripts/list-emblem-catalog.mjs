// Lists the emblem-looking files that live under a handful of IDF categories on
// Wikimedia Commons, so a human (or the next pass) can pick from a real
// inventory instead of guessing file names. Writes data/emblem-catalog.json.
// Runs on a GitHub Actions runner - the local dev proxy blocks commons.
import fs from "node:fs";
import path from "node:path";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "unit3d-emblems/1.0 (https://github.com/AYochelman/unit3d)";

const SEEDS = [
  "Category:Insignia of the Israel Defense Forces",
  "Category:Squadron insignia of the Israeli Air Force",
  "Category:Israeli Air Force squadrons",
  "Category:Israeli Air Force",
  "Category:Israeli Navy",
  "Category:Israeli Air Defense Command",
  "Category:Military units and formations of Israel",
  "Category:SVG military shoulder tags of Israel",
];

const MAX_CATEGORIES = 400;
const KEEP = /\.(svg|png|jpe?g|gif)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  throw new Error("gave up after 5 attempts");
}

async function members(category, type) {
  const out = [];
  let cont;
  do {
    const j = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmtype: type,
      cmlimit: "500",
      ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of j?.query?.categorymembers ?? []) out.push(m.title);
    cont = j?.continue?.cmcontinue;
    await sleep(400);
  } while (cont);
  return out;
}

const seenCat = new Set();
const files = new Set();
const queue = SEEDS.map((c) => [c, 0]);

while (queue.length && seenCat.size < MAX_CATEGORIES) {
  const [cat, depth] = queue.shift();
  if (seenCat.has(cat)) continue;
  seenCat.add(cat);
  try {
    for (const f of await members(cat, "file")) if (KEEP.test(f)) files.add(f);
    if (depth < 2) for (const c of await members(cat, "subcat")) queue.push([c, depth + 1]);
  } catch (err) {
    console.warn(`  ! ${cat}: ${err.message}`);
  }
  console.log(`${seenCat.size}/${seenCat.size + queue.length} ${cat} -> ${files.size} files`);
}

const out = {
  readAt: new Date().toISOString(),
  categories: [...seenCat].sort(),
  files: [...files].sort(),
};
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(path.join("data", "emblem-catalog.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\nכתבתי ${out.files.length} קבצים מתוך ${out.categories.length} קטגוריות`);
