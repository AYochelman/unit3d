"""Magnet test coupon: pocket gauge + two real joint pairs (same Joint code as the figure)."""
import math
import numpy as np
from manifold3d import Manifold as M, CrossSection as CS
from geom import union, box_minmax, text_cs, extrude_z, rrect
import mascot as mz
from mascot import Joint, FONT, MAG_D, MAG_T

ENGRAVE = 0.6


def engrave_top(body, text, x, y, z_top, cap_h=3.6, rot=0.0):
    cs, w = text_cs(text, FONT, cap_h, spacing=0.3)
    cs = cs.translate([-w / 2, -cap_h / 2])
    if rot:
        cs = cs.rotate(rot)
    cs = cs.translate([x, y])
    return body - extrude_z(cs, z_top - ENGRAVE, z_top + 1.0)


def pocket(d, depth, x, y, z_top, segs=96):
    r = d / 2 / math.cos(math.pi / segs)
    c = M.cylinder(depth + 1.0, r, -1.0, segs).translate([x, y, z_top - depth])
    ch = M.cylinder(0.301, r, r + 0.3, segs).translate([x, y, z_top - 0.3])
    return c + ch


def gauge():
    """Bar 70 x 32 x 4: row A = diameters (depth 1.8), row B = depths (diameter 6.25)."""
    W, D, H = 70.0, 40.0, 4.0
    body = M.batch_hull([extrude_z(rrect(W, D, 3.0).offset(-0.4), 0, 0.4), extrude_z(rrect(W, D, 3.0), 0.4, H)])
    xs = [-26, -13, 0, 13, 26]
    diams = [6.15, 6.20, 6.25, 6.30, 6.35]
    depths = [1.6, 1.7, 1.8, 1.9, 2.0]
    yA, yB = 7.0, -7.0
    for x, d in zip(xs, diams):
        body = body - pocket(d, 1.8, x, yA, H)
        body = engrave_top(body, f"{int(round(d * 100)) % 100:02d}", x, yA + 6.9, H, 3.2)
    for x, h in zip(xs, depths):
        body = body - pocket(6.25, h, x, yB, H)
        body = engrave_top(body, f"{int(round(h * 10))}", x, yB - 6.9, H, 3.2)
    body = engrave_top(body, "D", -32.0, yA, H, 3.0)
    body = engrave_top(body, "H", -32.0, yB, H, 3.0)
    return body


def joint_pairs():
    """Pair 1 = vertical joint (legs / neck / cap style). Pair 2 = side joint (arm style)."""
    out = {}
    # ---- pair 1: male upright (key up), female upright with socket on the PLATE (bridged), like torso/head/cap
    J1 = Joint("test-vertical", (4.0, 0, 10.2), (0, 0, 1), (1, 0, 0), 10, 9, 2.5, male="m1", female="f1", region=30)
    m1 = box_minmax((-13, -9, 0), (13, 9, 8.0 + 0.5))
    f1 = box_minmax((-13, -9, 8.0), (13, 9, 16.3))
    m1 = ((m1 - J1.male_cut()) + J1.boss()) - J1.male_pocket()
    f1 = (f1 - J1.female_cut()) - J1.socket() - J1.female_pocket()
    m1 = engrave_top(m1, "1M", -7.0, 0.0, 8.0, 3.6, 90)
    f1 = engrave_top(f1, "1F", 0.0, 0.0, 16.3, 4.0)
    out["m1"], out["f1"], out["J1"] = m1, f1, J1
    # ---- pair 2: female upright with socket in a side wall (like torso arm sockets);
    #              male lies on its flat face with the key flush to the plate (like the arms)
    J2 = Joint("test-side", (1.9, -2.1, 10.0), (1, 0, 0), (0, 0, 1), 10, 8.8, 2.5, male="m2", female="f2", region=30,
               headroom_dir=(0, 0, 1))
    f2 = box_minmax((0.0, -11.0, 0.0), (14.0, 8.0, 20.0))
    m2 = box_minmax((-16.0, -11.0, 1.0), (0.5, 2.3, 19.0))
    m2 = ((m2 - J2.male_cut()) + J2.boss()) - J2.male_pocket()
    f2 = (f2 - J2.female_cut()) - J2.socket() - J2.female_pocket()
    f2 = engrave_top(f2, "2F", 7.0, -1.5, 20.0, 3.6, 90)
    out["m2"], out["f2"], out["J2"] = m2, f2, J2
    return out


def coupon_parts_print():
    """Return list of (name, manifold in print pose with z0=0, plate xy)."""
    g = gauge()
    jp = joint_pairs()
    m1 = jp["m1"]
    f1 = jp["f1"].translate([0, 0, -8.3])
    f2 = jp["f2"]
    # m2: flat face y=+3 down -> (x, y, z) -> (x, z, -y) then lift
    R = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0]], float)
    m2 = jp["m2"].transform(R)
    m2 = m2.translate([0, 0, -m2.bounding_box()[2]])
    m2 = engrave_top(m2, "2M", -9.0, m2.bounding_box()[1] + 9.0 if False else 10.0, m2.bounding_box()[5], 3.6, 0)
    items = [("gauge", g), ("m1", m1), ("f1", f1), ("m2", m2), ("f2", f2)]
    res = []
    for n, m in items:
        bb = m.bounding_box()
        res.append((n, m.translate([-(bb[0] + bb[3]) / 2, -(bb[1] + bb[4]) / 2, -bb[2]])))
    return res, jp


COUPON_LAYOUT = {"gauge": (100, 155), "m1": (75, 105), "f1": (110, 105), "m2": (75, 72), "f2": (112, 72)}


def coupon_checks():
    jp = joint_pairs()
    res = {}
    for key, (mk, fk) in (("J1", ("m1", "f1")), ("J2", ("m2", "f2"))):
        J = jp[key]
        mm, fm = J.magnets()
        res[J.name] = {
            "parts_overlap_mm3": round((jp[mk] ^ jp[fk]).volume(), 4),
            "parts_min_gap_mm": round(jp[mk].min_gap(jp[fk], 2.0), 3),
            "magnet_gap_mm": round(mm.min_gap(fm, 1.0), 4),
            "magnet_in_wrong_part_mm3": round((mm ^ jp[mk]).volume() + (fm ^ jp[fk]).volume(), 4),
        }
    return res


if __name__ == "__main__":
    items, jp = coupon_parts_print()
    for n, m in items:
        bb = m.bounding_box()
        print(n, "vol %.1f" % m.volume(), "genus", m.genus(), "shells", len(m.decompose()), "size", np.round([bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]], 2))
    print(coupon_checks())
