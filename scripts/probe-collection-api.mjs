#!/usr/bin/env node
/**
 * Is there an API door to his LIKES, now that we know one exists for search.
 *
 * Settled by three earlier rounds, so nobody pays for it twice:
 *   · every collection PAGE answers 403 to a runner — Cloudflare blocks the
 *     address, headless browser or not, cookie or not.
 *   · guessed collection endpoints answer 404; MakerWorld has no such API.
 *   · `collectionId`, `collection` and `filter=collection` on the search
 *     service are IGNORED — they answer 200 with the trending list.
 *   · a public text-extraction reader is blocked too.
 *   · `design-service/design/{id}` answers from anywhere, which is why
 *     importing by id works when nothing else does.
 *
 * What that leaves: the search service IS reachable without a browser. So this
 * round asks whether it, or a user endpoint beside it, will name the models he
 * LIKED or SAVED — first by finding his numeric user id from his handle, then
 * by trying the paths that would hang off it.
 *
 * Every answer is compared against the trending list first. A probe that
 * cannot tell a real answer from a polite one is worse than no probe.
 */
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";
const COOKIE = process.env.MAKERWORLD_COOKIE || "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36";
const M = "https://makerworld.com/api/v1";

const headers = () => ({
  "user-agent": UA,
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  referer: `https://makerworld.com/en/@${PROFILE}`,
  ...(COOKIE ? { cookie: COOKIE } : {}),
});

let TRENDING = new Set();
const idsOf = (t) => [...new Set([...t.matchAll(/"(?:designId|id)"\s*:\s*(\d{3,})/g)].map((m) => m[1]))];

async function probe(label, url) {
  try {
    const res = await fetch(url, { headers: headers() });
    const text = await res.text();
    const ids = idsOf(text);
    const polite = ids.length > 3 && ids.slice(0, 5).every((i) => TRENDING.has(i));
    const verdict =
      res.status !== 200 ? `HTTP ${res.status}`
      : /just a moment|cf-chl|challenge-platform/i.test(text) ? "Cloudflare"
      : polite ? "IGNORED (trending)"
      : ids.length ? `${ids.length} ids`
      : /^\s*\{\s*\}\s*$/.test(text) ? "empty {}"
      : `${text.length}B no ids`;
    console.log(`  ${verdict.padEnd(20)} ${label}`);
    if (ids.length && !polite) {
      console.log(`      ${url}`);
      console.log(`      ${ids.slice(0, 12).join(" ")}`);
    } else if (res.status === 200 && text.length < 400 && !polite) {
      console.log(`      body: ${text.slice(0, 200).replace(/\s+/g, " ")}`);
    }
    return { ids, polite, text, status: res.status };
  } catch (e) {
    console.log(`  ${("ERR " + e.message).slice(0, 20).padEnd(20)} ${label}`);
    return { ids: [], polite: false, text: "", status: 0 };
  }
}

console.log(`\n== trending, as the control ==  (cookie: ${COOKIE ? "yes" : "no"})`);
{
  const r = await fetch(`${M}/search-service/select/design2?orderBy=trending&designType=0&keyword=&limit=100&offset=0`, { headers: headers() });
  TRENDING = new Set(idsOf(await r.text()));
  console.log(`  ${TRENDING.size} trending ids`);
}

console.log(`\n== his numeric user id ==`);
let uid = "";
for (const [label, url] of [
  ["user-service/my/profile", `${M}/user-service/my/profile`],
  ["user-service/user by handle", `${M}/user-service/user/${PROFILE}`],
  ["search-service users", `${M}/search-service/select/user?keyword=${PROFILE}&limit=5&offset=0`],
]) {
  const r = await probe(label, url);
  const m = r.text.match(/"uid"\s*:\s*(\d+)/) || r.text.match(/"userId"\s*:\s*(\d+)/);
  if (m && !uid) { uid = m[1]; console.log(`      -> uid ${uid}`); }
}

console.log(`\n== likes ==`);
const who = uid || PROFILE;
for (const [label, url] of [
  ["my/like", `${M}/design-service/my/like?limit=50&offset=0`],
  ["my/liked", `${M}/design-service/my/liked?limit=50&offset=0`],
  ["user/{uid}/like", `${M}/design-service/user/${who}/like?limit=50&offset=0`],
  ["user-service/my/like", `${M}/user-service/my/like?limit=50&offset=0`],
  ["design/like/list", `${M}/design-service/like/list?limit=50&offset=0`],
  ["search userId", `${M}/search-service/select/design2?userId=${who}&limit=50&offset=0`],
  ["search handle", `${M}/search-service/select/design2?handle=${PROFILE}&limit=50&offset=0`],
]) await probe(label, url);

console.log(`\n== collections, keyed by uid this time ==`);
for (const [label, url] of [
  ["my/collection", `${M}/design-service/my/collection?limit=50&offset=0`],
  ["user/{uid}/collection", `${M}/design-service/user/${who}/collection?limit=50&offset=0`],
  ["user-service/{uid}/collection", `${M}/user-service/user/${who}/collection?limit=50&offset=0`],
  ["collection/28743692/design", `${M}/design-service/collection/28743692/design?limit=50&offset=0`],
]) await probe(label, url);
console.log("");
