import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    dataLayer: unknown[][];
  }
}

// Google Ads tag (AW-18360793283), loaded site-wide from the app entrypoint.
window.dataLayer = window.dataLayer || [];
function gtag(...args: unknown[]) {
  window.dataLayer.push(args);
}
gtag("js", new Date());
gtag("config", "AW-18360793283");

const googleTag = document.createElement("script");
googleTag.async = true;
googleTag.src = "https://www.googletagmanager.com/gtag/js?id=AW-18360793283";
document.head.appendChild(googleTag);

// The "Subscribe" conversion is deliberately not fired here.
//
// A URL is not a subscription. Firing on /dashboard?success=true counted
// direct visits to that address, every reload of it, Stripe returns that never
// activated, and returning subscribers - all of which inflate conversions and
// so understate what a subscription actually costs to buy.
//
// It now fires from client/src/lib/googleAds.ts, once the server has
// reconciled the subscription with Stripe and said it is active. See the
// checkout return in client/src/pages/dashboard.tsx.

createRoot(document.getElementById("root")!).render(<App />);