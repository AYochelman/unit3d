"""UNIT3D modular magnetic mascot — parametric source.

Everything is modelled in the ASSEMBLED frame (mm): Z up, figure faces -Y,
figure's right side = -X.  Total height (sole -> cap top) = 120 mm.
Each part = body solid + colour regions; joints are applied to the body, then
colour volumes are computed as disjoint solids that exactly fill the body.

Run:  python3 mascot.py   -> writes out/ (STL per part / per colour, report json)
"""
import math, json, os
import numpy as np
from geom import (M, CS, JoinType, union, box, box_minmax, sphere, ellipsoid, capsule,
                  cyl_between, rbox, rrect, extrude_z, chamfered_prism, frame_matrix,
                  apply_T, text_cs)

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "/home/user/unit3d/public/fonts/rubik-900.ttf"

# ------------------------------------------------------------------ filaments
CREAM, BLACK, MINT, ORANGE = 1, 2, 3, 4
FILAMENTS = [
    {"slot": 1, "name": "Cream",    "color": "#EFE6D2", "type": "PLA", "he": "קרם"},
    {"slot": 2, "name": "Charcoal", "color": "#2A2B2E", "type": "PLA", "he": "שחור/פחם"},
    {"slot": 3, "name": "Mint",     "color": "#36D6A2", "type": "PLA", "he": "מנטה"},
    {"slot": 4, "name": "Orange",   "color": "#F2862E", "type": "PLA", "he": "כתום"},
]
COLOR_NAME = {f["slot"]: f["name"] for f in FILAMENTS}

# ------------------------------------------------------------------ magnets / joints
MAG_D, MAG_T = 6.0, 2.0          # user's magnets
POCKET_D = 6.25                  # starting pocket diameter (adjust after coupon)
POCKET_DEPTH = 1.8               # magnet protrudes 0.2 above the mating face
PROTRUDE = MAG_T - POCKET_DEPTH  # 0.2
BOSS_H = 2.0                     # alignment key height
KEY_CLEAR = 0.20                 # radial clearance key <-> socket
SEAM = 0.30                      # visible gap between mating faces when magnets touch
POCKET_CH = 0.30                 # lead-in chamfer at pocket mouth
BOSS_CH = 0.40                   # lead-in chamfer on key top
RECESS_CH = 0.40                 # lead-in chamfer at socket mouth
# orientation key: one corner of every key/socket is chamfered (mm along each edge), sized so a part
# turned 180 deg collides clearly while the pocket keeps >= 1.4 mm wall
KEY_CORNER_CUT = {"cap-head": 5.0, "head-torso": 6.0, "armR-torso": 3.5, "armL-torso": 3.5,
                  "legR-torso": 3.0, "legL-torso": 3.0}
SAG_HEADROOM = 0.45              # extra room above sideways sockets (bridged ceiling sag)
POCKET_SEGS = 96                 # pocket polygon is circumscribed: its inscribed circle is exactly POCKET_D


def ext_along(cs, e0, e1, axis):
    """Extrude a 2D cross-section (in the plane perpendicular to axis) between e0..e1 along axis.
    axis 'y': 2D (x, z) -> world, extrusion toward -Y as e grows (front of figure).
    axis 'x': 2D (y, z) -> world, extrusion along +X."""
    m = extrude_z(cs, e0, e1)
    if axis == "y":    # (x, y2, e) -> (x, -e, y2)
        T = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0]], float)
    elif axis == "x":  # (y2d, z2d, e) -> (e, y2d, z2d)
        T = np.array([[0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0]], float)
    else:
        raise ValueError
    return m.transform(T)


