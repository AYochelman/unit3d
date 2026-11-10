"""Small CSG helper layer over manifold3d (all units mm, Z up)."""
import math
import numpy as np
import manifold3d as mf
from manifold3d import Manifold as M, CrossSection as CS, JoinType, FillRule, OpType

mf.set_min_circular_angle(4.0)        # <= 90 segments on big circles
mf.set_min_circular_edge_length(0.35) # small circles get fewer, still smooth


def union(items):
    items = [i for i in items if i is not None and not i.is_empty()]
    if not items:
        return M()
    if len(items) == 1:
        return items[0]
    return M.batch_boolean(items, OpType.Add)


def box(size, center=(0, 0, 0)):
    return M.cube(list(size), center=True).translate(list(center))


def box_minmax(lo, hi):
    lo = np.asarray(lo, float); hi = np.asarray(hi, float)
    return M.cube(list(hi - lo)).translate(list(lo))


def sphere(r, c=(0, 0, 0)):
    return M.sphere(r).translate(list(c))


def ellipsoid(radii, c=(0, 0, 0)):
    return M.sphere(1.0, 96).scale(list(radii)).translate(list(c))


def capsule(a, b, r):
    return M.batch_hull([sphere(r, a), sphere(r, b)])


def cone_capsule(a, b, ra, rb):
    return M.batch_hull([sphere(ra, a), sphere(rb, b)])


def cyl_between(a, b, r, r2=None):
    """Cylinder from point a to point b."""
    a = np.asarray(a, float); b = np.asarray(b, float)
    d = b - a
    L = float(np.linalg.norm(d))
    c = M.cylinder(L, r, r if r2 is None else r2)
    z = np.array([0, 0, 1.0])
    dn = d / L
    v = np.cross(z, dn)
    s = np.linalg.norm(v)
    if s < 1e-9:
        R = np.eye(3) if dn[2] > 0 else np.diag([1, -1, -1.0])
    else:
        k = v / s
        ang = math.atan2(s, float(np.dot(z, dn)))
        K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        R = np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * K @ K
    T = np.hstack([R, a.reshape(3, 1)])
    return c.transform(T)


def rbox(size, r, center=(0, 0, 0), r_top=None, r_bot=None):
    """Rounded box as hull of corner spheres. Optional different radii top/bottom."""
    sx, sy, sz = size
    rt = r if r_top is None else r_top
    rb = r if r_bot is None else r_bot
    pts = []
    for zs, rr in ((-1, rb), (1, rt)):
        for xs in (-1, 1):
            for ys in (-1, 1):
                pts.append(sphere(rr, (xs * (sx / 2 - rr), ys * (sy / 2 - rr), zs * (sz / 2 - rr))))
    return M.batch_hull(pts).translate(list(center))


def rrect(w, h, r, segs=0):
    r = min(r, w / 2 - 1e-3, h / 2 - 1e-3)
    return CS.square([w - 2 * r, h - 2 * r], center=True).offset(r, JoinType.Round, 2.0, segs)


def extrude_z(cs, z0, z1):
    return M.extrude(cs, z1 - z0).translate([0, 0, z0])


def chamfered_prism(cs, z0, z1, ch_bot=0.0, ch_top=0.0):
    """Prism with 45 deg chamfers (uses offsets + hull per convex piece -> use loft by layers)."""
    parts = []
    eps = 0.01
    zs = []
    if ch_bot > 0:
        zs.append((z0, -ch_bot)); zs.append((z0 + ch_bot, 0.0))
    else:
        zs.append((z0, 0.0))
    if ch_top > 0:
        zs.append((z1 - ch_top, 0.0)); zs.append((z1, -ch_top))
    else:
        zs.append((z1, 0.0))
    for (za, oa), (zb, ob) in zip(zs[:-1], zs[1:]):
        if zb - za < 1e-6:
            continue
        ca = cs.offset(oa, JoinType.Round) if oa else cs
        cb = cs.offset(ob, JoinType.Round) if ob else cs
        if oa == ob:
            parts.append(extrude_z(ca, za, zb))
        else:
            # loft between two offsets of a (convex-ish) outline via hull of thin slabs
            parts.append(M.batch_hull([extrude_z(ca, za, za + eps), extrude_z(cb, zb - eps, zb)]))
    return union(parts)


def frame_matrix(origin, n, u):
    """3x4 matrix mapping local (x=u, y=n x u, z=n) to world."""
    n = np.asarray(n, float); n /= np.linalg.norm(n)
    u = np.asarray(u, float); u = u - np.dot(u, n) * n; u /= np.linalg.norm(u)
    v = np.cross(n, u)
    R = np.column_stack([u, v, n])
    return np.hstack([R, np.asarray(origin, float).reshape(3, 1)])


def apply_T(m, T):
    return m.transform(np.asarray(T, float))


def rot_x(deg):
    a = math.radians(deg)
    return np.array([[1, 0, 0, 0], [0, math.cos(a), -math.sin(a), 0], [0, math.sin(a), math.cos(a), 0]], float)


def to_trimesh(m):
    import trimesh
    mesh = m.to_mesh()
    v = np.asarray(mesh.vert_properties)[:, :3].astype(np.float64)
    f = np.asarray(mesh.tri_verts).astype(np.int64)
    return trimesh.Trimesh(v, f, process=False)


def from_trimesh(t):
    mesh = mf.Mesh(vert_properties=np.asarray(t.vertices, np.float32), tri_verts=np.asarray(t.faces, np.uint32))
    return M(mesh)


# ---------------------------------------------------------------- text
_font_cache = {}


def text_cs(text, font_path, cap_height, spacing=0.0, tol=0.04):
    """CrossSection of a text string, baseline at y=0, left at x=0. cap_height in mm."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.basePen import BasePen

    if font_path not in _font_cache:
        _font_cache[font_path] = TTFont(font_path)
    font = _font_cache[font_path]
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    os2 = font["OS/2"]
    cap = getattr(os2, "sCapHeight", 0) or font["head"].unitsPerEm * 0.7
    s = cap_height / cap

    class FlatPen(BasePen):
        def __init__(self, glyphset):
            super().__init__(glyphset)
            self.contours = []
            self.cur = []

        def _moveTo(self, p):
            self.cur = [p]

        def _lineTo(self, p):
            self.cur.append(p)

        def _curveToOne(self, p1, p2, p3):
            p0 = self.cur[-1]
            n = 10
            for i in range(1, n + 1):
                t = i / n
                x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
                y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
                self.cur.append((x, y))

        def _qCurveToOne(self, p1, p2):
            p0 = self.cur[-1]
            n = 8
            for i in range(1, n + 1):
                t = i / n
                x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
                y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
                self.cur.append((x, y))

        def _closePath(self):
            if len(self.cur) > 2:
                self.contours.append(self.cur)
            self.cur = []

        _endPath = _closePath

    polys = []
    x = 0.0
    hmtx = font["hmtx"]
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            continue
        pen = FlatPen(gs)
        gs[gname].draw(pen)
        for c in pen.contours:
            arr = np.array(c, float) * s
            arr[:, 0] += x
            polys.append(arr)
        x += hmtx[gname][0] * s + spacing
    cs = CS(polys, FillRule.NonZero)
    return cs, x - spacing


def cs_bounds(cs):
    b = cs.bounds()
    return np.array(b[:2]), np.array(b[2:])
