import { ok, fail } from "@/lib/api";
import { readDb, withDb } from "@/lib/db";
import { captureUrl } from "@/lib/capture";
import { analysisFromProbe } from "@/lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Screenshotting a slow site takes a while; the default would cut it off.
export const maxDuration = 120;

/**
 * Captures (or re-captures) the website behind a reference.
 *
 * A failure never loses the link: the URL stays, the reason is recorded, and
 * the UI offers a manual screenshot upload instead.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Anything that escapes here would reach the caller as Next's bare
  // "Internal Server Error" page, which names neither the link nor the cause -
  // and a bulk import would repeat it once per link with nothing to act on.
  try {
    return await capture(ctx);
  } catch (err) {
    return fail(`The capture could not be completed: ${(err as Error).message.split("\n")[0]}`, 500);
  }
}

async function capture(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = readDb();
  const ref = db.references.find((r) => r.id === id);
  if (!ref) return fail("No such reference.", 404);
  if (!ref.source?.url) return fail("This reference has no URL to capture.");

  const s = db.settings;
  const result = await captureUrl(ref.source.url, {
    desktop: s.desktopViewport,
    mobile: s.mobileViewport,
    timeoutMs: s.captureTimeoutMs,
    fullPage: s.fullPage,
  });

  const saved = await withDb((database) => {
    const target = database.references.find((r) => r.id === id);
    if (!target || !target.source) return null;

    if (result.ok) {
      // Replace previous captures, keep anything uploaded by hand.
      target.assets = [...target.assets.filter((a) => a.role === "manual" || a.role === "image"), ...result.assets];
      target.source = {
        ...target.source,
        status: "captured",
        capturedAt: new Date().toISOString(),
        error: result.error,
        httpStatus: result.httpStatus,
        title: result.title,
        observed: result.observed,
      };
      if (result.title && (!target.title || /^https?:/.test(target.title))) target.title = result.title;
      // Measurements from the live page are an analysis in their own right -
      // and they are the only place a font can be named as fact.
      if (result.observed && !target.analysis) {
        target.analysis = analysisFromProbe(result.observed);
        target.analysisMeta = { source: "observed", at: new Date().toISOString() };
      }
    } else {
      target.source = {
        ...target.source,
        status: "failed",
        error: result.error ?? "The capture failed.",
        httpStatus: result.httpStatus,
      };
    }
    target.updatedAt = new Date().toISOString();
    return target;
  });

  if (!saved) return fail("No such reference.", 404);
  return ok({
    reference: saved,
    ok: result.ok,
    error: result.error ?? null,
    browserMissing: result.browserMissing ?? false,
  });
}