class Joint:
    """Magnetic joint.  Local frame: z along n (male -> female), magnet contact plane z=0.
    male:  shoulder plane z=-(BOSS_H+PROTRUDE), key up to z=-PROTRUDE, pocket 1.8 deep.
    female: rim plane = male shoulder + SEAM, socket floor z=+PROTRUDE, pocket 1.8 deep."""

    def __init__(self, name, O, n, u, key_w, key_h, key_r, male, female, region=40.0, headroom_dir=None):
        self.name, self.O, self.n, self.u = name, np.array(O, float), np.array(n, float), np.array(u, float)
        # world direction that is "up" while the FEMALE part prints, if the socket axis is horizontal then:
        # the socket gets SAG_HEADROOM of extra room on that side (bridged ceiling may sag a little).
        self.headroom_dir = None if headroom_dir is None else np.array(headroom_dir, float)
        self.key = (key_w, key_h, key_r)
        self.male, self.female = male, female
        self.T = frame_matrix(O, n, u)
        self.region = region
        self.z_male_sh = -(BOSS_H + PROTRUDE)            # -2.2
        self.z_boss_top = -PROTRUDE                       # -0.2
        self.z_fem_rim = self.z_male_sh + SEAM            # -1.9
        self.z_fem_floor = PROTRUDE                       # +0.2
        self.socket_depth = self.z_fem_floor - self.z_fem_rim  # 2.1

    def L(self, m):
        return apply_T(m, self.T)

    def key_cs(self, grow=0.0):
        """Rounded-rectangle key with ONE corner (+u,+v) cut at 45 deg -> fits in a single orientation only."""
        w, h, r = self.key
        base = rrect(w, h, r)
        s = (w / 2 + h / 2) - KEY_CORNER_CUT.get(self.name, 3.0)          # cut line: x + y = s
        keep = CS([np.array([[-300, 300], [-300, -300], [s + 300, -300], [s - 300, 300]])])   # x + y <= s (CCW)
        cs = base ^ keep
        return cs.offset(grow, JoinType.Round) if grow else cs

    # ---- male
    def male_cut(self):
        R = self.region
        return self.L(box_minmax((-R, -R, self.z_male_sh), (R, R, R)))

    def boss(self):
        return self.L(chamfered_prism(self.key_cs(), self.z_male_sh - 0.8, self.z_boss_top, 0.0, BOSS_CH))

    def male_pocket(self):
        r = POCKET_D / 2 / math.cos(math.pi / POCKET_SEGS)
        c = M.cylinder(POCKET_DEPTH + 1.0, r, -1.0, POCKET_SEGS).translate([0, 0, self.z_boss_top - POCKET_DEPTH])
        ch = M.cylinder(POCKET_CH + 0.001, r, r + POCKET_CH, POCKET_SEGS).translate([0, 0, self.z_boss_top - POCKET_CH])
        return self.L(c + ch)

    # ---- female
    def female_cut(self):
        R = self.region
        return self.L(box_minmax((-R, -R, -R), (R, R, self.z_fem_rim)))

    def socket_cs(self, grow):
        cs = self.key_cs(grow)
        if self.headroom_dir is not None:
            R = self.T[:, :3]
            d = R.T @ self.headroom_dir          # into local frame
            dx, dy = d[0] * SAG_HEADROOM, d[1] * SAG_HEADROOM
            cs = CS.batch_hull([cs, cs.translate([dx, dy])])
        return cs

    def socket(self):
        base = extrude_z(self.socket_cs(KEY_CLEAR), self.z_fem_rim - 1.0, self.z_fem_floor)
        lead = M.batch_hull([extrude_z(self.socket_cs(KEY_CLEAR + RECESS_CH), self.z_fem_rim - 1.0, self.z_fem_rim),
                             extrude_z(self.socket_cs(KEY_CLEAR), self.z_fem_rim + RECESS_CH - 0.001, self.z_fem_rim + RECESS_CH)])
        return self.L(base + lead)

    def female_pocket(self):
        r = POCKET_D / 2 / math.cos(math.pi / POCKET_SEGS)
        c = M.cylinder(POCKET_DEPTH + 0.5, r, -1.0, POCKET_SEGS).translate([0, 0, self.z_fem_floor - 0.5])
        return self.L(c)

    # ---- check helpers
    def magnets(self):
        r = MAG_D / 2
        mm = M.cylinder(MAG_T, r).translate([0, 0, -MAG_T])   # male magnet seated on pocket floor
        fm = M.cylinder(MAG_T, r).translate([0, 0, 0.0])      # female magnet
        return self.L(mm), self.L(fm)

    def info(self):
        return {
            "joint": self.name, "male": self.male, "female": self.female,
            "origin_mm": [round(float(v), 3) for v in self.O], "axis": [float(v) for v in self.n],
            "key_mm": list(self.key), "key_height": BOSS_H, "socket_depth": round(self.socket_depth, 3),
            "key_clearance": KEY_CLEAR, "seam": SEAM, "pocket_d": POCKET_D, "pocket_depth": POCKET_DEPTH,
            "magnet_protrusion": round(PROTRUDE, 3),
        }


