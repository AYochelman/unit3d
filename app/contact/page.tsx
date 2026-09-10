import { Suspense } from "react";
import ContactClient from "./ContactClient";

export const metadata = {
  alternates: { canonical: "/contact/" },
  title: "צור קשר · Unit 3D",
  description:
    "טופס יצירת קשר חכם. בחר מי אתה — פרטי, חייל, או חברה — וקבל מענה תוך 24 שעות.",
};

export default function ContactPage() {
  // ContactClient reads ?o= to restore an order after a reload, and a static
  // export needs that behind a boundary.
  return (
    <Suspense fallback={null}>
      <ContactClient />
    </Suspense>
  );
}
