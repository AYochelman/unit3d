"use client";

import { useState } from "react";
import { useStudio } from "@/lib/store";
import { emptyAnalysis } from "@/lib/analysis";
import type { Analysis, Confidence, Reference } from "@/lib/types";
import { Confidence as ConfidencePill, Icon, Spinner, ListInput } from "./ui";

/**
 * The analysis is editable, every field of it. The model's reading is a first
 * draft: you looked at the reference, it did not, and your correction is the
 * thing that makes the brief yours. Nothing here is generated on the fly - an
 * empty analysis stays empty until a real one is produced.
 */
export function AnalysisEditor({ reference }: { reference: Reference }) {
  const patch = useStudio((s) => s.patchRef);
  const analyze = useStudio((s) => s.analyze);
  const importAnalysis = useStudio((s) => s.importAnalysis);
  const busy = useStudio((s) => s.busy[reference.id]);
  const health = useStudio((s) => s.health);

  const [draft, setDraft] = useState<Analysis>(reference.analysis ?? emptyAnalysis());
  const [dirty, setDirty] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Adjusted during render rather than in an effect (React's documented
  // pattern). Switching reference always resets; a server-side replacement
  // only lands when there are no unsaved edits sitting in front of you.
  const [seen, setSeen] = useState({ id: reference.id, analysis: reference.analysis });
  if (seen.id !== reference.id) {
    setSeen({ id: reference.id, analysis: reference.analysis });
    setDraft(reference.analysis ?? emptyAnalysis());
    setDirty(false);
  } else if (seen.analysis !== reference.analysis && !dirty) {
    setSeen({ id: reference.id, analysis: reference.analysis });
    setDraft(reference.analysis ?? emptyAnalysis());
  }

  const edit = (fn: (a: Analysis) => void) => {
    setDraft((prev) => { const next = structuredClone(prev); fn(next); return next; });
    setDirty(true);
  };
  const save = async () => { await patch(reference.id, { analysis: draft }); setDirty(false); };

  const meta = reference.analysisMeta;
  const canAi = health?.ai.configured ?? false;
  const hasObserved = Boolean(reference.source?.observed);

  return (
    <div className="space-y-4">
      {/* ---- how this analysis was produced ---- */}
      <div className="panel p-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint">Source:</span>
          <strong className="font-medium">
            {meta.source === "ai" ? `AI vision — ${meta.model ?? "model"}`
              : meta.source === "observed" ? "Measured from the live page"
              : meta.source === "imported" ? "Imported JSON"
              : meta.source === "manual" ? "Written by hand"
              : "Not analysed yet"}
          </strong>
          {meta.editedAt && <span className="chip">edited by hand</span>}
          {meta.at && <span className="ltr text-faint">{new Date(meta.at).toLocaleString()}</span>}
        </div>
        {meta.note && <p className="mb-2 text-xs text-muted" dir="auto">{meta.note}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-primary" disabled={!canAi || Boolean(busy) || !reference.assets.length}
            onClick={() => void analyze(reference.id, "ai")}
            title={!canAi ? "No API key configured — use the package route below" : !reference.assets.length ? "This reference has no image to analyse" : undefined}>
            {busy === "analysing" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
            {busy === "analysing" ? "Analysing…" : reference.analysis ? "Re-analyse with AI" : "Analyse with AI"}
          </button>

          {hasObserved && (
            <button type="button" className="btn btn-sm" disabled={Boolean(busy)} onClick={() => void analyze(reference.id, "observed")}
              title="Rebuild from the measurements taken off the live page. No model involved.">
              <Icon name="check" className="h-3.5 w-3.5" /> Rebuild from measurements
            </button>
          )}

          <a className="btn btn-sm" href={`/api/references/${reference.id}/package`} download>
            <Icon name="download" className="h-3.5 w-3.5" /> Export analysis package
          </a>
          <button type="button" className="btn btn-sm" onClick={() => setImportOpen((v) => !v)} aria-expanded={importOpen}>
            <Icon name="copy" className="h-3.5 w-3.5" /> Import analysis JSON
          </button>
        </div>

        {!canAi && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-faint">
            No API key is configured, so <strong>Analyse with AI</strong> is off rather than pretending.
            Export the package, run it in Claude Code, and import the JSON it writes — the result is identical.
          </p>
        )}
      </div>

      {importOpen && <ImportBox referenceId={reference.id} onDone={() => setImportOpen(false)} onImport={importAnalysis} />}

      {/* ---- the editable analysis ---- */}
      <Section title="Direction">
        <Text label="Aesthetic family" value={draft.aestheticFamily} onChange={(v) => edit((a) => { a.aestheticFamily = v; })} />
        <ListInput label="Design vocabulary" value={draft.vocabulary} onChange={(v) => edit((a) => { a.vocabulary = v; })} rows={3} />
        <Text label="What gives it character" value={draft.character} multiline onChange={(v) => edit((a) => { a.character = v; })} />
        <ListInput label="How to adapt it elsewhere" value={draft.adaptation} onChange={(v) => edit((a) => { a.adaptation = v; })} rows={4} />
      </Section>

      <Section title={`Colour (${draft.colors.length})`}>
        <div className="space-y-2">
          {draft.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#000000"} aria-label={`Colour ${i + 1}`}
                onChange={(e) => edit((a) => { a.colors[i].hex = e.target.value; })}
                className="h-8 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0" />
              <input className="field ltr !w-24 shrink-0 font-mono text-xs" value={c.hex}
                onChange={(e) => edit((a) => { a.colors[i].hex = e.target.value; })} aria-label={`Hex ${i + 1}`} />
              <input className="field flex-1 text-xs" value={c.role ?? ""} placeholder="role" dir="auto"
                onChange={(e) => edit((a) => { a.colors[i].role = e.target.value; })} aria-label={`Role ${i + 1}`} />
              <ConfidenceToggle value={c.confidence} onChange={(v) => edit((a) => { a.colors[i].confidence = v; })} />
              <button type="button" className="btn btn-ghost btn-sm shrink-0" aria-label={`Remove colour ${i + 1}`}
                onClick={() => edit((a) => { a.colors.splice(i, 1); })}>
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm"
            onClick={() => edit((a) => { a.colors.push({ hex: "#888888", role: "", confidence: "estimated" }); })}>
            <Icon name="plus" className="h-3.5 w-3.5" /> Add colour
          </button>
          {reference.autoPalette?.length ? (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: "rgb(var(--line) / 0.04)" }}>
              <p className="mb-1.5 text-[11px] text-faint">Counted from the image pixels — click to add:</p>
              <div className="flex flex-wrap gap-1.5">
                {reference.autoPalette.map((c) => (
                  <button key={c.hex} type="button" title={`${c.hex} — ${Math.round((c.share ?? 0) * 100)}% of pixels`}
                    onClick={() => edit((a) => { if (!a.colors.some((x) => x.hex.toLowerCase() === c.hex)) a.colors.push({ hex: c.hex, role: "", confidence: "observed" }); })}
                    className="h-7 w-7 rounded border" style={{ background: c.hex }} aria-label={`Add ${c.hex}`} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          {draft.typography.fonts.map((f, i) => (
            <div key={i} className="rounded-lg border p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <input className="field flex-1 text-sm" value={f.name} placeholder="Font name" dir="auto"
                  onChange={(e) => edit((a) => { a.typography.fonts[i].name = e.target.value; })} aria-label={`Font ${i + 1} name`} />
                <input className="field !w-28 text-xs" value={f.role} placeholder="role" dir="auto"
                  onChange={(e) => edit((a) => { a.typography.fonts[i].role = e.target.value; })} aria-label={`Font ${i + 1} role`} />
                <ConfidenceToggle value={f.confidence} onChange={(v) => edit((a) => { a.typography.fonts[i].confidence = v; })} />
                <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove font ${i + 1}`}
                  onClick={() => edit((a) => { a.typography.fonts.splice(i, 1); })}>
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
              <input className="field text-xs" value={f.evidence ?? ""} dir="auto"
                placeholder={f.confidence === "observed" ? "Required: how is this known? (e.g. read off the live page)" : "Letterform notes — proportions, contrast, terminals"}
                onChange={(e) => edit((a) => { a.typography.fonts[i].evidence = e.target.value; })}
                aria-label={`Font ${i + 1} evidence`} />
              {f.confidence === "observed" && !f.evidence?.trim() && (
                <p className="mt-1 text-[11px]" style={{ color: "rgb(var(--warn))" }}>
                  An observed font needs evidence, or it is recorded as an estimate on save.
                </p>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-sm"
            onClick={() => edit((a) => { a.typography.fonts.push({ name: "", role: "body", confidence: "estimated" }); })}>
            <Icon name="plus" className="h-3.5 w-3.5" /> Add font
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Text label="Scale" value={draft.typography.scale} onChange={(v) => edit((a) => { a.typography.scale = v; })} />
          <Text label="Weights" value={draft.typography.weights} onChange={(v) => edit((a) => { a.typography.weights = v; })} />
          <Text label="Case" value={draft.typography.casing} onChange={(v) => edit((a) => { a.typography.casing = v; })} />
          <Text label="Tracking" value={draft.typography.tracking} onChange={(v) => edit((a) => { a.typography.tracking = v; })} />
        </div>
        <Text label="Hierarchy" value={draft.typography.hierarchy} multiline onChange={(v) => edit((a) => { a.typography.hierarchy = v; })} />
      </Section>

      <Section title="Layout">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Grid" value={draft.layout.grid} onChange={(v) => edit((a) => { a.layout.grid = v; })} />
          <Text label="Spacing" value={draft.layout.spacing} onChange={(v) => edit((a) => { a.layout.spacing = v; })} />
          <Text label="Density" value={draft.layout.density} onChange={(v) => edit((a) => { a.layout.density = v; })} />
          <Text label="Alignment" value={draft.layout.alignment} onChange={(v) => edit((a) => { a.layout.alignment = v; })} />
        </div>
        <Text label="Container width" value={draft.layout.containerWidth} onChange={(v) => edit((a) => { a.layout.containerWidth = v; })} />
      </Section>

      <Section title="Hero">
        <Text label="Composition" value={draft.hero.composition} multiline onChange={(v) => edit((a) => { a.hero.composition = v; })} />
        <Text label="Image treatment" value={draft.hero.imageTreatment} multiline onChange={(v) => edit((a) => { a.hero.imageTreatment = v; })} />
      </Section>

      <Section title={`Components (${draft.components.length})`}>
        <div className="space-y-2">
          {draft.components.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <input className="field !w-40 shrink-0 text-xs" value={c.name} placeholder="Name" dir="auto"
                onChange={(e) => edit((a) => { a.components[i].name = e.target.value; })} aria-label={`Component ${i + 1} name`} />
              <textarea className="field flex-1 resize-y text-xs" rows={2} value={c.description} placeholder="What it looks like" dir="auto"
                onChange={(e) => edit((a) => { a.components[i].description = e.target.value; })} aria-label={`Component ${i + 1} description`} />
              <ConfidenceToggle value={c.confidence} onChange={(v) => edit((a) => { a.components[i].confidence = v; })} />
              <button type="button" className="btn btn-ghost btn-sm shrink-0" aria-label={`Remove component ${i + 1}`}
                onClick={() => edit((a) => { a.components.splice(i, 1); })}>
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm"
            onClick={() => edit((a) => { a.components.push({ name: "", description: "", confidence: "estimated" }); })}>
            <Icon name="plus" className="h-3.5 w-3.5" /> Add component
          </button>
        </div>
      </Section>

      <Section title="Motion">
        <div className="mb-2 flex items-center gap-2">
          <ConfidenceToggle value={draft.motion.confidence} onChange={(v) => edit((a) => { a.motion.confidence = v; })} />
          {draft.motion.confidence === "estimated" && (
            <span className="text-[11px] text-faint">A still image cannot show movement — this stays a suggestion.</span>
          )}
        </div>
        <Text label="" value={draft.motion.notes} multiline onChange={(v) => edit((a) => { a.motion.notes = v; })} />
      </Section>

      <Section title="Observed vs estimated">
        <ListInput label="Observed — things actually visible" value={draft.facts} onChange={(v) => edit((a) => { a.facts = v; })} rows={4} />
        <ListInput label="Estimated — inferences that could be wrong" value={draft.estimates} onChange={(v) => edit((a) => { a.estimates = v; })} rows={4} />
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t bg-surface/95 px-4 py-3 backdrop-blur"
        style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
        <span className="flex-1 text-xs text-faint">{dirty ? "Unsaved changes" : "Saved"}</span>
        {dirty && (
          <button type="button" className="btn btn-sm" onClick={() => { setDraft(reference.analysis ?? emptyAnalysis()); setDirty(false); }}>
            Discard
          </button>
        )}
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => void save()}>
          <Icon name="check" className="h-3.5 w-3.5" /> Save analysis
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-3.5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Text({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {multiline
        ? <textarea className="field resize-y" rows={3} value={value} dir="auto" onChange={(e) => onChange(e.target.value)} aria-label={label || undefined} />
        : <input className="field" value={value} dir="auto" onChange={(e) => onChange(e.target.value)} aria-label={label || undefined} />}
    </div>
  );
}

function ConfidenceToggle({ value, onChange }: { value: Confidence; onChange: (v: Confidence) => void }) {
  return (
    <button type="button" onClick={() => onChange(value === "observed" ? "estimated" : "observed")}
      title="Toggle between observed (measured) and estimated (inferred)" className="shrink-0">
      <ConfidencePill value={value} />
    </button>
  );
}

function ImportBox({
  referenceId, onDone, onImport,
}: {
  referenceId: string;
  onDone: () => void;
  onImport: (id: string, payload: unknown) => Promise<{ ok: boolean; errors: string[]; warnings: string[] }>;
}) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (raw: string) => {
    setErrors([]); setWarnings([]); setBusy(true);
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      setErrors([`That is not valid JSON: ${(err as Error).message}`]);
      setBusy(false);
      return;
    }
    const result = await onImport(referenceId, payload);
    setBusy(false);
    if (result.ok) { setWarnings(result.warnings); if (!result.warnings.length) onDone(); }
    else setErrors(result.errors);
  };

  return (
    <div className="panel p-3.5">
      <label className="label" htmlFor="import-json">Paste the JSON Claude Code produced</label>
      <textarea id="import-json" className="field ltr resize-y font-mono text-[11px]" rows={7} value={text} spellCheck={false}
        placeholder='{ "aestheticFamily": "…", "colors": [ … ] }' onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="file" accept="application/json,.json" className="text-xs text-muted file:me-2 file:rounded file:border-0 file:bg-raised file:px-2 file:py-1 file:text-xs file:text-ink"
          aria-label="Choose an analysis JSON file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const content = await file.text();
            setText(content);
            await submit(content);
          }} />
        <div className="flex-1" />
        <button type="button" className="btn btn-sm" onClick={onDone}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!text.trim() || busy} onClick={() => void submit(text)}>
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="check" className="h-3.5 w-3.5" />} Import
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg p-2.5 text-xs" style={{ background: "rgb(var(--bad) / 0.1)", color: "rgb(var(--bad))" }}>
          {errors.map((e, i) => <li key={i} dir="auto">• {e}</li>)}
        </ul>
      )}
      {warnings.length > 0 && (
        <div className="mt-3 rounded-lg p-2.5 text-xs" style={{ background: "rgb(var(--warn) / 0.1)", color: "rgb(var(--warn))" }}>
          <p className="mb-1 font-medium">Imported, with corrections:</p>
          <ul className="space-y-1">{warnings.map((w, i) => <li key={i} dir="auto">• {w}</li>)}</ul>
          <button type="button" className="btn btn-sm mt-2" onClick={onDone}>Close</button>
        </div>
      )}
    </div>
  );
}
