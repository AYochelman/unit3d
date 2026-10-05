"use client";
import { useState } from "react";
import StackSpread, { layoutWith } from "@/components/ui/stack-spread";
import { photoMix } from "@/lib/photos";
import { photoSrc, assetSrc } from "@/lib/assets";

/**
 * Stack Spread (21st.dev / Hyperiux Vault) on the shop's own material, for the
 * owner to judge before it goes anywhere public. Two versions: eight product
 * photos, or the eight build-plate timelapses from "רוצים לראות אותנו
 * בפעולה?" (posters while stacked, playing once spread).
 */
const PHOTOS = layoutWith(
  photoMix(["statues", "flexi", "fidget", "home", "pets", "office", "screen"], 8).map((p) => ({ src: photoSrc(p.src), alt: p.name })),
);

// Same eight clips, labels and dates as components/home/LivePreview.tsx.
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
const VIDEOS = layoutWith(
  CLIPS.map((c) => ({
    src: assetSrc(`/videos/posters/${c.file}.jpg`),
    video: assetSrc(`/videos/${c.file}.mp4`),
    alt: c.label,
    caption: c.date,
  })),
);

export default function StackSpreadDemo() {
  const [mode, setMode] = useState<"videos" | "photos">("videos");
  return (
    <section className="grid gap-3">
      <h2 className="font-black text-lg">רכיב: ערימה שמתפזרת</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        שמונה כרטיסים בערימה אחת. כשגוללים הם מתפזרים על כל המסך, והכותרת מופיעה במרכז. אחרי הפיזור הם זזים קצת עם העכבר.
        בגרסת הסרטונים: בערימה רואים תמונת פתיחה, והסרטונים מתחילים לנגן כשהכרטיסים מתפזרים (בטלפון: נגיעה בכרטיס). עדיין לא מופיע לגולשים.
      </p>
      <div className="flex gap-2">
        {([["videos", "סרטונים מהמדפסת"], ["photos", "תמונות מהחנות"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={"px-3 h-9 rounded-full border text-sm " + (mode === id ? "border-flame bg-flame/15 text-ink-50" : "border-ink-700 text-ink-300 hover:border-ink-500")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="-mx-4 sm:mx-0 rounded-2xl border border-ink-800" style={{ overflow: "clip" }}>
        {mode === "videos" ? (
          <StackSpread
            key="videos"
            cards={VIDEOS}
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
          />
        ) : (
          <StackSpread
            key="photos"
            cards={PHOTOS}
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
        )}
      </div>
    </section>
  );
}
