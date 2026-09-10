/**
 * Header / footer logo: the U3D mark (nozzle over the green 3) plus wordmark.
 * `size` is the mark height in px.
 *
 * Geometry is shared with HeroLogo and has to stay shared — see the note there.
 * All three letters sit in one outer box (top 120, bottom 262) at stroke 34;
 * outer extents are U 40–194 · 3 218–338 · D 362–480. This file used to carry
 * an older copy of the paths where the 3's bowl reached 19px INTO the D's stem
 * and the D was drawn at stroke 30, half a size lighter than the U beside it.
 */
export default function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  // The viewBox crops to the mark: x 40–480, y 25 (nozzle) – 262, plus 6 of air.
  const w = size * (452 / 249);
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <svg viewBox="34 19 452 249" width={w} height={size} aria-hidden="true" className="shrink-0">
        <g transform="translate(278 25)">
          <rect x="-38" y="0" width="76" height="40" rx="6" fill="#F5F5F7" />
          <rect x="-26" y="10" width="52" height="6" rx="2" fill="#0A0A0B" />
          <rect x="-26" y="22" width="52" height="6" rx="2" fill="#0A0A0B" />
          <path d="M-28 40 L28 40 L12 64 L-12 64 Z" fill="#F5F5F7" />
        </g>
        <path d="M278 89 C278 112 278 137 292 137" fill="none" stroke="#3FB872" strokeWidth="14" strokeLinecap="round" />
        <path d="M57 120 V203 A42 42 0 0 0 99 245 H155 A22 22 0 0 0 177 223 V120" fill="none" stroke="#F5F5F7" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
        <path d="M218 137 H294 A27 27 0 0 1 294 191 H266 H294 A27 27 0 0 1 294 245 H222" fill="none" stroke="#089a47" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
        <path d="M379 137 V245 H409 A54 54 0 0 0 409 137 Z" fill="none" stroke="#F5F5F7" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
      </svg>
      {wordmark && (
        <span className="font-mono font-bold tracking-[0.22em] leading-none" style={{ fontSize: size * 0.42 }}>
          <span className="text-ink-50">UNIT</span>
          <span className="text-flame"> 3D</span>
        </span>
      )}
    </span>
  );
}
