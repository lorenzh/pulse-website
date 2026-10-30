import type { ReactNode } from "react";
import { headTags, type PageMeta } from "../build/meta.ts";
import { THEME_SCRIPT } from "../build/theme-script.ts";
import { SiteFooter } from "./SiteFooter.tsx";
import { SiteHeader } from "./SiteHeader.tsx";

export type DocumentAssets = { css: string; scripts: string[] };

export function Document({
  meta,
  assets,
  currentNav,
  children,
}: {
  meta: PageMeta;
  assets: DocumentAssets;
  currentNav?: string;
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{meta.title}</title>
        {headTags(meta).map((t) => (
          <meta
            key={t.name ?? t.property}
            name={t.name}
            property={t.property}
            content={t.content}
          />
        ))}
        <link rel="canonical" href={meta.canonical} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the constant theme script must stay inline */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="stylesheet" href={assets.css} />
        {assets.scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader {...(currentNav ? { current: currentNav } : {})} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
