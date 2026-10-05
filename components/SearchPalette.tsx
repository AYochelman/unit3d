"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { CONTACT } from "@/lib/contact";
import { photoById } from "@/lib/photos";
import { photoSrc } from "@/lib/assets";
import { SHELF_LABEL, SHELVES } from "@/lib/candidates";
import type { ImportedShelf } from "@/lib/imported";
import type { Found } from "@/lib/helpbot-catalog";
import { helpBotNow, loadHelpBot } from "@/lib/helpbot-lazy";

/**
 * The header search, in the "glass" take on "Search Results Modal
 * Interaction" (Dribbble) that the owner picked from three in the design tab.
 *
 * Loaded on demand by QuickSearch: it pulls in the photo index for the
 * thumbnails, which has no business in every page's first load.
 *
 * What is kept from the shot: shelf chips you can remove and add back from a
 * checklist, a row menu, results grouped under headings with the typed words
 * marked, a short skeleton while results settle, and the keyboard legend.
 * What is not: the "1,210 Sales" pills. We have no sales numbers, so the pill
 * carries the price, and the shelf rows carry how many models really sit there.
 */
const GLASS = {
    "--p-bg": "rgba(8,26,17,.9)", "--p-panel": "rgba(255,255,255,.04)", "--p-line": "rgba(255,255,255,.08)",
    "--p-fg": "#f7faf8", "--p-sub": "#a8b8ae", "--p-chip": "rgba(255,255,255,.06)", "--p-hover": "rgba(255,255,255,.07)",
    "--p-mark": "rgba(95,227,154,.28)", "--p-accent": "#5fe39a", "--p-ring": "rgba(95,227,154,.6)",
    "--p-shadow": "0 0 0 1px rgba(95,227,154,.15), 0 30px 80px -20px rgba(8,154,71,.35)",
    "--p-backdrop": "rgba(4,17,11,.86)", "--p-radius": "22px",
  } as CSSProperties;

const ACTIONS: { label: string; href: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { label: "מעצב אישי: טקסט, צורה וצבע", href: "/configurator", icon: "sparkles" },
  { label: "יש לי קובץ להדפסה", href: "/upload", icon: "upload" },
  { label: "מעקב אחרי הזמנה", href: "/tracking", icon: "truck" },
  { label: "דברו איתנו", href: "/contact", icon: "whatsapp" },
];

const SHELF_ROUTE: Record<ImportedShelf, string> = {
  flexi: "/fidgets", fidget: "/fidgets", statues: "/statues", screen: "/screen", pets: "/pets",
  home: "/home", office: "/office", smoke: "/smoke", trendy: "/trendy", b2b: "/b2b",
};

/** What this browser opened from the palette, newest first. Gone on reload. */
const useRecent = create<{ list: Found[]; add: (f: Found) => void; remove: (id: string) => void }>((set) => ({
  list: [],
  add: (f) => set((s) => ({ list: [f, ...s.list.filter((x) => x.id !== f.id)].slice(0, 4) })),
  remove: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}));

type Row =
  | { kind: "product"; f: Found }
  | { kind: "action"; label: string; href: string; icon: Parameters<typeof Icon>[0]["name"] }
  | { kind: "shelf"; shelf: ImportedShelf; count: number };

/** Mark the typed words inside a name. Plain substring, so "דרק" marks "דרקון". */
function Marked({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? <mark key={i} className="rounded px-0.5 text-inherit" style={{ background: "var(--p-mark)" }}>{part}</mark> : part,
      )}
    </>
  );
}

/** photoById scans the whole import list; a result list asks for the same ids on every keystroke. */
const thumbs = new Map<string, ReturnType<typeof photoById>>();
const thumbOf = (id: string) => {
  if (!thumbs.has(id)) thumbs.set(id, photoById(id));
  return thumbs.get(id);
};

