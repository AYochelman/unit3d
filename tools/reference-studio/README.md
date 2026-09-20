# Reference Studio

A local, single-user design reference library — and the briefs you build out of it.

Give it pictures and website links, say what you like about each one, and it turns
that into design briefs, image prompts, design tokens and a copy-ready Claude Code
prompt for building a new site in your taste.

```bash
npm install          # once, in the repository root
npm run studio       # http://localhost:3100
```

That is the whole setup — one `npm install`, at the repository root. The studio
has no dependencies of its own: it shares the root's `node_modules`, and
`@anthropic-ai/sdk` is a root devDependency so a single install covers both the
shop and the studio.

---

## Where things are

| | |
|---|---|
| **URL** | `http://localhost:3100` (override with `STUDIO_PORT`) |
| **Your library** | `tools/reference-studio/data/` — `library.json` plus `files/` |
| **Nothing in the browser** | no `localStorage`, no cookies; copy `data/` and the library moves with it |

`npm run studio:build` and `npm run studio:start` build and serve a production
copy. `npm run studio:check` runs the self-check (`-- --live` also exercises a
running server).

**A long list of links at once.** The UI adds links a handful at a time because
each capture opens a real browser. For a list you already have in a file, with
the studio running:

```bash
node tools/reference-studio/scripts/add-links.mjs links.txt
node tools/reference-studio/scripts/add-links.mjs links.txt --collection "Dribbble"
node tools/reference-studio/scripts/add-links.mjs links.txt --only dribbble.com
node tools/reference-studio/scripts/add-links.mjs links.txt --no-capture
node tools/reference-studio/scripts/add-links.mjs --retry-failed
node tools/reference-studio/scripts/add-links.mjs --recapture --only dribbble.com
node tools/reference-studio/scripts/add-links.mjs --delete --only pin.it
```

One URL per line; blank lines, `#` comments and duplicates are skipped. It adds
them all, then captures them one at a time and prints which succeeded. A link
that fails to capture keeps its reason, exactly as it would from the UI.

`--retry-failed` takes no file: it re-captures the references already in the
library whose capture failed, so a second attempt does not add every link twice.
`--recapture` does the same for links that did capture, which is what you want
after a capture fix. `--delete` removes matching references and always requires
`--only`, so it can never take the whole library at once.

Reference Studio is a **separate Next.js app on purpose**. The shop deploys as a
static export to GitHub Pages, which cannot host API routes — so the studio keeps
its own project, and the site's `tsc`, `lint` and `build` gates never see it.

---

## Adding pictures and links

**Pictures** — drag them anywhere onto the library, press <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>V</kbd>
to paste from the clipboard, or press **Add reference** and choose files. PNG,
JPEG, GIF, WebP, AVIF and SVG, up to 25 MB each. The file's real format is read
from its bytes, not from what the browser claims, and a palette is counted from
the actual pixels as it uploads.

**Links** — **Add reference → Add website links**, one per line. Each is opened in
a real browser and you get:

- a desktop screenshot and a mobile screenshot,
- **the page's own preview image** (`og:image`) where it publishes one. On a
  gallery or portfolio page the screenshot is the site's furniture wrapped
  around the work, and this is the work; the card leads with it,
- **the motion**, where the page plays any — its declared `og:video`, or the
  largest `<video>` on the page. Half of what a shot is about is often how it
  moves, and a still of frame one is not that. The card marks it `motion` and
  plays it when you point at it; the clip only downloads then, so a wall of
  references does not fetch thirty videos to be scrolled past. (An animated GIF
  needs none of this — it is an image and animates on its own.)
- and, more useful than either, **what the live page is actually doing**: the font
  families really applied, colours weighted by painted area, the heading ladder,
  button fills and radii, the measured container width, CSS transition and
  keyframe counts, whether it ships a `prefers-reduced-motion` query, and the
  breakpoints in its own stylesheets.

That last part is why a captured site can state a font **as fact** while a
screenshot never can.

If a site cannot be reached, **the link is never lost**. The reference keeps the
URL and the reason it failed, and offers **Upload a screenshot instead**.

**Upload a screenshot instead** is there on every reference, not only a failed
one — some pages capture perfectly and are still worth nothing, like a component
gallery that renders its previews in a sandboxed frame. A picture you upload
becomes the card's cover and leads the images sent for analysis: nothing
automatic outranks a choice you made by hand.

