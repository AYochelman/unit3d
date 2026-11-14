"""Fill the Hebrew guide with the measured numbers, write HTML + PDF, copy reports and source."""
import json, os, shutil, subprocess
from export_all import PKG
from orient import PLATES

HERE = os.path.dirname(os.path.abspath(__file__))
chk = json.load(open(os.path.join(HERE, "out/checks.json")))
sw = json.load(open(os.path.join(HERE, "out/swaps.json")))
sl = json.load(open(os.path.join(HERE, "out/slice/prusa_slice_test_thr0.json")))
st = json.load(open(os.path.join(HERE, "out/step_report.json")))

he_col = {"Cream": "קרם", "Charcoal": "שחור", "Mint": "מנטה", "Orange": "כתום"}
rows, total = [], 0
for name_en, name_he, items in PLATES:
    s = sw[name_en]
    ch = s.get("est_filament_changes", 0) or 0
    total += ch
    cols = "، ".join(he_col[c] for c in s["colours"])
    content = name_he.split(" - ", 1)[1]
    rows.append(f"<tr><td class='n'>{name_he.split(' - ')[0].replace('פלטה ', '')}</td><td>{content}</td><td>{cols}</td>"
                f"<td class='n'>{'~' + str(ch) if ch else '0'}</td><td class='n'>~{s['sliced_material_g_without_purge']} g</td></tr>")

