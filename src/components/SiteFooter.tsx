import { siteConfig } from "../../site.config.ts";
import { LogoMark } from "./Logo.tsx";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <div className="footer-brand">
          <LogoMark size={24} />
          <span>
            pulse · <a href={`${siteConfig.websiteRepoUrl}/blob/main/LICENSE`}>Code MIT</a> ·{" "}
            <a href={`${siteConfig.websiteRepoUrl}/blob/main/LICENSE-content`}>Content CC BY 4.0</a>
          </span>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <a href="/hosted/">Hosted</a>
          <a href="/docs/">Docs</a>
          <a href="/docs/api/rest-api/">REST API</a>
          <a href={siteConfig.repoUrl}>GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
