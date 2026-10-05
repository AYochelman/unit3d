/**
 * Is this really a 3D model, before its name goes anywhere.
 *
 * The file never leaves the browser: the upload page keeps the name and the
 * size, hands a text summary to the contact form, and the customer sends the
 * file itself over WhatsApp or mail. So the site cannot be made to store a
 * malicious file -- but its NAME travels into a message the owner reads, and
 * the owner opens whatever arrives. Two things are worth checking here, at
 * the door:
 *
 *   · the bytes say what the extension says. A binary STL is 84 + 50·n bytes
 *     exactly, an ASCII one starts with "solid", an OBJ is text with vertex
 *     lines, a 3MF is a zip that names its model parts. An .exe renamed to
 *     .stl, or a zip of something else, fails all of those, and the customer
 *     is told so instead of the owner finding out.
 *   · the name is plain. Control characters and the right-to-left override
 *     (U+202E, which makes "elif.stl" read as "lts.file") are stripped, and
 *     it is capped, so nothing in it can dress a message up.
 *
 * Reads the first 64 KB only; a 50 MB file is not pulled into memory.
 */
export const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = ["stl", "obj", "3mf"] as const;
export type ModelExt = (typeof ALLOWED)[number];

export type Inspection =
  | { ok: true; name: string; ext: ModelExt; kind: string }
  | { ok: false; reason: string };

/** A file name with nothing in it but a name. */
export function cleanName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const SAMPLE = 64 * 1024;

export async function inspectModelFile(file: File): Promise<Inspection> {
  const name = cleanName(file.name);
  const tail = (name.split(".").pop() ?? "").toLowerCase();
  if (!name || !name.includes(".")) return { ok: false, reason: "לקובץ אין סיומת. צריך STL, OBJ או 3MF." };
  if (!(ALLOWED as readonly string[]).includes(tail)) return { ok: false, reason: `‎.${tail} זה לא קובץ הדפסה. צריך STL, OBJ או 3MF.` };
  const ext = tail as ModelExt;
  if (file.size === 0) return { ok: false, reason: "הקובץ ריק." };
  if (file.size > MAX_BYTES) return { ok: false, reason: "הקובץ גדול מ-50MB. אפשר לדחוס אותו ל-3MF או לשלוח בוואטסאפ." };

  const buf = new Uint8Array(await file.slice(0, SAMPLE).arrayBuffer());
  const hasNul = buf.subarray(0, Math.min(buf.length, 8192)).some((b) => b === 0);
  const text = () => new TextDecoder("latin1").decode(buf);

  if (ext === "stl") {
    if (file.size >= 84) {
      const n = new DataView(buf.buffer, buf.byteOffset).getUint32(80, true);
      if (84 + 50 * n === file.size) return { ok: true, name, ext, kind: `STL בינארי · ${n.toLocaleString("en")} משולשים` };
    }
    const head = text().slice(0, 4096);
    if (/^\s*solid\b/i.test(head) && (/\bfacet\b/i.test(head) || file.size < 512)) return { ok: true, name, ext, kind: "STL טקסט" };
    return { ok: false, reason: "הקובץ נקרא .stl אבל התוכן שלו אינו STL. תייצא אותו מחדש מהתוכנה." };
  }
  if (ext === "obj") {
    if (hasNul) return { ok: false, reason: "הקובץ נקרא .obj אבל הוא לא קובץ טקסט. תייצא אותו מחדש." };
    if (/^\s*(v|vn|vt|f|o|g|mtllib|usemtl|#)\s/m.test(text())) return { ok: true, name, ext, kind: "OBJ" };
    return { ok: false, reason: "הקובץ נקרא .obj אבל אין בו גיאומטריה. תייצא אותו מחדש." };
  }
  // 3mf
  const zip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (!zip) return { ok: false, reason: "הקובץ נקרא .3mf אבל הוא לא ארכיון 3MF. תייצא אותו מחדש מהסלייסר." };
  const names = text();
  if (!/\[Content_Types\]\.xml|3D\/|\.model\b/.test(names)) return { ok: false, reason: "זה ארכיון, אבל לא של מודל 3MF." };
  return { ok: true, name, ext, kind: "3MF" };
}
