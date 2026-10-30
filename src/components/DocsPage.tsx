import { docUrl } from "../docs/links.ts";
import { type FlatEntry, NAV } from "../docs/nav.ts";
import type { DocPage } from "../docs/page.ts";
import { formatUpdated } from "../docs/page.ts";

function Sidebar({ current }: { current: DocPage }) {
  return (
    <div className="docs-side">
      <details className="docs-nav" id="docs-nav">
        <summary>Documentation menu</summary>
        <span className="island-slot" data-island="docs-nav" />
        <nav aria-label="Documentation">
          {NAV.map((group) => (
            <div key={group.title} className="side-group">
              <p className="side-title">{group.title}</p>
              <ul>
                {group.entries.map((entry) => {
                  const isCurrent =
                    entry.repoKey === current.repoKey && entry.file === current.file;
                  return (
                    <li key={`${entry.repoKey}:${entry.file}`}>
                      <a
                        href={docUrl(entry.repoKey, entry.file)}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {entry.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </details>
    </div>
  );
}

function Pager({
  previous,
  next,
}: {
  previous: FlatEntry | undefined;
  next: FlatEntry | undefined;
}) {
  return (
    <nav className="pager" aria-label="Previous and next page">
      {previous ? (
        <a className="pager-link" href={docUrl(previous.repoKey, previous.file)} rel="prev">
          <span className="pager-dir">Previous</span>
          <span>{previous.label}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a className="pager-link pager-next" href={docUrl(next.repoKey, next.file)} rel="next">
          <span className="pager-dir">Next</span>
          <span>{next.label}</span>
        </a>
      ) : null}
    </nav>
  );
}

export function DocsPageContent({
  page,
  previous,
  next,
}: {
  page: DocPage;
  previous: FlatEntry | undefined;
  next: FlatEntry | undefined;
}) {
  const toc = page.headings.filter((h) => h.depth === 2 || h.depth === 3);
  return (
    <div className="docs-shell">
      <Sidebar current={page} />
      <article className="docs-main">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <a href="/docs/">Docs</a> · {page.group} · <span aria-current="page">{page.label}</span>
        </nav>
        <h1 className="t-h1 doc-title">{page.title}</h1>
        <p className="doc-meta">
          <span className="tag">{page.repo.split("/")[1]}</span>
          <span>Updated {formatUpdated(page.date)}</span>
        </p>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from our own renderer, raw HTML is escaped */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        <Pager previous={previous} next={next} />
        <p className="doc-source">
          Generated from <a href={page.sourceUrl}>{page.file}</a> in {page.repo.split("/")[1]}.{" "}
          <a href={page.editUrl}>Edit this page on GitHub</a>.
        </p>
      </article>
      {toc.length > 0 ? (
        <nav className="toc" aria-label="On this page">
          <p className="side-title">On this page</p>
          <ul>
            {toc.map((h) => (
              <li key={h.id} className={h.depth === 3 ? "toc-sub" : undefined}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <span />
      )}
    </div>
  );
}
