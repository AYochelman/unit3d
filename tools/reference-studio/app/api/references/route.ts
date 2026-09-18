import { writeFileSync } from "node:fs";
import path from "node:path";
import { ok, fail, asString, asStringArray, readJson } from "@/lib/api";
import { withDb } from "@/lib/db";
import { FILES_DIR, ensureDirs } from "@/lib/paths";
import { newId } from "@/lib/ids";
import { inspectImage, MAX_UPLOAD_BYTES } from "@/lib/image-info";
import { guardUrl } from "@/lib/net-guard";
import { blankReference, asPurposes, titleFromUrl } from "@/lib/reference-factory";
import type { Asset, Reference, Swatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates references. Two shapes arrive here:
 *   multipart/form-data -> one or more dropped, pasted or picked images
 *   application/json    -> one or more website URLs (captured afterwards)
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  /* ---------- images ---------- */
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail("The upload could not be read. It may be larger than the 32 MB request limit.", 413);
    }
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return fail("No files were included in the upload.");

    const collection = asString(form.get("collection"));
    const created: Reference[] = [];
    const rejected: { name: string; reason: string }[] = [];
    ensureDirs();

    for (const file of files) {
      if (file.size === 0) { rejected.push({ name: file.name, reason: "The file is empty." }); continue; }
      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push({ name: file.name, reason: `${(file.size / 1e6).toFixed(1)} MB is over the 25 MB limit.` });
        continue;
      }
      const buf = Buffer.from(await file.arrayBuffer());
      // Trust the bytes, not the Content-Type the browser attached.
      const info = inspectImage(buf);
      if (!info) {
        rejected.push({ name: file.name, reason: "Not a PNG, JPEG, GIF, WebP, AVIF or SVG file." });
        continue;
      }
      const stored = `${newId("img")}.${info.ext}`;
      writeFileSync(path.join(FILES_DIR, stored), buf);

      // The browser measures pasted/dropped images accurately; the header is
      // the fallback for formats where we do not parse dimensions.
      const declaredW = Number(form.get(`width:${file.name}`));
      const declaredH = Number(form.get(`height:${file.name}`));
      const asset: Asset = {
        id: newId("as"),
        role: "image",
        file: stored,
        mime: info.mime,
        bytes: buf.length,
        width: info.width || (Number.isFinite(declaredW) ? declaredW : 0),
        height: info.height || (Number.isFinite(declaredH) ? declaredH : 0),
      };

      const ref = blankReference("image", file.name.replace(/\.[a-z0-9]+$/i, "") || "Untitled");
      ref.assets = [asset];
      if (collection) ref.collections = [collection];
      const palette = form.get(`palette:${file.name}`);
      if (typeof palette === "string" && palette) {
        try {
          const parsed = JSON.parse(palette) as { hex: string; share: number }[];
          ref.autoPalette = parsed
            .filter((p) => /^#[0-9a-f]{6}$/i.test(p.hex))
            .slice(0, 8)
            .map((p): Swatch => ({ hex: p.hex.toLowerCase(), share: p.share, confidence: "observed" }));
        } catch { /* a bad palette is not worth failing an upload over */ }
      }
      created.push(ref);
    }

    if (!created.length) return fail("Nothing could be added.", 415, { rejected });
    await withDb((db) => { db.references.unshift(...created); });
    return ok({ created, rejected }, 201);
  }

  /* ---------- URLs ---------- */
  const body = await readJson(req);
  if (!body) return fail("Send either a multipart upload or a JSON body.");
  const urls = asStringArray(body.urls);
  if (!urls.length) return fail("No URLs were given.");

  const created: Reference[] = [];
  const rejected: { url: string; reason: string }[] = [];
  for (const raw of urls.slice(0, 20)) {
    const guard = await guardUrl(raw);
    if (!guard.ok || !guard.url) {
      rejected.push({ url: raw, reason: guard.reason ?? "Rejected." });
      continue;
    }
    const ref = blankReference("url", titleFromUrl(guard.url.toString()));
    ref.source = { url: guard.url.toString(), status: "pending" };
    ref.purposes = asPurposes(body.purposes);
    const collection = asString(body.collection);
    if (collection) ref.collections = [collection];
    created.push(ref);
  }

  if (!created.length) return fail("None of those URLs could be added.", 400, { rejected });
  await withDb((db) => { db.references.unshift(...created); });
  // Capture happens in a follow-up request per reference so the UI can show
  // progress instead of hanging on a 40-second POST.
  return ok({ created, rejected }, 201);
}
