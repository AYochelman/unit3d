import file from "../public/admin-settings.json";
import { DEFAULT_COST_SETTINGS, type CostSettings } from "./costing";
import type { ItemOverride, PricingMode } from "./admin-store";
import { resolvePrice, type Priceable } from "./price-rule";

/**
 * The price a visitor sees, worked out without a running page.
 *
 * Shelves and product pages price through the admin store, which loads
 * public/admin-settings.json at runtime. The help bot and its knowledge file
 * cannot wait for that — the knowledge file is built at build time and the
 * bot's index is built once — so they read the same file here, at build time,
 * and run it through the same resolvePrice. Every push rebuilds the site, so
 * a price changed in /admin and saved to the site is what the bot quotes after
 * the next deploy. Before this, the bot priced with a formula of its own and
 * quoted ₪25 for a keychain the site sold for ₪10.
 */
type SiteFile = { settings?: Partial<CostSettings>; overrides?: Record<string, ItemOverride>; pricing?: Partial<PricingMode> };
const f = file as SiteFile;

const settings: CostSettings = {
  ...DEFAULT_COST_SETTINGS,
  ...f.settings,
  spoolPrices: { ...DEFAULT_COST_SETTINGS.spoolPrices, ...f.settings?.spoolPrices },
};
// Same default as DEFAULT_PRICING in the (client-only) admin store.
const pricing: PricingMode = { auto: false, round: 5, ...f.pricing };
const overrides = f.overrides ?? {};

export const sitePrice = (item: Priceable): number => resolvePrice(item, overrides, settings, pricing);
