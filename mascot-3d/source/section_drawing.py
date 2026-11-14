"""2D section drawings of real joints, sliced from the exported meshes (not redrawn by hand)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from mascot import build_all, JOINTS, MAG_D, MAG_T, POCKET_D, POCKET_DEPTH, KEY_CLEAR, SEAM, PROTRUDE, BOSS_H
from export_all import PKG

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
COL = {"male": (232, 225, 208), "female": (70, 72, 78), "magnet": (190, 197, 207)}


def local_section(m, j):
    """Slice solid m through the plane that contains the joint axis (local x-z plane)."""
    T = np.vstack([j.T, [0, 0, 0, 1]])
    Ti = np.linalg.inv(T)
    # local (x, y, z) -> (x, z, -y): the local y=0 plane becomes z=0
    R = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], float)
    A = (R @ Ti)[:3, :]
    return m.transform(A).slice(0.0)


def draw_joint(key, parts, out, title):
    j = JOINTS[key]
    W, H, S = 1200, 900, 48.0          # px, px, px per mm
    cx, cy = W / 2, H / 2 + 20
    win = 11.0
    im = Image.new("RGB", (W, H), (24, 28, 34))
    d = ImageDraw.Draw(im)
    f, fb, fs = ImageFont.truetype(FONT, 22), ImageFont.truetype(FONTB, 26), ImageFont.truetype(FONT, 18)

    def P(x, z):
        return (cx + x * S, cy - z * S)

    from manifold3d import CrossSection as CS
    clip = CS.square([2 * win, 2 * win], center=True)
    for role in ("female", "male"):
        cs = local_section(parts[getattr(j, role)].body, j) ^ clip
        for poly in cs.to_polygons():
            pts = [P(x, z) for x, z in poly]
            d.polygon(pts, fill=COL[role])
        # outlines
        for poly in cs.to_polygons():
            pts = [P(x, z) for x, z in poly] + [P(*poly[0])]
            d.line(pts, fill=(15, 15, 18), width=2)
    # magnets (as placed by the checks: seated on pocket floors, touching at z=0)
    r = MAG_D / 2
    for z0, z1 in ((-MAG_T, 0.0), (0.0, MAG_T)):
        d.rectangle([P(-r, z1), P(r, z0)], fill=COL["magnet"], outline=(40, 40, 40), width=2)
    d.line([P(-win, 0), P(win, 0)], fill=(255, 120, 80), width=1)

    def T(xy, text, font, fill):
        x, y = xy
        tw = d.textlength(text, font=font)
        d.rectangle([x - 4, y - 2, x + tw + 4, y + font.size + 4], fill=(24, 28, 34))
        d.text((x, y), text, fill=fill, font=font)

    def dim_h(x0, x1, z, text, up=True):
        a, b = P(x0, z), P(x1, z)
        d.line([a, b], fill=(120, 230, 190), width=2)
        for p in (a, b):
            d.line([(p[0], p[1] - 8), (p[0], p[1] + 8)], fill=(120, 230, 190), width=2)
        tw = d.textlength(text, font=f)
        T(((a[0] + b[0]) / 2 - tw / 2, a[1] - (32 if up else -12)), text, f, (200, 255, 230))

    def dim_v(x, z0, z1, text, right=True):
        a, b = P(x, z0), P(x, z1)
        d.line([a, b], fill=(120, 230, 190), width=2)
        for p in (a, b):
            d.line([(p[0] - 8, p[1]), (p[0] + 8, p[1])], fill=(120, 230, 190), width=2)
        T((a[0] + (12 if right else -12 - d.textlength(text, font=f)), (a[1] + b[1]) / 2 - 12), text, f, (200, 255, 230))

    kw = j.key[0] / 2
    dim_h(-POCKET_D / 2, POCKET_D / 2, j.z_fem_floor + POCKET_DEPTH + 0.6, f"pocket Ø{POCKET_D:.2f}")
    dim_v(POCKET_D / 2 + 0.4, j.z_fem_floor, j.z_fem_floor + POCKET_DEPTH, f"{POCKET_DEPTH:.1f} deep")
    dim_v(-POCKET_D / 2 - 0.4, j.z_boss_top, j.z_boss_top - POCKET_DEPTH, f"{POCKET_DEPTH:.1f} deep", right=False)
    dim_v(-kw - 1.2, j.z_male_sh, j.z_boss_top, f"key {BOSS_H:.0f} high", right=False)
    kw = j.key[0] / 2
    dim_v(kw + 2.6, j.z_male_sh, j.z_fem_rim, f"seam {SEAM:.1f}")
    dim_h(-kw, kw, j.z_male_sh - 2.4, f"key {j.key[0]:.0f} mm  (+{KEY_CLEAR:.1f}/side clearance)", up=False)
    d.text((24, 20), title, fill=(235, 240, 245), font=fb)
    d.text((24, 60), f"magnet {MAG_D:.0f}x{MAG_T:.0f} mm sticks out {PROTRUDE:.1f} mm -> magnets touch at the orange line, faces stay {SEAM:.1f} mm apart",
           fill=(190, 200, 210), font=fs)
    d.text((24, H - 40), "cut through the joint axis of the exported meshes  |  light = male part (key), dark = female part (socket), grey = magnets",
           fill=(150, 160, 170), font=fs)
    # scale bar
    d.line([P(-win + 0.5, -win + 1.2), P(-win + 5.5, -win + 1.2)], fill=(230, 230, 230), width=3)
    d.text(P(-win + 0.5, -win + 2.2), "5 mm", fill=(230, 230, 230), font=fs)
    im.save(out)


def main():
    parts = build_all()
    img = os.path.join(PKG, "images")
    draw_joint("legL", parts, os.path.join(img, "section_joint_leg.png"), "LEG -> TORSO joint (vertical), real section")
    draw_joint("armL", parts, os.path.join(img, "section_joint_arm.png"), "ARM -> TORSO joint (side), real section")
    draw_joint("neck", parts, os.path.join(img, "section_joint_neck.png"), "HEAD -> TORSO joint, real section")
    print("sections done")


if __name__ == "__main__":
    main()
