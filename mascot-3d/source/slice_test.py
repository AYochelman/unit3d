"""Independent slice test with PrusaSlicer CLI (geometry/printability, NOT Bambu)."""
import json, os, re, subprocess
import numpy as np
from mascot import build_all, FILAMENTS
from orient import PLATES, pose_matrix
from coupon import coupon_parts_print, COUPON_LAYOUT
from geom import union, to_trimesh

parts = build_all()
citems, _ = coupon_parts_print(); coupon = dict(citems)
import sys
SUPPORT_THR = sys.argv[1] if len(sys.argv) > 1 else "0"
res = {}
for pi, (name_en, name_he, items) in enumerate(PLATES):
    bodies = []
    for (k, x, y) in items:
        if k == "coupon":
            for n, (cx, cy) in COUPON_LAYOUT.items():
                bodies.append(coupon[n].translate([cx, cy, 0]))
        else:
            M4 = pose_matrix(k, parts[k].body)
            bodies.append(parts[k].body.transform(M4[:3, :]).translate([x, y, 0]))
    stl = f"out/slice/plate_{pi+1}.stl"
    to_trimesh(union(bodies)).export(stl)
    info = subprocess.run(["prusa-slicer", "--info", stl], capture_output=True, text=True, timeout=300).stdout
    gc = f"out/slice/plate_{pi+1}.gcode"
    cmd = ["prusa-slicer", "--export-gcode", "--dont-arrange", "--bed-shape", "0x0,256x0,256x256,0x256",
           "--nozzle-diameter", "0.4", "--layer-height", "0.12", "--first-layer-height", "0.2",
           "--perimeters", "4", "--fill-density", "15%", "--fill-pattern", "gyroid", "--external-perimeter-speed", "40",
           "--support-material", "--support-material-auto", "--support-material-threshold", SUPPORT_THR,
           "--dont-support-bridges", "--filament-type", "PLA", "--temperature", "220", "--bed-temperature", "60",
           "--output", gc, stl]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    txt = open(gc).read() if os.path.exists(gc) else ""
    sup_lines = len(re.findall(r";TYPE:Support material", txt))
    sup_if = len(re.findall(r";TYPE:Support material interface", txt))
    t = re.search(r"; estimated printing time \(normal mode\) = (.+)", txt)
    fil = re.search(r"; filament used \[g\] = ([\d.]+)", txt)
    layers = len(re.findall(r";LAYER_CHANGE", txt))
    mani = re.findall(r"manifold = (\w+)", info)
    res[name_en] = {"slice_ok": r.returncode == 0 and bool(txt), "layers": layers, "support_material_sections": sup_lines,
                    "support_interface_sections": sup_if, "prusa_time_estimate": t.group(1) if t else None,
                    "filament_g": float(fil.group(1)) if fil else None, "manifold": mani,
                    "stderr_tail": (r.stderr or "")[-400:]}
    print(name_en, res[name_en])
json.dump(res, open(f"out/slice/prusa_slice_test_thr{SUPPORT_THR}.json", "w"), indent=1)
