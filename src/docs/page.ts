import type { DocsConfig } from "./config.ts";
import { blobUrl, docUrl, editUrl, resolveLink } from "./links.ts";
import { type Heading, renderMarkdown } from "./markdown.ts";
import { findEntry, NAV } from "./nav.ts";

export type DocPage = {
  repoKey: string;
  repo: string;
  file: string;
  sha: string;
  date: string;
  url: string;
  label: string;
  group: string;
  title: string;
  description: string;
  html: string;
  headings: Heading[];
  editUrl: string;
  sourceUrl: string;
};

/** Markdown source of every published file, keyed `<repoKey>:<file>`. */
export type DocSources = Map<string, string>;

export class DocPageError extends Error {
  override name = "DocPageError";
}

/**
 * Renders all published files. The first pass collects the heading ids of every file so the second
 * pass can check each `#anchor` of a link against its target.
 */
export function buildDocPages(config: DocsConfig, sources: DocSources): DocPage[] {
  const ids = new Map<string, ReadonlySet<string>>();
  const identity = (href: string) => ({ href, isExternal: false });
  for (const [id, source] of sources) {
    ids.set(id, new Set(renderMarkdown(source, identity).headings.map((h) => h.id)));
  }
  const pages: DocPage[] = [];
  for (const [repoKey, entry] of Object.entries(config.repos)) {
    for (const file of entry.files) {
      const source = sources.get(`${repoKey}:${file}`);
      if (source === undefined) throw new DocPageError(`${repoKey}:${file} was not loaded`);
      const nav = findEntry(repoKey, file, NAV);
      if (!nav) throw new DocPageError(`${repoKey}:${file} is not in the nav`);
      const doc = renderMarkdown(source, (href) =>
        resolveLink(href, {
          config,
          repoKey,
          file,
          headingIds: (k, f) => ids.get(`${k}:${f}`),
        }),
      );
      if (doc.title === "") throw new DocPageError(`${repoKey}:${file} has no "# " title`);
      pages.push({
        repoKey,
        repo: entry.repo,
        file,
        sha: entry.sha,
        date: entry.date,
        url: docUrl(repoKey, file),
        label: nav.label,
        group: nav.group,
        title: doc.title,
        description: doc.description,
        html: doc.html,
        headings: doc.headings,
        editUrl: editUrl(entry.repo, file),
        sourceUrl: blobUrl(entry.repo, entry.sha, file),
      });
    }
  }
  return pages;
}

export function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(iso),
  );
}
