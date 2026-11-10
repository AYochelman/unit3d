"""Geometric verification of the real meshes. Writes out/checks.json and prints a summary."""
import json, math, itertools
import numpy as np
import trimesh
from manifold3d import Manifold as M, CrossSection as CS
from geom import to_trimesh, union
from mascot import (build_all, JOINTS, COLOR_NAME, MAG_D, MAG_T, POCKET_D, POCKET_DEPTH, FIG_TOP, Part)
from orient import pose_matrix

LAYER = 0.12
LINE = 0.42


def mesh_report(m):
    t = to_trimesh(m)
    return {
        "watertight": bool(t.is_watertight),
        "winding_consistent": bool(t.is_winding_consistent),
        "is_volume": bool(t.is_volume),
        "shells": int(len(m.decompose())),
        "genus": int(m.genus()),
        "triangles": int(len(t.faces)),
        "volume_mm3": round(float(m.volume()), 2),
    }


def apply4(m, M4):
    return m.transform(M4[:3, :])


def local(m, j):
    """Transform a world solid into the joint's local frame (z along axis, magnets meet at z=0)."""
    T = np.vstack([j.T, [0, 0, 0, 1]])
    Ti = np.linalg.inv(T)
    return m.transform(Ti[:3, :])


def pocket_measure(body_local, sign):
    """Measure the pocket in local frame. sign=-1 male (pocket opens toward +z, floor below), +1 female."""
    res = {}
    zs = np.arange(0.0, 3.0, 0.01)
    diam_mid = None
    floor = None
    for z in zs:
        zz = sign * z + (-0.2 if sign < 0 else 0.2)  # start at the pocket mouth plane
        cs = body_local.slice(zz)
        # find hole contour around origin: area of region within r<4 that is EMPTY
        probe = CS.circle(4.0, 180)
        solid_in = (cs ^ probe).area()
        empty = probe.area() - solid_in
        if empty < 0.5:
            floor = z
            break
        d_eq = 2 * math.sqrt(empty / math.pi)
        if abs(z - 0.9) < 0.006:
            diam_mid = d_eq
    res["diameter_at_mid_depth_mm"] = round(diam_mid, 3) if diam_mid else None
    res["depth_mm"] = round(floor, 2) if floor is not None else None
    return res


def thin_feature_scan(m, name):
    """Slice at layer centres; morphological opening removes features < 2 line widths (0.84 mm)
    and < 1 line width (0.42 mm). Returns lost area statistics."""
    bb = m.bounding_box()
    z = LAYER / 2
    lost1, lost2, total = 0.0, 0.0, 0.0
    worst = []
    while z < bb[5]:
        cs = m.slice(z)
        a = cs.area()
        if a > 0:
            o1 = cs.offset(-LINE / 2).offset(LINE / 2)
            o2 = cs.offset(-LINE).offset(LINE)
            l1 = max(0.0, a - o1.area())
            l2 = max(0.0, a - o2.area())
            lost1 += l1; lost2 += l2; total += a
            worst.append((l1, round(z, 2)))
        z += LAYER
    worst.sort(reverse=True)
    return {"lost_below_1_line_pct": round(100 * lost1 / max(total, 1e-9), 3),
            "lost_below_2_lines_pct": round(100 * lost2 / max(total, 1e-9), 3),
            "worst_layers_z(lost<1line mm2)": [(round(w, 3), zz) for w, zz in worst[:3]]}


