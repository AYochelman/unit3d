import { ok, fail, readJson, asString, asStringArray, asBool } from "@/lib/api";
import { readDb, withDb } from "@/lib/db";
import { asProjectRefs } from "@/lib/project-factory";
import { resolveDirection, claudeCodePrompt } from "@/lib/project-output";
import type { BrandColor, BrandFont } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTIONS = new Set(["ltr", "rtl", "both"]);
const ANIMATIONS = new Set(["none", "subtle", "moderate", "expressive"]);

function asBrandColors(v: unknown): BrandColor[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .map((x) => ({ name: asString(x.name).slice(0, 40), hex: asString(x.hex).trim().toLowerCase() }))
    .filter((c) => /^#[0-9a-f]{6}$/.test(c.hex))
    .slice(0, 16);
}
function asBrandFonts(v: unknown): BrandFont[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .map((x) => ({ name: asString(x.name).slice(0, 60), role: asString(x.role).slice(0, 40) }))
    .filter((f) => f.name)
    .slice(0, 8);
}

/** The project, plus the combined direction and the prompt it produces. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = readDb();
  const project = db.projects.find((p) => p.id === id);
  if (!project) return fail("No such project.", 404);
  return ok({
    project,
    direction: resolveDirection(project, db.references),
    prompt: claudeCodePrompt(project, db.references),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!body) return fail("Expected a JSON body.");

  const project = await withDb((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    if ("name" in body) p.name = asString(body.name).slice(0, 120) || p.name;
    if ("purpose" in body) p.purpose = asString(body.purpose).slice(0, 2000);
    if ("audience" in body) p.audience = asString(body.audience).slice(0, 2000);
    if ("mainAction" in body) p.mainAction = asString(body.mainAction).slice(0, 500);
    if ("pages" in body) p.pages = asStringArray(body.pages).slice(0, 40);
    if ("sections" in body) p.sections = asStringArray(body.sections).slice(0, 60);
    if ("functionality" in body) p.functionality = asStringArray(body.functionality).slice(0, 60);
    if ("brandLock" in body) p.brandLock = asBool(body.brandLock, p.brandLock);
    if ("mustKeep" in body) p.mustKeep = asStringArray(body.mustKeep).slice(0, 40);
    if ("dislikes" in body) p.dislikes = asStringArray(body.dislikes).slice(0, 40);
    if ("directives" in body) p.directives = asStringArray(body.directives).slice(0, 30);
    if ("refs" in body) p.refs = asProjectRefs(body.refs);
    if ("language" in body) p.language = asString(body.language).slice(0, 80);
    if ("direction" in body && DIRECTIONS.has(asString(body.direction))) p.direction = asString(body.direction) as typeof p.direction;
    if ("animation" in body && ANIMATIONS.has(asString(body.animation))) p.animation = asString(body.animation) as typeof p.animation;
    if ("brand" in body && body.brand && typeof body.brand === "object") {
      const b = body.brand as Record<string, unknown>;
      p.brand = {
        colors: "colors" in b ? asBrandColors(b.colors) : p.brand.colors,
        fonts: "fonts" in b ? asBrandFonts(b.fonts) : p.brand.fonts,
        logo: "logo" in b ? asString(b.logo).slice(0, 300) : p.brand.logo,
        assets: "assets" in b ? asStringArray(b.assets).slice(0, 40) : p.brand.assets,
      };
    }
    if ("existing" in body && body.existing && typeof body.existing === "object") {
      const e = body.existing as Record<string, unknown>;
      p.existing = {
        url: "url" in e ? asString(e.url).slice(0, 300) : p.existing.url,
        codebase: "codebase" in e ? asString(e.codebase).slice(0, 500) : p.existing.codebase,
      };
    }
    p.updatedAt = new Date().toISOString();
    return p;
  });

  if (!project) return fail("No such project.", 404);
  const db = readDb();
  return ok({ project, direction: resolveDirection(project, db.references), prompt: claudeCodePrompt(project, db.references) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const removed = await withDb((db) => {
    const index = db.projects.findIndex((p) => p.id === id);
    if (index < 0) return false;
    db.projects.splice(index, 1);
    return true;
  });
  if (!removed) return fail("No such project.", 404);
  return ok({ deleted: id });
}
