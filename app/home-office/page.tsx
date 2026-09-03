import type { Metadata } from "next";
import HomeOfficeClient from "./HomeOfficeClient";

export const metadata: Metadata = {
  title: "לבית ולמשרד · Unit 3D",
  description: "מעמדים, מארגנים, תחתיות, ווים ושלטים מודפסים בתלת מימד, עם שם או לוגו.",
};

export default function HomeOfficePage() {
  return <HomeOfficeClient />;
}
