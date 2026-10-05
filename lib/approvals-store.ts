"use client";
import { create } from "zustand";
import type { Decision, ModelDecision } from "./candidates";
import type { ImportedShelf } from "./imported";

/**
 * The owner's answers in /admin → "מודלים לאישור", outside the tab itself.
 *
 * They used to live in the tab's useState, so switching to "מוצרים" for a
 * second and back unmounted it and threw every answer away. Here they survive
 * any tab switch for the whole visit (no localStorage — project rule; a real
 * page leave is still guarded by the beforeunload warning).
 */
export type Choice = { decision?: Decision; shelves: ImportedShelf[]; touched?: boolean; he?: string };

type ApprovalsState = {
  choices: Record<string, Choice>;
  /** Ids whose answers already reached the repository in this visit. */
  saved: Record<string, true>;
  update: (fn: (prev: Record<string, Choice>) => Record<string, Choice>) => void;
  markSaved: (ids: string[]) => void;
};

export const useApprovalsStore = create<ApprovalsState>((set) => ({
  choices: {},
  saved: {},
  update: (fn) => set((s) => ({ choices: fn(s.choices) })),
  markSaved: (ids) =>
    set((s) => ({ saved: { ...s.saved, ...Object.fromEntries(ids.map((id) => [id, true as const])) } })),
}));

const REPO_API = "https://api.github.com/repos/AYochelman/unit3d/contents";

/**
 * What the repository says right now — not what this build was made from.
 *
 * A save starts a bot run and then a site build; for about five minutes the
 * page keeps showing the queue it was built with, and every answer looks lost.
 * Asking the repository directly closes that gap: a model that is gone from
 * the queue file was already applied, and one listed in model-decisions.json
 * is saved and waiting for the bot.
 */
export async function fetchRepoQueue(token?: string): Promise<{ queued: Set<string>; pending: ModelDecision[] } | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const get = async (path: string) => {
    const r = await fetch(`${REPO_API}/${path}?ref=main&t=${Date.now()}`, { headers, cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return r.text();
  };
  try {
    const [queueTs, decisionsJson] = await Promise.all([
      get("lib/candidates.generated.ts"),
      get("public/model-decisions.json"),
    ]);
    const queued = new Set([...queueTs.matchAll(/"id":\s*"(\d+)"/g)].map((m) => m[1]));
    const file = JSON.parse(decisionsJson) as { decisions?: ModelDecision[] };
    return { queued, pending: file.decisions ?? [] };
  } catch {
    return null;   // offline or rate-limited: the build's own queue stands
  }
}
