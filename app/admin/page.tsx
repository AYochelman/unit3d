import { Suspense } from "react";
import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "ניהול · Unit 3D",
  description: "עלויות ייצור, מחירי גלילים ומרווחים לכל מוצר.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  // The orders tab reads ?order= to file an order that arrived by link, and a
  // static export needs that behind a boundary.
  return (
    <Suspense fallback={null}>
      <AdminClient />
    </Suspense>
  );
}
