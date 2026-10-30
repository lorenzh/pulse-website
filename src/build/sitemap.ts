import { absoluteUrl } from "./meta.ts";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Every page path except the 404 page. */
export function sitemapXml(siteUrl: string, paths: string[]): string {
  const urls = paths
    .filter((p) => !p.endsWith("404.html"))
    .map((p) => `  <url><loc>${escapeXml(absoluteUrl(siteUrl, p))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function robotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}\n`;
}
