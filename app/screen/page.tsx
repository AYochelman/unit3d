import type { Metadata } from "next";
import ScreenClient from "./ScreenClient";

export const metadata: Metadata = {
  alternates: { canonical: "/screen/" },
  title: "סרטים וסדרות · Unit 3D",
  description:
    "פסלים ופריטי תצוגה מהסרטים והסדרות: ספיידרמן, איירון מן, אנימה ודמויות שהמעריצים מבקשים. מודפס לפי הזמנה.",
};

export default function ScreenPage() {
  return <ScreenClient />;
}