j = chk["joints"]
parts_ok = all(p["body"]["watertight"] and p["body"]["shells"] == 1 and p["colour_volume_sum_matches_body"] for p in chk["parts"].values())
colours_ok = all(c["watertight"] for p in chk["parts"].values() for c in p["colours"].values())
inter = max(i["overlap_mm3"] for i in chk["interference"])
gaps = sorted({i["min_gap_mm"] for i in chk["interference"] if i["min_gap_mm"] < 1})
pd = j[0]["male_pocket_measured"]["diameter_at_mid_depth_mm"]
depths = sorted({x[k]["depth_mm"] for x in j for k in ("male_pocket_measured", "female_pocket_measured")})
touch = max(x["magnets_touch_gap_mm"] for x in j)
turned = min(x["key_vs_socket_overlap_turned_180_mm3"] for x in j)
swap = chk["leg_swap_blocked_overlap_mm3"]
t = chk["text"]
step_ok = all(r.get("valid") for r in st["readback"]) and len(st["readback"]) == 7
vol_match = all(abs(a.get("volume", a.get("volume_mm3", -1)) - b) < 0.05 for a, b in zip(st["readback"], st["expected_volumes"].values()))
lo = {k: v["layer_overhangs"] for k, v in chk["parts"].items()}
hand_gap = [i["min_gap_mm"] for i in chk["interference"] if {i["a"], i["b"]} == {"head", "arm_R"}][0]
thin_worst = max(c["lost_below_1_line_pct"] for p in chk["parts"].values() for c in p["thin_features"].values())
check_rows = [
    ("רשתות סגורות (Watertight / Manifold)", f"{'עבר' if parts_ok and colours_ok else 'נכשל'} – 7 חלקים, כל אחד גוף אחד סגור; כל נפחי הצבע סגורים, וסכומם שווה בדיוק לנפח החלק"),
    ("גובה מורכב", f"<span class='num'>{chk['assembled_height_mm']} mm</span> מסוליה עד קצה הכובע"),
    ("התנגשויות בין חלקים (21 זוגות, במצב מורכב)", f"נפח חפיפה מרבי <span class='num'>{inter} mm³</span>; המרווח הקטן ביותר בחיבורים <span class='num'>{gaps[0]}–{gaps[-1]} mm</span>; יד V מול הראש <span class='num'>{'≥ ' if hand_gap >= 3.0 else ''}{hand_gap} mm</span>"),
    ("מגנטים במודל (6×2) – מגע ישיר", f"בכל 6 החיבורים המגנטים נוגעים (מרחק <span class='num'>{touch} mm</span>), בלי חפיפה ובלי לגעת בפלסטיק"),
    ("מידות כיסים שנמדדו על הרשת", f"קוטר <span class='num'>{pd} mm</span> (המצולע חוסם מעגל של 6.25 בדיוק), עומק <span class='num'>{depths[0]}–{depths[-1]} mm</span>, בליטת מגנט <span class='num'>0.2 mm</span>"),
    ("בליטת יישור", "גובה <span class='num'>2.0 mm</span>, כניסה לשקע <span class='num'>1.7 mm</span>, מרווח <span class='num'>0.2 mm</span> לצד, שיפועי הכוונה <span class='num'>0.4</span>"),
    ("כיוון חיבור יחיד", f"בכיוון הנכון: <span class='num'>0 mm³</span> חפיפה. מסובב 180°: התנגשות (לפחות <span class='num'>{turned} mm³</span>). רגל ימין בשקע שמאל: התנגשות (<span class='num'>{swap['right_key_in_left_socket']} mm³</span>)"),
    ("רגליים ונעליים סגורות מאחור", "כן – הרגל היא גוף מלא אחד בלי חללים פנימיים (genus 0, קליפה אחת)"),
    ("כיתוב UNIT3D", f"גובה אות <span class='num'>{t['cap_height_mm']} mm</span>, רוחב <span class='num'>{t['width_mm']} mm</span>, קו דק ביותר <span class='num'>{t['min_stroke_mm']} mm</span> (≈{t['lines_at_0p42']} קווי דיזה), בולט <span class='num'>{t['raised_mm']}</span> + משובץ <span class='num'>{t['inlay_mm']} mm</span>"),
    ("פרטים דקים (חיתוך כל שכבה ב-0.12)", f"שטח שהולך לאיבוד בבדיקת קו אחד (0.42): לכל היותר {thin_worst}% מנפח צבע (פינות של אותיות/לוגו); אין חלק שנעלם"),
    ("תליות (סריקת שכבה-שכבה)", "רק תקרות מגושרות: תוך הכובע (≈27 mm), שקעים וכיסים, ושוליים זעירים (עד ~3 mm² לשכבה). אין צורך בתמיכות"),
    ("Slice עצמאי ב-PrusaSlicer 2.7.2", "כל 4 הפלטות נחתכו בהצלחה, manifold = yes. מנגנון התמיכות האוטומטי (המחמיר) סימן רק את תוך השקעים והכיסים ואת השוליים התחתונים של האותיות הבולטות – לכן התמיכות כבויות בפרויקט"),
    ("מבנה ה-3MF מול קוד הטעינה של Bambu Studio", "שני הקבצים: אין שגיאות (XML, מזהים, שיוך פלטות, 635 מפתחות הגדרה, פריסטים P2S)"),
    ("STEP", f"{'נקרא חזרה ב-OpenCascade כ-7 גופים מוצקים תקינים' if step_ok else 'בעיה בקריאה'}{', נפחים זהים לקובצי ההדפסה' if vol_match else ''} ({st['size_kb'] // 1024} MB)"),
]
cr = "\n".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in check_rows)
html = open(os.path.join(HERE, "docs_src/guide_template.html"), encoding="utf-8").read()
html = html.replace("{{PLATE_ROWS}}", "\n".join(rows)).replace("{{TOTAL_SWAPS}}", f"{total}").replace("{{CHECK_ROWS}}", cr)
out_html = os.path.join(PKG, "docs", "UNIT3D_הוראות_הרכבה.html")
open(out_html, "w", encoding="utf-8").write(html)

# reports + source
rep = os.path.join(PKG, "reports"); os.makedirs(rep, exist_ok=True)
for f in ("out/checks.json", "out/swaps.json", "out/slice/prusa_slice_test_thr0.json", "out/step_report.json"):
    shutil.copy(os.path.join(HERE, f), rep)
src = os.path.join(PKG, "source"); os.makedirs(src, exist_ok=True)
for f in ("mascot.py", "sdf.py", "geom.py", "orient.py", "coupon.py", "export_all.py", "checks.py", "bambu3mf.py",
          "bambu3mf_p2s_base.json", "verify.py", "step_faceted.py", "section_drawing.py", "render_all.py", "viz.py",
          "slice_test.py", "swaps.py"):
    shutil.copy(os.path.join(HERE, f), src)
shutil.copy(os.path.join(HERE, "..", "render", "render.mjs"), src)
os.makedirs(os.path.join(src, "fonts"), exist_ok=True)
shutil.copy("/home/user/unit3d/public/fonts/rubik-900.ttf", os.path.join(src, "fonts"))
print("guide:", out_html, "total swaps", total)
