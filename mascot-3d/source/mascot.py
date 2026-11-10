"""UNIT3D modular magnetic mascot — parametric source.

Everything is modelled in the ASSEMBLED frame (mm): Z up, figure faces -Y,
figure's right side = -X.  Total height (sole -> cap top) = 120 mm.  v4: chubby chibi proportions (Meshy reference),
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


# ------------------------------------------------------------------ joint layout (v4: chubby chibi, Meshy reference)
LEG_TOP = 26.0                 # leg shoulder plane (male)
TORSO_Z0 = LEG_TOP + SEAM      # 44.3
TORSO_TOP = 62.0               # neck top (male) under the head
HEAD_Z0 = TORSO_TOP + SEAM     # 83.3
HEAD_H = 42.0
HEAD_TOP = HEAD_Z0 + HEAD_H    # 111.3: flat plateau the cap sits on (male shoulder)
CAP_RIM_Z = HEAD_TOP - 6.5     # cap skirt wraps the upper 6.5 mm of the head
CAP_GAP = 0.45                 # clearance between cap inside and head everywhere
FIG_TOP = 120.0
J_ARM_Z, J_ARM_Y = 51.0, -2.1
SHOULDER_X = 24.2              # torso shoulder plate face (female rim)
ARM_Y_CUT = 2.3                # arms are flat at y = 2.3 (their back lies on the plate)
LEG_X = 11.0

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

# ------------------------------------------------------------------ v4 builders: chubby chibi designer toy (Meshy reference)
# big round helmet head with beveled headphone pods, puffer vest of quilted tubes, baggy shorts,
# short chunky legs, big sneakers, chunky arms and oversized hands. Smooth SDF surfaces.
HEAD_HX, HEAD_HY = 25.5, 22.0
VISOR_ZC = HEAD_Z0 + HEAD_H / 2 - 1.5
EAR_Y, EAR_Z = 0.8, HEAD_Z0 + HEAD_H / 2 - 1.0


def head_sdf(P, with_details=True, plane_top=None):
    zc = HEAD_Z0 + HEAD_H / 2
    d = S.smax(S.round_box(P, (0, 0.5, zc), (HEAD_HX, HEAD_HY, HEAD_H / 2 + 2.5), 15.0),
               S.ellipsoid(P, (0, 0.5, zc + 1.0), (30.0, 26.0, 26.5)), 3.0)
    d = S.smax(d, S.bevel_rrect(P, HEAD_Z0, 17.0, 13.5, 8.0, up=False), 1.5)
    d = S.smax(d, S.bevel_rrect(P, HEAD_TOP, 17.0, 14.0, 8.0, up=True), 1.5)
    if plane_top if plane_top is not None else not with_details:
        d = np.maximum(d, P[2] - HEAD_TOP)
    if with_details:
        x, y, z = P
        mask = S.rrect2d(x, z, 0.0, VISOR_ZC, 20.0, 12.0, 9.5)             # face screen, lifted 0.8 mm
        d = d - np.clip(-mask, 0.0, 0.8) * (y < -4.0)
        r_e = np.sqrt((y - EAR_Y) ** 2 + (z - EAR_Z) ** 2)
        for s in (-1, 1):                                                   # headphone pods: 45 deg frustum (self-supporting)
            pod = np.maximum(np.maximum(r_e - (10.0 - np.clip(np.abs(x) - 25.2, 0, None)), np.abs(x) - 28.6), 22.0 - np.abs(x))
            pod = np.where(s * x > 0, pod, 10.0)
            d = S.smin(d, pod, 1.0)
    return d


def build_head():
    lo, hi = (-30.5, -24, HEAD_Z0 - 1), (30.5, 24, HEAD_TOP + 1)
    body = S.mesh_sdf(lambda P: head_sdf(P), lo, hi, 0.2, key="head")
    body = body - box_minmax((-40, -40, HEAD_Z0 - 10), (40, 40, HEAD_Z0)) - box_minmax((-40, -40, HEAD_TOP), (40, 40, HEAD_TOP + 10))
    visor_reg = ext_along(rrect(40.4, 24.4, 9.7).translate([0, VISOR_ZC]), 18.0, 34.0, "y")
    eye_cs = []
    ezc = VISOR_ZC - 0.9
    for ex in (-9.6, 9.6):
        R, w = 5.0, 3.3
        a0, a1 = math.radians(22), math.radians(158)
        outer = [(ex + (R + w / 2) * math.cos(a), ezc + (R + w / 2) * math.sin(a)) for a in np.linspace(a0, a1, 48)]
        inner = [(ex + (R - w / 2) * math.cos(a), ezc + (R - w / 2) * math.sin(a)) for a in np.linspace(a1, a0, 48)]
        band = CS([np.array(outer + inner)])
        caps = CS.circle(w / 2, 40).translate([ex + R * math.cos(a0), ezc + R * math.sin(a0)]) + \
               CS.circle(w / 2, 40).translate([ex + R * math.cos(a1), ezc + R * math.sin(a1)])
        eye_cs.append(band + caps)
    eyes = ext_along(eye_cs[0] + eye_cs[1], 20.9, 34.0, "y")
    rings = []
    for s in (-1, 1):
        ring_cs = CS.circle(6.0) - CS.circle(3.4)
        lo2, hi2 = (27.6, 31.0) if s > 0 else (-31.0, -27.6)
        rings.append(ext_along(ring_cs.translate([EAR_Y, EAR_Z]), lo2, hi2, "x"))
    regions = [(BLACK, visor_reg), (MINT, eyes), (MINT, union(rings))]
    return Part("head", "ראש", body, CREAM, regions)


def build_cap():
    rim = CAP_RIM_Z
    crown_c = (0, 1.0, HEAD_TOP - 1.5)
    crown_r = (25.5, 23.0, FIG_TOP - 0.7 - (HEAD_TOP - 1.5))
    bill_y0 = -14.5

    def outer_sdf(P):
        h = head_sdf(P, with_details=False)
        return S.smin(h - (CAP_GAP + 1.8), S.ellipsoid(P, crown_c, crown_r), 2.5)

    def cap_sdf(P):
        x, y, z = P
        d = outer_sdf(P)
        e2 = (np.sqrt((x / 23.0) ** 2 + ((y - bill_y0) / 27.0) ** 2) - 1.0) * 23.0
        slab = np.abs(z - (rim + 1.4)) - 1.4
        bill = S.smax(S.smax(e2, slab, 1.1), y - (bill_y0 + 2.0), 0.5)
        d = S.smin(d, bill, 1.4)
        d = S.smin(d, S.cyl_z(P, (0, crown_c[1]), 2.8, FIG_TOP - 1.6, FIG_TOP, 0.6), 0.6)
        d = np.maximum(d, -(head_sdf(P, with_details=False) - CAP_GAP))
        return d

    lo, hi = (-30, -43, rim - 1.5), (30, 27, FIG_TOP + 0.5)
    body = S.mesh_sdf(cap_sdf, lo, hi, 0.2, key="cap")
    body = body - box_minmax((-40, -60, rim - 10), (40, 40, rim)) - box_minmax((-40, -60, FIG_TOP), (40, 40, FIG_TOP + 10))
    # crown panel seams (6 shallow V-grooves from the button down), shape only
    seams = []
    for k in range(6):
        ang = math.radians(60 * k)
        tip = (math.cos(ang) * 30, crown_c[1] + math.sin(ang) * 30, HEAD_TOP - 4)
        start = (math.cos(ang) * 4.2, crown_c[1] + math.sin(ang) * 4.2, FIG_TOP - 2.2)    # start beside the button
        seams.append(M.batch_hull([M.sphere(0.5).translate(list(start)), M.sphere(0.5).translate(list(tip))]))
    seam_cut = union(seams) - box_minmax((-40, -60, rim - 1), (40, 40, rim + 4.0))
    # keep seams only as a thin skin cut: intersect with the outer shell region
    lo3, hi3 = (-30, -30, rim + 3), (30, 27, FIG_TOP + 0.5)
    shell_in = S.mesh_sdf(lambda P: outer_sdf(P) + 0.55, lo3, hi3, 0.2, key="cap_seam_in")
    body = body - (seam_cut - shell_in)
    Rh, lw = 5.2, 1.45
    hexv = [(Rh * math.cos(math.radians(90 + 60 * k)), Rh * math.sin(math.radians(90 + 60 * k))) for k in range(6)]
    logo = CS([np.array(hexv)]).offset(lw / 2, JoinType.Miter) - CS([np.array(hexv)]).offset(-lw / 2, JoinType.Miter)
    for (vx, vy) in ((0.0, -Rh), hexv[1], hexv[5]):
        L = math.hypot(vx, vy)
        seg = CS.square([L, lw * 0.95]).translate([0, -lw * 0.95 / 2]).rotate(math.degrees(math.atan2(vy, vx)))
        logo = logo + seg
    lz = rim + 9.2
    logo = logo.translate([0, lz])
    logo_prism = ext_along(logo, 4.0, 40.0, "y")
    lo2, hi2 = (-10, -38, lz - 9), (10, -2, lz + 9)
    sh_out = S.mesh_sdf(lambda P: outer_sdf(P) - 0.6, lo2, hi2, 0.12, key="cap_logo_out")
    sh_in = S.mesh_sdf(lambda P: outer_sdf(P) + 0.8, lo2, hi2, 0.12, key="cap_logo_in")
    logo_solid = (logo_prism ^ (sh_out - sh_in)) - box_minmax((-30, -60, rim - 1), (30, 0, rim + 3.3))
    body = body + logo_solid
    under = box_minmax((-30, -60, rim - 0.2), (30, -24.9, rim + 0.84))
    regions = [(MINT, under), (CREAM, logo_solid)]
    p = Part("cap", "כובע", body, BLACK, regions)
    p.logo = {"hex_circumradius_mm": Rh, "line_mm": lw, "raised_mm": 0.6}
    return p


PLATE_Y = -16.3
TEXT_ZC = 50.4
TUBES = [  # puffer vest tubes: (z_bottom, z_top, half x, half y)
    (39.4, 45.0, 23.8, 17.2),
    (45.0, 55.4, 23.3, 16.8),
    (55.4, 60.2, 21.7, 15.8),
]


def torso_sdf(P):
    x, y, z = P
    d = S.round_box(P, (0, 0, 32.4), (21.0, 15.4, 6.6), 5.0)                       # baggy shorts
    for s in (-1, 1):
        d = S.smin(d, S.cyl_z(P, (s * LEG_X, 0), 10.2, 25.8, 31.5, 2.0), 1.5)       # wide leg openings
    d = S.smin(d, S.round_box(P, (0, 0.2, 38.4), (21.5, 15.8, 1.5), 1.4), 0.6)      # waistband
    for (za, zb, hx, hy) in TUBES:                                                 # quilted tubes, 45 deg underside
        zc_, hz = (za + zb) / 2, (zb - za) / 2
        tube = S.round_box(P, (0, 0.3, zc_), (hx, hy, hz + 1.2), 3.2)
        tube = S.smax(tube, S.bevel_rrect(P, za + 0.2, hx - 1.6, hy - 1.6, 6.0, up=False), 0.8)
        tube = np.maximum(tube, z - (zb + 0.6))
        d = S.smin(d, tube, 0.35)
    for s in (-1, 1):                                                              # shoulder plates (45 deg underside)
        plate = S.round_box(P, (s * 23.0, J_ARM_Y, J_ARM_Z - 0.35), (1.6, 7.0, 8.35), 2.2)
        plate = np.maximum(plate, ((np.abs(x) - 21.2) - (z - (J_ARM_Z - 8.6))) * np.sqrt(0.5))
        d = S.smin(d, plate, 1.2)
    d = S.smin(d, S.cyl_z(P, (0, 0.6), 7.5, 56.0, 63.5, 1.0), 1.0)                  # neck stub (hidden)
    d = S.smin(d, S.torus_z(P, (0, 1.6, 60.2), 13.6, 4.6, sx=1.12, tilt_deg=8), 1.3)  # big hood collar
    return d


def build_torso():
    lo, hi = (-28.5, -21, TORSO_Z0 - 1), (28.5, 23, TORSO_TOP + 1.5)
    body = S.mesh_sdf(torso_sdf, lo, hi, 0.2, key="torso")
    for ys in (-1, 1):                                                             # leg separation
        body = body - M.batch_hull([sphere(0.8, (0, ys * 15.4, TORSO_Z0 - 1)), sphere(0.8, (0, ys * 15.4, TORSO_Z0 + 4.5))])
    cords, tip_regs = [], []
    for xs in (-5.0, 5.0):                                                         # drawstrings + aglets on the top tube
        cy = -15.5 + 0.4
        xb = xs * 1.03
        z_split, t_bot = 58.0, 56.3
        cords.append(capsule((xs, -15.9, 60.6), (xb, cy, z_split - 0.4), 1.1))
        tip = M.batch_hull([cyl_between((xb, cy - 0.1, t_bot + 0.55), (xb, cy - 0.1, z_split), 1.45),
                            sphere(0.45, (xb, cy - 0.1, t_bot - 0.45))])
        cords.append(tip)
        tip_regs.append(box_minmax((xb - 3, cy - 4, t_bot - 3), (xb + 3, cy + 1.2, z_split + 0.3)))
    cords_m = union(cords)
    body = body + cords_m
    body = body - box_minmax((-17.8, -40, TEXT_ZC - 3.5), (17.8, PLATE_Y, TEXT_ZC + 3.7))  # flat chest band for the lettering
    cap_h = 5.4
    cs_all, w_all = text_cs("UNIT3D", FONT, cap_h, spacing=0.35)
    cs_unit, w_unit = text_cs("UNIT", FONT, cap_h, spacing=0.35)
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
    body = body - box_minmax((-60, -60, TORSO_TOP), (60, 60, TORSO_TOP + 20))
    band_reg = box_minmax((-30, -25, 37.05), (30, 25, 39.75))
    tor_reg = M.revolve(CS.circle(4.6 + 0.35).translate([13.6, 0.0]), 96).scale([1.12, 1.0, 1.0]).rotate([-8.0, 0, 0]).translate([0, 1.6, 60.2])
    regions = [(MINT, band_reg), (MINT, tor_reg), (CREAM, cords_m), (ORANGE, union(tip_regs) ^ cords_m),
               (CREAM, t_unit), (MINT, t_3d)]
    p = Part("torso", "גוף / חזה (Chest Shell)", body, BLACK, regions)
    p.text = {"string": "UNIT3D", "cap_height_mm": cap_h, "width_mm": round(w_all, 2), "raised_mm": 0.4, "inlay_mm": 0.9}
    return p


SHOE_X, SHOE_Y = 14.8, -4.5


def leg_sdf(P, s):
    lx, fx, fy = s * LEG_X, s * SHOE_X, SHOE_Y
    d = S.round_cone(P, (lx, 0, LEG_TOP + 1.5), (lx, 0.3, 14.0), 8.2, 7.6)          # short chunky leg (sock)
    d = S.smin(d, S.cyl_z(P, (lx, 0.3), 9.4, 12.0, 16.8, 1.8), 1.0)                  # high-top collar
    sole = S.round_box(P, (fx, fy, 1.2), (13.8, 23.0, 3.6), 3.8)                     # big sole (flat on the plate)
    up = S.round_box(P, (fx, fy + 4.8, 8.2), (12.8, 16.0, 5.0), 5.4)
    up = S.smin(up, S.ellipsoid(P, (fx, fy - 12.2, 6.8), (12.0, 10.4, 5.2)), 1.8)   # round toe box
    up = S.smin(up, S.round_box(P, (fx, fy + 11.2, 10.0), (11.6, 7.0, 5.8), 4.2), 1.8)  # heel counter
    up = S.smin(up, S.round_box(P, (fx, fy - 2.8, 12.1), (6.4, 8.0, 1.4), 1.3), 1.2)  # tongue / lace panel
    shoe = S.smin(sole, up, 1.0)
    return S.smin(d, shoe, 2.0)


def build_leg(s):
    name = "leg_R" if s < 0 else "leg_L"
    lx, fx, fy = s * LEG_X, s * SHOE_X, SHOE_Y
    lo, hi = (min(lx, fx) - 14, -28, -3), (max(lx, fx) + 14, 20, LEG_TOP + 2)
    body = S.mesh_sdf(lambda P: leg_sdf(P, s), lo, hi, 0.2, key=f"leg{s}")
    body = body - box_minmax((-60, -60, -10), (60, 60, 0.0))
    upper = box_minmax((fx - 20, fy - 30, 5.6), (fx + 20, fy + 30, 13.9))
    toe = extrude_z(CS.circle(14.8, 96).scale([1.0, 0.82]).translate([fx, fy - 25.0]), 5.6, 13.9)
    stripe = box_minmax((fx - 20, fy - 30, 3.4), (fx + 20, fy + 30, 5.6))
    regions = [(BLACK, upper), (CREAM, toe), (MINT, stripe)]
    he = "רגל ימין" if s < 0 else "רגל שמאל"
    return Part(name, he, body, CREAM, regions)


def flat_back(m, y_cut=ARM_Y_CUT):
    return m - box_minmax((-80, y_cut, -10), (80, 40, 160))


HAND_SCALE = 1.4
ARM_PTS = {   # shoulder start A0, soft bend B (no elbow), wrist W
    -1: dict(A0=(-30.6, 0.0, J_ARM_Z - 0.8), B=(-37.6, 0.0, J_ARM_Z - 4.0), W=(-41.0, 0.0, J_ARM_Z + 5.8)),
    1: dict(A0=(30.6, 0.0, J_ARM_Z - 0.8), B=(33.8, 0.0, J_ARM_Z - 7.0), W=(34.6, 0.0, J_ARM_Z - 13.2)),
}


def _frame(s):
    p = ARM_PTS[s]
    B, W = np.array(p["B"]), np.array(p["W"])
    u = (W - B) / np.linalg.norm(W - B)
    w = np.array([u[2], 0.0, -u[0]])
    return B, W, u, w


def hand_sdf(P, s):
    B, W, u, w = _frame(s)
    a, b, c = S.local_frame(P, W, u, w)
    k = HAND_SCALE
    L = (a / k, b / k, c / k)
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
    lo, hi = sorted((s * 24.0, s * 28.6))
    d = S.cyl_x(P, (0, J_ARM_Y, J_ARM_Z), 7.0, lo, hi, 2.3)                          # shoulder puck
    d = S.smin(d, S.round_cone(P, p["A0"], B, 6.6, 6.1), 2.4)                        # puffy sleeve
    d = S.smin(d, S.round_cone(P, B, W, 6.1, 5.0), 3.4)                              # forearm, soft bend
    d = S.smin(d, S.round_cone(P, tuple(W - 4.6 * u), tuple(W - 1.0 * u), 5.4, 5.15), 0.3)   # cuff
    d = S.smin(d, hand_sdf(P, s), 0.9)
    return d


def build_arm(s):
    name = "arm_R" if s < 0 else "arm_L"
    if s < 0:
        lo, hi = (-56.0, -13, J_ARM_Z - 13), (-23.5, 6, J_ARM_Z + 38)
    else:
        lo, hi = (23.5, -13, J_ARM_Z - 38), (47.0, 6, J_ARM_Z + 9)
    body = S.mesh_sdf(lambda P: arm_sdf(P, s), lo, hi, 0.13, key=f"arm{s}")
    body = flat_back(body)
    B, W, u, w = _frame(s)
    mint_disc = cyl_between((s * 21.0, J_ARM_Y, J_ARM_Z), (s * 28.85, J_ARM_Y, J_ARM_Z), 7.25)
    cuff = cyl_between(tuple(W - 5.2 * u), tuple(W - 0.6 * u), 7.0)
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
