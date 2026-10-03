import type { ObservedProbe, Reference } from "./types";

/**
 * One instruction, used by BOTH analysis paths - the direct API call and the
 * package you hand to Claude Code. If they drifted apart, an imported analysis
 * would not be interchangeable with a generated one, and the whole "works
 * without an API key" promise would be a lie.
 */
export const ANALYSIS_SCHEMA = `{
  "aestheticFamily": "string - name the style family in a few words",
  "vocabulary": ["string - design terms a designer would use for this"],
  "character": "string - what actually gives this design its character",
  "adaptation": ["string - practical ways to carry this into a different project"],
  "colors": [{ "hex": "#rrggbb", "role": "background | surface | text | accent | ...", "name": "optional plain name", "confidence": "observed | estimated" }],
  "typography": {
    "fonts": [{ "name": "string", "role": "display | body | mono | ...", "confidence": "observed | estimated", "evidence": "required when confidence is observed - say HOW it is known" }],
    "scale": "string - the size ladder you can see",
    "weights": "string",
    "casing": "string",
    "tracking": "string",
    "hierarchy": "string - how the levels separate"
  },
  "layout": { "grid": "string", "spacing": "string", "density": "string", "alignment": "string", "containerWidth": "string" },
  "hero": { "composition": "string", "imageTreatment": "string" },
  "components": [{ "name": "string", "description": "string", "confidence": "observed | estimated" }],
  "motion": { "notes": "string", "confidence": "observed | estimated" },
  "facts": ["string - things visible in the material you were given"],
  "estimates": ["string - things you inferred and could be wrong about"]
}`;

export const ANALYSIS_RULES = `Rules that matter more than completeness:

1. SEPARATE FACT FROM ESTIMATE. Every colour, font and component carries a
   "confidence". Use "observed" only for something present in the material you
   were actually given. Everything else is "estimated".

2. NEVER NAME A FONT AS FACT FROM A PICTURE. Identifying a typeface from a
   rendered image is a guess, however confident it feels. Set
   confidence:"estimated" and describe the letterforms - proportions, contrast,
   terminals, x-height - so the shape can be matched. Use "observed" for a font
   ONLY when the material includes a measurement from the live page, and then
   put that measurement in "evidence".

3. A STILL IMAGE DOES NOT PROVE MOTION OR RESPONSIVE BEHAVIOUR. If you are
   looking at a screenshot, any animation or breakpoint claim is a suggestion:
   confidence:"estimated", and word it as "would suit" rather than "does".

4. COLOURS ARE APPROXIMATE unless measured. Screenshot compression and display
   profiles shift hex values. Mark sampled-by-eye colours "estimated".

5. BE USEFUL, NOT EXHAUSTIVE. "adaptation" is the part a person will actually
   read: say what to carry over and what would not survive the move.`;

/** The observed measurements, rendered for the model as ground truth. */
export function observedBlock(probe: ObservedProbe | undefined): string {
  if (!probe) return "";
  const lines: string[] = [];
  lines.push("MEASURED FROM THE LIVE PAGE (these are facts - treat every value here as confidence:\"observed\"):");
  if (probe.title) lines.push(`- Document title: ${probe.title}`);
  if (probe.lang || probe.dir) lines.push(`- Language ${probe.lang || "?"}, direction ${probe.dir || "?"}`);
  if (probe.fonts.length) {
    lines.push("- Applied font families, most-used first:");
    for (const f of probe.fonts.slice(0, 6)) lines.push(`    ${f.family} (carries ~${f.usage} characters)`);
  }
  lines.push(`- Body: ${probe.body.fontFamily} ${probe.body.fontSize}/${probe.body.lineHeight}, ${probe.body.color} on ${probe.body.background}`);
  if (probe.headings.length) {
    lines.push("- Heading ladder: " + probe.headings.map((h) => `${h.tag} ${h.fontSize} w${h.fontWeight}`).join(", "));
  }
  if (probe.colors.length) {
    lines.push("- Painted colours by share of area: " + probe.colors.slice(0, 8).map((c) => `${c.hex} (${Math.round(c.usage * 100)}% ${c.where})`).join(", "));
  }
  if (probe.containerWidths.length) lines.push(`- Content container measures ${probe.containerWidths.join("px, ")}px`);
  if (probe.radii.length) lines.push(`- Corner radii in use: ${probe.radii.join(", ")}`);
  if (probe.buttons.length) {
    lines.push("- Buttons:");
    for (const b of probe.buttons.slice(0, 4)) lines.push(`    "${b.text}" bg ${b.background} fg ${b.color} radius ${b.radius} padding ${b.padding}`);
  }
  lines.push(`- Motion declared in CSS: ${probe.motion.transitions} transitions, ${probe.motion.animations} keyframe animations${probe.motion.prefersReducedMotionQuery ? ", and a prefers-reduced-motion query" : ", no prefers-reduced-motion query"}`);
  if (probe.breakpoints.length) lines.push(`- Breakpoints in the page's own stylesheets: ${probe.breakpoints.join(", ")}`);
  if (probe.viewportMeta) lines.push(`- Viewport meta: ${probe.viewportMeta}`);
  lines.push("");
  lines.push("Because these came from the live page, motion and responsive behaviour ARE observed here - do not downgrade them to estimates.");
  return lines.join("\n");
}

export function buildAnalysisInstruction(ref: Reference): string {
  const observed = observedBlock(ref.source?.observed);
  const context: string[] = [];
  if (ref.title) context.push(`Title given by the user: ${ref.title}`);
  if (ref.source?.url) context.push(`Source URL: ${ref.source.url}`);
  if (ref.note) context.push(`What the user said they like about it: ${ref.note}`);
  if (ref.tags.length) context.push(`Tags: ${ref.tags.join(", ")}`);
  if (ref.purposes.length) context.push(`Kept as a reference for: ${ref.purposes.join(", ")}`);
  if (ref.use.length) context.push(`Aspects to use: ${ref.use.join("; ")}`);
  if (ref.avoid.length) context.push(`Aspects to avoid: ${ref.avoid.join("; ")}`);

  return [
    "You are a senior product designer writing a structured description of a visual reference,",
    "so it can later be turned into a build brief for a different project.",
    "",
    ref.kind === "url"
      ? "The images are screenshots of a live website (desktop first, then mobile if present)."
      : "The image is a reference picture supplied by the user.",
    "",
    context.length ? `CONTEXT FROM THE USER\n${context.map((c) => `- ${c}`).join("\n")}\n` : "",
    observed ? `${observed}\n` : "",
    ANALYSIS_RULES,
    "",
    "Return ONLY a JSON object in exactly this shape. No prose before or after, no code fence:",
    ANALYSIS_SCHEMA,
  ].filter(Boolean).join("\n");
}
