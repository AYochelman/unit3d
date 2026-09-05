import type { Metadata } from "next";
import ShippingClient from "./ShippingClient";

export const metadata: Metadata = {
  title: "משלוחים · Unit 3D",
  description:
    "כמה עולה לשלוח? מחשבון משלוח לפי משקל, גודל ויעד, לפי מחירון דואר ישראל ינואר 2026, כולל עלות האריזה.",
};

export default function ShippingPage() {
  return <ShippingClient />;
}
