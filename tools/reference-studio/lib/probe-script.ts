/**
 * The body of the function Playwright evaluates inside the captured page.
 *
 * Everything it returns is a FACT about the live document - computed styles,
 * real font stacks, real transition counts - which is what lets the analysis
 * separate "observed" from "estimated". It runs in the page's world, so it is
 * written as a self-contained function with no imports and no TypeScript that
 * needs a runtime.
 */
export function pageProbe() {
  const seen = (sel: string) => Array.from(document.querySelectorAll(sel));
  const count = <T>(items: T[], key: (item: T) => string | null) => {
    const map = new Map<string, { n: number; sample: string }>();
    for (const item of items) {
      const k = key(item);
      if (!k) continue;
      const entry = map.get(k) ?? { n: 0, sample: "" };
      entry.n += 1;
      if (!entry.sample) entry.sample = (item as unknown as Element).tagName?.toLowerCase() ?? "";
      map.set(k, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n);
  };

  const toHex = (input: string): string | null => {
    const m = input.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    if (p[3] !== undefined && p[3] < 0.05) return null; // fully transparent
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${h(p[0])}${h(p[1])}${h(p[2])}`;
  };

  const elements = seen("body *").slice(0, 4000);

  /**
   * Is this element actually on screen for a reader?
   *
   * Pages routinely carry an h1 that exists only for search engines, clipped
   * to nothing or shrunk to a pixel. Measuring it reports a 12px h1 on a page
   * whose real headline is 80px - a number that is correct about an element
   * nobody sees and wrong about the design.
   */
  const isVisible = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (Number(cs.opacity) === 0) return false;
    // The classic visually-hidden recipe: clipped to an empty box.
    if (cs.clip === "rect(0px, 0px, 0px, 0px)") return false;
    if (cs.clipPath === "inset(50%)") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    // Parked far off-canvas rather than hidden outright.
    if (r.bottom < -2000 || r.right < -2000) return false;
    return true;
  };

  // ---- fonts actually applied, by how much text each one carries ----
  const fontWeight = new Map<string, { usage: number; sample: string; stack: string }>();
  for (const el of elements) {
    const text = (el.textContent ?? "").trim();
    if (!text || el.children.length > 0) continue;
    const family = getComputedStyle(el).fontFamily;
    if (!family) continue;
    const first = family.split(",")[0].replace(/["']/g, "").trim();
    // Keep the whole stack as well. A minified or self-hosted family can come
    // back as a single letter, and on its own that reads as a parsing bug;
    // beside its fallbacks it reads as what the page really declares.
    const entry = fontWeight.get(first) ?? { usage: 0, sample: "", stack: family };
    entry.usage += Math.min(text.length, 400);
    if (!entry.sample) entry.sample = text.slice(0, 60);
    fontWeight.set(first, entry);
  }
  const fonts = [...fontWeight.entries()]
    .sort((a, b) => b[1].usage - a[1].usage)
    .slice(0, 8)
    .map(([family, v]) => ({ family, usage: v.usage, sample: v.sample, stack: v.stack }));

  // ---- colours, weighted by painted area ----
  const colorArea = new Map<string, { area: number; where: string }>();
  const addColor = (value: string, area: number, where: string) => {
    const hex = toHex(value);
    if (!hex) return;
    const entry = colorArea.get(hex) ?? { area: 0, where };
    entry.area += area;
    colorArea.set(hex, entry);
  };
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    const area = Math.max(0, rect.width) * Math.max(0, rect.height);
    if (area <= 0) continue;
    const cs = getComputedStyle(el);
    addColor(cs.backgroundColor, area, "background");
    if ((el.textContent ?? "").trim() && el.children.length === 0) addColor(cs.color, area * 0.2, "text");
  }
  const totalArea = [...colorArea.values()].reduce((s, v) => s + v.area, 0) || 1;
  const colors = [...colorArea.entries()]
    .sort((a, b) => b[1].area - a[1].area)
    .slice(0, 12)
    .map(([hex, v]) => ({ hex, usage: Number((v.area / totalArea).toFixed(4)), where: v.where }));

  // ---- heading ladder ----
  const headings = ["h1", "h2", "h3", "h4"].flatMap((tag) =>
    seen(tag).filter(isVisible).slice(0, 2).map((el) => {
      const cs = getComputedStyle(el);
      return {
        tag,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        text: (el.textContent ?? "").trim().slice(0, 80),
      };
    }),
  );

  /* A reset usually sets line-height on <body> and the real reading size lives
   * on paragraphs, so measuring <body> reports 22.5px/22.5px - a ratio no one
   * would set for prose. Measure the visible run of text that carries the most
   * characters instead, and fall back to <body> only when there is none. */
  let readingEl: Element | null = null;
  let mostText = 0;
  for (const el of elements) {
    if (el.children.length > 0) continue;
    const len = (el.textContent ?? "").trim().length;
    if (len < 40 || len <= mostText) continue;
    if (!isVisible(el)) continue;
    mostText = len;
    readingEl = el;
  }
  const bodyStyle = getComputedStyle(readingEl ?? document.body);
  const body = {
    fontSize: bodyStyle.fontSize,
    lineHeight: bodyStyle.lineHeight,
    fontFamily: bodyStyle.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
    color: toHex(bodyStyle.color) ?? bodyStyle.color,
    background: toHex(getComputedStyle(document.body).backgroundColor) ?? "",
  };

  // ---- buttons and call-to-action shapes ----
  const buttons = seen("button, a[class*='btn'], a[class*='button'], [role='button'], input[type='submit']")
    .slice(0, 8)
    .map((el) => {
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent ?? (el as HTMLInputElement).value ?? "").trim().slice(0, 40),
        background: toHex(cs.backgroundColor) ?? cs.backgroundColor,
        color: toHex(cs.color) ?? cs.color,
        radius: cs.borderRadius,
        padding: cs.padding,
        border: cs.border,
        fontSize: cs.fontSize,
      };
    });

  // ---- how wide the content actually sits ----
  const widths = new Map<number, number>();
  for (const el of elements) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const centered = cs.marginLeft === cs.marginRight && cs.marginLeft !== "0px";
    const capped = cs.maxWidth !== "none";
    if ((centered || capped) && rect.width > 320 && rect.width < window.innerWidth) {
      const rounded = Math.round(rect.width / 10) * 10;
      widths.set(rounded, (widths.get(rounded) ?? 0) + 1);
    }
  }
  const containerWidths = [...widths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);

  const radii = count(elements, (el) => {
    const r = getComputedStyle(el).borderRadius;
    return r && r !== "0px" ? r : null;
  }).slice(0, 5).map(([r]) => r);

  // ---- motion that the page actually declares ----
  let transitions = 0;
  let animations = 0;
  const motionSample: string[] = [];
  for (const el of elements) {
    const cs = getComputedStyle(el);
    if (cs.transitionDuration && cs.transitionDuration !== "0s") {
      transitions += 1;
      if (motionSample.length < 6) motionSample.push(`${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`);
    }
    if (cs.animationName && cs.animationName !== "none") {
      animations += 1;
      if (motionSample.length < 6) motionSample.push(`@keyframes ${cs.animationName} ${cs.animationDuration}`);
    }
  }

  // ---- breakpoints and reduced-motion support, read from the stylesheets ----
  const breakpoints = new Set<string>();
  let prefersReducedMotionQuery = false;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      const text = (rule as CSSMediaRule).conditionText;
      if (!text) continue;
      if (text.includes("prefers-reduced-motion")) prefersReducedMotionQuery = true;
      const m = text.match(/(min|max)-width:\s*([\d.]+)(px|rem|em)/g);
      if (m) m.forEach((x) => breakpoints.add(x.replace(/\s+/g, " ")));
    }
  }

  const imgs = seen("img, picture img");
  const images = {
    count: imgs.length,
    withObjectFit: imgs.filter((el) => {
      const fit = getComputedStyle(el).objectFit;
      return fit && fit !== "fill";
    }).length,
    sample: imgs.slice(0, 4).map((el) => {
      const cs = getComputedStyle(el);
      return `${cs.objectFit}/${cs.borderRadius}/${cs.filter}`;
    }),
  };


  /* ---------- what built this ----------
   * Named from evidence on the page, never guessed from how it looks: a
   * library is reported because its script is loaded or its global is
   * defined, and a CSS technique because a computed style uses it. The count
   * is how many elements carry it, so "one blurred panel" and "the whole page
   * is glass" do not read the same. */
  const scriptUrls: string[] = [];
  for (const el of Array.from(document.querySelectorAll("script[src]"))) {
    const src = el.getAttribute("src") ?? "";
    if (src) scriptUrls.push(src);
  }
  const styleUrls = Array.from(document.querySelectorAll('link[rel~="stylesheet"]'))
    .map((el) => el.getAttribute("href") ?? "")
    .filter(Boolean);
  const allUrls = [...scriptUrls, ...styleUrls].join(" ").toLowerCase();
  const w = window as unknown as Record<string, unknown>;

  const LIBS: { name: string; url?: RegExp; global?: string; note: string }[] = [
    { name: "GSAP", url: /gsap|greensock/, global: "gsap", note: "timeline animation, usually with ScrollTrigger" },
    { name: "ScrollTrigger", url: /scrolltrigger/, global: "ScrollTrigger", note: "scroll-linked animation" },
    { name: "Three.js", url: /three(\.min)?\.js|three@|\/three\//, global: "THREE", note: "WebGL 3D in a canvas" },
    { name: "Spline", url: /spline/, global: "SPLINE", note: "hosted 3D scene" },
    { name: "Lottie", url: /lottie/, global: "lottie", note: "vector animation exported from After Effects" },
    { name: "Framer Motion", url: /framer-motion|framerusercontent/, note: "React layout and gesture animation" },
    { name: "Lenis", url: /lenis/, global: "Lenis", note: "smooth scrolling" },
    { name: "Locomotive Scroll", url: /locomotive-scroll/, global: "LocomotiveScroll", note: "smooth scrolling and parallax" },
    { name: "Swiper", url: /swiper/, global: "Swiper", note: "sliders and carousels" },
    { name: "Rive", url: /rive/, global: "rive", note: "interactive vector animation" },
    { name: "Barba.js", url: /barba/, global: "barba", note: "animated page transitions" },
    { name: "Next.js", url: /\/_next\//, global: "__NEXT_DATA__", note: "React framework" },
    { name: "Nuxt", url: /\/_nuxt\//, global: "__NUXT__", note: "Vue framework" },
    { name: "React", global: "React", note: "component UI" },
    { name: "Vue", global: "Vue", note: "component UI" },
    { name: "Webflow", url: /webflow/, global: "Webflow", note: "visual site builder" },
    { name: "WordPress", url: /wp-content|wp-includes/, note: "CMS" },
    { name: "Elementor", url: /elementor/, note: "WordPress page builder" },
    { name: "Tailwind CSS", url: /tailwind/, note: "utility CSS" },
    { name: "Bootstrap", url: /bootstrap/, note: "CSS framework" },
  ];
  const libraries: { name: string; evidence: string; note: string }[] = [];
  for (const lib of LIBS) {
    if (lib.url && lib.url.test(allUrls)) {
      libraries.push({ name: lib.name, evidence: "a script or stylesheet on the page", note: lib.note });
    } else if (lib.global && w[lib.global] !== undefined) {
      libraries.push({ name: lib.name, evidence: `window.${lib.global} is defined`, note: lib.note });
    }
  }

  // Where the type came from, which is the difference between "a font like
  // this" and a name you can actually install.
  const fontSources: string[] = [];
  if (/fonts\.googleapis|fonts\.gstatic/.test(allUrls)) fontSources.push("Google Fonts");
  if (/use\.typekit|adobe/.test(allUrls)) fontSources.push("Adobe Fonts");
  if (/fonts\.bunny|fontshare|typeface/.test(allUrls)) fontSources.push("a hosted font service");
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.constructor.name === "CSSFontFaceRule" || rule.cssText.startsWith("@font-face")) {
          fontSources.push("self-hosted @font-face");
          break;
        }
      }
    }
  } catch { /* cross-origin sheets are simply not readable */ }

  const techniques: { name: string; count: number; detail: string }[] = [];
  const note = (name: string, count: number, detail: string) => {
    if (count > 0) techniques.push({ name, count, detail });
  };
  let blur = 0, blend = 0, clip = 0, mask = 0, gradient = 0, shadow = 0;
  let sticky = 0, grid = 0, flex = 0, transform3d = 0, outlineOnly = 0;
  const gradientSamples: string[] = [];
  const shadowSamples: string[] = [];
  const sampled = Array.from(document.querySelectorAll<HTMLElement>("body *")).slice(0, 1500);
  for (const el of sampled) {
    const cs = getComputedStyle(el);
    if (cs.backdropFilter && cs.backdropFilter !== "none") blur += 1;
    if (cs.mixBlendMode && cs.mixBlendMode !== "normal") blend += 1;
    if (cs.clipPath && cs.clipPath !== "none") clip += 1;
    if ((cs.maskImage && cs.maskImage !== "none") || (cs.webkitMaskImage && cs.webkitMaskImage !== "none")) mask += 1;
    if (cs.backgroundImage && cs.backgroundImage.includes("gradient")) {
      gradient += 1;
      if (gradientSamples.length < 3) gradientSamples.push(cs.backgroundImage.slice(0, 120));
    }
    if (cs.boxShadow && cs.boxShadow !== "none") {
      shadow += 1;
      if (shadowSamples.length < 3) shadowSamples.push(cs.boxShadow.slice(0, 80));
    }
    if (cs.position === "sticky") sticky += 1;
    if (cs.display === "grid" || cs.display === "inline-grid") grid += 1;
    if (cs.display === "flex" || cs.display === "inline-flex") flex += 1;
    if (cs.transformStyle === "preserve-3d" || (cs.perspective && cs.perspective !== "none")) transform3d += 1;
    if (cs.borderStyle !== "none" && cs.backgroundColor === "rgba(0, 0, 0, 0)" && cs.borderWidth !== "0px") outlineOnly += 1;
  }
  note("Frosted glass", blur, "backdrop-filter blurring what is behind a panel");
  note("Blend modes", blend, "mix-blend-mode compositing layers into each other");
  note("Clipped shapes", clip, "clip-path cutting elements to non-rectangular shapes");
  note("Masks", mask, "mask-image fading or cutting content");
  note("Gradients", gradient, gradientSamples[0] ? `for example ${gradientSamples[0]}` : "gradient backgrounds");
  note("Soft shadows", shadow, shadowSamples[0] ? `for example ${shadowSamples[0]}` : "box-shadow depth");
  note("Sticky sections", sticky, "position: sticky holding elements while the page scrolls past");
  note("CSS grid", grid, "grid layout");
  note("Flexbox", flex, "flex layout");
  note("3D transforms", transform3d, "perspective or preserve-3d");
  note("Outlined surfaces", outlineOnly, "bordered panels with no fill");

  const canvases = Array.from(document.querySelectorAll("canvas"));
  // Asking for a WebGL context would CREATE one, and then every canvas on
  // earth answers yes. Ask for 2D instead: a canvas the page has already bound
  // to WebGL refuses it, and that refusal is the evidence. A canvas nobody has
  // touched simply answers, and is reported as a canvas and nothing more.
  let webgl = false;
  for (const c of canvases) {
    const box = c.getBoundingClientRect();
    if (box.width * box.height < 10000) continue;
    try {
      if (c.getContext("2d") === null) { webgl = true; break; }
    } catch { webgl = true; break; }
  }
  if (canvases.length) {
    techniques.push({
      name: webgl ? "WebGL canvas" : "Canvas",
      count: canvases.length,
      detail: webgl
        ? "a canvas already bound to a WebGL context - 3D or shader work rendered live in the page"
        : "a canvas element; what it draws could not be told from the outside",
    });
  }
  const videoBackdrops = Array.from(document.querySelectorAll("video")).filter((v) => {
    const box = v.getBoundingClientRect();
    return box.width > window.innerWidth * 0.6;
  }).length;
  note("Full-width video", videoBackdrops, "video used as a backdrop rather than as a player");

  /* ---------- where the real site might be ----------
   * A gallery page is a page about someone else's work, and it almost always
   * links to them. Collect the outbound hosts that are not the gallery itself,
   * not a social profile and not infrastructure, so a shot can lead back to
   * the site where the CSS actually is. */
  const IGNORED_LINK_HOSTS = [
    "dribbble.com", "behance.net", "pinterest.com", "pin.it", "instagram.com",
    "x.com", "twitter.com", "facebook.com", "linkedin.com", "youtube.com",
    "youtu.be", "tiktok.com", "threads.net", "threads.com", "medium.com",
    "github.com", "dribbble.co", "producthunt.com", "awwwards.com", "webflow.io",
    "framer.website", "substack.com", "patreon.com", "gumroad.com", "discord.gg",
    "google.com", "gstatic.com", "googleapis.com", "apple.com", "microsoft.com",
    "cloudflare.com", "gravatar.com", "paypal.com", "adobe.com", "figma.com",
    "notion.so", "calendly.com", "mailchi.mp", "bit.ly", "t.co", "wa.me",
    "telegram.me", "t.me", "vimeo.com", "spotify.com", "amazon.com",
  ];
  const pageHost = location.hostname.replace(/^www\./, "").toLowerCase();
  const siteCounts = new Map<string, { count: number; sample: string }>();
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (!/^https?:/i.test(href)) continue;
    let u: URL;
    try { u = new URL(href, document.baseURI); } catch { continue; }
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!h || h === pageHost || h.endsWith(`.${pageHost}`)) continue;
    if (IGNORED_LINK_HOSTS.some((ig) => h === ig || h.endsWith(`.${ig}`))) continue;
    // A CDN or tracker is not a designer's site.
    if (/(^|\.)(cdn|static|assets|img|images|fonts|track|analytics|ads)\./.test(h)) continue;
    const text = (a.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const existing = siteCounts.get(h);
    if (existing) existing.count += 1;
    else siteCounts.set(h, { count: 1, sample: text });
  }
  const relatedSites = [...siteCounts.entries()]
    .map(([host, v]) => ({ host, count: v.count, text: v.sample }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const build = {
    relatedSites,
    libraries,
    techniques: techniques.sort((a, b) => b.count - a.count).slice(0, 14),
    fontSources: [...new Set(fontSources)],
    colorScheme: getComputedStyle(document.documentElement).colorScheme || "",
    sampledElements: sampled.length,
  };

  return {
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
    fonts,
    colors,
    headings,
    body,
    buttons,
    containerWidths,
    radii,
    motion: { transitions, animations, prefersReducedMotionQuery, sample: motionSample },
    breakpoints: [...breakpoints].slice(0, 10),
    images,
    build,
    viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? undefined,
    capturedAt: new Date().toISOString(),
  };
}
