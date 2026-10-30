// bun run docs:bump [<repo>]: pins docs.config.json to the current main of each docs repo.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  commitDate,
  DOC_REPOS,
  docFilesFromTree,
  parseLsRemote,
  withRepo,
} from "../src/docs/bump.ts";
import { type DocsConfig, parseDocsConfig, stringifyDocsConfig } from "../src/docs/config.ts";

const CONFIG = "docs.config.json";

async function getJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (response.status !== 200) {
    throw new Error(
      `${url} answered ${response.status}${response.status === 403 ? " (rate limit? set GITHUB_TOKEN)" : ""}`,
    );
  }
  return response.json();
}

let config: DocsConfig | undefined;
try {
  config = parseDocsConfig(JSON.parse(readFileSync(CONFIG, "utf8")));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const wanted = process.argv.slice(2).filter((a) => a !== "--");
const keys = wanted.length > 0 ? wanted : Object.keys(DOC_REPOS);
for (const key of keys) {
  const repo = DOC_REPOS[key];
  if (!repo)
    throw new Error(`unknown repo "${key}", expected one of ${Object.keys(DOC_REPOS).join(", ")}`);
  const sha = parseLsRemote(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- a fixed command name, run only by a person who has git installed
    execFileSync("git", ["ls-remote", `https://github.com/${repo}.git`, "refs/heads/main"], {
      encoding: "utf8",
    }),
  );
  const files = docFilesFromTree(
    await getJson(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`),
  );
  const date = commitDate(await getJson(`https://api.github.com/repos/${repo}/commits/${sha}`));
  config = withRepo(config, key, { repo, sha, date, files });
  console.log(`${key}: ${sha.slice(0, 7)} ${date} ${files.length} files`);
}
if (config) writeFileSync(CONFIG, stringifyDocsConfig(config));
