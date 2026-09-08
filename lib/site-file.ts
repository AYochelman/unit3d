"use client";
import { useAdminStore } from "./admin-store";

/**
 * The settings file the shop itself reads.
 *
 * Same payload as the export, minus the customers who left an e-mail waiting
 * for a spool: that is a private list, and publishing it would put it on a
 * public URL. Shared so every tab can offer the same one-click publish.
 */
export function useSiteFile(): () => string {
  const exportJson = useAdminStore((s) => s.exportJson);
  return () => {
    const parsed = JSON.parse(exportJson()) as Record<string, unknown>;
    delete parsed.interest;
    return JSON.stringify(parsed, null, 2);
  };
}
