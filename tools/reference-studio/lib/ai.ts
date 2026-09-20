import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { FILES_DIR } from "./paths";
import { prepareForVision } from "./vision-image";
import { buildAnalysisInstruction } from "./analysis-prompt";
import { normalizeAnalysis, analysisFromProbe, mergeObservedOver, enforceEvidence } from "./analysis";
import type { Analysis, Reference } from "./types";
import { byCoverOrder } from "./cover";

export interface AiResult {
  ok: boolean;
  analysis?: Analysis;
  model?: string;
  errors: string[];
  warnings: string[];
  usage?: { input: number; output: number };
}

/** Pulls the JSON object out of a reply, tolerating a stray fence or preamble. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost balanced braces.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch { /* fall through */ }
    }
    throw new Error("The reply was not valid JSON.");
  }
}

/**
 * Real vision analysis. Runs only when an API key is configured; the key stays
 * in data/library.json on this machine and is never sent to the browser.
 */
export async function analyzeWithAi(ref: Reference, apiKey: string, model: string): Promise<AiResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Send at most three images, in the same order the card picks its cover:
  // what a person uploaded first, then the page's own preview, then shots.
  const assets = byCoverOrder(ref.assets).slice(0, 3);
  if (!assets.length) {
    return { ok: false, errors: ["This reference has no image to analyse. Capture the URL or upload a screenshot first."], warnings };
  }

  const images: { base64: string; mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" }[] = [];
  for (const asset of assets) {
    const prepared = await prepareForVision(path.join(FILES_DIR, asset.file));
    if (prepared.error) { warnings.push(`${asset.label ?? asset.role}: ${prepared.error}`); continue; }
    if (prepared.image) {
      if (prepared.image.note) warnings.push(`${asset.label ?? asset.role}: ${prepared.image.note}`);
      images.push({ base64: prepared.image.base64, mediaType: prepared.image.mediaType });
    }
  }
  if (!images.length) {
    return { ok: false, errors: ["None of this reference's images could be prepared for analysis.", ...warnings], warnings };
  }

  const client = new Anthropic({ apiKey });
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map((img): Anthropic.ContentBlockParam => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    })),
    { type: "text", text: buildAnalysisInstruction(ref) },
  ];

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, errors: ["The API key was rejected. Check it in Settings."], warnings };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, errors: ["Rate limited by the API. Wait a moment and try again."], warnings };
    }
    if (err instanceof Anthropic.BadRequestError) {
      return { ok: false, errors: [`The API rejected the request: ${err.message}`], warnings };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, errors: [`API error ${err.status ?? ""}: ${err.message}`], warnings };
    }
    return { ok: false, errors: [`Could not reach the API: ${(err as Error).message}`], warnings };
  }

  if (response.stop_reason === "refusal") {
    return { ok: false, errors: ["The model declined to analyse this image."], warnings };
  }
  if (response.stop_reason === "max_tokens") {
    warnings.push("The reply hit the token ceiling and may be truncated.");
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (!text.trim()) {
    return { ok: false, errors: ["The model returned no text to parse."], warnings };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch (err) {
    return { ok: false, errors: [(err as Error).message, `First 200 characters of the reply: ${text.slice(0, 200)}`], warnings };
  }

  const result = normalizeAnalysis(parsed);
  if (result.errors.length) {
    return { ok: false, errors: result.errors, warnings: [...warnings, ...result.warnings] };
  }

  // The same gate the import path uses: without live-page measurements,
  // nothing coming back from a picture is allowed to call itself observed.
  const gated = enforceEvidence(result.analysis, Boolean(ref.source?.observed));

  // Measurements always win over the model's reading of a picture.
  const analysis = ref.source?.observed
    ? mergeObservedOver(gated.analysis, analysisFromProbe(ref.source.observed))
    : gated.analysis;

  return {
    ok: true,
    analysis,
    model: response.model,
    errors,
    warnings: [...warnings, ...result.warnings, ...gated.warnings],
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
