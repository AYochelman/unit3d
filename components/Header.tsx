"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./ui/Logo";
import Icon from "./ui/Icon";
import Btn from "./ui/Btn";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/cn";
import { useOrderStore } from "@/lib/order-store";

const NAV = [
  { href: "/", label: "בית" },
  { href: "/trendy", label: "טרנדי" },
  { href: "/catalog", label: "סמלי יחידה" },
  { href: "/fidgets", label: "פידג'טים" },
  { href: "/pets", label: "לחיות" },
  { href: "/statues", label: "פסלים" },
  { href: "/screen", label: "סרטים וסדרות" },
  { href: "/home-office", label: "בית ומשרד" },
  { href: "/configurator", label: "מעצב" },
  { href: "/b2b", label: "עסקים" },
];

const SECONDARY = [
  { href: "/upload", label: "העלאת קובץ" },
  { href: "/shipping", label: "משלוחים" },
  { href: "/livestream", label: "לייב" },
  { href: "/gallery", label: "גלריה" },
  { href: "/reviews", label: "ביקורות" },
  { href: "/tracking", label: "מעקב הזמנה" },
  { href: "/faq", label: "שאלות נפוצות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/admin", label: "ניהול" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cartCount = useOrderStore((s) => s.items.length);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-ink-950/85 backdrop-blur-md border-b border-ink-800">
        <div className="max-w-7xl mx-auto h-full px-6 md:px-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="Unit 3D · דף הבית">
            <Logo size={30} />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md font-medium transition-colors",
                  isActive(item.href)
                    ? "text-flame bg-flame/5"
                    : "text-ink-300 hover:text-ink-50",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              href="/admin"
              aria-label="אזור ניהול"
              title="ניהול"
              className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700/60 text-ink-400 hover:text-ink-100 hover:border-ink-600 transition-colors"
            >
              <Icon name="settings" size={18} />
            </Link>

            {/* Cart badge */}
            <Link
              href="/contact"
              aria-label={`סל קנייה · ${cartCount} פריטים`}
              className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700/60 text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
            >
              <Icon name="package" size={18} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-flame text-white text-[10px] font-black flex items-center justify-center leading-none"
                  dir="ltr"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            <Btn
              as="a"
              href="/configurator"
              size="md"
              className="hidden md:inline-flex"
            >
              התחל להזמין
            </Btn>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="פתח תפריט"
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700/60 text-ink-300"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="סגור תפריט"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute bottom-0 inset-x-0 bg-ink-950 border-t border-ink-800 rounded-t-2xl p-6 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-4 w-10 h-1 rounded-full bg-ink-700" />
            <div className="grid grid-cols-2 gap-2">
              {[...NAV, ...SECONDARY].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium border border-ink-800",
                    isActive(item.href)
                      ? "text-flame border-flame/30 bg-flame/5"
                      : "text-ink-200 hover:bg-ink-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <ThemeToggle />
              <Btn
                as="a"
                href="/configurator"
                size="md"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                התחל להזמין
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
