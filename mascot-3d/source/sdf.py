"""Vectorised signed-distance modelling (numpy) + marching cubes -> manifold3d.
Negative = inside.  All lengths in mm.  Used for the organic, smoothly blended shapes;
precise mechanical features (keys, pockets, colour cuts) stay exact CSG in manifold."""
import numpy as np
import manifold3d as mf
from manifold3d import Manifold as M


# ------------------------------------------------------------------ combinators
def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sunion(ds, k):
    out = ds[0]
    for d in ds[1:]:
        out = smin(out, d, k)
    return out


# ------------------------------------------------------------------ primitives (P = (x, y, z) arrays)
def _rel(P, c):
    return P[0] - c[0], P[1] - c[1], P[2] - c[2]


def sphere(P, c, r):
    x, y, z = _rel(P, c)
    return np.sqrt(x * x + y * y + z * z) - r


def round_box(P, c, h, r):
    x, y, z = _rel(P, c)
    qx, qy, qz = np.abs(x) - (h[0] - r), np.abs(y) - (h[1] - r), np.abs(z) - (h[2] - r)
    outside = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    inside = np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0)
    return outside + inside - r


def ellipsoid(P, c, rad):
    x, y, z = _rel(P, c)
    k0 = np.sqrt((x / rad[0]) ** 2 + (y / rad[1]) ** 2 + (z / rad[2]) ** 2)
    k1 = np.sqrt((x / rad[0] ** 2) ** 2 + (y / rad[1] ** 2) ** 2 + (z / rad[2] ** 2) ** 2)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def capsule(P, a, b, r):
    return round_cone(P, a, b, r, r)


def round_cone(P, a, b, ra, rb):
    """Capsule with different end radii (exact for ra~rb, good approximation otherwise)."""
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a
    L2 = float(ba @ ba)
    x, y, z = _rel(P, a)
    t = np.clip((x * ba[0] + y * ba[1] + z * ba[2]) / L2, 0.0, 1.0)
    dx, dy, dz = x - ba[0] * t, y - ba[1] * t, z - ba[2] * t
    return np.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t)


def cyl_x(P, c, r, x0, x1, rr=0.0):
    """Cylinder along X from x0..x1 (absolute), radius r, edges rounded by rr."""
    x, y, z = P
    d_r = np.sqrt((y - c[1]) ** 2 + (z - c[2]) ** 2) - (r - rr)
    xm, xh = (x0 + x1) / 2, (x1 - x0) / 2
    d_x = np.abs(x - xm) - (xh - rr)
    return np.minimum(np.maximum(d_r, d_x), 0) + np.sqrt(np.maximum(d_r, 0) ** 2 + np.maximum(d_x, 0) ** 2) - rr


def cyl_z(P, c, r, z0, z1, rr=0.0):
    x, y, z = P
    d_r = np.sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2) - (r - rr)
    zm, zh = (z0 + z1) / 2, (z1 - z0) / 2
    d_z = np.abs(z - zm) - (zh - rr)
    return np.minimum(np.maximum(d_r, d_z), 0) + np.sqrt(np.maximum(d_r, 0) ** 2 + np.maximum(d_z, 0) ** 2) - rr


def torus_z(P, c, R, r, sx=1.0, tilt_deg=0.0):
    """Torus around Z (major radius R, scaled in x by sx), optionally tilted about X."""
    x, y, z = _rel(P, c)
    if tilt_deg:
        a = np.radians(tilt_deg)
        y, z = y * np.cos(a) + z * np.sin(a), -y * np.sin(a) + z * np.cos(a)
    q = np.sqrt((x / sx) ** 2 + y * y) - R
    return np.sqrt(q * q + z * z) - r


def rrect2d(u, v, cu, cv, hu, hv, r):
    qu, qv = np.abs(u - cu) - (hu - r), np.abs(v - cv) - (hv - r)
    return np.sqrt(np.maximum(qu, 0) ** 2 + np.maximum(qv, 0) ** 2) + np.minimum(np.maximum(qu, qv), 0) - r


def frustum_cut(P, z_ref, hx, hy, up=True, k=0.0):
    """45-degree pyramid-frustum half space: at z_ref the section is |x|<=hx,|y|<=hy and it grows
    by 1 mm per mm away from z_ref (toward -z if up=True, i.e. a top chamfer)."""
    x, y, z = P
    dz = (z_ref - z) if up else (z - z_ref)
    s = np.sqrt(0.5)
    fx = (np.abs(x) - hx - dz) * s
    fy = (np.abs(y) - hy - dz) * s
    return smax(fx, fy, k) if k else np.maximum(fx, fy)


