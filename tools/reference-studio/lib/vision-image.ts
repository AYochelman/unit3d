import { readFileSync } from "node:fs";
import { inspectImage } from "./image-info";

/**
 * Prepares an image for the vision API.
 *
 * Two things force this step. A full-page screenshot can be 1440x20000, which
 * is past the API's per-image limit, and sending a 6000px photo costs a lot of
 * tokens for detail the model does not use. Anthropic's guidance is that
 * roughly 1568px on the long edge is the point past which more pixels stop
 * buying accuracy.
 *
 * The resize runs in the Chromium that Playwright already installs for URL
 * captures - the studio has no image library of its own and does not need one.
 */
export const VISION_MAX_EDGE = 1568;
/** Past this the API refuses the image outright. */
export const API_MAX_EDGE = 8000;

export interface VisionImage {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  note?: string;
}

function passthrough(buf: Buffer, mime: string): VisionImage | null {
  const supported = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!supported.includes(mime)) return null;
  return { base64: buf.toString("base64"), mediaType: mime as VisionImage["mediaType"] };
}

export async function prepareForVision(absPath: string): Promise<{ image?: VisionImage; error?: string }> {
  let buf: Buffer;
  try {
    buf = readFileSync(absPath);
  } catch {
    return { error: "The image file is missing from data/files." };
  }
  const info = inspectImage(buf);
  if (!info) return { error: "That file is not a recognised image." };
  if (info.mime === "image/svg+xml" || info.mime === "image/avif") {
    return { error: `${info.mime} cannot be sent to the vision API. Export a PNG or JPEG of it first.` };
  }

  const longest = Math.max(info.width, info.height);
  const withinBudget = longest > 0 && longest <= VISION_MAX_EDGE && buf.length < 4_000_000;
  if (withinBudget) {
    const direct = passthrough(buf, info.mime);
    if (direct) return { image: direct };
  }

  // Needs a resize - or is a format we would rather normalise anyway.
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    chromium = null;
  }
  if (!chromium) {
    if (longest <= API_MAX_EDGE && buf.length < 4_000_000) {
      const direct = passthrough(buf, info.mime);
      if (direct) return { image: { ...direct, note: "Sent at full size: Playwright is not installed, so it could not be downscaled." } };
    }
    return {
      error:
        `This image is ${info.width}x${info.height} (${(buf.length / 1e6).toFixed(1)} MB), too large for the vision API, ` +
        "and Playwright is not installed to downscale it. Run `npx playwright install chromium`, or upload a smaller copy.",
    };
  }

  const { launchOptions } = await import("./capture");
  const browser = await chromium.launch(launchOptions()).catch(() => null);
  if (!browser) {
    return { error: "Chromium could not start to downscale the image. Run: npx playwright install chromium" };
  }
  try {
    const page = await browser.newPage();
    const dataUrl = `data:${info.mime};base64,${buf.toString("base64")}`;
    const resized = await page.evaluate(
      async ([src, maxEdge]) => {
        const img = new Image();
        img.decoding = "sync";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("decode failed"));
          img.src = src as string;
        });
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(1, (maxEdge as number) / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return { url: canvas.toDataURL("image/jpeg", 0.9), w: canvas.width, h: canvas.height, sw: w, sh: h };
      },
      [dataUrl, VISION_MAX_EDGE] as const,
    );
    const base64 = resized.url.split(",")[1] ?? "";
    if (!base64) return { error: "The image could not be re-encoded for analysis." };
    return {
      image: {
        base64,
        mediaType: "image/jpeg",
        note: `Downscaled from ${resized.sw}x${resized.sh} to ${resized.w}x${resized.h} for analysis.`,
      },
    };
  } catch (err) {
    return { error: `The image could not be prepared for analysis: ${(err as Error).message.split("\n")[0]}` };
  } finally {
    await browser.close().catch(() => {});
  }
}
