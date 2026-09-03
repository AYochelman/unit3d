"use client";
import { useState } from "react";
import { FAQS } from "@/lib/data";
import { cn } from "@/lib/cn";

export default function FAQClient() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="space-y-2">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q} className="rounded-2xl border border-ink-800 bg-ink-900">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-5 text-right"
            >
              <span className="font-bold text-lg leading-snug">{f.q}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200",
                  isOpen
                    ? "rotate-45 bg-flame border-flame text-white"
                    : "border-ink-700 text-ink-300",
                )}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
            <div
              className={cn(
                "px-5 overflow-hidden transition-all duration-300 ease-smooth",
                isOpen ? "max-h-96 pb-5" : "max-h-0",
              )}
            >
              <p className="text-ink-300 text-sm md:text-base leading-relaxed">
                {f.a}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
