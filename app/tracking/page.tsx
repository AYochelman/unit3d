import TrackingClient from "./TrackingClient";

export const metadata = {
  title: "מעקב הזמנה · Unit 3D",
  description: "הזן את מספר ההזמנה כדי לראות איפה היא בייצור — מאישור עיצוב ועד משלוח.",
};

export default function TrackingPage() {
  return <TrackingClient />;
}
