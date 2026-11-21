import { readFileSync } from "node:fs";
import { fail, contentDisposition } from "@/lib/api";
import { readDb } from "@/lib/db";
import { resolveStoredFile } from "@/lib/paths";
import { makeZip, type ZipEntry } from "@/lib/zip";
import { buildAnalysisInstruction, ANALYSIS_SCHEMA } from "@/lib/analysis-prompt";
import { slug } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The no-API-key path.
 *
 * Downloads a small zip: the images, the same instruction the API call would
 * have sent, and a README that says exactly what to paste back. Nothing here
 * pretends to be an analysis - it is the request, not the answer.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ref = readDb().references.find((r) => r.id === id);
  if (!ref) return fail("No such reference.", 404);

  const entries: ZipEntry[] = [];
  const imageNames: string[] = [];
  for (const asset of ref.assets) {
    const abs = resolveStoredFile(asset.file);
    if (!abs) continue;
    try {
      entries.push({ path: `images/${asset.file}`, data: readFileSync(abs) });
      imageNames.push(`images/${asset.file}${asset.label ? `  (${asset.label})` : ""}`);
    } catch { /* a missing file must not sink the whole package */ }
  }

  entries.push({ path: "instruction.md", data: Buffer.from(buildAnalysisInstruction(ref), "utf8") });
  entries.push({
    path: "reference.json",
    data: Buffer.from(JSON.stringify({
      id: ref.id, kind: ref.kind, title: ref.title, note: ref.note, tags: ref.tags,
      purposes: ref.purposes, use: ref.use, avoid: ref.avoid,
      source: ref.source ? { url: ref.source.url, capturedAt: ref.source.capturedAt, status: ref.source.status, observed: ref.source.observed } : null,
      assets: ref.assets.map((a) => ({ file: `images/${a.file}`, role: a.role, label: a.label, width: a.width, height: a.height })),
    }, null, 2), "utf8"),
  });

  const readme = `# Analysis package - ${ref.title || ref.id}

This is the "no API key" route. Nothing in here is an analysis yet.

## What to do

1. Open a Claude Code session in this folder.
2. Paste this, and attach the images listed below:

   > Read instruction.md and analyse the attached images exactly as it says.
   > Write the resulting JSON object to analysis.json in this folder.
   > Return only the JSON - no commentary.

   Images:
${imageNames.map((n) => `   - ${n}`).join("\n") || "   (this reference has no images yet)"}

3. Back in Reference Studio, open this reference, go to **Analysis**, and press
   **Import analysis JSON**. Paste the contents of analysis.json, or pick the file.

The import is validated: anything malformed is listed field by field rather
than silently dropped, and a font claimed as "observed" without evidence is
recorded as an estimate.

## The shape it must come back in

\`\`\`json
${ANALYSIS_SCHEMA}
\`\`\`

## Provenance

- Reference id: ${ref.id}
- Source: ${ref.source?.url ?? "(uploaded image)"}
- Captured: ${ref.source?.capturedAt ?? "n/a"}
- Packaged: ${new Date().toISOString()}
${ref.source?.observed ? "\n- This package includes real measurements read off the live page (see reference.json -> source.observed). Those are facts; the instruction tells the model to treat them as such.\n" : ""}`;
  entries.push({ path: "README.md", data: Buffer.from(readme, "utf8") });

  const zip = makeZip(entries);
  const name = `analysis-${slug(ref.title || ref.id, ref.id)}.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(name),
      "Content-Length": String(zip.length),
    },
  });
}
