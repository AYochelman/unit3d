"use client";
import Script from "next/script";
import { useSyncExternalStore } from "react";
import { readConsent, serverConsent, subscribeConsent } from "@/lib/consent";

// Google Analytics 4. Sits alongside the site's own measurement
// (lib/analytics.ts → Supabase → /admin "תנועה"); it does not replace it.
//
// Loaded ONLY after the visitor says yes in the consent banner
// (components/CookieConsent.tsx) — the cookies page promises exactly that, and
// for a while GA loaded for everyone while that page said it was not installed.
//
// Skipped on the /preview staging copy: NEXT_PUBLIC_BASE_PATH is only set by
// the staging workflow, and staging traffic in the owner's reports is noise.
const GA_ID = "G-55S9FXRZYW";

export default function GoogleTag() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverConsent);
  if (process.env.NEXT_PUBLIC_BASE_PATH || consent !== "granted") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
