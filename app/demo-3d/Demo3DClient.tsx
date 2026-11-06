"use client";
import Demo3DSections from "@/components/demo3d/Demo3DSections";

export default function Demo3DClient() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-10 py-10 space-y-14">
      <header>
        <div className="font-mono text-[11px] tracking-widest text-ink-500 mb-2">DEMO · לא מופיע באתר</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">שתי דרכים להראות מוצר מכל הכיוונים</h1>
      </header>
      <Demo3DSections />
    </main>
  );
}
