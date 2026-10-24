import { ok, fail, readJson, asString, asBool } from "@/lib/api";
import { withDb, publicSettings, readDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ settings: publicSettings(readDb().settings) });
}

/**
 * The API key is write-only from the browser's point of view: it can be set or
 * cleared, and it is never sent back. Everything else round-trips normally.
 */
export async function PATCH(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Expected a JSON body.");

  const settings = await withDb((db) => {
    const s = db.settings;
    if ("anthropicApiKey" in body) {
      const key = asString(body.anthropicApiKey).trim();
      s.anthropicApiKey = key || undefined;
    }
    if ("model" in body) s.model = asString(body.model, s.model).slice(0, 80) || s.model;
    if ("theme" in body) s.theme = asString(body.theme) === "light" ? "light" : "dark";
    if ("uiLanguage" in body) s.uiLanguage = asString(body.uiLanguage) === "he" ? "he" : "en";
    if ("fullPage" in body) s.fullPage = asBool(body.fullPage, s.fullPage);
    if ("captureTimeoutMs" in body) {
      const ms = Number(body.captureTimeoutMs);
      if (Number.isFinite(ms)) s.captureTimeoutMs = Math.min(120000, Math.max(5000, Math.round(ms)));
    }
    for (const key of ["desktopViewport", "mobileViewport"] as const) {
      if (key in body && body[key] && typeof body[key] === "object") {
        const v = body[key] as Record<string, unknown>;
        const width = Number(v.width);
        const height = Number(v.height);
        if (Number.isFinite(width)) s[key].width = Math.min(3840, Math.max(320, Math.round(width)));
        if (Number.isFinite(height)) s[key].height = Math.min(2160, Math.max(400, Math.round(height)));
      }
    }
    if ("integrations" in body && body.integrations && typeof body.integrations === "object") {
      const i = body.integrations as Record<string, Record<string, unknown> | undefined>;
      if (i.impeccable) {
        s.integrations.impeccable = {
          enabled: asBool(i.impeccable.enabled, s.integrations.impeccable.enabled),
          path: asString(i.impeccable.path, s.integrations.impeccable.path).slice(0, 400),
        };
      }
      if (i.higgsfield) {
        s.integrations.higgsfield = {
          enabled: asBool(i.higgsfield.enabled, s.integrations.higgsfield.enabled),
          note: asString(i.higgsfield.note, s.integrations.higgsfield.note).slice(0, 300),
        };
      }
      if (i.twentyFirst) {
        s.integrations.twentyFirst = {
          enabled: asBool(i.twentyFirst.enabled, s.integrations.twentyFirst.enabled),
          note: asString(i.twentyFirst.note, s.integrations.twentyFirst.note).slice(0, 300),
        };
      }
    }
    return s;
  });

  return ok({ settings: publicSettings(settings) });
}
