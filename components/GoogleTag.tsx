import Script from "next/script";

// Google Analytics 4. Sits alongside the site's own measurement
// (lib/analytics.ts → Supabase → /admin "תנועה"); it does not replace it.
//
// Skipped on the /preview staging copy: NEXT_PUBLIC_BASE_PATH is only set by
// the staging workflow, and staging traffic in the owner's reports is noise.
const GA_ID = "G-55S9FXRZYW";

export default function GoogleTag() {
  if (process.env.NEXT_PUBLIC_BASE_PATH) return null;
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
