import json, os, time
from mascot import build_all
from geom import to_trimesh
from step_faceted import write_faceted_step, verify_step
from export_all import PART_FILE, PKG
from coupon import coupon_parts_print
parts = build_all()
items = []
vols = {}
for k, p in parts.items():
    t = to_trimesh(p.body)
    items.append((f"UNIT3D_{PART_FILE[k]}", t.vertices, t.faces)); vols[PART_FILE[k]] = round(p.body.volume(), 2)
path = os.path.join(PKG, "STEP", "UNIT3D_Mascot_assembled_7_parts.step")
t0 = time.time(); write_faceted_step(items, path); print("written", os.path.getsize(path) // 1024, "KB", round(time.time()-t0,1), "s")
t0 = time.time(); rb = verify_step(path); print("readback", round(time.time()-t0,1), "s", rb)
json.dump({"expected_volumes": vols, "readback": rb, "size_kb": os.path.getsize(path) // 1024}, open("out/step_report.json", "w"), indent=1)
print(vols)
