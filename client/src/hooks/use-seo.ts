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
  ogType?: string;
  ogLocale?: string;
  robots?: string;
  hreflang?: { lang: string; url: string }[];
  jsonLd?: Record<string, unknown>[];
}

const BASE_URL = "https://www.myeasypass.net";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;
const DEFAULT_ROBOTS = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
const MANAGED_ATTR = "data-seo-managed";

const SPANISH_ALTERNATES: Record<string, string> = {
  [`${BASE_URL}/texas-property-casualty-exam-prep`]: `${BASE_URL}/es/preparacion-examen-seguros-propiedad-accidentes-texas`,
  [`${BASE_URL}/texas-life-insurance-exam-prep`]: `${BASE_URL}/es/preparacion-examen-seguros-vida-texas`,
  [`${BASE_URL}/texas-general-lines-exam-prep`]: `${BASE_URL}/es/preparacion-examen-seguros-lineas-generales-texas`,
  [`${BASE_URL}/texas-insurance-exam/deductible`]: `${BASE_URL}/es/concepto-deducible-texas`,
  [`${BASE_URL}/texas-insurance-exam/indemnity`]: `${BASE_URL}/es/concepto-indemnizacion-texas`,
  [`${BASE_URL}/texas-insurance-exam/subrogation`]: `${BASE_URL}/es/concepto-subrogacion-texas`,
  [`${BASE_URL}/texas-life-health-exam/premium`]: `${BASE_URL}/es/concepto-prima-texas`,
  [`${BASE_URL}/texas-life-health-exam/beneficiary`]: `${BASE_URL}/es/concepto-beneficiario-texas`,
  [`${BASE_URL}/texas-life-health-exam/grace-period`]: `${BASE_URL}/es/concepto-periodo-de-gracia-texas`,
  [`${BASE_URL}/texas-real-estate-exam/agency`]: `${BASE_URL}/es/concepto-agencia-texas`,
  [`${BASE_URL}/texas-real-estate-exam/deed-vs-title`]: `${BASE_URL}/es/concepto-escritura-vs-titulo-texas`,
};

type RestoreFn = () => void;

/**
 * Update one head element without leaking the new value into the next SPA
 * route. If the element already existed (for example from index.html), its
 * original value is restored on cleanup. If this hook created it, cleanup
 * removes it entirely.
 */
function setHeadAttribute(
  selector: string,
  createElement: () => Element,
  attribute: string,
  value: string,
): RestoreFn {
  let element = document.querySelector(selector);
  const created = !element;

  if (!element) {
    element = createElement();
    element.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(element);
  }

  const previousValue = element.getAttribute(attribute);
  element.setAttribute(attribute, value);

  return () => {
    if (created) {
      element?.remove();
      return;
    }

    if (previousValue === null) {
      element?.removeAttribute(attribute);
    } else {
      element?.setAttribute(attribute, previousValue);
    }
  };
}

function setMetaByName(name: string, content: string): RestoreFn {
  return setHeadAttribute(
    `meta[name="${name}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      return el;
    },
    "content",
    content,
  );
}

function setMetaByProperty(property: string, content: string): RestoreFn {
  return setHeadAttribute(
    `meta[property="${property}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("property", property);
      return el;
    },
    "content",
    content,
  );
}

/**
 * Apply exact Spanish alternates for English pages that have a dedicated
 * Spanish counterpart. This keeps hreflang reciprocal without forcing every
 * individual page component to duplicate the pairing map.
 */
function normalizeHreflang(options: SEOOptions): { lang: string; url: string }[] {
  const alternates = [...(options.hreflang ?? [])];
  const spanishOverride = SPANISH_ALTERNATES[options.canonicalUrl];

  if (!spanishOverride) return alternates;

  const withoutOldSpanish = alternates.filter((alt) => alt.lang !== "es");
  return [...withoutOldSpanish, { lang: "es", url: spanishOverride }];
}

/**
 * Manages document title, meta description, canonical link, Open Graph tags,
 * hreflang alternates, robots directives, and JSON-LD for a single SPA route.
 *
 * The cleanup behavior matters for SEO. A client-side route change must not
 * leave the previous page's title, canonical, hreflang, or social metadata in
 * the document head. Static homepage values from index.html are restored when
 * the visitor navigates back home.
 */
export function useSEO(options: SEOOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = options.title;

    const restore: RestoreFn[] = [];
    const ogImage = options.ogImage ?? DEFAULT_OG_IMAGE;

    restore.push(setMetaByName("description", options.description));
    restore.push(setMetaByName("robots", options.robots ?? DEFAULT_ROBOTS));
    restore.push(setMetaByProperty("og:title", options.title));
    restore.push(setMetaByProperty("og:description", options.description));
    restore.push(setMetaByProperty("og:url", options.canonicalUrl));
    restore.push(setMetaByProperty("og:type", options.ogType ?? "website"));
    restore.push(setMetaByProperty("og:site_name", "MyEasyPass"));
    restore.push(setMetaByProperty("og:locale", options.ogLocale ?? "en_US"));
    restore.push(setMetaByProperty("og:image", ogImage));
    restore.push(setMetaByName("twitter:card", "summary_large_image"));
    restore.push(setMetaByName("twitter:title", options.title));
    restore.push(setMetaByName("twitter:description", options.description));
    restore.push(setMetaByName("twitter:image", ogImage));

    restore.push(
      setHeadAttribute(
        'link[rel="canonical"]',
        () => {
          const el = document.createElement("link");
          el.setAttribute("rel", "canonical");
          return el;
        },
        "href",
        options.canonicalUrl,
      ),
    );

    // index.html provides the homepage language alternates. Temporarily move
    // them out while another route owns the head, then restore them when that
    // route unmounts. This prevents duplicate/conflicting hreflang entries and
    // also fixes the old behavior where returning home permanently lost its
    // static hreflang tags.
    const displacedHreflang = Array.from(
      document.querySelectorAll('link[rel="alternate"][hreflang]'),
    );
    displacedHreflang.forEach((el) => el.remove());

    const hreflangEls: Element[] = [];
    for (const alt of normalizeHreflang(options)) {
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

      // Restore in reverse order so multiple attributes on the same static
      // element unwind cleanly before the next route's effect runs.
      for (const undo of [...restore].reverse()) undo();
      for (const el of hreflangEls) el.remove();
      for (const el of jsonLdEls) el.remove();
      displacedHreflang.forEach((el) => document.head.appendChild(el));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.title,
    options.description,
    options.canonicalUrl,
    options.ogImage,
    options.ogType,
    options.ogLocale,
    options.robots,
    JSON.stringify(options.hreflang),
    JSON.stringify(options.jsonLd),
  ]);
}

export function buildUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
