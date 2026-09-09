"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/lib/admin-store";
import type { Coupon } from "@/lib/coupons";

/**
 * The discount codes, loaded on every page.
 *
 * A code only means something if the checkout can check it, and the checkout
 * runs in the customer's browser — so the list Ariel saved from /admin is read
 * here, once, for everyone. It is public by design: a code is a public thing.
 */
export default function CouponsBoot() {
  const setCoupons = useAdminStore((s) => s.setCoupons);
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    let alive = true;
    fetch(`${base}/coupons.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Coupon[]) => { if (alive && Array.isArray(list)) setCoupons(list); })
      .catch(() => {});
    return () => { alive = false; };
  }, [setCoupons]);
  return null;
}
