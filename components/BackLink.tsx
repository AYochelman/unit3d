"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { previousPath } from "@/lib/nav-history";

/** The shelves a product can be opened from, by their name in the menu. */
const SHELVES: Record<string, string> = {
  "/": "דף הבית",
  "/trendy": "טרנדי",
  "/catalog": "לחיילים",
  "/fidgets": "פידג'טים",
  "/pets": "לחיות",
  "/statues": "פסלים",
  "/screen": "סרטים וסדרות",
  "/smoke": "מוצרי עישון",
  "/home": "לבית",
  "/office": "למשרד",
  "/home-office": "בית ומשרד",
  "/b2b": "עסקים",
  "/gallery": "גלריה",
};

const noop = () => () => {};

const backLabel = (name: string) => (name.startsWith("ל") ? `חזרה ${name}` : `חזרה ל${name}`);

/**
 * "Back" that goes where the visitor actually came from.
 *
 * A product sits on several shelves, and the link used to name the product's
 * own category — open the dummy from טרנדי and it offered "חזרה לבית ומשרד".
 * When the previous page was a shelf, this names it and steps back in history,
 * so the shelf comes back with its filters and scroll as they were. Otherwise
 * it is the old link to the product's own shelf.
 */
export default function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  // Read on the client only (the server has no history); null on the server
  // render, so hydration matches and the label swaps in right after.
  const prev = useSyncExternalStore(noop, previousPath, () => null);
  const path = prev ? prev.split("?")[0].replace(/\/$/, "") || "/" : "";
  const from = prev && SHELVES[path] ? { path: prev, name: SHELVES[path] } : null;

  return (
    <Link
      href={from?.path ?? href}
      onClick={(e) => {
        if (from && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-100 transition-colors mb-8 group"
    >
      <Icon name="arrowRight" size={14} className="group-hover:translate-x-0.5 transition-transform" />
      {from ? backLabel(from.name) : label}
    </Link>
  );
}
