"use client";
import { forwardRef } from "react";
import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "cyan" | "danger";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  /**
   * Work in progress. The label stays put and the leading icon becomes a
   * spinner, so the button keeps its width and the row does not jump.
   * A loading button is also disabled — a second click is never wanted.
   */
  loading?: boolean;
  /** Done. Swaps the icon for a tick for a moment, without changing the label. */
  success?: boolean;
};

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };
type AnchorProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href: string };

type Props = ButtonProps | AnchorProps;

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-14 px-7 text-base gap-2.5",
};

const variants: Record<Variant, string> = {
  primary: "btn-primary text-white shadow-soft hover:shadow-glow",
  secondary: "bg-ink-800 text-ink-50 border border-ink-700 hover:bg-ink-700",
  ghost:
    "bg-transparent text-ink-50 border border-ink-700/60 hover:border-flame hover:text-flame transition-colors",
  outline:
    "bg-transparent text-ink-50 border border-ink-50/30 hover:border-flame hover:text-flame transition-colors",
  cyan: "bg-cyan2/10 text-cyan2 border border-cyan2/30 hover:bg-cyan2/20",
  danger: "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20",
};

const Btn = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(function Btn(
  props,
  ref,
) {
  const {
    children,
    variant = "primary",
    size = "md",
    icon,
    iconRight,
    className,
  } = props;

  const { loading, success } = props;

  const cls = cn(
    // Every size here is a fixed height, so a label that wraps does not make the
    // button taller — it spills out of it. A button label is a few words by
    // design; it stays on one line and the button grows sideways instead.
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold ease-smooth",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-200",
    // Pressing something should feel like pressing something. 0.97 is enough to
    // register on a touch screen and small enough not to read as a bounce.
    "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
    sizes[size],
    variants[variant],
    className,
  );

  const iconSize = size === "lg" ? 20 : 18;
  const lead = loading ? (
    <span
      aria-hidden
      className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none"
      style={{ width: iconSize, height: iconSize }}
    />
  ) : success ? (
    <Icon name="check" size={iconSize} strokeWidth={3} />
  ) : icon ? (
    <Icon name={icon} size={iconSize} />
  ) : null;

  const content = (
    <>
      {lead}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </>
  );

  if (props.as === "a") {
    const { as: _, variant: __, size: ___, icon: ____, iconRight: _____, className: ______, children: _______, loading: ________, success: _________, ...rest } = props;
    // An internal href MUST go through next/link: a plain <a> is a full document
    // navigation, which recreates the in-memory cart store empty (there is no
    // persistence by design). External links stay as real anchors.
    const internal = rest.href.startsWith("/") && !rest.target;
    if (internal) {
      return (
        <Link ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...rest} href={rest.href}>
          {content}
        </Link>
      );
    }
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...rest}>
        {content}
      </a>
    );
  }

  const { as: _, variant: __, size: ___, icon: ____, iconRight: _____, className: ______, children: _______, loading: ________, success: _________, ...rest } = props as ButtonProps;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cls}
      aria-busy={loading || undefined}
      {...rest}
      disabled={rest.disabled || loading}
    >
      {content}
    </button>
  );
});

export default Btn;
