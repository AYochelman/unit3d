"use client";

import { create } from "zustand";
import type { Collection, Project, Reference, Settings } from "./types";
import type { IntegrationStatus } from "./integrations";
import { extractPalette, imageSize } from "./client-palette";
import { EMPTY_FILTERS, type Filters } from "./filters";

// Re-exported so components keep one import for everything list-related.
export { visibleReferences, allTags, EMPTY_FILTERS } from "./filters";
export type { Filters } from "./filters";

export type PublicSettings = Omit<Settings, "anthropicApiKey"> & { hasApiKey: boolean };

export interface Health {
  dataDir: string;
  counts: { references: number; collections: number; projects: number; analysed: number };
  capture: { available: boolean; version: string | null; reason: string | null };
  ai: { configured: boolean; model: string; mode: "api" | "package"; detail: string };
  integrations: IntegrationStatus[];
  settings: PublicSettings;
}

export interface Toast { id: number; kind: "info" | "ok" | "error"; text: string }

interface State {
  ready: boolean;
  loading: boolean;
  fatal: string | null;
  references: Reference[];
  collections: Collection[];
  projects: Project[];
  settings: PublicSettings | null;
  health: Health | null;
  selectedId: string | null;
  lightbox: { refId: string; assetIndex: number } | null;
  filters: Filters;
  busy: Record<string, string>;
  toasts: Toast[];

  load: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  toast: (kind: Toast["kind"], text: string) => void;
  dismissToast: (id: number) => void;
  select: (id: string | null) => void;
  openLightbox: (refId: string, assetIndex: number) => void;
  closeLightbox: () => void;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;

  addImages: (files: File[], collection?: string | null) => Promise<number>;
  addUrls: (urls: string[], collection?: string | null) => Promise<number>;
  captureRef: (id: string) => Promise<void>;
  patchRef: (id: string, patch: Partial<Reference>) => Promise<void>;
  deleteRef: (id: string) => Promise<void>;
  analyze: (id: string, mode: "ai" | "observed") => Promise<void>;
  importAnalysis: (id: string, payload: unknown) => Promise<{ ok: boolean; errors: string[]; warnings: string[] }>;
  uploadAssets: (id: string, files: File[], role?: "manual" | "mobile") => Promise<void>;
  removeAsset: (id: string, assetId: string) => Promise<void>;

  createCollection: (name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  createProject: (name: string) => Promise<Project | null>;
  patchProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  saveSettings: (patch: Record<string, unknown>) => Promise<void>;
}

let toastSeq = 0;

async function jsonOrThrow(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = { error: text.slice(0, 300) }; }
  }
  if (!res.ok) throw Object.assign(new Error(String(body.error ?? `Request failed (${res.status})`)), { body, status: res.status });
  return body;
}

