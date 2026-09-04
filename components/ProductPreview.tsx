import type { ConfigProduct, Design, Filament, FontOpt, ShapeId } from "@/lib/types";
import KeychainPreview from "./KeychainPreview";
import DesignGroup from "./designer/DesignGroup";
import { facePath, type FaceKind } from "@/lib/design";

type Props = {
  product: ConfigProduct;
  shape: ShapeId;
  text: string;
  number: string;
  colorObj: Filament;
  fontObj: FontOpt;
  /** Free design; when it has elements it replaces the quick text. */
  design: Design | null;
  /** Face size in mm (changes with the chosen size). */
  face: [number, number];
  modelLabel?: string;
};

export function faceKindFor(product: ConfigProduct): FaceKind {
  switch (product.id) {
    case "coaster":
      return "round";
    case "phone_case":
      return "phone";
    case "lighter_case":
    case "bookmark":
      return "tall";
    case "name_plate":
    case "luggage_tag":
      return "rect";
    default:
      return "roundrect";
  }
}

/**
 * Live preview for every configurator product. The keychain keeps its original
 * illustrated preview; everything else is drawn from the product face (mm)
 * so the proportions on screen match the print.
 */
export default function ProductPreview({ product, shape, text, number, colorObj, fontObj, design, face, modelLabel }: Props) {
  const hasDesign = !!design && design.elements.length > 0;

  if (product.id === "keychain" && !hasDesign) {
    return <KeychainPreview shape={shape} text={text} number={number} colorObj={colorObj} fontObj={fontObj} />;
  }

  const [fw, fh] = face;
  const kind = faceKindFor(product);
  const W = 300, H = 220;
  // fit the face into the stage with padding
  const pad = 0.16;
  const scale = Math.min((W * (1 - pad)) / fw, (H * (1 - pad)) / fh);
  const ox = (W - fw * scale) / 2;
  const oy = (H - fh * scale) / 2;
  const fg = colorObj.hex;
  const isLight = ["white", "silver", "gold", "glow"].includes(colorObj.id);
  const textColor = isLight ? "#0A0A0B" : "#ffffff";
  const path = facePath(kind, fw, fh);
  const clipId = `pp-clip-${product.id}`;

  const quickTextSize = Math.min(fh * 0.34, (fw * 0.9) / Math.max(4, (text || "טקסט").length * 0.6));

  return (
    <div className="relative" style={{ transformStyle: "preserve-3d", transform: "rotateY(-8deg) rotateX(6deg)" }}>
      <div className="absolute -inset-4 blur-2xl rounded-full" style={{ background: `radial-gradient(ellipse at 50% 60%, ${fg}40, transparent 70%)` }} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="relative drop-shadow-2xl">
        <defs>
          <linearGradient id="pp-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>

        {/* hardware: ring for tags / keychain, chain for dog tag, strap for luggage */}
        {(product.id === "keychain" || product.id === "luggage_tag") && (
          <g transform={`translate(${ox + fw * scale} ${oy})`}>
            <circle cx="6" cy="-4" r="10" fill="none" stroke="#C0C0C5" strokeWidth="4" />
          </g>
        )}
        {product.id === "dog_tag" && (
          <path d={`M${ox + 10} ${oy} C${ox - 30} ${oy - 40} ${ox + fw * scale + 30} ${oy - 40} ${ox + fw * scale - 10} ${oy}`} fill="none" stroke="#9A9A9F" strokeWidth="2.5" strokeDasharray="3 2" />
        )}
        {product.id === "name_plate" && (
          <rect x={ox - 6} y={oy + fh * scale} width={fw * scale + 12} height={10} rx="3" fill="#2A2A2E" />
        )}

        <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
          <path d={path} fill={fg} stroke="rgba(0,0,0,0.45)" strokeWidth={Math.max(0.3, fw * 0.008)} />
          {kind === "phone" && (
            <rect x={fw * 0.08} y={fh * 0.04} width={fw * 0.34} height={fh * 0.16} rx={fw * 0.06} fill="rgba(0,0,0,0.35)" />
          )}
          {product.id === "lighter_case" && (
            <rect x={fw * 0.15} y={-fh * 0.06} width={fw * 0.7} height={fh * 0.08} rx={fw * 0.04} fill="#8E8E93" />
          )}
          {product.id === "bookmark" && <circle cx={fw / 2} cy={fh * 0.06} r={fw * 0.06} fill="rgba(0,0,0,0.45)" />}
          {product.id === "dog_tag" && <circle cx={fw * 0.12} cy={fh * 0.5} r={fh * 0.08} fill="rgba(0,0,0,0.45)" />}

          <g clipPath={`url(#${clipId})`}>
            {hasDesign && design ? (
              <DesignGroup design={design} />
            ) : (
              <>
                <text
                  x={fw / 2}
                  y={number ? fh * 0.42 : fh * 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontFamily={fontObj.css}
                  fontWeight={fontObj.weight}
                  fontSize={quickTextSize}
                  style={{ textTransform: fontObj.upper ? "uppercase" : "none" }}
                >
                  {text || "טקסט"}
                </text>
                {number && (
                  <text
                    x={fw / 2}
                    y={fh * 0.7}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    opacity="0.85"
                    fontFamily="var(--font-mono), monospace"
                    fontWeight="500"
                    fontSize={Math.min(fh * 0.18, (fw * 0.85) / Math.max(4, number.length * 0.65))}
                    letterSpacing={fw * 0.01}
                  >
                    {number}
                  </text>
                )}
              </>
            )}
          </g>
          <path d={path} fill="url(#pp-shade)" />
        </g>

        {/* layer lines */}
        <g opacity="0.08">
          {Array.from({ length: 44 }).map((_, i) => (
            <line key={i} x1="0" y1={5 + i * 5} x2={W} y2={5 + i * 5} stroke="#000" strokeWidth="0.3" />
          ))}
        </g>

        {modelLabel && (
          <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="9" fill="#8E8E93">
            {modelLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
