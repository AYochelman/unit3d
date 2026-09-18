/**
 * Reference Studio - development-only visual adjustment panel.
 *
 * Writes CSS custom properties on :root as you drag. Nothing is persisted to
 * the source until you export and apply, and nothing here ships: see README.md
 * for the one-line production gate.
 *
 * Framework-agnostic ES module. Works in plain HTML, Vite, Next, Astro, SvelteKit.
 *
 *   import { mountDesignPanel } from "./design-panel/design-panel.js";
 *   if (import.meta.env?.DEV ?? process.env.NODE_ENV !== "production") mountDesignPanel();
 */

const GROUPS = [
  {
    id: "type",
    label: "Typography",
    controls: [
      { prop: "--font-size-base", label: "Base size", type: "range", min: 12, max: 24, step: 0.5, unit: "px" },
      { prop: "--font-scale", label: "Scale ratio", type: "range", min: 1.1, max: 1.6, step: 0.01, unit: "" },
      { prop: "--line-height", label: "Line height", type: "range", min: 1.1, max: 2, step: 0.01, unit: "" },
      { prop: "--letter-spacing", label: "Tracking", type: "range", min: -0.05, max: 0.15, step: 0.005, unit: "em" },
      { prop: "--font-weight-heading", label: "Heading weight", type: "range", min: 300, max: 900, step: 100, unit: "" },
    ],
  },
  {
    id: "color",
    label: "Colour",
    controls: [
      { prop: "--color-bg", label: "Background", type: "color" },
      { prop: "--color-surface", label: "Surface", type: "color" },
      { prop: "--color-text", label: "Text", type: "color" },
      { prop: "--color-muted", label: "Muted text", type: "color" },
      { prop: "--color-accent", label: "Accent", type: "color" },
      { prop: "--color-accent-text", label: "On accent", type: "color" },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    controls: [
      { prop: "--container-width", label: "Content width", type: "range", min: 600, max: 1800, step: 10, unit: "px" },
      { prop: "--gutter", label: "Side gutter", type: "range", min: 8, max: 96, step: 2, unit: "px" },
      { prop: "--space-unit", label: "Spacing unit", type: "range", min: 2, max: 16, step: 0.5, unit: "px" },
      { prop: "--section-gap", label: "Section gap", type: "range", min: 24, max: 240, step: 4, unit: "px" },
    ],
  },
  {
    id: "shape",
    label: "Shape",
    controls: [
      { prop: "--radius", label: "Corner radius", type: "range", min: 0, max: 40, step: 1, unit: "px" },
      { prop: "--radius-lg", label: "Large radius", type: "range", min: 0, max: 64, step: 1, unit: "px" },
      { prop: "--border-width", label: "Border width", type: "range", min: 0, max: 4, step: 0.5, unit: "px" },
    ],
  },
  {
    id: "hero",
    label: "Hero image",
    controls: [
      { prop: "--hero-height", label: "Height", type: "range", min: 240, max: 1000, step: 10, unit: "px" },
      { prop: "--hero-pos-x", label: "Focal point X", type: "range", min: 0, max: 100, step: 1, unit: "%" },
      { prop: "--hero-pos-y", label: "Focal point Y", type: "range", min: 0, max: 100, step: 1, unit: "%" },
      { prop: "--hero-scale", label: "Zoom", type: "range", min: 1, max: 1.6, step: 0.01, unit: "" },
      { prop: "--hero-overlay", label: "Overlay opacity", type: "range", min: 0, max: 0.9, step: 0.01, unit: "" },
    ],
  },
  {
    id: "motion",
    label: "Motion",
    controls: [
      { prop: "--duration", label: "Duration", type: "range", min: 0, max: 900, step: 10, unit: "ms" },
      { prop: "--ease", label: "Easing", type: "select", options: [
        "cubic-bezier(0.22, 1, 0.36, 1)", "cubic-bezier(0.4, 0, 0.2, 1)", "ease-out", "ease-in-out", "linear",
      ] },
      { prop: "--motion-distance", label: "Travel", type: "range", min: 0, max: 80, step: 1, unit: "px" },
    ],
  },
];

const num = (value) => {
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

function toHex(value) {
  const v = String(value).trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return "#" + v.slice(1).split("").map((c) => c + c).join("").toLowerCase();
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const h = (n) => Math.max(0, Math.min(255, Math.round(n || 0))).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }
  return null;
}

const CSS = `
.rs-panel{position:fixed;inset-block-start:16px;inset-inline-end:16px;z-index:2147483000;width:320px;max-height:calc(100vh - 32px);
  display:flex;flex-direction:column;font:13px/1.45 ui-sans-serif,system-ui,"Segoe UI",sans-serif;color:#f4f3f1;
  background:#141416ee;backdrop-filter:blur(14px);border:1px solid #ffffff1f;border-radius:14px;
  box-shadow:0 24px 70px -28px #000000b8;direction:ltr;overflow:hidden}
.rs-panel[hidden]{display:none}
.rs-panel header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-block-end:1px solid #ffffff14;cursor:grab}
.rs-panel header.rs-drag{cursor:grabbing}
.rs-panel h2{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin:0;flex:1;color:#f4f3f1}
.rs-panel .rs-body{overflow-y:auto;padding:4px 12px 12px;scrollbar-width:thin}
.rs-group{border-block-end:1px solid #ffffff10;padding-block:8px}
.rs-group:last-child{border-block-end:0}
.rs-group>button{all:unset;display:flex;width:100%;align-items:center;gap:6px;cursor:pointer;padding-block:4px;
  font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#a3a09b}
.rs-group>button:focus-visible{outline:2px solid #e8664a;outline-offset:2px;border-radius:4px}
.rs-group>button::before{content:"";width:0;height:0;border-inline-start:4px solid currentColor;border-block:4px solid transparent;transition:transform .15s}
.rs-group[data-open="true"]>button::before{transform:rotate(90deg)}
.rs-group .rs-controls{display:none;padding-block-start:6px}
.rs-group[data-open="true"] .rs-controls{display:block}
.rs-row{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center;padding-block:5px}
.rs-row label{color:#c9c6c1;font-size:12px}
.rs-row output{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8d8a85;text-align:end;min-width:56px}
.rs-row input[type=range]{grid-column:1/-1;width:100%;accent-color:#e8664a;height:18px}
.rs-row input[type=color]{inline-size:34px;block-size:24px;padding:0;border:1px solid #ffffff26;border-radius:5px;background:none;cursor:pointer}
.rs-row select{grid-column:1/-1;width:100%;background:#00000040;color:#f4f3f1;border:1px solid #ffffff1f;border-radius:6px;padding:4px 6px;font-size:12px}
.rs-row input:focus-visible,.rs-row select:focus-visible{outline:2px solid #e8664a;outline-offset:2px}
.rs-row.rs-changed label::after{content:"•";color:#e8664a;margin-inline-start:5px}
.rs-actions{display:flex;gap:6px;padding:10px 12px;border-block-start:1px solid #ffffff14;background:#0000002e}
.rs-actions button{flex:1;all:unset;text-align:center;cursor:pointer;padding:7px 8px;border-radius:7px;font-size:12px;font-weight:500;
  background:#ffffff12;color:#f4f3f1;border:1px solid #ffffff1a}
.rs-actions button:hover{background:#ffffff1f}
.rs-actions button.rs-primary{background:#e8664a;color:#1a0d08;border-color:#e8664a}
.rs-actions button:focus-visible{outline:2px solid #e8664a;outline-offset:2px}
.rs-toggle{position:fixed;inset-block-end:16px;inset-inline-end:16px;z-index:2147483000;all:unset;cursor:pointer;
  padding:8px 12px;border-radius:999px;background:#141416ee;color:#f4f3f1;border:1px solid #ffffff1f;
  font:12px/1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 12px 32px -16px #000000b8;direction:ltr}
.rs-toggle:focus-visible{outline:2px solid #e8664a;outline-offset:2px}
.rs-empty{padding:10px 2px;color:#8d8a85;font-size:12px}
@media (prefers-reduced-motion:reduce){.rs-group>button::before{transition:none}}
`;

export function mountDesignPanel(options = {}) {
  if (typeof document === "undefined") return null;
  if (document.querySelector(".rs-panel")) return null;

  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const initial = new Map();
  const current = new Map();

  const readVar = (prop) => {
    const inline = root.style.getPropertyValue(prop).trim();
    return (inline || computed.getPropertyValue(prop).trim()) || "";
  };

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "rs-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Design adjustment panel (development only)");
  panel.hidden = true;

  const toggle = document.createElement("button");
  toggle.className = "rs-toggle";
  toggle.type = "button";
  toggle.textContent = "Design ⌥D";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "rs-design-panel");
  panel.id = "rs-design-panel";

  const header = document.createElement("header");
  header.innerHTML = '<h2>Design panel</h2>';
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close design panel");
  closeBtn.style.cssText = "all:unset;cursor:pointer;padding:2px 6px;border-radius:5px;color:#a3a09b;font-size:16px;line-height:1";
  closeBtn.textContent = "×";
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "rs-body";

  let usable = 0;
  for (const group of GROUPS) {
    const live = group.controls.filter((c) => readVar(c.prop) !== "");
    if (!live.length) continue;
    usable += live.length;

    const section = document.createElement("div");
    section.className = "rs-group";
    section.dataset.open = group.id === "type" ? "true" : "false";

    const headBtn = document.createElement("button");
    headBtn.type = "button";
    headBtn.textContent = group.label;
    headBtn.setAttribute("aria-expanded", section.dataset.open);
    headBtn.addEventListener("click", () => {
      const open = section.dataset.open !== "true";
      section.dataset.open = String(open);
      headBtn.setAttribute("aria-expanded", String(open));
    });

    const controls = document.createElement("div");
    controls.className = "rs-controls";

    for (const control of live) {
      const raw = readVar(control.prop);
      initial.set(control.prop, raw);

      const row = document.createElement("div");
      row.className = "rs-row";
      const id = `rs-${control.prop.replace(/[^a-z0-9]+/gi, "-")}`;
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = control.label;
      row.appendChild(label);

      const apply = (value) => {
        root.style.setProperty(control.prop, value);
        current.set(control.prop, value);
        row.classList.toggle("rs-changed", value !== initial.get(control.prop));
        options.onChange?.(control.prop, value);
      };

      if (control.type === "color") {
        const input = document.createElement("input");
        input.type = "color";
        input.id = id;
        input.value = toHex(raw) ?? "#000000";
        input.addEventListener("input", () => apply(input.value));
        row.appendChild(input);
        row.dataset.reset = "color";
        row._reset = () => { input.value = toHex(initial.get(control.prop)) ?? "#000000"; };
      } else if (control.type === "select") {
        const select = document.createElement("select");
        select.id = id;
        const values = [...new Set([raw, ...control.options])].filter(Boolean);
        for (const value of values) {
          const opt = document.createElement("option");
          opt.value = value; opt.textContent = value;
          select.appendChild(opt);
        }
        select.value = raw;
        select.addEventListener("change", () => apply(select.value));
        row.appendChild(document.createElement("span"));
        row.appendChild(select);
        row._reset = () => { select.value = initial.get(control.prop); };
      } else {
        const start = num(raw);
        const input = document.createElement("input");
        input.type = "range";
        input.id = id;
        input.min = String(control.min); input.max = String(control.max); input.step = String(control.step);
        input.value = String(start ?? control.min);
        const out = document.createElement("output");
        out.textContent = `${input.value}${control.unit}`;
        input.addEventListener("input", () => {
          out.textContent = `${input.value}${control.unit}`;
          apply(`${input.value}${control.unit}`);
        });
        row.appendChild(out);
        row.appendChild(input);
        row._reset = () => {
          const back = num(initial.get(control.prop));
          input.value = String(back ?? control.min);
          out.textContent = `${input.value}${control.unit}`;
        };
      }
      controls.appendChild(row);
    }

    section.appendChild(headBtn);
    section.appendChild(controls);
    body.appendChild(section);
  }

  if (!usable) {
    const empty = document.createElement("p");
    empty.className = "rs-empty";
    empty.textContent =
      "No adjustable custom properties were found on :root. The panel controls variables such as --color-accent, --container-width and --radius - define them in your tokens file and they appear here.";
    body.appendChild(empty);
  }

  const actions = document.createElement("div");
  actions.className = "rs-actions";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button"; resetBtn.textContent = "Reset";
  const exportBtn = document.createElement("button");
  exportBtn.type = "button"; exportBtn.className = "rs-primary"; exportBtn.textContent = "Export changes";
  actions.append(resetBtn, exportBtn);

  resetBtn.addEventListener("click", () => {
    for (const [prop, value] of initial) root.style.setProperty(prop, value);
    current.clear();
    panel.querySelectorAll(".rs-row").forEach((row) => { row._reset?.(); row.classList.remove("rs-changed"); });
  });

  const download = (name, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  exportBtn.addEventListener("click", () => {
    const changed = [...current.entries()].filter(([prop, value]) => value !== initial.get(prop));
    if (!changed.length) {
      exportBtn.textContent = "Nothing changed";
      setTimeout(() => { exportBtn.textContent = "Export changes"; }, 1600);
      return;
    }
    const css =
      "/* Reference Studio design panel - only the values you changed.\n" +
      " * Apply these to your tokens file, then delete this file.\n" +
      ` * Exported ${new Date().toISOString()}\n */\n:root {\n` +
      changed.map(([prop, value]) => `  ${prop}: ${value}; /* was ${initial.get(prop)} */`).join("\n") +
      "\n}\n";
    download("tokens.override.css", css, "text/css");
    download(
      "tokens.override.json",
      JSON.stringify(
        { exportedAt: new Date().toISOString(), changed: Object.fromEntries(changed.map(([p, v]) => [p, { value: v, was: initial.get(p) }])) },
        null, 2,
      ),
      "application/json",
    );
  });

  panel.append(header, body, actions);
  document.body.append(toggle, panel);

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) panel.querySelector("input,select,button")?.focus();
  };
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  closeBtn.addEventListener("click", () => { setOpen(false); toggle.focus(); });

  const onKey = (event) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
    if (event.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); return; }
    if (typing) return;
    if ((event.key === "d" || event.key === "D") && (event.altKey || !event.metaKey && !event.ctrlKey)) {
      event.preventDefault();
      setOpen(panel.hidden);
    }
  };
  document.addEventListener("keydown", onKey);

  // Drag by the header so the panel can be moved off whatever it is covering.
  let drag = null;
  header.addEventListener("pointerdown", (event) => {
    if (event.target === closeBtn) return;
    const rect = panel.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    header.classList.add("rs-drag");
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", (event) => {
    if (!drag) return;
    panel.style.insetInlineEnd = "auto";
    panel.style.insetBlockStart = `${Math.max(0, event.clientY - drag.y)}px`;
    panel.style.insetInlineStart = `${Math.max(0, event.clientX - drag.x)}px`;
  });
  const endDrag = (event) => { drag = null; header.classList.remove("rs-drag"); try { header.releasePointerCapture(event.pointerId); } catch {} };
  header.addEventListener("pointerup", endDrag);
  header.addEventListener("pointercancel", endDrag);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    destroy() {
      document.removeEventListener("keydown", onKey);
      panel.remove(); toggle.remove(); style.remove();
    },
  };
}

export default mountDesignPanel;
