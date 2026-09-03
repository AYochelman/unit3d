import type { Filament, FontOpt } from "@/lib/types";

type Shape = "round" | "rect" | "emblem" | "custom";

type Props = {
  shape: Shape;
  text: string;
  number: string;
  colorObj: Filament;
  fontObj: FontOpt;
};

export default function KeychainPreview({ shape, text, number, colorObj, fontObj }: Props) {
  const fg = colorObj.hex;
  const W = 280;
  const H = 200;
  const darkBg = "rgba(0,0,0,0.4)";

  const bodyPath = (() => {
    switch (shape) {
      case "round":
        return <circle cx="140" cy="100" r="80" fill={fg} />;
      case "rect":
        return <rect x="50" y="40" width="180" height="120" rx="20" fill={fg} />;
      case "emblem":
        return (
          <path
            d="M140 20 L210 45 L210 110 Q210 155 140 180 Q70 155 70 110 L70 45 Z"
            fill={fg}
          />
        );
      case "custom":
      default:
        return (
          <path
            d="M50 100 Q50 40 140 40 Q230 40 230 100 Q230 160 140 160 Q50 160 50 100 Z"
            fill={fg}
          />
        );
    }
  })();

  const overlay = (() => {
    switch (shape) {
      case "round":
        return <circle cx="140" cy="100" r="80" fill="url(#bodyShade)" />;
      case "rect":
        return <rect x="50" y="40" width="180" height="120" rx="20" fill="url(#bodyShade)" />;
      case "emblem":
        return (
          <path
            d="M140 20 L210 45 L210 110 Q210 155 140 180 Q70 155 70 110 L70 45 Z"
            fill="url(#bodyShade)"
          />
        );
      case "custom":
      default:
        return (
          <path
            d="M50 100 Q50 40 140 40 Q230 40 230 100 Q230 160 140 160 Q50 160 50 100 Z"
            fill="url(#bodyShade)"
          />
        );
    }
  })();

  const isLight = ["white", "silver", "gold"].includes(colorObj.id);
  const textColor = isLight ? "#0A0A0B" : "#ffffff";

  return (
    <div
      className="relative"
      style={{
        transformStyle: "preserve-3d",
        transform: "rotateY(-8deg) rotateX(6deg)",
      }}
    >
      <div
        className="absolute -inset-4 blur-2xl rounded-full"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${fg}40, transparent 70%)`,
        }}
      />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="relative drop-shadow-2xl">
        <defs>
          <linearGradient id="bodyShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
        </defs>

        <circle cx="240" cy="40" r="14" fill="none" stroke="#C0C0C5" strokeWidth="5" />
        <line x1="225" y1="40" x2="215" y2="46" stroke="#9A9A9F" strokeWidth="2" />

        {bodyPath}

        {shape === "round" && (
          <circle cx="140" cy="100" r="68" fill="none" stroke={darkBg} strokeWidth="2" opacity="0.4" />
        )}
        {shape === "rect" && (
          <rect x="58" y="48" width="164" height="104" rx="14" fill="none" stroke={darkBg} strokeWidth="2" opacity="0.4" />
        )}

        {overlay}

        <text
          x="140"
          y={number ? "92" : "108"}
          textAnchor="middle"
          fill={textColor}
          fontFamily={fontObj.css}
          fontWeight={fontObj.weight}
          fontSize="28"
          letterSpacing={fontObj.letter || "-0.5"}
          style={{ textTransform: fontObj.upper ? "uppercase" : "none" }}
        >
          {text || "טקסט"}
        </text>
        {number && (
          <text
            x="140"
            y="124"
            textAnchor="middle"
            fill={textColor}
            opacity="0.85"
            fontFamily="var(--font-mono), monospace"
            fontWeight="500"
            fontSize="14"
            letterSpacing="2"
          >
            {number}
          </text>
        )}

        <g opacity="0.08">
          {Array.from({ length: 40 }).map((_, i) => (
            <line key={i} x1="0" y1={5 + i * 5} x2={W} y2={5 + i * 5} stroke="#000" strokeWidth="0.3" />
          ))}
        </g>
      </svg>
    </div>
  );
}
