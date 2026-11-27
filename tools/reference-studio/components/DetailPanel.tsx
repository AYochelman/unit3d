"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio, allTags } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { PURPOSES, PURPOSE_LABELS } from "@/lib/types";
import type { Purpose, Reference } from "@/lib/types";
import { Icon, Spinner, TagInput, ListInput } from "./ui";
import { AnalysisEditor } from "./AnalysisEditor";
import { OutputsPanel } from "./OutputsPanel";

type Tab = "overview" | "analysis" | "outputs";

export function DetailPanel({ reference }: { reference: Reference }) {
  const [tab, setTab] = useState<Tab>("overview");
  const select = useStudio((s) => s.select);
  const settings = useStudio((s) => s.settings);
  const t = translator(settings?.uiLanguage ?? "en");
  const panel = useRef<HTMLElement>(null);

  // Reset during render when the reference changes; the scroll is a DOM side
  // effect and stays in an effect where it belongs.
  const [seenId, setSeenId] = useState(reference.id);
  if (seenId !== reference.id) { setSeenId(reference.id); setTab("overview"); }
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); }, [reference.id]);

  const tabs: [Tab, string][] = [["overview", t("overview")], ["analysis", t("analysis")], ["outputs", t("outputs")]];

  return (
    <aside ref={panel}
      className="flex h-full min-h-0 flex-col overflow-y-auto border-s bg-surface"
      style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}
      aria-label="Reference details">
      <div className="sticky top-0 z-10 border-b bg-surface/95 backdrop-blur"
        style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
        <div className="flex items-start gap-2 px-4 pb-2 pt-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" dir="auto" title={reference.title}>
            {reference.title || "Untitled"}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => select(null)} aria-label={t("close")}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex gap-1 px-3 pb-2" role="tablist">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={tab === key
                ? { background: "rgb(var(--accent) / 0.14)", color: "rgb(var(--accent))" }
                : { color: "rgb(var(--muted))" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {tab === "overview" && <Overview reference={reference} />}
        {tab === "analysis" && <AnalysisEditor reference={reference} />}
        {tab === "outputs" && <OutputsPanel reference={reference} />}
      </div>
    </aside>
  );
}

