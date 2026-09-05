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
      {eyebrow && (
        <div className="flex items-center gap-2 text-flame text-xs font-semibold tracking-widest uppercase mb-3">
          <span className="w-6 h-px bg-flame" />
          <span className="font-mono">{eyebrow}</span>
        </div>
      )}
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05] text-balance">
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
