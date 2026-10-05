import Icon from "./ui/Icon";

/**
 * Who designed it, under what licence, and where it came from.
 *
 * The terms page (section 6) promises that "the credit to the creator and the
 * licence are shown on the model page" -- and until now no page showed either.
 * For a shop that prints other people's designs, the credit is the first thing
 * a designer looks for and the first thing that is missing in a complaint, so
 * it is rendered into the page itself, on the server, where the terms say it is.
 *
 * Licence names are what the source platform reports; the link goes to the
 * licence text so the wording is theirs and not ours.
 */
const LICENSES: Record<string, { label: string; href?: string }> = {
  "CC0":      { label: "CC0 — נחלת הכלל",                    href: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "BY":       { label: "CC BY — שימוש חופשי עם קרדיט",       href: "https://creativecommons.org/licenses/by/4.0/" },
  "BY-SA":    { label: "CC BY-SA — קרדיט, שיתוף באותם תנאים", href: "https://creativecommons.org/licenses/by-sa/4.0/" },
  "BY-ND":    { label: "CC BY-ND — קרדיט, ללא שינויים",       href: "https://creativecommons.org/licenses/by-nd/4.0/" },
  "BY-NC":    { label: "CC BY-NC — לא מסחרי",                 href: "https://creativecommons.org/licenses/by-nc/4.0/" },
  "BY-NC-SA": { label: "CC BY-NC-SA — לא מסחרי",              href: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  "BY-NC-ND": { label: "CC BY-NC-ND — לא מסחרי",              href: "https://creativecommons.org/licenses/by-nc-nd/4.0/" },
  "Standard Digital File License":                 { label: "MakerWorld Standard Digital File License", href: "https://makerworld.com/en/terms-of-service" },
  "Standard Digital File License - Community Use": { label: "MakerWorld Standard License (Community Use)", href: "https://makerworld.com/en/terms-of-service" },
  "MakerWorld Exclusive License":                  { label: "MakerWorld Exclusive License", href: "https://makerworld.com/en/terms-of-service" },
};

const SOURCES: Record<string, string> = {
  makerworld: "MakerWorld", thingiverse: "Thingiverse", printables: "Printables", myminifactory: "MyMiniFactory",
};

export default function DesignerCredit({
  creator, license, sourceUrl, source,
}: { creator?: string; license?: string; sourceUrl?: string; source?: string }) {
  if (!creator && !license && !sourceUrl) return null;
  const lic = license ? LICENSES[license] ?? { label: license } : null;
  const where = source ? SOURCES[source] ?? source : sourceUrl?.includes("makerworld") ? "MakerWorld" : "המקור";
  return (
    <p className="mt-3 text-xs text-ink-400 leading-relaxed">
      <Icon name="file" size={12} className="inline-block ml-1 align-[-2px]" />
      {creator && <>עוצב על ידי <span className="text-ink-200" dir="ltr">{creator}</span></>}
      {creator && (lic || sourceUrl) && " · "}
      {lic && (lic.href
        ? <a href={lic.href} target="_blank" rel="noreferrer" className="underline decoration-ink-700 hover:text-ink-200">{lic.label}</a>
        : lic.label)}
      {lic && sourceUrl && " · "}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-ink-700 hover:text-ink-200">
          הדגם ב-{where}
        </a>
      )}
      <span className="block mt-0.5 text-ink-500">הזכויות בעיצוב נשארות אצל היוצר. אנחנו מוכרים את ההדפסה, לא את הקובץ.</span>
    </p>
  );
}
