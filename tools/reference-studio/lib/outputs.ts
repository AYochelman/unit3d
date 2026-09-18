import { contrastRatio, describeColor } from "./color";
import { PURPOSE_LABELS } from "./types";
import type { Analysis, Reference, Swatch } from "./types";

/* Every generated artefact carries the reference it came from. That link is
 * the point of the tool: a brief you cannot trace back to a picture is just
 * an opinion. */
export function provenance(ref: Reference): string {
  const bits = [`Reference: ${ref.title || "(untitled)"} [${ref.id}]`];
  if (ref.source?.url) bits.push(`Source: ${ref.source.url}`);
  if (ref.source?.capturedAt) bits.push(`Captured: ${new Date(ref.source.capturedAt).toISOString().slice(0, 10)}`);
  const origin =
    ref.analysisMeta.source === "ai" ? `AI analysis (${ref.analysisMeta.model ?? "model"})`
    : ref.analysisMeta.source === "imported" ? "Imported analysis (Claude Code)"
    : ref.analysisMeta.source === "observed" ? "Read from the live page"
    : ref.analysisMeta.source === "manual" ? "Written by hand"
    : "No analysis yet";
  bits.push(`Analysis: ${origin}${ref.analysisMeta.editedAt ? ", edited by hand" : ""}`);
  return bits.join(" | ");
}

const mark = (c: Swatch) => (c.confidence === "observed" ? "" : " *(estimated)*");

