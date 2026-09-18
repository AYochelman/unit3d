"use client";
import { clipSrc } from "@/lib/assets";

/**
 * The designer's own clip of a model, on the page where the customer decides.
 *
 * Some things do not photograph. A fidget that clicks, a flexi that bends and a
 * lid that snaps are each one still frame of a thing that only makes sense
 * moving, and the shop held eighteen such clips while showing them nowhere but
 * a hover on the shelf card — which a phone has no way to trigger and a
 * visitor who arrived straight on the product page never sees at all.
 *
 * It renders nothing at all for a model with no clip (`clipSrc` returns
 * undefined), so every page can ask for one unconditionally.
 *
 * Muted and looping because it autoplays: a browser refuses to autoplay sound,
 * and a shop that made noise by itself would deserve the refusal. `controls`
 * stays on so the clip can be paused and scrubbed by someone who wants to look
 * closely, which is the whole reason it is here.
 */
export default function ProductClip({ id, name }: { id: string; name: string }) {
  const src = clipSrc(id);
  if (!src) return null;

  return (
    <figure className="mt-3">
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label={`${name} — סרטון של המעצב`}
        className="w-full aspect-square rounded-2xl border border-ink-800 bg-ink-950 object-cover"
      />
      <figcaption className="mt-1.5 text-[11px] text-ink-500 text-center">
        הסרטון של המעצב המקורי. הצבע בסרטון הוא מה שהוא הדפיס, לא בהכרח מה שתקבל.
      </figcaption>
    </figure>
  );
}
