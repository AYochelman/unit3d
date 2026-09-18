"use client";

import { useMemo, useState } from "react";
import { useStudio } from "@/lib/store";
import { designBrief, imagePrompt, designTokens, provenance } from "@/lib/outputs";
import { PURPOSES, PURPOSE_LABELS } from "@/lib/types";
import type { Purpose, Reference } from "@/lib/types";
import { CopyButton, Icon } from "./ui";

const ASPECTS = ["16:9", "21:9", "4:3", "1:1", "3:4", "9:16"];

/**
 * Four outputs, always live. They are generated from the reference in the
 * browser, so what you copy is exactly what you are looking at - there is no
 * stale cached copy of a brief you already edited.
 */
export function OutputsPanel({ reference }: { reference: Reference }) {
  const [aspect, setAspect] = useState("16:9");
  const [tab, setTab] = useState<"brief" | "image" | "tokens">("brief");
  const [tokenFormat, setTokenFormat] = useState<"json" | "css">("json");

  const brief = useMemo(() => designBrief(reference), [reference]);
  const prompt = useMemo(() => imagePrompt(reference, aspect), [reference, aspect]);
  const tokens = useMemo(() => designTokens(reference), [reference]);
  const tokenText = tokenFormat === "json" ? tokens.json : tokens.css;
  const current = tab === "brief" ? brief : tab === "image" ? prompt : tokenText;

  const download = () => {
    const name = tab === "brief" ? "brief.md" : tab === "image" ? "image-prompt.txt" : tokenFormat === "json" ? "tokens.json" : "tokens.css";
    const blob = new Blob([current], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reference.id}-${name}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <CopyButton className="btn btn-sm justify-start" label="Copy design brief" text={() => designBrief(reference)} />
        <CopyButton className="btn btn-sm justify-start" label="Copy image prompt" text={() => imagePrompt(reference, aspect)} />
        <CopyButton className="btn btn-sm justify-start" label="Copy design tokens" text={() => (tokenFormat === "json" ? designTokens(reference).json : designTokens(reference).css)} />
        <AddToProject reference={reference} />
      </div>

      {!reference.analysis && (
        <p className="rounded-lg p-3 text-xs leading-relaxed"
          style={{ background: "rgb(var(--warn) / 0.1)", color: "rgb(var(--warn))" }}>
          There is no analysis yet, so these outputs carry only the title, your note and the labels.
          Run an analysis on the Analysis tab to make them useful.
        </p>
      )}

      <div className="panel overflow-hidden">
        <div className="flex items-center gap-1 border-b px-2 py-1.5"
          style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
          {([["brief", "Brief"], ["image", "Image prompt"], ["tokens", "Tokens"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className="rounded-md px-2.5 py-1 text-xs transition-colors"
              aria-pressed={tab === key}
              style={tab === key ? { background: "rgb(var(--line) / 0.1)", color: "rgb(var(--ink))" } : { color: "rgb(var(--muted))" }}>
              {label}
            </button>
          ))}
          <div className="flex-1" />
          {tab === "image" && (
            <select className="field ltr !w-auto !py-1 text-xs" value={aspect} onChange={(e) => setAspect(e.target.value)}
              aria-label="Aspect ratio">
              {ASPECTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {tab === "tokens" && (
            <div className="flex gap-0.5">
              {(["json", "css"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setTokenFormat(f)} aria-pressed={tokenFormat === f}
                  className="rounded px-2 py-1 text-[11px] uppercase"
                  style={tokenFormat === f ? { background: "rgb(var(--accent) / 0.16)", color: "rgb(var(--accent))" } : { color: "rgb(var(--faint))" }}>
                  {f}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={download} aria-label="Download this output">
            <Icon name="download" className="h-3.5 w-3.5" />
          </button>
        </div>
        <pre className="ltr max-h-96 overflow-auto whitespace-pre-wrap break-words p-3 text-[11.5px] leading-relaxed"
          style={{ color: "rgb(var(--muted))" }}>{current}</pre>
      </div>

      <p className="text-[11px] leading-relaxed text-faint" dir="auto">
        Every output carries its provenance line, so a brief can always be traced back to the picture it came from:
        <br />
        <span className="ltr">{provenance(reference)}</span>
      </p>
    </div>
  );
}

function AddToProject({ reference }: { reference: Reference }) {
  const projects = useStudio((s) => s.projects);
  const patchProject = useStudio((s) => s.patchProject);
  const createProject = useStudio((s) => s.createProject);
  const toast = useStudio((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Purpose>(reference.purposes[0] ?? "direction");

  const attach = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    if (project.refs.some((r) => r.refId === reference.id && r.role === role)) {
      toast("info", `Already in ${project.name} as ${PURPOSE_LABELS[role].en.toLowerCase()}`);
      setOpen(false);
      return;
    }
    const weight = project.refs.some((r) => r.role === role && r.weight === "primary") ? "secondary" : "primary";
    await patchProject(projectId, { refs: [...project.refs, { refId: reference.id, role, weight }] });
    toast("ok", `Added to ${project.name} as ${PURPOSE_LABELS[role].en.toLowerCase()} (${weight})`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" className="btn btn-sm w-full justify-start" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="layers" className="h-3.5 w-3.5" /> Add to project
      </button>
      {open && (
        <div className="panel absolute z-20 mt-1 w-72 p-3 shadow-pop" style={{ insetInlineStart: 0 }}>
          <label className="label" htmlFor="attach-role">Take it for</label>
          <select id="attach-role" className="field mb-3" value={role} onChange={(e) => setRole(e.target.value as Purpose)}>
            {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABELS[p].en}</option>)}
          </select>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => void attach(p.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-raised">
                <Icon name="layers" className="h-3.5 w-3.5 shrink-0 text-faint" />
                <span className="truncate" dir="auto">{p.name}</span>
                <span className="ms-auto shrink-0 text-[11px] text-faint">{p.refs.length}</span>
              </button>
            ))}
            {!projects.length && <p className="px-2 py-1 text-xs text-faint">No projects yet.</p>}
          </div>
          <button type="button" className="btn btn-sm mt-2 w-full"
            onClick={async () => {
              const name = window.prompt("Name the new project");
              if (!name?.trim()) return;
              const project = await createProject(name.trim());
              if (project) await attach(project.id);
            }}>
            <Icon name="plus" className="h-3.5 w-3.5" /> New project
          </button>
        </div>
      )}
    </div>
  );
}
