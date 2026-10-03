"use client";

import { useMemo, useState } from "react";
import { useStudio } from "@/lib/store";
import { resolveDirection, claudeCodePrompt } from "@/lib/project-output";
import { PURPOSES, PURPOSE_LABELS } from "@/lib/types";
import type { BrandColor, BrandFont, Project, Purpose } from "@/lib/types";
import { CopyButton, Empty, Icon, ListInput } from "@/components/ui";

export function ProjectsClient() {
  const projects = useStudio((s) => s.projects);
  const createProject = useStudio((s) => s.createProject);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Derived, not synchronised: a selection that no longer exists simply falls
  // back to the first project, with no effect and no extra render.
  const active = projects.find((p) => p.id === activeId) ?? projects[0] ?? null;

  const create = async () => {
    const name = window.prompt("Name the project");
    if (!name?.trim()) return;
    const project = await createProject(name.trim());
    if (project) setActiveId(project.id);
  };

  if (!projects.length) {
    return (
      <Empty
        title="No projects yet"
        body="A project is where references become one brief: pick what each reference contributes, add the constraints, and export a package Claude Code can build from."
        action={<button type="button" className="btn btn-primary btn-sm" onClick={() => void create()}><Icon name="plus" className="h-3.5 w-3.5" /> New project</button>}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0">
      <nav className="w-56 shrink-0 overflow-y-auto border-e p-3"
        style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }} aria-label="Projects">
        <button type="button" className="btn btn-sm mb-3 w-full" onClick={() => void create()}>
          <Icon name="plus" className="h-3.5 w-3.5" /> New project
        </button>
        <ul className="space-y-0.5">
          {projects.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setActiveId(p.id)} aria-current={p.id === active?.id ? "true" : undefined}
                className="w-full rounded-md px-2.5 py-2 text-start transition-colors"
                style={p.id === active?.id ? { background: "rgb(var(--line) / 0.09)" } : { color: "rgb(var(--muted))" }}>
                <span className="block truncate text-sm" dir="auto">{p.name}</span>
                <span className="ltr block text-[11px] text-faint">{p.refs.length} references</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {active ? <ProjectEditor key={active.id} project={active} /> : null}
      </div>
    </div>
  );
}

