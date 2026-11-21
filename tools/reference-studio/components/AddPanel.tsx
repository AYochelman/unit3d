"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { Icon, Spinner } from "./ui";

/**
 * Three ways in - drop, paste, pick - plus a URL box. The paste listener is
 * global on purpose: copying a screenshot and hitting Ctrl+V anywhere in the
 * library is the fastest path there is, and making people open a dialog first
 * would throw that away.
 */
export function AddPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addImages = useStudio((s) => s.addImages);
  const addUrls = useStudio((s) => s.addUrls);
  const collections = useStudio((s) => s.collections);
  const settings = useStudio((s) => s.settings);
  const health = useStudio((s) => s.health);
  const t = translator(settings?.uiLanguage ?? "en");

  const [dragging, setDragging] = useState(false);
  const [urls, setUrls] = useState("");
  const [collection, setCollection] = useState<string>("");
  const [working, setWorking] = useState<null | string>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Paste anywhere. Only when the focus is not inside a text field, so pasting
  // a note never turns into an upload.
  useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
      if (typing) return;
      const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      setWorking("Reading pasted image…");
      await addImages(files, collection || null);
      setWorking(null);
      onClose();
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addImages, collection, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const takeFiles = async (list: FileList | File[] | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.name));
    if (!files.length) return;
    setWorking(`Adding ${files.length} image${files.length === 1 ? "" : "s"}…`);
    await addImages(files, collection || null);
    setWorking(null);
    onClose();
  };

  const takeUrls = async () => {
    const list = urls.split(/[\n\s,]+/).map((u) => u.trim()).filter(Boolean);
    if (!list.length) return;
    setWorking(health?.capture.available ? `Capturing ${list.length} site${list.length === 1 ? "" : "s"}… this takes a moment each.` : "Adding links…");
    await addUrls(list, collection || null);
    setUrls("");
    setWorking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: "rgb(var(--shade) / 0.6)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t("addReference")}
        className="panel w-full max-w-2xl shadow-pop">
        <div className="flex items-center gap-3 border-b px-5 py-3.5"
          style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
          <h2 className="flex-1 text-sm font-semibold">{t("addReference")}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t("close")}>
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* --- images --- */}
          <section>
            <h3 className="label">{t("addImages")}</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void takeFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors"
              style={{
                borderColor: dragging ? "rgb(var(--accent))" : "rgb(var(--line) / 0.16)",
                background: dragging ? "rgb(var(--accent) / 0.06)" : "rgb(var(--line) / 0.02)",
              }}>
              <Icon name="image" className="h-6 w-6 text-faint" />
              <p className="text-sm text-muted">{t("dropHere")}</p>
              <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => void takeFiles(e.target.files)} />
              <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>
                {t("chooseFiles")}
              </button>
              <p className="text-xs text-faint">PNG, JPEG, GIF, WebP, AVIF or SVG · up to 25 MB each</p>
            </div>
          </section>

          {/* --- urls --- */}
          <section>
            <h3 className="label">{t("addUrls")}</h3>
            <textarea className="field ltr resize-y" rows={3} value={urls} placeholder={t("urlPlaceholder")}
              onChange={(e) => setUrls(e.target.value)} spellCheck={false} />
            <p className="mt-1.5 text-xs text-faint">
              {health?.capture.available
                ? "Each link is opened in a real browser: desktop and mobile screenshots, plus the fonts, colours and motion the live page actually uses."
                : "Screenshots are unavailable right now, so links are saved without them — you can upload a screenshot by hand afterwards."}
            </p>
          </section>

          {/* --- collection --- */}
          {collections.length > 0 && (
            <section>
              <label className="label" htmlFor="add-collection">{t("collections")}</label>
              <select id="add-collection" className="field" value={collection} onChange={(e) => setCollection(e.target.value)}>
                <option value="">— none —</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </section>
          )}
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-3.5"
          style={{ borderColor: "rgb(var(--line) / var(--line-alpha))" }}>
          {working && <span className="flex items-center gap-2 text-xs text-muted"><Spinner className="h-3.5 w-3.5" />{working}</span>}
          <div className="flex-1" />
          <button type="button" className="btn btn-sm" onClick={onClose}>{t("cancel")}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void takeUrls()} disabled={!urls.trim() || Boolean(working)}>
            <Icon name="link" className="h-3.5 w-3.5" /> {t("capture")}
          </button>
        </div>
      </div>
    </div>
  );
}
