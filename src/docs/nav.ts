import type { DocsConfig } from "./config.ts";

export type NavEntry = { label: string; repoKey: string; file: string };
export type NavGroup = { title: string; entries: NavEntry[] };

function e(label: string, repoKey: string, file: string): NavEntry {
  return { label, repoKey, file };
}

/**
 * Sidebar groups as in design/website/Docs.dc.html, mapped to the real files.
 * "Check states", "Quorum and incidents", "Maintenance windows" and "Heartbeats" are headings of
 * api concepts.md and "Upgrades and backup" is a section of api operation.md, so they have no
 * entry of their own. There is no "Metrics" page in any source, so the design's entry is dropped.
 */
export const NAV: NavGroup[] = [
  {
    title: "Getting started",
    entries: [
      e("Overview", "api", "docs/index.md"),
      e("Quick start", "api", "docs/install.md"),
      e("Concepts", "api", "docs/concepts.md"),
      e("Overview · probe", "probe", "docs/index.md"),
      e("Overview · status", "status", "docs/index.md"),
      e("Overview · notify", "notify", "docs/index.md"),
    ],
  },
  {
    title: "Configuration",
    entries: [
      e("Configuration · api", "api", "docs/configuration.md"),
      e("Configuration · probe", "probe", "docs/configuration.md"),
      e("Configuration · status", "status", "docs/configuration.md"),
      e("Status page theming", "status", "docs/theming.md"),
      e("Configuration · notify", "notify", "docs/configuration.md"),
      e("Notification channels", "notify", "docs/channels.md"),
      e("Channel · Slack", "notify", "docs/channels/slack.md"),
      e("Channel · Teams", "notify", "docs/channels/teams.md"),
      e("Channel · Email", "notify", "docs/channels/email.md"),
      e("Channel · Webhook", "notify", "docs/channels/webhook.md"),
      e("Channel · File", "notify", "docs/channels/file.md"),
    ],
  },
  {
    title: "Reference",
    entries: [
      e("REST API", "api", "docs/rest-api.md"),
      e("Contract", "contract", "docs/index.md"),
      e("Kit", "kit", "docs/index.md"),
    ],
  },
  {
    title: "Operation",
    entries: [
      e("Install · probe", "probe", "docs/install.md"),
      e("Install · status", "status", "docs/install.md"),
      e("Install · notify", "notify", "docs/install.md"),
      e("Operation · api", "api", "docs/operation.md"),
      e("Operation · probe", "probe", "docs/operation.md"),
      e("Operation · status", "status", "docs/operation.md"),
      e("Operation · notify", "notify", "docs/operation.md"),
      e("Troubleshooting · api", "api", "docs/troubleshooting.md"),
      e("Troubleshooting · probe", "probe", "docs/troubleshooting.md"),
      e("Troubleshooting · status", "status", "docs/troubleshooting.md"),
      e("Troubleshooting · notify", "notify", "docs/troubleshooting.md"),
      e("Development · api", "api", "docs/development.md"),
      e("Development · probe", "probe", "docs/development.md"),
      e("Development · status", "status", "docs/development.md"),
      e("Development · notify", "notify", "docs/development.md"),
    ],
  },
];

export type FlatEntry = NavEntry & { group: string };

export function flattenNav(groups: NavGroup[] = NAV): FlatEntry[] {
  return groups.flatMap((g) => g.entries.map((entry) => ({ ...entry, group: g.title })));
}

export function findEntry(
  repoKey: string,
  file: string,
  groups: NavGroup[] = NAV,
): FlatEntry | undefined {
  return flattenNav(groups).find((x) => x.repoKey === repoKey && x.file === file);
}

export function neighbours(
  repoKey: string,
  file: string,
  groups: NavGroup[] = NAV,
): { previous: FlatEntry | undefined; next: FlatEntry | undefined } {
  const flat = flattenNav(groups);
  const at = flat.findIndex((x) => x.repoKey === repoKey && x.file === file);
  if (at === -1) return { previous: undefined, next: undefined };
  return { previous: flat[at - 1], next: flat[at + 1] };
}

/** Problems between the nav and the published files; empty when every file is listed exactly once. */
export function navProblems(config: DocsConfig, groups: NavGroup[] = NAV): string[] {
  const problems: string[] = [];
  const counts = new Map<string, number>();
  for (const entry of flattenNav(groups)) {
    const id = `${entry.repoKey}:${entry.file}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!config.repos[entry.repoKey]?.files.includes(entry.file)) {
      problems.push(`nav entry "${entry.label}" points to ${id}, which is not published`);
    }
  }
  for (const [key, repo] of Object.entries(config.repos)) {
    for (const file of repo.files) {
      const n = counts.get(`${key}:${file}`) ?? 0;
      if (n === 0) problems.push(`${key}:${file} is published but not in the nav`);
      if (n > 1) problems.push(`${key}:${file} is in the nav ${n} times`);
    }
  }
  const labels = flattenNav(groups).map((x) => x.label);
  for (const label of new Set(labels.filter((l, i) => labels.indexOf(l) !== i))) {
    problems.push(`nav label "${label}" is used twice`);
  }
  return problems;
}
