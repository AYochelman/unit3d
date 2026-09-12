"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./ui/Logo";
import Icon from "./ui/Icon";
import Btn from "./ui/Btn";
import ThemeToggle from "./ThemeToggle";
import QuickSearch from "./QuickSearch";
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
  { href: "/smoke", label: "מוצרי עישון" },
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
  const [scrolled, setScrolled] = useState(false);
  const cartCount = useOrderStore((s) => s.items.length);

  /**
   * The bar earns its edge once the page has moved under it.
   *
   * At the top it sits on the hero with almost no seam; past that it needs to
   * separate itself from the content scrolling beneath. Read from a passive
   * listener, and rounded to a boolean so React re-renders twice per page, not
   * on every frame of the scroll.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 h-16 backdrop-blur-md border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "bg-ink-950/92 border-ink-800 shadow-[0_1px_0_0_rgba(8,154,71,0.18)]"
            : "bg-ink-950/70 border-transparent",
        )}
      >
        {/* A narrow phone has room for the logo and four controls and nothing
            to spare, so the gutter tightens rather than pushing the last
            button off the edge and making the whole page scroll sideways. */}
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 md:px-10 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center" aria-label="Unit 3D · דף הבית">
            <Logo size={30} />
          </Link>

          {/* Eleven links, four of them two words long. Without nowrap the row
              wraps "מוצרי עישון" onto two lines and the whole bar grows; the
              hairline between items keeps them apart at this tighter spacing. */}
          <nav className="hidden lg:flex items-center text-[13px] xl:text-sm">
            {NAV.map((item, i) => (
              <span key={item.href} className="flex items-center">
                {i > 0 && <span aria-hidden className="h-3 w-px bg-good/35" />}
                <Link
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap px-1.5 xl:px-2.5 py-2 rounded-md font-medium transition-colors",
                    // The active item is marked twice — tint AND a rule beneath
                    // it — so it does not depend on colour alone.
                    "relative after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-flame",
                    "after:origin-center after:transition-transform after:duration-300 motion-reduce:after:transition-none",
                    isActive(item.href)
                      ? "text-flame bg-flame/5 after:scale-x-100"
                      : "text-ink-300 hover:text-ink-50 after:scale-x-0 hover:after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search sits before the settings and the cart: on a catalogue of
                this size it is the most-wanted control in the bar. */}
            <QuickSearch />
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
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-flame-600 text-white text-[10px] font-black flex items-center justify-center leading-none"
                  dir="ltr"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Between lg and xl the eleven nav links, four icon buttons and
                this CTA do not fit on one row — that is what was squeezing the
                label onto two lines. At those widths the nav itself carries
                "מעצב", which goes to the same place, so the button steps out
                rather than being crushed. */}
            <Btn
              as="a"
              href="/configurator"
              size="md"
              className="hidden md:inline-flex lg:hidden xl:inline-flex"
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
