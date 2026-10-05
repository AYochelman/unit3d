import { ProximityH1 } from "@/components/ui/variable-font-cursor-proximity";

/**
 * The home headline, with letters that swell towards the cursor (the same
 * ProximityH1 every page title uses, with a wider reach for its size).
 */
export default function HeroTitle() {
  return (
    <ProximityH1 radius={150} className="text-[40px] xs:text-[44px] md:text-[88px] leading-heading font-bold text-ink-50">
      כל רעיון.
      <br />
      מודפס.
      <br />
      <span className="text-flame">בידיים שלך.</span>
    </ProximityH1>
  );
}
