import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Settings } from "./types";

/**
 * Optional external tools.
 *
 * The rule for all three: the library works without them, the UI never shows a
 * button that cannot do anything, and nothing here is reported as "connected"
 * unless it was actually found on this machine.
 */
export interface IntegrationStatus {
  id: "impeccable" | "higgsfield" | "twentyFirst";
  name: string;
  detected: boolean;
  /** What the studio can do with it right now. */
  state: "available" | "configured" | "not-detected" | "disabled";
  detail: string;
  /** Where the studio looked, so "not found" is actionable rather than mysterious. */
  searched?: string[];
  url?: string;
}

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

function firstExisting(candidates: string[]): string | null {
  for (const c of candidates) {
    try { if (existsSync(c)) return c; } catch { /* unreadable - keep looking */ }
  }
  return null;
}

function looksLikeImpeccable(dir: string): boolean {
  try {
    if (!statSync(dir).isDirectory()) return false;
    return readdirSync(dir).some((name) => /^impeccable/i.test(name));
  } catch {
    return false;
  }
}

/**
 * Impeccable (https://impeccable.style) is a design tool that can be installed
 * as a Claude Code skill/plugin or as a package. It is not bundled here, and it
 * is not required - when it is present the studio points its design-direction
 * workflow at it, and when it is not, the workflow runs on its own prompts.
 */
export function detectImpeccable(settings: Settings): IntegrationStatus {
  const configured = settings.integrations.impeccable.path.trim();
  const home = homedir();
  const searched = [
    configured || "(no explicit path set in Settings)",
    path.join(home, ".claude", "skills"),
    path.join(home, ".claude", "plugins"),
    path.join(REPO_ROOT, ".claude", "skills"),
    path.join(REPO_ROOT, "node_modules", "impeccable"),
  ];

  if (configured && existsSync(configured)) {
    return {
      id: "impeccable", name: "Impeccable", detected: true, state: "configured",
      detail: `Using the path set in Settings: ${configured}`,
      url: "https://impeccable.style", searched,
    };
  }

  const skillDirs = [
    path.join(home, ".claude", "skills"),
    path.join(home, ".claude", "plugins"),
    path.join(REPO_ROOT, ".claude", "skills"),
  ].filter((d) => looksLikeImpeccable(d));
  const pkg = firstExisting([
    path.join(REPO_ROOT, "node_modules", "impeccable"),
    path.join(REPO_ROOT, "tools", "reference-studio", "node_modules", "impeccable"),
  ]);

  if (skillDirs.length || pkg) {
    return {
      id: "impeccable", name: "Impeccable", detected: true, state: "available",
      detail: `Found at ${skillDirs[0] ?? pkg}. The design-direction workflow will hand off to it.`,
      url: "https://impeccable.style", searched,
    };
  }

  return {
    id: "impeccable", name: "Impeccable", detected: false, state: "not-detected",
    detail:
      "Not installed on this machine. Everything in Reference Studio works without it; " +
      "install it from impeccable.style and set its path in Settings to have the design workflow use it.",
    url: "https://impeccable.style", searched,
  };
}

export function detectHiggsfield(settings: Settings): IntegrationStatus {
  const configured = settings.integrations.higgsfield.enabled;
  const envKey = Boolean(process.env.HIGGSFIELD_API_KEY);
  return {
    id: "higgsfield", name: "Higgsfield", detected: envKey,
    state: envKey ? "available" : configured ? "configured" : "not-detected",
    detail: envKey
      ? "HIGGSFIELD_API_KEY is set, so generated image prompts can be sent there from your own tooling."
      : "No HIGGSFIELD_API_KEY in the environment. Reference Studio still writes the image prompt - paste it into whichever generator you use. Higgsfield is a paid service.",
    url: "https://higgsfield.ai",
  };
}

export function detect21st(settings: Settings): IntegrationStatus {
  return {
    id: "twentyFirst", name: "21st.dev", detected: false,
    state: settings.integrations.twentyFirst.enabled ? "configured" : "not-detected",
    detail:
      "Component references are looked up by hand: the project prompt names the components it needs, " +
      "and 21st.dev is a good place to find an implementation for each. No API key and no account are used here.",
    url: "https://21st.dev",
  };
}

export function detectAll(settings: Settings): IntegrationStatus[] {
  return [detectImpeccable(settings), detectHiggsfield(settings), detect21st(settings)];
}