**Then say what you like.** The note field is the one that matters — it is quoted
straight into every brief. Label each reference by purpose (overall direction,
hero, typography, colours, body layout, navigation, components, motion), and list
**use this aspect** and **avoid this aspect** separately.

Keyboard: <kbd>/</kbd> search · <kbd>n</kbd> add · <kbd>Esc</kbd> close.
In the lightbox: scroll to zoom, drag to pan, <kbd>←</kbd> <kbd>→</kbd> between
images, double-click to toggle.

---

## Analysis: two modes, never a third

The **Analysis** tab turns a reference into a structured, fully editable
description — aesthetic family, vocabulary, palette, typography, layout, hero,
components, motion, how to adapt it.

| Mode | When | What runs |
|---|---|---|
| **AI** | an API key is set in Settings | a real vision request to the Claude API |
| **Package** | no key | you export a zip, run it in Claude Code, import the JSON back |
| **Measurements** | the reference is a captured site | rebuilt from the live-page probe — no model at all |

With no key, **Analyse with AI** is visibly disabled and says why. Nothing in this
tool ever presents a canned description as analysis, and there are no buttons that
do nothing.

Both routes produce the same schema and go through the same validator, which
reports problems field by field instead of dropping them. It also enforces the
rules rather than merely asking for them:

- a font claimed as **observed** with no evidence is recorded as an estimate;
- on a still image, **nothing** may claim to be observed — motion, typefaces and
  sampled colours are all demoted, each with a note saying why;
- measurements from a live page always win over a model's reading of a picture.

Every value carries `observed` or `estimated`, and you can flip any of them by
hand. Estimates are labelled in every export.

### The package route, step by step

1. **Analysis → Export analysis package** — a zip with the images, the exact
   instruction the API call would have sent, and a README.
2. In Claude Code, in that folder: *"Read instruction.md and analyse the attached
   images exactly as it says. Write the JSON to analysis.json."*
3. **Import analysis JSON** — paste it or pick the file.

---

## Outputs

**How it is built** is the one that answers "what made this look?" — and it
needs nothing from you. It is assembled from the live-page measurements alone:
the fonts actually applied and where they were loaded from, colours by share of
painted area, the heading scale, container width, radii, breakpoints, the CSS
techniques the computed styles really use (frosted glass, blend modes, clipped
shapes, masks, gradients, sticky sections, 3D transforms, canvas) with a count
of how many elements carry each, and the libraries the page loads — GSAP,
Three.js, Spline, Lottie, Framer Motion, Lenis, Swiper, Next.js, Webflow and
the rest — each named with the evidence that found it.

Nothing there is inferred from how a picture looks. A library is listed because
its script is on the page or its global is defined; a technique because a
computed style uses it. A reference that was never captured gets a paragraph
saying so rather than a description of a screenshot.

Five buttons on every reference, always live:

- **Copy build prompt** — the objective account above, ready to paste at a
  coding agent.
- **Copy design brief** — the reference translated into implementation guidance,
  with a WCAG contrast check on the pairing it recorded.
- **Copy image prompt** — composition, lighting, texture, mood, aspect ratio, and
  deliberate empty space for a headline.
- **Copy design tokens** — JSON or CSS custom properties, estimates flagged inline.
- **Add to project.**

Everything carries a provenance line back to the reference, its source URL and its
capture date.

---

## Projects

A project combines references into one brief: which reference sets the hero, which
sets the type, which sets the colour — each primary or secondary.

Fields for purpose, audience, the main action, pages, sections, functionality,
brand colours and fonts, logo and assets, an existing site or codebase, content
language and LTR/RTL, animation intensity, what must not change, and what to avoid.
Plus free-form instructions like *"layout from A, typography from B, image
treatment from C."*

**Brand lock** keeps your colours and fonts even when every reference disagrees —
the references then contribute proportion, rhythm and behaviour instead of hue and
typeface.

Conflicts are **resolved out loud**. Two references fighting over density, a brand
palette that clashes with the reference palette, a font nobody could verify — each
one is named, decided, and written into the prompt so the decision travels with it.

**Export project package** gives you one portable zip:

