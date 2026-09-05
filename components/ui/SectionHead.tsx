import { cn } from "@/lib/cn";

export default function SectionHead({
  eyebrow,
  title,
  sub,
  align = "right",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "right" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {/* The accent colour is for things you can click. An eyebrow is not one,
          so it is quiet type, not a green label. */}
      {eyebrow && (
        <div className="flex items-center gap-2 text-ink-400 text-xs font-semibold tracking-wide mb-3">
          <span className="w-6 h-px bg-ink-700" />
          <span>{eyebrow}</span>
        </div>
      )}
      <h2 className="font-display text-3xl md:text-[42px] font-bold leading-[1.15] text-balance">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-ink-300 text-base md:text-lg max-w-2xl leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );
}