def bevel_rrect(P, z_ref, hx, hy, r, up=True):
    """45-degree bevel that is uniform all round (offset of a rounded rectangle): at z_ref the section
    is the rounded rectangle (hx, hy, r) and it grows 1 mm per mm away from z_ref."""
    x, y, z = P
    dz = (z_ref - z) if up else (z - z_ref)
    return (rrect2d(x, y, 0.0, 0.0, hx, hy, r) - dz) * np.sqrt(0.5)


def tapered_round_box(P, c, hx_bot, hx_top, z_a, z_b, hy, hz, r):
    """Round box whose x half-width grows linearly from hx_bot (at z_a) to hx_top (at z_b)."""
    x, y, z = P
    t = np.clip((z - z_a) / (z_b - z_a), 0.0, 1.0)
    hx = hx_bot + (hx_top - hx_bot) * t
    xs = x * (hx_top / hx)
    return round_box((xs, y, z), c, (hx_top, hy, hz), r)


# ------------------------------------------------------------------ meshing
class Grid:
    def __init__(self, lo, hi, h):
        lo = np.asarray(lo, float) - 2 * h
        hi = np.asarray(hi, float) + 2 * h
        self.n = np.ceil((hi - lo) / h).astype(int) + 1
        self.lo, self.h = lo, h
        xs = lo[0] + np.arange(self.n[0]) * h
        ys = lo[1] + np.arange(self.n[1]) * h
        zs = lo[2] + np.arange(self.n[2]) * h
        X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
        self.P = (X, Y, Z)

    def mesh(self, d, simplify=0.004):
        from skimage.measure import marching_cubes
        d = np.array(d, dtype=np.float32, copy=True)
        d[0, :, :] = d[-1, :, :] = 1.0
        d[:, 0, :] = d[:, -1, :] = 1.0
        d[:, :, 0] = d[:, :, -1] = 1.0
        v, f, _, _ = marching_cubes(d, level=0.0, spacing=(self.h, self.h, self.h), allow_degenerate=False)
        v = v + self.lo
        man = M(mf.Mesh(vert_properties=np.ascontiguousarray(v, np.float32), tri_verts=np.ascontiguousarray(f, np.uint32)))
        if man.status() != mf.Error.NoError or man.is_empty():
            import trimesh
            t = trimesh.Trimesh(v, f, process=True)
            t.merge_vertices(); t.remove_unreferenced_vertices()
            man = M(mf.Mesh(vert_properties=np.asarray(t.vertices, np.float32), tri_verts=np.asarray(t.faces, np.uint32)))
        if man.volume() < 0:
            man = M(mf.Mesh(vert_properties=np.ascontiguousarray(v, np.float32), tri_verts=np.ascontiguousarray(f[:, ::-1], np.uint32)))
        if simplify:
            man = man.simplify(simplify)
        return man


_SRC_HASH = None


def _src_hash():
    global _SRC_HASH
    if _SRC_HASH is None:
        import hashlib, os
        here = os.path.dirname(os.path.abspath(__file__))
        hsh = hashlib.sha1()
        for f in ("sdf.py", "mascot.py"):
            hsh.update(open(os.path.join(here, f), "rb").read())
        _SRC_HASH = hsh.hexdigest()[:12]
    return _SRC_HASH


def mesh_sdf(fn, lo, hi, h, simplify=0.015, key=None):
    """Mesh an SDF; results are cached on disk per (source hash, key) so every script that rebuilds
    the parts gets bit-identical meshes quickly."""
    import os
    path = None
    if key:
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "cache")
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, f"{_src_hash()}_{key}.npz")
        if os.path.exists(path):
            z = np.load(path)
            return M(mf.Mesh(vert_properties=z["v"], tri_verts=z["f"]))
    g = Grid(lo, hi, h)
    man = g.mesh(fn(g.P), simplify)
    if path:
        mm = man.to_mesh()
        np.savez(path, v=np.asarray(mm.vert_properties, np.float32), f=np.asarray(mm.tri_verts, np.uint32))
    return man


def local_frame(P, origin, u, w):
    """Coordinates of P in a frame with axes u, w (unit, in the XZ plane) and world Y as depth."""
    x, y, z = P[0] - origin[0], P[1] - origin[1], P[2] - origin[2]
    a = x * u[0] + y * u[1] + z * u[2]
    b = x * w[0] + y * w[1] + z * w[2]
    return a, b, P[1]


def chain(P, pts, radii, k=0.25):
    """A finger: round cones through a list of points (any coordinate system shared with P)."""
    d = None
    for i in range(len(pts) - 1):
        s = round_cone(P, pts[i], pts[i + 1], radii[i], radii[i + 1])
        d = s if d is None else smin(d, s, k)
    return d
