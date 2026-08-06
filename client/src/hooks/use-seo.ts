import { useEffect } from "react";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SEOOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  hreflang?: { lang: string; url: string }[];
  jsonLd?: Record<string, unknown>[];
}

const BASE_URL = "https://www.myeasypass.net";

function setMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function setMetaByProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

const MANAGED_ATTR = "data-seo-managed";

/**
 * Manages document title, meta description, canonical link, Open Graph tags,
 * hreflang alternates, and JSON-LD structured data for a single page. This is
 * a client-side-rendered SPA (no head-management library like react-helmet),
 * so this hook writes directly to document.head and cleans up its own tags
 * on unmount so they don't leak onto the next page.
 */
export function useSEO(options: SEOOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = options.title;

    const managedEls: Element[] = [];

    managedEls.push(setMetaByName("description", options.description));
    managedEls.push(setMetaByProperty("og:title", options.title));
    managedEls.push(setMetaByProperty("og:description", options.description));
    managedEls.push(setMetaByProperty("og:url", options.canonicalUrl));
    managedEls.push(setMetaByProperty("og:type", "website"));
    if (options.ogImage) {
      managedEls.push(setMetaByProperty("og:image", options.ogImage));
      managedEls.push(setMetaByName("twitter:image", options.ogImage));
    }
    managedEls.push(setMetaByName("twitter:title", options.title));
    managedEls.push(setMetaByName("twitter:description", options.description));

    let canonical = document.querySelector('link[rel="canonical"]');
    const canonicalExisted = !!canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", options.canonicalUrl);

    const hreflangEls: Element[] = [];
    for (const alt of options.hreflang ?? []) {
      const el = document.createElement("link");
      el.setAttribute("rel", "alternate");
      el.setAttribute("hreflang", alt.lang);
      el.setAttribute("href", alt.url);
      el.setAttribute(MANAGED_ATTR, "true");
      document.head.appendChild(el);
      hreflangEls.push(el);
    }

    const jsonLdEls: Element[] = [];
    for (const block of options.jsonLd ?? []) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED_ATTR, "true");
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
      jsonLdEls.push(script);
    }

    return () => {
      document.title = previousTitle;
      for (const el of hreflangEls) el.remove();
      for (const el of jsonLdEls) el.remove();
      if (!canonicalExisted) canonical?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.title, options.description, options.canonicalUrl, options.ogImage, JSON.stringify(options.hreflang), JSON.stringify(options.jsonLd)]);
}

export function buildUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
