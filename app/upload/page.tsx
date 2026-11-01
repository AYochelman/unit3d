import UploadClient from "./UploadClient";

export const metadata = {
  alternates: { canonical: "/upload/" },
  title: "העלאת קובץ · Unit 3D",
  description:
    "יש לך STL, OBJ, או 3MF? תעלה — נסתכל, נצבע, ונקבע איתך הצעת מחיר.",
};

export default function UploadPage() {
  return <UploadClient />;
}
