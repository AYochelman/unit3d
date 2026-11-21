import { unlinkSync } from "node:fs";
import { ok, fail, readJson, asString, asStringArray, asBool } from "@/lib/api";
import { withDb, readDb } from "@/lib/db";
import { resolveStoredFile } from "@/lib/paths";
import { asPurposes } from "@/lib/reference-factory";
import { normalizeAnalysis } from "@/lib/analysis";
import { designBrief, imagePrompt, designTokens } from "@/lib/outputs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One reference plus everything generated from it. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ref = readDb().references.find((r) => r.id === id);
  if (!ref) return fail("No such reference.", 404);
  const tokens = designTokens(ref);
  return ok({ reference: ref, outputs: { brief: designBrief(ref), imagePrompt: imagePrompt(ref), tokensJson: tokens.json, tokensCss: tokens.css } });
}

/** Edits. Only the fields present in the body change. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!body) return fail("Expected a JSON body.");

  const result = await withDb((db) => {
    const ref = db.references.find((r) => r.id === id);
    if (!ref) return null;

    if ("title" in body) ref.title = asString(body.title).slice(0, 200);
    if ("note" in body) ref.note = asString(body.note).slice(0, 4000);
    if ("tags" in body) ref.tags = [...new Set(asStringArray(body.tags).map((t) => t.toLowerCase()))].slice(0, 30);
    if ("favorite" in body) ref.favorite = asBool(body.favorite, ref.favorite);
    if ("collections" in body) ref.collections = asStringArray(body.collections).slice(0, 20);
    if ("purposes" in body) ref.purposes = asPurposes(body.purposes);
    if ("use" in body) ref.use = asStringArray(body.use).slice(0, 20);
    if ("avoid" in body) ref.avoid = asStringArray(body.avoid).slice(0, 20);

    if ("analysis" in body) {
      if (body.analysis === null) {
        ref.analysis = undefined;
        ref.analysisMeta = { source: "none" };
      } else {
        const { analysis, errors } = normalizeAnalysis(body.analysis);
        if (errors.length) return { errors };
        ref.analysis = analysis;
        // Hand-editing is recorded, never silently attributed to the model.
        ref.analysisMeta = {
          ...ref.analysisMeta,
          source: ref.analysisMeta.source === "none" ? "manual" : ref.analysisMeta.source,
          editedAt: new Date().toISOString(),
        };
      }
    }
    ref.updatedAt = new Date().toISOString();
    return { ref };
  });

  if (!result) return fail("No such reference.", 404);
  if ("errors" in result && result.errors) return fail(result.errors.join(" "), 422, { errors: result.errors });
  return ok({ reference: result.ref });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const removed = await withDb((db) => {
    const index = db.references.findIndex((r) => r.id === id);
    if (index < 0) return null;
    const [ref] = db.references.splice(index, 1);
    // Drop it from every project that pointed at it, so no brief references a
    // picture that no longer exists.
    for (const project of db.projects) {
      project.refs = project.refs.filter((r) => r.refId !== id);
    }
    return ref;
  });
  if (!removed) return fail("No such reference.", 404);

  for (const asset of removed.assets) {
    const abs = resolveStoredFile(asset.file);
    if (abs) { try { unlinkSync(abs); } catch { /* already gone */ } }
  }
  return ok({ deleted: removed.id });
}
