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
          <feGaussianBlur stdDeviation="8" result="b" />
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
      <g transform="translate(275 40)">
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
        d="M275 118 C275 138 275 150 290 150"
        fill="none"
        stroke="url(#u3d-fil)"
        strokeWidth="14"
        strokeLinecap="round"
        className="u3d-fil"
        pathLength={1}
      />

      {/* U */}
      <path
        d="M84 130 V206 A42 42 0 0 0 126 248 H182 A22 22 0 0 0 204 226 V130"
        fill="none"
        stroke="#F5F5F7"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="butt"
        className="u3d-letter"
      />

      {/* 3 (drawn by the nozzle) */}
      <path
        d="M228 150 H318 A24 24 0 0 1 318 198 H284 H322 A25 25 0 0 1 322 248 H236"
        fill="none"
        stroke="#089a47"
        strokeWidth="34"
        strokeLinejoin="round"
        strokeLinecap="butt"
        pathLength={1}
        className="u3d-three"
        filter="url(#u3d-glow)"
      />

      {/* D */}
      <path
        d="M362 130 V248 H392 A59 59 0 0 0 392 130 Z"
        fill="none"
        stroke="#F5F5F7"
        strokeWidth="30"
        strokeLinejoin="round"
        className="u3d-letter"
      />

      {/* wordmark — forced LTR (the page is RTL) and centred under the mark */}
      <g className="u3d-word" style={{ direction: "ltr" }}>
        <text x="260" y="292" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="700" fontSize="30" letterSpacing="12">
          <tspan fill="#F5F5F7">UNIT </tspan>
          <tspan fill="#089a47">3D</tspan>
        </text>
      </g>
      <path d="M52 282 H136" stroke="#089a47" strokeWidth="4" strokeLinecap="round" className="u3d-dash" />
      <path d="M384 282 H468" stroke="#089a47" strokeWidth="4" strokeLinecap="round" className="u3d-dash" />
    </svg>
  );
}
