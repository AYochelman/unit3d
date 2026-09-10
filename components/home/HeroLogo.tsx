/**
 * The Unit 3D mark as animated SVG: a nozzle extrudes the green "3" between
 * the white U and D, then the wordmark settles in. Pure CSS animation
 * (see .u3d-* rules in globals.css), respects prefers-reduced-motion.
 */
export default function HeroLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 300"
      className={className}
      role="img"
      aria-label="Unit 3D"
      style={{ direction: "ltr" }}
    >
      <defs>
        <filter id="u3d-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="u3d-fil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3FB872" />
          <stop offset="100%" stopColor="#089a47" />
        </linearGradient>
      </defs>

      {/* nozzle — positioned by the outer group; the inner group carries the CSS bob animation */}
      <g transform="translate(278 25)">
      <g className="u3d-nozzle">
        <rect x="-38" y="0" width="76" height="40" rx="4" fill="#F5F5F7" />
        <rect x="-26" y="10" width="52" height="6" rx="2" fill="#0A0A0B" />
        <rect x="-26" y="22" width="52" height="6" rx="2" fill="#0A0A0B" />
        <path d="M-28 40 L28 40 L12 64 L-12 64 Z" fill="#F5F5F7" />
        <rect x="-6" y="64" width="12" height="10" fill="#F5F5F7" />
        {/* heat shimmer */}
        <circle cx="0" cy="80" r="6" fill="#3FB872" className="u3d-drop" />
      </g>
      </g>

      {/* filament path from nozzle into the "3" */}
      <path
        d="M278 103 C278 118 278 137 292 137"
        fill="none"
        stroke="url(#u3d-fil)"
        strokeWidth="14"
        strokeLinecap="round"
        className="u3d-fil"
        pathLength={1}
      />

      {/*
        Geometry — all three letters share one outer box: top 120, bottom 262,
        stroke 34. Horizontal bars sit on centre lines 137 and 245 (±17 lands
        on the box); vertical stems use butt caps and start on the box itself.
        Outer extents, left to right: U 40–194 · 3 218–338 · D 362–480, so the
        two gaps are an equal 24 and the whole mark is centred on 260.
        The 3 used to bulge to 364 while the D's stem started at 345 — nineteen
        pixels of green sitting on top of a white letter.
      */}
      {/* U */}
      <path
        d="M57 120 V203 A42 42 0 0 0 99 245 H155 A22 22 0 0 0 177 223 V120"
        fill="none"
        stroke="#F5F5F7"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="butt"
        className="u3d-letter"
      />

      {/* 3 (drawn by the nozzle) */}
      <path
        d="M218 137 H294 A27 27 0 0 1 294 191 H266 H294 A27 27 0 0 1 294 245 H222"
        fill="none"
        stroke="#089a47"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="butt"
        pathLength={1}
        className="u3d-three"
        filter="url(#u3d-glow)"
      />

      {/* D — a closed shape, so its top and bottom bars are STROKED and reach
          17px beyond their centre lines. The U's stems end in butt caps and
          reach nothing. That is why the three letters have to be laid out by
          their OUTER edges (120 and 262 here), not by the numbers in the path:
          matching centre lines is exactly what left the D a half-stroke taller
          than the U. See the geometry note above the U. */}
      <path
        d="M379 137 V245 H409 A54 54 0 0 0 409 137 Z"
        fill="none"
        stroke="#F5F5F7"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="butt"
        className="u3d-letter"
      />

      {/* wordmark — forced LTR (the page is RTL) and centred under the mark */}
      <g className="u3d-word" style={{ direction: "ltr" }}>
        <text x="266" y="292" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="700" fontSize="30" letterSpacing="12">
          <tspan fill="#F5F5F7">UNIT </tspan>
          <tspan fill="#089a47">3D</tspan>
        </text>
      </g>
      <path d="M40 282 H124" stroke="#089a47" strokeWidth="4" strokeLinecap="round" className="u3d-dash" />
      <path d="M396 282 H480" stroke="#089a47" strokeWidth="4" strokeLinecap="round" className="u3d-dash" />
    </svg>
  );
}
