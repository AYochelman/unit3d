import Demo3DClient from "./Demo3DClient";

// A demo for the owner, not a shop page: no menu link, not in the sitemap,
// and search engines are asked to leave it out.
export const metadata = {
  title: "דוגמה: תצוגת תלת-מימד · Unit 3D",
  description: "שתי דרכים להראות מוצר מכל הכיוונים.",
  robots: { index: false, follow: false },
};

export default function Demo3DPage() {
  return <Demo3DClient />;
}
