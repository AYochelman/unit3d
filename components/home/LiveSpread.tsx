"use client";
import StackSpread, { layoutWith } from "@/components/ui/stack-spread";
import Btn from "@/components/ui/Btn";
import { assetSrc } from "@/lib/assets";

/**
 * "רוצים לראות אותנו בפעולה?" — the eight build-plate timelapses as a stack
 * that spreads across the screen on scroll (the owner's pick; it replaced the
 * player-and-thumbnails block, components/home/LivePreview.tsx).
 *
 * Posters while stacked; a clip is fetched and played only once the cards
 * have spread (on touch, by tapping a card), so a visit that never gets here
 * never downloads them.
 */
const CLIPS = [
  { file: "motion-20260829", label: "ספיידרמן בהדפסת רשת", date: "29.08" },
  { file: "motion-20260805", label: "שתי דיסקיות לבנות", date: "05.08" },
  { file: "motion-20260716", label: "הדפסה מלאה מ-0", date: "16.07" },
  { file: "motion-20260613", label: "שכבה ראשונה על הפלטה", date: "13.06" },
  { file: "motion-20260903", label: "סדרה קטנה על הפלטה", date: "03.09" },
  { file: "motion-20260704", label: "מגש חלקים בלבן", date: "04.07" },
  { file: "motion-20260723", label: "חלק כחול יורד מהפלטה", date: "23.07" },
  { file: "motion-20260707", label: "כוכב בהדפסה שטוחה", date: "07.07" },
];

const CARDS = layoutWith(
  CLIPS.map((c) => ({
    src: assetSrc(`/videos/posters/${c.file}.jpg`),
    video: assetSrc(`/videos/${c.file}.mp4`),
    alt: c.label,
    caption: c.date,
  })),
);

export default function LiveSpread() {
  return (
    <section aria-label="רוצים לראות אותנו בפעולה?" style={{ overflow: "clip" }}>
      <StackSpread
        cards={CARDS}
        scrollLength={300}
        bgColor="#04110B"
        textColor="#F7FAF8"
        cardRadius={14}
        hintLabel="גללו"
        title={
          <>
            רוצים לראות אותנו{"\n"}
            <span style={{ color: "#5FE39A" }}>בפעולה?</span>
          </>
        }
        sub="צילומים מהמדפסת עצמה, מהפלטה, בלי עריכה ובלי פילטרים. כי שירות הדפסה אמיתי לא מסתיר את הסדנה."
        actions={
          <>
            <Btn as="a" href="/livestream" icon="play">
              צפה בלייב
            </Btn>
            <Btn as="a" href="/tracking" variant="ghost" icon="search">
              איפה ההזמנה שלי?
            </Btn>
          </>
        }
      />
    </section>
  );
}
