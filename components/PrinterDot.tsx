"use client";
import { usePrinterLive } from "@/lib/printer";

/**
 * The little light in the footer.
 *
 * It used to be painted green on every page whatever the machine was doing.
 * Now it says what the printer is actually doing, and goes grey when it is off.
 */
export default function PrinterDot() {
  const { live, online } = usePrinterLive(30_000, 600_000);
  const printing = live?.state === "printing";
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-ink-400" dir="ltr">
      <span className={`w-1.5 h-1.5 rounded-full ${printing ? "bg-flame live-dot" : online ? "bg-good" : "bg-ink-600"}`} />
      <span>{printing ? "PRINTING NOW" : online ? "PRINTER ONLINE" : "PRINTER OFFLINE"}</span>
    </div>
  );
}
