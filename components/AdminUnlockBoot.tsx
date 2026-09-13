"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { readUnlock } from "@/lib/admin-unlock";

/**
 * Reopens the admin on a device that was already unlocked.
 *
 * It sits in the layout rather than in /admin because the unlock does not only
 * gate that page: the shelf mover and the model download appear beside products
 * all over the shop, and they were vanishing on every refresh too.
 *
 * The read happens in an effect, never during render — localStorage does not
 * exist on the server, and a value that differs between the server's markup and
 * the client's first paint is a hydration error.
 */
export default function AdminUnlockBoot() {
  const restore = useAdminStore((s) => s.restore);

  useEffect(() => {
    if (readUnlock()) restore();
  }, [restore]);

  return null;
}