function paletteBlock(colors: Swatch[]): string {
  if (!colors.length) return "_No palette recorded._";
  const lines = colors.map((c) => `- \`${c.hex}\` - ${c.role || "unassigned"}${c.name ? ` (${c.name})` : ""}${mark(c)}`);
  const bg = colors[0]?.hex;
  const text = colors.find((c) => /text|foreground|ink/i.test(c.role ?? ""))?.hex;
  if (bg && text) {
    const ratio = contrastRatio(bg, text);
    lines.push(
      `- Contrast of the recorded text colour on the dominant background: **${ratio}:1** ` +
        `(${ratio >= 4.5 ? "passes WCAG AA for body text" : ratio >= 3 ? "large text only" : "below AA - do not reuse this pairing for body copy"}).`,
    );
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * 1. Design brief - what to actually build
 * ------------------------------------------------------------------ */
export function designBrief(ref: Reference): string {
  const a = ref.analysis;
  const L = (s: string | undefined, fallback = "_not recorded_") => (s && s.trim() ? s : fallback);
  const purposes = ref.purposes.map((p) => PURPOSE_LABELS[p].en).join(", ") || "not labelled";

  if (!a) {
    return [
      `# Design brief - ${ref.title || "untitled reference"}`,
      "",
      `> ${provenance(ref)}`,
      "",
      "This reference has no analysis yet, so there is nothing to translate into",
      "implementation guidance. Run an analysis (AI or imported), or write one by",
      "hand, then copy the brief again.",
      "",
      ref.note ? `## What I said I liked\n${ref.note}` : "",
    ].filter(Boolean).join("\n");
  }

  const out: string[] = [];
  out.push(`# Design brief - ${ref.title || "untitled reference"}`);
  out.push("");
  out.push(`> ${provenance(ref)}`);
  out.push(`> Kept as a reference for: ${purposes}`);
  out.push("");
  out.push("Values marked *(estimated)* were inferred and should be verified before you rely on them.");
  out.push("");

  out.push("## The direction in one line");
  out.push(L(a.aestheticFamily, "_no aesthetic family recorded_"));
  if (a.vocabulary.length) out.push("", `**Vocabulary:** ${a.vocabulary.join(" · ")}`);
  if (a.character) out.push("", `**What gives it character:** ${a.character}`);
  if (ref.note) out.push("", `**What I said I liked:** ${ref.note}`);

  if (ref.use.length || ref.avoid.length) {
    out.push("", "## Take this, leave that");
    for (const item of ref.use) out.push(`- **Use:** ${item}`);
    for (const item of ref.avoid) out.push(`- **Avoid:** ${item}`);
  }

  out.push("", "## Colour");
  out.push(paletteBlock(a.colors));

  out.push("", "## Type");
  if (a.typography.fonts.length) {
    for (const f of a.typography.fonts) {
      const tail = f.confidence === "observed"
        ? f.evidence ? ` - **confirmed**: ${f.evidence}` : " - **confirmed**"
        : " *(estimated - identify before use, or pick a stand-in with the same proportions)*";
      out.push(`- **${f.name}** - ${f.role}${tail}`);
    }
  } else out.push("_No fonts recorded._");
  const typoRows: [string, string][] = [
    ["Scale", a.typography.scale], ["Weights", a.typography.weights],
    ["Case", a.typography.casing], ["Tracking", a.typography.tracking], ["Hierarchy", a.typography.hierarchy],
  ];
  const typoUsed = typoRows.filter(([, v]) => v && v.trim());
  if (typoUsed.length) { out.push(""); for (const [k, v] of typoUsed) out.push(`- **${k}:** ${v}`); }

  out.push("", "## Layout");
  const layoutRows: [string, string][] = [
    ["Grid", a.layout.grid], ["Spacing", a.layout.spacing], ["Density", a.layout.density],
    ["Alignment", a.layout.alignment], ["Container width", a.layout.containerWidth],
  ];
  const layoutUsed = layoutRows.filter(([, v]) => v && v.trim());
  out.push(layoutUsed.length ? layoutUsed.map(([k, v]) => `- **${k}:** ${v}`).join("\n") : "_No layout notes recorded._");

  if (a.hero.composition || a.hero.imageTreatment) {
    out.push("", "## Hero");
    if (a.hero.composition) out.push(`- **Composition:** ${a.hero.composition}`);
    if (a.hero.imageTreatment) out.push(`- **Image treatment:** ${a.hero.imageTreatment}`);
  }

  if (a.components.length) {
    out.push("", "## Components");
    for (const c of a.components) {
      out.push(`- **${c.name}**${c.confidence === "estimated" ? " *(estimated)*" : ""} - ${c.description}`);
    }
  }

  out.push("", "## Motion");
  out.push(
    a.motion.notes
      ? a.motion.confidence === "observed"
        ? a.motion.notes
        : `${a.motion.notes}\n\n_This is a suggestion, not an observation: a still image cannot show movement. Confirm it against the live site before building it._`
      : "_No motion recorded._",
  );

  out.push("", "## How to adapt this to another project");
  out.push(a.adaptation.length ? a.adaptation.map((x) => `- ${x}`).join("\n") : "_No adaptation notes recorded._");

  if (a.facts.length || a.estimates.length) {
    out.push("", "## Observed vs estimated");
    if (a.facts.length) { out.push("", "**Observed**"); for (const f of a.facts) out.push(`- ${f}`); }
    if (a.estimates.length) { out.push("", "**Estimated**"); for (const e of a.estimates) out.push(`- ${e}`); }
  }
  return out.join("\n");
}

/* ------------------------------------------------------------------ *
 * 2. Image-generation prompt
 * ------------------------------------------------------------------ */
export function imagePrompt(ref: Reference, aspect = "16:9"): string {
  const a = ref.analysis;
  const palette = (a?.colors ?? []).slice(0, 5).map((c) => `${c.hex} (${c.name ?? describeColor(c.hex)})`).join(", ");
  const heroRef = ref.purposes.includes("hero");
  const parts: string[] = [];

  parts.push(
    heroRef
      ? "A wide hero photograph for a website header."
      : "A single still image to sit inside a website section.",
  );
  if (a?.hero.composition) parts.push(`Composition: ${a.hero.composition}`);
  else parts.push("Composition: one clear subject placed off-centre, generous negative space around it, horizon or main line kept low so the frame reads calm.");

  parts.push(
    "Leave a deliberately empty area across the upper third of the frame - clean, low-detail and even in tone - so a headline can sit over it at high contrast without a scrim.",
  );
  if (palette) parts.push(`Colour: built from ${palette}. Keep the palette closed - no colours outside it.`);
  if (a?.hero.imageTreatment) parts.push(`Treatment: ${a.hero.imageTreatment}`);
  parts.push(
    "Lighting: soft directional key from one side with a long, gentle falloff; no harsh speculars; shadows readable rather than crushed.",
  );
  parts.push(
    "Texture: fine natural grain, believable material surfaces, no plastic sheen, no over-sharpening, no HDR halos.",
  );
  const mood = [a?.aestheticFamily, a?.character, ...(a?.vocabulary ?? []).slice(0, 4)].filter(Boolean).join("; ");
  parts.push(`Mood: ${mood || "restrained, confident, quiet"}.`);
  parts.push(`Aspect ratio: ${aspect}.`);
  parts.push("No text, no lettering, no logos, no watermarks, no UI elements, no borders.");
  if (ref.avoid.length) parts.push(`Avoid: ${ref.avoid.join("; ")}.`);

  return [
    parts.join("\n\n"),
    "",
    "---",
    `Derived from - ${provenance(ref)}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * 3. Design tokens - JSON and CSS custom properties
 * ------------------------------------------------------------------ */
export interface TokenBundle { json: string; css: string }

function tokenName(role: string, index: number): string {
  const cleaned = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned && cleaned.length < 24 ? cleaned : `color-${index + 1}`;
}

export function designTokens(ref: Reference): TokenBundle {
  const a: Analysis | undefined = ref.analysis;
  const used = new Map<string, number>();
  const uniqueName = (base: string) => {
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };

  const colorTokens = (a?.colors ?? []).map((c, i) => ({
    name: uniqueName(tokenName(c.role ?? "", i)),
    value: c.hex,
    role: c.role ?? "",
    estimated: c.confidence !== "observed",
  }));
  const fontTokens = (a?.typography.fonts ?? []).map((f, i) => ({
    name: uniqueName(tokenName(f.role ?? "", i) || `font-${i + 1}`),
    value: f.name,
    role: f.role,
    estimated: f.confidence !== "observed",
    evidence: f.evidence ?? null,
  }));

  const json = JSON.stringify(
    {
      $schema: "reference-studio/design-tokens@1",
      source: {
        referenceId: ref.id,
        title: ref.title,
        url: ref.source?.url ?? null,
        capturedAt: ref.source?.capturedAt ?? null,
        analysisSource: ref.analysisMeta.source,
        analysisModel: ref.analysisMeta.model ?? null,
        generatedAt: new Date().toISOString(),
      },
      note: "Any token with \"estimated\": true was inferred, not measured. Verify before shipping.",
      color: Object.fromEntries(colorTokens.map((t) => [t.name, { value: t.value, role: t.role, estimated: t.estimated }])),
      font: Object.fromEntries(fontTokens.map((t) => [t.name, { value: t.value, role: t.role, estimated: t.estimated, evidence: t.evidence }])),
      typography: {
        scale: { value: a?.typography.scale ?? "", estimated: true },
        weights: { value: a?.typography.weights ?? "", estimated: true },
        tracking: { value: a?.typography.tracking ?? "", estimated: true },
        casing: { value: a?.typography.casing ?? "", estimated: true },
      },
      layout: {
        containerWidth: { value: a?.layout.containerWidth ?? "", estimated: !/measured/i.test(a?.layout.containerWidth ?? "") },
        grid: { value: a?.layout.grid ?? "", estimated: true },
        spacing: { value: a?.layout.spacing ?? "", estimated: true },
        density: { value: a?.layout.density ?? "", estimated: true },
      },
      motion: { notes: a?.motion.notes ?? "", estimated: a?.motion.confidence !== "observed" },
    },
    null,
    2,
  );

  const cssLines: string[] = [];
  cssLines.push("/* Design tokens from Reference Studio");
  cssLines.push(` * ${provenance(ref)}`);
  cssLines.push(" * Lines marked ESTIMATED were inferred, not measured. Verify before shipping.");
  cssLines.push(" */");
  cssLines.push(":root {");
  if (colorTokens.length) cssLines.push("  /* colour */");
  for (const t of colorTokens) {
    cssLines.push(`  --${t.name}: ${t.value};${t.estimated ? " /* ESTIMATED */" : ""}`);
  }
  if (fontTokens.length) cssLines.push("", "  /* type */");
  for (const t of fontTokens) {
    cssLines.push(`  --font-${t.name}: "${t.value}";${t.estimated ? " /* ESTIMATED - font not verified */" : ""}`);
  }
  const container = a?.layout.containerWidth?.match(/(\d{3,4})\s*px/)?.[1];
  if (container) {
    cssLines.push("", "  /* layout */");
    cssLines.push(`  --container-width: ${container}px;${/measured/i.test(a?.layout.containerWidth ?? "") ? "" : " /* ESTIMATED */"}`);
  }
  const radius = a?.components.find((c) => /radius/i.test(c.name))?.description.match(/(\d+)px/)?.[1];
  if (radius) cssLines.push(`  --radius: ${radius}px;`);
  cssLines.push("}");

  return { json, css: cssLines.join("\n") };
}
