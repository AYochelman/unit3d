"use client";
import { useRouter } from "next/navigation";
import { DESIGNS, inkOn, useDesignPreview, type DesignId } from "@/lib/design-preview";
import { cn } from "@/lib/cn";
import OrbDemo from "./OrbDemo";
import ShinyButton from "@/components/ui/shiny-button";

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
