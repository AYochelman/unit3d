"""UNIT3D modular magnetic mascot — parametric source.

Everything is modelled in the ASSEMBLED frame (mm): Z up, figure faces -Y,
figure's right side = -X.  Total height (sole -> cap top) = 120 mm.  v3: chibi designer-toy proportions,
smoothly blended SDF bodies (sdf.py) + exact CSG for joints, colours and text.
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
KEY_CORNER_CUT = {"cap-head": 5.0, "head-torso": 3.0, "armR-torso": 3.0, "armL-torso": 3.0,
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


# ------------------------------------------------------------------ joint layout (v3: chibi)
LEG_TOP = 28.0                 # leg shoulder plane (male)
TORSO_Z0 = LEG_TOP + SEAM      # 44.3
TORSO_TOP = 65.0               # neck top (male) under the head
HEAD_Z0 = TORSO_TOP + SEAM     # 83.3
HEAD_H = 40.0
HEAD_TOP = HEAD_Z0 + HEAD_H    # 111.3: flat plateau the cap sits on (male shoulder)
CAP_RIM_Z = HEAD_TOP - 6.5     # cap skirt wraps the upper 6.5 mm of the head
CAP_GAP = 0.45                 # clearance between cap inside and head everywhere
FIG_TOP = 120.0
J_ARM_Z, J_ARM_Y = 54.5, -2.1
SHOULDER_X = 19.4              # torso shoulder plate face (female rim)
ARM_Y_CUT = 2.3                # arms are flat at y = 2.3 (their back lies on the plate)
LEG_X = 8.0

JOINTS = {
    "cap":   Joint("cap-head",    (0, 0, HEAD_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 14, 11, 3.0,
                   male="head", female="cap", region=9),
    "neck":  Joint("head-torso",  (0, 0, TORSO_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 10, 8.8, 2.5,
                   male="torso", female="head", region=12),
    "armR":  Joint("armR-torso",  (-SHOULDER_X + 1.9, J_ARM_Y, J_ARM_Z), (1, 0, 0), (0, 0, 1), 10, 8.8, 2.5,
                   male="arm_R", female="torso", region=12, headroom_dir=(0, 0, 1)),
    "armL":  Joint("armL-torso",  (SHOULDER_X - 1.9, J_ARM_Y, J_ARM_Z), (-1, 0, 0), (0, 0, 1), 10, 8.8, 2.5,
                   male="arm_L", female="torso", region=12, headroom_dir=(0, 0, 1)),
    "legR":  Joint("legR-torso",  (-LEG_X, 0, LEG_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (1, 0, 0), 10, 9, 2.5,
                   male="leg_R", female="torso", region=9),
    "legL":  Joint("legL-torso",  (LEG_X, 0, LEG_TOP + BOSS_H + PROTRUDE), (0, 0, 1), (-1, 0, 0), 10, 9, 2.5,
                   male="leg_L", female="torso", region=9),
}
# arm key: its 8.8 mm side runs along -Y/+Y from the frame and spans y in [-6.5, 2.3] -> flush with the flat back.


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
        out, specks = {}, []
        for c, vs in vols.items():
            comps = union(vs).decompose()
            out[c] = [k for k in comps if k.volume() > 0.05]
            specks += [k for k in comps if 1e-6 < k.volume() <= 0.05]   # crumbs of a colour cut
        out[self.base_color] = out.get(self.base_color, []) + specks          # keep the tiling exact
        return {c: union(v) for c, v in out.items() if v}


# ------------------------------------------------------------------ v2 builders (smooth SDF bodies)
import sdf as S

# ------------------------------------------------------------------ v3 builders: chibi designer toy, smooth (SDF) surfaces
# big rounded head (~46 % of the height with the cap), compact torso no wider than the stance,
# short chunky legs with big sneakers, short smooth arms (no knee / elbow joints), oversized hands.
HEAD_HX, HEAD_HY = 23.0, 20.0
VISOR_ZC = HEAD_Z0 + HEAD_H / 2 - 1.0
EAR_Y, EAR_Z = 0.5, HEAD_Z0 + HEAD_H / 2 - 0.5


def head_sdf(P, with_details=True, plane_top=None):
    """Rounded helmet head. Flat bottom with a uniform 45 deg jaw bevel (prints upright, no support);
    uniform 45 deg seat on top for the cap (hidden by the cap)."""
    zc = HEAD_Z0 + HEAD_H / 2
    d = S.smax(S.round_box(P, (0, 0.5, zc), (HEAD_HX, HEAD_HY, HEAD_H / 2 + 2.5), 13.0),
               S.ellipsoid(P, (0, 0.5, zc + 1.0), (27.0, 23.5, 25.0)), 3.0)
    d = S.smax(d, S.bevel_rrect(P, HEAD_Z0, 15.5, 12.5, 7.0, up=False), 1.5)
    d = S.smax(d, S.bevel_rrect(P, HEAD_TOP, 15.5, 13.0, 7.0, up=True), 1.5)
    if plane_top if plane_top is not None else not with_details:   # exact plateau only for the cap's hollow
        d = np.maximum(d, P[2] - HEAD_TOP)
    if with_details:
        x, y, z = P
        mask = S.rrect2d(x, z, 0.0, VISOR_ZC, 18.0, 10.5, 8.0)            # face screen, lifted 0.8 mm
        d = d - np.clip(-mask, 0.0, 0.8) * (y < -4.0)
        for s in (-1, 1):                                                   # ear discs, rounded rim
            lo, hi = sorted((s * 21.8, s * 24.8))
            d = S.smin(d, S.cyl_x(P, (0, EAR_Y, EAR_Z), 7.2, lo, hi, 1.5), 0.8)
    return d


def build_head():
    lo, hi = (-26, -22, HEAD_Z0 - 1), (26, 22, HEAD_TOP + 1)
    body = S.mesh_sdf(lambda P: head_sdf(P), lo, hi, 0.2, key="head")
    body = body - box_minmax((-40, -40, HEAD_Z0 - 10), (40, 40, HEAD_Z0)) - box_minmax((-40, -40, HEAD_TOP), (40, 40, HEAD_TOP + 10))
    visor_reg = ext_along(rrect(36.4, 21.4, 8.2).translate([0, VISOR_ZC]), 16.0, 30.0, "y")
    eye_cs = []
    ezc = VISOR_ZC - 0.8
    for ex in (-8.4, 8.4):
        R, w = 4.4, 2.9
        a0, a1 = math.radians(22), math.radians(158)
        outer = [(ex + (R + w / 2) * math.cos(a), ezc + (R + w / 2) * math.sin(a)) for a in np.linspace(a0, a1, 48)]
        inner = [(ex + (R - w / 2) * math.cos(a), ezc + (R - w / 2) * math.sin(a)) for a in np.linspace(a1, a0, 48)]
        band = CS([np.array(outer + inner)])
        caps = CS.circle(w / 2, 40).translate([ex + R * math.cos(a0), ezc + R * math.sin(a0)]) + \
               CS.circle(w / 2, 40).translate([ex + R * math.cos(a1), ezc + R * math.sin(a1)])
        eye_cs.append(band + caps)
    eyes = ext_along(eye_cs[0] + eye_cs[1], 18.9, 30.0, "y")
    rings = []
    for s in (-1, 1):
        ring_cs = CS.circle(5.9) - CS.circle(3.2)
        lo2, hi2 = (23.8, 27.0) if s > 0 else (-27.0, -23.8)
        rings.append(ext_along(ring_cs.translate([EAR_Y, EAR_Z]), lo2, hi2, "x"))
    regions = [(BLACK, visor_reg), (MINT, eyes), (MINT, union(rings))]
    return Part("head", "ראש", body, CREAM, regions)


def build_cap():
    rim = CAP_RIM_Z
    crown_c = (0, 1.0, HEAD_TOP - 1.5)
    crown_r = (23.5, 21.0, FIG_TOP - 0.7 - (HEAD_TOP - 1.5))
    bill_y0 = -13.0

    def outer_sdf(P):
        h = head_sdf(P, with_details=False)
        return S.smin(h - (CAP_GAP + 1.8), S.ellipsoid(P, crown_c, crown_r), 2.5)

    def cap_sdf(P):
        x, y, z = P
        d = outer_sdf(P)
        e2 = (np.sqrt((x / 21.0) ** 2 + ((y - bill_y0) / 24.5) ** 2) - 1.0) * 21.0
        slab = np.abs(z - (rim + 1.3)) - 1.3
        bill = S.smax(S.smax(e2, slab, 1.0), y - (bill_y0 + 2.0), 0.5)
        d = S.smin(d, bill, 1.3)
        d = S.smin(d, S.cyl_z(P, (0, crown_c[1]), 2.6, FIG_TOP - 1.6, FIG_TOP, 0.6), 0.6)
        d = np.maximum(d, -(head_sdf(P, with_details=False) - CAP_GAP))
        return d

    lo, hi = (-28, -39, rim - 1.5), (28, 25, FIG_TOP + 0.5)
    body = S.mesh_sdf(cap_sdf, lo, hi, 0.2, key="cap")
    body = body - box_minmax((-40, -50, rim - 10), (40, 40, rim)) - box_minmax((-40, -50, FIG_TOP), (40, 40, FIG_TOP + 10))
    Rh, lw = 4.6, 1.35
    hexv = [(Rh * math.cos(math.radians(90 + 60 * k)), Rh * math.sin(math.radians(90 + 60 * k))) for k in range(6)]
    logo = CS([np.array(hexv)]).offset(lw / 2, JoinType.Miter) - CS([np.array(hexv)]).offset(-lw / 2, JoinType.Miter)
    for (vx, vy) in ((0.0, -Rh), hexv[1], hexv[5]):
        L = math.hypot(vx, vy)
        seg = CS.square([L, lw * 0.95]).translate([0, -lw * 0.95 / 2]).rotate(math.degrees(math.atan2(vy, vx)))
        logo = logo + seg
    lz = rim + 8.8
    logo = logo.translate([0, lz])
    logo_prism = ext_along(logo, 4.0, 36.0, "y")
    lo2, hi2 = (-9, -34, lz - 8), (9, -2, lz + 8)
    sh_out = S.mesh_sdf(lambda P: outer_sdf(P) - 0.6, lo2, hi2, 0.12, key="cap_logo_out")
    sh_in = S.mesh_sdf(lambda P: outer_sdf(P) + 0.8, lo2, hi2, 0.12, key="cap_logo_in")
    logo_solid = (logo_prism ^ (sh_out - sh_in)) - box_minmax((-30, -50, rim - 1), (30, 0, rim + 3.1))
    body = body + logo_solid
    under = box_minmax((-30, -50, rim - 0.2), (30, -22.6, rim + 0.84))
    regions = [(MINT, under), (CREAM, logo_solid)]
    p = Part("cap", "כובע", body, BLACK, regions)
    p.logo = {"hex_circumradius_mm": Rh, "line_mm": lw, "raised_mm": 0.6}
    return p


VEST_HX_BOT, VEST_HX_TOP, VEST_HY = 15.6, 18.0, 12.0
PLATE_Y = -11.8
TEXT_ZC = 50.4


def torso_sdf(P):
    d = S.round_box(P, (0, 0, 34.6), (15.9, 11.6, 6.6), 4.5)                      # shorts (top hidden in the band)
    for s in (-1, 1):
        d = S.smin(d, S.cyl_z(P, (s * LEG_X, 0), 7.9, 27.5, 33.0, 1.8), 1.3)      # shorts leg cuffs
    d = S.smin(d, S.round_box(P, (0, 0.2, 39.6), (16.2, 12.0, 1.45), 1.35), 0.6)  # waistband
    d = S.smin(d, S.tapered_round_box(P, (0, 0.3, 51.4), VEST_HX_BOT, VEST_HX_TOP, 40.0, 50.0,
                                      VEST_HY, 12.1, 5.0), 1.5)                   # vest, gentle V
    for s in (-1, 1):                                                             # shoulder plates (45 deg underside)
        plate = S.round_box(P, (s * 18.1, J_ARM_Y, J_ARM_Z - 0.35), (1.4, 6.9, 8.35), 2.2)
        plate = np.maximum(plate, ((np.abs(P[0]) - 16.5) - (P[2] - (J_ARM_Z - 8.6))) * np.sqrt(0.5))
        d = S.smin(d, plate, 1.4)
    d = S.smin(d, S.cyl_z(P, (0, 0.4), 7.5, 58.0, 66.5, 1.0), 1.0)                 # neck stub (hidden)
    d = S.smin(d, S.torus_z(P, (0, 1.2, 62.9), 10.4, 3.4, sx=1.1, tilt_deg=8), 1.3)  # hood collar
    return d


def build_torso():
    lo, hi = (-22, -15, TORSO_Z0 - 1), (22, 16, TORSO_TOP + 1.5)
    body = S.mesh_sdf(torso_sdf, lo, hi, 0.2, key="torso")
    for zg in (46.5, 53.5):                                                       # back puffer seams
        body = body - M.cube([28.0, 1.1, 1.1], center=True).rotate([45, 0, 0]).translate([0, 12.3, zg])
    for ys in (-1, 1):                                                            # leg separation
        body = body - M.batch_hull([sphere(0.7, (0, ys * 11.2, TORSO_Z0 - 1)), sphere(0.7, (0, ys * 11.2, TORSO_Z0 + 4.0))])
    cords, tip_regs = [], []
    for xs in (-4.4, 4.4):                                                        # drawstrings + aglets
        cy = PLATE_Y + 0.25
        xb = xs * 1.04
        z_split, t_bot = 57.6, 55.4
        cords.append(capsule((xs, PLATE_Y + 0.1, 61.4), (xb, cy, z_split - 0.4), 1.05))
        tip = M.batch_hull([cyl_between((xb, cy - 0.1, t_bot + 0.55), (xb, cy - 0.1, z_split), 1.4),
                            sphere(0.4, (xb, cy - 0.1, t_bot - 0.5))])
        cords.append(tip)
        tip_regs.append(box_minmax((xb - 3, cy - 4, t_bot - 3), (xb + 3, cy + 1.2, z_split + 0.3)))
    cords_m = union(cords)
    body = body + cords_m
    body = body - box_minmax((-15.8, -30, TEXT_ZC - 3.4), (15.8, PLATE_Y, TEXT_ZC + 3.6))   # flat chest plate
    cap_h = 4.8
    cs_all, w_all = text_cs("UNIT3D", FONT, cap_h, spacing=0.3)
    cs_unit, w_unit = text_cs("UNIT", FONT, cap_h, spacing=0.3)
    x0 = -w_all / 2
    z_base = TEXT_ZC - cap_h / 2
    cs_all = cs_all.translate([x0, z_base])
    cs_unit_t = cs_unit.translate([x0, z_base])
    cs_3d = cs_all - cs_unit_t.offset(0.05)
    e_in, e_out = -PLATE_Y - 0.9, -PLATE_Y + 0.4
    t_unit = ext_along(cs_unit_t, e_in, e_out, "y")
    t_3d = ext_along(cs_3d, e_in, e_out, "y")
    body = body + t_unit + t_3d
    body = body - box_minmax((-60, -60, -10), (60, 60, TORSO_Z0))
    body = body - box_minmax((-60, -60, TORSO_TOP), (60, 60, TORSO_TOP + 20))   # collar back stays under the head
    band_reg = box_minmax((-30, -25, 38.25), (30, 25, 40.95))
    tor_reg = M.revolve(CS.circle(3.4 + 0.35).translate([10.4, 0.0]), 96).scale([1.1, 1.0, 1.0]).rotate([-8.0, 0, 0]).translate([0, 1.2, 62.9])
    regions = [(MINT, band_reg), (MINT, tor_reg), (CREAM, cords_m), (ORANGE, union(tip_regs) ^ cords_m),
               (CREAM, t_unit), (MINT, t_3d)]
    p = Part("torso", "גוף / חזה (Chest Shell)", body, BLACK, regions)
    p.text = {"string": "UNIT3D", "cap_height_mm": cap_h, "width_mm": round(w_all, 2), "raised_mm": 0.4, "inlay_mm": 0.9}
    return p


SHOE_X, SHOE_Y = 10.4, -3.0


def leg_sdf(P, s):
    lx, fx, fy = s * LEG_X, s * SHOE_X, SHOE_Y
    d = S.round_cone(P, (lx, 0, LEG_TOP + 1.5), (lx, 0.3, 14.5), 6.9, 6.2)          # chunky leg (sock)
    d = S.smin(d, S.cyl_z(P, (lx, 0.3), 7.4, 12.0, 15.6, 1.6), 1.0)                  # sock cuff / shoe collar
    sole = S.round_box(P, (fx, fy, 1.0), (9.2, 16.0, 3.4), 3.0)                       # sole (flat on the plate)
    up = S.round_box(P, (fx, fy + 3.5, 8.2), (8.4, 11.0, 4.9), 4.5)
    up = S.smin(up, S.ellipsoid(P, (fx, fy - 8.5, 6.6), (7.7, 7.5, 4.6)), 1.6)       # toe box
    up = S.smin(up, S.round_box(P, (fx, fy + 7.8, 9.6), (7.6, 5.5, 4.8), 3.5), 1.6)  # heel counter
    shoe = S.smin(sole, up, 0.9)
    return S.smin(d, shoe, 1.8)


def build_leg(s):
    name = "leg_R" if s < 0 else "leg_L"
    lx, fx, fy = s * LEG_X, s * SHOE_X, SHOE_Y
    lo, hi = (min(lx, fx) - 11, -21, -2.5), (max(lx, fx) + 11, 15, LEG_TOP + 2)
    body = S.mesh_sdf(lambda P: leg_sdf(P, s), lo, hi, 0.2, key=f"leg{s}")
    body = body - box_minmax((-60, -60, -10), (60, 60, 0.0))
    upper = box_minmax((fx - 16, fy - 22, 5.2), (fx + 16, fy + 22, 13.2))
    toe = extrude_z(CS.circle(11.0, 96).scale([1.0, 0.82]).translate([fx, fy - 18.0]), 5.2, 13.2)
    stripe = box_minmax((fx - 16, fy - 22, 3.2), (fx + 16, fy + 22, 5.2))
    regions = [(BLACK, upper), (CREAM, toe), (MINT, stripe)]
    he = "רגל ימין" if s < 0 else "רגל שמאל"
    return Part(name, he, body, CREAM, regions)


def flat_back(m, y_cut=ARM_Y_CUT):
    return m - box_minmax((-80, y_cut, -10), (80, 40, 160))


HAND_SCALE = 1.15
ARM_PTS = {   # shoulder start A0, bend B (smooth, no elbow), wrist W
    -1: dict(A0=(-22.0, 0.0, J_ARM_Z - 1.0), B=(-27.6, 0.0, J_ARM_Z - 4.6), W=(-30.2, 0.0, J_ARM_Z + 7.2)),
    1: dict(A0=(22.0, 0.0, J_ARM_Z - 1.0), B=(25.0, 0.0, J_ARM_Z - 8.0), W=(25.6, 0.0, J_ARM_Z - 14.6)),
}


def _frame(s):
    p = ARM_PTS[s]
    B, W = np.array(p["B"]), np.array(p["W"])
    u = (W - B) / np.linalg.norm(W - B)
    w = np.array([u[2], 0.0, -u[0]])            # medial direction in the XZ plane
    return B, W, u, w


def hand_sdf(P, s):
    B, W, u, w = _frame(s)
    a, b, c = S.local_frame(P, W, u, w)
    k = HAND_SCALE
    L = (a / k, b / k, c / k)                    # oversized chibi hand: model at 1:1, scale up
    d = S.round_box(L, (4.4 if s < 0 else 4.2, 0.0, 0.35), (4.4 if s < 0 else 4.0, 3.9, 2.25), 1.7)
    fingers = []
    if s < 0:   # peace sign
        fingers.append(S.chain(L, [(8.0, 2.3, 1.45), (11.7, 3.5, 1.45), (14.4, 4.4, 1.45), (16.6, 5.1, 1.5)], [1.22, 1.14, 1.06, 1.0]))
        fingers.append(S.chain(L, [(8.3, 0.4, 1.45), (12.4, -0.3, 1.45), (15.4, -0.9, 1.45), (17.7, -1.4, 1.5)], [1.25, 1.16, 1.08, 1.0]))
        fingers.append(S.chain(L, [(7.6, -1.5, 0.6), (9.0, -1.6, -1.5), (7.6, -1.6, -2.75), (5.9, -1.5, -2.65)], [1.12, 1.06, 1.0, 0.95]))
        fingers.append(S.chain(L, [(7.0, -3.0, 0.6), (8.2, -3.1, -1.3), (6.9, -3.1, -2.65), (5.5, -3.0, -2.55)], [0.98, 0.92, 0.88, 0.84]))
        fingers.append(S.chain(L, [(2.4, 3.4, -0.4), (4.6, 3.0, -2.6), (6.0, 0.8, -3.4), (6.4, -1.0, -3.3)], [1.35, 1.25, 1.15, 1.08]))
    else:       # fist
        for bi, sc in ((2.75, 1.0), (0.95, 1.04), (-0.85, 1.0), (-2.6, 0.88)):
            fingers.append(S.chain(L, [(7.3, bi, 0.7), (8.8, bi, -1.2), (7.5, bi, -2.85), (5.6, bi, -2.75)],
                                   [1.18 * sc, 1.12 * sc, 1.05 * sc, 1.0 * sc]))
        fingers.append(S.chain(L, [(2.6, 3.6, -0.4), (4.4, 3.3, -3.0), (5.3, 1.2, -4.1), (5.6, -0.6, -4.2)], [1.38, 1.28, 1.18, 1.1]))
    for f in fingers[:-1]:
        d = S.smin(d, f, 0.55)
    d = S.smin(d, fingers[-1], 0.95)
    return d * k


def arm_sdf(P, s):
    p = ARM_PTS[s]
    B, W, u, w = _frame(s)
    lo, hi = sorted((s * 19.4, s * 23.4))
    d = S.cyl_x(P, (0, J_ARM_Y, J_ARM_Z), 6.4, lo, hi, 2.2)                          # shoulder puck
    d = S.smin(d, S.round_cone(P, p["A0"], B, 4.5, 4.1), 2.0)                        # upper arm
    d = S.smin(d, S.round_cone(P, B, W, 4.1, 3.5), 3.0)                              # forearm: wide blend, no elbow
    d = S.smin(d, S.round_cone(P, tuple(W - 3.8 * u), tuple(W - 0.9 * u), 3.85, 3.65), 0.3)  # cuff
    d = S.smin(d, hand_sdf(P, s), 0.8)
    return d


def build_arm(s):
    name = "arm_R" if s < 0 else "arm_L"
    if s < 0:
        lo, hi = (-40.0, -11, J_ARM_Z - 12), (-19.0, 6, J_ARM_Z + 32)
    else:
        lo, hi = (19.0, -11, J_ARM_Z - 32), (36.0, 6, J_ARM_Z + 8)
    body = S.mesh_sdf(lambda P: arm_sdf(P, s), lo, hi, 0.12, key=f"arm{s}")
    body = flat_back(body)
    B, W, u, w = _frame(s)
    mint_disc = cyl_between((s * 17.0, J_ARM_Y, J_ARM_Z), (s * 23.65, J_ARM_Y, J_ARM_Z), 6.65)
    cuff = cyl_between(tuple(W - 4.3 * u), tuple(W - 0.5 * u), 5.2)
    regions = [(MINT, mint_disc), (BLACK, cuff)]
    he = "יד ימין (סימן V)" if s < 0 else "יד שמאל (אגרוף)"
    return Part(name, he, body, CREAM, regions)


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
