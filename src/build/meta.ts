export type PageMeta = {
  title: string;
  description: string;
  canonical: string;
  ogUrl: string;
  noindex: boolean;
};

export type PageMetaInput = {
  title: string;
  description: string;
  /** Site path of the page, e.g. /docs/api/install/. */
  path: string;
  siteUrl: string;
  /** Path the canonical link points to when it is not the page itself. */
  canonicalPath?: string;
  noindex?: boolean;
};

export function absoluteUrl(siteUrl: string, pagePath: string): string {
  const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  const pathPart = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return base + pathPart;
}

export function pageMeta(input: PageMetaInput): PageMeta {
  const canonical = absoluteUrl(input.siteUrl, input.canonicalPath ?? input.path);
  return {
    title: input.title,
    description: input.description,
    canonical,
    ogUrl: canonical,
    noindex: input.noindex ?? false,
  };
}

/** Tags for the document head, as data so tests do not need a renderer. */
export function headTags(meta: PageMeta): { name?: string; property?: string; content: string }[] {
  const tags = [
    { name: "description", content: meta.description },
    { property: "og:title", content: meta.title },
    { property: "og:description", content: meta.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: meta.ogUrl },
    { name: "twitter:card", content: "summary" },
  ];
  return meta.noindex ? [...tags, { name: "robots", content: "noindex" }] : tags;
}
