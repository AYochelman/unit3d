"""Documentation renders — every image is the exported print geometry, no artistic retouching."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from manifold3d import Manifold as M
from mascot import build_all, FILAMENTS, JOINTS
from orient import PLATES, pose_matrix
from coupon import coupon_parts_print, COUPON_LAYOUT
from geom import box_minmax
from viz import export_glb, render
from export_all import PKG

IMG = os.path.join(PKG, "images")
PRE = os.path.join(PKG, "preview")
COLS = {f["slot"]: f["color"] for f in FILAMENTS}
MAGNET = "#c9ced6"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def label(img_path, text):
    im = Image.open(img_path).convert("RGB")
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, max(16, im.width // 30))
    d.text((16, im.height - f.size - 14), text, fill=(200, 210, 220), font=f)
    im.save(img_path)


def sheet(paths, out, cols=None, scale=1.0):
    ims = [Image.open(p).convert("RGB") for p in paths]
    cols = cols or len(ims)
    rows = (len(ims) + cols - 1) // cols
    w, h = ims[0].size
    s = Image.new("RGB", (w * cols, h * rows), (23, 27, 33))
    for i, im in enumerate(ims):
        s.paste(im, ((i % cols) * w, (i // cols) * h))
    if scale != 1.0:
        s = s.resize((int(s.width * scale), int(s.height * scale)), Image.LANCZOS)
    s.save(out)


def main():
    parts = build_all()
    vols = {k: p.color_volumes() for k, p in parts.items()}
    # ---- assembled multi-view
    items = [(v, COLS[c]) for k in parts for c, v in vols[k].items()]
    glb = export_glb(items, os.path.join(PRE, "UNIT3D_assembled.glb"))
    T = [0, 0, 60]
    names = [("front", 0, 6), ("three_quarter_front", 35, 12), ("side", 90, 6), ("three_quarter_back", 145, 12), ("back", 180, 8)]
    views = [dict(az=a, el=e, out=os.path.join(IMG, f"assembled_{n}.png"), fit=0.80, target=T) for n, a, e in names]
    hero = [dict(az=28, el=10, out=os.path.join(IMG, "assembled_hero.png"), fit=0.74, target=[0, 0, 61])]
    # ---- exploded
    off = {"cap": (0, 0, 20), "head": (0, 0, 10), "torso": (0, 0, 0), "arm_R": (-13, 0, 0), "arm_L": (13, 0, 0),
           "leg_R": (0, 0, -11), "leg_L": (0, 0, -11)}
    ex = [(v.translate(list(off[k])), COLS[c]) for k in parts for c, v in vols[k].items()]
    mags = []
    for j in JOINTS.values():
        mm, fm = j.magnets()
        mags += [(mm.translate(list(off[j.male])), MAGNET), (fm.translate(list(off[j.female])), MAGNET)]
    glb_ex = export_glb(ex + mags, os.path.join(PRE, "UNIT3D_exploded.glb"))
    exv = [dict(az=22, el=12, out=os.path.join(IMG, "exploded_front.png"), fit=0.74, target=[0, 0, 58]),
           dict(az=200, el=-28, out=os.path.join(IMG, "exploded_from_below.png"), fit=0.74, target=[0, 0, 58])]
    # ---- section through the joints (front half removed) with magnets in place
    cut = box_minmax((-80, -80, -10), (80, -1.5, 140))   # removes y < -1.5 (front)
    sec = [((v - cut), COLS[c]) for k in parts for c, v in vols[k].items()]
    smag = []
    for j in JOINTS.values():
        for m in j.magnets():
            smag.append((m - cut, MAGNET))
    glb_sec = export_glb(sec + smag, os.path.join(PRE, "UNIT3D_section.glb"))
    secv = [dict(az=-28, el=12, out=os.path.join(IMG, "section_joints.png"), fit=0.80, target=[0, 0, 60], fov=24),
            dict(az=-24, el=14, out=os.path.join(IMG, "section_neck_cap_zoom.png"), dist=105, target=[0, 0, 92], fov=24),
            dict(az=-24, el=14, out=os.path.join(IMG, "section_leg_arm_zoom.png"), dist=120, target=[0, 0, 40], fov=24)]
    # ---- print poses: each part alone
    jobs = [dict(glb=glb, width=800, height=1000, views=views + hero),
            dict(glb=glb_ex, width=1000, height=1100, views=exv),
            dict(glb=glb_sec, width=1000, height=1100, background="#1b1f25", views=secv)]
    for k, p in parts.items():
        M4 = pose_matrix(k, p.body)
        pi = [(v.transform(M4[:3, :]), COLS[c]) for c, v in vols[k].items()]
        g = export_glb(pi, os.path.join(PRE, f"print_pose_{k}.glb"))
        jobs.append(dict(glb=g, width=700, height=600, views=[dict(az=30, el=35, out=os.path.join(IMG, f"print_pose_{k}.png"), fit=0.85)]))
    # ---- plates (large)
    for i in range(len(PLATES)):
        g = os.path.join(PRE, f"plate_{i + 1}.glb")
        jobs.append(dict(glb=g, width=1200, height=900, background="#22272e", grid=dict(size=256, div=16, cx=128, cz=-128),
                         views=[dict(az=0, el=55, out=os.path.join(IMG, f"plate_{i + 1}.png"), target=[118, 115, 0], dist=330, fov=30)]))
    render(jobs, os.path.join(os.path.dirname(PKG), "jobs_docs.json"))

    sheet([os.path.join(IMG, f"assembled_{n}.png") for n, _, _ in names], os.path.join(IMG, "multiview_5.png"), scale=0.6)
    sheet([os.path.join(IMG, f"print_pose_{k}.png") for k in ["torso", "head", "cap", "arm_R", "arm_L", "leg_R"]],
          os.path.join(IMG, "print_poses.png"), cols=3, scale=0.7)
    sheet([os.path.join(IMG, f"plate_{i + 1}.png") for i in range(len(PLATES))], os.path.join(IMG, "plates_all.png"), cols=2, scale=0.6)
    print("renders done")


if __name__ == "__main__":
    main()
