import ConfiguratorClient from "./ConfiguratorClient";

export const metadata = {
  title: "מעצב מחזיק מפתחות · Unit 3D",
  description:
    "צור מחזיק מפתחות מותאם — צורה, טקסט, צבע, גודל. תצוגה חיה בזמן אמת. הצעת מחיר מיידית.",
};

export default function ConfiguratorPage() {
  return <ConfiguratorClient />;
}
