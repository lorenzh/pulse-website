export type DocsRepo = {
  repo: string;
  sha: string;
  date: string;
  files: string[];
};

export type DocsConfig = { repos: Record<string, DocsRepo> };

export class DocsConfigError extends Error {
  override name = "DocsConfigError";
}

const SHA = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const FILE = /^docs\/[a-z0-9-]+(\/[a-z0-9-]+)?\.md$/;
const KEY = /^[a-z]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRepo(key: string, value: unknown): DocsRepo {
  if (!isRecord(value)) throw new DocsConfigError(`repos.${key} must be an object`);
  const { repo, sha, date, files } = value;
  if (typeof repo !== "string" || !REPO.test(repo)) {
    throw new DocsConfigError(`repos.${key}.repo must look like owner/name`);
  }
  if (typeof sha !== "string" || !SHA.test(sha)) {
    throw new DocsConfigError(`repos.${key}.sha must be 40 lower-case hex characters`);
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    throw new DocsConfigError(`repos.${key}.date must be an ISO date`);
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new DocsConfigError(`repos.${key}.files must be a non-empty list`);
  }
  const seen = new Set<string>();
  for (const file of files) {
    if (typeof file !== "string" || !FILE.test(file)) {
      throw new DocsConfigError(
        `repos.${key}.files: ${describeEntry(file)} is not a docs/*.md path`,
      );
    }
    if (seen.has(file)) throw new DocsConfigError(`repos.${key}.files lists ${file} twice`);
    seen.add(file);
  }
  return { repo, sha, date, files: [...seen] };
}

/** Names a rejected entry without converting or walking it. */
function describeEntry(value: unknown): string {
  if (Array.isArray(value)) return "an array";
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "object":
      return "an object";
    case "number":
      return "a number";
    case "boolean":
      return "a boolean";
    case "bigint":
      return "a bigint";
    case "symbol":
      return "a symbol";
    case "function":
      return "a function";
    case "undefined":
      return "undefined";
  }
  return "a value";
}

export function parseDocsConfig(value: unknown): DocsConfig {
  if (!isRecord(value) || !isRecord(value.repos)) {
    throw new DocsConfigError('docs config needs a "repos" object');
  }
  const repos: Record<string, DocsRepo> = {};
  for (const [key, entry] of Object.entries(value.repos)) {
    if (!KEY.test(key)) throw new DocsConfigError(`repos key "${key}" must be lower-case letters`);
    repos[key] = parseRepo(key, entry);
  }
  if (Object.keys(repos).length === 0) throw new DocsConfigError("docs config has no repos");
  return { repos };
}

/** Serialises with a stable key order and one line per file, as the bump script writes it. */
export function stringifyDocsConfig(config: DocsConfig): string {
  const repos = Object.entries(config.repos).map(([key, r]) => {
    const files = r.files.map((f) => `        ${JSON.stringify(f)}`).join(",\n");
    return [
      `    ${JSON.stringify(key)}: {`,
      `      "repo": ${JSON.stringify(r.repo)},`,
      `      "sha": ${JSON.stringify(r.sha)},`,
      `      "date": ${JSON.stringify(r.date)},`,
      `      "files": [\n${files}\n      ]`,
      "    }",
    ].join("\n");
  });
  return `{\n  "repos": {\n${repos.join(",\n")}\n  }\n}\n`;
}
