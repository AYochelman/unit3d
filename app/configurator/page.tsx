import { Suspense } from "react";
import ConfiguratorFromQuery from "./ConfiguratorFromQuery";

export const metadata = {
  title: "מעצב אישי · Unit 3D",
  description:
    "מחזיק מפתחות, קייס לטלפון, קייס למצית, דיסקית, שלט שם ועוד: טקסט או עיצוב חופשי, צבע, גודל. תצוגה חיה בזמן אמת.",
};

export default function ConfiguratorPage() {
  return (
    // The static shell cannot know ?product= yet; show a neutral skeleton rather
    // than painting the keychain and swapping it for the deep-linked product.
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
          <div className="h-8 w-48 rounded-lg bg-ink-900 mb-4" />
          <div className="h-4 w-96 max-w-full rounded bg-ink-900 mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 aspect-square md:aspect-[4/3] rounded-2xl bg-ink-900 border border-ink-800" />
            <div className="lg:col-span-2 h-[420px] rounded-2xl bg-ink-900 border border-ink-800" />
          </div>
        </div>
      }
    >
      <ConfiguratorFromQuery />
    </Suspense>
  );
}
