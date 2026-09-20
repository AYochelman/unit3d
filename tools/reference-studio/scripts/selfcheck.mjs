#!/usr/bin/env node
/**
 * Reference Studio self-check.
 *
 *   npm run studio:check              pure logic only
 *   npm run studio:check -- --live    also exercises a running server
 *
 * The pure half needs nothing but Node. The live half talks to the studio at
 * STUDIO_URL (default http://localhost:3100) and checks the parts that only
 * exist end to end: the SSRF guard's answers, upload validation, the analysis
 * validator, and that an exported package is a readable archive.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const lib = resolve(here, "..", "lib");

let failed = 0;
let passed = 0;
const ok = (name, condition, detail = "") => {
  if (condition) { passed += 1; console.log(`  pass  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ""}`); }
};
const section = (title) => console.log(`\n${title}`);

/* ---------------- pure logic ---------------- */
const { visibleReferences, allTags } = await import(`${lib}/filters.ts`);
const { isBlockedAddress, guardUrl } = await import(`${lib}/net-guard.ts`);
const { makeZip } = await import(`${lib}/zip.ts`);
const { cleanTitle, titleFromUrl } = await import(`${lib}/titles.ts`);
const { coverOf, byCoverOrder, motionOf } = await import(`${lib}/cover.ts`);
const { inspectVideo } = await import(`${lib}/video-info.ts`);
const { contrastRatio, describeColor, parseCssColor } = await import(`${lib}/color.ts`);
const { inspectImage } = await import(`${lib}/image-info.ts`);

section("Filters");
const ref = (p) => ({
  id: "", kind: "image", title: "", note: "", tags: [], favorite: false, collections: [],
  purposes: [], use: [], avoid: [], assets: [], analysisMeta: { source: "none" },
  createdAt: "", updatedAt: "", ...p,
});
const refs = [
  ref({ id: "a", title: "Aurora hero", tags: ["warm", "editorial"], purposes: ["hero"], favorite: true, collections: ["c1"],
        analysis: { aestheticFamily: "Warm editorial brutalism", vocabulary: [], character: "" } }),
  ref({ id: "b", kind: "url", title: "Neon grid", tags: ["dark"], purposes: ["layout"], source: { url: "https://neon.example", status: "captured" } }),
  ref({ id: "c", title: "עיצוב עברי", note: "הטיפוגרפיה החמה", tags: ["warm"], purposes: ["typography"] }),
];
const F = (p) => ({ query: "", tags: [], collection: null, purpose: null, favorites: false, kind: "all", unanalysed: false, ...p });
const ids = (f) => visibleReferences(refs, f).map((r) => r.id).join();
ok("no filter returns everything", visibleReferences(refs, F()).length === 3);
ok("search matches a title", ids(F({ query: "aurora" })) === "a");
ok("search reaches into the analysis", ids(F({ query: "brutalism" })) === "a");
ok("search works in Hebrew", ids(F({ query: "טיפוגרפיה" })) === "c");
ok("search matches a source URL", ids(F({ query: "neon.example" })) === "b");
ok("favourites filter", ids(F({ favorites: true })) === "a");
ok("kind filter", ids(F({ kind: "url" })) === "b");
ok("purpose filter", ids(F({ purpose: "typography" })) === "c");
ok("collection filter", ids(F({ collection: "c1" })) === "a");
ok("tags are ANDed", ids(F({ tags: ["warm", "editorial"] })) === "a");
ok("one tag matches several", ids(F({ tags: ["warm"] })) === "a,c");
ok("unanalysed filter", ids(F({ unanalysed: true })) === "b,c");
ok("filters combine", ids(F({ kind: "image", tags: ["warm"], query: "עברי" })) === "c");
ok("tag counts", JSON.stringify(allTags(refs)) === JSON.stringify([{ tag: "warm", count: 2 }, { tag: "dark", count: 1 }, { tag: "editorial", count: 1 }]));

