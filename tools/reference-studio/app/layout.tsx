import type { Metadata } from "next";
import { readDb, DEFAULT_SETTINGS } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reference Studio",
  description: "A personal design reference library, and the briefs built from it.",
};

// Settings live on disk, so the theme and chrome language are resolved on the
// server. That avoids the flash of the wrong theme on every navigation.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme = DEFAULT_SETTINGS.theme;
  let lang = DEFAULT_SETTINGS.uiLanguage;
  try {
    const settings = readDb().settings;
    theme = settings.theme;
    lang = settings.uiLanguage;
  } catch {
    // A broken library file is reported by the API; the shell still renders.
  }

  return (
    <html lang={lang} dir={lang === "he" ? "rtl" : "ltr"} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Hebrew needs a font that was actually drawn for it. Loaded at
            runtime, so the studio still builds and runs with no network. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
