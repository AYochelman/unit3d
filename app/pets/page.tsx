import type { Metadata } from "next";
import PetsClient from "./PetsClient";

export const metadata: Metadata = {
  title: "תגים לחיות · Unit 3D",
  description: "תגי שם לכלבים וחתולים עם שם וטלפון, מודפסים ב-PETG עמיד. עצם, לב, דג, כף רגל, QR.",
};

export default function PetsPage() {
  return <PetsClient />;
}
