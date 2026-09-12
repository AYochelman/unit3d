import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  alternates: { canonical: "/home/" },
  title: "לבית · Unit 3D",
  description: "אגרטלים, תחתיות, מארגנים, ווים ושלטים מודפסים בתלת מימד, עם שם או לוגו.",
};

export default function HomePage() {
  return <HomeClient />;
}
