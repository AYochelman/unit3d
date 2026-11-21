"""Export coloured GLB scenes of the real meshes and render them with three.js (render.mjs)."""
import json, os, subprocess
import numpy as np
import trimesh
from geom import to_trimesh

RENDER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "render")


def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return list(srgb_to_lin(rgb)) + [a]


def export_glb(items, path):
    """items: list of (Manifold or trimesh, hex colour)."""
    scene = trimesh.Scene()
    for i, (m, col) in enumerate(items):
        tm = m if isinstance(m, trimesh.Trimesh) else to_trimesh(m)
        if len(tm.faces) == 0:
            continue
        tm = trimesh.graph.smooth_shade(tm, angle=np.radians(32))
        mat = trimesh.visual.material.PBRMaterial(baseColorFactor=hex_rgba(col), roughnessFactor=0.55, metallicFactor=0.0)
        tm.visual = trimesh.visual.TextureVisuals(material=mat)
        scene.add_geometry(tm, node_name=f"m{i}")
    scene.export(path)
    return path


def _abs(jobs):
    for j in jobs:
        j["glb"] = os.path.abspath(j["glb"])
        for v in j["views"]:
            v["out"] = os.path.abspath(v["out"])
    return jobs


def render(jobs, json_path):
    json_path = os.path.abspath(json_path)
    with open(json_path, "w") as f:
        json.dump(_abs(jobs), f)
    r = subprocess.run(["node", os.path.join(RENDER_DIR, "render.mjs"), json_path], cwd=RENDER_DIR,
                       capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-3000:])
    return r.stdout
