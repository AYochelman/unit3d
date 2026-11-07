"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/lib/store";
import { Icon, Spinner } from "@/components/ui";

const MODELS = [
  { id: "claude-opus-5", label: "Claude Opus 5 — the default" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 — cheaper, still vision-capable" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — fastest, least detailed" },
];

export function SettingsClient() {
  const settings = useStudio((s) => s.settings);
  const health = useStudio((s) => s.health);
  const save = useStudio((s) => s.saveSettings);
  const refreshHealth = useStudio((s) => s.refreshHealth);
  const router = useRouter();

  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  if (!settings) return <div className="p-8 text-sm text-muted"><Spinner className="h-4 w-4" /></div>;

  // Theme and chrome language are rendered on the server, so the page is
  // refreshed after changing them rather than left half-switched.
  const saveAndRefresh = async (patch: Record<string, unknown>) => { await save(patch); router.refresh(); };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-5">
      <h1 className="text-lg font-semibold">Settings</h1>

      {/* ---------- AI ---------- */}
      <section className="panel p-4">
        <h2 className="mb-1 text-sm font-semibold">Analysis</h2>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Two modes, and the tool is explicit about which one is active. With a key, <strong>Analyse</strong> makes a real
          vision request. Without one, that button stays off and you use the package route instead — export, run it in
          Claude Code, import the JSON. Neither mode ever invents a description.
        </p>

        <div className="mb-3 flex items-center gap-2 rounded-lg p-2.5 text-xs"
          style={{
            background: settings.hasApiKey ? "rgb(var(--ok) / 0.1)" : "rgb(var(--warn) / 0.1)",
            color: settings.hasApiKey ? "rgb(var(--ok))" : "rgb(var(--warn))",
          }}>
          <Icon name={settings.hasApiKey ? "check" : "alert"} className="h-3.5 w-3.5 shrink-0" />
          <span>{health?.ai.detail ?? (settings.hasApiKey ? "A key is configured." : "No key configured — package mode.")}</span>
        </div>

        <label className="label" htmlFor="api-key">Anthropic API key</label>
        <div className="flex gap-2">
          <input id="api-key" type="password" className="field ltr font-mono text-xs" autoComplete="off"
            placeholder={settings.hasApiKey ? "•••••••••••••••••  (stored — type to replace)" : "sk-ant-…"}
            value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={!apiKey.trim() || savingKey}
            onClick={async () => { setSavingKey(true); await save({ anthropicApiKey: apiKey.trim() }); setApiKey(""); setSavingKey(false); }}>
            {savingKey ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="check" className="h-3.5 w-3.5" />} Save
          </button>
          {settings.hasApiKey && (
            <button type="button" className="btn btn-sm shrink-0" style={{ color: "rgb(var(--bad))" }}
              onClick={() => { if (window.confirm("Remove the stored API key?")) void save({ anthropicApiKey: "" }); }}>
              Clear
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
          The key is written to <code className="ltr">data/library.json</code> on this machine and is used only by the
          server. It is never sent to the browser — this page can tell you that one exists, not what it is.
        </p>

        <div className="mt-4">
          <label className="label" htmlFor="model">Model</label>
          <select id="model" className="field" value={settings.model} onChange={(e) => void save({ model: e.target.value })}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            {!MODELS.some((m) => m.id === settings.model) && <option value={settings.model}>{settings.model}</option>}
          </select>
        </div>
      </section>

      {/* ---------- capture ---------- */}
      <section className="panel p-4">
        <h2 className="mb-1 text-sm font-semibold">Website capture</h2>
        <div className="mb-3 flex items-start gap-2 rounded-lg p-2.5 text-xs"
          style={{
            background: health?.capture.available ? "rgb(var(--ok) / 0.1)" : "rgb(var(--warn) / 0.1)",
            color: health?.capture.available ? "rgb(var(--ok))" : "rgb(var(--warn))",
          }}>
          <Icon name={health?.capture.available ? "check" : "alert"} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {health?.capture.available
              ? `Chromium ${health.capture.version ?? ""} is ready.`
              : health?.capture.reason ?? "Checking…"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Viewport label="Desktop viewport" value={settings.desktopViewport}
            onChange={(v) => void save({ desktopViewport: v })} />
          <Viewport label="Mobile viewport" value={settings.mobileViewport}
            onChange={(v) => void save({ mobileViewport: v })} />
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.fullPage} onChange={(e) => void save({ fullPage: e.target.checked })} />
          Capture the full page, not only the first screen
        </label>

        <div className="mt-3">
          <label className="label" htmlFor="timeout">Timeout (seconds)</label>
          <input id="timeout" type="number" min={5} max={120} className="field ltr !w-28"
            value={Math.round(settings.captureTimeoutMs / 1000)}
            onChange={(e) => void save({ captureTimeoutMs: Number(e.target.value) * 1000 })} />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Only public <span className="ltr">http/https</span> addresses are fetched. Loopback, private ranges,
          link-local and cloud metadata addresses are refused, and a hostname that resolves to any of them is refused too.
        </p>
      </section>

      {/* ---------- appearance ---------- */}
      <section className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="theme">Theme</label>
            <select id="theme" className="field" value={settings.theme}
              onChange={(e) => void saveAndRefresh({ theme: e.target.value })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <p className="mt-1 text-[11px] text-faint">A palette can read very differently on each — switch while judging.</p>
          </div>
          <div>
            <label className="label" htmlFor="uiLanguage">Interface language</label>
            <select id="uiLanguage" className="field" value={settings.uiLanguage}
              onChange={(e) => void saveAndRefresh({ uiLanguage: e.target.value })}>
              <option value="en">English</option>
              <option value="he">עברית</option>
            </select>
            <p className="mt-1 text-[11px] text-faint">Your own notes keep their own direction either way.</p>
          </div>
        </div>
      </section>

      {/* ---------- integrations ---------- */}
      <section className="panel p-4">
        <h2 className="mb-1 text-sm font-semibold">Optional integrations</h2>
        <p className="mb-3 text-xs text-muted">
          The library works fully without every one of these. Nothing is reported as connected unless it was actually found.
        </p>
        <div className="space-y-2.5">
          {(health?.integrations ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ background: item.detected ? "rgb(var(--ok))" : "rgb(var(--faint))" }} />
                <h3 className="text-sm font-medium">{item.name}</h3>
                <span className="chip">{item.state.replace("-", " ")}</span>
                <div className="flex-1" />
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className="ltr text-xs hover:underline"
                    style={{ color: "rgb(var(--accent))" }}>{item.url.replace(/^https?:\/\//, "")}</a>
                )}
              </div>
              <p className="text-xs leading-relaxed text-muted">{item.detail}</p>
              {item.id === "impeccable" && (
                <div className="mt-2">
                  <label className="label" htmlFor="impeccable-path">Path to the Impeccable install (optional)</label>
                  <input id="impeccable-path" className="field ltr text-xs" defaultValue={settings.integrations.impeccable.path}
                    placeholder="/path/to/impeccable"
                    onBlur={(e) => void save({ integrations: { impeccable: { enabled: Boolean(e.target.value.trim()), path: e.target.value.trim() } } })} />
                  {item.searched && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11px] text-faint">Where the studio looked</summary>
                      <ul className="ltr mt-1 space-y-0.5 text-[11px] text-faint">
                        {item.searched.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- storage ---------- */}
      <section className="panel p-4">
        <h2 className="mb-1 text-sm font-semibold">Storage</h2>
        <p className="text-xs leading-relaxed text-muted">
          Everything lives on disk in <code className="ltr">{health?.dataDir ?? "data/"}</code> — images under{" "}
          <code className="ltr">files/</code>, the rest in <code className="ltr">library.json</code>. Copy that folder and
          the whole library moves with it. Nothing is stored in the browser.
        </p>
        <p className="mt-2 text-xs text-muted">
          <span className="ltr">{health?.counts.references ?? 0}</span> references,{" "}
          <span className="ltr">{health?.counts.analysed ?? 0}</span> analysed,{" "}
          <span className="ltr">{health?.counts.collections ?? 0}</span> collections,{" "}
          <span className="ltr">{health?.counts.projects ?? 0}</span> projects.
        </p>
      </section>
    </div>
  );
}

function Viewport({ label, value, onChange }: {
  label: string; value: { width: number; height: number }; onChange: (v: { width: number; height: number }) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" className="field ltr" value={value.width} aria-label={`${label} width`}
          onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} />
        <span className="text-faint">×</span>
        <input type="number" className="field ltr" value={value.height} aria-label={`${label} height`}
          onChange={(e) => onChange({ ...value, height: Number(e.target.value) })} />
      </div>
    </div>
  );
}
