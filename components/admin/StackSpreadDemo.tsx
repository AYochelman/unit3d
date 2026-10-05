"use client";
import StackSpread, { layoutWith } from "@/components/ui/stack-spread";
import { photoMix } from "@/lib/photos";
import { photoSrc } from "@/lib/assets";

/**
 * Stack Spread (21st.dev / Hyperiux Vault) on the shop's own photos, for the
 * owner to judge before it goes anywhere public. Eight real product photos,
 * served from the site itself, Hebrew copy, the dark ink page.
 */
const CARDS = layoutWith(
  photoMix(["statues", "flexi", "fidget", "home", "pets", "office", "screen"], 8).map((p) => ({ src: photoSrc(p.src), alt: p.name })),
);

export default function StackSpreadDemo() {
  return (
    <section className="grid gap-3">
      <h2 className="font-black text-lg">רכיב: ערימה שמתפזרת</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        שמונה תמונות מהחנות בערימה אחת. כשגוללים הן מתפזרות על כל המסך, והכותרת מופיעה במרכז. אחרי הפיזור הן זזות קצת עם העכבר.
        בטלפון הן מסתדרות בשני טורים. גללו למטה כדי לראות. עדיין לא מופיע לגולשים.
      </p>
      <div className="-mx-4 sm:mx-0 rounded-2xl border border-ink-800" style={{ overflow: "clip" }}>
        <StackSpread
          cards={CARDS}
          bgColor="#04110B"
          textColor="#F7FAF8"
          cardRadius={14}
          hintLabel="גללו"
          title={
            <>
              כל רעיון.{"\n"}
              <span style={{ color: "#5FE39A" }}>מודפס</span> בשבילך.
            </>
          }
          sub="פסלים, פידג'טים, מתנות ומוצרים לבית. מודפסים אצלנו בגבעתיים, בצבע ובחומר שתבחרו."
        />
      </div>
    </section>
  );
}
