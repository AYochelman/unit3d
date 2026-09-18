import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { resolveStoredFile } from "@/lib/paths";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
};

/**
 * Serves a stored reference image. Every request goes through
 * resolveStoredFile, which refuses anything that would escape data/files.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const abs = resolveStoredFile(decodeURIComponent(name));
  if (!abs) return fail("Not found", 404);

  let size: number;
  try {
    const st = statSync(abs);
    if (!st.isFile()) return fail("Not found", 404);
    size = st.size;
  } catch {
    return fail("Not found", 404);
  }

  const ext = abs.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext] ?? "application/octet-stream";
  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      // Stored files are immutable - a new upload gets a new name.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // An uploaded SVG is a document. Sandboxing it means opening the file
      // directly can never run script in the studio's origin.
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
