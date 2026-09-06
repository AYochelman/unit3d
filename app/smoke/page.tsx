import type { Metadata } from "next";
import SmokeClient from "./SmokeClient";

export const metadata: Metadata = {
  title: "מוצרי עישון · Unit 3D",
  description:
    "קופסאות סיגריות, מאפרות, קייסים למצית, קופסאות טבק וגריינדרים — מודפסים לפי הזמנה, בצבע ובחומר שתבחר. מוצרים לבגירים בלבד.",
};

export default function SmokePage() {
  return <SmokeClient />;
}
