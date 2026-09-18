import { ok } from "@/lib/api";
import { readDb, publicSettings } from "@/lib/db";
import { browserStatus } from "@/lib/capture";
import { detectAll } from "@/lib/integrations";
import { DATA_DIR } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What can this installation actually do right now? The UI reads this on load
 * and again after Settings change, so no button is ever offered for something
 * that is not configured - and every disabled button can explain itself.
 */
export async function GET() {
  const db = readDb();
  const browser = await browserStatus();
  const settings = publicSettings(db.settings);

  return ok({
    dataDir: DATA_DIR,
    counts: {
      references: db.references.length,
      collections: db.collections.length,
      projects: db.projects.length,
      analysed: db.references.filter((r) => r.analysis).length,
    },
    capture: {
      available: browser.available,
      version: browser.version ?? null,
      reason: browser.reason ?? null,
    },
    ai: {
      // The key itself never leaves the server - only whether one exists.
      configured: settings.hasApiKey,
      model: db.settings.model,
      mode: settings.hasApiKey ? "api" : "package",
      detail: settings.hasApiKey
        ? "An API key is configured: Analyse runs a real vision request."
        : "No API key. Use Export analysis package, run it in Claude Code, then import the JSON it returns.",
    },
    integrations: detectAll(db.settings),
    settings,
  });
}
