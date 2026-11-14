"""Estimate AMS filament changes per plate by slicing the colour volumes at 0.12 mm."""
import json, re
from mascot import build_all, COLOR_NAME
from orient import PLATES, pose_matrix
parts = build_all()
posed = {}
for k, p in parts.items():
    M4 = pose_matrix(k, p.body)
    posed[k] = {c: v.transform(M4[:3, :]) for c, v in p.color_volumes().items()}
res = {}
for pi, (name_en, name_he, items) in enumerate(PLATES):
    vols = {}
    for k, x, y in items:
        if k == "coupon":
            continue
        for c, v in posed[k].items():
            vols.setdefault(c, []).append(v)
    if not vols:
        res[name_en] = {"layers": None, "swaps": 0, "colours": ["Cream"]}
        continue
    zmax = max(v.bounding_box()[5] for vs in vols.values() for v in vs)
    z, last, swaps, layers, multi = 0.06, None, 0, 0, 0
    while z < zmax:
        present = [c for c, vs in vols.items() if any(v.slice(z).area() > 0.05 for v in vs)]
        if present:
            layers += 1
            k = len(present)
            if k > 1:
                multi += 1
            # printer keeps the current filament first, then the others (one change per extra colour)
            swaps += (k - 1) + (0 if last in present or last is None else 1)
            others = [c for c in present if c != last]
            last = others[-1] if others else last
        z += 0.12
    gc = open(f"out/slice/plate_{pi+1}.gcode").read()
    cm3 = re.search(r"; filament used \[cm3\] = ([\d.]+)", gc)
    res[name_en] = {"layers": layers, "multicolour_layers": multi, "est_filament_changes": swaps,
                    "colours": sorted(COLOR_NAME[c] for c in vols),
                    "sliced_material_g_without_purge": round(float(cm3.group(1)) * 1.24, 1) if cm3 else None}
    print(name_en, res[name_en])
gc = open("out/slice/plate_1.gcode").read(); cm3 = re.search(r"; filament used \[cm3\] = ([\d.]+)", gc)
res["Plate 1 - Magnet test coupon"]["sliced_material_g_without_purge"] = round(float(cm3.group(1)) * 1.24, 1)
json.dump(res, open("out/swaps.json", "w"), indent=1)
