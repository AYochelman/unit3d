import Link from "next/link";
import Logo from "./ui/Logo";
import Icon from "./ui/Icon";

const SHOP = [
  { href: "/trendy", label: "טרנדי כרגע" },
  { href: "/catalog", label: "סמלי יחידה" },
  { href: "/fidgets", label: "פידג'טים" },
  { href: "/pets", label: "תגים לחיות" },
  { href: "/home-office", label: "לבית ולמשרד" },
  { href: "/configurator", label: "מעצב אישי" },
  { href: "/upload", label: "העלאת קובץ" },
  { href: "/b2b", label: "B2B" },
];

const SUPPORT = [
  { href: "/tracking", label: "מעקב הזמנה" },
  { href: "/livestream", label: "מדפסת בלייב" },
  { href: "/reviews", label: "ביקורות" },
  { href: "/gallery", label: "גלריה" },
  { href: "/faq", label: "שאלות נפוצות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/admin", label: "ניהול (מנהל)" },
];

const QUICK = [
  { label: "זמן הדפסה", value: "3-5 ימי עסקים" },
  { label: "משלוח", value: "₪25 רגיל · ₪45 שליח" },
  { label: "אחריות", value: "30 ימים על שבר" },
  { label: "חינם", value: "במשלוח מעל ₪200" },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-800 mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          <div className="col-span-2">
            <Logo size={40} />
            <p className="mt-4 text-ink-300 text-sm leading-relaxed max-w-xs">
              סטודיו הדפסת תלת מימד אחד-על-אחד. סמלי יחידה, פידג&apos;טים, מתנות
              לחברות וכל קובץ STL — מפתח תקווה לכל הארץ.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://wa.me/972500000000"
                aria-label="וואטסאפ"
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700 text-ink-300 hover:text-good hover:border-good transition-colors"
              >
                <Icon name="whatsapp" size={18} />
              </a>
              <a
                href="https://instagram.com/unit3d.print"
                aria-label="אינסטגרם"
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700 text-ink-300 hover:text-flame hover:border-flame transition-colors"
              >
                <Icon name="instagram" size={18} />
              </a>
              <a
                href="https://tiktok.com/@unit3d.print"
                aria-label="טיקטוק"
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700 text-ink-300 hover:text-flame hover:border-flame transition-colors"
              >
                <Icon name="tiktok" size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-sm">
              {SHOP.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="text-ink-200 hover:text-flame transition-colors"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              SUPPORT
            </h4>
            <ul className="space-y-2.5 text-sm">
              {SUPPORT.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="text-ink-200 hover:text-flame transition-colors"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              FAQ · QUICK
            </h4>
            <ul className="space-y-2.5 text-sm">
              {QUICK.map((q) => (
                <li key={q.label} className="text-ink-200">
                  <div className="text-[11px] text-ink-400 font-mono uppercase tracking-wider">
                    {q.label}
                  </div>
                  <div>{q.value}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-mono text-[11px] tracking-wider text-ink-400" dir="ltr">
            © 2026 Unit3D · MADE IN PETACH TIKVA · NOZZLE 0.4mm · v2.3
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-ink-400" dir="ltr">
            <span className="w-1.5 h-1.5 rounded-full bg-good live-dot" />
            <span>PRINTER ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