function Overview({ reference }: { reference: Reference }) {
  const patch = useStudio((s) => s.patchRef);
  const remove = useStudio((s) => s.deleteRef);
  const capture = useStudio((s) => s.captureRef);
  const uploadAssets = useStudio((s) => s.uploadAssets);
  const removeAsset = useStudio((s) => s.removeAsset);
  const openLightbox = useStudio((s) => s.openLightbox);
  const collections = useStudio((s) => s.collections);
  // Select the raw list and derive from it. A selector that builds a new array
  // every call makes zustand think the store changed on every render.
  const references = useStudio((s) => s.references);
  const tags = useMemo(() => allTags(references), [references]);
  const busy = useStudio((s) => s.busy[reference.id]);
  const health = useStudio((s) => s.health);
  const settings = useStudio((s) => s.settings);
  const t = translator(settings?.uiLanguage ?? "en");
  const lang = settings?.uiLanguage ?? "en";

  const [title, setTitle] = useState(reference.title);
  const [note, setNote] = useState(reference.note);
  const manualInput = useRef<HTMLInputElement>(null);

  // Same render-time adjustment: the server's copy wins whenever it differs
  // from what these two fields were last given.
  const [seen, setSeen] = useState({ title: reference.title, note: reference.note });
  if (seen.title !== reference.title || seen.note !== reference.note) {
    setSeen({ title: reference.title, note: reference.note });
    setTitle(reference.title);
    setNote(reference.note);
  }

  const togglePurpose = (p: Purpose) => {
    const next = reference.purposes.includes(p) ? reference.purposes.filter((x) => x !== p) : [...reference.purposes, p];
    void patch(reference.id, { purposes: next });
  };

  return (
    <div className="space-y-4">
      {/* ---- images ---- */}
      <div className="grid grid-cols-2 gap-2">
        {reference.assets.map((asset, i) => (
          <figure key={asset.id} className="group relative overflow-hidden rounded-lg border checker"
            style={{ background: "rgb(var(--raised))" }}>
            <button type="button" onClick={() => openLightbox(reference.id, i)} className="block w-full"
              aria-label={`Open ${asset.label ?? asset.role} full size`}>
              {asset.role === "motion" ? (
                <video src={`/api/files/${asset.file}`} muted loop playsInline preload="metadata"
                  aria-label={asset.label ?? asset.role}
                  onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  className="aspect-[4/3] w-full object-cover object-top" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local file route
                <img src={`/api/files/${asset.file}`} alt={asset.label ?? asset.role} loading="lazy"
                  className="aspect-[4/3] w-full object-cover object-top" />
              )}
            </button>
            <figcaption className="flex items-center gap-1 px-2 py-1 text-[10px] text-faint">
              <span className="truncate">{asset.label ?? asset.role}</span>
              <span className="ltr ms-auto shrink-0">
                {asset.width && asset.height
                  ? `${asset.width}×${asset.height}`
                  : `${Math.max(1, Math.round(asset.bytes / 1024))} KB`}
              </span>
            </figcaption>
            <button type="button" onClick={() => void removeAsset(reference.id, asset.id)}
              className="absolute rounded-full p-1 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              style={{ insetBlockStart: 6, insetInlineEnd: 6, background: "rgb(var(--shade) / 0.6)" }}
              aria-label={`Remove ${asset.label ?? asset.role}`}>
              <Icon name="close" className="h-3 w-3" />
            </button>
          </figure>
        ))}
        {!reference.assets.length && (
          <div className="col-span-2 rounded-lg border border-dashed p-6 text-center text-xs text-faint">
            No image yet.
          </div>
        )}
      </div>

      {/* ---- source ---- */}
      {reference.source && (
        <div className="panel p-3">
          <div className="mb-2 flex items-start gap-2">
            <Icon name="link" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
            <a href={reference.source.url} target="_blank" rel="noreferrer noopener"
              className="ltr min-w-0 flex-1 break-all text-xs hover:underline" style={{ color: "rgb(var(--accent))" }}>
              {reference.source.url}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
            <span className="chip">
              {reference.source.status === "captured" ? "captured"
                : reference.source.status === "failed" ? "capture failed"
                : reference.source.status === "manual" ? "manual screenshot"
                : "not captured yet"}
            </span>
            {reference.source.capturedAt && <span className="ltr">{new Date(reference.source.capturedAt).toLocaleString()}</span>}
            {reference.source.httpStatus && <span className="ltr">HTTP {reference.source.httpStatus}</span>}
          </div>

          {reference.source.error && (
            <p className="mt-2 rounded p-2 text-[11px] leading-relaxed"
              style={{ background: "rgb(var(--bad) / 0.1)", color: "rgb(var(--bad))" }} dir="auto">
              {reference.source.error}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" disabled={Boolean(busy) || !health?.capture.available}
              onClick={() => void capture(reference.id)}
              title={!health?.capture.available ? health?.capture.reason ?? "" : undefined}>
              {busy === "capturing" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
              {busy === "capturing" ? t("capturing") : t("recapture")}
            </button>
            <input ref={manualInput} type="file" accept="image/*" multiple className="sr-only"
              onChange={(e) => { void uploadAssets(reference.id, [...(e.target.files ?? [])]); e.target.value = ""; }} />
            <button type="button" className="btn btn-sm" onClick={() => manualInput.current?.click()}>
              <Icon name="image" className="h-3.5 w-3.5" /> {t("uploadManual")}
            </button>
          </div>

          {reference.source.observed && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] text-faint hover:text-muted">
                What was measured on the live page
              </summary>
              <dl className="mt-2 space-y-1 text-[11px]">
                <Measured label="Fonts" value={reference.source.observed.fonts.slice(0, 4).map((f) => f.family).join(", ")} />
                <Measured label="Body" value={`${reference.source.observed.body.fontSize} / ${reference.source.observed.body.lineHeight}`} />
                <Measured label="Container" value={reference.source.observed.containerWidths.map((w) => `${w}px`).join(", ")} />
                <Measured label="Radii" value={reference.source.observed.radii.join(", ")} />
                <Measured label="Motion" value={`${reference.source.observed.motion.transitions} transitions, ${reference.source.observed.motion.animations} animations`} />
                <Measured label="Breakpoints" value={reference.source.observed.breakpoints.join(", ")} />
              </dl>
            </details>
          )}
        </div>
      )}

      {/* ---- fields ---- */}
      <div>
        <label className="label" htmlFor="ref-title">{t("title")}</label>
        <input id="ref-title" className="field" value={title} dir="auto"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== reference.title && void patch(reference.id, { title })} />
      </div>

      <div>
        <label className="label" htmlFor="ref-note">{t("note")}</label>
        <textarea id="ref-note" className="field resize-y" rows={4} value={note} dir="auto" placeholder={t("notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== reference.note && void patch(reference.id, { note })} />
      </div>

      <div>
        <span className="label">{t("purpose")}</span>
        <div className="flex flex-wrap gap-1.5">
          {PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => togglePurpose(p)}
              aria-pressed={reference.purposes.includes(p)}
              className={reference.purposes.includes(p) ? "chip chip-on" : "chip hover:text-ink"}>
              {PURPOSE_LABELS[p][lang]}
            </button>
          ))}
        </div>
      </div>

      <ListInput label={t("use")} value={reference.use} rows={2}
        placeholder="The grid rhythm; the way the hero crops the photo"
        onChange={(v) => void patch(reference.id, { use: v })} />
      <ListInput label={t("avoid")} value={reference.avoid} rows={2}
        placeholder="The neon accent; the scroll-jacking"
        onChange={(v) => void patch(reference.id, { avoid: v })} />

      <div>
        <span className="label">{t("tags")}</span>
        <TagInput value={reference.tags} suggestions={tags.map((t2) => t2.tag)}
          onChange={(v) => void patch(reference.id, { tags: v })} />
      </div>

      {collections.length > 0 && (
        <div>
          <span className="label">{t("collections")}</span>
          <div className="flex flex-wrap gap-1.5">
            {collections.map((c) => {
              const on = reference.collections.includes(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={on}
                  className={on ? "chip chip-on" : "chip hover:text-ink"}
                  onClick={() => void patch(reference.id, {
                    collections: on ? reference.collections.filter((x) => x !== c.id) : [...reference.collections, c.id],
                  })}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t pt-4" style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
        <button type="button" className={reference.favorite ? "btn btn-sm chip-on" : "btn btn-sm"}
          aria-pressed={reference.favorite}
          onClick={() => void patch(reference.id, { favorite: !reference.favorite })}>
          <Icon name="star" className="h-3.5 w-3.5" /> {t("favorite")}
        </button>
        <div className="flex-1" />
        <button type="button" className="btn btn-sm" style={{ color: "rgb(var(--bad))" }}
          onClick={() => { if (window.confirm(`Delete "${reference.title || "this reference"}"? Its images are removed from disk too.`)) void remove(reference.id); }}>
          <Icon name="trash" className="h-3.5 w-3.5" /> {t("delete")}
        </button>
      </div>
    </div>
  );
}

function Measured({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-faint">{label}</dt>
      <dd className="ltr min-w-0 flex-1 break-words text-muted">{value}</dd>
    </div>
  );
}
