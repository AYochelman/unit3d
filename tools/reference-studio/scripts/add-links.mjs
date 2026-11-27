#!/usr/bin/env node
/**
 * Bulk-adds website links to a running studio, then captures them one by one.
 *
 * The UI adds links a handful at a time because each capture opens a real
 * browser; this does the same work unattended for a long list.
 *
 *   node tools/reference-studio/scripts/add-links.mjs links.txt
 *   node tools/reference-studio/scripts/add-links.mjs links.txt --collection "Dribbble"
 *   node tools/reference-studio/scripts/add-links.mjs links.txt --no-capture
 *
 * The studio must already be running (npm run studio).
 */

import { readFileSync } from "node:fs";

const ADD_BATCH = 20; // the API's own per-request ceiling

function parseArgs(argv) {
  const opts = {
    file: "", base: "http://localhost:3100", collection: "", capture: true, only: "",
    retryFailed: false, recapture: false, remove: false, adoptSites: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--retry-failed") opts.retryFailed = true;
    else if (a === "--adopt-sites") opts.adoptSites = true;
    else if (a === "--recapture") opts.recapture = true;
    else if (a === "--delete") opts.remove = true;
    else if (a === "--no-capture") opts.capture = false;
    else if (a === "--collection") opts.collection = argv[++i] ?? "";
    else if (a === "--port") opts.base = `http://localhost:${argv[++i] ?? "3100"}`;
    else if (a === "--base") opts.base = argv[++i] ?? opts.base;
    else if (a === "--only") opts.only = argv[++i] ?? "";
    else if (!a.startsWith("-") && !opts.file) opts.file = a;
  }
  return opts;
}

function readLinks(file, only) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    throw new Error(`Could not read ${file}: ${err.message}`);
  }
  const seen = new Set();
  const urls = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!/^https?:\/\//i.test(line)) continue;
    if (only && !line.includes(only)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    urls.push(line);
  }
  return urls;
}

