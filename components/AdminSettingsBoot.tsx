"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/lib/admin-store";

const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/**
 * Loads the saved price list, once, when the site opens.
 *
 * The project rules forbid localStorage, so "saving" is a file: /admin writes
 * `admin-settings.json`, the owner drops it into `public/` and pushes. From
 * then on every visitor gets those spool prices, margins, hand-set prices and
 * out-of-stock filaments — not just the owner's own session.
 *
 * Missing file (the normal case before the first save) is not an error: the
 * fetch simply fails or 404s and the shop keeps its catalogue prices.
 */
export default function AdminSettingsBoot() {
  const importJson = useAdminStore((s) => s.importJson);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/admin-settings.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (text && !cancelled) importJson(text);
      })
      .catch(() => {
        /* no saved settings — the catalogue defaults stand */
      });
    return () => {
      cancelled = true;
    };
  }, [importJson]);

  return null;
}
