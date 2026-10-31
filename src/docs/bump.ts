import type { DocsConfig, DocsRepo } from "./config.ts";

/** The six repositories whose docs are published, in sidebar order. */
export const DOC_REPOS: Record<string, string> = {
  api: "lorenzh/pulse-api",
  probe: "lorenzh/pulse-probe",
  status: "lorenzh/pulse-status",
  notify: "lorenzh/pulse-notify",
  contract: "lorenzh/pulse-contract",
  kit: "lorenzh/pulse-kit",
};

export class BumpError extends Error {
  override name = "BumpError";
}

/** The GitHub repository of a docs key; throws for any key that is not an own key of DOC_REPOS. */
export function repoForKey(key: string): string {
  const repo = Object.hasOwn(DOC_REPOS, key) ? DOC_REPOS[key] : undefined;
  if (repo === undefined) {
    throw new BumpError(
      `unknown repo "${key}", expected one of ${Object.keys(DOC_REPOS).join(", ")}`,
    );
  }
  return repo;
}

/** Reads the commit SHA out of `git ls-remote <url> refs/heads/main`. */
export function parseLsRemote(output: string): string {
  const match = /^([0-9a-f]{40})\s+refs\/heads\/main$/m.exec(output);
  if (!match?.[1]) throw new BumpError("git ls-remote did not list refs/heads/main");
  return match[1];
}

const DOC_FILE = /^docs\/(?:channels\/)?[a-z0-9-]+\.md$/;

/** Published files from a GitHub tree API answer: docs/*.md and docs/channels/*.md, sorted. */
export function docFilesFromTree(tree: unknown): string[] {
  if (typeof tree !== "object" || tree === null)
    throw new BumpError("tree answer is not an object");
  const { tree: entries, truncated } = tree as { tree?: unknown; truncated?: unknown };
  if (truncated === true) throw new BumpError("the GitHub tree answer is truncated");
  if (!Array.isArray(entries)) throw new BumpError("tree answer has no tree list");
  const files = entries
    .filter((e): e is { path: string; type: string } => typeof e?.path === "string")
    .filter((e) => e.type === "blob" && DOC_FILE.test(e.path))
    .map((e) => e.path)
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) throw new BumpError("no docs/*.md files in the tree");
  return files;
}

/** Commit date from the GitHub commits API answer. */
export function commitDate(commit: unknown): string {
  const date = (commit as { commit?: { committer?: { date?: unknown } } } | null)?.commit?.committer
    ?.date;
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    throw new BumpError("commit answer has no committer date");
  }
  return date;
}

/** Replaces the pin of one repo; keeps the repo order of DOC_REPOS, then any extra keys. */
export function withRepo(config: DocsConfig | undefined, key: string, entry: DocsRepo): DocsConfig {
  const merged = { ...(config?.repos ?? {}), [key]: entry };
  const known = Object.keys(DOC_REPOS).filter((k) => Object.hasOwn(merged, k));
  const extra = Object.keys(merged).filter((k) => !Object.hasOwn(DOC_REPOS, k));
  const repos: Record<string, DocsRepo> = {};
  for (const k of [...known, ...extra]) {
    const value = merged[k];
    if (value) repos[k] = value;
  }
  return { repos };
}
