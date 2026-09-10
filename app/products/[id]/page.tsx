import { PRODUCTS, PRODUCT_BY_ID } from "@/lib/products";
import ProductDetailClient from "../ProductDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import { abs, breadcrumbJsonLd, productJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = PRODUCT_BY_ID[id];
  return {
    title: p ? `${p.name} · Unit 3D` : "מוצר · Unit 3D",
    description: p?.desc ?? "",
    // One address per page. Without it every route claims to be the site root
    // (the only canonical the layout could give them) and Google indexes one
    // page out of the whole catalogue.
    alternates: { canonical: `/products/${id}/` },
    openGraph: {
      title: p ? `${p.name} · Unit 3D` : "מוצר · Unit 3D",
      description: p?.desc ?? "",
      url: abs(`/products/${id}`),
      type: "website",
      ...(p?.images?.[0] || p?.image ? { images: [p.images?.[0] ?? p.image!] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const p = PRODUCT_BY_ID[id];
  const path = `/products/${id}`;
  return (
    <>
      {p && (
        <>
          {/* The price and the name, in the vocabulary that lets Google print
              them inside the search result instead of only linking to it. */}
          <JsonLd
            data={productJsonLd({
              id: p.id,
              name: p.name,
              description: p.desc,
              image: p.images?.[0] ?? p.image,
              price: p.price,
              path,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "בית", path: "/" },
              { name: "קטלוג", path: "/catalog" },
              { name: p.name, path },
            ])}
          />
        </>
      )}
      <ProductDetailClient id={id} />
    </>
  );
}
