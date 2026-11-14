# Development-only design panel

A floating panel that lets you move typography, colour, content width, spacing,
corner radii, hero image position and animation settings **while looking at the
real site**, then export only what you changed so it can be applied to the
source.

It edits CSS custom properties on `:root`. That is the whole trick: if your
site reads its tokens from custom properties, the panel can move every one of
them live, and nothing needs a rebuild.

## Install

Copy this folder into your project, then mount it behind a development check.

**Vite / Astro / SvelteKit**

```js
if (import.meta.env.DEV) {
  const { mountDesignPanel } = await import("./design-panel/design-panel.js");
  mountDesignPanel();
}
```

**Next.js** — in a client component in your root layout:

```tsx
"use client";
import { useEffect } from "react";

export function DesignPanel() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    import("../design-panel/design-panel.js").then((m) => m.mountDesignPanel());
  }, []);
  return null;
}
```

**Plain HTML** — and delete the tag before you publish:

```html
<script type="module">
  import { mountDesignPanel } from "./design-panel/design-panel.js";
  mountDesignPanel();
</script>
```

In every form above the import is inside a branch that is statically false in a
production build, so the bundler drops the module entirely. Nothing ships.

## Use

- <kbd>D</kbd> (or <kbd>Alt</kbd>+<kbd>D</kbd>) toggles it, <kbd>Esc</kbd> closes it. Drag it by its header.
- A dot next to a label means that value has been changed.
- **Reset** restores everything the source declared.
- **Export changes** downloads `tokens.override.css` and `tokens.override.json`
  containing only what you moved, each with the previous value in a comment.

Then apply it — in Claude Code:

> Apply `tokens.override.css` to my tokens file: update each custom property to
> the exported value, then delete the override file. Change nothing else.

## Which properties it shows

Only properties that already exist on `:root`. A control with no matching
variable is hidden, so the panel never offers a slider that does nothing.

| Group | Properties |
|---|---|
| Typography | `--font-size-base` `--font-scale` `--line-height` `--letter-spacing` `--font-weight-heading` |
| Colour | `--color-bg` `--color-surface` `--color-text` `--color-muted` `--color-accent` `--color-accent-text` |
| Layout | `--container-width` `--gutter` `--space-unit` `--section-gap` |
| Shape | `--radius` `--radius-lg` `--border-width` |
| Hero image | `--hero-height` `--hero-pos-x` `--hero-pos-y` `--hero-scale` `--hero-overlay` |
| Motion | `--duration` `--ease` `--motion-distance` |

To add your own, append to `GROUPS` at the top of `design-panel.js`.

## Starting tokens

If your site has none of these yet, `tokens.starter.css` in this folder
declares the full set with sensible defaults — import it first and the panel
lights up completely.