section("Network guard");
for (const addr of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.9.9", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.1.2.3", "0.0.0.0", "224.0.0.1"]) {
  ok(`blocks ${addr}`, isBlockedAddress(addr) === true);
}
for (const addr of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700::1111"]) {
  ok(`allows ${addr}`, isBlockedAddress(addr) === false);
}
ok("rejects file://", (await guardUrl("file:///etc/passwd")).ok === false);
ok("rejects javascript:", (await guardUrl("javascript:alert(1)")).ok === false);
ok("rejects localhost", (await guardUrl("http://localhost:3000")).ok === false);
ok("rejects a literal private IP", (await guardUrl("http://192.168.0.1/")).ok === false);
ok("rejects an odd port", (await guardUrl("http://example.com:22/")).ok === false);
ok("rejects nonsense", (await guardUrl("not a url")).ok === false);

section("Archive");
const zip = makeZip([
  { path: "a.txt", data: Buffer.from("hello", "utf8") },
  { path: "nested/ב.txt", data: Buffer.from("שלום", "utf8") },
]);
ok("local file header", zip.readUInt32LE(0) === 0x04034b50);
ok("end-of-central-directory present", zip.subarray(-22).readUInt32LE(0) === 0x06054b50);
ok("entry count", zip.subarray(-22).readUInt16LE(8) === 2);
ok("UTF-8 flag set", (zip.readUInt16LE(6) & 0x0800) !== 0);

section("Colour");
ok("hex parsing", parseCssColor("#ff8800")?.r === 255);
ok("short hex", parseCssColor("#f80")?.g === 136);
ok("rgb() parsing", parseCssColor("rgb(10, 20, 30)")?.b === 30);
ok("contrast, black on white", contrastRatio("#000000", "#ffffff") === 21);
ok("contrast is symmetric", contrastRatio("#101418", "#faf7f2") === contrastRatio("#faf7f2", "#101418"));
ok("near-white is not called orange", describeColor("#faf7f2") === "warm near-white", describeColor("#faf7f2"));
ok("near-black keeps its cast", describeColor("#101418") === "cool near-black", describeColor("#101418"));

section("Cover image");
{
  const asset = (role) => ({ id: role, role, file: `${role}.png`, mime: "image/png", bytes: 1, width: 1, height: 1 });
  ok("a hand-uploaded picture outranks every capture",
    coverOf({ assets: [asset("desktop"), asset("artwork"), asset("manual")] }).role === "manual");
  ok("the page's own preview outranks the screenshot",
    coverOf({ assets: [asset("desktop"), asset("artwork")] }).role === "artwork");
  ok("the screenshot is used when there is nothing better",
    coverOf({ assets: [asset("mobile"), asset("desktop")] }).role === "desktop");
  ok("an unranked role is still shown rather than nothing",
    coverOf({ assets: [asset("mobile")] }).role === "mobile");
  ok("no assets means no cover", coverOf({ assets: [] }) === undefined);
  ok("the vision order matches the cover order",
    byCoverOrder([asset("mobile"), asset("desktop"), asset("manual"), asset("artwork")])
      .map((a) => a.role).join(",") === "manual,artwork,desktop,mobile");
}

section("Video sniffing");
{
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom", "ascii"), Buffer.alloc(8)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);
  const notVideo = Buffer.from("GIF89a and then some bytes", "ascii");
  const clip = { id: "m", role: "motion", file: "m.mp4", mime: "video/mp4", bytes: 1, width: 0, height: 0 };
  const still = { id: "s", role: "artwork", file: "s.png", mime: "image/png", bytes: 1, width: 4, height: 3 };

  ok("reads an MP4", inspectVideo(mp4)?.mime === "video/mp4");
  ok("reads a WebM", inspectVideo(webm)?.mime === "video/webm");
  ok("rejects something that is not video", inspectVideo(notVideo) === null);
  ok("rejects a short buffer", inspectVideo(Buffer.alloc(4)) === null);
  ok("a still is the cover when there is one", coverOf({ assets: [clip, still] })?.role === "artwork");
  ok("a clip alone is still shown rather than nothing", coverOf({ assets: [clip] })?.role === "motion");
  ok("motionOf finds the clip", motionOf({ assets: [still, clip] })?.file === "m.mp4");
  ok("motionOf is empty when there is no clip", motionOf({ assets: [still] }) === undefined);
}

