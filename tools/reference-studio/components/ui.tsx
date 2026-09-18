"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStudio } from "@/lib/store";

/* ---------------- icons ---------------- */
const PATHS: Record<string, string> = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  star: "m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.5l6.3-.9L12 3Z",
  close: "M18 6 6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  copy: "M8 8h11v13H8zM5 16V3h11",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  download: "M12 3v13m0 0 5-5m-5 5-5-5M4 21h16",
  check: "m5 13 4 4L19 7",
  alert: "M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  chevron: "m9 6 6 6-6 6",
  zoomIn: "M11 8v6M8 11h6M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  zoomOut: "M8 11h6M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  layers: "m12 3 9 5-9 5-9-5 9-5ZM3 14l9 5 9-5",
  sliders: "M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4",
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof PATHS | string; className?: string }) {
  // One <path> for the whole string: an SVG path may hold several subpaths, and
  // splitting on "M" corrupted any that started with a relative "m".
  const d = PATHS[name] ?? PATHS.grid;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ---------------- copy button ---------------- */
export function CopyButton({
  text, label, className = "btn btn-sm", icon = true, onCopied,
}: { text: string | (() => string); label: string; className?: string; icon?: boolean; onCopied?: () => void }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    const value = typeof text === "function" ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
      onCopied?.();
    } catch {
      // Clipboard access can be refused; a textarea fallback still works and
      // is better than a button that silently does nothing.
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand?.("copy");
      area.remove();
      setState(ok ? "done" : "fail");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button type="button" className={className} onClick={copy} data-state={state}>
      {icon && <Icon name={state === "done" ? "check" : "copy"} className="h-3.5 w-3.5 shrink-0" />}
      <span>{state === "done" ? "Copied" : state === "fail" ? "Press Ctrl+C" : label}</span>
    </button>
  );
}

/* ---------------- confidence pill ---------------- */
export function Confidence({ value }: { value: "observed" | "estimated" }) {
  const observed = value === "observed";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        background: observed ? "rgb(var(--ok) / 0.14)" : "rgb(var(--warn) / 0.14)",
        color: observed ? "rgb(var(--ok))" : "rgb(var(--warn))",
      }}
      title={observed ? "Measured, not guessed" : "Inferred - verify before relying on it"}
    >
      {observed ? "observed" : "estimated"}
    </span>
  );
}

/* ---------------- list of short strings ---------------- */
export function ListInput({
  value, onChange, placeholder, label, rows = 3,
}: { value: string[]; onChange: (next: string[]) => void; placeholder?: string; label?: string; rows?: number }) {
  const id = useId();
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <textarea
        id={id}
        className="field resize-y font-normal"
        rows={rows}
        dir="auto"
        placeholder={placeholder}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((v) => v.trim()).filter(Boolean))}
      />
      <p className="mt-1 text-xs text-faint">One per line.</p>
    </div>
  );
}

/* ---------------- tag input ---------------- */
export function TagInput({ value, onChange, suggestions = [] }: { value: string[]; onChange: (next: string[]) => void; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, "");
    if (!tag || value.includes(tag)) { setDraft(""); return; }
    onChange([...value, tag]);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 8);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="chip chip-on" dir="auto">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}
              className="opacity-70 hover:opacity-100" aria-label={`Remove tag ${tag}`}>
              <Icon name="close" className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        className="field"
        dir="auto"
        value={draft}
        placeholder="Add a tag, then Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
      />
      {unused.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {unused.map((s) => (
            <button key={s} type="button" className="chip hover:text-ink" onClick={() => add(s)} dir="auto">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- toasts ---------------- */
export function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-block-end-0 inset-inline-end-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4"
      style={{ insetBlockEnd: 0, insetInlineEnd: 0 }}
      role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id}
          className="panel pointer-events-auto flex items-start gap-2.5 p-3 text-sm shadow-pop"
          style={{
            borderColor: t.kind === "error" ? "rgb(var(--bad) / 0.5)" : t.kind === "ok" ? "rgb(var(--ok) / 0.4)" : undefined,
          }}>
          <Icon name={t.kind === "error" ? "alert" : t.kind === "ok" ? "check" : "layers"}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="flex-1 leading-snug" dir="auto">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="text-faint hover:text-ink" aria-label="Dismiss">
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- spinner ---------------- */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- empty state ---------------- */
export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="rounded-full p-4" style={{ background: "rgb(var(--line) / 0.05)" }}>
        <Icon name="image" className="h-6 w-6 text-faint" />
      </div>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}
