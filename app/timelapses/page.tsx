import TimelapsesClient from "./TimelapsesClient";

export const metadata = {
  alternates: { canonical: "/timelapses/" },
  title: "כל הטיימלאפסים · Unit 3D",
  description:
    "כל ההדפסות שצולמו במדפסת, מהחדשה לישנה. כל סרטון הוא הדפסה אחת מתחילתה ועד סופה.",
};

export default function TimelapsesPage() {
  return <TimelapsesClient />;
}