export const useStudio = create<State>((set, get) => ({
  ready: false,
  loading: false,
  fatal: null,
  references: [],
  collections: [],
  projects: [],
  settings: null,
  health: null,
  selectedId: null,
  lightbox: null,
  filters: { ...EMPTY_FILTERS },
  busy: {},
  toasts: [],

  toast(kind, text) {
    const id = (toastSeq += 1);
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    // Errors stay until dismissed; there is nothing worse than a failure
    // notice that disappears before it has been read.
    if (kind !== "error") setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); },

  async load() {
    set({ loading: true });
    try {
      const data = await jsonOrThrow(await fetch("/api/library", { cache: "no-store" }));
      set({
        references: data.references as Reference[],
        collections: data.collections as Collection[],
        projects: data.projects as Project[],
        settings: data.settings as PublicSettings,
        ready: true, fatal: null,
      });
      void get().refreshHealth();
    } catch (err) {
      set({ fatal: (err as Error).message, ready: true });
    } finally {
      set({ loading: false });
    }
  },

  async refreshHealth() {
    try {
      const health = (await jsonOrThrow(await fetch("/api/health", { cache: "no-store" }))) as unknown as Health;
      set({ health, settings: health.settings });
    } catch { /* the capability strip simply stays as it was */ }
  },

  select(id) { set({ selectedId: id }); },
  openLightbox(refId, assetIndex) { set({ lightbox: { refId, assetIndex } }); },
  closeLightbox() { set({ lightbox: null }); },
  setFilters(patch) { set((s) => ({ filters: { ...s.filters, ...patch } })); },
  clearFilters() { set({ filters: { ...EMPTY_FILTERS } }); },

  async addImages(files, collection) {
    if (!files.length) return 0;
    const form = new FormData();
    if (collection) form.set("collection", collection);
    for (const file of files) {
      form.append("files", file);
      // Measured in the browser, where the decoded image already is.
      const [size, palette] = await Promise.all([imageSize(file), extractPalette(file)]);
      if (size.width) { form.set(`width:${file.name}`, String(size.width)); form.set(`height:${file.name}`, String(size.height)); }
      if (palette.length) form.set(`palette:${file.name}`, JSON.stringify(palette));
    }
    try {
      const data = await jsonOrThrow(await fetch("/api/references", { method: "POST", body: form }));
      const created = data.created as Reference[];
      const rejected = (data.rejected ?? []) as { name: string; reason: string }[];
      set((s) => ({ references: [...created, ...s.references] }));
      for (const r of rejected) get().toast("error", `${r.name}: ${r.reason}`);
      if (created.length) {
        get().toast("ok", `Added ${created.length} reference${created.length === 1 ? "" : "s"}`);
        set({ selectedId: created[0].id });
      }
      void get().refreshHealth();
      return created.length;
    } catch (err) {
      const rejected = ((err as { body?: { rejected?: { name: string; reason: string }[] } }).body?.rejected) ?? [];
      if (rejected.length) for (const r of rejected) get().toast("error", `${r.name}: ${r.reason}`);
      else get().toast("error", (err as Error).message);
      return 0;
    }
  },

  async addUrls(urls, collection) {
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    if (!clean.length) return 0;
    try {
      const data = await jsonOrThrow(
        await fetch("/api/references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: clean, collection: collection ?? undefined }),
        }),
      );
      const created = data.created as Reference[];
      for (const r of (data.rejected ?? []) as { url: string; reason: string }[]) get().toast("error", `${r.url} — ${r.reason}`);
      set((s) => ({ references: [...created, ...s.references] }));
      if (created.length) set({ selectedId: created[0].id });
      // Capture one at a time: five browsers at once is how a laptop stalls.
      for (const ref of created) await get().captureRef(ref.id);
      return created.length;
    } catch (err) {
      const rejected = ((err as { body?: { rejected?: { url: string; reason: string }[] } }).body?.rejected) ?? [];
      if (rejected.length) for (const r of rejected) get().toast("error", `${r.url} — ${r.reason}`);
      else get().toast("error", (err as Error).message);
      return 0;
    }
  },

  async captureRef(id) {
    set((s) => ({ busy: { ...s.busy, [id]: "capturing" } }));
    try {
      const data = await jsonOrThrow(await fetch(`/api/references/${id}/capture`, { method: "POST" }));
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
      if (!data.ok) get().toast("error", `${reference.title || "Capture"} — ${String(data.error ?? "failed")}`);
      else if (data.error) get().toast("info", String(data.error));
      else get().toast("ok", `Captured ${reference.title}`);
    } catch (err) {
      get().toast("error", (err as Error).message);
    } finally {
      set((s) => { const busy = { ...s.busy }; delete busy[id]; return { busy }; });
    }
  },

  async patchRef(id, patch) {
    const before = get().references;
    // Optimistic: editing a note should never feel like a network round trip.
    set((s) => ({ references: s.references.map((r) => (r.id === id ? { ...r, ...patch } as Reference : r)) }));
    try {
      const data = await jsonOrThrow(
        await fetch(`/api/references/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
        }),
      );
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
    } catch (err) {
      set({ references: before });
      get().toast("error", (err as Error).message);
    }
  },

  async deleteRef(id) {
    try {
      await jsonOrThrow(await fetch(`/api/references/${id}`, { method: "DELETE" }));
      set((s) => ({
        references: s.references.filter((r) => r.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        projects: s.projects.map((p) => ({ ...p, refs: p.refs.filter((r) => r.refId !== id) })),
      }));
      get().toast("ok", "Reference deleted");
      void get().refreshHealth();
    } catch (err) {
      get().toast("error", (err as Error).message);
    }
  },

  async analyze(id, mode) {
    set((s) => ({ busy: { ...s.busy, [id]: "analysing" } }));
    try {
      const data = await jsonOrThrow(
        await fetch(`/api/references/${id}/analyze`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }),
        }),
      );
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
      for (const w of (data.warnings ?? []) as string[]) get().toast("info", w);
      get().toast("ok", mode === "ai" ? `Analysed with ${String(data.model ?? "the model")}` : "Rebuilt from measurements");
      void get().refreshHealth();
    } catch (err) {
      const body = (err as { body?: { errors?: string[]; mode?: string } }).body;
      if (body?.errors?.length) for (const e of body.errors) get().toast("error", e);
      else get().toast("error", (err as Error).message);
    } finally {
      set((s) => { const busy = { ...s.busy }; delete busy[id]; return { busy }; });
    }
  },

  async importAnalysis(id, payload) {
    try {
      const data = await jsonOrThrow(
        await fetch(`/api/references/${id}/analyze`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", analysis: payload }),
        }),
      );
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
      const warnings = (data.warnings ?? []) as string[];
      get().toast("ok", "Analysis imported");
      return { ok: true, errors: [], warnings };
    } catch (err) {
      const body = (err as { body?: { errors?: string[]; warnings?: string[] } }).body;
      return { ok: false, errors: body?.errors ?? [(err as Error).message], warnings: body?.warnings ?? [] };
    }
  },

  async uploadAssets(id, files, role = "manual") {
    if (!files.length) return;
    const form = new FormData();
    form.set("role", role);
    for (const file of files) form.append("files", file);
    try {
      const data = await jsonOrThrow(await fetch(`/api/references/${id}/assets`, { method: "POST", body: form }));
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
      for (const r of (data.rejected ?? []) as { name: string; reason: string }[]) get().toast("error", `${r.name}: ${r.reason}`);
      get().toast("ok", "Screenshot added");
    } catch (err) {
      get().toast("error", (err as Error).message);
    }
  },

  async removeAsset(id, assetId) {
    try {
      const data = await jsonOrThrow(await fetch(`/api/references/${id}/assets?asset=${encodeURIComponent(assetId)}`, { method: "DELETE" }));
      const reference = data.reference as Reference;
      set((s) => ({ references: s.references.map((r) => (r.id === id ? reference : r)) }));
    } catch (err) {
      get().toast("error", (err as Error).message);
    }
  },

  async createCollection(name) {
    try {
      const data = await jsonOrThrow(
        await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
      );
      set((s) => ({ collections: [...s.collections, data.collection as Collection] }));
    } catch (err) { get().toast("error", (err as Error).message); }
  },

  async deleteCollection(id) {
    try {
      await jsonOrThrow(await fetch(`/api/collections/${id}`, { method: "DELETE" }));
      set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
        references: s.references.map((r) => ({ ...r, collections: r.collections.filter((c) => c !== id) })),
        filters: s.filters.collection === id ? { ...s.filters, collection: null } : s.filters,
      }));
    } catch (err) { get().toast("error", (err as Error).message); }
  },

  async createProject(name) {
    try {
      const data = await jsonOrThrow(
        await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
      );
      const project = data.project as Project;
      set((s) => ({ projects: [project, ...s.projects] }));
      return project;
    } catch (err) { get().toast("error", (err as Error).message); return null; }
  },

  async patchProject(id, patch) {
    const before = get().projects;
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } as Project : p)) }));
    try {
      const data = await jsonOrThrow(
        await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
      );
      const project = data.project as Project;
      set((s) => ({ projects: s.projects.map((p) => (p.id === id ? project : p)) }));
    } catch (err) {
      set({ projects: before });
      get().toast("error", (err as Error).message);
    }
  },

  async deleteProject(id) {
    try {
      await jsonOrThrow(await fetch(`/api/projects/${id}`, { method: "DELETE" }));
      set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      get().toast("ok", "Project deleted");
    } catch (err) { get().toast("error", (err as Error).message); }
  },

  async saveSettings(patch) {
    try {
      const data = await jsonOrThrow(
        await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
      );
      set({ settings: data.settings as PublicSettings });
      get().toast("ok", "Settings saved");
      void get().refreshHealth();
    } catch (err) { get().toast("error", (err as Error).message); }
  },
}));
