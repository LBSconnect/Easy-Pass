import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const FREE_PRACTICE_SEO: Record<string, { title: string; description: string }> = {
  "/free/texas-real-estate-practice-test": {
    title: "Free Texas Real Estate Practice Test | TREC Exam Prep | MyEasyPass",
    description: "Try a free Texas real estate practice test and see how ready you are for the TREC license exam. Practice online with instant feedback, then continue with full MyEasyPass exam prep.",
  },
  "/free/texas-property-casualty-practice-test": {
    title: "Free Texas Property & Casualty Practice Test | MyEasyPass",
    description: "Try a free Texas Property & Casualty insurance practice test online. Practice P&C exam concepts with instant feedback, then continue with full MyEasyPass exam prep.",
  },
  "/free/texas-life-insurance-practice-test": {
    title: "Free Texas Life Insurance Practice Test | MyEasyPass",
    description: "Try a free Texas life insurance practice test online. Practice licensing-exam concepts with instant feedback and continue with full MyEasyPass exam prep when you are ready.",
  },
  "/free/texas-general-lines-practice-test": {
    title: "Free Texas General Lines Practice Test | Life & Health | MyEasyPass",
    description: "Try a free Texas General Lines Life & Health practice test online. Practice licensing-exam concepts, get feedback, and continue with full MyEasyPass exam prep.",
  },
};

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSeoHtml(indexHtml: string, pathname: string): string {
  const seo = FREE_PRACTICE_SEO[pathname];
  if (!seo) return indexHtml;

  const canonical = `https://www.myeasypass.net${pathname}`;
  const title = escapeHtmlAttribute(seo.title);
  const description = escapeHtmlAttribute(seo.description);

  return indexHtml
    .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/i, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/i, `<meta name="twitter:description" content="${description}" />`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve route-specific SEO metadata in the initial HTML response for high-value
  // acquisition pages. Client-side useSEO still manages metadata after hydration,
  // while crawlers no longer have to execute JavaScript to discover each page's
  // unique title, description, canonical URL, and social preview metadata.
  const indexPath = path.resolve(distPath, "index.html");
  app.use((req, res) => {
    const seo = FREE_PRACTICE_SEO[req.path];
    if (!seo) {
      res.sendFile(indexPath);
      return;
    }

    const indexHtml = fs.readFileSync(indexPath, "utf8");
    res.type("html").send(renderSeoHtml(indexHtml, req.path));
  });
}
