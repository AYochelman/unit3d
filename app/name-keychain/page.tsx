import NameKeychainClient from "./NameKeychainClient";

export const metadata = {
  title: "מחזיק מפתחות עם שם בתלת-מימד · Unit 3D",
  description: "כותבים שם, בוחרים סטייל וצבעים, ורואים את המחזיק מכל צד לפני שמזמינים. 5 סטיילים, עד שני צבעים, מודפס בארץ.",
  alternates: { canonical: "/name-keychain/" },
};

export default function NameKeychainPage() {
  return <NameKeychainClient />;
}
