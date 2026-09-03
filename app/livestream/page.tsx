import LivestreamClient from "./LivestreamClient";

export const metadata = {
  title: "מדפסת בלייב · Unit 3D",
  description:
    "צפה בהדפסה שמתרחשת עכשיו. נתוני המדפסת בזמן אמת — טמפ' ראש, מצע, שכבה נוכחית, אחוז סיום.",
};

export default function LivestreamPage() {
  return <LivestreamClient />;
}
