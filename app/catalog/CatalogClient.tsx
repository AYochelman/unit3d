"use client";
import { ProximityH1, ProximityH2 } from "@/components/ui/variable-font-cursor-proximity";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import EmblemImage from "@/components/EmblemImage";
import { Input } from "@/components/ui/Field";
import {
  BRANCH_TREE,
  flattenBattalions,
  type BranchNode,
  type Corps,
  type Brigade,
  type Battalion,
} from "@/lib/units-hierarchy";
import { useOrderStore } from "@/lib/order-store";
import UnitOrderScreen, { type UnitPick } from "@/components/UnitOrderScreen";
import { bulkDiscount } from "@/lib/pricing";
import { orderHref } from "@/lib/order-link";
import { CONTACT } from "@/lib/contact";
import { companiesFor, companyWord } from "@/lib/unit-companies";
import { UNIT_FORMS, unitFormItemId } from "@/lib/unitForms";
import { fmtILS } from "@/lib/format";
import { useLivePricer } from "@/lib/live-price";
import { cn } from "@/lib/cn";

type FilterId = "all" | BranchNode["id"];

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "הכל" },
  ...BRANCH_TREE.map((b) => ({ id: b.id, label: b.shortName })),
];

export default function CatalogClient() {
  // The card quotes the cheapest body the emblem comes on, because the customer
  // chooses the body in the modal. One fixed number would be the keychain's, and
  // wrong for the other four.
  const priceOf = useLivePricer();
  const fromPrice = Math.min(
    ...UNIT_FORMS.map((f) =>
      priceOf({ id: unitFormItemId(f.id), price: f.price, grams: f.grams, hours: f.hours, material: f.material }),
    ),
  );
  const [branchFilter, setBranchFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [openBranches, setOpenBranches] = useState<Set<string>>(new Set());
  const [openCorps, setOpenCorps] = useState<Set<string>>(new Set());
  const [openBrigades, setOpenBrigades] = useState<Set<string>>(new Set());
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  const tree = useMemo(() => {
    if (branchFilter === "all") return BRANCH_TREE;
    return BRANCH_TREE.filter((b) => b.id === branchFilter);
  }, [branchFilter]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim();
    return flattenBattalions().filter(({ battalion, brigade }) => {
      return (
        battalion.name.includes(q) ||
        (battalion.nickname?.includes(q) ?? false) ||
        (battalion.number?.includes(q) ?? false) ||
        brigade.name.includes(q)
      );
    });
  }, [query]);

  const toggle = (set: Set<string>, key: string, setter: (v: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  /** Expand the tree to a specific depth: 1=branches, 2=corps, 3=brigades, 4=battalions (full). */
  const expandToDepth = (depth: 1 | 2 | 3 | 4) => {
    if (depth >= 2) {
      setOpenBranches(new Set(BRANCH_TREE.map((b) => b.id)));
    } else {
      setOpenBranches(new Set());
    }
    if (depth >= 3) {
      const allCorps = new Set<string>();
      for (const b of BRANCH_TREE) {
        for (const c of b.corps) allCorps.add(`${b.id}/${c.slug}`);
      }
      setOpenCorps(allCorps);
    } else {
      setOpenCorps(new Set());
    }
    if (depth >= 4) {
      const allBrigs = new Set<string>();
      for (const b of BRANCH_TREE) {
        for (const c of b.corps) {
          for (const br of c.brigades) {
            allBrigs.add(`${b.id}/${c.slug}/${br.slug}`);
          }
        }
      }
      setOpenBrigades(allBrigs);
    } else {
      setOpenBrigades(new Set());
    }
  };

  const expandAll = () => expandToDepth(4);
  const collapseAll = () => expandToDepth(1);

  /** Switch branch filter AND reset open state so view is fresh. */
  const selectBranchFilter = (id: FilterId) => {
    setBranchFilter(id);
    setQuery("");
    if (id === "all") {
      // Show top-level only
      setOpenBranches(new Set());
    } else {
      // Auto-expand the chosen branch so user sees its corps immediately
      setOpenBranches(new Set([id]));
    }
    setOpenCorps(new Set());
    setOpenBrigades(new Set());
    // Scroll to top of catalog content
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Which battalion was tapped. The order is NOT built here: where the emblem
  // goes and how it is finished are the customer's to answer, and the modal asks
  // before anything reaches the contact form.
  const [picked, setPicked] = useState<(UnitPick & { brigadeSlug: string }) | null>(null);

  const addToOrder = (
    battalion: Battalion,
    brigade: Brigade,
    corps: Corps,
    branch: BranchNode,
    company?: string,
  ) => {
    setPicked({
      company,
      slug: battalion.slug,
      title: battalion.nickname ? `${battalion.name} - ${battalion.nickname}` : battalion.name,
      brigade: brigade.name,
      corps: corps.name,
      branch: branch.name,
      brigadeSlug: brigade.slug,
    });
  };

  // Count totals
  const totals = useMemo(() => {
    let corps = 0, brigades = 0, battalions = 0;
    for (const branch of BRANCH_TREE) {
      corps += branch.corps.length;
      for (const c of branch.corps) {
        brigades += c.brigades.length;
        for (const br of c.brigades) battalions += br.battalions.length;
      }
    }
    return { branches: BRANCH_TREE.length, corps, brigades, battalions };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="flame" className="mb-4">
          לחיילים · קטלוג הסמלים
        </Pill>
        <ProximityH1 className="text-4xl md:text-6xl font-black tracking-tightest leading-heading mb-3">
          לחיילים. הסמל שלכם, מודפס בדיוק.
        </ProximityH1>
        <p className="text-ink-300 max-w-2xl mb-4">
          לוחמים, בוגרי קורסים, משפחות — כל סמל זמין במחזיק מפתחות, בפסל
          שולחני, או במידה גדולה לתלייה.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => { setBranchFilter("all"); setQuery(""); expandToDepth(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-ink-800 text-ink-300 border-ink-700 hover:border-flame hover:text-flame transition-colors"
            title="הצג רק את 10 הזרועות/אגפים (סגור הכל)"
          >
            {totals.branches} זרועות/אגפים
          </button>
          <button
            type="button"
            onClick={() => { setBranchFilter("all"); setQuery(""); expandToDepth(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-ink-800 text-ink-300 border-ink-700 hover:border-flame hover:text-flame transition-colors"
            title="פתח את כל הזרועות והצג את החילות"
          >
            {totals.corps} חילות
          </button>
          <button
            type="button"
            onClick={() => { setBranchFilter("all"); setQuery(""); expandToDepth(3); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-ink-800 text-ink-300 border-ink-700 hover:border-flame hover:text-flame transition-colors"
            title="פתח את כל החילות והצג את החטיבות"
          >
            {totals.brigades} חטיבות
          </button>
          <button
            type="button"
            onClick={() => { setBranchFilter("all"); setQuery(""); expandToDepth(4); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-cyan2/10 text-cyan2 border-cyan2/30 hover:border-cyan2 transition-colors"
            title="פתח את כל הסעיפים והצג את כל הגדודים"
          >
            {totals.battalions} גדודים
          </button>
        </div>

        {/* Soldiers' discount — not a number on the page: it is agreed one to
            one, in a private message, so it opens WhatsApp with the ask
            already written. */}
        <a
          href={`${CONTACT.whatsapp}?text=${encodeURIComponent("היי, אני חייל/ת ואשמח לשמוע על ההנחה לחיילים")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 rounded-2xl border-2 border-flame/60 bg-flame/10 hover:bg-flame/15 hover:border-flame transition-colors"
        >
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-flame text-white shrink-0">
            <Icon name="star" size={18} />
          </span>
          <span>
            <span className="block font-black text-ink-50">הנחה מיוחדת לחיילים!</span>
            <span className="block text-sm text-ink-300">שלחו לנו הודעה בפרטי ונסגור לכם מחיר</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-flame font-bold text-sm">
            <Icon name="whatsapp" size={16} />
            לפנייה בוואטסאפ
            <Icon name="arrowLeft" size={14} />
          </span>
        </a>
      </header>

      {/* Sticky toolbar */}
      <div className="sticky top-16 z-20 bg-ink-950/85 backdrop-blur-md py-4 -mx-6 px-6 md:-mx-10 md:px-10 border-b border-ink-800 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBranchFilter(b.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  branchFilter === b.id
                    ? "bg-flame-600 text-white border-flame"
                    : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Input
              aria-label="חיפוש בקטלוג הסמלים"
              placeholder="חפש סמל, גדוד, מספר, שם חיבה…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10 pl-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none">
              <Icon name="search" size={16} />
            </span>
            {query && (
              <button
                type="button"
                aria-label="נקה חיפוש"
                onClick={() => setQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-50 transition-colors"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Btn size="sm" variant="ghost" onClick={expandAll} icon="plus">
              פתח הכל
            </Btn>
            <Btn size="sm" variant="ghost" onClick={collapseAll} icon="minus">
              סגור הכל
            </Btn>
          </div>
        </div>
      </div>

      {/* Unit-not-found banner */}
      <Link
        href="/contact"
        className="block mb-8 p-5 rounded-2xl border border-flame/30 bg-gradient-to-bl from-flame/10 to-cyan2/5 hover:border-flame/50 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-flame/15 text-flame">
            <Icon name="info" size={20} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">לא רואה את היחידה שלך?</div>
            <div className="text-sm text-ink-300">
              תשלח לי תמונה של הסמל בוואטסאפ או בטופס — אכין לך אותו תוך 24 שעות.
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-flame font-semibold text-sm">
            דבר איתי
            <Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </Link>

      {/* Search results view */}
      {searchResults && (
        <div>
          <div className="mb-4 text-sm text-ink-400">
            {searchResults.length === 0
              ? "לא נמצאו תוצאות לחיפוש"
              : `נמצאו ${searchResults.length} גדודים`}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map(({ battalion, brigade, corps, branch }) => (
              <BattalionCard
                key={`${brigade.slug}-${battalion.slug}`}
                battalion={battalion}
                brigade={brigade}
                corps={corps}
                branch={branch}
                fromPrice={fromPrice}
                onAdd={(company) => addToOrder(battalion, brigade, corps, branch, company)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hierarchical tree view */}
      {!searchResults && (
        <div className="space-y-4">
          {tree.map((branch) => {
            const branchOpen = openBranches.has(branch.id);
            return (
              <section
                key={branch.id}
                className="rounded-2xl border border-ink-800 bg-ink-900/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(openBranches, branch.id, setOpenBranches)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-ink-900/80 transition-colors text-right"
                >
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center border border-ink-700"
                    style={{
                      background: `radial-gradient(circle at 50% 40%, hsla(${branch.fallbackHue}, 70%, 50%, 0.25), transparent 70%)`,
                    }}
                  >
                    <EmblemImage
                      slug={`branch-${branch.slug}`}
                      fallbackShape={branch.fallbackShape}
                      fallbackHue={branch.fallbackHue}
                      size={36}
                      label={branch.name}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <ProximityH2 className="text-2xl font-black tracking-tight truncate">
                      {branch.name}
                    </ProximityH2>
                    {branch.desc && (
                      <p className="text-sm text-ink-400 truncate">
                        {branch.desc}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-xs text-ink-500 hidden sm:inline" dir="ltr">
                    {branch.corps.length} חילות
                  </span>
                  <Icon
                    name="chevDown"
                    size={20}
                    className={cn(
                      "text-ink-400 transition-transform",
                      branchOpen && "rotate-180",
                    )}
                  />
                </button>

                {branchOpen && (
                  <div className="px-3 md:px-5 pb-5 space-y-3 border-t border-ink-800/60">
                    {branch.corps.map((corps) => {
                      const corpsKey = `${branch.id}/${corps.slug}`;
                      const corpsOpen = openCorps.has(corpsKey);
                      return (
                        <div
                          key={corpsKey}
                          className="rounded-xl border border-ink-800 bg-ink-950/40 overflow-hidden mt-3"
                        >
                          <button
                            type="button"
                            onClick={() => toggle(openCorps, corpsKey, setOpenCorps)}
                            className="w-full flex items-center gap-3 p-4 hover:bg-ink-900/60 transition-colors text-right"
                          >
                            <EmblemImage
                              slug={`corps-${corps.slug}`}
                              fallbackShape={corps.fallbackShape ?? branch.fallbackShape}
                              fallbackHue={corps.fallbackHue ?? branch.fallbackHue}
                              size={32}
                              label={corps.name}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-ink-50 truncate">
                                {corps.name}
                              </h3>
                              {corps.desc && (
                                <p className="text-xs text-ink-400 truncate">
                                  {corps.desc}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-ink-500 hidden sm:inline" dir="ltr">
                              {corps.brigades.length} חטיבות
                            </span>
                            <Icon
                              name="chevDown"
                              size={18}
                              className={cn(
                                "text-ink-400 transition-transform",
                                corpsOpen && "rotate-180",
                              )}
                            />
                          </button>

                          {corpsOpen && (
                            <div className="px-3 md:px-4 pb-4 space-y-2 border-t border-ink-800/60">
                              {corps.brigades.map((brigade) => {
                                const brigKey = `${branch.id}/${corps.slug}/${brigade.slug}`;
                                const brigOpen = openBrigades.has(brigKey);
                                return (
                                  <div
                                    key={brigKey}
                                    className="rounded-lg border border-ink-800/80 bg-ink-900/60 overflow-hidden mt-2"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggle(openBrigades, brigKey, setOpenBrigades)
                                      }
                                      className="w-full flex items-center gap-3 p-3 hover:bg-ink-800/60 transition-colors text-right"
                                    >
                                      <EmblemImage
                                        slug={`brigade-${brigade.slug}`}
                                        fallbackShape={
                                          brigade.fallbackShape ?? corps.fallbackShape
                                        }
                                        fallbackHue={
                                          brigade.fallbackHue ?? corps.fallbackHue
                                        }
                                        size={40}
                                        label={brigade.name}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-ink-50">
                                            {brigade.name}
                                          </span>
                                          {brigade.number && (
                                            <span
                                              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-300"
                                              dir="ltr"
                                            >
                                              #{brigade.number}
                                            </span>
                                          )}
                                        </div>
                                        {brigade.desc && (
                                          <p className="text-xs text-ink-400 truncate">
                                            {brigade.desc}
                                          </p>
                                        )}
                                      </div>
                                      <span
                                        className="font-mono text-[11px] text-ink-500 hidden sm:inline"
                                        dir="ltr"
                                      >
                                        {brigade.battalions.length} גדודים
                                      </span>
                                      <Icon
                                        name="chevDown"
                                        size={16}
                                        className={cn(
                                          "text-ink-400 transition-transform",
                                          brigOpen && "rotate-180",
                                        )}
                                      />
                                    </button>

                                    {brigOpen && (
                                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-ink-950/50 border-t border-ink-800/60">
                                        {brigade.battalions.map((battalion) => (
                                          <BattalionCard
                                            key={battalion.slug}
                                            battalion={battalion}
                                            brigade={brigade}
                                            corps={corps}
                                            branch={branch}
                                            fromPrice={fromPrice}
                                            onAdd={(company) =>
                                              addToOrder(
                                                battalion,
                                                brigade,
                                                corps,
                                                branch,
                                                company,
                                              )
                                            }
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <UnitOrderScreen
        key={picked ? `${picked.slug}:${picked.company ?? ""}` : "none"}
        unit={picked}
        onClose={() => setPicked(null)}
        onConfirm={({ form, summary, price, qty, company }) => {
          if (!picked) return;
          const order = {
            title: `${picked.title}${company ? ` · ${company}` : ""} · ${form.label}`,
            summary,
            price,
            source: "catalog" as const,
            meta: {
              unitSlug: picked.slug,
              ...(company ? { company } : {}),
              brigadeSlug: picked.brigadeSlug,
              form: form.id,
              qty,
              baseUnitPrice: price == null ? undefined : price / (qty * (1 - bulkDiscount(qty))),
            },
          };
          setOrder(order);
          setPicked(null);
          // The cart is in memory only; the link carries the same order so a
          // refresh on the form does not lose what was just chosen.
          router.push(orderHref("/contact", order));
        }}
      />
    </div>
  );
}

function BattalionCard({
  battalion,
  brigade,
  corps,
  branch,
  fromPrice,
  onAdd,
}: {
  battalion: Battalion;
  brigade: Brigade;
  corps: Corps;
  branch: BranchNode;
  /** Cheapest body the emblem is offered on — the card says "from". */
  fromPrice: number;
  onAdd: (company?: string) => void;
}) {
  const companies = companiesFor(battalion.slug);
  const hue = battalion.fallbackHue ?? brigade.fallbackHue ?? branch.fallbackHue;
  const shape =
    battalion.fallbackShape ?? brigade.fallbackShape ?? branch.fallbackShape;
  return (
    <div className="group rounded-xl bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-0.5 transition-all duration-200 ease-smooth overflow-hidden flex flex-col">
      <div
        className="relative aspect-square stripes overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 40%, hsla(${hue}, 70%, 50%, 0.18), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
        }}
      >
        <EmblemImage
          slug={battalion.slug}
          fallbackShape={shape}
          fallbackHue={hue}
          label={battalion.name}
          paddingRatio={0.08}
        />
        {battalion.number && (
          <span
            className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-950/80 text-ink-200"
            dir="ltr"
          >
            #{battalion.number}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-bold text-ink-50 leading-tight">{battalion.name}</h4>
        {battalion.nickname && (
          <div className="text-xs text-flame mb-1.5">{battalion.nickname}</div>
        )}
        <div className="text-[11px] text-ink-500 mb-3 truncate">
          {brigade.name} · {corps.name}
        </div>
        {/* The level under the battalion. A tap orders the emblem for that
            company — the picker in the order screen opens on it. */}
        {companies.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-ink-500 mb-1">{companyWord(battalion.slug) === "סוללה" ? "סוללות" : "פלוגות"}</div>
            <div className="flex flex-wrap gap-1">
              {companies.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => onAdd(c.label)}
                  className="px-2 py-0.5 rounded-full border border-ink-700 text-[10px] text-ink-300 hover:border-flame hover:text-flame transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="font-mono text-flame text-sm">
            <span className="text-ink-500 text-xs">מ־</span>
            <span dir="ltr">{fmtILS(fromPrice)}</span>
          </span>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => onAdd()}
            iconRight="arrowLeft"
            className="hover:bg-flame-600 hover:border-flame hover:text-white"
          >
            הזמן
          </Btn>
        </div>
      </div>
    </div>
  );
}