def overhang_report(m):
    t = to_trimesh(m)
    n = t.face_normals
    c = t.triangles_center
    a = t.area_faces
    ang = np.degrees(np.arcsin(np.clip(-n[:, 2], -1, 1)))  # 0 = vertical wall, 90 = ceiling
    off_bed = c[:, 2] > 0.25
    res = {}
    for th in (50, 60, 75):
        sel = off_bed & (ang > th)
        res[f"area_over_{th}deg_mm2"] = round(float(a[sel].sum()), 1)
    # cluster ceilings (> 75 deg) -> these are bridges or real overhangs
    sel = np.where(off_bed & (ang > 75))[0]
    clusters = []
    if len(sel):
        sub = t.submesh([sel], append=True)
        for comp in sub.split(only_watertight=False):
            if comp.area < 0.5:
                continue
            bb = comp.bounds
            clusters.append({"z": round(float(bb[0][2]), 2), "area_mm2": round(float(comp.area), 1),
                             "xy_size_mm": [round(float(bb[1][0] - bb[0][0]), 1), round(float(bb[1][1] - bb[0][1]), 1)]})
    clusters.sort(key=lambda d: -d["area_mm2"])
    res["ceilings_gt75deg"] = clusters[:12]
    return res


def layer_overhang_scan(m, step=0.25):
    """Layer-to-layer test in print pose: material that sticks out more than `step` mm beyond the
    previous layer (0.25 mm per 0.12 mm layer ~ 64 deg from vertical) and is not on the plate."""
    bb = m.bounding_box()
    z = LAYER / 2
    prev, found = None, []
    while z < bb[5]:
        cs = m.slice(z)
        if prev is not None:
            ov = cs - prev.offset(step)
            a = ov.area()
            if a > 0.3:
                b = ov.bounds()
                found.append({"z": round(z, 2), "area_mm2": round(a, 2), "size_mm": [round(b[2] - b[0], 1), round(b[3] - b[1], 1)]})
        prev = cs
        z += LAYER
    return found


def run():
    parts = build_all()
    out = {"parts": {}, "joints": [], "interference": [], "assembled_height_mm": None}
    # ---- meshes
    for k, p in parts.items():
        vols = p.color_volumes()
        r = {"body": mesh_report(p.body), "colours": {COLOR_NAME[c]: mesh_report(v) for c, v in vols.items()}}
        r["colour_volume_sum_matches_body"] = abs(sum(v.volume() for v in vols.values()) - p.body.volume()) < 0.01
        M4 = pose_matrix(k, p.body)
        pb = apply4(p.body, M4)
        bb = pb.bounding_box()
        r["print_bbox_mm"] = [round(bb[3] - bb[0], 1), round(bb[4] - bb[1], 1), round(bb[5] - bb[2], 1)]
        r["thin_features"] = {COLOR_NAME[c]: thin_feature_scan(apply4(v, M4), k) for c, v in vols.items()}
        r["overhangs"] = overhang_report(pb)
        r["layer_overhangs"] = layer_overhang_scan(pb)
        out["parts"][k] = r
    # ---- assembled height
    lo = min(p.body.bounding_box()[2] for p in parts.values())
    hi = max(p.body.bounding_box()[5] for p in parts.values())
    out["assembled_height_mm"] = round(hi - lo, 3)
    # ---- interference between every pair in the assembled (magnets-touching) pose
    names = list(parts)
    for a, b in itertools.combinations(names, 2):
        v = (parts[a].body ^ parts[b].body).volume()
        gap = parts[a].body.min_gap(parts[b].body, 3.0)
        out["interference"].append({"a": a, "b": b, "overlap_mm3": round(v, 4), "min_gap_mm": round(gap, 3)})
    # ---- joints
    for key, j in JOINTS.items():
        male, female = parts[j.male].body, parts[j.female].body
        mm, fm = j.magnets()
        d = j.info()
        d["male_magnet_overlap_with_male_part_mm3"] = round((mm ^ male).volume(), 4)
        d["female_magnet_overlap_with_female_part_mm3"] = round((fm ^ female).volume(), 4)
        d["male_magnet_overlap_with_female_part_mm3"] = round((mm ^ female).volume(), 4)
        d["female_magnet_overlap_with_male_part_mm3"] = round((fm ^ male).volume(), 4)
        d["magnets_touch_gap_mm"] = round(mm.min_gap(fm, 1.0), 4)
        d["magnets_overlap_mm3"] = round((mm ^ fm).volume(), 4)
        d["parts_gap_mm"] = round(male.min_gap(female, 2.0), 3)
        # orientation keying: the key fits the socket as designed, but collides when turned 180 deg
        Tm = np.vstack([j.T, [0, 0, 0, 1]])
        A = Tm @ np.diag([-1.0, -1.0, 1.0, 1.0]) @ np.linalg.inv(Tm)
        d["key_vs_socket_overlap_correct_mm3"] = round((j.boss() ^ female).volume(), 4)
        d["key_vs_socket_overlap_turned_180_mm3"] = round((j.boss().transform(A[:3, :]) ^ female).volume(), 2)
        d["male_pocket_measured"] = pocket_measure(local(male, j), -1)
        d["female_pocket_measured"] = pocket_measure(local(female, j), +1)
        # key engagement depth into socket
        d["key_engagement_mm"] = round((j.z_boss_top) - (j.z_fem_rim), 3)
        # magnet protrusion above the face it sits in
        d["magnet_protrusion_mm"] = round(MAG_T - d["male_pocket_measured"]["depth_mm"], 3) if d["male_pocket_measured"]["depth_mm"] else None
        out["joints"].append(d)
    # ---- left/right legs cannot be swapped (mirrored key corner)
    jr, jl = JOINTS["legR"], JOINTS["legL"]
    out["leg_swap_blocked_overlap_mm3"] = {
        "right_key_in_left_socket": round((jr.boss().translate(list(jl.O - jr.O)) ^ parts["torso"].body).volume(), 2),
        "left_key_in_right_socket": round((jl.boss().translate(list(jr.O - jl.O)) ^ parts["torso"].body).volume(), 2)}
    # ---- text: minimum stroke width by erosion (first radius where a stroke breaks apart / vanishes)
    t = parts["torso"]
    from geom import text_cs
    from mascot import FONT
    cs, _ = text_cs("UNIT3D", FONT, t.text["cap_height_mm"], spacing=0.35)
    n0 = len(cs.decompose())
    a0 = cs.area()
    min_stroke = None
    for r in np.arange(0.2, 1.5, 0.025):
        e = cs.offset(-r)
        if len(e.decompose()) != n0:
            min_stroke = round(2 * r, 2)
            break
    out["text"] = dict(t.text, min_stroke_mm=min_stroke, lines_at_0p42=round(min_stroke / LINE, 1) if min_stroke else None)
    out["cap_logo"] = parts["cap"].logo
    return out, parts


