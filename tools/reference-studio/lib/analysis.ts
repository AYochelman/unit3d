import { describeColor } from "./color";
import type { Analysis, Confidence, ObservedProbe, Swatch } from "./types";

/* ------------------------------------------------------------------ *
 * Validation
 *
 * The same normaliser runs over the model's reply and over a JSON file
 * pasted in by hand, so both paths fail the same way and produce the same
 * shape. It never throws on a missing field - it collects problems and
 * fills a safe default, because a half-right analysis the user can edit is
 * more useful than a rejected one.
 * ------------------------------------------------------------------ */

export interface ValidationResult {
  analysis: Analysis;
  errors: string[];
  warnings: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}
function strArray(value: unknown, cap = 24): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean).slice(0, cap);
}
function confidence(value: unknown, fallback: Confidence = "estimated"): Confidence {
  return value === "observed" || value === "estimated" ? value : fallback;
}

export function emptyAnalysis(): Analysis {
  return {
    aestheticFamily: "",
    vocabulary: [],
    character: "",
    adaptation: [],
    colors: [],
    typography: { fonts: [], scale: "", weights: "", casing: "", tracking: "", hierarchy: "" },
    layout: { grid: "", spacing: "", density: "", alignment: "", containerWidth: "" },
    hero: { composition: "", imageTreatment: "" },
    components: [],
    motion: { notes: "", confidence: "estimated" },
    facts: [],
    estimates: [],
  };
}

export function normalizeAnalysis(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const out = emptyAnalysis();

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    errors.push("The analysis must be a JSON object. Got " + (Array.isArray(input) ? "an array" : typeof input) + ".");
    return { analysis: out, errors, warnings };
  }
  const raw = input as Record<string, unknown>;

  out.aestheticFamily = str(raw.aestheticFamily);
  if (!out.aestheticFamily) warnings.push("`aestheticFamily` is empty - the brief will have no headline style name.");
  out.vocabulary = strArray(raw.vocabulary);
  out.character = str(raw.character);
  out.adaptation = strArray(raw.adaptation);

  // colors ---------------------------------------------------------
  if (raw.colors !== undefined && !Array.isArray(raw.colors)) {
    errors.push("`colors` must be an array of { hex, role, confidence }.");
  } else {
    for (const [i, item] of (Array.isArray(raw.colors) ? raw.colors : []).entries()) {
      if (!item || typeof item !== "object") { warnings.push(`colors[${i}] is not an object - skipped.`); continue; }
      const c = item as Record<string, unknown>;
      let hex = str(c.hex).toLowerCase();
      if (hex && !hex.startsWith("#")) hex = `#${hex}`;
      if (hex.length === 4 && /^#[0-9a-f]{3}$/.test(hex)) hex = `#${hex.slice(1).split("").map((x) => x + x).join("")}`;
      if (!HEX.test(hex)) { warnings.push(`colors[${i}].hex ("${str(c.hex)}") is not a 6-digit hex value - skipped.`); continue; }
      out.colors.push({
        hex,
        role: str(c.role, "accent"),
        name: str(c.name) || describeColor(hex),
        confidence: confidence(c.confidence),
      });
    }
  }
  if (out.colors.length > 24) out.colors = out.colors.slice(0, 24);

  // typography -----------------------------------------------------
  const typo = (raw.typography ?? {}) as Record<string, unknown>;
  for (const [i, item] of (Array.isArray(typo.fonts) ? typo.fonts : []).entries()) {
    if (!item || typeof item !== "object") { warnings.push(`typography.fonts[${i}] is not an object - skipped.`); continue; }
    const f = item as Record<string, unknown>;
    const name = str(f.name);
    if (!name) { warnings.push(`typography.fonts[${i}] has no name - skipped.`); continue; }
    const conf = confidence(f.confidence);
    const evidence = str(f.evidence);
    if (conf === "observed" && !evidence) {
      // An "observed" font with nothing backing it is exactly the claim this
      // tool must not make, so it is demoted rather than dropped.
      warnings.push(`typography.fonts[${i}] ("${name}") claims observed but gives no evidence - recorded as an estimate.`);
    }
    out.typography.fonts.push({
      name,
      role: str(f.role, "text"),
      confidence: conf === "observed" && !evidence ? "estimated" : conf,
      evidence: evidence || undefined,
    });
  }
  out.typography.scale = str(typo.scale);
  out.typography.weights = str(typo.weights);
  out.typography.casing = str(typo.casing ?? typo.case);
  out.typography.tracking = str(typo.tracking);
  out.typography.hierarchy = str(typo.hierarchy);

  // layout / hero --------------------------------------------------
  const layout = (raw.layout ?? {}) as Record<string, unknown>;
  out.layout = {
    grid: str(layout.grid),
    spacing: str(layout.spacing),
    density: str(layout.density),
    alignment: str(layout.alignment),
    containerWidth: str(layout.containerWidth),
  };
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  out.hero = { composition: str(hero.composition), imageTreatment: str(hero.imageTreatment) };

  // components -----------------------------------------------------
  for (const [i, item] of (Array.isArray(raw.components) ? raw.components : []).entries()) {
    if (!item || typeof item !== "object") { warnings.push(`components[${i}] is not an object - skipped.`); continue; }
    const c = item as Record<string, unknown>;
    const name = str(c.name);
    if (!name) { warnings.push(`components[${i}] has no name - skipped.`); continue; }
    out.components.push({ name, description: str(c.description), confidence: confidence(c.confidence) });
  }

  // motion ---------------------------------------------------------
  const motion = (raw.motion ?? {}) as Record<string, unknown>;
  out.motion = { notes: str(motion.notes), confidence: confidence(motion.confidence) };

  out.facts = strArray(raw.facts, 40);
  out.estimates = strArray(raw.estimates, 40);

  if (!out.colors.length && !out.typography.fonts.length && !out.aestheticFamily) {
    errors.push("Nothing usable was found: no aesthetic family, no colours and no fonts.");
  }
  return { analysis: out, errors, warnings };
}

