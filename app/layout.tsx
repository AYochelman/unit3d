import type { Metadata, Viewport } from "next";
import { Heebo, JetBrains_Mono, Rubik, Assistant, Secular_One, Frank_Ruhl_Libre, Suez_One, Karantina } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWA from "@/components/FloatingWA";
import HelpBot from "@/components/HelpBot";

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
  metadataBase: new URL("https://unit3d.example.com"),
  openGraph: {
    title: "Unit 3D · הדפסות תלת מימד בהתאמה אישית",
    description: "סמלי יחידות · מתנות לעובדים · פידג'טים · כל רעיון, מודפס.",
    locale: "he_IL",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingWA />
        <HelpBot />
      </body>
    </html>
  );
}
