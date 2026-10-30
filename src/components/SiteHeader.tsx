import { siteConfig } from "../../site.config.ts";
import { ButtonLink } from "./ButtonLink.tsx";
import { LogoMark } from "./Logo.tsx";

export const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/hosted/", label: "Hosted" },
  { href: "/docs/", label: "Docs" },
  { href: "/docs/api/rest-api/", label: "API" },
] as const;

/** The header button: GitHub everywhere, the waitlist on the Hosted page. */
function headerCta(current: string | undefined): { href: string; label: string } {
  return current === "/hosted/"
    ? { href: "#waitlist", label: "Join the waitlist" }
    : { href: siteConfig.repoUrl, label: "GitHub" };
}

/**
 * `current` is the href of the link that gets aria-current="page". Tab order on desktop: the
 * navigation, the button, then the theme toggle at the far right.
 */
export function SiteHeader({ current }: { current?: string }) {
  const cta = headerCta(current);
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
          <a className="nav-gh" href={cta.href}>
            {cta.label}
          </a>
        </nav>
        <div className="hdr-actions">
          <span className="hdr-gh">
            <ButtonLink
              href={cta.href}
              variant="secondary"
              label={cta.label}
              {...(current === "/hosted/"
                ? {}
                : { icon: "github" as const, iconSide: "start" as const })}
            />
          </span>
          <span className="island-slot" data-island="theme-toggle" />
          <span className="island-slot menu-slot" data-island="menu-toggle" />
        </div>
      </div>
    </header>
  );
}