/* ------------------------------------------------------------------ *
 * Observed-only analysis, built from a live page
 *
 * No model involved. Every value here came from getComputedStyle, so the
 * whole thing is marked `observed` - including the font names, which is the
 * one place a font can be named with certainty.
 * ------------------------------------------------------------------ */
export function analysisFromProbe(probe: ObservedProbe): Analysis {
  const a = emptyAnalysis();

  a.colors = probe.colors.slice(0, 10).map((c, i) => ({
    hex: c.hex,
    role: i === 0 ? "background / dominant" : c.where === "text" ? "text" : "surface or accent",
    name: describeColor(c.hex),
    share: c.usage,
    confidence: "observed" as const,
  }));

  a.typography.fonts = probe.fonts.slice(0, 5).map((f, i) => ({
    name: f.family,
    role: i === 0 ? "body / dominant" : "secondary",
    confidence: "observed" as const,
    evidence: `Applied font-family on the live page; carries ~${f.usage} characters of text.`,
  }));
  const h = probe.headings;
  if (h.length) {
    a.typography.scale = h.map((x) => `${x.tag} ${x.fontSize}`).join(", ") + `, body ${probe.body.fontSize}`;
    a.typography.weights = [...new Set(h.map((x) => x.fontWeight))].join(", ");
    a.typography.hierarchy = `${h.length} heading levels present; largest is ${h[0]?.tag} at ${h[0]?.fontSize}.`;
  }

  if (probe.containerWidths.length) {
    a.layout.containerWidth = `${probe.containerWidths[0]}px (measured on the live page)`;
  }
  a.layout.grid = probe.breakpoints.length
    ? `Responsive; breakpoints declared in the page's own stylesheets: ${probe.breakpoints.join(", ")}.`
    : "";
  a.layout.alignment = probe.dir ? `Document direction: ${probe.dir}.` : "";

  a.components = probe.buttons.slice(0, 4).map((b) => ({
    name: b.text ? `Button "${b.text}"` : "Button",
    description: `background ${b.background}, text ${b.color}, radius ${b.radius}, padding ${b.padding}, font-size ${b.fontSize}`,
    confidence: "observed" as const,
  }));
  if (probe.radii.length) {
    a.components.push({
      name: "Corner radius system",
      description: `Most common radii on the page: ${probe.radii.join(", ")}.`,
      confidence: "observed",
    });
  }

  const m = probe.motion;
  a.motion = {
    notes:
      m.transitions || m.animations
        ? `The live page declares ${m.transitions} elements with CSS transitions and ${m.animations} with keyframe animations. ` +
          (m.sample.length ? `Examples: ${m.sample.slice(0, 3).join("; ")}. ` : "") +
          (m.prefersReducedMotionQuery
            ? "It also ships a prefers-reduced-motion query."
            : "No prefers-reduced-motion query was found in its own stylesheets.")
        : "No CSS transitions or keyframe animations were found on the loaded page.",
    confidence: "observed",
  };

  a.facts = [
    `Captured from the live site on ${new Date(probe.capturedAt).toLocaleString()}.`,
    probe.title ? `Document title: ${probe.title}` : "",
    `Body type: ${probe.body.fontFamily} at ${probe.body.fontSize} / line-height ${probe.body.lineHeight}.`,
    `Body colours: text ${probe.body.color} on ${probe.body.background}.`,
    probe.lang ? `Declared language: ${probe.lang}${probe.dir ? `, direction ${probe.dir}` : ""}.` : "",
    probe.viewportMeta ? `Viewport meta: ${probe.viewportMeta}` : "",
    probe.images.count ? `${probe.images.count} images, ${probe.images.withObjectFit} using object-fit cropping.` : "",
  ].filter(Boolean);

  a.hero.composition = "";
  a.estimates = [];
  return a;
}

