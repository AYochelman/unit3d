import { ok, fail, readJson, asString } from "@/lib/api";
import { readDb, withDb } from "@/lib/db";
import { analyzeWithAi } from "@/lib/ai";
import { normalizeAnalysis, analysisFromProbe, mergeObservedOver, enforceEvidence } from "@/lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Three ways to get an analysis, and the UI is explicit about which one ran:
 *
 *   mode "ai"       - a real vision request. Needs a key in Settings.
 *   mode "observed" - rebuild from the live-page measurements. No model.
 *   mode "import"   - structured JSON produced elsewhere (Claude Code).
 *
 * There is deliberately no fourth mode that makes something up.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await readJson(req)) ?? {};
  const mode = asString(body.mode, "ai");

  const db = readDb();
  const ref = db.references.find((r) => r.id === id);
  if (!ref) return fail("No such reference.", 404);

  /* ---------- import ---------- */
  if (mode === "import") {
    const payload = "analysis" in body ? body.analysis : body;
    const { analysis, errors, warnings } = normalizeAnalysis(payload);
    if (errors.length) {
      return fail("The analysis could not be imported.", 422, { errors, warnings });
    }
    const gated = enforceEvidence(analysis, Boolean(ref.source?.observed));
    warnings.push(...gated.warnings);
    const merged = ref.source?.observed
      ? mergeObservedOver(gated.analysis, analysisFromProbe(ref.source.observed))
      : gated.analysis;
    const saved = await withDb((database) => {
      const target = database.references.find((r) => r.id === id);
      if (!target) return null;
      target.analysis = merged;
      target.analysisMeta = { source: "imported", at: new Date().toISOString(), note: warnings.length ? `${warnings.length} field(s) needed correcting on import.` : undefined };
      target.updatedAt = new Date().toISOString();
      return target;
    });
    return ok({ reference: saved, warnings, mode: "imported" });
  }

  /* ---------- observed ---------- */
  if (mode === "observed") {
    if (!ref.source?.observed) {
      return fail("There are no live-page measurements for this reference. Capture the URL first.", 409);
    }
    const saved = await withDb((database) => {
      const target = database.references.find((r) => r.id === id);
      if (!target?.source?.observed) return null;
      target.analysis = analysisFromProbe(target.source.observed);
      target.analysisMeta = { source: "observed", at: new Date().toISOString() };
      target.updatedAt = new Date().toISOString();
      return target;
    });
    return ok({ reference: saved, warnings: [], mode: "observed" });
  }

  /* ---------- ai ---------- */
  const apiKey = db.settings.anthropicApiKey?.trim();
  if (!apiKey) {
    return fail(
      "No API key is configured, so there is nothing to run. Either add one in Settings, " +
        "or use Export analysis package and import the JSON Claude Code gives you back.",
      409,
      { mode: "package" },
    );
  }

  const result = await analyzeWithAi(ref, apiKey, db.settings.model);
  if (!result.ok || !result.analysis) {
    return fail(result.errors[0] ?? "The analysis failed.", 502, { errors: result.errors, warnings: result.warnings });
  }

  const saved = await withDb((database) => {
    const target = database.references.find((r) => r.id === id);
    if (!target) return null;
    target.analysis = result.analysis;
    target.analysisMeta = { source: "ai", model: result.model, at: new Date().toISOString() };
    target.updatedAt = new Date().toISOString();
    return target;
  });

  return ok({ reference: saved, warnings: result.warnings, usage: result.usage, mode: "ai", model: result.model });
}
