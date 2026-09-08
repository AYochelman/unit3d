"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/lib/admin-store";
import type { PlacedOrder } from "@/lib/orders";

const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/**
 * Loads the orders already filed and decided.
 *
 * Same shape as the price list: /admin writes public/orders.json to the
 * repository, and every session reads it back. Without this an approval would
 * live only in the tab that made it — which for a record of something that
 * happened is worse than not recording it at all.
 *
 * A missing file is the normal state before the first order, not an error.
 */
export default function OrdersBoot() {
  const setOrders = useAdminStore((s) => s.setOrders);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/orders.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: PlacedOrder[] | null) => {
        if (!cancelled && Array.isArray(rows)) setOrders(rows);
      })
      .catch(() => {
        /* no orders saved yet */
      });
    return () => {
      cancelled = true;
    };
  }, [setOrders]);

  return null;
}
