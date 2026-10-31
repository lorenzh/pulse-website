import path from "node:path";
import { isSafeUrl, LINK_RULE, UnsafeLinkError } from "../build/url-safety.ts";
import type { DocsConfig } from "./config.ts";

export class LinkError extends Error {
  override name = "LinkError";
}

export type LinkContext = {
  config: DocsConfig;
  /** The repo key and file the link sits in. */
  repoKey: string;
  file: string;
  /** Heading ids of a published file, or undefined if the file is not published. */
  headingIds: (repoKey: string, file: string) => ReadonlySet<string> | undefined;
};

export type ResolvedLink = { href: string; isExternal: boolean };

/** Site URL of a published file: docs/index.md -> /docs/api/, docs/channels/email.md -> /docs/notify/channels/email/. */
export function docUrl(repoKey: string, file: string): string {
  const rel = file.replace(/^docs\//, "").replace(/\.md$/, "");
  return rel === "index" ? `/docs/${repoKey}/` : `/docs/${repoKey}/${rel}/`;
}

export function blobUrl(repo: string, sha: string, file: string): string {
  return `https://github.com/${repo}/blob/${sha}/${file}`;
}

export function editUrl(repo: string, file: string): string {
  return `https://github.com/${repo}/edit/main/${file}`;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function locate(ctx: LinkContext, target: string): { repoKey: string; file: string } {
  if (!target.startsWith("../")) return { repoKey: ctx.repoKey, file: target };
  // "../../pulse-api/docs/x.md" style: the first segment after the climb names a sibling repo.
  const [, name, ...rest] = target.replace(/^(\.\.\/)+/, "../").split("/");
  for (const [key, entry] of Object.entries(ctx.config.repos)) {
    const short = entry.repo.split("/")[1];
    if ((name === key || name === short) && rest.length > 0) {
      return { repoKey: key, file: rest.join("/") };
    }
  }
  throw new LinkError(`${ctx.repoKey}:${ctx.file}: link "${target}" leaves the repository`);
}

export function resolveLink(href: string, ctx: LinkContext): ResolvedLink {
  if (!isSafeUrl(href)) {
    const repo = ctx.config.repos[ctx.repoKey]?.repo ?? ctx.repoKey;
    throw new UnsafeLinkError(
      `${repo} ${ctx.file}: unsafe link ${JSON.stringify(href)}: ${LINK_RULE}`,
    );
  }
  if (SCHEME.test(href)) return { href, isExternal: /^https?:/i.test(href) };
  const hashAt = href.indexOf("#");
  const target = hashAt === -1 ? href : href.slice(0, hashAt);
  const anchor = hashAt === -1 ? "" : href.slice(hashAt + 1);
  const here = `${ctx.repoKey}:${ctx.file}`;
  const place = (repoKey: string, file: string): void => {
    const ids = ctx.headingIds(repoKey, file);
    if (anchor && ids && !ids.has(anchor)) {
      throw new LinkError(`${here}: link "${href}" points to a missing heading "#${anchor}"`);
    }
  };
  if (target === "") {
    place(ctx.repoKey, ctx.file);
    return { href, isExternal: false };
  }
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(ctx.file), target));
  const { repoKey, file } = locate(ctx, joined);
  const entry = ctx.config.repos[repoKey];
  if (!entry) throw new LinkError(`${here}: unknown repository for "${href}"`);
  const suffix = anchor ? `#${anchor}` : "";
  if (entry.files.includes(file)) {
    place(repoKey, file);
    return { href: docUrl(repoKey, file) + suffix, isExternal: false };
  }
  return { href: blobUrl(entry.repo, entry.sha, file) + suffix, isExternal: true };
}
