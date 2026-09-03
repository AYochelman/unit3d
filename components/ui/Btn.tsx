"use client";
import { forwardRef } from "react";
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

  const cls = cn(
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 ease-smooth disabled:opacity-50 disabled:cursor-not-allowed",
    sizes[size],
    variants[variant],
    className,
  );

  const iconSize = size === "lg" ? 20 : 18;
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );

  if (props.as === "a") {
    const { as: _, variant: __, size: ___, icon: ____, iconRight: _____, className: ______, children: _______, ...rest } = props;
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...rest}>
        {content}
      </a>
    );
  }

  const { as: _, variant: __, size: ___, icon: ____, iconRight: _____, className: ______, children: _______, ...rest } = props as ButtonProps;
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={cls} {...rest}>
      {content}
    </button>
  );
});

export default Btn;
