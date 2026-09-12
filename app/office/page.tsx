import type { Metadata } from "next";
import OfficeClient from "./OfficeClient";

export const metadata: Metadata = {
  alternates: { canonical: "/office/" },
  title: "למשרד · Unit 3D",
  description: "מעמדים, מארגנים, קליפסים לכבלים ושלטי שם מודפסים בתלת מימד, עם שם או לוגו.",
};

export default function OfficePage() {
  return <OfficeClient />;
}
