// bun run check:links: offline link and external-request check over dist/.
import path from "node:path";
import { readDist } from "../src/build/dist-files.ts";
import { checkLinks } from "../src/build/links-check.ts";

const dist = await readDist(path.join(process.cwd(), "dist"));
const css = new Map<string, string>();
for (const f of dist.files.filter((x) => x.endsWith(".css")))
  css.set(f, (await dist.text(f)) ?? "");
const report = checkLinks(
  dist.html,
  (f) => dist.files.includes(f),
  (f) => css.get(f),
);
console.log(
  `${dist.html.size} pages, ${report.internalLinks} internal links, ${report.externalLinks} external links ` +
    `(${report.githubLinks} on github.com, not fetched)`,
);
if (report.problems.length > 0) {
  console.error(`${report.problems.length} problems:\n- ${report.problems.join("\n- ")}`);
  process.exit(1);
}
console.log("links ok");
