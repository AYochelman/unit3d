/**
 * Header / footer logo: the U3D mark (nozzle over the green 3) plus wordmark.
 * `size` is the mark height in px.
 *
 * Geometry is shared with HeroLogo and has to stay shared — see the note there.
 * All three letters sit in one outer box (top 120, bottom 262) at stroke 34;
 * outer extents are U 40–176 · 3 200–320 · D 344–480. The U and the D are the
 * same size on purpose — 136 wide by 142 tall each — because they are the same
 * word at the same weight and the U used to be 36px wider, which read as a
 * bigger letter rather than as a wider one. This file used to carry an older
 * copy of the paths where the 3's bowl reached 19px INTO the D's stem and the
 * D was drawn at stroke 30, half a size lighter than the U beside it.
 */
export default function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  // The viewBox crops to the mark: x 40–480, y 25 (nozzle) – 262, plus 6 of air.
  const w = size * (452 / 249);
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <svg viewBox="34 19 452 249" width={w} height={size} aria-hidden="true" className="shrink-0">
        <g transform="translate(260 25)">
          <rect x="-38" y="0" width="76" height="40" rx="6" fill="#F5F5F7" />
          <rect x="-26" y="10" width="52" height="6" rx="2" fill="#0A0A0B" />
          <rect x="-26" y="22" width="52" height="6" rx="2" fill="#0A0A0B" />
          <path d="M-28 40 L28 40 L12 64 L-12 64 Z" fill="#F5F5F7" />
        </g>
        <path d="M260 89 C260 112 260 137 274 137" fill="none" stroke="#3FB872" strokeWidth="14" strokeLinecap="round" />
        <path d="M57 120 V209 A36 36 0 0 0 93 245 H140 A19 19 0 0 0 159 226 V120" fill="none" stroke="#F5F5F7" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
        <path d="M200 137 H276 A27 27 0 0 1 276 191 H248 H276 A27 27 0 0 1 276 245 H204" fill="none" stroke="#089a47" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
        <path d="M361 137 V245 H409 A54 54 0 0 0 409 137 Z" fill="none" stroke="#F5F5F7" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
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
