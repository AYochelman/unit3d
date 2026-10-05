"use client";
import { useEffect, useState } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";

/**
 * Glyph Portal (21st.dev, MIT, Christian Katzmann) on the site's own terms,
 * for the owner to look at before it goes anywhere public: "U3D" in the
 * site's Assistant at 800, the dark ink page, the brand green inside the
 * letters, Hebrew copy. It scrolls inside its own box, so the admin page
 * around it stays put.
 *
 * The component measures the letters with the font it is given, so it is
 * mounted only once Assistant is ready; a late font would move the ink
 * under the camera.
 */
const FAMILY = '"Assistant", Arial, sans-serif';

const FIELD =
  "radial-gradient(circle at 18% 10%, rgba(95,227,154,.45), transparent 34%), radial-gradient(circle at 82% 22%, rgba(247,250,248,.10), transparent 28%), radial-gradient(circle at 50% 80%, rgba(4,17,11,.55), transparent 46%), linear-gradient(135deg,#0D2117 0%,#089a47 52%,#06150e 100%)";

export default function GlyphPortalDemo() {
  const [face, setFace] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const done = (f: string) => { if (alive) setFace(f); };
    const t = window.setTimeout(() => done("Arial, sans-serif"), 1600);
    void document.fonts.load('800 100px "Assistant"', "U3D").then(() => done(FAMILY), () => done("Arial, sans-serif"));
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return (
    <section className="grid gap-3">
      <h2 className="font-black text-lg">רכיב: כניסה דרך האות</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        מגללים, והמצלמה צוללת לתוך אחת האותיות של U3D עד שהירוק שבתוכה ממלא את המסך, ושם נפתח התוכן הבא. אפשר לבחור לפני הגלילה
        דרך איזו אות להיכנס (מעבר עכבר או לחיצה). כאן הוא נגלל בתוך המסגרת. עדיין לא מופיע לגולשים.
      </p>
      <div
        data-gp-demo
        tabIndex={0}
        role="region"
        aria-label="U3D. גלול כדי להיכנס."
        className="relative w-full rounded-2xl border border-ink-800 overflow-y-auto"
        style={{ height: "min(640px, 80svh)", containerType: "inline-size" }}
      >
        <style>{`
          [data-gp-demo] [data-gp-caption]{inset:calc(var(--gp-word-bottom,50%) + 76px) 24px auto;justify-content:center;}
          [data-gp-demo] [data-gp-hint]{display:none;}
          [data-gp-demo] [data-gp-enter]{min-height:46px;padding:0 22px;gap:14px;background:#0D2117;border:1px solid #16402A;border-radius:999px;color:#F7FAF8;font-size:14px;font-weight:600;}
          [data-gp-demo] [data-gp-enter]:hover{background:#16402A;}
          [data-gp-demo] [data-gp-touch-picker]{top:auto;bottom:18px;}
          [data-gp-demo] [data-gp-select]{border-color:#16402A;border-radius:10px;background:#0D2117;color:#C9D6CE;}
          [data-u3d-eyebrow]{position:absolute;inset:auto 24px calc(100% - var(--gp-word-top,35%) + 28px);margin:0;text-align:center;font-size:13px;letter-spacing:.2em;color:#5FE39A;font-family:"JetBrains Mono",monospace;}
          [data-u3d-support]{position:absolute;inset:calc(var(--gp-word-bottom,50%) + 24px) 24px auto;margin:0;text-align:center;font-size:17px;color:#A8B8AE;}
          [data-u3d-scroll]{position:absolute;inset:auto 24px 6%;text-align:center;color:#8FA598;font-size:12px;}
          @container(max-width:450px){[data-u3d-support]{font-size:15px;}}
          @media(any-pointer:coarse){[data-u3d-scroll]{bottom:auto;top:calc(var(--gp-word-bottom,50%) + 132px);}}
          [data-gp-demo] [data-gp-content]{padding:4.5rem clamp(1.25rem,5cqw,4rem) 5rem;font-family:inherit;}
          [data-u3d-copy]{display:grid;gap:2rem;max-width:64rem;margin:auto;}
          [data-u3d-copy] h3{margin:0;font-size:clamp(1.6rem,1rem + 2cqw,2.4rem);font-weight:700;line-height:1.2;color:#F7FAF8;}
          [data-u3d-steps]{display:grid;gap:1.5rem;}
          [data-u3d-step]{border-top:1px solid rgba(247,250,248,.22);padding-top:1rem;}
          [data-u3d-step] b{display:block;font-size:1.1rem;color:#F7FAF8;}
          [data-u3d-step] p{margin:.4rem 0 0;color:rgba(247,250,248,.85);font-size:.95rem;line-height:1.6;}
          @container(min-width:768px){[data-u3d-steps]{grid-template-columns:repeat(3,minmax(0,1fr));gap:2.5rem;}}
        `}</style>
        {face ? (
          <GlyphPortal
            word="U3D"
            fontFamily={face}
            fontWeight={800}
            interactive
            scrollLength={2.4}
            enterLabel="להיכנס פנימה"
            background={<div style={{ position: "absolute", inset: 0, transform: "scale(var(--gp-field-scale,1))", background: FIELD }} />}
            style={{ "--gp-paper": "#04110B", "--gp-ink": "#F7FAF8", "--gp-field": "#0b3b25", "--gp-foreground": "#F7FAF8", fontFamily: face }}
            front={
              <div dir="rtl">
                <p data-u3d-eyebrow>STUDIO · GIVATAYIM</p>
                <p data-u3d-support>כל רעיון. מודפס. בידיים שלך.</p>
                <span data-u3d-scroll>גללו פנימה ↓</span>
              </div>
            }
          >
            <div data-u3d-copy dir="rtl">
              <h3>מה שמחכה בפנים.</h3>
              <div data-u3d-steps>
                <div data-u3d-step><b>01 · בוחרים</b><p>מוצר מהמדפים, סמל יחידה, או קובץ משלכם.</p></div>
                <div data-u3d-step><b>02 · מעצבים</b><p>צבע, חומר, טקסט או לוגו. רואים את התוצאה לפני ההזמנה.</p></div>
                <div data-u3d-step><b>03 · מקבלים</b><p>מודפס בגבעתיים, נשלח לכל הארץ תוך 3-5 ימי עסקים.</p></div>
              </div>
            </div>
          </GlyphPortal>
        ) : (
          <div role="status" className="h-full grid place-items-center text-xs text-ink-400">טוען…</div>
        )}
      </div>
    </section>
  );
}
