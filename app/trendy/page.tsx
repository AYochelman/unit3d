import type { Metadata } from "next";
import TrendyClient from "./TrendyClient";

export const metadata: Metadata = {
  title: "טרנדי כרגע · Unit 3D",
  description: "מה שמזמינים הכי הרבה השבוע: פידג'טים ויראליים, קייסים בעיצוב אישי, תגים לחיות ומתנות לבית.",
};

export default function TrendyPage() {
  return <TrendyClient />;
}
