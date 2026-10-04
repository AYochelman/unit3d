import Link from "next/link";

// QClay's moving band (4.10): every shelf, drifting past under the hero.
// Two identical copies make the loop seamless; the second is for the eye
// only, so a keyboard or a screen reader meets each shelf once. It stops on
// hover and for anyone who asked their system for less motion.
const SHELVES: { label: string; href: string }[] = [
  { label: "טרנדי כרגע", href: "/trendy" },
  { label: "סמלי יחידות", href: "/catalog" },
  { label: "פידג'טים ופלקסי", href: "/fidgets" },
  { label: "מעצב אישי", href: "/configurator" },
  { label: "פסלים", href: "/statues" },
  { label: "תגים לחיות", href: "/pets" },
  { label: "לבית ולמשרד", href: "/home" },
  { label: "לעסקים", href: "/b2b" },
  { label: "הדפסה מהקובץ שלך", href: "/upload" },
];

function Row({ copy }: { copy: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={copy || undefined}>
      {SHELVES.map((s) => (
        <li key={s.href} className="flex items-center">
          <Link
            href={s.href}
            tabIndex={copy ? -1 : undefined}
            className="px-5 sm:px-8 py-3 sm:py-4 font-[family-name:var(--font-rubik)] font-extrabold text-lg sm:text-2xl md:text-3xl tracking-tight text-ink-500 hover:text-flame-300 transition-colors whitespace-nowrap"
          >
            {s.label}
          </Link>
          <span className="w-2 h-2 rounded-full bg-flame shrink-0" aria-hidden />
        </li>
      ))}
    </ul>
  );
}

export default function ShelfMarquee() {
  return (
    <nav aria-label="כל המדפים" className="relative overflow-hidden border-y border-ink-800 bg-ink-950">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Row copy={false} />
        <Row copy />
      </div>
    </nav>
  );
}
