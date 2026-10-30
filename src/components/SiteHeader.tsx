import { siteConfig } from "../../site.config.ts";
import { Icon } from "./Icon.tsx";
import { LogoMark } from "./Logo.tsx";

export const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/hosted/", label: "Hosted" },
  { href: "/docs/", label: "Docs" },
  { href: "/docs/api/rest-api/", label: "API" },
] as const;

/** `current` is the href of the link that gets aria-current="page". */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="site-header">
      <div className="hdr-row">
        <a className="brand" href="/" aria-label="pulse home">
          <LogoMark />
          <span className="brand-name">pulse</span>
        </a>
        <nav id="site-nav" className="site-nav" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.href === current ? "page" : undefined}>
              {l.label}
            </a>
          ))}
          <a className="nav-gh" href={siteConfig.repoUrl}>
            GitHub
          </a>
        </nav>
        <div className="hdr-actions">
          <span className="island-slot" data-island="theme-toggle" />
          <span className="island-slot menu-slot" data-island="menu-toggle" />
          <a className="btn btn-secondary hdr-gh" href={siteConfig.repoUrl}>
            <Icon name="github" size={16} />
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
