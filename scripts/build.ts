// npm run build: fetches the pinned docs, renders every page into dist/.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIslands, buildStatic } from "../src/build/assets.ts";
import { loadSite } from "../src/build/load-site.ts";
import { parseDocsConfig } from "../src/docs/config.ts";
import { type FetchLike, loadDocFile } from "../src/docs/fetch.ts";
import { navProblems } from "../src/docs/nav.ts";
import { buildDocPages, type DocSources } from "../src/docs/page.ts";

const root = process.cwd();
const dist = path.join(root, "dist");

const config = parseDocsConfig(
  JSON.parse(await readFile(path.join(root, "docs.config.json"), "utf8")),
);
const problems = navProblems(config);
if (problems.length > 0)
  throw new Error(`docs navigation is out of step:\n- ${problems.join("\n- ")}`);

const realFetch: FetchLike = (url) => fetch(url);
const sources: DocSources = new Map();
await Promise.all(
  Object.entries(config.repos).flatMap(([key, entry]) =>
    entry.files.map(async (file) => {
      const text = await loadDocFile(
        { repo: entry.repo, sha: entry.sha, path: file },
        { fetch: realFetch, cacheDir: path.join(root, ".cache/docs") },
      );
      sources.set(`${key}:${file}`, text);
    }),
  ),
);
const docs = buildDocPages(config, sources);

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
const css = await buildStatic(root, dist);
const islands = await buildIslands(root, dist);
const site = await loadSite(root);
const files = site.renderSite({ docs, assets: { css, islands } });
for (const f of files) {
  const target = path.join(dist, f.file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, f.content);
}
await rm(path.join(root, ".build"), { recursive: true, force: true });
console.log(`built ${files.length} files, ${docs.length} docs pages, into dist/`);
