import { writeFileSync } from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import { FILES_DIR, ensureDirs } from "./paths";
import { guardUrl, isBlockedAddress } from "./net-guard";
import { inspectImage, MAX_UPLOAD_BYTES } from "./image-info";
import { pageProbe } from "./probe-script";
import { newId } from "./ids";
import type { Browser } from "playwright";
import type { Asset, ObservedProbe } from "./types";

export interface CaptureOptions {
  desktop: { width: number; height: number };
  mobile: { width: number; height: number };
  timeoutMs: number;
  fullPage: boolean;
}

export interface CaptureResult {
  ok: boolean;
  assets: Asset[];
  observed?: ObservedProbe;
  title?: string;
  httpStatus?: number;
  error?: string;
  /** True when Playwright itself is missing, so the UI can say what to install. */
  browserMissing?: boolean;
}

/**
 * Launch options.
 *
 *   STUDIO_CHROMIUM_PATH  a Chromium or Chrome binary you already have, instead
 *                         of the one Playwright downloads.
 *   STUDIO_PROXY          an outbound proxy (falls back to HTTPS_PROXY /
 *                         HTTP_PROXY). Needed on networks that have no direct
 *                         route out.
 *   STUDIO_INSECURE_TLS   only for a proxy that intercepts TLS with its own
 *                         certificate. Off unless you set it: a screenshot tool
 *                         that ignores certificate errors by default would be
 *                         lying to you about what it fetched.
 */
export function proxyServer(): string | undefined {
  const value = (process.env.STUDIO_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
  return value || undefined;
}

export function insecureTls(): boolean {
  return process.env.STUDIO_INSECURE_TLS === "1";
}

export function launchOptions() {
  const executablePath = process.env.STUDIO_CHROMIUM_PATH?.trim();
  const proxy = proxyServer();
  // Honour NO_PROXY, so hosts the machine reaches directly are not tunnelled.
  const bypass = (process.env.NO_PROXY || process.env.no_proxy || "").trim();
  return {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    ...(proxy ? { proxy: { server: proxy, ...(bypass ? { bypass } : {}) } } : {}),
  };
}

/** Is a usable browser available right now? Used by the capability probe. */
export async function browserStatus(): Promise<{ available: boolean; reason?: string; version?: string }> {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { available: false, reason: "The 'playwright' package is not installed." };
  }
  try {
    const browser = await chromium.launch(launchOptions());
    const version = browser.version();
    await browser.close();
    return { available: true, version };
  } catch (err) {
    return {
      available: false,
      reason:
        `Chromium could not start (${(err as Error).message.split("\n")[0]}). ` +
        "Run `npx playwright install chromium`, or set STUDIO_CHROMIUM_PATH to a Chrome or Chromium binary you already have.",
    };
  }
}

/**
 * Is this host one the browser must not be sent to? Literal addresses are
 * judged directly; names are resolved once and remembered for this capture.
 */
async function isHostBlocked(host: string, cache: Map<string, boolean>): Promise<boolean> {
  const cached = cache.get(host);
  if (cached !== undefined) return cached;

  let blocked: boolean;
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local")) {
    blocked = true;
  } else if (net.isIP(host)) {
    blocked = isBlockedAddress(host);
  } else {
    try {
      const records = await dns.lookup(host, { all: true, verbatim: true });
      blocked = records.length === 0 || records.some((r) => isBlockedAddress(r.address));
    } catch {
      // Unresolvable: let the browser fail it in the ordinary way rather than
      // reporting a security block for what is really a dead link.
      blocked = false;
    }
  }
  cache.set(host, blocked);
  return blocked;
}

function saveShot(buf: Buffer, role: Asset["role"], label: string): Asset {
  ensureDirs();
  const info = inspectImage(buf);
  const file = `${newId("cap")}.png`;
  writeFileSync(path.join(FILES_DIR, file), buf);
  return {
    id: newId("as"),
    role,
    file,
    mime: "image/png",
    bytes: buf.length,
    width: info?.width ?? 0,
    height: info?.height ?? 0,
    label,
  };
}

