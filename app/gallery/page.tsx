import { Suspense } from "react";
import GalleryClient from "./GalleryClient";

export const metadata = {
  alternates: { canonical: "/gallery/" },
  title: "גלריה · Unit 3D",
  description:
    "עבודות שיצאו מהמדפסת. סמלי יחידה, מחזיקי מפתחות, פסלונים, מתנות עסקיות.",
};

export default function GalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryClient />
    </Suspense>
  );
}
