import json, os, time
from mascot import build_all
from geom import to_trimesh, clean_mesh
from step_faceted import write_faceted_step, verify_step
from export_all import PART_FILE, PKG
from coupon import coupon_parts_print
parts = build_all()
items = []
vols = {}
for k, p in parts.items():
    b = p.body.simplify(0.03)          # STEP copy: faceted, within 0.03 mm of the print mesh
    # pick the lightest cleanup that gives a closed mesh AND a valid OpenCascade solid
    import trimesh
    for digits, eps in ((6, 1e-12), (4, 1e-6), (5, 1e-8)):
        V, F = clean_mesh(b, digits, eps)
        if not trimesh.Trimesh(V, F, process=False).is_watertight:
            continue
        write_faceted_step([("probe", V, F)], "out/_probe.step")
        if all(x.get("valid") for x in verify_step("out/_probe.step")):
            break
    items.append((f"UNIT3D_{PART_FILE[k]}", V, F)); vols[PART_FILE[k]] = round(b.volume(), 2)
path = os.path.join(PKG, "STEP", "UNIT3D_Mascot_assembled_7_parts.step")
t0 = time.time(); write_faceted_step(items, path); print("written", os.path.getsize(path) // 1024, "KB", round(time.time()-t0,1), "s")
t0 = time.time(); rb = verify_step(path); print("readback", round(time.time()-t0,1), "s", rb)
json.dump({"expected_volumes": vols, "readback": rb, "size_kb": os.path.getsize(path) // 1024}, open("out/step_report.json", "w"), indent=1)
print(vols)
