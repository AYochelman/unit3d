"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Letters that swell towards the cursor: each one moves from
 * `fromFontVariationSettings` to `toFontVariationSettings` as the pointer
 * comes within `radius` px of it, measured anywhere inside `containerRef`.
 *
 * The base component was not part of the snippet the owner pasted (only the
 * hero that uses it), so this is written for the site: no animation library,
 * one rAF per pointer move, styles written straight to the letters instead of
 * re-rendering, and nothing at all for touch or reduced motion. Words stay
 * whole so a line never breaks inside one, which matters for Hebrew too.
 *
 * Letters carry no inline settings until the pointer first moves, so a phone
 * (and the first paint everywhere) shows whatever weight the text's own CSS
 * gives it. They are the only copy of the text, so search engines and
 * copy-paste read it once; headings get an aria-label so screen readers do not
 * spell it out letter by letter.
 *
 * Needs a variable font: the site's Assistant runs 200–800 on `wght`.
 */
type Axes = Record<string, number>;
type Falloff = "linear" | "exponential" | "gaussian";

const parse = (s: string): Axes =>
  Object.fromEntries(
    [...s.matchAll(/['"]([a-zA-Z]{4})['"]\s+(-?[\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])]),
  );

/** Drives every `[data-vfl]` letter inside the container. */
function useProximity(
  containerRef: RefObject<HTMLElement | null>,
  from: string,
  to: string,
  radius: number,
  falloff: Falloff,
) {
  const live = useRef({ from, to, radius, falloff });
  useEffect(() => { live.current = { from, to, radius, falloff }; });

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = (inside: boolean) => {
      raf = 0;
      const { from: f0, to: t0, radius: r, falloff: fo } = live.current;
      const a = parse(f0);
      const b = parse(t0);
      const keys = Object.keys(a).filter((k) => k in b);
      const at = (t: number) => keys.map((k) => `'${k}' ${a[k] + (b[k] - a[k]) * t}`).join(", ");
      // Queried each time: a heading whose text changes (a product name, a
      // live status) brings new letters with it.
      for (const el of box.querySelectorAll<HTMLElement>("[data-vfl]")) {
        let t = 0;
        if (inside) {
          const rect = el.getBoundingClientRect();
          const d = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
          const n = Math.min(1, d / r);
          t = fo === "exponential" ? (1 - n) ** 2 : fo === "gaussian" ? (n < 1 ? Math.exp(-((n * 2) ** 2) / 2) : 0) : 1 - n;
        }
        el.style.fontVariationSettings = at(t);
      }
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => paint(true));
    };
    const leave = () => {
      if (raf) cancelAnimationFrame(raf);
      paint(false);
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerleave", leave);
    return () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef]);
}

const LETTER = "inline-block transition-[font-variation-settings] duration-150 ease-out";

/** A run of text as words of letters. */
function lettersOf(text: string, key: string): ReactNode[] {
  return text.split(/(\s+)/).map((word, w) =>
    !word ? null : /^\s+$/.test(word) ? (
      word
    ) : (
      <span key={`${key}-${w}`} className="inline-block whitespace-nowrap">
        {[...word].map((ch, c) => (
          <span key={c} data-vfl="" className={LETTER}>
            {ch}
          </span>
        ))}
      </span>
    ),
  );
}

/** Splits every string inside, keeping the elements around them (spans, <br>, <bdi>). */
function split(node: ReactNode, key = "v"): ReactNode {
  if (typeof node === "string" || typeof node === "number") return lettersOf(String(node), key);
  if (Array.isArray(node)) return Children.map(node, (n, i) => split(n, `${key}.${i}`));
  if (isValidElement(node) && typeof node.type === "string") {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return el.props.children === undefined ? el : cloneElement(el, undefined, split(el.props.children, key));
  }
  return node;
}

/** The plain text, for an aria-label. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    if (node.type === "br") return " ";
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Proximity on a loose run of text, measured over `containerRef`. */
export function VariableFontCursorProximity({
  children,
  containerRef,
  fromFontVariationSettings,
  toFontVariationSettings,
  radius = 50,
  falloff = "linear",
  className,
}: {
  children: string;
  containerRef: RefObject<HTMLElement | null>;
  fromFontVariationSettings: string;
  toFontVariationSettings: string;
  radius?: number;
  falloff?: Falloff;
  className?: string;
}) {
  useProximity(containerRef, fromFontVariationSettings, toFontVariationSettings, radius, falloff);
  return <span className={cn("inline-block", className)}>{lettersOf(children, "v")}</span>;
}

/**
 * The page title, with the effect. A drop-in for <h1>: same props, same
 * children. With a mouse it rests at 400 (in CSS, so the first paint has it)
 * and reaches 800 under the pointer; phones and reduced motion keep the
 * heading's own weight.
 */
export function ProximityH1({
  children,
  className,
  radius = 110,
  ...rest
}: ComponentPropsWithoutRef<"h1"> & { radius?: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useProximity(ref, "'wght' 400", "'wght' 800", radius, "gaussian");
  const label = textOf(children).replace(/\s+/g, " ").trim();
  return (
    <h1
      ref={ref}
      aria-label={rest["aria-label"] ?? (label || undefined)}
      {...rest}
      className={cn(className, "[@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:font-normal")}
    >
      {split(children)}
    </h1>
  );
}
