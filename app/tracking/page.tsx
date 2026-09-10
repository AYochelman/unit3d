import TrackingClient from "./TrackingClient";

export const metadata = {
  // Not content: one customer's order. robots.txt asks crawlers not to
  // fetch it; this tells the ones that fetched it anyway not to keep it.
  robots: { index: false, follow: false },
  title: "מעקב הזמנה · Unit 3D",
  description: "הזן את מספר ההזמנה כדי לראות איפה היא בייצור — מאישור עיצוב ועד משלוח.",
};

export default function TrackingPage() {
  return <TrackingClient />;
}
