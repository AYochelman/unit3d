import type { Design } from "@/lib/types";
import { DESIGN_FONT_BY_ID, shapePath } from "@/lib/design";

/**
 * Renders a design's elements as an SVG <g>. The parent decides the
 * coordinate system (1 unit = 1mm) and any clipping to the product face.
 */
export default function DesignGroup({ design, selectedId }: { design: Design; selectedId?: string | null }) {
  return (
    <g>
      {design.elements.map((el) => {
        const transform = `translate(${el.x} ${el.y}) rotate(${el.rotation})`;
        if (el.kind === "text") {
          return (
            <text
              key={el.id}
              data-el={el.id}
              transform={transform}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={DESIGN_FONT_BY_ID[el.font].css}
              fontSize={el.size}
              fontWeight={el.bold ? 700 : 400}
              fill={el.fill}
              style={{ cursor: "move", userSelect: "none", paintOrder: "stroke" }}
              stroke={selectedId === el.id ? "rgba(0,194,199,0.6)" : undefined}
              strokeWidth={selectedId === el.id ? 0.4 : undefined}
            >
              {el.text}
            </text>
          );
        }
        return (
          <path
            key={el.id}
            data-el={el.id}
            transform={transform}
            d={shapePath(el.shape, el.w, el.h)}
            fill={el.fill}
            stroke={el.stroke ?? (selectedId === el.id ? "rgba(0,194,199,0.9)" : "none")}
            strokeWidth={el.stroke ? el.strokeWidth : selectedId === el.id ? 0.6 : 0}
            style={{ cursor: "move" }}
          />
        );
      })}
    </g>
  );
}
