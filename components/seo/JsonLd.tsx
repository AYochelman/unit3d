/**
 * A schema.org block, for Google to read.
 *
 * Google does not read the page's React state — it reads the HTML. This is a
 * server component so the JSON is inside the exported file, present on first
 * byte, with no JavaScript involved.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // The content is ours, built from our own data. The escape is for the
      // one sequence that could close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
