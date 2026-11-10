"""Print orientation + plate layout (P2S bed 256 x 256 mm)."""
import numpy as np
from mascot import TORSO_Z0, CAP_Z0

# rotation (x, y, z) -> (x, z, -y): figure's back (+Y) goes down onto the plate
R_BACK_DOWN = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
I3 = np.eye(3)

ORIENT = {
    # part: (rotation, human description (he), reason)
    "torso": (I3, "עומד (תחתית המכנסיים על המשטח)", "Upright: leg sockets bridge (<=10.4 mm), arm sockets on side walls, neck key on top."),
    "leg_R": (I3, "עומדת (סוליה על המשטח)", "Upright: sole on plate, key + pocket on top."),
    "leg_L": (I3, "עומדת (סוליה על המשטח)", "Upright: sole on plate, key + pocket on top."),
    "arm_R": (R_BACK_DOWN, "שוכבת על הגב השטוח", "Flat back on plate: fingers print along their length, key lies flat on the plate."),
    "arm_L": (R_BACK_DOWN, "שוכבת על הגב השטוח", "Flat back on plate."),
    "head": (R_BACK_DOWN, "פנים כלפי מעלה (גב הראש על המשטח)", "Face-up: visor + eyes are top surfaces; ears have 45 deg skirts toward the plate; back edge chamfered 45 deg."),
    "cap": (I3, "כתר למעלה (בסיס + מצחייה על המשטח)", "Crown up: brim flat on plate, socket bridges (<=11.4 mm)."),
}

# plates: (name_en, name_he, [(part, x, y)]) ; x,y = where the part's footprint centre goes
PLATES = [
    ("Plate 1 - Magnet test coupon", "פלטה 1 - דוגמית בדיקת מגנטים", [("coupon", 100, 110)]),
    ("Plate 2 - Torso (chest shell)", "פלטה 2 - גוף/חזה", [("torso", 100, 110)]),
    ("Plate 3 - Legs + arms", "פלטה 3 - רגליים + ידיים", [("leg_R", 70, 75), ("leg_L", 130, 75), ("arm_R", 70, 145), ("arm_L", 130, 145)]),
    ("Plate 4 - Head + cap", "פלטה 4 - ראש + כובע", [("head", 72, 110), ("cap", 138, 110)]),
]


def print_pose(name, m):
    """Return manifold in print pose with min z = 0 and footprint centred at (0,0)."""
    R = ORIENT[name][0]
    T = np.hstack([R, np.zeros((3, 1))])
    mm = m.transform(T)
    bb = mm.bounding_box()
    return mm.translate([-(bb[0] + bb[3]) / 2, -(bb[1] + bb[4]) / 2, -bb[2]])


def pose_matrix(name, m_body):
    """4x4 matrix assembled -> print pose (centred, z0=0) computed from the body."""
    R = ORIENT[name][0]
    T = np.hstack([R, np.zeros((3, 1))])
    bb = m_body.transform(T).bounding_box()
    t = np.array([-(bb[0] + bb[3]) / 2, -(bb[1] + bb[4]) / 2, -bb[2]])
    M4 = np.eye(4)
    M4[:3, :3] = R
    M4[:3, 3] = t
    return M4
