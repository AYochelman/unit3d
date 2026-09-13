"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAdminStore } from "@/lib/admin-store";
import { muteAnalytics, track } from "@/lib/analytics";
import { readUnlock } from "@/lib/admin-unlock";

/**
 * One page_view per page, and none of the owner's own.
 *
 * The shop is a single-page app after the first load, so a navigation does not
 * reload anything — the pathname changing IS the page view, which is why this
 * watches it rather than firing once at boot.
 */
export default function AnalyticsBoot() {
  const unlocked = useAdminStore((s) => s.unlocked);
  const pathname = usePathname();

  /**
   * The device, asked directly.
   *
   * The store's flag is restored by AdminUnlockBoot in ITS effect, and on a
   * hard load there is no guarantee that lands before this one runs — so the
   * owner's first page view was being recorded on every full page load, which
   * is exactly the pollution the mute exists to prevent. Reading the device
   * here has no ordering to get wrong.
   */
  const mine = () => unlocked || readUnlock();

  // His twenty visits a day would drown the real ones, so while the admin is
  // open nothing is recorded.
  useEffect(() => {
    muteAnalytics(mine());
    // `mine` closes over `unlocked`, which is the only input that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (mine()) return;
    track("page_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, unlocked]);

  return null;
}
