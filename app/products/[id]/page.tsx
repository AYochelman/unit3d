import { PRODUCTS, PRODUCT_BY_ID } from "@/lib/products";
import ProductDetailClient from "../ProductDetailClient";

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
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}
