import FinderClient from "./FinderClient";

export const metadata = {
  alternates: { canonical: "/finder/" },
  title: "איזו הדפסה מתאימה לך · Unit 3D",
  description:
    "שלוש שאלות קצרות, ואנחנו מכוונים אותך למדף הנכון — סמלי יחידות, מתנות, פידג'טים, פסלים או משהו בעיצוב שלך.",
};

export default function FinderPage() {
  return <FinderClient />;
}