# ------------------------------------------------------------------ joint layout
LEG_TOP = 25.0                 # leg shoulder plane (male)
TORSO_Z0 = LEG_TOP + SEAM      # 25.3
TORSO_TOP = 73.0               # torso shoulder plane under the head (male)
HEAD_Z0 = TORSO_TOP + SEAM     # 73.3
HEAD_H = 32.0
HEAD_TOP = HEAD_Z0 + HEAD_H    # 105.3 (male shoulder for the cap)
CAP_Z0 = HEAD_TOP + SEAM       # 105.6
FIG_TOP = 120.0
DZ = -1.0                      # torso features were drafted 1 mm higher
J_ARM_Z, J_ARM_Y = 59.5, -1.5
TORSO_HALF_W = 23.0
JOINTS = {
    "cap":   Joint("cap-head",    (0, 0, HEAD_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 14, 11, 3.0, male="head", female="cap"),
    "neck":  Joint("head-torso",  (0, 0, TORSO_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 16, 12, 4.0, male="torso", female="head",
                   headroom_dir=(0, -1, 0)),
    "armR":  Joint("armR-torso",  (-TORSO_HALF_W + 1.9, J_ARM_Y, J_ARM_Z), (1, 0, 0), (0, 0, 1), 11, 9, 2.5,
                   male="arm_R", female="torso", region=14, headroom_dir=(0, 0, 1)),
    "armL":  Joint("armL-torso",  (TORSO_HALF_W - 1.9, J_ARM_Y, J_ARM_Z), (-1, 0, 0), (0, 0, 1), 11, 9, 2.5,
                   male="arm_L", female="torso", region=14, headroom_dir=(0, 0, 1)),
    "legR":  Joint("legR-torso",  (-11.2, 0, LEG_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 10, 9, 2.5, male="leg_R", female="torso",
                   region=12),
    "legL":  Joint("legL-torso",  (11.2, 0, LEG_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (-1, 0, 0), 10, 9, 2.5, male="leg_L", female="torso",
                   region=12),
}
# the arm key's 9 mm side runs along -Y from the frame (n x u); it spans y in [-6, 3] -> flush with arm's flat back.


# ------------------------------------------------------------------ part builders
class Part:
    def __init__(self, name, he, body, base_color, regions):
        self.name, self.he, self.body, self.base_color = name, he, body, base_color
        self.regions = regions  # list of (color, solid) in increasing priority

    def apply_joints(self):
        for j in JOINTS.values():
            if j.male == self.name:
                self.body = (self.body - j.male_cut()) + j.boss()
                self.body = self.body - j.male_pocket()
            if j.female == self.name:
                self.body = self.body - j.female_cut()
                self.body = self.body - j.socket() - j.female_pocket()

    def color_volumes(self):
        """Disjoint solids per colour that exactly tile the body.
        Regions are clipped against each other as RAW solids first (never against an already
        cut body), so no boolean ever sees two nearly-coincident surfaces -> no colour films."""
        vols = {}
        claimed = M()
        for color, reg in reversed(self.regions):   # highest priority first
            eff = reg - claimed
            v = self.body ^ eff
            if not v.is_empty() and v.volume() > 1e-3:
                vols.setdefault(color, []).append(v)
            claimed = claimed + reg
        vols.setdefault(self.base_color, []).append(self.body - claimed)
        out = {}
        for c, vs in vols.items():
            keep = [k for k in union(vs).decompose() if k.volume() > 0.05]
            out[c] = union(keep)
        return out


def build_torso():
    z = lambda v: v + DZ
    shorts = M.batch_hull([extrude_z(rrect(38.6, 28.6, 7.5).offset(-0.5), TORSO_Z0, TORSO_Z0 + 0.5),
                           extrude_z(rrect(38.6, 28.6, 7.5), TORSO_Z0 + 0.5, TORSO_Z0 + 1.0),
                           extrude_z(rrect(36.6, 27.2, 7.0), z(40.4), z(41.0))])
    band = union([M.batch_hull([extrude_z(rrect(36.6, 27.2, 7.0), z(38.6), z(38.7)),
                                extrude_z(rrect(41.6, 31.0, 8.0), z(41.0), z(43.9))]),
                  M.batch_hull([extrude_z(rrect(41.6, 31.0, 8.0), z(43.8), z(43.9)),
                                extrude_z(rrect(40.2, 29.6, 7.3), z(44.6), z(44.6) + 0.01)])])
    vest = M.batch_hull([
        extrude_z(rrect(40.0, 29.4, 7.0), z(44.0), z(44.5)),
        extrude_z(rrect(46.0, 32.0, 6.5), z(51.0), z(66.5)),
        extrude_z(rrect(43.6, 30.6, 7.0), z(69.6), z(69.8)),
        extrude_z(rrect(36.0, 26.0, 7.0), z(72.4), z(72.6)),
    ])
    # hood collar: tilted elliptical torus around the neck (front lower), top clipped by the neck joint
    tor = M.revolve(CS.circle(4.3).translate([11.0, 0.0]), 96).scale([1.12, 1.0, 1.0])
    tor = tor.rotate([-14.0, 0, 0]).translate([0, 1.6, z(71.6)])
    neck = extrude_z(rrect(19.0, 15.0, 5.5), z(69.0), z(75.0)).translate([0, 0.6, 0])
    body = union([shorts, band, vest, tor, neck])

    # quilting grooves (front + back) on the puffer vest
    grooves = []
    for zg in (49.8, 60.4):
        for ys in (-1, 1):
            yy = ys * (16.0 if 51 <= zg <= 66.5 else 15.75)
            grooves.append(M.cube([29.0, 1.1, 1.1], center=True).rotate([45, 0, 0]).translate([0, yy, z(zg)]))
    body = body - union(grooves)
    # separation line between the shorts legs (front/back), shape only
    notch = []
    for ys in (-1, 1):
        yy = ys * 14.15
        notch.append(M.batch_hull([sphere(0.8, (0, yy, TORSO_Z0 - 1)), sphere(0.8, (0, yy, TORSO_Z0 + 5.0))]))
    body = body - union(notch)

    # drawstring cords (cream) + aglets (orange). Colour split = horizontal plane through the cord
    # (full circles in every slice, no crescent slivers).
    cords, tips, tip_regs = [], [], []
    y_front = -16.0
    for xs in (-4.6, 4.6):
        cy = y_front + 0.55
        xb = xs * 1.05
        z_split, t_bot = z(65.9), z(62.8)
        cords.append(capsule((xs, cy, z(70.5)), (xb, cy, z_split - 0.4), 1.15))
        tip = M.batch_hull([cyl_between((xb, cy - 0.15, t_bot + 0.6), (xb, cy - 0.15, z_split), 1.55),
                            sphere(0.45, (xb, cy - 0.15, t_bot - 0.6))])
        tips.append(tip)
        tip_regs.append(box_minmax((xb - 3, cy - 4, t_bot - 3), (xb + 3, cy + 1.5, z_split + 0.3)))
    cords_m, tips_m = union(cords), union(tips)
    body = body + cords_m + tips_m

    # UNIT3D text on the chest: UNIT = cream, 3D = mint; raised 0.5 + inlaid 0.9
    cap_h = 5.6
    cs_all, w_all = text_cs("UNIT3D", FONT, cap_h, spacing=0.35)
    cs_unit, w_unit = text_cs("UNIT", FONT, cap_h, spacing=0.35)
    x0 = -w_all / 2
    zc = z(55.2)
    z_base = zc - cap_h / 2
    cs_all = cs_all.translate([x0, z_base])
    cs_unit_t = cs_unit.translate([x0, z_base])
    cs_3d = cs_all - cs_unit_t.offset(0.05)
    e_in, e_out = 16.0 - 0.9, 16.0 + 0.4
    t_unit = ext_along(cs_unit_t, e_in, e_out, "y")
    t_3d = ext_along(cs_3d, e_in, e_out, "y")
    body = body + t_unit + t_3d
    body = body - box_minmax((-60, -60, -10), (60, 60, TORSO_Z0))   # flat bottom on the plate

    band_reg = box_minmax((-30, -25, z(40.0)), (30, 25, z(44.6)))
    neck_reg = box_minmax((-11.5, -8.4, z(69.0)), (11.5, 9.6, TORSO_TOP + 6))
    tor_reg = M.revolve(CS.circle(4.3 + 0.4).translate([11.0, 0.0]), 96).scale([1.12, 1.0, 1.0]).rotate([-14.0, 0, 0]).translate([0, 1.6, z(71.6)])
    mint_reg = union([band_reg, tor_reg, neck_reg])
    regions = [(CREAM, cords_m), (ORANGE, union(tip_regs)), (CREAM, t_unit), (MINT, t_3d), (MINT, mint_reg)]
    p = Part("torso", "גוף / חזה (Chest Shell)", body, BLACK, regions)
    p.text = {"string": "UNIT3D", "cap_height_mm": cap_h, "width_mm": round(w_all, 2), "raised_mm": 0.4, "inlay_mm": 0.9}
    return p


def build_leg(s):
    name = "leg_R" if s < 0 else "leg_L"
    fx, fy = s * 12.5, -3.6
    lx = s * 11.2
    sole = chamfered_prism(rrect(20.4, 31.0, 8.5).translate([fx, fy]), 0.0, 3.6, 0.5, 0.0)
    stripe = extrude_z(rrect(20.4, 31.0, 8.5).translate([fx, fy]), 3.6, 5.4)
    upper = M.batch_hull([
        extrude_z(rrect(19.0, 29.6, 7.6).translate([fx, fy]), 5.0, 8.0),
        ellipsoid((8.7, 7.4, 4.6), (fx, fy - 6.6, 8.2)),
        extrude_z(rrect(17.0, 17.6, 6.8).translate([fx, fy + 5.4]), 8.0, 15.0),
        ellipsoid((8.2, 8.6, 1.4), (fx, fy + 5.4, 15.0)),
    ])
    sock = extrude_z(rrect(12.4, 11.6, 4.4).translate([lx, 0.0]), 11.0, LEG_TOP + 1.0)
    body = union([sole, stripe, upper, sock])
    # rib ring on the sock (shape only)
    sock_cs = rrect(12.4, 11.6, 4.4).translate([lx, 0.0])
    zg, dg = 21.0, 1.0
    keep = (M.batch_hull([extrude_z(sock_cs.offset(0.6), zg - dg, zg - dg + 0.01), extrude_z(sock_cs.offset(-0.4), zg, zg + 0.01)]) +
            M.batch_hull([extrude_z(sock_cs.offset(-0.4), zg - 0.01, zg), extrude_z(sock_cs.offset(0.6), zg + dg - 0.01, zg + dg)]))
    rib = extrude_z(sock_cs.offset(0.6), zg - dg + 0.005, zg + dg - 0.005) - keep   # V groove, apex inward (45 deg)
    body = body - rib
    # colour boundaries cross the surface steeply (vertical walls), never at grazing angles
    toe = extrude_z(CS.circle(11.5, 96).scale([1.0, 0.82]).translate([fx, fy - 17.4]), 5.4, 30.0)
    collar = extrude_z(rrect(17.4, 16.4, 6.2).translate([lx, 0.4]), 11.0, 40.0)
    sock_reg = box_minmax((lx - 8, -8, 15.6), (lx + 8, 8, 40))
    sole_reg = box_minmax((fx - 15, fy - 20, -1.0), (fx + 15, fy + 20, 3.6))
    stripe_reg = box_minmax((fx - 15, fy - 20, 3.6), (fx + 15, fy + 20, 5.4))
    regions = [(CREAM, toe), (CREAM, collar), (CREAM, sock_reg), (CREAM, sole_reg), (MINT, stripe_reg)]
    he = "רגל ימין" if s < 0 else "רגל שמאל"
    return Part(name, he, body, BLACK, regions)


def flat_back(m, y_cut=3.0):
    return m - box_minmax((-80, y_cut, -10), (80, 40, 160))


def build_arm(s):
    name = "arm_R" if s < 0 else "arm_L"
    zc, yc = J_ARM_Z, J_ARM_Y
    dz = J_ARM_Z - 60.5
    disc = cyl_between((s * 22.0, yc, zc), (s * 26.6, yc, zc), 7.5)
    disc = disc + cyl_between((s * 26.5, yc, zc), (s * 27.4, yc, zc), 7.5, 6.6)
    r_arm = 4.3
    if s < 0:
        P0, P1, P2 = (-25.6, 0.0, 60.2 + dz), (-32.2, 0.0, 52.6 + dz), (-35.6, 0.0, 69.4 + dz)
    else:
        P0, P1, P2 = (25.6, 0.0, 60.0 + dz), (30.6, 0.0, 51.8 + dz), (32.2, 0.0, 44.2 + dz)
    upper = capsule(P0, P1, r_arm)
    fore = capsule(P1, P2, r_arm * 0.97)
    P1a, P2a = np.array(P1), np.array(P2)
    d = P2a - P1a
    cuff = capsule(tuple(P1a + 0.60 * d), tuple(P1a + 0.86 * d), 4.95)
    parts = [disc, upper, fore, cuff]
    ang = math.degrees(math.atan2(d[0], d[2]))  # lean of the forearm
    if s < 0:
        # peace-sign hand: palm + V fingers + thumb over curled fingers
        palm = rbox((10.4, 8.6, 9.6), 3.2).rotate([0, ang, 0]).translate([-36.6, 0.0, 75.0 + dz])
        fy, sy = 0.8, 1.42
        def finger(a, b, r=2.1):
            c = capsule((a[0], 0, a[1] + dz), (b[0], 0, b[1] + dz), r)
            return c.scale([1, sy, 1]).translate([0, fy, 0])
        idx = finger((-39.2, 78.6), (-43.0, 89.6))
        mid = finger((-35.0, 79.4), (-33.4, 90.8))
        thumb = capsule((-40.0, -2.6, 73.2 + dz), (-35.6, -3.7, 76.2 + dz), 1.9)
        curl = capsule((-37.6, -3.2, 78.4 + dz), (-34.4, -3.2, 78.8 + dz), 1.7)
        hand_parts = [palm, idx, mid, thumb, curl]
    else:
        fist = rbox((10.6, 8.6, 10.2), 3.6).rotate([0, ang, 0]).translate([33.0, 0.0, 38.8 + dz])
        thumb = capsule((31.0, -3.9, 42.2 + dz), (34.6, -4.3, 39.6 + dz), 2.0)
        hand_parts = [fist, thumb]
    body = union(parts + hand_parts)
    if s > 0:
        g = []
        for zz in (36.2, 38.9, 41.6):
            g.append(capsule((38.6, -4.6, zz + dz), (38.6, 2.0, zz + 0.2 + dz), 0.6))
        body = body - union(g)
    body = flat_back(body, 3.0)
    mint_reg = cyl_between((s * 18.0, yc, zc), (s * 27.45, yc, zc), 8.6)
    dn = d / np.linalg.norm(d)
    cuff_reg = cyl_between(tuple(P1a + 0.60 * d - 2.7 * dn), tuple(P1a + 0.86 * d + 2.7 * dn), 6.5)
    regions = [(MINT, mint_reg), (BLACK, cuff_reg)]
    he = "יד ימין (סימן V)" if s < 0 else "יד שמאל (אגרוף)"
    return Part(name, he, body, CREAM, regions)


def build_head():
    z0, z1 = HEAD_Z0, HEAD_TOP
    rl, ru = 7.0, 4.0                      # lower edges / upper edges (upper ones sit under the cap)
    W2, D2 = 24.0, 19.0
    pts = []
    k = math.sqrt(2) - 1                   # 45deg chamfer offset at the back face (print bed when face-up)
    back_pts = []
    for sx in (-1, 1):
        for zz, r in ((z0 + rl, rl), (z1 - ru, ru)):
            xc = sx * (W2 - r)
            pts.append(sphere(r, (xc, -D2 + r, zz)))
            pts.append(sphere(r, (xc, D2 - r, zz)))
            zs = -1 if r == rl else 1
            back_pts.append(sphere(0.15, (xc + sx * r * k, D2 - 0.15, zz + zs * r * k)))
    head = M.batch_hull(pts + back_pts)
    zc = (z0 + z1) / 2
    visor_cs = rrect(34.0, 22.0, 7.0).translate([0, zc - 1.0])
    visor = ext_along(visor_cs, 16.5, 20.2, "y")
    ears, rings = [], []
    ey, ez, er = 1.0, zc - 0.5, 8.6
    for s in (-1, 1):
        ear = cyl_between((s * 22.5, ey, ez), (s * 28.0, ey, ez), er)
        ear = ear + cyl_between((s * 27.9, ey, ez), (s * 28.4, ey, ez), er, er - 0.5)
        tail = ear.scale([1, 1, 1])  # placeholder for clarity
        shifted = cyl_between((s * 17.0, ey + 5.4, ez), (s * 22.6, ey + 5.4, ez), er).scale([1, 1, 1])
        shifted = shifted.translate([0, 0, -ez]).scale([1, 1, 0.62]).translate([0, 0, ez])
        skirt = M.batch_hull([ear, shifted])
        ears.append(skirt)
        ring_cs = CS.circle(7.4) - CS.circle(4.4)
        lo, hi = (27.4, 30.0) if s > 0 else (-30.0, -27.4)
        rings.append(ext_along(ring_cs.translate([ey, ez]), lo, hi, "x"))
    body = union([head, visor] + ears)
    eye_cs = []
    ezc = zc - 2.4
    for ex in (-7.6, 7.6):
        R, w = 4.1, 2.6
        a0, a1 = math.radians(22), math.radians(158)
        outer = [(ex + (R + w / 2) * math.cos(a), ezc + (R + w / 2) * math.sin(a)) for a in np.linspace(a0, a1, 48)]
        inner = [(ex + (R - w / 2) * math.cos(a), ezc + (R - w / 2) * math.sin(a)) for a in np.linspace(a1, a0, 48)]
        band = CS([np.array(outer + inner)])
        caps = CS.circle(w / 2, 40).translate([ex + R * math.cos(a0), ezc + R * math.sin(a0)]) + \
               CS.circle(w / 2, 40).translate([ex + R * math.cos(a1), ezc + R * math.sin(a1)])
        eye_cs.append(band + caps)
    eyes = ext_along(eye_cs[0] + eye_cs[1], 19.2, 21.0, "y")
    regions = [(BLACK, visor), (MINT, eyes), (MINT, union(rings))]
    return Part("head", "ראש", body, CREAM, regions)


def build_cap():
    z0 = CAP_Z0
    yc = 0.4
    base_cs = rrect(42.0, 32.0, 12.0).translate([0, yc])
    hb = 3.2
    btn_h = 0.8
    ez = FIG_TOP - btn_h - (z0 + hb)
    crown = M.batch_hull([extrude_z(base_cs, z0, z0 + hb), ellipsoid((21.0, 16.0, ez), (0, yc, z0 + hb))])
    button = M.batch_hull([extrude_z(CS.circle(2.4), FIG_TOP - btn_h - 1.0, FIG_TOP - btn_h + 0.01),
                           ellipsoid((2.1, 2.1, btn_h), (0, yc, FIG_TOP - btn_h))])
    bill_cs = (CS.circle(1.0, 128).scale([19.6, 21.0]).translate([0, -10.0]) ^
               CS.square([60, 40]).translate([-30, -42.0]))
    bill = chamfered_prism(bill_cs, z0, z0 + 2.6, 0.0, 1.0)
    body = union([crown, button, bill])
    # cube logo (hexagon + 'Y') on the crown front, raised 0.6 + inlaid 0.8 following the dome
    Rh, lw = 4.2, 1.25
    hexv = [(Rh * math.cos(math.radians(90 + 60 * k)), Rh * math.sin(math.radians(90 + 60 * k))) for k in range(6)]
    logo = CS([np.array(hexv)]).offset(lw / 2, JoinType.Miter) - CS([np.array(hexv)]).offset(-lw / 2, JoinType.Miter)
    for (vx, vy) in ((0.0, -Rh), hexv[1], hexv[5]):
        L = math.hypot(vx, vy)
        seg = CS.square([L, lw * 0.95]).translate([0, -lw * 0.95 / 2]).rotate(math.degrees(math.atan2(vy, vx)))
        logo = logo + seg
    lz = z0 + 7.3
    logo = logo.translate([0, lz])
    logo_prism = ext_along(logo, 2.0, 24.0, "y")
    outer = M.batch_hull([extrude_z(base_cs.offset(0.6), z0, z0 + hb), ellipsoid((21.6, 16.6, ez + 0.6), (0, yc, z0 + hb))])
    inner = M.batch_hull([extrude_z(base_cs.offset(-0.8), z0, z0 + hb), ellipsoid((20.2, 15.2, ez - 0.8), (0, yc, z0 + hb))])
    logo_solid = (logo_prism ^ (outer - inner)) - box_minmax((-30, -40, z0 - 1), (30, 0, z0 + 2.8))
    body = body + logo_solid
    under = extrude_z(bill_cs - base_cs.offset(-0.2), z0 - 0.1, z0 + 0.84)
    regions = [(MINT, under), (CREAM, logo_solid)]
    p = Part("cap", "כובע", body, BLACK, regions)
    p.logo = {"hex_circumradius_mm": Rh, "line_mm": lw, "raised_mm": 0.6}
    return p


def build_all():
    parts = {
        "cap": build_cap(),
        "head": build_head(),
        "torso": build_torso(),
        "arm_R": build_arm(-1),
        "arm_L": build_arm(1),
        "leg_R": build_leg(-1),
        "leg_L": build_leg(1),
    }
    for p in parts.values():
        p.apply_joints()
    return parts


if __name__ == "__main__":
    import time
    t = time.time()
    parts = build_all()
    for k, p in parts.items():
        vols = p.color_volumes()
        bb = p.body.bounding_box()
        print(k, "vol %.0f" % p.body.volume(), "genus", p.body.genus(), "bbox", np.round(bb, 1),
              {COLOR_NAME[c]: round(v.volume(), 1) for c, v in vols.items()})
    print("time %.1fs" % (time.time() - t))
