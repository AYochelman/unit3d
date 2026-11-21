import { ok } from "@/lib/api";
import { readDb, publicSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole library in one request - it is a local single-user tool. */
export async function GET() {
  const db = readDb();
  return ok({
    references: db.references,
    collections: db.collections,
    projects: db.projects,
    settings: publicSettings(db.settings),
  });
}
