import { Suspense } from "react";
import ConfiguratorFromQuery from "./ConfiguratorFromQuery";
import ConfiguratorClient from "./ConfiguratorClient";

export const metadata = {
  title: "מעצב אישי · Unit 3D",
  description:
    "מחזיק מפתחות, קייס לטלפון, קייס למצית, דיסקית, שלט שם ועוד: טקסט או עיצוב חופשי, צבע, גודל. תצוגה חיה בזמן אמת.",
};

export default function ConfiguratorPage() {
  return (
    <Suspense fallback={<ConfiguratorClient />}>
      <ConfiguratorFromQuery />
    </Suspense>
  );
}
