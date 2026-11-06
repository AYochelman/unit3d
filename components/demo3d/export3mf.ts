import type { BufferGeometry } from "three";

/**
 * The keychain as a print file: one .3mf, one object, one part per colour
 * slot ("text" and "base"), each merged into a closed mesh. Bambu Studio opens
 * it as a single object with two parts, ready to give each its filament.
 */
export async function build3mf(parts: { geometry: BufferGeometry; slot: number }[], name: string): Promise<Uint8Array> {
  const [{ mergeVertices, mergeGeometries }, { zipSync, strToU8 }] = await Promise.all([
    import("three/examples/jsm/utils/BufferGeometryUtils.js"),
    import("three/examples/jsm/libs/fflate.module.js"),
  ]);
  type G = Parameters<typeof mergeGeometries>[0][number];
  const bySlot = new Map<number, G[]>();
  for (const p of parts) {
    const g = p.geometry.clone();
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    const list = bySlot.get(p.slot) ?? [];
    list.push((g.index ? g.toNonIndexed() : g) as G);
    bySlot.set(p.slot, list);
  }
  const esc = (t: string) => t.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  let objects = "";
  let id = 0;
  for (const slot of [...bySlot.keys()].sort()) {
    const g = mergeVertices(mergeGeometries(bySlot.get(slot)!), 1e-4);
    const pos = g.getAttribute("position");
    const idx = g.getIndex()!;
    const v: string[] = [];
    const t: string[] = [];
    for (let i = 0; i < pos.count; i++) v.push(`<vertex x="${pos.getX(i).toFixed(4)}" y="${pos.getY(i).toFixed(4)}" z="${pos.getZ(i).toFixed(4)}"/>`);
    for (let i = 0; i < idx.count; i += 3) t.push(`<triangle v1="${idx.getX(i)}" v2="${idx.getX(i + 1)}" v3="${idx.getX(i + 2)}"/>`);
    id++;
    objects += `<object id="${id}" name="${slot === 1 ? "text" : "base"}" type="model"><mesh><vertices>${v.join("")}</vertices><triangles>${t.join("")}</triangles></mesh></object>`;
  }
  const comps = Array.from({ length: id }, (_, i) => `<component objectid="${i + 1}"/>`).join("");
  objects += `<object id="${id + 1}" name="${esc(name)}" type="model"><components>${comps}</components></object>`;
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>${objects}</resources><build><item objectid="${id + 1}"/></build></model>`;
  return zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    "3D/3dmodel.model": strToU8(model),
  });
}
