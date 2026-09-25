import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FinderPrompt from "@/components/FinderPrompt";
import HelpBot from "@/components/HelpBot";
import AdminSettingsBoot from "@/components/AdminSettingsBoot";
import AdminUnlockBoot from "@/components/AdminUnlockBoot";
import AnalyticsBoot from "@/components/AnalyticsBoot";
import OrdersBoot from "@/components/OrdersBoot";
import CouponsBoot from "@/components/CouponsBoot";
import GoogleTag from "@/components/GoogleTag";

export const metadata: Metadata = {
  title: "Unit 3D · הדפסות תלת מימד בהתאמה אישית",
  description:
    "מדפסת תלת מימד מקצועית שעובדת עבורך — סמלי יחידות, מתנות לעובדים, פידג'טים, או כל קובץ שתעלה. ישירות מהסטודיו אליך.",
  metadataBase: new URL("https://unit-3d.com"),
  openGraph: {
    title: "Unit 3D · הדפסות תלת מימד בהתאמה אישית",
    description: "סמלי יחידות · מתנות לעובדים · פידג'טים · כל רעיון, מודפס.",
    url: "https://unit-3d.com/",
    siteName: "Unit 3D",
    locale: "he_IL",
    type: "website",
  },
  // Deliberately NOT a site-wide canonical: metadata is inherited, so a
  // canonical here would make all 408 pages claim to be the homepage. Pages
  // that need one declare it themselves.
  //
  // A base path means this is the /preview staging copy — belt and braces with
  // its robots.txt, since a stray link into staging must not get indexed.
  robots: process.env.NEXT_PUBLIC_BASE_PATH
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale. Capping it at 1 blocks pinch-zoom, which is how a lot of
  // people read a phone screen at all — and it is a WCAG 1.4.4 failure on
  // every page of the site.
  themeColor: "#0A0A0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
    >
      <head>
        {/*
          Marks the document as scriptable BEFORE first paint, which is what
          lets the reveal styles hide anything at all: without JavaScript the
          `js` class never lands and every block renders at full opacity.
          Inline and blocking on purpose — a deferred version would flash.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="skip-link">דלג לתוכן הראשי</a>
        <Header />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        <AdminSettingsBoot />
        <AdminUnlockBoot />
        <AnalyticsBoot />
        <OrdersBoot />
        <CouponsBoot />
        <FinderPrompt />
        <HelpBot />
        <GoogleTag />
      </body>
    </html>
  );
}
