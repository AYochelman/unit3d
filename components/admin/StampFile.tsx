"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { stamp3mf } from "@/lib/stamp-3mf";

/**
 * Drop the 3MF downloaded from MakerWorld here; it comes back as
 * UNIT3D-12345.3mf with the order number inside, where the printer reads the
 * job name. Everything happens in the browser — the file is never uploaded,
 * so nothing is re-hosted (see ModelDownload for why that matters).
 */
export default function StampFile({ name }: { name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "over" | "busy" | "done" | "bad" | "missed">("idle");

  // A file dropped a few pixels off the target is opened (or saved under its
  // old name) by the browser itself — which looks exactly like "it saved the
  // wrong name". While this is on screen, a stray drop does nothing but say
  // where to drop.
  useEffect(() => {
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files") || e.defaultPrevented) return;
      e.preventDefault();
      setState("missed");
      setTimeout(() => setState((s) => (s === "missed" ? "idle" : s)), 2500);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setState("busy");
    try {
      const out = await stamp3mf(new Uint8Array(await file.arrayBuffer()), name);
      const url = URL.createObjectURL(new Blob([out as BlobPart], { type: "model/3mf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.3mf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("done");
    } catch {
      setState("bad");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  const label =
    state === "busy" ? "מכין…" :
    state === "done" ? `ירד: ${name}.3mf` :
    state === "bad" ? "זה לא קובץ 3MF" :
    state === "over" ? "שחרר כאן" :
    state === "missed" ? "גרור בדיוק על הכפתור הזה" :
    "גרור 3MF ← יורד עם מספר ההזמנה";

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (state !== "over") setState("over"); }}
        onDragLeave={() => setState((s) => (s === "over" ? "idle" : s))}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); void handle(e.dataTransfer.files?.[0]); }}
        title={`הקובץ שהורדת ממייקרוורלד יחזור בשם ${name}, וזה השם שהמדפסת תציג`}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-semibold border-2 border-dashed transition-colors",
          state === "done" ? "border-good text-good bg-good/10" :
          state === "bad" || state === "missed" ? "border-bad text-bad bg-bad/10" :
          state === "over" ? "border-flame text-flame bg-flame/10" :
          "border-ink-600 text-ink-300 hover:border-flame hover:text-flame",
        )}
      >
        <Icon name={state === "done" ? "check" : "download"} size={15} />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept=".3mf"
        className="hidden"
        onChange={(e) => { void handle(e.target.files?.[0]); e.target.value = ""; }}
      />
    </>
  );
}
