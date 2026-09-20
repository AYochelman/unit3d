import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { resolveStoredFile } from "@/lib/paths";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
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

  // A <video> asks for a byte range before it will scrub or, in some browsers,
  // play at all. Answer it properly rather than always sending the whole file.
  const range = _req.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && type.startsWith("video/")) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (!Number.isFinite(start) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const partial = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
    return new Response(partial, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      // Stored files are immutable - a new upload gets a new name.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // An uploaded SVG is a document. Sandboxing it means opening the file
      // directly can never run script in the studio's origin. Video is not a
      // document and a sandbox on it only risks the playback, so it is left
      // off there - the type is still pinned and sniffing still refused.
      ...(type.startsWith("video/")
        ? {}
        : { "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" }),
    },
  });
}
