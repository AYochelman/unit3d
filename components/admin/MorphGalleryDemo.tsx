"use client";
import MorphGallery, { type MorphItem } from "@/components/ui/morph-gallery";
import { photoMix } from "@/lib/photos";
import { photoSrc } from "@/lib/assets";

/**
 * Morph Gallery (21st.dev) on the shop's own photos, for the owner to judge
 * before it goes anywhere public. The photos are served from the site's own
 * domain, so WebGL may read them and the dissolve runs; a foreign CDN without
 * CORS would fall back to a cross-fade.
 */
const ITEMS: MorphItem[] = photoMix(["statues", "flexi", "fidget", "home", "pets", "office"], 8).map((p) => ({
  src: photoSrc(p.src),
  alt: p.name,
}));

export default function MorphGalleryDemo() {
  return (
    <section className="grid gap-3">
      <h2 className="font-black text-lg">רכיב: גלריה שמתמוססת</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        גלריית תמונות שבה כל תמונה מתפוררת לתוך הבאה דרך רעש, במקום להחליף או לדעוך. כאן על תמונות אמיתיות מהחנות,
        מתחלפת לבד כל 4.5 שניות ועוצרת כשהעכבר עליה. חיצים, החלקה, מקלדת ותמונות קטנות למטה. עדיין לא מופיעה לגולשים.
      </p>
      <div className="relative w-full rounded-2xl overflow-hidden border border-ink-800">
        <MorphGallery
          items={ITEMS}
          height="min(70vh, 560px)"
          autoplay={4500}
          caption={(item) => <span className="inline-block rounded-full bg-ink-950/60 px-4 py-1.5 text-sm font-semibold text-ink-50 backdrop-blur-sm">{item.alt}</span>}
        />
      </div>
    </section>
  );
}
