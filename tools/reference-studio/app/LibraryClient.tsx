"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio, visibleReferences, allTags } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { PURPOSES, PURPOSE_LABELS } from "@/lib/types";
import type { Purpose } from "@/lib/types";
import { Icon, Empty } from "@/components/ui";
import { RefCard } from "@/components/RefCard";
import { DetailPanel } from "@/components/DetailPanel";
import { Lightbox } from "@/components/Lightbox";
import { AddPanel } from "@/components/AddPanel";

export function LibraryClient() {
  const references = useStudio((s) => s.references);
  const collections = useStudio((s) => s.collections);
  const filters = useStudio((s) => s.filters);
  const setFilters = useStudio((s) => s.setFilters);
  const clearFilters = useStudio((s) => s.clearFilters);
  const selectedId = useStudio((s) => s.selectedId);
  const select = useStudio((s) => s.select);
  const createCollection = useStudio((s) => s.createCollection);
  const deleteCollection = useStudio((s) => s.deleteCollection);
  const addImages = useStudio((s) => s.addImages);
  const settings = useStudio((s) => s.settings);
  const t = translator(settings?.uiLanguage ?? "en");
  const lang = settings?.uiLanguage ?? "en";

  const [adding, setAdding] = useState(false);
  const [dropping, setDropping] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => visibleReferences(references, filters), [references, filters]);
  const tags = useMemo(() => allTags(references), [references]);
  const selected = references.find((r) => r.id === selectedId) ?? null;
  const filtered = filters.query || filters.tags.length || filters.collection || filters.purpose || filters.favorites || filters.kind !== "all" || filters.unanalysed;

  // Keyboard: / focuses search, n opens the add dialog, Esc clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
      if (e.key === "Escape" && !typing) { select(null); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "n") { e.preventDefault(); setAdding(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [select]);

  return (
    <div
      className="flex h-[calc(100vh-7rem)] min-h-0"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDropping(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false); }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault(); setDropping(false);
        void addImages([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")), filters.collection);
      }}
    >
      {/* ---------------- filters rail ---------------- */}
      <nav className="hidden w-56 shrink-0 overflow-y-auto border-e p-4 lg:block"
        style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }} aria-label="Filters">
        <FilterGroup label={t("all")}>
          {([["all", t("all")], ["image", t("images")], ["url", t("websites")]] as const).map(([kind, label]) => (
            <button key={kind} type="button" onClick={() => setFilters({ kind })}
              aria-pressed={filters.kind === kind}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors"
              style={filters.kind === kind ? { background: "rgb(var(--line) / 0.09)" } : { color: "rgb(var(--muted))" }}>
              <Icon name={kind === "url" ? "link" : kind === "image" ? "image" : "grid"} className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setFilters({ favorites: !filters.favorites })}
            aria-pressed={filters.favorites}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors"
            style={filters.favorites ? { background: "rgb(var(--accent) / 0.14)", color: "rgb(var(--accent))" } : { color: "rgb(var(--muted))" }}>
            <Icon name="star" className="h-3.5 w-3.5" /> {t("favorites")}
          </button>
          <button type="button" onClick={() => setFilters({ unanalysed: !filters.unanalysed })}
            aria-pressed={filters.unanalysed}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors"
            style={filters.unanalysed ? { background: "rgb(var(--line) / 0.09)" } : { color: "rgb(var(--muted))" }}>
            <Icon name="alert" className="h-3.5 w-3.5" /> {t("notAnalysed")}
          </button>
        </FilterGroup>

        <FilterGroup label={t("purpose")}>
          <div className="flex flex-wrap gap-1">
            {PURPOSES.map((p) => (
              <button key={p} type="button"
                onClick={() => setFilters({ purpose: filters.purpose === p ? null : (p as Purpose) })}
                aria-pressed={filters.purpose === p}
                className={filters.purpose === p ? "chip chip-on" : "chip hover:text-ink"}>
                {PURPOSE_LABELS[p][lang]}
              </button>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label={t("collections")}
          action={
            <button type="button" className="text-faint hover:text-ink" aria-label={t("newCollection")}
              onClick={() => { const name = window.prompt(t("newCollection")); if (name?.trim()) void createCollection(name.trim()); }}>
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          }>
          {collections.length === 0 && <p className="px-2 text-xs text-faint" dir="auto">{t("none")}</p>}
          {collections.map((c) => (
            <div key={c.id} className="group flex items-center gap-1">
              <button type="button" onClick={() => setFilters({ collection: filters.collection === c.id ? null : c.id })}
                aria-pressed={filters.collection === c.id}
                className="flex-1 truncate rounded-md px-2 py-1.5 text-start text-sm transition-colors"
                dir="auto"
                style={filters.collection === c.id ? { background: "rgb(var(--line) / 0.09)" } : { color: "rgb(var(--muted))" }}>
                {c.name}
              </button>
              <button type="button" className="shrink-0 p-1 text-faint opacity-0 hover:text-bad focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`Delete collection ${c.name}`}
                onClick={() => { if (window.confirm(`Delete the collection "${c.name}"? The references inside it are kept.`)) void deleteCollection(c.id); }}>
                <Icon name="close" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </FilterGroup>

        {tags.length > 0 && (
          <FilterGroup label={t("tags")}>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 24).map(({ tag, count }) => (
                <button key={tag} type="button" dir="auto"
                  onClick={() => setFilters({ tags: filters.tags.includes(tag) ? filters.tags.filter((x) => x !== tag) : [...filters.tags, tag] })}
                  aria-pressed={filters.tags.includes(tag)}
                  className={filters.tags.includes(tag) ? "chip chip-on" : "chip hover:text-ink"}>
                  {tag} <span className="ltr opacity-50">{count}</span>
                </button>
              ))}
            </div>
          </FilterGroup>
        )}
      </nav>

      {/* ---------------- grid ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
          <div className="relative min-w-0 flex-1 max-w-md">
            {/* Positioned with a logical property so it sits on the correct
                side in both an English and a Hebrew interface. */}
            <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-faint" style={{ insetInlineStart: 12 }}>
              <Icon name="search" />
            </span>
            <input ref={searchRef} className="field ps-9" type="search" dir="auto" placeholder={`${t("search")}  ( / )`}
              value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} aria-label={t("search")} />
          </div>
          {filtered && (
            <button type="button" className="btn btn-sm" onClick={clearFilters}>
              <Icon name="close" className="h-3.5 w-3.5" /> {t("clearFilters")}
            </button>
          )}
          <span className="hidden text-xs text-faint sm:block">
            <span className="ltr">{visible.length}</span>
            {visible.length !== references.length && <> / <span className="ltr">{references.length}</span></>}
          </span>
          <div className="flex-1" />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-3.5 w-3.5" /> {t("addReference")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {references.length === 0 ? (
            <Empty title={t("noReferences")} body={t("noReferencesBody")}
              action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                <Icon name="plus" className="h-3.5 w-3.5" /> {t("addReference")}
              </button>} />
          ) : visible.length === 0 ? (
            <Empty title={t("nothingMatches")} body="Loosen a filter, or clear them all and start again."
              action={<button type="button" className="btn btn-sm" onClick={clearFilters}>{t("clearFilters")}</button>} />
          ) : (
            <div className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))" }}>
              {visible.map((ref) => <RefCard key={ref.id} reference={ref} selected={ref.id === selectedId} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- detail ---------------- */}
      {selected && (
        <div className="hidden w-[24rem] shrink-0 md:block xl:w-[28rem]">
          <DetailPanel reference={selected} />
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgb(var(--canvas))" }}>
          <DetailPanel reference={selected} />
        </div>
      )}

      <AddPanel open={adding} onClose={() => setAdding(false)} />
      <Lightbox />

      {dropping && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgb(var(--accent) / 0.1)", border: "2px dashed rgb(var(--accent))" }}>
          <p className="panel flex items-center gap-2 px-5 py-3 text-sm shadow-pop">
            <Icon name="image" /> Drop to add to the library
          </p>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</h2>
        <div className="flex-1" />
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
