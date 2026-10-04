"use client";
import { assetSrc } from "@/lib/assets";

/**
 * Candidate clips for the home-page hero, for the owner to choose from.
 * public/video/options/*.mp4, 640×360, no audio. Bambu Lab's come from the
 * owner-supplied P2S launch film, cut only where no on-screen caption shows;
 * the rest are the studio's own footage.
 */
const OPTIONS: { file: string; label: string; source: string; range: string }[] = [
  { file: "bambu-workshop", label: "הסדנה: דגמי מכוניות, קיר כלים והמדפסת על השולחן", source: "Bambu Lab", range: "0:05–0:11" },
  { file: "bambu-studio-wide", label: "צילום רחב של הסדנה עם המדפסת במרכז", source: "Bambu Lab", range: "1:25–1:32" },
  { file: "bambu-spools", label: "גלילי פילמנט בתקריב", source: "Bambu Lab", range: "0:57–1:01" },
  { file: "bambu-yellow-print", label: "המדפסת עם הדפסה צהובה בפנים", source: "Bambu Lab", range: "1:12–1:15" },
  { file: "bambu-shelves", label: "מדפים עם מוצרים מודפסים", source: "Bambu Lab", range: "1:17–1:19" },
  { file: "own-chamber", label: "המצלמה בתוך המדפסת שלך, דגם נבנה", source: "שלך", range: "9 שניות" },
  { file: "own-full-print", label: "הטיימלאפס \"הדפסה מלאה מ-0\"", source: "שלך", range: "10 שניות" },
  { file: "own-spiderman", label: "הטיימלאפס \"ספיידרמן בהדפסת רשת\"", source: "שלך", range: "10 שניות" },
];

export default function HeroVideoOptions() {
  return (
    <section className="grid gap-3">
      <h2 className="font-black text-lg">סרטונים לרקע של דף הבית</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        אפשרויות להוסיף לסרטון שמאחורי הכותרת. תגיד אילו, והם ירוצו ברצף. של Bambu Lab חתוכים רק במקומות בלי כיתוב על המסך.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((o, i) => (
          <figure key={o.file} className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden">
            <video
              src={assetSrc(`/video/options/${o.file}.mp4`)}
              className="block w-full aspect-video object-cover bg-ink-950"
              muted
              loop
              playsInline
              controls
              preload="metadata"
            />
            <figcaption className="p-3 grid gap-1">
              <div className="text-sm font-bold">{i + 1} · {o.label}</div>
              <div className="text-[11px] text-ink-400">{o.source} · <bdi dir="ltr">{o.range}</bdi></div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
