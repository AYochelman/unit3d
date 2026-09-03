import type { EmblemShape } from "@/lib/types";

type Props = {
  shape?: EmblemShape;
  hue?: number;
  size?: number;
  label?: string;
  mono?: boolean;
  className?: string;
};

export default function Emblem({
  shape = "shield",
  hue = 18,
  size = 120,
  label,
  mono = false,
  className,
}: Props) {
  const fg = mono ? "#F5F5F7" : `hsl(${hue}, 70%, 60%)`;
  const fgDark = mono ? "#C7C7CC" : `hsl(${hue}, 60%, 40%)`;
  const stroke = mono ? "#48484C" : `hsl(${hue}, 30%, 25%)`;
  const gradId = `glow-${hue}-${shape}`;

  const renderInner = () => {
    switch (shape) {
      case "circle":
        return (
          <>
            <circle cx="50" cy="50" r="42" fill={fg} stroke={stroke} strokeWidth="2" />
            <circle cx="50" cy="50" r="34" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <circle cx="50" cy="50" r="18" fill={fgDark} />
            <circle cx="50" cy="50" r="6" fill={fg} />
          </>
        );
      case "diamond":
        return (
          <>
            <path d="M50 8 L90 50 L50 92 L10 50 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <path d="M50 22 L78 50 L50 78 L22 50 Z" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <path d="M50 36 L66 50 L50 64 L34 50 Z" fill={fgDark} />
          </>
        );
      case "hex":
        return (
          <>
            <path d="M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <path d="M50 22 L74 36 L74 64 L50 78 L26 64 L26 36 Z" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <text x="50" y="58" textAnchor="middle" fill="#0A0A0B" fontSize="22" fontWeight="900">▲</text>
          </>
        );
      case "wings":
        return (
          <>
            <path d="M50 8 L78 22 L78 50 Q78 76 50 90 Q22 76 22 50 L22 22 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <path d="M22 36 Q4 42 8 56 L22 50 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <path d="M78 36 Q96 42 92 56 L78 50 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <circle cx="50" cy="48" r="10" fill={fgDark} />
          </>
        );
      case "anchor":
        return (
          <>
            <circle cx="50" cy="50" r="42" fill={fg} stroke={stroke} strokeWidth="2" />
            <circle cx="50" cy="50" r="34" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <circle cx="50" cy="32" r="6" fill="none" stroke="#0A0A0B" strokeWidth="3" />
            <path d="M50 38 L50 70 M40 50 L60 50 M32 64 Q40 78 50 70 Q60 78 68 64" fill="none" stroke="#0A0A0B" strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case "rect":
        return (
          <>
            <rect x="14" y="22" width="72" height="56" rx="6" fill={fg} stroke={stroke} strokeWidth="2" />
            <rect x="22" y="30" width="56" height="40" rx="3" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <rect x="34" y="42" width="32" height="16" rx="2" fill={fgDark} />
          </>
        );
      case "shield":
      default:
        return (
          <>
            <path d="M50 8 L88 22 L88 56 Q88 80 50 92 Q12 80 12 56 L12 22 Z" fill={fg} stroke={stroke} strokeWidth="2" />
            <path d="M50 18 L78 28 L78 56 Q78 74 50 84 Q22 74 22 56 L22 28 Z" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" />
            <text x="50" y="60" textAnchor="middle" fill="#0A0A0B" fontSize="20" fontWeight="900" letterSpacing="-1">★</text>
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-label={label || "emblem"}
      className={className}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={fg} stopOpacity="0.15" />
          <stop offset="100%" stopColor={fg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-10" y="-10" width="120" height="120" fill={`url(#${gradId})`} />
      {renderInner()}
    </svg>
  );
}