function ProjectEditor({ project }: { project: Project }) {
  const patch = useStudio((s) => s.patchProject);
  const remove = useStudio((s) => s.deleteProject);
  const references = useStudio((s) => s.references);

  const direction = useMemo(() => resolveDirection(project, references), [project, references]);
  const prompt = useMemo(() => claudeCodePrompt(project, references), [project, references]);
  const set = (p: Partial<Project>) => void patch(project.id, p);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <header className="flex items-start gap-3">
        <input className="field !border-transparent !bg-transparent !px-0 text-lg font-semibold" value={project.name} dir="auto"
          onChange={(e) => set({ name: e.target.value })} aria-label="Project name" />
        <button type="button" className="btn btn-sm shrink-0" style={{ color: "rgb(var(--bad))" }}
          onClick={() => { if (window.confirm(`Delete the project "${project.name}"? The references themselves are kept.`)) void remove(project.id); }}>
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ------- outputs, first because they are the point ------- */}
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <CopyButton className="btn btn-primary btn-sm" label="Copy Claude Code prompt" text={() => claudeCodePrompt(project, references)} />
          <a className="btn btn-sm" href={`/api/projects/${project.id}/export`} download>
            <Icon name="download" className="h-3.5 w-3.5" /> Export project package
          </a>
        </div>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">Combined direction</h2>
        <p className="text-sm leading-relaxed text-muted" dir="auto">{direction.summary}</p>

        {direction.conflicts.length > 0 && (
          <div className="mt-3 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--warn))" }}>
              Conflicts resolved
            </h3>
            {direction.conflicts.map((c, i) => (
              <div key={i} className="rounded-lg p-2.5 text-xs leading-relaxed" style={{ background: "rgb(var(--warn) / 0.08)" }}>
                <p className="text-muted" dir="auto">{c.what}</p>
                <p className="mt-1" style={{ color: "rgb(var(--warn))" }} dir="auto">→ {c.resolution}</p>
              </div>
            ))}
          </div>
        )}

        {(direction.palette.length > 0 || direction.fonts.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {direction.palette.length > 0 && (
              <div className="flex items-center gap-1">
                {direction.palette.slice(0, 10).map((c, i) => (
                  <span key={`${c.hex}-${i}`} title={`${c.hex} — ${c.role}`} className="h-6 w-6 rounded border" style={{ background: c.hex }} />
                ))}
              </div>
            )}
            {direction.fonts.length > 0 && (
              <p className="text-xs text-faint">
                {direction.fonts.map((f) => `${f.name}${f.locked ? " (locked)" : f.confidence === "estimated" ? " (estimated)" : ""}`).join(" · ")}
              </p>
            )}
          </div>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-faint hover:text-muted">Preview the prompt</summary>
          <pre className="ltr mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg p-3 text-[11px] leading-relaxed"
            style={{ background: "rgb(var(--canvas))", color: "rgb(var(--muted))" }}>{prompt}</pre>
        </details>
      </div>

      {/* ------- references ------- */}
      <Card title={`References (${project.refs.length})`}>
        <RefPicker project={project} />
      </Card>

      {/* ------- intent ------- */}
      <Card title="Intent">
        <Field label="What the website is for" value={project.purpose} multiline onChange={(v) => set({ purpose: v })} />
        <Field label="Who it is for" value={project.audience} multiline onChange={(v) => set({ audience: v })} />
        <Field label="The one action a visitor should take" value={project.mainAction} onChange={(v) => set({ mainAction: v })} />
      </Card>

      <Card title="Scope">
        <ListInput label="Pages" value={project.pages} onChange={(v) => set({ pages: v })} />
        <ListInput label="Sections" value={project.sections} onChange={(v) => set({ sections: v })} />
        <ListInput label="Functionality" value={project.functionality} onChange={(v) => set({ functionality: v })} />
      </Card>

      {/* ------- brand ------- */}
      <Card title="Brand">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5"
          style={{ background: project.brandLock ? "rgb(var(--accent) / 0.1)" : "rgb(var(--line) / 0.03)" }}>
          <input type="checkbox" className="mt-0.5" checked={project.brandLock} onChange={(e) => set({ brandLock: e.target.checked })} />
          <span>
            <span className="block text-sm font-medium">Brand lock</span>
            <span className="block text-xs leading-relaxed text-muted">
              Keep these colours and fonts even when the references use different ones. The references then contribute
              proportion, rhythm and behaviour instead of hue and typeface.
            </span>
          </span>
        </label>

        <BrandColors value={project.brand.colors} onChange={(colors) => set({ brand: { ...project.brand, colors } })} />
        <BrandFonts value={project.brand.fonts} onChange={(fonts) => set({ brand: { ...project.brand, fonts } })} />
        <Field label="Logo (path or URL)" value={project.brand.logo} onChange={(v) => set({ brand: { ...project.brand, logo: v } })} />
        <ListInput label="Supplied assets" value={project.brand.assets} onChange={(v) => set({ brand: { ...project.brand, assets: v } })} rows={2} />
      </Card>

      <Card title="Context and constraints">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Existing website" value={project.existing.url} onChange={(v) => set({ existing: { ...project.existing, url: v } })} />
          <Field label="Existing codebase" value={project.existing.codebase} onChange={(v) => set({ existing: { ...project.existing, codebase: v } })} />
          <Field label="Content language" value={project.language} placeholder="Hebrew, English, both…" onChange={(v) => set({ language: v })} />
          <div>
            <label className="label" htmlFor="direction">Text direction</label>
            <select id="direction" className="field" value={project.direction} onChange={(e) => set({ direction: e.target.value as Project["direction"] })}>
              <option value="ltr">Left to right</option>
              <option value="rtl">Right to left</option>
              <option value="both">Both — must work either way</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="animation">Animation intensity</label>
          <select id="animation" className="field" value={project.animation} onChange={(e) => set({ animation: e.target.value as Project["animation"] })}>
            <option value="none">None — ship it static</option>
            <option value="subtle">Subtle — fades and small moves only</option>
            <option value="moderate">Moderate — entrances and hover states</option>
            <option value="expressive">Expressive — motion is part of the design</option>
          </select>
        </div>
        <ListInput label="Must not change" value={project.mustKeep} onChange={(v) => set({ mustKeep: v })} rows={2} />
        <ListInput label="Dislike / avoid" value={project.dislikes} onChange={(v) => set({ dislikes: v })} rows={2} />
        <ListInput label="Combination instructions"
          placeholder={"Use the layout from A, typography from B, image treatment from C"}
          value={project.directives} onChange={(v) => set({ directives: v })} rows={3} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  // React's own pattern for adjusting state when a prop changes: compare during
  // render, not in an effect, so there is no second pass.
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setDraft(value); }
  const commit = () => { if (draft !== value) onChange(draft); };
  return (
    <div>
      <label className="label">{label}</label>
      {multiline
        ? <textarea className="field resize-y" rows={2} dir="auto" value={draft} placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)} onBlur={commit} aria-label={label} />
        : <input className="field" dir="auto" value={draft} placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)} onBlur={commit} aria-label={label} />}
    </div>
  );
}

