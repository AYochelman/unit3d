import type { Filament } from "./types";

/**
 * The spools on the shelf.
 *
 * A leaf on purpose. This list lived in lib/data.ts, which also holds the
 * product catalogue and therefore imports all twelve thousand lines of
 * imported.generated.ts. lib/inventory.ts wanted nothing from data.ts but
 * these fourteen colours, lib/admin-store.ts wanted one function from
 * inventory, and the root layout renders a component that uses admin-store —
 * so every page on the site, /privacy included, downloaded the entire
 * catalogue before it could paint.
 *
 * Nothing here may import anything heavy, or that chain grows back.
 */
export const FILAMENTS: Filament[] = [
  { id: "black", name: "שחור", hex: "#1a1a1d", desc: "PLA Matte" },
  { id: "white", name: "לבן", hex: "#f2f2ef", desc: "PLA Marble" },
  { id: "orange", name: "כתום לוהט", hex: "#FF6B1A", desc: "PLA+" },
  { id: "red", name: "אדום דם", hex: "#C2261C", desc: "PLA+" },
  { id: "blue", name: "כחול כהה", hex: "#1E40AF", desc: "PLA" },
  { id: "cyan", name: "טורקיז", hex: "#00C2C7", desc: "PLA Silk" },
  { id: "green", name: "ירוק זית", hex: "#3D5229", desc: "PLA Army" },
  { id: "gold", name: "זהב", hex: "#C9A227", desc: "PLA Silk" },
  { id: "silver", name: "כסף", hex: "#A8A9AD", desc: "PLA Silk" },
  { id: "purple", name: "סגול חצות", hex: "#4C1D95", desc: "PLA" },
  { id: "pink", name: "ורוד פלמינגו", hex: "#EC4899", desc: "PLA" },
  { id: "glow", name: "זוהר בחושך", hex: "#7EE787", desc: "Glow PLA", kind: "glow" },
];
