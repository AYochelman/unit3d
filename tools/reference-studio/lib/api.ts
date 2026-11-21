import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 });
}

/** One error shape everywhere, so the UI can always render something useful. */
export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];
}
export function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * A Content-Disposition value that survives a non-ASCII file name.
 *
 * HTTP header values are ByteStrings, so a Hebrew project name - or even an em
 * dash - throws when handed straight to `new Response`. RFC 5987 is the fix:
 * an ASCII-only `filename` for old clients, and a percent-encoded UTF-8
 * `filename*` that every current browser prefers.
 */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "-").replace(/["\\]/g, "-").replace(/-+/g, "-");
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii || "download"}"; filename*=UTF-8''${encoded}`;
}
