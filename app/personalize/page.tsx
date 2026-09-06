import type { Metadata } from "next";
import { Suspense } from "react";
import PersonalizeClient from "./PersonalizeClient";

export const metadata: Metadata = {
  title: "טקסט על המוצר · Unit 3D",
  description: "מוסיפים שם, תאריך או משפט על כל מוצר בחנות. תוספת אחידה של 15 ₪.",
};

export default function PersonalizePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-24 text-ink-400">טוען…</div>}>
      <PersonalizeClient />
    </Suspense>
  );
}
