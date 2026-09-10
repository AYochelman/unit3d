import CatalogClient from "./CatalogClient";

export const metadata = {
  alternates: { canonical: "/catalog/" },
  title: "סמלי יחידה · Unit 3D",
  description:
    "כל סמלי היחידה הצה\"ליים — שריון, אוויר, ים, מודיעין, משטרה. הזמן בעצמך, או שלח לי תמונה ואדפיס.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}
