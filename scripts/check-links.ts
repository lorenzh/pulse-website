// bun run check:links: offline link, external-request and CSP check over dist/.
import path from "node:path";
import { cspProblems } from "../src/build/csp.ts";
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
const csp = [...dist.html].flatMap(([file, html]) => cspProblems(file, html));
const groups = [
  { heading: "links", problems: report.problems },
  { heading: "csp", problems: csp },
].filter((g) => g.problems.length > 0);
for (const g of groups) {
  console.error(`${g.heading}: ${g.problems.length} problems:\n- ${g.problems.join("\n- ")}`);
}
if (groups.length > 0) process.exit(1);
console.log(`links ok, csp ok on ${dist.html.size} pages`);
