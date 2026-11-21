"""Independent checker emulating the parts of BambuStudio's 3mf import that can reject / mis-load a file."""
import json, math, os, re, sys, zipfile
import xml.etree.ElementTree as ET
import numpy as np

NS = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02",
      "p": "http://schemas.microsoft.com/3dmanufacturing/production/2015/06",
      "r": "http://schemas.openxmlformats.org/package/2006/relationships"}
PUUID = "{%s}UUID" % NS["p"]; PPATH = "{%s}path" % NS["p"]

def check(path, expect=None, base_json=None):
    errs, info = [], {}
    z = zipfile.ZipFile(path)
    names = z.namelist()
    info["entries"] = names
    # 1. every xml-ish entry parses
    for n in names:
        if n.endswith((".model", ".rels", ".xml", ".config")) and not n.endswith("project_settings.config"):
            try: ET.fromstring(z.read(n))
            except ET.ParseError as e: errs.append(f"XML parse error in {n}: {e}")
    ps = json.loads(z.read("Metadata/project_settings.config"))
    # 2. relationships (_handle_start_relationship)
    rels = ET.fromstring(z.read("_rels/.rels"))
    start = [r.get("Target") for r in rels if r.get("Type", "").startswith("http://schemas.microsoft.com/3dmanufacturing/") and r.get("Type").endswith("3dmodel")]
    if not start: errs.append("no start part")
    start = start[0]
    sub_rels_name = "3D/_rels/3dmodel.model.rels"
    subpaths = [r.get("Target") for r in ET.fromstring(z.read(sub_rels_name))] if sub_rels_name in names else []
    for t in [r.get("Target") for r in rels] + subpaths:
        if t.lstrip("/") not in names: errs.append(f"relationship target missing: {t}")
    # 3. sub models
    meshes = {}
    for sp in subpaths:
        root = ET.fromstring(z.read(sp.lstrip("/")))
        for o in root.find("m:resources", NS).findall("m:object", NS):
            if o.get("type") not in ("model", "other"): errs.append(f"invalid object type {o.get('type')} in {sp}")
            key = (sp, int(o.get("id")))
            if key in meshes: errs.append(f"duplicate object id {key}")
            vs = [(float(v.get("x")), float(v.get("y")), float(v.get("z"))) for v in o.iter("{%s}vertex" % NS["m"])]
            ts = [(int(t.get("v1")), int(t.get("v2")), int(t.get("v3"))) for t in o.iter("{%s}triangle" % NS["m"])]
            if not ts: errs.append(f"found no triangles in object {key}")
            if ts and (min(min(t) for t in ts) < 0 or max(max(t) for t in ts) >= len(vs)): errs.append(f"invalid vertex id in {key}")
            meshes[key] = (np.array(vs), np.array(ts), o.get("type"), o.get(PUUID))
    # 4. root model
    root = ET.fromstring(z.read(start.lstrip("/")))
    md = {m.get("name"): (m.text or "") for m in root.findall("m:metadata", NS)}
    app = md.get("Application", "")
    if not app.startswith("BambuStudio-"): errs.append("Application does not start with BambuStudio- -> geometry only")
    info["application"] = app
    info["3mfVersion"] = md.get("BambuStudio:3mfVersion")
    objs = {}
    for o in root.find("m:resources", NS).findall("m:object", NS):
        comps = []
        for c in o.iter("{%s}component" % NS["m"]):
            key = (c.get(PPATH), int(c.get("objectid")))
            if key not in meshes: errs.append(f"component points to missing sub object {key}")
            tr = [float(x) for x in c.get("transform").split()]
            comps.append((key, tr))
        objs[int(o.get("id"))] = dict(uuid=o.get(PUUID), comps=comps)
    items = []
    for it in root.find("m:build", NS).findall("m:item", NS):
        oid = int(it.get("objectid"))
        if oid not in objs: errs.append(f"build item for missing object {oid}")
        items.append((oid, [float(x) for x in it.get("transform").split()]))
    # 5. model_settings
    ms = ET.fromstring(z.read("Metadata/model_settings.config"))
    ms_objs = {}
    for o in ms.findall("object"):
        oid = int(o.get("id"))
        meta = {m.get("key"): m.get("value") for m in o.findall("metadata") if m.get("key")}
        parts = []
        for p in o.findall("part"):
            pm = {m.get("key"): m.get("value") for m in p.findall("metadata")}
            stat = p.find("mesh_stat")
            parts.append(dict(id=int(p.get("id")), subtype=p.get("subtype"), meta=pm, face_count=int(stat.get("face_count"))))
        ms_objs[oid] = dict(meta=meta, parts=parts)
        if oid not in objs: errs.append(f"model_settings object {oid} not in model")
        comp_ids = [k[1] for k, _ in objs.get(oid, {}).get("comps", [])]
        if [p["id"] for p in parts] != comp_ids: errs.append(f"object {oid}: part ids {[p['id'] for p in parts]} != component ids {comp_ids}")
        for p, (key, _) in zip(parts, objs.get(oid, {}).get("comps", [])):
            mesh = meshes.get(key)
            if mesh is not None:
                if len(mesh[1]) != p["face_count"]: errs.append(f"face_count mismatch {key}")
                if (mesh[2] == "model") != (p["subtype"] == "normal_part"): errs.append(f"type/subtype mismatch {key}")
    plates = []
    for pl in ms.findall("plate"):
        pm = {m.get("key"): m.get("value") for m in pl.findall("metadata")}
        inst = []
        for mi in pl.findall("model_instance"):
            im = {m.get("key"): m.get("value") for m in mi.findall("metadata")}
            inst.append(int(im["object_id"]))
            if int(im["object_id"]) not in objs: errs.append(f"plate instance refers to missing object {im['object_id']}")
        for k in ("thumbnail_file", "thumbnail_no_light_file", "top_file", "pick_file"):
            if k in pm and pm[k] not in names: errs.append(f"plate {pm['plater_id']} {k} missing in archive")
        plates.append(dict(id=int(pm["plater_id"]), name=pm.get("plater_name"), objects=inst))
    if sorted(p["id"] for p in plates) != list(range(1, len(plates) + 1)): errs.append("plater_id not 1..N")
    # 6. plate assignment the way PartPlateList::reload_all_objects does it (first plate whose box intersects)
    pa = [(0, 0), (1, 1), (1, 0), (0, 1)]
    pts = [tuple(float(c) for c in p.split("x")) for p in ps["printable_area"]]
    W = max(p[0] for p in pts) - min(p[0] for p in pts); D = max(p[1] for p in pts) - min(p[1] for p in pts)
    n = len(plates); v = math.sqrt(n); r = round(v); cols = r + 1 if v > r else r
    boxes = []
    for i in range(n):
        ox = (i % cols) * W * 1.2; oy = -(i // cols) * D * 1.2
        boxes.append((ox, oy, ox + W, oy + D))
    assigned = {}
    for oid, tr in items:
        lo, hi = np.full(3, np.inf), np.full(3, -np.inf)
        for (key, ctr), part in zip(objs[oid]["comps"], ms_objs[oid]["parts"]):
            if part["subtype"] != "normal_part": continue
            vs = meshes[key][0] + np.array(ctr[9:12]) + np.array(tr[9:12])
            lo = np.minimum(lo, vs.min(0)); hi = np.maximum(hi, vs.max(0))
        got = None
        for i, b in enumerate(boxes):
            if lo[0] <= b[2] and hi[0] >= b[0] and lo[1] <= b[3] and hi[1] >= b[1]:
                got = i + 1; break
        inside = got is not None and lo[0] >= boxes[got-1][0] and hi[0] <= boxes[got-1][2] and lo[1] >= boxes[got-1][1] and hi[1] <= boxes[got-1][3]
        declared = [p["id"] for p in plates if oid in p["objects"]]
        assigned[oid] = dict(geometric_plate=got, declared_plate=declared, fully_inside=bool(inside), min_z=float(lo[2]), bbox=(lo.round(3).tolist(), hi.round(3).tolist()))
        if declared != [got]: errs.append(f"object {oid}: geometric plate {got} != declared {declared}")
        if not inside: errs.append(f"object {oid} not fully inside its plate")
        if abs(lo[2]) > 1e-6: errs.append(f"object {oid} min z {lo[2]} != 0")
    info["plate_assignment"] = assigned
    # 7. project settings consistency (PresetBundle::load_config_file_config / load_external_preset)
    def isstr(x): return isinstance(x, str)
    for k, val in ps.items():
        if not (isstr(val) or (isinstance(val, list) and all(isstr(x) for x in val))): errs.append(f"project key {k} not str/list[str]")
    nf = len(ps["filament_colour"])
    fev, fsi = ps["filament_extruder_variant"], ps["filament_self_index"]
    if len(fev) != len(fsi) or len(fev) < nf: errs.append("filament_extruder_variant / filament_self_index inconsistent -> RuntimeError 'Invalid configuration file'")
    if len(ps["filament_settings_id"]) != nf: errs.append("filament_settings_id size")
    if ps.get("different_settings_to_system") and len(ps["different_settings_to_system"]) != nf + 2: errs.append("different_settings_to_system size != nf+2")
    if ps.get("printer_model") != "Bambu Lab P2S": errs.append("printer_model")
    if len(ps["nozzle_diameter"]) > 1 and len(ps.get("extruder_type", [])) != len(ps["nozzle_diameter"]): errs.append("check_project_config fails")
    if base_json:
        b = json.load(open(base_json))
        sets = b["sets"]
        nvar = len(ps["print_extruder_variant"]); npv = len(ps["printer_extruder_variant"])
        for k in sets["print_options_with_variant"]:
            if k in ps and len(ps[k]) != nvar: errs.append(f"print variant key {k} has {len(ps[k])} != {nvar}")
        for k in sets["printer_options_with_variant_1"]:
            if k in ps and len(ps[k]) != npv: errs.append(f"printer variant key {k} has {len(ps[k])} != {npv}")
        for k in sets["printer_options_with_variant_2"]:
            if k in ps and len(ps[k]) != 2 * npv: errs.append(f"printer variant2 key {k} has {len(ps[k])}")
        for k in sets["filament_options_with_variant"]:
            if k in ps and len(ps[k]) != len(fev): errs.append(f"filament variant key {k} has {len(ps[k])} != {len(fev)}")
        # different process keys must equal the system preset value except for listed keys
        diff = set(ps.get("different_settings_to_system", [""])[0].split(";")) - {""}
        for k, sysv in b["process"].items():
            if k in ps and k not in diff and ps[k] != sysv: errs.append(f"process key {k} differs from system but not listed")
        fil = set(sets["filament_options"])
        for k, sysv in b["printer"].items():
            if k in ps and k not in fil and ps[k] != sysv: errs.append(f"printer key {k} differs from system")
        info["process_diff"] = sorted(diff)
        missing = {t: sorted(set(sets[t + "_options"]) - set(ps)) for t in ("print", "filament", "printer")}
        info["preset_keys_missing_in_file(filled from defaults at load)"] = missing
    info["plates"] = plates
    info["objects"] = {oid: dict(name=o["meta"].get("name"), extruder=o["meta"].get("extruder"),
                                 parts=[(p["id"], p["subtype"], p["meta"].get("extruder"), p["face_count"]) for p in o["parts"]]) for oid, o in ms_objs.items()}
    info["n_project_keys"] = len(ps)
    return errs, info

if __name__ == "__main__":
    errs, info = check(sys.argv[1], base_json=sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(info, indent=1, default=str)[:6000])
    print("ERRORS:" if errs else "NO ERRORS", *errs, sep="\n  ")
