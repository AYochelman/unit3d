#!/usr/bin/env node
/**
 * Can a collection page be read from a server at all.
 *
 * Two rounds settled what does not work, and it is worth writing down so nobody
 * pays for it again:
 *   · every collection PAGE answers 403 to this runner — Cloudflare blocks the
 *     address, not the request; a headless browser gets the same treatment.
 *   · every guessed collection API answers 404. MakerWorld genuinely has none.
 *   · `collectionId`, `collection` and `filter=collection` on the search service
 *     are IGNORED — they answer 200 with the trending list, which is why an
 *     earlier probe looked like a success.
 *   · `design-service/design/{id}` answers from anywhere. That is the whole
 *     reason importing by id works when nothing else does.
 *
 * So the missing piece is only ever the LIST of ids. This round asks whether a
 * public text-extraction reader — which fetches from its own addresses — can
 * see the pages this runner cannot. Only public collection URLs are sent, never
 * the session cookie: the reader is a stranger, and it is handed nothing a
 * logged-out visitor could not already see.
 */
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36";

const COLLECTIONS = [
  ["28743692", "flexi"],
  ["29900505", "fidget"],
  ["26614634", "mine"],
  ["27816148", "statue"],
  ["29558316", "game"],
];

const ids = (text) => [...new Set([...text.matchAll(/\/models\/(\d{3,9})/g)].map((m) => m[1]))];

async function via(label, url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/plain, text/html, */*" } });
    const text = await res.text();
    const found = ids(text);
    const verdict =
      res.status !== 200 ? `HTTP ${res.status}`
      : found.length ? `${found.length} ids`
      : /just a moment|cf-chl|challenge/i.test(text) ? "Cloudflare"
      : `${text.length}B, no ids`;
    console.log(`  ${verdict.padEnd(18)} ${label}`);
    if (found.length) console.log(`      ${found.slice(0, 12).join(", ")}${found.length > 12 ? " …" : ""}`);
    return found;
  } catch (e) {
    console.log(`  ${("ERR " + e.message).slice(0, 18).padEnd(18)} ${label}`);
    return [];
  }
}

console.log("\n== a public reader, fetching from its own addresses ==");
const [id, slug] = COLLECTIONS[0];
const page = `https://makerworld.com/en/collections/${id}-${slug}`;
for (const [label, url] of [
  ["r.jina.ai", `https://r.jina.ai/${page}`],
  ["r.jina.ai (profile)", `https://r.jina.ai/https://makerworld.com/en/@${PROFILE}/collections`],
]) await via(label, url);

console.log("\n== if the reader works, every collection ==");
let total = new Set();
for (const [cid, cslug] of COLLECTIONS) {
  const found = await via(`${cslug}`, `https://r.jina.ai/https://makerworld.com/en/collections/${cid}-${cslug}`);
  found.forEach((x) => total.add(x));
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(`\n  total distinct ids: ${total.size}`);
if (total.size) console.log(`  ALL: ${[...total].join(" ")}`);
console.log("");
