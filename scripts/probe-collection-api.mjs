#!/usr/bin/env node
/**
 * Which MakerWorld path holds a collection's contents.
 *
 * The browser path is dead: Cloudflare challenges every collection PAGE, eight
 * out of eight, even signed in. The API is a different door — the candidate
 * sweep reads makerworld.com/api/v1/search-service from a plain runner without
 * a browser and without a challenge.
 *
 * Round one answered 404 to every guessed collection endpoint, and one guess
 * answered 200 with a hundred ids that were simply TRENDING: passing
 * `collectionId` to the search service does not filter, it is ignored. So this
 * round fingerprints the trending list first and calls any response that
 * matches it what it is. A probe that cannot tell a real answer from a polite
 * one is worse than no probe.
 *
 * Writes nothing. Prints what the site actually answers.
 */
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";
const COOKIE = process.env.MAKERWORLD_COOKIE || "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36";

const KNOWN = [["28743692", "flexi"], ["29900505", "fidget"]];

const headers = (extra = {}) => ({
  "user-agent": UA,
  accept: "application/json, text/html, */*",
  "accept-language": "en-US,en;q=0.9",
  referer: `https://makerworld.com/en/@${PROFILE}/collections`,
  ...(COOKIE ? { cookie: COOKIE } : {}),
  ...extra,
});

let TRENDING = new Set();

const idsOf = (text) => [...new Set([...text.matchAll(/"(?:designId|id)"\s*:\s*(\d{3,})/g)].map((m) => m[1]))];
const pageIds = (html) => [...new Set([...html.matchAll(/\/models\/(\d{3,})/g)].map((m) => m[1]))];

async function probe(label, url, { html = false } = {}) {
  try {
    const res = await fetch(url, { headers: headers(), redirect: "follow" });
    const text = await res.text();
    const ids = html ? pageIds(text) : idsOf(text);
    const sameAsTrending = ids.length > 3 && ids.slice(0, 5).every((i) => TRENDING.has(i));
    const verdict =
      res.status !== 200 ? `HTTP ${res.status}`
      : /just a moment|cf-chl|challenge-platform|enable javascript and cookies/i.test(text) ? "Cloudflare"
      : sameAsTrending ? `IGNORED param (trending)`
      : ids.length ? `${ids.length} ids`
      : /^\s*\{\s*\}\s*$/.test(text) ? "empty {}"
      : `${text.length}B, no ids`;
    console.log(`  ${verdict.padEnd(24)} ${label}`);
    if (ids.length && !sameAsTrending) {
      console.log(`      ${url}`);
      console.log(`      ids: ${ids.slice(0, 10).join(", ")}`);
    }
    return { ids, sameAsTrending, status: res.status, text };
  } catch (e) {
    console.log(`  ${("ERR " + e.message).slice(0, 24).padEnd(24)} ${label}`);
    return { ids: [], sameAsTrending: false, status: 0, text: "" };
  }
}

const M = "https://makerworld.com/api/v1";

console.log(`\n== fingerprinting trending, so a polite answer cannot pass as a real one ==`);
{
  const res = await fetch(`${M}/search-service/select/design2?orderBy=trending&designType=0&keyword=&limit=100&offset=0`, { headers: headers() });
  TRENDING = new Set(idsOf(await res.text()));
  console.log(`  trending ids: ${TRENDING.size}`);
}

console.log(`\n== the collection PAGE, fetched plainly (no browser) ==  (cookie: ${COOKIE ? "yes" : "no"})`);
for (const [id, slug] of KNOWN) {
  await probe(`page /en/collections/${id}-${slug}`, `https://makerworld.com/en/collections/${id}-${slug}`, { html: true });
}
await probe(`page /en/@${PROFILE}/collections`, `https://makerworld.com/en/@${PROFILE}/collections`, { html: true });

console.log(`\n== the Next.js data route (needs the build id) ==`);
{
  const res = await fetch("https://makerworld.com/en", { headers: headers() }).catch(() => null);
  const home = res ? await res.text() : "";
  const build = home.match(/"buildId"\s*:\s*"([^"]+)"/)?.[1];
  console.log(`  buildId: ${build || "not found (home page " + (res ? res.status : "unreachable") + ")"}`);
  if (build) {
    for (const [id, slug] of KNOWN) {
      await probe(`_next/data ${slug}`, `https://makerworld.com/_next/data/${build}/en/collections/${id}-${slug}.json`);
    }
  }
}

console.log(`\n== more API names ==`);
const [cid, cslug] = KNOWN[0];
for (const [label, url] of [
  ["v2 collection/{id}/design", `https://makerworld.com/api/v2/design-service/collection/${cid}/design?limit=100`],
  ["collection-service/{id}", `${M}/collection-service/collection/${cid}?limit=100`],
  ["collection-service/{id}/design", `${M}/collection-service/collection/${cid}/design?limit=100`],
  ["design-service/collection/{id}/item", `${M}/design-service/collection/${cid}/item?limit=100`],
  ["user-service/design/collection", `${M}/user-service/design/collection?collectionId=${cid}&limit=100`],
  ["search-service filter=collection", `${M}/search-service/select/design2?filter=collection:${cid}&limit=100&offset=0`],
  ["search-service collection=", `${M}/search-service/select/design2?collection=${cid}&limit=100&offset=0`],
  ["design-service/my/collect", `${M}/design-service/my/collect?limit=100&offset=0`],
  ["design-service/design/{id} (control)", `${M}/design-service/design/3258291`],
]) await probe(label, url);

console.log("");