section("Titles");
{
  const d = "https://dribbble.com/shots/25571331-etail";
  ok("drops a trailing byline and site name",
    cleanTitle("Etail landing page web design 3D animation by Halo Lab on Dribbble", d)
      === "Etail landing page web design 3D animation",
    cleanTitle("Etail landing page web design 3D animation by Halo Lab on Dribbble", d));
  ok("drops a separator and site name",
    cleanTitle("Shiny Button | 21st.dev", "https://21st.dev/@a/components/shiny-button") === "Shiny Button");
  ok("leaves a title that does not name its site",
    cleanTitle("A title with no site name at all", "https://example.com/x") === "A title with no site name at all");
  ok("never empties a title that is only the site name", cleanTitle("Dribbble", d) === "Dribbble");
  ok("caps an overlong title", cleanTitle("x".repeat(200), d).length <= 70);
  ok("a URL placeholder is not the page title",
    titleFromUrl(d) === "dribbble.com / 25571331-etail", titleFromUrl(d));
}

section("Image sniffing");
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]),
  Buffer.from("IHDR", "ascii"),
  (() => { const b = Buffer.alloc(8); b.writeUInt32BE(640, 0); b.writeUInt32BE(480, 4); return b; })(),
]);
const pngInfo = inspectImage(png);
ok("reads PNG dimensions", pngInfo?.width === 640 && pngInfo?.height === 480);
ok("rejects a text file", inspectImage(Buffer.from("{\"not\":\"an image\"}", "utf8")) === null);
ok("rejects an empty buffer", inspectImage(Buffer.alloc(0)) === null);
ok("accepts SVG", inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8"))?.ext === "svg");

/* ---------------- live server ---------------- */
if (process.argv.includes("--live")) {
  const base = process.env.STUDIO_URL || "http://localhost:3100";
  section(`Live server (${base})`);
  const get = async (path, init) => {
    const res = await fetch(`${base}${path}`, init);
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body, res };
  };

  try {
    const health = await get("/api/health");
    ok("health responds", health.status === 200);
    ok("health reports capture state", typeof health.body?.capture?.available === "boolean");
    ok("health never leaks the API key", !JSON.stringify(health.body).includes("sk-ant"));

    const bad = await get("/api/references", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: ["http://169.254.169.254/"] }),
    });
    ok("cloud metadata is refused", bad.status >= 400 && JSON.stringify(bad.body).includes("private or reserved"));

    const traverse = await get("/api/files/..%2Flibrary.json");
    ok("path traversal is refused", traverse.status === 404);

    const lib2 = await get("/api/library");
    ok("library lists", Array.isArray(lib2.body?.references));
    const target = lib2.body?.references?.[0];
    if (target) {
      const badAnalysis = await get(`/api/references/${target.id}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", analysis: { colors: "nope" } }),
      });
      ok("invalid analysis is rejected with reasons",
        badAnalysis.status === 422 && Array.isArray(badAnalysis.body?.errors) && badAnalysis.body.errors.length > 0);

      const pkg = await fetch(`${base}/api/references/${target.id}/package`);
      const buf = Buffer.from(await pkg.arrayBuffer());
      ok("analysis package is a zip", buf.readUInt32LE(0) === 0x04034b50);
      ok("package filename survives non-ASCII", /filename\*=UTF-8/.test(pkg.headers.get("content-disposition") ?? ""));
    }
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  could not reach the server: ${err.message}`);
    console.log("        Start it with `npm run studio`, or drop --live.");
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
