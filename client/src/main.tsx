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

// Google Ads "Subscribe" conversion. Stripe redirects successful checkouts
// back to /dashboard?success=true, so this fires only on that success return.
const checkoutParams = new URLSearchParams(window.location.search);
if (window.location.pathname === "/dashboard" && checkoutParams.get("success") === "true") {
  gtag("event", "conversion", {
    send_to: "AW-18360793283/gQDnCM3rg-UcEMPxjbNE",
    value: 1.0,
    currency: "USD",
  });
}

createRoot(document.getElementById("root")!).render(<App />);