/** Merges observed values over a model's analysis - measurements win. */
export function mergeObservedOver(base: Analysis, observedAnalysis: Analysis): Analysis {
  const merged: Analysis = JSON.parse(JSON.stringify(base));
  // Fonts read off the page replace any guessed font of the same role.
  const observedNames = new Set(observedAnalysis.typography.fonts.map((f) => f.name.toLowerCase()));
  merged.typography.fonts = [
    ...observedAnalysis.typography.fonts,
    ...merged.typography.fonts.filter((f) => !observedNames.has(f.name.toLowerCase())).map((f) => ({ ...f, confidence: "estimated" as const })),
  ].slice(0, 8);
  // Colours: keep the measured ones first, then any the model added.
  const observedHex = new Set(observedAnalysis.colors.map((c) => c.hex.toLowerCase()));
  merged.colors = [
    ...observedAnalysis.colors,
    ...merged.colors.filter((c) => !observedHex.has(c.hex.toLowerCase())),
  ].slice(0, 20) as Swatch[];
  merged.motion = observedAnalysis.motion;
  if (observedAnalysis.layout.containerWidth) merged.layout.containerWidth = observedAnalysis.layout.containerWidth;
  if (observedAnalysis.layout.grid) merged.layout.grid = observedAnalysis.layout.grid;
  merged.facts = [...new Set([...observedAnalysis.facts, ...merged.facts])];
  merged.components = [...observedAnalysis.components, ...merged.components].slice(0, 14);
  return merged;
}

/**
 * The last gate before an analysis is stored.
 *
 * A still image cannot prove movement, and it cannot prove a typeface either.
 * The instruction says so, but an instruction is not an enforcement - so
 * anything claiming to be "observed" on a reference that has no live-page
 * measurement is demoted here, with a note saying why. This is the difference
 * between a tool that separates fact from guess and a tool that says it does.
 */
export function enforceEvidence(
  analysis: Analysis,
  hasLiveMeasurements: boolean,
): { analysis: Analysis; warnings: string[] } {
  if (hasLiveMeasurements) return { analysis, warnings: [] };
  const warnings: string[] = [];
  const next: Analysis = JSON.parse(JSON.stringify(analysis));

  if (next.motion.confidence === "observed") {
    next.motion.confidence = "estimated";
    warnings.push(
      "Motion was marked observed, but this reference is a still image - recorded as a suggestion. " +
        "Capture the live site to observe motion for real.",
    );
  }
  for (const font of next.typography.fonts) {
    if (font.confidence === "observed") {
      font.confidence = "estimated";
      warnings.push(`"${font.name}" was marked observed, but a typeface cannot be confirmed from a picture - recorded as an estimate.`);
    }
  }
  for (const color of next.colors) {
    if (color.confidence === "observed") {
      color.confidence = "estimated";
    }
  }
  if (next.colors.length && !warnings.some((w) => w.includes("Colour"))) {
    const demoted = analysis.colors.filter((c) => c.confidence === "observed").length;
    if (demoted) {
      warnings.push(
        `${demoted} colour${demoted === 1 ? "" : "s"} marked observed: sampled from a compressed image, so recorded as approximate.`,
      );
    }
  }
  return { analysis: next, warnings };
}
