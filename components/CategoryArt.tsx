/**
 * One bespoke illustration per homepage category.
 *
 * The cards used to share four generic emblem shapes (shield / circle / hex /
 * rect), which made eight different sections look like the same product. Each
 * scene here is drawn for its own category, in a 100×100 box, tinted from a
 * single hue so the row still reads as one family.
 */

export type CategoryArtId =
  | "trendy"
  | "units"
  | "designer"
  | "fidgets"
  | "pets"
  | "homeoffice"
  | "statues"
  | "b2b"
  | "upload";

type Props = { art: CategoryArtId; hue: number; size?: number; className?: string };

export default function CategoryArt({ art, hue, size = 120, className }: Props) {
  const fg = `hsl(${hue}, 68%, 58%)`;
  const mid = `hsl(${hue}, 60%, 46%)`;
  const dark = `hsl(${hue}, 55%, 32%)`;
  const steel = "#c7c7cc";
  const steel2 = "#8e8e93";
  const ink = "#0a0a0b";
  const gid = `ca-${art}`;

  const scene = () => {
    switch (art) {
      // ── 01 · Trendy: a rising chart bursting into a flame ────────────────
      case "trendy":
        return (
          <>
            <rect x="20" y="62" width="12" height="24" rx="3" fill={dark} />
            <rect x="36" y="52" width="12" height="34" rx="3" fill={mid} />
            <rect x="52" y="38" width="12" height="48" rx="3" fill={fg} />
            <path d="M18 58 L34 44 L48 50 L72 24" fill="none" stroke={steel} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 22 H76 V36" fill="none" stroke={steel} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M76 46 c-7 6-9 12-5 17 c3 4 9 4 12 0 c4-5 2-11-7-17 Z" fill="#ff8a3d" />
            <path d="M76 54 c-3 3-4 7-2 9 c2 2 4 2 5 0 c2-3 1-6-3-9 Z" fill="#ffd479" />
            <circle cx="24" cy="26" r="2" fill={steel} /><circle cx="88" cy="66" r="2" fill={steel} />
          </>
        );

      // ── 02 · Unit emblems: winged shield with a star ─────────────────────
      case "units":
        return (
          <>
            <path d="M20 40 q-10-6-16-2 q8 8 18 8 Z" fill={mid} />
            <path d="M80 40 q10-6 16-2 q-8 8-18 8 Z" fill={mid} />
            <path d="M50 14 L80 24 V52 c0 18-14 28-30 34 c-16-6-30-16-30-34 V24 Z" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
            <path d="M50 14 L80 24 V52 c0 18-14 28-30 34 Z" fill={dark} opacity="0.45" />
            <path d="M50 30 l5.6 11.4 12.6 1.8-9.1 8.9 2.2 12.5L50 58.7 38.7 64.6l2.2-12.5-9.1-8.9 12.6-1.8Z" fill="#ffd479" />
            <path d="M28 70 q22 12 44 0" fill="none" stroke={steel} strokeWidth="2" strokeDasharray="3 3" />
          </>
        );

      // ── 03 · Designer: canvas, letter, shapes, cursor ────────────────────
      case "designer":
        return (
          <>
            <rect x="14" y="18" width="72" height="56" rx="6" fill="#141417" stroke={steel2} strokeWidth="1.5" />
            <rect x="14" y="18" width="72" height="10" rx="6" fill={dark} />
            <circle cx="21" cy="23" r="1.7" fill="#ff5f57" /><circle cx="27" cy="23" r="1.7" fill="#febc2e" /><circle cx="33" cy="23" r="1.7" fill="#28c840" />
            <text x="28" y="60" fontSize="26" fontWeight="900" fill={fg} fontFamily="system-ui, sans-serif">A</text>
            <circle cx="58" cy="44" r="8" fill="none" stroke={fg} strokeWidth="2.5" />
            <path d="M68 54 l8-14 8 14 Z" fill={mid} />
            <rect x="46" y="60" width="34" height="6" rx="3" fill={dark} />
            <path d="M60 66 L60 88 L66 82 L70 90 L74 88 L70 80 L78 80 Z" fill="#f2f2f4" stroke={ink} strokeWidth="1.2" />
            <circle cx="22" cy="84" r="4" fill="#e5484d" /><circle cx="33" cy="84" r="4" fill="#3fb872" /><circle cx="44" cy="84" r="4" fill="#4cc9f0" />
          </>
        );

      // ── 04 · Fidgets: articulated body + spinner ─────────────────────────
      case "fidgets":
        return (
          <>
            {/* articulated body: a chain of segments that gets smaller toward the tail */}
            {[
              { x: 74, y: 60, r: 9 },
              { x: 61, y: 63, r: 8 },
              { x: 49, y: 66, r: 7 },
              { x: 38, y: 68, r: 6 },
              { x: 28, y: 70, r: 5 },
              { x: 20, y: 71, r: 4 },
            ].map((seg, i) => (
              <circle
                key={seg.x}
                cx={seg.x}
                cy={seg.y}
                r={seg.r}
                fill={i % 2 ? mid : fg}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1.2"
              />
            ))}
            {/* head */}
            <path d="M74 50 q10-4 14 3 q3 7-4 11 q-8 4-12-3 Z" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
            <path d="M78 47 l4-7 3 7 Z" fill={dark} />
            <circle cx="82" cy="57" r="1.8" fill={ink} />
            {/* spinner, resting above the body */}
            <g transform="translate(40 30)">
              <circle cx="0" cy="-7" r="6.5" fill={mid} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
              <circle cx="-6.5" cy="4" r="6.5" fill={mid} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
              <circle cx="6.5" cy="4" r="6.5" fill={mid} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="5.5" fill={fg} />
              <circle cx="0" cy="0" r="2.2" fill={steel} />
            </g>
            {/* motion arcs */}
            <path d="M58 26 a14 14 0 0 1 6 8" fill="none" stroke={steel2} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M20 24 a16 16 0 0 1 6-6" fill="none" stroke={steel2} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </>
        );

      // ── 05 · Pets: collar with a hanging name tag ────────────────────────
      case "pets":
        return (
          <>
            <path d="M14 34 q36 22 72 0" fill="none" stroke={dark} strokeWidth="9" strokeLinecap="round" />
            <path d="M14 34 q36 22 72 0" fill="none" stroke={mid} strokeWidth="5" strokeLinecap="round" />
            <rect x="44" y="46" width="12" height="7" rx="3" fill={steel} />
            <circle cx="50" cy="56" r="4" fill="none" stroke={steel} strokeWidth="2.5" />
            <circle cx="50" cy="74" r="16" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
            <ellipse cx="50" cy="79" rx="6" ry="5" fill={dark} />
            <circle cx="42" cy="70" r="2.6" fill={dark} /><circle cx="47" cy="66" r="2.6" fill={dark} />
            <circle cx="53" cy="66" r="2.6" fill={dark} /><circle cx="58" cy="70" r="2.6" fill={dark} />
            <circle cx="24" cy="22" r="2" fill={steel2} /><circle cx="78" cy="20" r="2.5" fill={steel2} />
          </>
        );

      // ── 06 · Home & office: house with a shelf and a desk lamp ───────────
      case "homeoffice":
        return (
          <>
            <path d="M18 46 L50 20 L82 46" fill="none" stroke={fg} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 44 V82 H74 V44" fill="none" stroke={mid} strokeWidth="4" strokeLinejoin="round" />
            <rect x="32" y="56" width="36" height="4" rx="2" fill={dark} />
            <rect x="35" y="46" width="7" height="10" rx="1.5" fill={fg} />
            <rect x="44" y="48" width="6" height="8" rx="1.5" fill={mid} />
            <circle cx="59" cy="51" r="5" fill="none" stroke={fg} strokeWidth="2" />
            <path d="M38 82 V68 h12 v14" fill="none" stroke={dark} strokeWidth="3" />
            <path d="M62 82 V72 l8-10" fill="none" stroke={steel2} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M66 60 a5 5 0 0 1 9 3 l-9 2 Z" fill="#ffd479" />
          </>
        );

      // ── 07 · Statues: bust on a lit pedestal ─────────────────────────────
      case "statues":
        return (
          <>
            {/* spotlight */}
            <path d="M50 6 L24 92 H76 Z" fill={fg} opacity="0.10" />
            {/* head */}
            <circle cx="50" cy="40" r="13" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
            <path d="M37 38 a13 13 0 0 1 26 0 q-13 5-26 0 Z" fill={dark} />
            <circle cx="45.5" cy="42" r="1.5" fill={ink} />
            <circle cx="54.5" cy="42" r="1.5" fill={ink} />
            {/* neck + shoulders */}
            <rect x="46" y="50" width="8" height="7" fill={mid} />
            <path d="M28 76 q2-18 22-20 q20 2 22 20 Z" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
            <path d="M50 56 v20" stroke={dark} strokeWidth="1.4" />
            <path d="M36 76 q4-12 14-14 q10 2 14 14" fill="none" stroke={dark} strokeWidth="1.2" opacity="0.6" />
            {/* plinth with a little nameplate */}
            <rect x="26" y="76" width="48" height="7" rx="2" fill={mid} />
            <rect x="22" y="83" width="56" height="9" rx="3" fill={dark} />
            <rect x="40" y="86" width="20" height="3" rx="1.5" fill={steel2} />
            <circle cx="20" cy="18" r="2.5" fill="#ffd479" />
            <circle cx="80" cy="24" r="2" fill="#ffd479" opacity="0.6" />
          </>
        );

      // ── 08 · B2B: office block with a logo badge ─────────────────────────
      case "b2b":
        return (
          <>
            <rect x="16" y="30" width="30" height="56" rx="4" fill={dark} />
            <rect x="50" y="18" width="34" height="68" rx="4" fill={fg} stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
            {[26, 40, 54, 68].map((y) => (
              <g key={y}>
                <rect x="22" y={y} width="7" height="7" rx="1.5" fill={mid} opacity={y === 26 ? 0 : 1} />
                <rect x="33" y={y} width="7" height="7" rx="1.5" fill={mid} opacity={y === 26 ? 0 : 1} />
                <rect x="56" y={y} width="8" height="8" rx="2" fill="#0f0f11" />
                <rect x="69" y={y} width="8" height="8" rx="2" fill="#0f0f11" />
              </g>
            ))}
            <circle cx="67" cy="82" r="11" fill="#0f0f11" stroke={steel} strokeWidth="1.5" />
            <path d="M67 76 l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill="#ffd479" />
          </>
        );

      // ── 09 · Upload: your file going into the nozzle ─────────────────────
      case "upload":
        return (
          <>
            <path d="M26 14 h26 l14 14 v30 H26 Z" fill="#141417" stroke={steel2} strokeWidth="1.5" />
            <path d="M52 14 v14 h14" fill="none" stroke={steel2} strokeWidth="1.5" />
            <text x="31" y="48" fontSize="11" fontWeight="800" fill={fg} fontFamily="ui-monospace, monospace">STL</text>
            <path d="M46 60 v14" stroke={fg} strokeWidth="3" strokeLinecap="round" />
            <path d="M40 68 l6 7 l6-7" fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="58" y="52" width="20" height="10" rx="2" fill={steel} />
            <path d="M62 62 h12 l-3 8 h-6 Z" fill={steel2} />
            <circle cx="68" cy="73" r="2.2" fill={fg} />
            <rect x="56" y="80" width="30" height="4" rx="2" fill={dark} />
            <path d="M60 80 q8-6 16 0" fill={fg} opacity="0.8" />
          </>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={fg} stopOpacity="0.26" />
          <stop offset="100%" stopColor={fg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${gid})`} />
      {scene()}
    </svg>
  );
}
