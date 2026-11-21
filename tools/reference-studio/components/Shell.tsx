"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useStudio } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { Icon, Toasts, Spinner } from "./ui";

/**
 * The frame around every page: identity, navigation, and an honest strip of
 * what this installation can currently do. The strip is not decoration - it is
 * how the tool avoids offering a button that cannot work.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const load = useStudio((s) => s.load);
  const ready = useStudio((s) => s.ready);
  const fatal = useStudio((s) => s.fatal);
  const health = useStudio((s) => s.health);
  const settings = useStudio((s) => s.settings);
  const t = translator(settings?.uiLanguage ?? "en");

  useEffect(() => { void load(); }, [load]);

  const nav = [
    { href: "/", label: t("library"), icon: "grid" },
    { href: "/projects", label: t("projects"), icon: "layers" },
    { href: "/settings", label: t("settings"), icon: "sliders" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur-xl"
        style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-md">
            <span className="grid h-7 w-7 place-items-center rounded-md text-[13px] font-bold"
              style={{ background: "rgb(var(--accent))", color: "rgb(var(--accent-ink))" }}>R</span>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Reference Studio</span>
          </Link>

          <nav className="ms-2 flex items-center gap-0.5" aria-label="Sections">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
                  style={active
                    ? { background: "rgb(var(--line) / 0.09)", color: "rgb(var(--ink))" }
                    : { color: "rgb(var(--muted))" }}>
                  <Icon name={item.icon} className="h-4 w-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />
          <CapabilityStrip />
        </div>
      </header>

      <main className="flex-1">
        {fatal ? (
          <div className="mx-auto max-w-lg p-8">
            <div className="panel p-5" style={{ borderColor: "rgb(var(--bad) / 0.5)" }}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "rgb(var(--bad))" }}>
                <Icon name="alert" /> The library could not be loaded
              </h2>
              <p className="text-sm leading-relaxed text-muted">{fatal}</p>
              <button type="button" className="btn mt-4" onClick={() => void load()}>
                <Icon name="refresh" /> {t("retry")}
              </button>
            </div>
          </div>
        ) : !ready ? (
          <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted">
            <Spinner /> {t("loading")}
          </div>
        ) : (
          children
        )}
      </main>

      {health && (
        // Latin and numeric throughout, so it is isolated as LTR - otherwise
        // the bidi algorithm drags the path and the counts out of order in a
        // right-to-left interface.
        <footer dir="ltr" className="border-t px-4 py-2.5 text-start text-xs text-faint sm:px-6"
          style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
          <span className="ltr">{health.counts.references}</span> references ·{" "}
          <span className="ltr">{health.counts.analysed}</span> analysed ·{" "}
          <span className="ltr">{health.counts.projects}</span> projects · stored in{" "}
          <code className="ltr text-[11px]">{health.dataDir}</code>
        </footer>
      )}

      <Toasts />
    </div>
  );
}

function CapabilityStrip() {
  const health = useStudio((s) => s.health);
  if (!health) return null;

  const items = [
    {
      on: health.capture.available,
      label: "Capture",
      detail: health.capture.available
        ? `Chromium ${health.capture.version ?? ""} is ready — website links are screenshotted automatically.`
        : health.capture.reason ?? "No browser available.",
    },
    {
      on: health.ai.configured,
      label: health.ai.configured ? "AI analysis" : "Package mode",
      detail: health.ai.detail,
    },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item) => (
        <span key={item.label} title={item.detail}
          className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:inline-flex"
          style={{
            borderColor: item.on ? "rgb(var(--ok) / 0.35)" : "rgb(var(--warn) / 0.35)",
            color: item.on ? "rgb(var(--ok))" : "rgb(var(--warn))",
          }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
