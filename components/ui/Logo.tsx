export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="inline-flex items-center gap-2 font-extrabold tracking-tightest"
      style={{ fontSize: size * 0.6 }}
      dir="ltr"
    >
      <span className="relative">
        <span className="text-ink-50">Unit</span>
        <span className="text-flame">3D</span>
        <span className="absolute -left-1 -bottom-1 w-1.5 h-1.5 bg-flame rounded-full" />
      </span>
    </div>
  );
}
