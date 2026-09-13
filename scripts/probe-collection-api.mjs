#!/usr/bin/env node
/**
 * Which MakerWorld API answers for a collection's contents.
 *
 * The browser path is dead: Cloudflare challenges every collection PAGE, eight
 * out of eight, even signed in. But the API is a different door — the weekly
 * candidate sweep has been reading
 * `makerworld.com/api/v1/search-service/select/design2` from a plain runner for
 * months without a browser and without a challenge. So the pages are blocked,
 * not the API.
 *
 * This asks, out loud, which path holds the collections. It writes nothing and
 * changes nothing; it prints a line per candidate so the job log says what the
 * site actually answers. Run it on a runner — from a datacenter that MakerWorld
 * has never seen it may answer differently, which is itself worth knowing.
 */
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";
const COOKIE = process.env.MAKERWORLD_COOKIE || "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36";

// Known from an earlier read of the profile page.
const KNOWN = [
  ["28743692", "flexi"],
  ["29900505", "fidget"],
];

const headers = {
  "user-agent": UA,
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  referer: `https://makerworld.com/en/@${PROFILE}/collections`,
  ...(COOKIE ? { cookie: COOKIE } : {}),
};

async function probe(label, url) {
  try {
    const res = await fetch(url, { headers, redirect: "follow" });
    const text = await res.text();
    const ct = res.headers.get("content-type") || "";
    const ids = [...text.matchAll(/"(?:designId|id)"\s*:\s*(\d{3,})/g)].map((m) => m[1]);
    const uniq = [...new Set(ids)];
    const verdict =
      res.status !== 200 ? `HTTP ${res.status}`
      : /challenge|cf-|just a moment/i.test(text.slice(0, 400)) ? "Cloudflare"
      : uniq.length ? `${uniq.length} ids`
      : text.trim() === "{}" ? "empty {}"
      : `${text.length}B, no ids`;
    console.log(`  ${verdict.padEnd(16)} ${label}`);
    if (uniq.length) {
      console.log(`      ${url}`);
      console.log(`      first ids: ${uniq.slice(0, 8).join(", ")}`);
    } else if (res.status === 200 && !/^\{\}\s*$/.test(text) && ct.includes("json")) {
      console.log(`      ${url}`);
      console.log(`      body: ${text.slice(0, 220).replace(/\s+/g, " ")}`);
    }
    return uniq;
  } catch (e) {
    console.log(`  ${String(e.message).slice(0, 16).padEnd(16)} ${label}`);
    return [];
  }
}

const M = "https://makerworld.com/api/v1";
const B = "https://api.bambulab.com/v1";

console.log(`\n== the user's collections ==  (cookie: ${COOKIE ? "yes" : "no"})`);
for (const [label, url] of [
  ["design-service/collection/list", `${M}/design-service/collection/list?handle=${PROFILE}&limit=50&offset=0`],
  ["design-service/my/collection", `${M}/design-service/my/collection?limit=50&offset=0`],
  ["user-service/my/collection", `${M}/user-service/my/collection?limit=50&offset=0`],
  ["design-service/collection?handle", `${M}/design-service/collection?handle=${PROFILE}&limit=50&offset=0`],
  ["user-service/user/collections", `${M}/user-service/user/${PROFILE}/collections?limit=50&offset=0`],
  ["bambu design-service/collection", `${B}/design-service/collection?limit=50&offset=0`],
]) await probe(label, url);

console.log("\n== designs inside a known collection ==");
for (const [id, slug] of KNOWN) {
  console.log(`  -- ${slug} (${id})`);
  for (const [label, url] of [
    ["collection/{id}/design", `${M}/design-service/collection/${id}/design?limit=100&offset=0`],
    ["collection/{id}/designs", `${M}/design-service/collection/${id}/designs?limit=100&offset=0`],
    ["collection/{id}", `${M}/design-service/collection/${id}`],
    ["collection/{id}/list", `${M}/design-service/collection/${id}/list?limit=100&offset=0`],
    ["search-service by collection", `${M}/search-service/select/design2?collectionId=${id}&limit=100&offset=0`],
    ["bambu collection/{id}/design", `${B}/design-service/collection/${id}/design?limit=100&offset=0`],
  ]) await probe(label, url);
}

console.log("\n== control: a path that is known to work ==");
await probe("search-service/select/design2", `${M}/search-service/select/design2?orderBy=trending&designType=0&keyword=&limit=5&offset=0`);
console.log("");
