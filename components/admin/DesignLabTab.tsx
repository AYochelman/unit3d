"use client";
import { useRouter } from "next/navigation";
import { DESIGNS, PRODUCT_LOOKS, SIGNATURES, inkOn, useDesignPreview, type DesignId, type ProductLook } from "@/lib/design-preview";
import { cn } from "@/lib/cn";
import OrbDemo from "./OrbDemo";
import HeroVideoOptions from "./HeroVideoOptions";
import ShinyButton from "@/components/ui/shiny-button";
import MorphGalleryDemo from "./MorphGalleryDemo";
import { Signature } from "@/components/OwnerSignature";
import VariableFontCursorProximityHero from "@/components/ui/m-variable-font-cursor-proximity-1";

const PAGES: { href: string; label: string }[] = [
  { href: "/", label: "דף הבית" },
  { href: "/trendy/", label: "טרנדי" },
  { href: "/fidgets/", label: "פידג'טים" },
  { href: "/catalog/", label: "סמלי יחידות" },
  { href: "/configurator/", label: "מעצב" },
];

/**
 * "תצוגת עיצוב" — try a design direction on the live site without changing it.
 *
 * Picking one recolours the real pages in THIS browser only, until "חזרה
 * לעיצוב הקיים" or a reload. Nothing is saved and nothing is published.
 */