function BrandColors({ value, onChange }: { value: BrandColor[]; onChange: (v: BrandColor[]) => void }) {
  return (
    <div>
      <span className="label">Brand colours</span>
      <div className="space-y-2">
        {value.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#000000"} aria-label={`Brand colour ${i + 1}`}
              className="h-8 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0"
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
            <input className="field ltr !w-24 shrink-0 font-mono text-xs" value={c.hex} aria-label={`Brand hex ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
            <input className="field flex-1 text-xs" value={c.name} placeholder="name, e.g. primary" dir="auto" aria-label={`Brand colour name ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove brand colour ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, { name: "", hex: "#000000" }])}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Add brand colour
        </button>
      </div>
    </div>
  );
}

function BrandFonts({ value, onChange }: { value: BrandFont[]; onChange: (v: BrandFont[]) => void }) {
  return (
    <div>
      <span className="label">Brand fonts</span>
      <div className="space-y-2">
        {value.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="field flex-1 text-sm" value={f.name} placeholder="Font name" dir="auto" aria-label={`Brand font ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className="field !w-32 text-xs" value={f.role} placeholder="role" dir="auto" aria-label={`Brand font role ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove brand font ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, { name: "", role: "body" }])}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Add brand font
        </button>
      </div>
    </div>
  );
}

function RefPicker({ project }: { project: Project }) {
  const references = useStudio((s) => s.references);
  const patch = useStudio((s) => s.patchProject);
  const [adding, setAdding] = useState(false);

  const update = (refs: Project["refs"]) => void patch(project.id, { refs });

  return (
    <div className="space-y-2">
      {project.refs.map((entry, i) => {
        const ref = references.find((r) => r.id === entry.refId);
        const asset = ref?.assets[0];
        return (
          <div key={`${entry.refId}-${entry.role}-${i}`} className="flex items-center gap-2.5 rounded-lg border p-2">
            <div className="checker h-11 w-14 shrink-0 overflow-hidden rounded" style={{ background: "rgb(var(--raised))" }}>
              {asset && (
                // eslint-disable-next-line @next/next/no-img-element -- local file route
                <img src={`/api/files/${asset.file}`} alt="" className="h-full w-full object-cover object-top" />
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm" dir="auto">{ref?.title ?? `(deleted reference ${entry.refId})`}</span>
            <select className="field !w-36 !py-1 text-xs" value={entry.role} aria-label="Role"
              onChange={(e) => update(project.refs.map((r, j) => (j === i ? { ...r, role: e.target.value as Purpose } : r)))}>
              {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABELS[p].en}</option>)}
            </select>
            <select className="field !w-28 !py-1 text-xs" value={entry.weight} aria-label="Weight"
              onChange={(e) => update(project.refs.map((r, j) => (j === i ? { ...r, weight: e.target.value as "primary" | "secondary" } : r)))}>
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
            </select>
            <button type="button" className="btn btn-ghost btn-sm shrink-0" aria-label="Remove from project"
              onClick={() => update(project.refs.filter((_, j) => j !== i))}>
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {!project.refs.length && (
        <p className="text-sm text-muted">
          No references yet. Add them here, or from a reference&apos;s <strong>Outputs</strong> tab in the library.
        </p>
      )}

      <button type="button" className="btn btn-sm" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
        <Icon name="plus" className="h-3.5 w-3.5" /> Add a reference
      </button>

      {adding && (
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border p-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
          {references.map((ref) => {
            const asset = ref.assets[0];
            return (
              <button key={ref.id} type="button" className="overflow-hidden rounded-lg border text-start hover:border-accent"
                onClick={() => {
                  const role: Purpose = ref.purposes[0] ?? "direction";
                  const weight = project.refs.some((r) => r.role === role && r.weight === "primary") ? "secondary" : "primary";
                  update([...project.refs, { refId: ref.id, role, weight }]);
                  setAdding(false);
                }}>
                <div className="checker aspect-[4/3] w-full" style={{ background: "rgb(var(--raised))" }}>
                  {asset && (
                    // eslint-disable-next-line @next/next/no-img-element -- local file route
                    <img src={`/api/files/${asset.file}`} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                  )}
                </div>
                <span className="block truncate px-1.5 py-1 text-[11px]" dir="auto">{ref.title}</span>
              </button>
            );
          })}
          {!references.length && <p className="p-2 text-xs text-faint">The library is empty.</p>}
        </div>
      )}
    </div>
  );
}
