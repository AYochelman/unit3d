import { ok, fail, readJson, asString } from "@/lib/api";
import { withDb } from "@/lib/db";
import { blankProject } from "@/lib/project-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const name = asString(body?.name).trim();
  if (!name) return fail("A project needs a name.");
  const project = blankProject(name.slice(0, 120));
  await withDb((db) => { db.projects.unshift(project); });
  return ok({ project }, 201);
}
