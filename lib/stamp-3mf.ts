/**
 * Put the order number where the printer reads the job's name.
 *
 * A MakerWorld 3MF carries the designer's title as <metadata name="Title"> in
 * its .model parts; Bambu Studio keeps it as the model's info and the printer
 * shows it ("Chill_Cat_-_Phone_Holder") whatever the file, the plate or the
 * send-dialog name is. This rewrites every Title to `name`.
 *
 * Same rule as scripts/stamp-3mf.mjs (the drag-onto-a-.bat version).
 */
export async function stamp3mf(input: Uint8Array, name: string): Promise<Uint8Array> {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const files = unzipSync(input);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let changed = 0;
  for (const [path, data] of Object.entries(files)) {
    if (!/\.model$/i.test(path)) continue;
    const xml = strFromU8(data);
    let next = xml.replace(
      /(<metadata\b[^>]*\bname="Title"[^>]*>)([\s\S]*?)(<\/metadata>)/gi,
      (_m, open: string, _old: string, close: string) => `${open}${esc(name)}${close}`,
    );
    if (next === xml && path === "3D/3dmodel.model" && !/name="Title"/i.test(xml)) {
      next = xml.replace(/(<model\b[^>]*>)/i, `$1\n <metadata name="Title">${esc(name)}</metadata>`);
    }
    if (next !== xml) {
      files[path] = strToU8(next);
      changed++;
    }
  }
  if (!changed) throw new Error("no-model");
  return zipSync(files, { level: 6 });
}
