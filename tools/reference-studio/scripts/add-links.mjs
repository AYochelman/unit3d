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
  const opts = { file: "", base: "http://localhost:3100", collection: "", capture: true, only: "", retryFailed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--retry-failed") opts.retryFailed = true;
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
  if (!opts.file && !opts.retryFailed) {
    console.error("Usage: node tools/reference-studio/scripts/add-links.mjs <file-of-urls> [--collection NAME] [--no-capture] [--only dribbble.com] [--port 3100]");
    console.error("       node tools/reference-studio/scripts/add-links.mjs --retry-failed [--only dribbble.com]");
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

  // Re-capturing what is already in the library, rather than adding it again:
  // a second run of the same file would otherwise duplicate every reference.
  if (opts.retryFailed) {
    const library = await api(opts.base, "/api/library", { method: "GET" });
    const failed = (library?.references ?? []).filter(
      (r) => r.source?.status === "failed" && (!opts.only || (r.source?.url ?? "").includes(opts.only)),
    );
    if (!failed.length) {
      console.log(`Nothing to retry${opts.only ? ` matching "${opts.only}"` : ""}.`);
      return;
    }
    console.log(`Retrying ${failed.length} reference${failed.length === 1 ? "" : "s"} that failed to capture.\n`);
    await captureAll(opts, failed);
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