/**
 * Downloads a page's own preview image. Same rules as everything else the
 * browser is pointed at: public http(s) only, host resolved and checked, bytes
 * trusted over the declared type, and a failure is simply no artwork rather
 * than a failed capture.
 */
async function fetchArtwork(
  browser: Browser,
  rawUrl: string,
  hostCache: Map<string, boolean>,
  timeoutMs: number,
): Promise<Asset | null> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (await isHostBlocked(url.hostname.replace(/^\[|\]$/g, ""), hostCache)) return null;

  const context = await browser.newContext({ ignoreHTTPSErrors: insecureTls() });
  try {
    const response = await context.request.get(url.toString(), { timeout: timeoutMs });
    if (!response.ok()) return null;
    const buf = Buffer.from(await response.body());
    if (!buf.length || buf.length > MAX_UPLOAD_BYTES) return null;
    const info = inspectImage(buf);
    if (!info) return null;
    const file = `${newId("art")}.${info.ext}`;
    writeFileSync(path.join(FILES_DIR, file), buf);
    return {
      id: newId("as"),
      role: "artwork",
      file,
      mime: info.mime,
      bytes: buf.length,
      width: info.width ?? 0,
      height: info.height ?? 0,
      label: "The page's own preview image",
    };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Opens the URL in a real browser, reads what the live page is actually doing,
 * and saves a desktop and a mobile screenshot. Anything that fails here is
 * reported, never thrown away - the reference keeps the link and the user can
 * upload screenshots by hand instead.
 */
export async function captureUrl(rawUrl: string, opts: CaptureOptions): Promise<CaptureResult> {
  const guard = await guardUrl(rawUrl);
  if (!guard.ok || !guard.url) return { ok: false, assets: [], error: guard.reason };

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return {
      ok: false,
      assets: [],
      browserMissing: true,
      error: "Playwright is not installed. Run `npm install` in the repository root, then `npx playwright install chromium`.",
    };
  }

  const target = guard.url.toString();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
  } catch (err) {
    return {
      ok: false,
      assets: [],
      browserMissing: true,
      error:
        `Chromium could not start (${(err as Error).message.split("\n")[0]}). ` +
        "Run `npx playwright install chromium`, or set STUDIO_CHROMIUM_PATH to a Chrome or Chromium binary you already have.",
    };
  }

  const assets: Asset[] = [];
  const hostCache = new Map<string, boolean>();
  let observed: ObservedProbe | undefined;
  let title: string | undefined;
  let httpStatus: number | undefined;
  let artworkUrl = "";

  try {
    const shoot = async (viewport: { width: number; height: number }, isMobile: boolean) => {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        isMobile,
        hasTouch: isMobile,
        // A plain, honest desktop/mobile Chrome. No cloaking.
        userAgent: isMobile
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          : undefined,
        // Reduce motion so a full-page shot is not caught mid-animation.
        reducedMotion: "reduce",
        serviceWorkers: "block",
        ignoreHTTPSErrors: insecureTls(),
      });
      // Second line of defence: the page itself may pull in subresources, and
      // one of those could point at the private network the browser cannot
      // reach but this server can. Each distinct host is resolved once and the
      // answer cached - a page has a handful of hosts, not hundreds.
      await context.route("**/*", async (route) => {
        try {
          const url = new URL(route.request().url());
          if (url.protocol !== "http:" && url.protocol !== "https:") return route.continue();
          const host = url.hostname.replace(/^\[|\]$/g, "");
          if (!host) return route.continue();
          if (await isHostBlocked(host, hostCache)) return await route.abort("blockedbyclient");
        } catch { /* not a URL we can judge - let Playwright decide */ }
        return route.continue();
      });

      const page = await context.newPage();
      page.setDefaultTimeout(opts.timeoutMs);
      const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs });
      httpStatus = response?.status() ?? httpStatus;
      // Let webfonts land and lazy images decode, without hanging on a page
      // that never goes idle (analytics beacons, chat widgets, video).
      await page.waitForLoadState("networkidle", { timeout: Math.min(8000, opts.timeoutMs) }).catch(() => {});
      await page.evaluate(() => new Promise<void>((done) => {
        const step = 900;
        let y = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          y += step;
          if (y >= document.body.scrollHeight) { clearInterval(timer); window.scrollTo(0, 0); done(); }
        }, 60);
        setTimeout(() => { clearInterval(timer); window.scrollTo(0, 0); done(); }, 3000);
      })).catch(() => {});
      // The scroll above is what makes lazy images start loading, so the wait
      // for them has to come after it. Without this a gallery screenshots as a
      // page of empty grey boxes - the chrome around the work, not the work.
      await page.waitForLoadState("networkidle", { timeout: Math.min(8000, opts.timeoutMs) }).catch(() => {});
      await page.waitForFunction(
        () => Array.from(document.images).every((img) => img.complete),
        undefined,
        { timeout: Math.min(8000, opts.timeoutMs) },
      ).catch(() => {});
      await page.waitForTimeout(500);

      if (!isMobile) {
        title = await page.title().catch(() => undefined);
        observed = (await page.evaluate(pageProbe).catch(() => undefined)) as ObservedProbe | undefined;
        artworkUrl = await page.evaluate(() => {
          const pick = (selector: string) =>
            document.querySelector<HTMLMetaElement>(selector)?.content?.trim() || "";
          const raw =
            pick('meta[property="og:image"]') ||
            pick('meta[name="og:image"]') ||
            pick('meta[name="twitter:image"]') ||
            pick('meta[property="twitter:image"]');
          if (!raw) return "";
          try { return new URL(raw, document.baseURI).toString(); } catch { return ""; }
        }).catch(() => "");
      }
      const buf = await page.screenshot({ fullPage: opts.fullPage, type: "png" });
      await context.close();
      return Buffer.from(buf);
    };

    const desktopShot = await shoot(opts.desktop, false);
    assets.push(saveShot(desktopShot, "desktop", `Desktop ${opts.desktop.width}x${opts.desktop.height}`));

    // On a gallery or portfolio page the screenshot is the site's furniture -
    // header, sidebar, comment box - wrapped around the work. The page's own
    // preview image is the work itself, published by the site for exactly this
    // purpose, so keep it alongside and let the card lead with it.
    if (artworkUrl) {
      const art = await fetchArtwork(browser, artworkUrl, hostCache, opts.timeoutMs);
      if (art) assets.push(art);
    }

    // A screenshot of an error page is still a screenshot. Saying so beats
    // letting someone build a brief out of "403 Forbidden".
    const httpProblem = httpStatus && httpStatus >= 400
      ? `The site answered HTTP ${httpStatus}, so what was captured is probably an error or block page, not the design. ` +
        "Check the link, or upload a screenshot by hand."
      : undefined;

    try {
      const mobileShot = await shoot(opts.mobile, true);
      assets.push(saveShot(mobileShot, "mobile", `Mobile ${opts.mobile.width}x${opts.mobile.height}`));
    } catch (err) {
      // A desktop capture that worked is worth keeping even if mobile failed.
      return {
        ok: true, assets, observed, title, httpStatus,
        error: [httpProblem, `Mobile capture failed: ${(err as Error).message.split("\n")[0]}`].filter(Boolean).join(" "),
      };
    }

    return { ok: true, assets, observed, title, httpStatus, error: httpProblem };
  } catch (err) {
    const message = (err as Error).message.split("\n")[0];
    return { ok: false, assets, observed, title, httpStatus, error: message };
  } finally {
    await browser.close().catch(() => {});
  }
}
