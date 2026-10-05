"use client";
import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import GlyphPortal from "@/components/ui/glyph-portal";

/**
 * "התהליך" — the four steps, entered through a letter.
 *
 * The owner picked the Glyph Portal for this section: the word fills the
 * screen, scrolling dives the camera into one of its letters until the green
 * inside fills the view, and the four steps open there. The steps are real
 * content in the page (crawlers, screen readers and reduced motion read them
 * as a plain section), not a picture.
 *
 * The portal measures its letters with the font it is given, so it mounts
 * once Assistant is ready; until then the word sits there as plain text.
 */
type Step = { index: string; iconKey: IconName; title: string; desc: string };

const STEPS: Step[] = [
  { index: "01", iconKey: "sparkles", title: "בוחרים", desc: "בקטלוג, במעצב, או שולחים קובץ." },
  { index: "02", iconKey: "settings", title: "מתאמים", desc: "אני חוזר אליך בוואטסאפ עם הצעה." },
  { index: "03", iconKey: "check", title: "מאשרים", desc: "רואים render סופי, מאשרים, ומשלמים." },
  { index: "04", iconKey: "package", title: "מקבלים", desc: "3-5 ימים בדואר או אצלך הביתה." },
];

const WORD = "התהליך";
const FAMILY = '"Assistant", Arial, sans-serif';
const FIELD =
  "radial-gradient(circle at 18% 10%, rgba(95,227,154,.45), transparent 34%), radial-gradient(circle at 82% 22%, rgba(247,250,248,.10), transparent 28%), radial-gradient(circle at 50% 80%, rgba(4,17,11,.55), transparent 46%), linear-gradient(135deg,#0D2117 0%,#089a47 52%,#06150e 100%)";

function Steps() {
  return (
    <div data-hiw-copy dir="rtl">
      <h2 data-hiw-title>
        4 צעדים מהרעיון <span>לקופסה אצלך הביתה.</span>
      </h2>
      <ol data-hiw-steps>
        {STEPS.map((s) => (
          <li key={s.index} data-hiw-step>
            <span data-hiw-icon>
              <Icon name={s.iconKey} size={22} />
            </span>
            <span data-hiw-no>{s.index}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HowItWorks() {
  const [face, setFace] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const done = (f: string) => { if (alive) setFace(f); };
    const spec = `800 100px "Assistant"`;
    if (document.fonts.check(spec, WORD)) { queueMicrotask(() => done(FAMILY)); return () => { alive = false; }; }
    // Long enough for a slow phone; after it, the fallback stack is measured instead.
    const t = window.setTimeout(() => done(FAMILY), 4000);
    void document.fonts.load(spec, WORD).then(() => done(FAMILY), () => done(FAMILY));
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return (
    <div data-hiw className="border-y border-ink-800/60" style={{ containerType: "inline-size" }}>
      <style>{`
        [data-hiw] [data-gp-caption]{inset:calc(var(--gp-word-bottom,50%) + 76px) 24px auto;justify-content:center;}
        [data-hiw] [data-gp-hint]{display:none;}
        [data-hiw] [data-gp-enter]{min-height:46px;padding:0 22px;gap:14px;background:#0D2117;border:1px solid #16402A;border-radius:999px;color:#F7FAF8;font-size:14px;font-weight:600;}
        [data-hiw] [data-gp-enter]:hover{background:#16402A;}
        /* Tapping a letter chooses it; the extra picker would sit on the finder bubble. */
        [data-hiw] [data-gp-touch-picker]{display:none!important;}
        [data-hiw] [data-gp-select]{border-color:#16402A;border-radius:10px;background:#0D2117;color:#C9D6CE;}
        [data-hiw-eyebrow]{position:absolute;inset:auto 24px calc(100% - var(--gp-word-top,35%) + 28px);margin:0;text-align:center;font-size:12px;letter-spacing:.2em;color:#5FE39A;font-family:"JetBrains Mono",monospace;}
        [data-hiw-support]{position:absolute;inset:calc(var(--gp-word-bottom,50%) + 24px) 24px auto;margin:0;text-align:center;font-size:17px;color:#A8B8AE;}
        [data-hiw-scroll]{position:absolute;inset:auto 24px 6%;text-align:center;color:#8FA598;font-size:12px;}
        @media(any-pointer:coarse){[data-hiw-scroll]{bottom:auto;top:calc(var(--gp-word-bottom,50%) + 132px);}}
        @container(max-width:450px){[data-hiw-support]{font-size:15px;}}
        [data-hiw] [data-gp-content]{padding:5rem clamp(1.5rem,6cqw,6rem);font-family:inherit;}
        [data-hiw-copy]{display:grid;gap:3rem;width:min(100%,80rem);margin:auto;}
        [data-hiw-title]{margin:0;font-size:clamp(1.9rem,1rem + 3cqw,3.4rem);font-weight:700;line-height:1.15;color:#F7FAF8;}
        [data-hiw-title] span{color:#C9F7DC;}
        [data-hiw-steps]{list-style:none;margin:0;padding:0;display:grid;gap:2rem;}
        [data-hiw-step]{display:grid;gap:.6rem;justify-items:start;border-top:1px solid rgba(247,250,248,.25);padding-top:1.25rem;}
        [data-hiw-icon]{display:inline-flex;align-items:center;justify-content:center;width:3rem;height:3rem;border-radius:.9rem;background:rgba(4,17,11,.55);border:1px solid rgba(247,250,248,.22);color:#5FE39A;}
        [data-hiw-no]{font:500 11px "JetBrains Mono",monospace;letter-spacing:.2em;color:rgba(247,250,248,.7);}
        [data-hiw-step] h3{margin:0;font-size:1.35rem;font-weight:800;color:#F7FAF8;}
        [data-hiw-step] p{margin:0;font-size:.95rem;line-height:1.6;color:rgba(247,250,248,.88);}
        @container(min-width:768px){[data-hiw-steps]{grid-template-columns:repeat(4,minmax(0,1fr));gap:2.5rem;}}
      `}</style>
      {face ? (
        <GlyphPortal
          word={WORD}
          fontFamily={face}
          fontWeight={800}
          interactive
          scrollLength={2.4}
          enterLabel="לראות את התהליך"
          background={<div style={{ position: "absolute", inset: 0, transform: "scale(var(--gp-field-scale,1))", background: FIELD }} />}
          style={{ "--gp-paper": "#04110B", "--gp-ink": "#F7FAF8", "--gp-field": "#0b3b25", "--gp-foreground": "#F7FAF8", fontFamily: face }}
          front={
            <div dir="rtl">
              <p data-hiw-eyebrow>HOW IT WORKS · 4 STEPS</p>
              <p data-hiw-support>מהרעיון לקופסה אצלך הביתה.</p>
              <span data-hiw-scroll>גללו פנימה ↓</span>
            </div>
          }
        >
          <Steps />
        </GlyphPortal>
      ) : (
        // Until the font is ready: the same steps, plainly, so nothing is missing.
        <section className="bg-ink-950 py-16 px-6 md:px-10" style={{ background: FIELD }}>
          <Steps />
        </section>
      )}
    </div>
  );
}
