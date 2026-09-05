import type { ProductArtId } from "@/lib/types";

type Props = {
  art: ProductArtId;
  /** Hue for the generated colour; ignored when `color` is given. */
  hue?: number;
  /** Explicit fill colour (e.g. the chosen filament). */
  color?: string;
  size?: number;
  className?: string;
};

/**
 * Flat SVG illustrations for products that have no photo yet. Every drawing
 * sits in a 100×100 box and uses two tones of one colour so a filament
 * swatch can recolour it live.
 */
export default function ProductArt({ art, hue = 200, color, size = 120, className }: Props) {
  const fg = color ?? `hsl(${hue}, 65%, 58%)`;
  const dark = color ? "rgba(0,0,0,0.28)" : `hsl(${hue}, 55%, 38%)`;
  const light = "rgba(255,255,255,0.22)";
  const line = "rgba(0,0,0,0.35)";
  const gid = `pa-${art}`;

  const body = () => {
    switch (art) {
      case "bone":
        return (
          <>
            <path d="M22 34a9 9 0 0 1 14-7 9 9 0 0 1 14 7h0a9 9 0 0 1 14-7 9 9 0 0 1 14 7c4 2 6 6 6 10s-2 8-6 10a9 9 0 0 1-14 7 9 9 0 0 1-14-7 9 9 0 0 1-14 7 9 9 0 0 1-14-7c-4-2-6-6-6-10s2-8 6-10z" transform="translate(0 6)" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="50" cy="26" r="5" fill="none" stroke="#c0c0c5" strokeWidth="3" />
            <rect x="36" y="46" width="28" height="7" rx="2" fill={dark} />
          </>
        );
      case "round":
        return (
          <>
            <circle cx="50" cy="56" r="34" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="50" cy="56" r="26" fill="none" stroke={dark} strokeWidth="1.5" />
            <circle cx="50" cy="18" r="6" fill="none" stroke="#c0c0c5" strokeWidth="3" />
            <rect x="36" y="52" width="28" height="7" rx="2" fill={dark} />
          </>
        );
      case "heart":
        return (
          <>
            <path d="M50 88 L20 58 A17 17 0 1 1 50 36 A17 17 0 1 1 80 58 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="50" cy="16" r="6" fill="none" stroke="#c0c0c5" strokeWidth="3" />
            <rect x="37" y="52" width="26" height="7" rx="2" fill={dark} />
          </>
        );
      case "fish":
        return (
          <>
            <path d="M14 55 Q40 22 70 55 Q40 88 14 55 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M68 55 L90 38 L86 55 L90 72 Z" fill={dark} />
            <circle cx="30" cy="50" r="3.5" fill={dark} />
            <circle cx="18" cy="26" r="6" fill="none" stroke="#c0c0c5" strokeWidth="3" />
          </>
        );
      case "paw":
        return (
          <>
            <circle cx="50" cy="58" r="30" fill={fg} stroke={line} strokeWidth="1.5" />
            <ellipse cx="50" cy="66" rx="12" ry="10" fill={dark} />
            <circle cx="34" cy="50" r="5" fill={dark} /><circle cx="44" cy="42" r="5" fill={dark} />
            <circle cx="56" cy="42" r="5" fill={dark} /><circle cx="66" cy="50" r="5" fill={dark} />
            <circle cx="50" cy="20" r="6" fill="none" stroke="#c0c0c5" strokeWidth="3" />
          </>
        );
      case "qr":
        return (
          <>
            <rect x="18" y="26" width="64" height="64" rx="10" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="28" y="36" width="44" height="44" rx="3" fill="#f5f5f7" />
            {[[31,39],[31,66],[58,39]].map(([x,y],i)=>(<rect key={i} x={x} y={y} width="11" height="11" fill="#0a0a0b" />))}
            {[[47,39],[47,47],[31,55],[43,55],[55,55],[63,55],[47,63],[59,67],[67,71],[51,71],[47,75]].map(([x,y],i)=>(<rect key={i} x={x} y={y} width="5" height="5" fill="#0a0a0b" />))}
            <circle cx="50" cy="14" r="6" fill="none" stroke="#c0c0c5" strokeWidth="3" />
          </>
        );
      case "bagholder":
        return (
          <>
            <rect x="32" y="30" width="36" height="58" rx="10" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="32" y="44" width="36" height="6" fill={dark} />
            <rect x="52" y="62" width="10" height="14" rx="3" fill={dark} />
            <path d="M50 30 V16 a8 8 0 0 1 16 0" fill="none" stroke="#c0c0c5" strokeWidth="3.5" />
          </>
        );
      case "scoop":
        return (
          <>
            <path d="M14 46 Q14 24 40 24 Q66 24 66 46 L60 64 L20 64 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="60" y="48" width="30" height="10" rx="5" transform="rotate(-10 60 48)" fill={dark} />
            <path d="M22 40 Q40 32 58 40" fill="none" stroke={light} strokeWidth="3" />
          </>
        );
      case "penholder":
        return (
          <>
            <path d="M30 32 L50 22 L70 32 V78 L50 88 L30 78 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M30 32 L50 42 L70 32" fill="none" stroke={dark} strokeWidth="1.5" />
            <path d="M50 42 V88" stroke={dark} strokeWidth="1.5" />
            <rect x="40" y="6" width="4" height="30" rx="2" fill="#c7c7cc" transform="rotate(-8 42 20)" />
            <rect x="56" y="4" width="4" height="32" rx="2" fill="#8e8e93" transform="rotate(6 58 20)" />
          </>
        );
      case "cableclip":
        return (
          <>
            <path d="M24 60 H76 V78 a6 6 0 0 1-6 6 H30 a6 6 0 0 1-6-6 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M36 60 V50 a14 14 0 0 1 28 0 V60" fill="none" stroke={fg} strokeWidth="7" />
            <path d="M36 60 V50 a14 14 0 0 1 28 0 V60" fill="none" stroke={dark} strokeWidth="1.5" />
            <path d="M10 46 Q30 30 50 36 T90 26" fill="none" stroke="#c7c7cc" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case "headphones":
        return (
          <>
            <rect x="26" y="76" width="48" height="10" rx="4" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="46" y="30" width="8" height="48" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M30 30 a20 20 0 0 1 40 0" fill="none" stroke={fg} strokeWidth="8" />
            <path d="M22 34 a28 28 0 0 1 56 0" fill="none" stroke="#c7c7cc" strokeWidth="4" />
            <rect x="16" y="32" width="12" height="18" rx="5" fill="#8e8e93" />
            <rect x="72" y="32" width="12" height="18" rx="5" fill="#8e8e93" />
          </>
        );
      case "phonestand":
        return (
          <>
            <path d="M22 84 H78 L70 60 H30 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M30 60 L44 22 H60 L46 60 Z" fill={dark} />
            <rect x="44" y="14" width="30" height="52" rx="4" transform="rotate(18 59 40)" fill="#1c1c1f" stroke="#48484c" strokeWidth="1.5" />
          </>
        );
      case "coaster":
        return (
          <>
            <path d="M50 14 L82 32 V68 L50 86 L18 68 V32 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M50 26 L72 38 V62 L50 74 L28 62 V38 Z" fill="none" stroke={dark} strokeWidth="1.5" />
            <circle cx="50" cy="50" r="9" fill={dark} />
          </>
        );
      case "hook":
        return (
          <>
            <rect x="34" y="14" width="32" height="30" rx="6" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="50" cy="24" r="3" fill={dark} />
            <path d="M50 44 V62 a12 12 0 0 0 24 0 V56" fill="none" stroke={fg} strokeWidth="9" strokeLinecap="round" />
            <path d="M50 44 V62 a12 12 0 0 0 24 0 V56" fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case "keyrack":
        return (
          <>
            <rect x="10" y="30" width="80" height="26" rx="6" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="18" y="36" width="44" height="7" rx="2" fill={dark} />
            {[24, 42, 60, 78].map((x) => (
              <path key={x} d={`M${x} 56 V66 a5 5 0 0 0 10 0`} fill="none" stroke="#c7c7cc" strokeWidth="3" />
            ))}
            <path d="M42 70 l4 8 h-8 z" fill="#8e8e93" />
          </>
        );
      case "cardholder":
        return (
          <>
            <path d="M18 78 H82 V66 L74 44 H26 L18 66 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="30" y="24" width="44" height="28" rx="2" transform="rotate(-8 52 38)" fill="#f2f2f4" stroke="#c7c7cc" />
            <rect x="34" y="30" width="20" height="3" transform="rotate(-8 52 38)" fill={dark} />
          </>
        );
      case "planter":
        return (
          <>
            <path d="M24 44 H76 L70 86 H30 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M24 44 L50 52 L76 44" fill="none" stroke={dark} strokeWidth="1.5" />
            <path d="M50 44 C40 30 36 22 44 12 C50 22 52 30 50 44 Z" fill="#3fb872" />
            <path d="M50 44 C60 32 66 26 62 14 C54 24 52 32 50 44 Z" fill="#089a47" />
          </>
        );
      case "bagclip":
        return (
          <>
            <rect x="12" y="38" width="76" height="14" rx="7" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="12" y="52" width="76" height="12" rx="6" fill={dark} />
            <rect x="72" y="36" width="14" height="30" rx="5" fill={fg} stroke={line} strokeWidth="1.5" />
          </>
        );
      case "bookmark":
        return (
          <>
            <path d="M36 10 H64 V90 L50 78 L36 90 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="50" cy="20" r="3" fill={dark} />
            <rect x="44" y="34" width="12" height="30" rx="2" fill={dark} />
          </>
        );
      case "doorsign":
        return (
          <>
            <rect x="10" y="32" width="80" height="36" rx="8" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="22" y="44" width="56" height="12" rx="3" fill={dark} />
            <circle cx="18" cy="40" r="2.5" fill={line} /><circle cx="82" cy="40" r="2.5" fill={line} />
          </>
        );
      case "organizer":
        return (
          <>
            <path d="M12 40 L50 24 L88 40 V72 L50 88 L12 72 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M12 40 L50 56 L88 40 M50 56 V88 M31 32 L69 48 M69 32 L31 48" fill="none" stroke={dark} strokeWidth="1.5" />
          </>
        );
      case "lighter":
        return (
          <>
            <rect x="38" y="30" width="24" height="60" rx="5" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="40" y="22" width="20" height="12" rx="2" fill="#8e8e93" />
            <path d="M50 22 C46 16 46 12 50 6 C54 12 54 16 50 22 Z" fill="#fbbf24" />
            <rect x="44" y="52" width="12" height="20" rx="2" fill={dark} />
          </>
        );
      case "phonecase":
        return (
          <>
            <rect x="30" y="10" width="40" height="80" rx="9" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="36" y="16" width="14" height="16" rx="4" fill={dark} />
            <circle cx="41" cy="22" r="3" fill="#1c1c1f" /><circle cx="46" cy="27" r="3" fill="#1c1c1f" />
            <rect x="38" y="50" width="24" height="24" rx="4" fill={dark} />
          </>
        );
      case "dogtag":
        return (
          <>
            <rect x="26" y="34" width="48" height="30" rx="14" fill={fg} stroke={line} strokeWidth="1.5" transform="rotate(-8 50 49)" />
            <rect x="34" y="44" width="30" height="6" rx="2" fill={dark} transform="rotate(-8 50 49)" />
            <path d="M32 36 C20 24 24 10 40 12" fill="none" stroke="#c0c0c5" strokeWidth="2.5" strokeDasharray="2 2" />
          </>
        );
      case "luggage":
        return (
          <>
            <rect x="20" y="32" width="60" height="42" rx="8" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="28" y="46" width="34" height="6" rx="2" fill={dark} /><rect x="28" y="56" width="22" height="5" rx="2" fill={dark} />
            <circle cx="70" cy="42" r="3" fill={line} />
            <path d="M70 42 C80 24 60 16 50 22" fill="none" stroke="#c0c0c5" strokeWidth="3" />
          </>
        );
      case "nameplate":
        return (
          <>
            <path d="M14 66 H86 V76 H14 Z" fill={dark} />
            <path d="M18 40 H82 V66 H18 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="28" y="49" width="44" height="9" rx="2" fill={dark} />
          </>
        );
      // ── Statues / display pieces ─────────────────────────────────────────
      case "bust":
        return (
          <>
            <path d="M28 90 Q28 66 50 62 Q72 66 72 90 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M38 62 Q38 40 50 40 Q62 40 62 62 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M36 34 a14 16 0 0 1 28 0 v10 a14 14 0 0 1-28 0 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M36 34 a14 16 0 0 1 28 0 q-14 6-28 0 Z" fill={dark} />
            <circle cx="44" cy="40" r="1.6" fill={line} /><circle cx="56" cy="40" r="1.6" fill={line} />
            <rect x="22" y="88" width="56" height="6" rx="2" fill={dark} />
          </>
        );
      case "torso":
        return (
          <>
            {/* shoulders + chest */}
            <path d="M30 44 q6-10 20-10 q14 0 20 10 l-3 24 q-17 9-34 0 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            {/* arm stumps */}
            <path d="M30 44 q-8 3-9 12 q5 4 10 1 Z" fill={dark} stroke={line} strokeWidth="1.2" />
            <path d="M70 44 q8 3 9 12 q-5 4-10 1 Z" fill={dark} stroke={line} strokeWidth="1.2" />
            {/* neck stump */}
            <path d="M43 34 q7-6 14 0 q-7 4-14 0 Z" fill={dark} />
            {/* waist */}
            <path d="M33 68 q17 9 34 0 l-3 14 H36 Z" fill={fg} stroke={line} strokeWidth="1.2" />
            <path d="M50 40 v40" stroke={dark} strokeWidth="1.4" opacity="0.7" />
            <path d="M38 52 q12 6 24 0" fill="none" stroke={dark} strokeWidth="1.4" opacity="0.6" />
            {/* plinth */}
            <rect x="30" y="82" width="40" height="5" rx="2" fill={dark} />
            <rect x="26" y="87" width="48" height="6" rx="3" fill={line} opacity="0.6" />
          </>
        );
      case "chess":
        return (
          <>
            <path d="M34 34 h32 l-4 10 H38 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M32 22 h6 v6 h6 v-6 h4 v6 h6 v-6 h6 v12 H32 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M40 44 q-3 20 -6 30 h32 q-3-10-6-30 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="28" y="74" width="44" height="8" rx="3" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="24" y="82" width="52" height="8" rx="3" fill={dark} />
            <path d="M42 50 h16" stroke={dark} strokeWidth="2" />
          </>
        );
      case "dragonstatue":
        return (
          <>
            {/* coiled body on a rock base */}
            <path d="M24 76 q-2-16 12-22 q10-4 16 2" fill="none" stroke={fg} strokeWidth="11" strokeLinecap="round" />
            <path d="M24 76 q-2-16 12-22 q10-4 16 2" fill="none" stroke={line} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            {/* tail curling out to the left */}
            <path d="M26 76 q-8 2-12 8 q6 2 10-1" fill={fg} stroke={line} strokeWidth="1.2" />
            {/* wing */}
            <path d="M40 52 q6-20 22-22 q-4 12-2 20 q-10-4-20 2 Z" fill={dark} stroke={line} strokeWidth="1.2" />
            <path d="M48 34 q4 8 4 16 M56 32 q1 8 0 14" fill="none" stroke={fg} strokeWidth="1.2" opacity="0.7" />
            {/* neck + head */}
            <path d="M54 56 q10-4 14-12" fill="none" stroke={fg} strokeWidth="9" strokeLinecap="round" />
            <path d="M64 42 q8-6 15-1 q4 3 1 7 l-13 4 q-6-4-3-10 Z" fill={fg} stroke={line} strokeWidth="1.2" />
            <path d="M78 44 l6-1 -4 5 Z" fill={dark} />
            <path d="M66 38 l3-8 4 7 Z" fill={dark} />
            <circle cx="72" cy="45" r="1.8" fill="#0a0a0b" />
            {/* spikes along the back */}
            {[[36, 54], [44, 50], [52, 50]].map(([x, y]) => (
              <path key={x} d={`M${x} ${y} l3-6 3 6 Z`} fill={dark} />
            ))}
            {/* rock plinth */}
            <path d="M14 80 q10-5 22-4 q14 1 26-2 q14-3 22 6 l2 6 H12 Z" fill={dark} />
            <rect x="10" y="86" width="80" height="6" rx="2" fill={line} opacity="0.6" />
          </>
        );
      case "lowpoly":
        return (
          <>
            <path d="M50 16 L74 38 L66 78 H34 L26 38 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M50 16 L50 78 M26 38 L50 52 L74 38 M34 78 L50 52 L66 78" fill="none" stroke={dark} strokeWidth="1.4" />
            <path d="M50 16 L74 38 L50 52 Z" fill={light} />
            <rect x="24" y="78" width="52" height="8" rx="3" fill={dark} />
          </>
        );
      case "vase":
        return (
          <>
            <path d="M38 22 h24 l-4 10 q16 12 16 30 q0 20-22 22 q-22-2-22-22 q0-18 16-30 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M32 56 q18 8 36 0" fill="none" stroke={dark} strokeWidth="1.6" />
            <path d="M31 66 q19 9 38 0" fill="none" stroke={dark} strokeWidth="1.6" />
            <path d="M34 46 q16 7 32 0" fill="none" stroke={dark} strokeWidth="1.6" />
            <ellipse cx="50" cy="22" rx="12" ry="4" fill={dark} />
          </>
        );
      case "trophy":
        return (
          <>
            <path d="M34 20 h32 v18 a16 16 0 0 1-32 0 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <path d="M34 24 h-10 a10 10 0 0 0 10 12 M66 24 h10 a10 10 0 0 1-10 12" fill="none" stroke={fg} strokeWidth="4" />
            <rect x="46" y="54" width="8" height="14" fill={dark} />
            <path d="M36 68 h28 l4 10 H32 Z" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="28" y="78" width="44" height="8" rx="3" fill={dark} />
            <path d="M50 26 l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8Z" fill={light} />
          </>
        );
      case "moon":
        return (
          <>
            <circle cx="50" cy="44" r="26" fill={fg} stroke={line} strokeWidth="1.5" />
            <circle cx="40" cy="36" r="5" fill={dark} opacity="0.6" />
            <circle cx="58" cy="48" r="7" fill={dark} opacity="0.5" />
            <circle cx="46" cy="56" r="3.5" fill={dark} opacity="0.6" />
            <circle cx="62" cy="32" r="3" fill={dark} opacity="0.5" />
            <path d="M34 72 q16 8 32 0 l6 14 H28 Z" fill={dark} />
            <rect x="24" y="86" width="52" height="6" rx="3" fill={dark} />
          </>
        );
      case "keychain":
      default:
        return (
          <>
            <rect x="26" y="40" width="52" height="34" rx="9" fill={fg} stroke={line} strokeWidth="1.5" />
            <rect x="36" y="52" width="32" height="7" rx="2" fill={dark} />
            <circle cx="28" cy="30" r="7" fill="none" stroke="#c0c0c5" strokeWidth="3.5" />
            <path d="M32 36 L36 42" stroke="#8e8e93" strokeWidth="2" />
          </>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={fg} stopOpacity="0.28" />
          <stop offset="100%" stopColor={fg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gid})`} />
      {body()}
      <path d="M0 0 H100 V100 H0 Z" fill="none" />
      <rect x="0" y="0" width="100" height="100" fill={light} opacity="0" />
    </svg>
  );
}
