import Icon, { type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Two icons in one spot that cross-fade through a blur instead of popping —
 * "copy" turning into "check", a "plus" turning into a tick. Both stay
 * mounted, so the change is a transition and not a remount.
 */
export default function IconSwap({
  from,
  to,
  on,
  size = 16,
  strokeWidth,
  className,
}: {
  from: IconName;
  to: IconName;
  on: boolean;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const t = "absolute inset-0 transition-[opacity,transform,filter] duration-200 ease-[var(--ease-out)]";
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <Icon name={from} size={size} strokeWidth={strokeWidth} className={cn(t, on ? "opacity-0 scale-50 blur-[2px]" : "opacity-100")} />
      <Icon name={to} size={size} strokeWidth={strokeWidth} className={cn(t, on ? "opacity-100" : "opacity-0 scale-50 blur-[2px]")} />
    </span>
  );
}
