import ReviewsClient from "./ReviewsClient";

export const metadata = {
  alternates: { canonical: "/reviews/" },
  title: "ביקורות · Unit 3D",
  description:
    "מה אומרים אנשים שכבר הזמינו — חיילים, לקוחות פרטיים, וחברות.",
};

export default function ReviewsPage() {
  return <ReviewsClient />;
}