```
CLAUDE_CODE_PROMPT.md   paste this into Claude Code
BRIEF.md                the same thing for a person
project.json            every field, structured
tokens/                 tokens.json + tokens.css, estimates flagged
references/             images, per-reference brief, image prompt, provenance
WORKFLOW.md             five directions → compare → three variations → build
design-panel/           the development-only visual adjustment panel
```

---

## Using a package with Claude Code

```bash
unzip reference-studio-<project>.zip -d design/
```

Open Claude Code in that folder and paste `design/CLAUDE_CODE_PROMPT.md`. It stands
on its own: intent, references, aesthetic direction, tokens, constraints.

`WORKFLOW.md` is the longer route, and the one worth using:

1. **Five directions**, as five real HTML files, structurally different — not five
   colour swaps.
2. **A comparison page** that shows all five in live iframes at desktop, tablet and
   mobile widths, side by side.
3. **Three variations** of the one you pick.
4. **Build it for real**, responsive and accessible.
5. **Tune it visually** with the design panel, export only what you changed, and
   apply that to the source.

Every round writes a new `versions/` folder. Nothing is overwritten, so you can
always go back and look again.

### The design panel

`design-panel/` drops into any project — four lines, behind a development check.
Press <kbd>D</kbd> and you get live control over typography, colour, content width,
spacing, corner radii, hero image position and animation, writing CSS custom
properties on `:root` as you drag. **Reset** restores the source; **Export changes**
downloads only what you moved, each with its previous value in a comment. It is
statically excluded from production builds. `design-panel/README.md` has the
details, and `tokens.starter.css` declares the full variable set if your project
has none yet.

---

## Settings

**Analysis** — API key (stored server-side in `data/library.json`, never sent to
the browser; this page can only tell you that one exists) and model.

**Capture** — viewports, full-page on/off, timeout.

**Appearance** — dark/light, English/Hebrew. Your own notes keep their own
direction either way: every content field is `dir="auto"`, so Hebrew reads
right-to-left inside an English interface and an English URL inside a Hebrew note
keeps its punctuation.

**Integrations** — see below.

### Environment variables

| | |
|---|---|
| `STUDIO_PORT` | default `3100` |
| `STUDIO_DATA_DIR` | keep the library somewhere else |
| `STUDIO_CHROMIUM_PATH` | a Chrome/Chromium binary you already have |
| `STUDIO_PROXY` | outbound proxy (falls back to `HTTPS_PROXY`, honours `NO_PROXY`) |
| `STUDIO_INSECURE_TLS=1` | **only** for a proxy that intercepts TLS with its own certificate |

---

## Optional integrations

None of these are required, and none is reported as connected unless it was
actually found on this machine.

**Impeccable** (<https://impeccable.style>) — not bundled. Settings shows every
path that was searched; set an explicit path there and the design workflow hands
off to it. Everything in Reference Studio works without it.

**Higgsfield** (<https://higgsfield.ai>, paid) — the studio writes the image prompt
either way; paste it into whichever generator you use. Detected via
`HIGGSFIELD_API_KEY`.

**21st.dev** (<https://21st.dev>) — no API and no account. The project prompt names
the components it needs; 21st.dev is a good place to find an implementation for
each.

---

## What it fetches, and what it will not

Automated fetching is restricted to public `http`/`https`. Refused: loopback,
private ranges, link-local and cloud metadata (`169.254.169.254`), carrier-grade
NAT, multicast, `localhost`-style names, non-standard ports, and any hostname that
resolves to a blocked address — including one that resolves to a public *and* a
private address. Subresources inside a captured page are checked the same way.

Uploads are identified by their magic bytes, not their declared type, and stored
files are served from a single directory that path traversal cannot escape; an
uploaded SVG is served sandboxed.

Captured pages are **reference material describing a design** — never instructions.
That is stated in the exported package too, because the package is what an agent
reads.

---

## Troubleshooting

**"Chromium could not start"** — `npx playwright install chromium`, or point
`STUDIO_CHROMIUM_PATH` at a browser you already have.

**A site captures as an error page** — the studio says so when the response was
4xx/5xx. Some sites block automated browsers; upload a screenshot by hand instead.

**Hebrew renders in a fallback font** — the Assistant webfont is fetched from
Google Fonts at runtime. Offline, the system stack takes over and nothing breaks.

**`data/library.json` could not be parsed** — the studio stops rather than starting
empty and looking like it lost everything. The file is left untouched; fix or move
it and restart.