async function api(base, path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* a non-JSON body is reported as-is below */
  }
  if (!res.ok) {
    const reason = body?.error ?? text.slice(0, 200) ?? `HTTP ${res.status}`;
    throw new Error(reason);
  }
  return body;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.file && !opts.retryFailed && !opts.recapture && !opts.remove && !opts.adoptSites) {
    console.error("Usage: node tools/reference-studio/scripts/add-links.mjs <file-of-urls> [--collection NAME] [--no-capture] [--only dribbble.com] [--port 3100]");
    console.error("       node tools/reference-studio/scripts/add-links.mjs --retry-failed [--only dribbble.com]");
    console.error("       node tools/reference-studio/scripts/add-links.mjs --recapture --only dribbble.com");
    console.error("       node tools/reference-studio/scripts/add-links.mjs --delete --only pin.it");
    console.error("       node tools/reference-studio/scripts/add-links.mjs --adopt-sites");
    process.exit(2);
  }
  // Deleting is the one action with nothing to undo it, so it never runs
  // across the whole library: --only has to name what is going.
  if (opts.remove && !opts.only) {
    console.error("--delete needs --only <text>, so it can never take the whole library at once.");
    process.exit(2);
  }

  // Fail early and clearly when the studio is not running, rather than
  // printing a bare ECONNREFUSED for every batch.
  try {
    await api(opts.base, "/api/health", { method: "GET" });
  } catch (err) {
    console.error(`The studio is not answering on ${opts.base} — start it with "npm run studio" first.`);
    console.error(`  (${err.message})`);
    process.exit(1);
  }

  // A gallery reference cannot say how a design was built - the artwork on it
  // has no CSS. But the page links to where the work actually lives, and the
  // capture records those hosts. Adding them turns a wall of pictures into
  // references that can be measured.
  if (opts.adoptSites) {
    const library = await api(opts.base, "/api/library", { method: "GET" });
    const refs = library?.references ?? [];
    const have = new Set(
      refs.map((r) => {
        try { return new URL(r.source?.url ?? "").hostname.replace(/^www\./, "").toLowerCase(); }
        catch { return ""; }
      }).filter(Boolean),
    );

    const found = new Map();
    let recorded = 0;   // how many outbound hosts the captures know about at all
    let alreadyHere = 0;
    for (const r of refs) {
      for (const site of r.source?.observed?.build?.relatedSites ?? []) {
        if (!site.host) continue;
        recorded += 1;
        if (have.has(site.host)) { alreadyHere += 1; continue; }
        if (opts.only && !site.host.includes(opts.only)) continue;
        const entry = found.get(site.host) ?? { host: site.host, seen: 0, from: [] };
        entry.seen += site.count || 1;
        if (entry.from.length < 3) entry.from.push(r.title || r.source?.url || r.id);
        found.set(site.host, entry);
      }
    }

    const candidates = [...found.values()].sort((a, b) => b.seen - a.seen);
    if (!candidates.length) {
      if (!recorded) {
        console.log("No outbound sites are recorded on any reference.");
        console.log("Only captures taken since this feature existed carry them — re-capture first:");
        console.log("  node tools/reference-studio/scripts/add-links.mjs --recapture");
      } else if (alreadyHere && !opts.only) {
        console.log(`Nothing new: all ${alreadyHere} linked site${alreadyHere === 1 ? " is" : "s are"} already in the library.`);
      } else {
        console.log(`No linked site matches "${opts.only}".`);
      }
      return;
    }

    console.log(`${candidates.length} site${candidates.length === 1 ? "" : "s"} linked from references in your library:\n`);
    for (const c of candidates) console.log(`  ${c.host}  — from ${c.from.join(", ")}`);

    const urls = candidates.map((c) => `https://${c.host}/`);
    console.log("");
    const added = [];
    const rejected = [];
    for (let i = 0; i < urls.length; i += ADD_BATCH) {
      const batch = urls.slice(i, i + ADD_BATCH);
      try {
        const body = await api(opts.base, "/api/references", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urls: batch, collection: opts.collection || undefined }),
        });
        added.push(...(body?.created ?? []));
        rejected.push(...(body?.rejected ?? []));
      } catch (err) {
        for (const url of batch) rejected.push({ url, reason: err.message });
      }
    }
    console.log(`Added ${added.length}, rejected ${rejected.length}.`);
    for (const r of rejected) console.log(`  rejected  ${r.url} — ${r.reason}`);
    if (opts.capture && added.length) {
      console.log("");
      await captureAll(opts, added);
    }
    return;
  }

  // Re-capturing what is already in the library, rather than adding it again:
  // a second run of the same file would otherwise duplicate every reference.
  //
  // "failed" is not the only shape an unsuccessful capture leaves behind. A
  // request that died before the result was written leaves the reference on
  // "pending" - the status it was created with - so retry anything with a URL
  // that is not captured and has no screenshot uploaded by hand.
  if (opts.remove || opts.recapture) {
    const library = await api(opts.base, "/api/library", { method: "GET" });
    const matching = (library?.references ?? []).filter(
      (r) => r.source?.url && (!opts.only || r.source.url.includes(opts.only)),
    );
    if (!matching.length) {
      console.log(`Nothing matches "${opts.only}".`);
      return;
    }

    if (opts.remove) {
      console.log(`Deleting ${matching.length} reference${matching.length === 1 ? "" : "s"} matching "${opts.only}":\n`);
      let gone = 0;
      for (const ref of matching) {
        try {
          await api(opts.base, `/api/references/${ref.id}`, { method: "DELETE" });
          gone += 1;
          console.log(`  deleted  ${ref.source.url}`);
        } catch (err) {
          console.log(`  kept     ${ref.source.url} — ${err.message}`);
        }
      }
      console.log(`\nDeleted ${gone} of ${matching.length}.`);
      return;
    }

    console.log(`Re-capturing ${matching.length} reference${matching.length === 1 ? "" : "s"}${opts.only ? ` matching "${opts.only}"` : ""}.\n`);
    await captureAll(opts, matching);
    return;
  }

  if (opts.retryFailed) {
    const library = await api(opts.base, "/api/library", { method: "GET" });
    const pending = (library?.references ?? []).filter((r) => {
      if (!r.source?.url) return false;
      if (r.source.status === "captured" || r.source.status === "manual") return false;
      return !opts.only || r.source.url.includes(opts.only);
    });
    if (!pending.length) {
      console.log(`Nothing to retry${opts.only ? ` matching "${opts.only}"` : ""}.`);
      console.log("Every link with a URL is either captured or has a screenshot of its own.");
      return;
    }
    console.log(`Retrying ${pending.length} reference${pending.length === 1 ? "" : "s"} that have not been captured.\n`);
    await captureAll(opts, pending);
    return;
  }

  const urls = readLinks(opts.file, opts.only);
  if (!urls.length) {
    console.error(`No http(s) links found in ${opts.file}${opts.only ? ` matching "${opts.only}"` : ""}.`);
    process.exit(1);
  }

  console.log(`${urls.length} link${urls.length === 1 ? "" : "s"} from ${opts.file}\n`);

  const added = [];
  const rejected = [];
  for (let i = 0; i < urls.length; i += ADD_BATCH) {
    const batch = urls.slice(i, i + ADD_BATCH);
    try {
      const body = await api(opts.base, "/api/references", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: batch, collection: opts.collection || undefined }),
      });
      added.push(...(body?.created ?? []));
      rejected.push(...(body?.rejected ?? []));
    } catch (err) {
      for (const url of batch) rejected.push({ url, reason: err.message });
    }
  }

  console.log(`Added ${added.length}, rejected ${rejected.length}.`);
  for (const r of rejected) console.log(`  rejected  ${r.url} — ${r.reason}`);

  if (!opts.capture || !added.length) {
    if (added.length) console.log(`\nNot capturing (--no-capture). Open ${opts.base} and press Capture when ready.`);
    return;
  }

  console.log("");
  await captureAll(opts, added);
}

async function captureAll(opts, refs) {
  console.log(`Capturing ${refs.length} — each one opens a real browser, so this takes a while.\n`);
  let okCount = 0;
  let failCount = 0;
  for (const [i, ref] of refs.entries()) {
    const label = `[${i + 1}/${refs.length}] ${ref.source?.url ?? ref.id}`;
    try {
      const body = await api(opts.base, `/api/references/${ref.id}/capture`, { method: "POST" });
      // Every capture would fail the same way, so say it once and stop.
      if (body?.browserMissing) {
        console.log(`  failed  ${label} — no browser installed`);
        console.log("\nNo browser is installed for capturing. Run:  npx playwright install chromium");
        console.log("The links are already saved — press Capture in the studio once the browser is there.");
        process.exit(1);
      }
      const source = body?.reference?.source;
      if (source?.status === "captured") {
        okCount += 1;
        console.log(`  ok      ${label}`);
      } else {
        failCount += 1;
        console.log(`  failed  ${label} — ${source?.error ?? "no reason given"}`);
      }
    } catch (err) {
      failCount += 1;
      console.log(`  failed  ${label} — ${err.message}`);
    }
  }

  console.log(`\nCaptured ${okCount}, failed ${failCount}.`);
  if (failCount) {
    console.log("Failed links are kept with their reason — open the studio and upload a screenshot by hand instead.");
  }
  console.log(`\nOpen ${opts.base}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
