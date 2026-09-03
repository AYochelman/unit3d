"use client";
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
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

const DEFAULT_PRICE = 65;
const DEFAULT_TIME = "2.5h";
const DEFAULT_SIZE = "47×40mm";

// Battalion slugs that have a ready-to-download STL sample at /stl-samples/<slug>.stl
const STL_AVAILABLE = new Set<string>([
  "givati-432-tzabar",
  "givati-435-rotem",
  "kfir-90-nachshon",
  "kfir-92-shimshon",
  "kfir-93-haruv",
  "kfir-94-duchifat",
  "kfir-97-netzah-yehuda",
  "golani-12-barak",
  "golani-13-gideon",
  "golani-51-habokim",
  "nahal-50-haharel",
  "nahal-932-granite",
  "armor-7-75-romach",
  "armor-7-77-oz",
  "nahal-pelsar",
]);

// Battalion slugs with a print-ready Bambu 3MF at /3mf/<slug>.3mf
const THREEMF_AVAILABLE = new Set<string>([
  "nahal-pelsar",
]);

type FilterId = "all" | BranchNode["id"];

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "הכל" },
  ...BRANCH_TREE.map((b) => ({ id: b.id, label: b.shortName })),
];

export default function CatalogClient() {
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

  const addToOrder = (
    battalion: Battalion,
    brigade: Brigade,
    corps: Corps,
    branch: BranchNode,
  ) => {
    const title = battalion.nickname
      ? `${battalion.name} - ${battalion.nickname}`
      : battalion.name;
    setOrder({
      title,
      summary: [
        `סמל יחידה: ${title}`,
        `חטיבה: ${brigade.name}`,
        `חיל: ${corps.name}`,
        `זרוע: ${branch.name}`,
        `גודל: ${DEFAULT_SIZE}`,
        `זמן הדפסה: ${DEFAULT_TIME}`,
      ],
      price: DEFAULT_PRICE,
      source: "catalog",
      meta: { unitSlug: battalion.slug, brigadeSlug: brigade.slug },
    });
    router.push("/contact");
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
          קטלוג סמלי יחידה
        </Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          סמלי יחידה. מודפסים בדיוק.
        </h1>
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
                    ? "bg-flame text-white border-flame"
                    : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Input
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
                onAdd={() => addToOrder(battalion, brigade, corps, branch)}
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
                    <h2 className="text-2xl font-black tracking-tight truncate">
                      {branch.name}
                    </h2>
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
                                            onAdd={() =>
                                              addToOrder(
                                                battalion,
                                                brigade,
                                                corps,
                                                branch,
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
    </div>
  );
}

function BattalionCard({
  battalion,
  brigade,
  corps,
  branch,
  onAdd,
}: {
  battalion: Battalion;
  brigade: Brigade;
  corps: Corps;
  branch: BranchNode;
  onAdd: () => void;
}) {
  const hue = battalion.fallbackHue ?? brigade.fallbackHue ?? branch.fallbackHue;
  const shape =
    battalion.fallbackShape ?? brigade.fallbackShape ?? branch.fallbackShape;
  const hasStl = STL_AVAILABLE.has(battalion.slug);
  const has3mf = THREEMF_AVAILABLE.has(battalion.slug);
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
          className="spin-y"
        />
        {battalion.number && (
          <span
            className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-950/80 text-ink-200"
            dir="ltr"
          >
            #{battalion.number}
          </span>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {hasStl && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan2/20 text-cyan2 border border-cyan2/40">
              STL
            </span>
          )}
          {has3mf && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/40">
              3MF
            </span>
          )}
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-bold text-ink-50 leading-tight">{battalion.name}</h4>
        {battalion.nickname && (
          <div className="text-xs text-flame mb-1.5">{battalion.nickname}</div>
        )}
        <div className="text-[11px] text-ink-500 mb-3 truncate">
          {brigade.name} · {corps.name}
        </div>
        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="font-mono text-flame text-sm" dir="ltr">
            {fmtILS(DEFAULT_PRICE)}
          </span>
          <Btn
            size="sm"
            variant="secondary"
            onClick={onAdd}
            iconRight="arrowLeft"
            className="hover:bg-flame hover:border-flame hover:text-white"
          >
            הזמן
          </Btn>
        </div>
        {hasStl && (
          <a
            href={`/stl-samples/${battalion.slug}.stl`}
            download
            className="mt-2 text-center text-xs font-mono py-1.5 rounded border border-cyan2/30 bg-cyan2/5 text-cyan2 hover:bg-cyan2/15 transition-colors"
          >
            ⬇ הורד STL לדוגמא
          </a>
        )}
        {has3mf && (
          <a
            href={`/3mf/${battalion.slug}.3mf`}
            download
            className="mt-2 text-center text-xs font-mono py-1.5 rounded border border-brand/30 bg-brand/5 text-brand hover:bg-brand/15 transition-colors"
          >
            ⬇ הורד 3MF להדפסה
          </a>
        )}
      </div>
    </div>
  );
}
