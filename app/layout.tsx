import type { Metadata, Viewport } from "next";
import { Heebo, JetBrains_Mono, Rubik, Assistant, Secular_One, Frank_Ruhl_Libre, Suez_One, Karantina } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWA from "@/components/FloatingWA";
import HelpBot from "@/components/HelpBot";
import AdminSettingsBoot from "@/components/AdminSettingsBoot";
import OrdersBoot from "@/components/OrdersBoot";
import CouponsBoot from "@/components/CouponsBoot";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Extra Hebrew faces for the free designer (see lib/design.ts DESIGN_FONTS).
const rubik = Rubik({ subsets: ["latin", "hebrew"], weight: ["400", "700"], variable: "--font-rubik", display: "swap" });
const assistant = Assistant({ subsets: ["latin", "hebrew"], weight: ["400", "700"], variable: "--font-assistant", display: "swap" });
const secular = Secular_One({ subsets: ["latin", "hebrew"], weight: "400", variable: "--font-secular", display: "swap" });
const frank = Frank_Ruhl_Libre({ subsets: ["latin", "hebrew"], weight: ["400", "700"], variable: "--font-frank", display: "swap" });
const suez = Suez_One({ subsets: ["latin", "hebrew"], weight: "400", variable: "--font-suez", display: "swap" });
const karantina = Karantina({ subsets: ["latin", "hebrew"], weight: ["400", "700"], variable: "--font-karantina", display: "swap" });

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
      className={`${heebo.variable} ${jetbrainsMono.variable} ${rubik.variable} ${assistant.variable} ${secular.variable} ${frank.variable} ${suez.variable} ${karantina.variable}`}
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
        <OrdersBoot />
        <CouponsBoot />
        <FloatingWA />
        <HelpBot />
      </body>
    </html>
  );
}