export default function DesignLabTab() {
  const design = useDesignPreview((s) => s.design);
  const setDesign = useDesignPreview((s) => s.setDesign);
  const router = useRouter();

  const signature = useDesignPreview((s) => s.signature);
  const setSignature = useDesignPreview((s) => s.setSignature);
  const productLook = useDesignPreview((s) => s.productLook);
  const setProductLook = useDesignPreview((s) => s.setProductLook);
  const showProduct = (id: ProductLook, href: string) => {
    setProductLook(id);
    router.push(href);
  };

  const go = (id: DesignId, href = "/") => {
    setDesign(id);
    router.push(href);
  };

  return (
    <div className="grid gap-5 max-w-5xl">
      <div className="p-4 rounded-2xl border border-flame/40 bg-flame/5 text-sm leading-relaxed">
        <b className="block text-base mb-1">שום דבר כאן לא משנה את האתר.</b>
        בוחרים כיוון, והאתר האמיתי נצבע בו <b>רק בדפדפן הזה</b>. מבקרים ממשיכים לראות את העיצוב הקיים.
        אפשר לעבור בין העמודים כרגיל, ופס קטן בתחתית מאפשר להחליף כיוון או לחזור. רענון של הדף מחזיר הכל למצב הרגיל.
        <span className="block mt-1 text-ink-400">
          התצוגה משנה צבעים, גופן, עובי כותרות ועיגול פינות. פריסה, טקסטים ומילה בגופן אחר דורשים עבודה בקוד אם תבחר כיוון.
        </span>
      </div>

      {(["QClay", "Island", "Ovia", "Zajno"] as const).map((brief) => (
        <section key={brief} className="grid gap-3">
          <h2 className="font-black text-lg">{brief}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {DESIGNS.filter((d) => d.brief === brief).map((d) => (
              <div
                key={d.id}
                className={cn(
                  "rounded-2xl border bg-ink-900 overflow-hidden grid",
                  design === d.id ? "border-flame" : "border-ink-800",
                )}
              >
                <div className="flex h-16" aria-hidden>
                  {d.swatch.map((c) => (
                    <span key={c} className="flex-1 grid place-items-end p-1.5 font-mono text-[9px]" style={{ background: c, color: inkOn(c) }} dir="ltr">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="p-4 grid gap-3">
                  <div>
                    <div className="font-bold">{d.label}</div>
                    <p className="text-xs text-ink-400 mt-1 leading-relaxed">{d.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => go(d.id)}
                    className="h-10 rounded-xl bg-flame text-white font-bold text-sm hover:bg-flame-600"
                  >
                    {design === d.id ? "פתוח עכשיו · לדף הבית" : "לראות על האתר"}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {PAGES.slice(1).map((p) => (
                      <button
                        key={p.href}
                        type="button"
                        onClick={() => go(d.id, p.href)}
                        className="text-[11px] px-2 py-1 rounded-lg border border-ink-700 text-ink-300 hover:border-ink-500"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <HeroVideoOptions />

      <section className="grid gap-3">
        <h2 className="font-black text-lg">עמוד מוצר · Gift Shop</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          מבוסס על &quot;Product Page - Gift Shop&quot; (Adrian Kuleszo): אריח תמונה רך, צ&apos;יפים עגולים לבחירה, מחיר גדול עם הערה,
          כפתור הוספה מלא ושלוש עובדות אמיתיות עם אייקונים. בלי ה&quot;ג&apos;נט קנתה עכשיו&quot; וה&quot;13 אנשים קנו היום&quot; מהעיצוב, כי אין לנו נתונים כאלה.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {PRODUCT_LOOKS.map((l) => (
            <div key={l.id} className={cn("rounded-2xl border bg-ink-900 overflow-hidden grid", productLook === l.id ? "border-flame" : "border-ink-800")}>
              <div className="flex h-12" aria-hidden>
                {l.swatch.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
              </div>
              <div className="p-4 grid gap-3">
                <div>
                  <div className="font-bold">{l.label}</div>
                  <p className="text-xs text-ink-400 mt-1 leading-relaxed">{l.note}</p>
                </div>
                <button type="button" onClick={() => showProduct(l.id, "/products/mw-3275194/")} className="h-10 rounded-xl bg-flame text-white font-bold text-sm hover:bg-flame-600">
                  לראות על עמוד מוצר
                </button>
                <button type="button" onClick={() => showProduct(l.id, "/fidgets/")} className="text-[11px] px-2 py-1 rounded-lg border border-ink-700 text-ink-300 hover:border-ink-500 justify-self-start">
                  לבחור מוצר אחר מהמדף
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-black text-lg">החותם שלך בתחתית האתר</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          ארבע דרכים לחתום על האתר. כל אחת מוצגת כאן כמו בפס התחתון של האתר. &quot;לראות באתר&quot; מחליף את החותם בתחתית של כל העמודים, רק בדפדפן הזה.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SIGNATURES.map((sg) => (
            <div key={sg.id} className={cn("rounded-2xl border bg-ink-900 overflow-hidden grid", signature === sg.id ? "border-flame" : "border-ink-800")}>
              <div className="min-h-24 px-5 py-5 bg-ink-950 border-b border-ink-800 flex items-center justify-between gap-3 flex-wrap">
                <Signature variant={sg.id} />
                <span className="font-mono text-[10px] tracking-wider text-ink-500" dir="ltr">© 2026 Unit3D</span>
              </div>
              <div className="p-4 grid gap-3">
                <div>
                  <div className="font-bold">{sg.label}{sg.id === "text" && <span className="text-xs text-ink-400 font-normal"> · באתר עכשיו</span>}</div>
                  <p className="text-xs text-ink-400 mt-1 leading-relaxed">{sg.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSignature(sg.id); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }); }}
                  className="h-10 rounded-xl bg-flame text-white font-bold text-sm hover:bg-flame-600"
                >
                  {signature === sg.id ? "מוצג עכשיו בתחתית ↓" : "לראות באתר"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MorphGalleryDemo />

      <section className="grid gap-3">
        <h2 className="font-black text-lg">רכיב: כותרת שמגיבה לעכבר</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          כל אות מתעבה כשהעכבר מתקרב אליה, ונרגעת כשהוא מתרחק. עובד רק עם עכבר. בטלפון ולמי שביקש פחות תנועה הכותרת נשארת כרגיל. עדיין לא מופיע לגולשים.
        </p>
        <div className="rounded-2xl border border-ink-800 bg-ink-900">
          <VariableFontCursorProximityHero />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-black text-lg">רכיב: כפתור מבריק</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          שלוש גרסאות לכפתור &quot;התחל להזמין&quot;, בהשראת Shiny Button. עדיין לא מופיעות לגולשים.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["sweep", "א · פס אור", "פס אור עובר על הירוק כל כמה שניות."],
            ["orbit", "ב · מסלול", "אור מנטה רץ סביב כפתור כהה."],
            ["metal", "ג · מתכת", "כפתור מתכתי, והברק זז אחרי העכבר."],
          ] as const).map(([v, label, note]) => (
            <div key={v} className="rounded-2xl border border-ink-800 bg-ink-900 p-5 grid gap-4 justify-items-center text-center">
              <ShinyButton variant={v}>התחל להזמין</ShinyButton>
              <div>
                <div className="font-bold text-sm">{label}</div>
                <p className="text-xs text-ink-400 mt-1">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-black text-lg">רכיב: כדור חשיבה</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          שדה שאלה שהופך לכדור חושב ונפתח לכרטיס תשובה. התשובות מגיעות מהבוט של האתר, כך שהוא עונה רק על מה שכבר כתוב באתר.
          עדיין לא מופיע לגולשים.
        </p>
        <OrbDemo />
      </section>

      {design && (
        <button
          type="button"
          onClick={() => setDesign(null)}
          className="justify-self-start text-sm px-4 h-10 rounded-xl border border-ink-700 text-ink-200 hover:border-ink-500"
        >
          חזרה לעיצוב הקיים
        </button>
      )}
    </div>
  );
}
