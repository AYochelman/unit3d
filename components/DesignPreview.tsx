"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESIGNS, DESIGN_BY_ID, buildPreviewCss, recolorInline, restoreInline, useDesignPreview, type DesignId } from "@/lib/design-preview";
import { useAdminStore } from "@/lib/admin-store";

/**
 * Puts a design direction on the real site — for the owner's eyes only.
 *
 * Renders nothing and touches nothing unless a preview was switched on from
 * /admin → "תצוגת עיצוב" in this browser, with the admin unlocked. A visitor
 * never has one, so for every visitor this component is an empty fragment.
 */
export default function DesignPreview() {
  const design = useDesignPreview((s) => s.design);
  const setDesign = useDesignPreview((s) => s.setDesign);
  const unlocked = useAdminStore((s) => s.unlocked);
  const pathname = usePathname();
  const active = unlocked && design ? DESIGN_BY_ID[design] : null;

  useEffect(() => {
    const root = document.documentElement;
    restoreInline();
    if (!active) {
      root.removeAttribute("data-design");
      document.getElementById("design-preview")?.remove();
      return;
    }
    // A route can bring its own stylesheet chunk; give it a moment to attach,
    // then rebuild so the new page is recoloured too.
    const t = window.setTimeout(() => {
      let el = document.getElementById("design-preview") as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = "design-preview";
        document.head.appendChild(el);
      }
      el.textContent = buildPreviewCss(active);
      root.setAttribute("data-design", active.id);
      recolorInline(active);
    }, 120);
    // Cards, timelapses and lazy sections arrive after the first paint; colour
    // them as they land.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = window.requestAnimationFrame(() => { queued = 0; recolorInline(active); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { window.clearTimeout(t); mo.disconnect(); if (queued) window.cancelAnimationFrame(queued); };
  }, [active, pathname]);

  if (!active) return null;

  return (
    <div
      dir="rtl"
      role="region"
      data-design-bar=""
      aria-label="תצוגה מקדימה של עיצוב"
      style={{
        position: "fixed", insetInlineStart: 12, insetInlineEnd: 12, bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        zIndex: 2147483000, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
        padding: "10px 12px", borderRadius: 14, background: "rgba(10,10,11,.92)", color: "#fafafa",
        border: "1px solid #3a3a3f", boxShadow: "0 8px 32px rgba(0,0,0,.35)", font: "500 13px/1.3 Heebo, system-ui, sans-serif",
        backdropFilter: "blur(6px)", maxWidth: 760, marginInline: "auto",
      }}
    >
      <span style={{ fontWeight: 700 }}>תצוגה מקדימה · רק אצלך</span>
      <select
        id="design-preview-pick"
        value={active.id}
        onChange={(e) => setDesign(e.target.value as DesignId)}
        style={{ background: "#1c1c1f", color: "#fafafa", border: "1px solid #3a3a3f", borderRadius: 8, padding: "6px 8px", font: "inherit" }}
      >
        {DESIGNS.map((d) => (
          <option key={d.id} value={d.id}>{d.brief} {d.label}</option>
        ))}
      </select>
      <span style={{ flex: 1 }} />
      <Link href="/admin" style={{ color: "#c7c7cc", textDecoration: "underline" }}>לניהול</Link>
      <button
        type="button"
        onClick={() => setDesign(null)}
        style={{ background: "#fafafa", color: "#0a0a0b", border: 0, borderRadius: 8, padding: "6px 12px", font: "inherit", fontWeight: 700, cursor: "pointer" }}
      >
        חזרה לעיצוב הקיים
      </button>
    </div>
  );
}
