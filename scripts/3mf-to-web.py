#!/usr/bin/env python3
"""
A Bambu Studio .3mf → what the browser 3D preview loads: one JSON (parts, the
colour each one prints in) and one .bin (vertices and triangles per colour).

Colours come from where Bambu keeps them: the extruder of each part
(Metadata/model_settings.config), and per-triangle painting (paint_color).
A painted triangle that Bambu subdivided gets the strongest colour in it —
close enough to see, which is all a preview needs.

  python3 scripts/3mf-to-web.py in.3mf out/name    → out/name.json + out/name.bin
"""
import json, re, struct, sys, zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"}
PNS = "{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}"

def mat(t):
    v = [float(x) for x in (t or "1 0 0 0 1 0 0 0 1 0 0 0").split()]
    # 3MF: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32 (row vectors)
    return [[v[0], v[1], v[2], 0], [v[3], v[4], v[5], 0], [v[6], v[7], v[8], 0], [v[9], v[10], v[11], 1]]

def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def apply(m, p):
    x, y, z = p
    return (x * m[0][0] + y * m[1][0] + z * m[2][0] + m[3][0],
            x * m[0][1] + y * m[1][1] + z * m[2][1] + m[3][1],
            x * m[0][2] + y * m[1][2] + z * m[2][2] + m[3][2])

def paint_state(code):
    if not code: return 0
    if code == "4": return 1
    if code == "8": return 2
    m = re.fullmatch(r"([0-9A-F])C", code)
    if m: return 3 + int(m.group(1), 16)
    # subdivided: the highest filament mentioned in it
    found = [3 + int(x, 16) for x in re.findall(r"([0-9A-F])C", code)]
    if found: return max(found)
    if "8" in code: return 2
    if "4" in code: return 1
    return 0

def main(src, out):
    z = zipfile.ZipFile(src)
    models = {n: ET.fromstring(z.read(n)) for n in z.namelist() if n.endswith(".model")}
    main_name = "3D/3dmodel.model"
    settings = ET.fromstring(z.read("Metadata/model_settings.config")) if "Metadata/model_settings.config" in z.namelist() else None
    colours = ["#2b2b2b", "#f2f2f2", "#089a47", "#c8312b", "#2449b8", "#e6b420"]
    try:
        cfg = json.loads(z.read("Metadata/project_settings.config"))
        colours = cfg.get("filament_colour") or colours
    except Exception:
        pass

    # extruder per (object, part)
    ext_obj, ext_part = {}, {}
    if settings is not None:
        for o in settings.findall("object"):
            oid = o.get("id")
            for md in o.findall("metadata"):
                if md.get("key") == "extruder": ext_obj[oid] = int(md.get("value"))
            for p in o.findall("part"):
                for md in p.findall("metadata"):
                    if md.get("key") == "extruder": ext_part[(oid, p.get("id"))] = int(md.get("value"))

    def objects_in(name):
        return {o.get("id"): o for o in models[name].findall(".//m:resources/m:object", NS)}

    slots = {}  # filament number -> (verts list, tris list, index map)

    def emit(name, obj, m, extruder):
        mesh = obj.find("m:mesh", NS)
        if mesh is not None:
            vs = [(float(v.get("x")), float(v.get("y")), float(v.get("z"))) for v in mesh.find("m:vertices", NS)]
            vs = [apply(m, p) for p in vs]
            for t in mesh.find("m:triangles", NS):
                st = paint_state(t.get("paint_color"))
                f = st or extruder or 1
                verts, tris, idx = slots.setdefault(f, ([], [], {}))
                ids = []
                for k in ("v1", "v2", "v3"):
                    key = (id(vs), int(t.get(k)))
                    if key not in idx:
                        idx[key] = len(verts)
                        verts.append(vs[int(t.get(k))])
                    ids.append(idx[key])
                tris.append(ids)
        comps = obj.find("m:components", NS)
        if comps is not None:
            for c in comps:
                path = (c.get(PNS + "path") or "/" + name).lstrip("/")
                child = objects_in(path)[c.get("objectid")]
                emit(path, child, mul(mat(c.get("transform")), m), extruder)

    root = objects_in(main_name)
    for item in models[main_name].findall(".//m:build/m:item", NS):
        oid = item.get("objectid")
        obj = root[oid]
        im = mat(item.get("transform"))
        comps = obj.find("m:components", NS)
        if comps is None:
            emit(main_name, obj, im, ext_obj.get(oid, 1))
            continue
        for c in comps:
            path = (c.get(PNS + "path") or "/" + main_name).lstrip("/")
            child = objects_in(path)[c.get("objectid")]
            e = ext_part.get((oid, c.get("objectid")), ext_obj.get(oid, 1))
            emit(path, child, mul(mat(c.get("transform")), im), e)

    # centre on the plate, base at z=0
    allv = [p for s in slots.values() for p in s[0]]
    xs, ys, zs = zip(*allv)
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    size = [round(max(xs) - min(xs), 1), round(max(ys) - min(ys), 1), round(max(zs) - min(zs), 1)]

    blob = bytearray()
    parts = []
    for f in sorted(slots):
        verts, tris, _ = slots[f]
        off_v = len(blob)
        for x, y, zz in verts: blob += struct.pack("<3f", x - cx, y - cy, zz - z0)
        off_i = len(blob)
        for a, b, c in tris: blob += struct.pack("<3I", a, b, c)
        parts.append({"filament": f, "colour": colours[(f - 1) % len(colours)][:7], "vertices": len(verts), "triangles": len(tris), "v": off_v, "i": off_i})
    open(out + ".bin", "wb").write(blob)
    json.dump({"size": size, "parts": parts}, open(out + ".json", "w"), indent=1)
    print(out, size, [(p["filament"], p["colour"], p["triangles"]) for p in parts], f"{len(blob)//1024}KB")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
