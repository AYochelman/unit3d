"""Build everything and write the delivery package (STL, 3MF, previews, thumbnails)."""
import io, json, os, shutil, sys
import numpy as np
import trimesh
from PIL import Image

from geom import to_trimesh
from mascot import build_all, FILAMENTS, COLOR_NAME, JOINTS, CREAM
from orient import ORIENT, PLATES, pose_matrix
from coupon import coupon_parts_print, COUPON_LAYOUT
from viz import export_glb, render
import bambu3mf

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.join(HERE, "out", "UNIT3D_Mascot_P2S")
COLS = {f["slot"]: f["color"] for f in FILAMENTS}
PART_FILE = {"torso": "torso_chest_shell", "leg_R": "leg_right", "leg_L": "leg_left", "arm_R": "arm_right_peace",
             "arm_L": "arm_left_fist", "head": "head", "cap": "cap"}
PART_EN = {"torso": "Torso (chest shell)", "leg_R": "Leg R", "leg_L": "Leg L", "arm_R": "Arm R (peace)",
           "arm_L": "Arm L (fist)", "head": "Head", "cap": "Cap"}

GLOBAL = {
    "layer_height": "0.12",
    "wall_loops": "4",
    "sparse_infill_density": "15%",
    "sparse_infill_pattern": "gyroid",
    "outer_wall_speed": "40",
    "enable_support": "0",          # every part is designed self-supporting (see checks.json overhangs)
    "brim_type": "auto_brim",
}
OBJ_SETTINGS = {
    "layer_height": "0.12", "wall_loops": "4", "sparse_infill_density": "15%", "sparse_infill_pattern": "gyroid",
    "outer_wall_speed": "40", "enable_support": "0", "brim_type": "auto_brim",
}
WIPE_TOWER = (178.0, 178.0)


def write_stl(m, path):
    t = to_trimesh(m)
    t.export(path)
    return t


def mf(m):
    t = to_trimesh(m)
    return np.asarray(t.vertices), np.asarray(t.faces)


def main():
    if os.path.exists(PKG):
        shutil.rmtree(PKG)
    for d in ("STL/parts", "STL/by_color", "STL/assembled_pose", "STL/coupon", "images", "preview", "source", "docs", "STEP"):
        os.makedirs(os.path.join(PKG, d), exist_ok=True)

    parts = build_all()
    posed = {}       # name -> dict(body, vols{color: manifold}) in print pose
    for k, p in parts.items():
        M4 = pose_matrix(k, p.body)
        T = M4[:3, :]
        vols = p.color_volumes()
        posed[k] = {"body": p.body.transform(T), "vols": {c: v.transform(T) for c, v in vols.items()}, "he": p.he}
        write_stl(posed[k]["body"], os.path.join(PKG, "STL/parts", f"{PART_FILE[k]}.stl"))
        write_stl(p.body, os.path.join(PKG, "STL/assembled_pose", f"{PART_FILE[k]}__assembled.stl"))
        for c, v in posed[k]["vols"].items():
            write_stl(v, os.path.join(PKG, "STL/by_color", f"{PART_FILE[k]}__AMS{c}_{COLOR_NAME[c].lower()}.stl"))

    citems, _ = coupon_parts_print()
    coupon = dict(citems)
    for n, m in citems:
        write_stl(m, os.path.join(PKG, "STL/coupon", f"coupon_{n}.stl"))

    # ---------------- plates -> bambu objects
    def part_object(k, x, y):
        objs = []
        for c in sorted(posed[k]["vols"]):
            v, f = mf(posed[k]["vols"][c])
            objs.append({"name": f"{PART_EN[k]} - {COLOR_NAME[c]}", "vertices": v, "faces": f, "extruder": c,
                         "subtype": "normal_part"})
        st = dict(OBJ_SETTINGS)
        st["flush_into_infill"] = "1"       # purge the colour change into hidden gyroid infill (less waste)
        return {"name": PART_EN[k], "x": x, "y": y, "parts": objs, "settings": st}

    def coupon_object(n, x, y):
        v, f = mf(coupon[n])
        st = dict(OBJ_SETTINGS); st["brim_type"] = "no_brim"
        return {"name": f"Coupon {n}", "x": x, "y": y,
                "parts": [{"name": f"Coupon {n}", "vertices": v, "faces": f, "extruder": CREAM, "subtype": "normal_part"}],
                "settings": st}

    plates = []
    plate_scenes = []
    for (name_en, name_he, items) in PLATES:
        objs, scene = [], []
        for (k, x, y) in items:
            if k == "coupon":
                for n, (cx, cy) in COUPON_LAYOUT.items():
                    objs.append(coupon_object(n, cx, cy))
                    scene.append((coupon[n].translate([cx, cy, 0]), COLS[CREAM]))
            else:
                objs.append(part_object(k, x, y))
                for c, v in posed[k]["vols"].items():
                    scene.append((v.translate([x, y, 0]), COLS[c]))
        plates.append({"name": name_en, "objects": objs, "wipe_tower": WIPE_TOWER})
        plate_scenes.append(scene)

    # bed-fit check
    for pl in plates:
        for o in pl["objects"]:
            vv = np.vstack([p["vertices"] for p in o["parts"]])
            lo = vv.min(0) + [o["x"], o["y"], 0]; hi = vv.max(0) + [o["x"], o["y"], 0]
            assert lo[0] > 2 and lo[1] > 2 and hi[0] < 254 and hi[1] < 254, (o["name"], lo, hi)
            wx, wy = WIPE_TOWER
            assert not (hi[0] > wx - 5 and hi[1] > wy - 5), ("object near prime tower", o["name"], hi)

    # ---------------- thumbnails (real geometry, per plate)
    thumbs = {}
    jobs = []
    for i, sc in enumerate(plate_scenes):
        glb = os.path.join(PKG, "preview", f"plate_{i + 1}.glb")
        export_glb(sc, glb)
        jobs.append(dict(glb=glb, width=512, height=512, background="#22272e",
                         grid=dict(size=256, div=16, cx=128, cz=-128),
                         views=[dict(az=0, el=58, out=os.path.join(PKG, "images", f"plate_{i + 1}_thumb.png"),
                                     target=[118, 112, 0], dist=300, fov=30)]))
    render(jobs, os.path.join(HERE, "out", "jobs_thumbs.json"))
    for i in range(len(plates)):
        with open(os.path.join(PKG, "images", f"plate_{i + 1}_thumb.png"), "rb") as f:
            thumbs[i + 1] = f.read()

    fil = [{"name": f["name"], "color": f["color"], "type": f["type"]} for f in FILAMENTS]
    main3mf = os.path.join(PKG, "UNIT3D_Mascot_P2S_4plates.3mf")
    info = bambu3mf.write_bambu_project(main3mf, plates, fil, GLOBAL, thumbnails=thumbs, project_name="UNIT3D Mascot")
    coupon3mf = os.path.join(PKG, "UNIT3D_Magnet_Test_Coupon_P2S.3mf")
    bambu3mf.write_bambu_project(coupon3mf, [plates[0]], fil, GLOBAL, thumbnails={1: thumbs[1]},
                                 project_name="UNIT3D Magnet Test Coupon")
    with open(os.path.join(HERE, "out", "export_info.json"), "w") as f:
        json.dump({"main": info}, f, indent=1, default=str)
    print("3MF written", main3mf, coupon3mf)
    return parts, posed, coupon, plates


if __name__ == "__main__":
    main()
