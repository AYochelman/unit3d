import CatalogClient from "./CatalogClient";

export const metadata = {
  alternates: { canonical: "/catalog/" },
  title: "לחיילים · Unit 3D",
  description:
    "כל סמלי היחידה הצה\"ליים — שריון, אוויר, ים, מודיעין, משטרה. הזמן בעצמך, או שלחו לנו תמונה ונדפיס.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}
