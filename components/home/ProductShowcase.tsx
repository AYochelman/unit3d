import SectionHead from "@/components/ui/SectionHead";
import Btn from "@/components/ui/Btn";
import { showcaseItems } from "@/lib/showcase";
import ShowcaseGallery from "./ShowcaseGallery";

/**
 * "What comes out of the printer" — real photographs of real prints.
 *
 * The leading model of every shelf by downloads (lib/showcase.ts), in the
 * dissolving gallery the owner picked. A click opens the product page.
 */
export default function ProductShowcase() {
  const items = showcaseItems();

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <SectionHead
            eyebrow="WHAT WE PRINT"
            title="ככה זה נראה כשזה יוצא מהמדפסת."
            sub="הדגם המוביל בהורדות בכל מדף, בתמונות אמיתיות. לחיצה פותחת את עמוד המוצר עם צבע, חומר, זמן הדפסה ומחיר."
          />
          <Btn as="a" href="/trendy" variant="ghost" iconRight="arrowLeft">
            טרנדי כרגע
          </Btn>
        </div>
        <ShowcaseGallery items={items} />
        <p className="mt-4 text-[11px] text-ink-500">
          הדגמים מהקהילה של MakerWorld, בקרדיט למעצבים. אנחנו מדפיסים אותם בצבע ובחומר שתבחר.
        </p>
      </div>
    </section>
  );
}
