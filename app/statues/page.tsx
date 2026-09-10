import type { Metadata } from "next";
import StatuesClient from "./StatuesClient";

export const metadata: Metadata = {
  alternates: { canonical: "/statues/" },
  title: "פסלים · Unit 3D",
  description:
    "פסלים ופריטי תצוגה מודפסים: בוסט דיוקן, דרקון, לואו-פולי, סט שחמט, גביע מותאם, אגרטל ומנורת ירח.",
};

export default function StatuesPage() {
  return <StatuesClient />;
}
