/**
 * Header / footer logo: the U3D mark (nozzle over the green 3) plus wordmark.
 * `size` is the mark height in px. Drawn from the same geometry as HeroLogo.
 */
export default function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const w = size * (440 / 260);
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <svg viewBox="40 30 440 240" width={w} height={size} aria-hidden="true" className="shrink-0">
        <g transform="translate(260 40)">
          <rect x="-38" y="0" width="76" height="40" rx="6" fill="#F5F5F7" />
          <rect x="-26" y="10" width="52" height="6" rx="2" fill="#0A0A0B" />
          <rect x="-26" y="22" width="52" height="6" rx="2" fill="#0A0A0B" />
          <path d="M-28 40 L28 40 L12 64 L-12 64 Z" fill="#F5F5F7" />
        </g>
        <path d="M260 104 C260 134 258 150 275 150" fill="none" stroke="#3FB872" strokeWidth="14" strokeLinecap="round" />
        <path d="M84 130 V206 A42 42 0 0 0 126 248 H182 A22 22 0 0 0 204 226 V130" fill="none" stroke="#F5F5F7" strokeWidth="34" strokeLinejoin="round" />
        <path d="M228 150 H318 A24 24 0 0 1 318 198 H284 H322 A25 25 0 0 1 322 248 H236" fill="none" stroke="#089a47" strokeWidth="34" strokeLinejoin="round" />
        <path d="M362 130 V248 H392 A59 59 0 0 0 392 130 Z" fill="none" stroke="#F5F5F7" strokeWidth="30" strokeLinejoin="round" />
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
