import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { ok, fail, asString } from "@/lib/api";
import { withDb } from "@/lib/db";
import { FILES_DIR, ensureDirs, resolveStoredFile } from "@/lib/paths";
import { newId } from "@/lib/ids";
import { inspectImage, MAX_UPLOAD_BYTES } from "@/lib/image-info";
import type { Asset } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manual screenshot upload. This is what makes an unreachable site still
 * useful: the link and the note survive, and you supply the picture yourself.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("The upload could not be read.", 413);
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return fail("No files were included.");
  const role = asString(form.get("role"), "manual") === "mobile" ? "mobile" : "manual";

  ensureDirs();
  const added: Asset[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files.slice(0, 6)) {
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({ name: file.name, reason: `${(file.size / 1e6).toFixed(1)} MB is over the 25 MB limit.` });
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const info = inspectImage(buf);
    if (!info) { rejected.push({ name: file.name, reason: "Not a recognised image format." }); continue; }
    const stored = `${newId("man")}.${info.ext}`;
    writeFileSync(path.join(FILES_DIR, stored), buf);
    added.push({
      id: newId("as"), role, file: stored, mime: info.mime, bytes: buf.length,
      width: info.width, height: info.height, label: file.name.slice(0, 60),
    });
  }
  if (!added.length) return fail("Nothing could be added.", 415, { rejected });

  const saved = await withDb((db) => {
    const ref = db.references.find((r) => r.id === id);
    if (!ref) return null;
    ref.assets.push(...added);
    if (ref.source && ref.source.status === "failed") ref.source.status = "manual";
    ref.updatedAt = new Date().toISOString();
    return ref;
  });
  if (!saved) {
    for (const a of added) { const abs = resolveStoredFile(a.file); if (abs) { try { unlinkSync(abs); } catch {} } }
    return fail("No such reference.", 404);
  }
  return ok({ reference: saved, added, rejected }, 201);
}

/** Removes one image from a reference. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const assetId = new URL(req.url).searchParams.get("asset");
  if (!assetId) return fail("Which asset? Pass ?asset=<id>.");

  const result = await withDb((db) => {
    const ref = db.references.find((r) => r.id === id);
    if (!ref) return null;
    const index = ref.assets.findIndex((a) => a.id === assetId);
    if (index < 0) return { ref, removed: null };
    const [removed] = ref.assets.splice(index, 1);
    ref.updatedAt = new Date().toISOString();
    return { ref, removed };
  });
  if (!result) return fail("No such reference.", 404);
  if (result.removed) {
    const abs = resolveStoredFile(result.removed.file);
    if (abs) { try { unlinkSync(abs); } catch { /* already gone */ } }
  }
  return ok({ reference: result.ref });
}
