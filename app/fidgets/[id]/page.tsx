import { FIDGETS } from "@/lib/data";
import FidgetDetailClient from "./FidgetDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import { abs, breadcrumbJsonLd, productJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return FIDGETS.map((f) => ({ id: f.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const f = FIDGETS.find((x) => x.id === id);
  const title = f ? `${f.name} · Unit 3D` : "פידג'ט · Unit 3D";
  const image = f?.images?.[0] ?? f?.thumbnail;
  return {
    title,
    description: f?.desc ?? "",
    // See the note on the product page: one canonical per page, or the whole
    // catalogue collapses into the homepage as far as Google is concerned.
    alternates: { canonical: `/fidgets/${id}/` },
    openGraph: {
      title,
      description: f?.desc ?? "",
      url: abs(`/fidgets/${id}`),
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function FidgetDetailPage({ params }: Props) {
  const { id } = await params;
  const f = FIDGETS.find((x) => x.id === id);
  const path = `/fidgets/${id}`;
  return (
    <>
      {f && (
        <>
          <JsonLd
            data={productJsonLd({
              id: f.id,
              name: f.name,
              description: f.desc,
              image: f.images?.[0] ?? f.thumbnail,
              price: f.price,
              path,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "בית", path: "/" },
              { name: "פידג'טים", path: "/fidgets" },
              { name: f.name, path },
            ])}
          />
        </>
      )}
      <FidgetDetailClient id={id} />
    </>
  );
}
