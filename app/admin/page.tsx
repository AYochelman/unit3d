import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "ניהול · Unit 3D",
  description: "עלויות ייצור, מחירי גלילים ומרווחים לכל מוצר.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