function Thumb({ id, icon }: { id?: string; icon?: Parameters<typeof Icon>[0]["name"] }) {
  const photo = id ? thumbOf(id) : undefined;
  return (
    <span className="h-8 w-8 shrink-0 rounded-full overflow-hidden grid place-items-center border" style={{ borderColor: "var(--p-line)", background: "var(--p-panel)" }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoSrc(photo.src)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <Icon name={icon ?? "cube"} size={15} style={{ color: "var(--p-accent)" }} />
      )}
    </span>
  );
}

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const [menu, setMenu] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [shelves, setShelves] = useState<ImportedShelf[]>([]);
  const recent = useRecent((s) => s.list);
  const addRecent = useRecent((s) => s.add);
  const removeRecent = useRecent((s) => s.remove);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(() => helpBotNow() !== null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (ready) return;
    let alive = true;
    void loadHelpBot().then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [ready]);
  // Nothing moves behind the window while it is open. A playing video under
  // a translucent card has to be re-composited every frame, and that is what
  // made typing lag. Whatever was playing resumes on close.
  useEffect(() => {
    const playing = [...document.querySelectorAll("video")].filter((v) => !v.paused);
    playing.forEach((v) => v.pause());
    // Same for the CSS loops behind it (the shelf marquee, the orbit buttons):
    // only the animations actually running, through the Web Animations API.
    // A class on <html> did the same by restyling all ~2,000 elements of the
    // page on open and again on close, which was half a second on a slow CPU.
    const running = document.getAnimations().filter((a) => a.playState === "running");
    running.forEach((a) => a.pause());
    return () => {
      running.forEach((a) => { try { a.play(); } catch { /* element gone */ } });
      playing.forEach((v) => void v.play().catch(() => {}));
    };
  }, []);

  const cat = ready ? helpBotNow()?.catalog : undefined;
  // The field updates on every key; the result list follows a beat behind
  // when it has to, instead of holding the key back.
  const dq = useDeferredValue(q);
  const typed = q.trim().length >= 2;
  const dTyped = dq.trim().length >= 2;

  const groups = useMemo(() => {
    if (!cat || !dTyped) return [];
    const found = cat.findProducts(dq, 40).filter((f) => !shelves.length || shelves.includes(f.shelf));
    const by = new Map<ImportedShelf, Found[]>();
    for (const f of found) by.set(f.shelf, [...(by.get(f.shelf) ?? []), f]);
    return [...by.entries()].map(([shelf, list]) => ({ shelf, list: list.slice(0, 4), more: list.length > 4 }));
  }, [cat, dq, dTyped, shelves]);

  const idle: { title: string; rows: Row[] }[] = useMemo(() => {
    const out: { title: string; rows: Row[] }[] = [];
    if (recent.length) out.push({ title: "נפתחו לאחרונה", rows: recent.map((f) => ({ kind: "product", f })) });
    out.push({ title: "פעולות מהירות", rows: ACTIONS.map((a) => ({ kind: "action", ...a })) });
    if (cat) {
      const list = (shelves.length ? shelves : (["fidget", "statues", "home", "pets"] as ImportedShelf[]))
        .map((s) => ({ kind: "shelf" as const, shelf: s, count: cat.shelfCount(s) }))
        .filter((r) => r.count > 0);
      if (list.length) out.push({ title: "מדפים", rows: list });
    }
    return out;
  }, [recent, cat, shelves]);

  const sections: { title: string; rows: Row[]; shelf?: ImportedShelf; more?: boolean }[] = typed && dTyped
    ? groups.map((g) => ({ title: SHELF_LABEL[g.shelf], shelf: g.shelf, more: g.more, rows: g.list.map((f) => ({ kind: "product" as const, f })) }))
    : idle;
  const flat = sections.flatMap((s) => s.rows);
  // A skeleton only while the catalogue itself is still on its way.
  const loading = typed && !cat;

  const type = (v: string) => {
    setQ(v);
    setAt(0);
    setMenu(null);
  };

  const hrefOf = (r: Row) => (r.kind === "product" ? r.f.href : r.kind === "action" ? r.href : SHELF_ROUTE[r.shelf]);
  const keyOf = (r: Row) => (r.kind === "product" ? r.f.id : r.kind === "action" ? r.href : `shelf-${r.shelf}`);

  const open = (r: Row) => {
    if (r.kind === "product") {
      addRecent(r.f);
    }
    onClose();
    router.push(hrefOf(r));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (menu || picker) { setMenu(null); setPicker(false); } else onClose();
      return;
    }
    if (!flat.length || loading) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => (i + 1) % flat.length); setMenu(null); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => (i - 1 + flat.length) % flat.length); setMenu(null); }
    else if (e.key === "Enter") { e.preventDefault(); open(flat[Math.min(at, flat.length - 1)]); }
  };

  const toggleShelf = (s: ImportedShelf) => {
    setShelves((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
    setAt(0);
  };

  const copy = async (f: Found) => {
    try {
      await navigator.clipboard.writeText(new URL(f.href, window.location.origin).toString());
      setCopied(f.id);
      window.setTimeout(() => setCopied(null), 1400);
    } catch { /* clipboard blocked: the menu just closes */ }
    setMenu(null);
  };

  let n = -1;
  // Portalled to <body>, out of the header's stacking context. No
  // backdrop-filter anywhere: a blur over the page cost a third of a second
  // per key on the home page. The "glass" is a translucent fill over a
  // near-opaque dim, a light edge and the green glow, which read the same.
  return createPortal(
    <div className="sp-root fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="חיפוש באתר" style={GLASS} onKeyDown={onKeyDown}>
      <button type="button" aria-label="סגור חיפוש" onClick={onClose} className="absolute inset-0" style={{ background: "var(--p-backdrop)" }} />
      <div className="sp-in relative mx-auto mt-[8vh] w-[min(94vw,640px)] grid gap-2">
        {/* Search field: its own card, as in the shot */}
        <div
          className="flex items-center gap-3 px-4 h-14 border-2 transition-colors"
          style={{ background: "var(--p-bg)", borderColor: "var(--p-ring)", borderRadius: "var(--p-radius)", boxShadow: "var(--p-shadow)", color: "var(--p-fg)" }}
        >
          {loading ? (
            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--p-accent)", borderTopColor: "transparent" }} />
          ) : (
            <Icon name="search" size={18} className="shrink-0" style={{ color: "var(--p-sub)" }} />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => type(e.target.value)}
            aria-label="מה מחפשים?"
            placeholder={cat ? `חיפוש בין ${cat.catalogueSize()} דגמים…` : "חיפוש…"}
            className="flex-1 min-w-0 bg-transparent outline-none text-[16px] placeholder:opacity-60"
            style={{ color: "var(--p-fg)" }}
          />
          {q ? (
            <button type="button" onClick={() => { type(""); inputRef.current?.focus(); }} aria-label="נקה" className="h-7 w-7 grid place-items-center rounded-full" style={{ color: "var(--p-sub)" }}>
              <Icon name="x" size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md border" style={{ borderColor: "var(--p-line)", color: "var(--p-sub)" }} dir="ltr">/</kbd>
          )}
        </div>

        {/* Results card */}
        <div
          className="overflow-hidden border"
          style={{ background: "var(--p-bg)", borderColor: "var(--p-line)", borderRadius: "var(--p-radius)", boxShadow: "var(--p-shadow)", color: "var(--p-fg)" }}
        >
          <div className="px-4 pt-3 pb-2 relative">
            <div className="text-[11px] font-semibold mb-2" style={{ color: "var(--p-sub)" }}>מחפשים ב</div>
            <div className="flex flex-wrap gap-1.5">
              {!shelves.length && (
                <span className="text-xs px-2.5 h-7 inline-flex items-center rounded-full border" style={{ borderColor: "var(--p-line)", background: "var(--p-chip)" }}>כל המדפים</span>
              )}
              {shelves.map((s) => (
                <span key={s} className="sp-chip text-xs ps-2.5 pe-1 h-7 inline-flex items-center gap-1 rounded-full border" style={{ borderColor: "var(--p-line)", background: "var(--p-chip)" }}>
                  {SHELF_LABEL[s]}
                  <button type="button" onClick={() => toggleShelf(s)} aria-label={`הסר ${SHELF_LABEL[s]}`} className="h-6 w-6 grid place-items-center rounded-full hover:opacity-70">
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => { setPicker((v) => !v); setMenu(null); }}
                aria-expanded={picker}
                className="text-xs px-2.5 h-7 inline-flex items-center gap-1 rounded-full border transition-colors"
                style={{ borderColor: picker ? "var(--p-accent)" : "var(--p-line)", color: picker ? "var(--p-accent)" : undefined }}
              >
                <Icon name="plus" size={11} /> הוסף מדף
              </button>
            </div>
            {picker && (
              <div className="sp-pop absolute z-10 mt-1.5 start-4 w-56 p-1.5 border rounded-xl" style={{ background: "#0d2117", borderColor: "var(--p-line)", boxShadow: "var(--p-shadow)" }}>
                <div className="text-[11px] font-semibold px-2 py-1.5" style={{ color: "var(--p-sub)" }}>לחפש רק ב…</div>
                {SHELVES.filter((s) => s !== "trendy").map((s) => {
                  const on = shelves.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleShelf(s)} className="w-full flex items-center gap-2 px-2 h-8 rounded-lg text-sm text-right hover:[background:var(--p-hover)]">
                      <span className="h-4 w-4 rounded border grid place-items-center" style={{ borderColor: on ? "var(--p-accent)" : "var(--p-line)", background: on ? "var(--p-accent)" : "transparent", color: "#04110b" }}>
                        {on && <Icon name="check" size={11} />}
                      </span>
                      <span className="flex-1">{SHELF_LABEL[s]}</span>
                      {cat && <span className="font-mono text-[11px]" style={{ color: "var(--p-sub)" }}>{cat.shelfCount(s)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-[min(52vh,460px)] overflow-y-auto overscroll-contain pb-1 [contain:strict]" onClick={() => setPicker(false)}>
            {loading &&
              [0, 1].map((g) => (
                <div key={g} className="px-4 py-2">
                  <div className="h-2.5 w-20 rounded-full mb-3 sp-shim" style={{ background: "var(--p-line)" }} />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <span className="h-8 w-8 rounded-full sp-shim" style={{ background: "var(--p-line)" }} />
                      <span className="h-2.5 rounded-full sp-shim" style={{ background: "var(--p-line)", width: `${55 - i * 10}%` }} />
                    </div>
                  ))}
                </div>
              ))}

            {!loading && typed && dTyped && !groups.length && (
              <p className="px-6 py-8 text-center text-sm leading-relaxed" style={{ color: "var(--p-sub)" }}>
                לא מצאתי כלום על <span style={{ color: "var(--p-fg)" }}>״{q}״</span>{shelves.length ? " במדפים שבחרת" : ""}.
                <br />
                אפשר מילה אחרת, או לשאול בוואטסאפ.
              </p>
            )}

            {!loading &&
              sections.map((s) => (
                <div key={s.title} className={typed ? "px-2 pt-2" : "sp-group px-2 pt-2"}>
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[11px] font-semibold" style={{ color: "var(--p-sub)" }}>{s.title}</span>
                    {s.shelf && s.more && (
                      <button type="button" onClick={() => { onClose(); router.push(SHELF_ROUTE[s.shelf!]); }} className="text-[11px] font-semibold" style={{ color: "var(--p-accent)" }}>
                        כל המדף ←
                      </button>
                    )}
                  </div>
                  {s.rows.map((r) => {
                    n += 1;
                    const i = n;
                    const key = keyOf(r);
                    const active = i === at;
                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setAt(i)}
                        className="relative flex items-center gap-3 px-2 h-12 rounded-xl transition-colors"
                        style={{ background: active ? "var(--p-hover)" : undefined }}
                        aria-current={active ? "true" : undefined}
                      >
                        <button type="button" onClick={() => open(r)} className="flex-1 min-w-0 flex items-center gap-3 text-right h-full">
                          <Thumb id={r.kind === "product" ? r.f.id : undefined} icon={r.kind === "action" ? r.icon : r.kind === "shelf" ? "package" : undefined} />
                          <span className="flex-1 min-w-0 truncate text-sm font-medium">
                            {r.kind === "product" ? <Marked text={r.f.name} q={dq} /> : r.kind === "action" ? r.label : `מדף ${SHELF_LABEL[r.shelf]}`}
                          </span>
                          {r.kind === "product" && (
                            <span className="shrink-0 font-mono text-[11px] px-2 h-6 inline-flex items-center rounded-full border" style={{ borderColor: "var(--p-line)", color: copied === r.f.id ? "var(--p-accent)" : "var(--p-sub)" }}>
                              {copied === r.f.id ? "הקישור הועתק" : <bdi dir="ltr">{fmtILS(r.f.price)}</bdi>}
                            </span>
                          )}
                          {r.kind === "shelf" && (
                            <span className="shrink-0 text-[11px] px-2 h-6 inline-flex items-center rounded-full border" style={{ borderColor: "var(--p-line)", color: "var(--p-sub)" }}>
                              <bdi dir="ltr" className="font-mono">{r.count}</bdi>&nbsp;דגמים
                            </span>
                          )}
                          {r.kind === "action" && <Icon name="arrowLeft" size={14} style={{ color: "var(--p-sub)" }} />}
                        </button>
                        {r.kind === "product" && (
                          <button
                            type="button"
                            onClick={() => { setMenu(menu === key ? null : key); setPicker(false); }}
                            aria-label="עוד אפשרויות"
                            aria-expanded={menu === key}
                            className="h-8 w-8 shrink-0 grid place-items-center rounded-lg"
                            style={{ color: "var(--p-sub)", background: menu === key ? "var(--p-panel)" : undefined }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><circle cx="7" cy="2.5" r="1.3" fill="currentColor" /><circle cx="7" cy="7" r="1.3" fill="currentColor" /><circle cx="7" cy="11.5" r="1.3" fill="currentColor" /></svg>
                          </button>
                        )}
                        {r.kind === "product" && menu === key && (
                          <div className="sp-pop absolute z-10 top-11 left-2 w-48 p-1.5 border rounded-xl" style={{ background: "#0d2117", borderColor: "var(--p-line)", boxShadow: "var(--p-shadow)" }}>
                            {[
                              { label: "העתקת קישור", icon: "file" as const, run: () => void copy(r.f) },
                              { label: "לעמוד המוצר", icon: "arrowLeft" as const, run: () => open(r) },
                              { label: "לשאול עליו בוואטסאפ", icon: "whatsapp" as const, run: () => window.open(`${CONTACT.whatsapp}?text=${encodeURIComponent(`היי, לגבי ${r.f.name}`)}`, "_blank", "noopener") },
                              ...(recent.some((x) => x.id === r.f.id) && !typed
                                ? [{ label: "להסיר מהאחרונים", icon: "x" as const, run: () => { removeRecent(r.f.id); setMenu(null); } }]
                                : []),
                            ].map((m) => (
                              <button key={m.label} type="button" onClick={m.run} className="w-full flex items-center gap-2 px-2 h-8 rounded-lg text-sm text-right hover:[background:var(--p-hover)]">
                                <Icon name={m.icon} size={13} style={{ color: "var(--p-sub)" }} />
                                {m.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>

          <div className="hidden sm:flex items-center gap-4 px-4 h-10 border-t text-[11px]" style={{ borderColor: "var(--p-line)", color: "var(--p-sub)", background: "var(--p-panel)" }}>
            {[["↑↓", "מעבר"], ["↵", "פתיחה"], ["Esc", "סגירה"]].map(([k, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--p-line)", background: "var(--p-chip)" }} dir="ltr">{k}</kbd>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
