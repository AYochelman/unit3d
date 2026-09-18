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

  // ---- fonts actually applied, by how much text each one carries ----
  const fontWeight = new Map<string, { usage: number; sample: string }>();
  for (const el of elements) {
    const text = (el.textContent ?? "").trim();
    if (!text || el.children.length > 0) continue;
    const family = getComputedStyle(el).fontFamily;
    if (!family) continue;
    const first = family.split(",")[0].replace(/["']/g, "").trim();
    const entry = fontWeight.get(first) ?? { usage: 0, sample: "" };
    entry.usage += Math.min(text.length, 400);
    if (!entry.sample) entry.sample = text.slice(0, 60);
    fontWeight.set(first, entry);
  }
  const fonts = [...fontWeight.entries()]
    .sort((a, b) => b[1].usage - a[1].usage)
    .slice(0, 8)
    .map(([family, v]) => ({ family, usage: v.usage, sample: v.sample }));

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
    seen(tag).slice(0, 2).map((el) => {
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

  const bodyStyle = getComputedStyle(document.body);
  const body = {
    fontSize: bodyStyle.fontSize,
    lineHeight: bodyStyle.lineHeight,
    fontFamily: bodyStyle.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
    color: toHex(bodyStyle.color) ?? bodyStyle.color,
    background: toHex(bodyStyle.backgroundColor) ?? bodyStyle.backgroundColor,
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
    viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? undefined,
    capturedAt: new Date().toISOString(),
  };
}
