import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { siteConfig } from "../site.config.ts";
import { withCsp } from "./build/csp.ts";
import { type PageMeta, pageMeta } from "./build/meta.ts";
import { robotsTxt, sitemapXml } from "./build/sitemap.ts";
import { LINK_RULE, UnsafeLinkError, unsafeRefs } from "./build/url-safety.ts";
import { DocsPageContent } from "./components/DocsPage.tsx";
import { Document } from "./components/Document.tsx";
import { HomeContent } from "./content/home.tsx";
import { HostedContent } from "./content/hosted.tsx";
import { NotFoundContent } from "./content/not-found.tsx";
import { neighbours } from "./docs/nav.ts";
import type { DocPage } from "./docs/page.ts";

export type SiteAssets = {
  css: string;
  /** Island name -> script URLs that must load for it (the entry file). */
  islands: Record<string, string>;
};

export type OutputFile = { file: string; content: string };

type PageDef = {
  /** Site path, e.g. /docs/api/install/ */
  path: string;
  /** Path in dist */
  file: string;
  meta: PageMeta;
  currentNav?: string;
  body: ReactNode;
};

const QUICK_START = { repoKey: "api", file: "docs/install.md" } as const;

function distFile(sitePath: string): string {
  return sitePath.endsWith("/") ? `${sitePath.slice(1)}index.html` : sitePath.slice(1);
}

export function islandsIn(html: string): string[] {
  return [...new Set([...html.matchAll(/data-island="([a-z-]+)"/g)].map((m) => m[1] ?? ""))];
}

function renderPage(def: PageDef, assets: SiteAssets): string {
  const draw = (scripts: string[]): string =>
    `<!doctype html>${renderToStaticMarkup(
      <Document
        meta={def.meta}
        assets={{ css: assets.css, scripts }}
        {...(def.currentNav ? { currentNav: def.currentNav } : {})}
      >
        {def.body}
      </Document>,
    )}`;
  const names = islandsIn(draw([]));
  const scripts = names.map((n) => {
    const src = assets.islands[n];
    if (!src) throw new Error(`page ${def.path} uses the island "${n}" but no bundle exists`);
    return src;
  });
  return withCsp(draw(scripts));
}

/** Fails the build on the first link with an unsafe scheme, in hand-written and docs pages alike. */
function assertSafeLinks(file: string, html: string): void {
  const ref = unsafeRefs(html)[0];
  if (ref) {
    throw new UnsafeLinkError(
      `${file}: unsafe link ${ref.tag} ${ref.attr}=${JSON.stringify(ref.value)}: ${LINK_RULE}`,
    );
  }
}

function docsDefs(docs: DocPage[], siteUrl: string): PageDef[] {
  const defs: PageDef[] = [];
  for (const page of docs) {
    const { previous, next } = neighbours(page.repoKey, page.file);
    const body = <DocsPageContent page={page} previous={previous} next={next} />;
    const title = `${page.title} · ${page.repo.split("/")[1]} docs · pulse`;
    defs.push({
      path: page.url,
      file: distFile(page.url),
      meta: pageMeta({ title, description: page.description, path: page.url, siteUrl }),
      currentNav: "/docs/",
      body,
    });
    if (page.repoKey === QUICK_START.repoKey && page.file === QUICK_START.file) {
      // /docs/ renders the quick start; its canonical link points at the real page.
      defs.push({
        path: "/docs/",
        file: "docs/index.html",
        meta: pageMeta({
          title,
          description: page.description,
          path: "/docs/",
          canonicalPath: page.url,
          siteUrl,
        }),
        currentNav: "/docs/",
        body,
      });
    }
  }
  return defs;
}

/** All pages, sitemap.xml and robots.txt. Pure: no file access. */
export function renderSite(input: {
  docs: DocPage[];
  assets: SiteAssets;
  siteUrl?: string;
}): OutputFile[] {
  const siteUrl = input.siteUrl ?? siteConfig.siteUrl;
  const defs: PageDef[] = [
    {
      path: "/",
      file: "index.html",
      meta: pageMeta({
        title: "pulse · Uptime monitor and status page",
        description:
          "pulse is a self-hosted uptime monitor with a calm public status page. It checks HTTP, TLS and cron jobs from several locations and decides by quorum. MIT licensed.",
        path: "/",
        siteUrl,
      }),
      body: <HomeContent />,
    },
    {
      path: "/hosted/",
      file: "hosted/index.html",
      meta: pageMeta({
        title: "Hosted pulse · Plans and waitlist · pulse",
        description:
          "Hosted pulse is not available yet. Plans, prices and limits are not decided; the details on this page are placeholders.",
        path: "/hosted/",
        siteUrl,
      }),
      currentNav: "/hosted/",
      body: <HostedContent />,
    },
    ...docsDefs(input.docs, siteUrl),
    {
      path: "/404.html",
      file: "404.html",
      meta: pageMeta({
        title: "Page not found · pulse",
        description: "This page does not exist.",
        path: "/404.html",
        siteUrl,
        noindex: true,
      }),
      body: <NotFoundContent />,
    },
  ];
  const files = defs.map((d) => {
    const content = renderPage(d, input.assets);
    assertSafeLinks(d.file, content);
    return { file: d.file, content };
  });
  files.push({
    file: "sitemap.xml",
    content: sitemapXml(
      siteUrl,
      defs.map((d) => d.path),
    ),
  });
  files.push({ file: "robots.txt", content: robotsTxt(siteUrl) });
  return files;
}
