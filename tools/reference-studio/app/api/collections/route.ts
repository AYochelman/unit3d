import { ok, fail, readJson, asString } from "@/lib/api";
import { withDb } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Collection } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const name = asString(body?.name).trim();
  if (!name) return fail("A collection needs a name.");
  const collection: Collection = {
    id: newId("col"), name: name.slice(0, 80),
    description: asString(body?.description).slice(0, 400),
    createdAt: new Date().toISOString(),
  };
  await withDb((db) => { db.collections.push(collection); });
  return ok({ collection }, 201);
}