if __name__ == "__main__":
    res, parts = run()
    with open("out/checks.json", "w") as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    print("assembled height", res["assembled_height_mm"])
    for k, r in res["parts"].items():
        b = r["body"]
        print(f"{k:6s} watertight={b['watertight']} shells={b['shells']} vol={b['volume_mm3']} bbox={r['print_bbox_mm']} sum_ok={r['colour_volume_sum_matches_body']}")
        for c, tf in r["thin_features"].items():
            print(f"   {c:8s} <1line {tf['lost_below_1_line_pct']}%  <2lines {tf['lost_below_2_lines_pct']}%  worst {tf['worst_layers_z(lost<1line mm2)'][:2]}")
        print("   layer overhangs:", r["layer_overhangs"])
    print("interference (nonzero):", [i for i in res["interference"] if i["overlap_mm3"] > 0.0005])
    print("min gaps:", [(i["a"], i["b"], i["min_gap_mm"]) for i in res["interference"] if i["min_gap_mm"] < 1.0])
    for j in res["joints"]:
        print(j["joint"], "touch", j["magnets_touch_gap_mm"], "ovl", j["magnets_overlap_mm3"], "magInPart", j["male_magnet_overlap_with_male_part_mm3"], j["female_magnet_overlap_with_female_part_mm3"],
              "cross", j["male_magnet_overlap_with_female_part_mm3"], j["female_magnet_overlap_with_male_part_mm3"], "gap", j["parts_gap_mm"],
              "pockets", j["male_pocket_measured"], j["female_pocket_measured"], "engage", j["key_engagement_mm"],
              "key ok/180", j["key_vs_socket_overlap_correct_mm3"], j["key_vs_socket_overlap_turned_180_mm3"])
