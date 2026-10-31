import { ok, fail, readJson, asString } from "@/lib/api";
import { withDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!body) return fail("Expected a JSON body.");
  const collection = await withDb((db) => {
    const c = db.collections.find((x) => x.id === id);
    if (!c) return null;
    if ("name" in body) c.name = asString(body.name).slice(0, 80) || c.name;
    if ("description" in body) c.description = asString(body.description).slice(0, 400);
    return c;
  });
  if (!collection) return fail("No such collection.", 404);
  return ok({ collection });
}

/** Deleting a collection never deletes the references inside it. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await withDb((db) => {
    const index = db.collections.findIndex((c) => c.id === id);
    if (index < 0) return false;
    db.collections.splice(index, 1);
    for (const ref of db.references) ref.collections = ref.collections.filter((c) => c !== id);
    return true;
  });
  if (!found) return fail("No such collection.", 404);
  return ok({ deleted: id });
}
