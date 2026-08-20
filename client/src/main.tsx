import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
